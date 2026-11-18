# HEADSHOT LAB — Security Specification (Phase 0)

## 1. Data Invariants
1. **Default-Deny Baseline**: Every unmapped Firestore path rejects all reads and writes.
2. **PII Isolation**: User documents (`/users/{userId}`) contain email addresses and personal preferences. Only the owning verified user (`request.auth.uid == userId`) or an administrator may read or mutate them. Non-admin users can never `list` `/users`.
3. **Zero Self-Assigned Roles**: Users cannot grant themselves admin privileges in `/users` or `/admins`. Admin status is verified via `/admins/{uid}` or the bootstrapped verified admin email (`anshuls2052006@gmail.com` with `email_verified == true`).
4. **Ownership Immutability**: On `sensitivityProfiles`, `deviceRequests`, `userReports`, `sharedProfiles`, and `aiUsageLogs`, `userId`/`ownerId` and `createdAt` are immutable after creation and must match `request.auth.uid` on creation.
5. **Unverified Submissions Stay Pending**: User-submitted `deviceRequests` must start with `status == 'pending'`, and `userReports` must start with `status == 'open'`. Only admins can transition those states, and terminal states (`approved`, `rejected`, `resolved`, `dismissed`) cannot be overwritten by regular users.
6. **Public Device Catalog Integrity**: Only admins may create, update, or delete `/devices/{deviceId}` documents.
7. **Strict Key & Size Enforcement**: Every document creation enforces `hasAll` and `hasOnly`, every update uses `affectedKeys().hasOnly(...)` combined with `isValid[Entity](incoming())`, and every string and array has bounded `.size()` limits.
8. **No Blanket List Queries**: `sensitivityProfiles`, `deviceRequests`, `userReports`, and `aiUsageLogs` require `resource.data.userId == request.auth.uid || isAdmin()` on `list`. `sharedProfiles` disallows non-admin `list` (only direct `get` by `shareId`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on User Create**: `{ uid: "u1", email: "a@b.com", displayName: "A", preferredLanguage: "en", themeMode: "dark", isAdmin: true, createdAt: serverTimestamp, updatedAt: serverTimestamp }` -> `PERMISSION_DENIED` (`hasOnly` rejects `isAdmin`).
2. **Email Spoofing Admin Bypass**: Token has `email: "anshuls2052006@gmail.com"` with `email_verified: false` attempting `create` on `/devices/test_phone` -> `PERMISSION_DENIED` (`email_verified == true` required).
3. **Cross-User Profile Hijack**: Authenticated user `u2` creates `/sensitivityProfiles/p1` with `userId: "u1"` -> `PERMISSION_DENIED` (`incoming().userId == request.auth.uid`).
4. **Unfiltered List Scraping on Profiles**: Authenticated user `u2` queries `collection(db, "sensitivityProfiles")` without `where("userId", "==", "u2")` -> `PERMISSION_DENIED` (`resource.data.userId == request.auth.uid`).
5. **PII List Scraping on Users**: Authenticated non-admin user calls `getDocs(collection(db, "users"))` -> `PERMISSION_DENIED` (`allow list: if isAdmin()`).
6. **Privilege Escalation via Device Request**: User creates `/deviceRequests/r1` with `status: "approved"` -> `PERMISSION_DENIED` (`incoming().status == 'pending'`).
7. **Terminal State Mutation**: User attempts to update `/deviceRequests/r1` after admin marked it `approved` -> `PERMISSION_DENIED` (only `isAdmin()` can update while `existing().status == 'pending'`).
8. **1.5KB Document ID Poisoning**: User attempts `setDoc(doc(db, "sensitivityProfiles", "a".repeat(500)), ...)` -> `PERMISSION_DENIED` (`isValidId` restricts IDs to `<= 128` chars matching `^[a-zA-Z0-9_-]+$`).
9. **Value Poisoning on Whitelisted Update Key**: User updates `sensitivityProfiles/p1` setting `sensitivity` to a boolean `true` or out-of-range integer `9999` -> `PERMISSION_DENIED` (`isValidSensitivityProfile` validates map fields and integer bounds `0..200`).
10. **Immutable Timestamp Tampering**: User updates `sensitivityProfiles/p1` changing `createdAt` or supplying a backdated `updatedAt` -> `PERMISSION_DENIED` (`createdAt == existing().createdAt` and `updatedAt == request.time`).
11. **Shared Profile Enumeration**: Unauthenticated or standard user calls `getDocs(collection(db, "sharedProfiles"))` -> `PERMISSION_DENIED` (`allow list: if isAdmin()`).
12. **AI Usage Counter Reset**: User updates `/aiUsageLogs/u1_2026-11-18` setting `count: 0` when `existing().count == 5` -> `PERMISSION_DENIED` (`incoming().count == existing().count + 1`).
