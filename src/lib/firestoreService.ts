import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  AiUsageLogDoc,
  AppSettingsDoc,
  DeviceRequestDoc,
  LanguageCode,
  SensitivityProfileDoc,
  SharedProfileDoc,
  SmartphoneDevice,
  ThemeMode,
  UserProfileDoc,
  UserReportDoc,
} from '../types';
import { VERIFIED_DEVICES } from '../data/devices';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'anshuls2052006@gmail.com';

function safeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val.trim() : String(val ?? fallback).trim();
  return (str || fallback).slice(0, maxLen);
}

function clampStrList(arr: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .map((item) => clampStr(item, maxItemLen, ''))
    .filter((item) => item.length > 0);
}

function clampInt(val: unknown, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function ensureUserProfile(
  user: User,
  defaults: { language: LanguageCode; theme: ThemeMode }
): Promise<UserProfileDoc | null> {
  if (!user.emailVerified) return null;
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }
    const payload: UserProfileDoc = {
      uid: user.uid,
      email: clampStr(user.email || `${user.uid}@user.local`, 254),
      displayName: clampStr(user.displayName || user.email?.split('@')[0] || 'Player', 80, 'Player'),
      preferredLanguage: defaults.language,
      themeMode: defaults.theme,
      favoriteWeapons: [],
      gameplayStyles: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      UserProfileDoc,
      | 'displayName'
      | 'selectedDeviceId'
      | 'selectedDeviceName'
      | 'preferredLanguage'
      | 'themeMode'
      | 'favoriteWeapons'
      | 'gameplayStyles'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) payload.displayName = clampStr(updates.displayName, 80, 'Player');
    if (updates.selectedDeviceId !== undefined) payload.selectedDeviceId = clampStr(updates.selectedDeviceId, 128);
    if (updates.selectedDeviceName !== undefined) payload.selectedDeviceName = clampStr(updates.selectedDeviceName, 120);
    if (updates.preferredLanguage !== undefined) payload.preferredLanguage = updates.preferredLanguage;
    if (updates.themeMode !== undefined) payload.themeMode = updates.themeMode;
    if (updates.favoriteWeapons !== undefined) payload.favoriteWeapons = clampStrList(updates.favoriteWeapons, 10, 40);
    if (updates.gameplayStyles !== undefined) payload.gameplayStyles = clampStrList(updates.gameplayStyles, 10, 50);
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserAccountData(uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const profilesSnap = await getDocs(query(collection(db, 'sensitivityProfiles'), where('userId', '==', uid)));
    profilesSnap.forEach((d) => batch.delete(d.ref));

    const requestsSnap = await getDocs(query(collection(db, 'deviceRequests'), where('userId', '==', uid)));
    requestsSnap.forEach((d) => batch.delete(d.ref));

    const reportsSnap = await getDocs(query(collection(db, 'userReports'), where('userId', '==', uid)));
    reportsSnap.forEach((d) => batch.delete(d.ref));

    batch.delete(doc(db, 'users', uid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfileDoc | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfileDoc) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

// --- Devices Catalog ---
export function subscribeToDevices(
  onData: (devices: SmartphoneDevice[]) => void
): Unsubscribe {
  const path = 'devices';
  return onSnapshot(
    collection(db, 'devices'),
    (snap) => {
      const firestoreDevices = new Map<string, SmartphoneDevice>();
      snap.forEach((d) => {
        const item = d.data() as SmartphoneDevice;
        firestoreDevices.set(item.id, item);
      });
      // Merge curated baseline with Firestore overrides/additions
      const merged: SmartphoneDevice[] = [];
      const seen = new Set<string>();
      for (const base of VERIFIED_DEVICES) {
        const override = firestoreDevices.get(base.id);
        if (override) {
          seen.add(base.id);
          if (!override.archived) merged.push({ ...base, ...override });
        } else {
          seen.add(base.id);
          merged.push(base);
        }
      }
      firestoreDevices.forEach((dev, id) => {
        if (!seen.has(id) && !dev.archived) {
          merged.push(dev);
        }
      });
      onData(merged);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function upsertDevice(device: Omit<SmartphoneDevice, 'createdAt' | 'updatedAt'>, isNew: boolean, adminUid: string): Promise<void> {
  const id = clampStr(device.id || safeId('dev'), 128).replace(/[^a-zA-Z0-9_-]/g, '-');
  const path = `devices/${id}`;
  try {
    const ref = doc(db, 'devices', id);
    const existingSnap = await getDoc(ref);
    const payload = {
      id,
      brand: clampStr(device.brand, 60, 'Custom'),
      series: clampStr(device.series, 60, 'General'),
      model: clampStr(device.model, 100, 'Device'),
      ramVariants: clampStrList(device.ramVariants, 10, 20),
      storageVariants: clampStrList(device.storageVariants, 10, 20),
      processor: clampStr(device.processor, 120, 'Unknown'),
      refreshRates: (device.refreshRates || [60]).slice(0, 6).map((n) => clampInt(n, 30, 240)),
      resolution: clampStr(device.resolution, 40, '1080 x 2400'),
      displaySize: clampStr(device.displaySize, 30, '6.5"'),
      os: clampStr(device.os, 50, 'Android 14'),
      fpsOptions: clampStrList(device.fpsOptions, 6, 30),
      releaseYear: clampInt(device.releaseYear, 2015, 2030),
      tier: device.tier,
      verified: Boolean(device.verified),
      archived: Boolean(device.archived),
      updatedBy: clampStr(adminUid, 128),
      createdAt: existingSnap.exists() && !isNew ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function archiveOrDeleteDevice(deviceId: string, isBaselineDevice: boolean, adminUid: string): Promise<void> {
  const path = `devices/${deviceId}`;
  try {
    if (isBaselineDevice) {
      const base = VERIFIED_DEVICES.find((d) => d.id === deviceId);
      if (!base) return;
      await upsertDevice({ ...base, archived: true }, false, adminUid);
    } else {
      await deleteDoc(doc(db, 'devices', deviceId));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Sensitivity Profiles ---
export async function saveSensitivityProfile(
  uid: string,
  input: Omit<SensitivityProfileDoc, 'id' | 'userId' | 'shareCode' | 'createdAt' | 'updatedAt'>
): Promise<SensitivityProfileDoc> {
  const id = safeId('prof');
  const shareCode = safeId('hs');
  const path = `sensitivityProfiles/${id}`;
  const scaleMax = clampInt(input.sensitivityScaleMax, 100, 400);
  const payload: SensitivityProfileDoc = {
    id,
    userId: uid,
    deviceName: clampStr(input.deviceName, 140, 'Smartphone'),
    deviceBrand: clampStr(input.deviceBrand, 60, 'Custom'),
    deviceModel: clampStr(input.deviceModel, 100, 'Model'),
    deviceTier: input.deviceTier,
    isCustomDevice: Boolean(input.isCustomDevice),
    isTestedSetting: Boolean(input.isTestedSetting),
    gameplayStyles: clampStrList(input.gameplayStyles, 10, 60),
    accuracyFocus: clampStr(input.accuracyFocus, 80, 'Balanced accuracy'),
    favoriteWeapons: clampStrList(input.favoriteWeapons, 10, 40),
    sensitivityScaleMax: scaleMax,
    sensitivity: {
      general: clampInt(input.sensitivity.general, 0, scaleMax),
      red_dot: clampInt(input.sensitivity.red_dot, 0, scaleMax),
      scope_2x: clampInt(input.sensitivity.scope_2x, 0, scaleMax),
      scope_4x: clampInt(input.sensitivity.scope_4x, 0, scaleMax),
      sniper_scope: clampInt(input.sensitivity.sniper_scope, 0, scaleMax),
      free_look: clampInt(input.sensitivity.free_look, 0, scaleMax),
    },
    reasoning: {
      general: clampStr(input.reasoning.general, 780, 'Calibrated for general movement.'),
      red_dot: clampStr(input.reasoning.red_dot, 780, 'Calibrated for red dot drag.'),
      scope_2x: clampStr(input.reasoning.scope_2x, 780, 'Calibrated for 2x scope.'),
      scope_4x: clampStr(input.reasoning.scope_4x, 780, 'Calibrated for 4x scope.'),
      sniper_scope: clampStr(input.reasoning.sniper_scope, 780, 'Calibrated for sniper scope.'),
      free_look: clampStr(input.reasoning.free_look, 780, 'Calibrated for free look.'),
    },
    weaponRecommendations: clampStrList(input.weaponRecommendations, 10, 480),
    calibrationTips: clampStrList(input.calibrationTips, 10, 480),
    confidence: clampStr(input.confidence, 60, 'AI-Estimated Configuration'),
    limitations: clampStrList(input.limitations, 10, 480),
    ...(input.parentProfileId ? { parentProfileId: clampStr(input.parentProfileId, 128) } : {}),
    ...(input.calibrationIssue ? { calibrationIssue: clampStr(input.calibrationIssue, 140) } : {}),
    isFavorite: Boolean(input.isFavorite),
    shareCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'sensitivityProfiles', id), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleFavoriteProfile(profileId: string, nextValue: boolean): Promise<void> {
  const path = `sensitivityProfiles/${profileId}`;
  try {
    await updateDoc(doc(db, 'sensitivityProfiles', profileId), {
      isFavorite: nextValue,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSensitivityProfile(profileId: string): Promise<void> {
  const path = `sensitivityProfiles/${profileId}`;
  try {
    await deleteDoc(doc(db, 'sensitivityProfiles', profileId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserProfiles(
  uid: string,
  onData: (profiles: SensitivityProfileDoc[]) => void
): Unsubscribe {
  const path = 'sensitivityProfiles';
  const q = query(
    collection(db, 'sensitivityProfiles'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows: SensitivityProfileDoc[] = [];
      snap.forEach((d) => rows.push(d.data() as SensitivityProfileDoc));
      onData(rows);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// --- Shareable Profiles ---
export async function createSharedProfile(
  uid: string,
  profile: Omit<SharedProfileDoc, 'ownerId' | 'createdAt'>
): Promise<string> {
  const shareId = clampStr(profile.shareId || safeId('share'), 64).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `sharedProfiles/${shareId}`;
  const scaleMax = clampInt(profile.sensitivityScaleMax, 100, 400);
  const payload: SharedProfileDoc = {
    shareId,
    ownerId: uid,
    deviceName: clampStr(profile.deviceName, 140, 'Smartphone'),
    gameplayStyles: clampStrList(profile.gameplayStyles, 10, 60),
    accuracyFocus: clampStr(profile.accuracyFocus, 80, 'Balanced accuracy'),
    sensitivityScaleMax: scaleMax,
    sensitivity: {
      general: clampInt(profile.sensitivity.general, 0, scaleMax),
      red_dot: clampInt(profile.sensitivity.red_dot, 0, scaleMax),
      scope_2x: clampInt(profile.sensitivity.scope_2x, 0, scaleMax),
      scope_4x: clampInt(profile.sensitivity.scope_4x, 0, scaleMax),
      sniper_scope: clampInt(profile.sensitivity.sniper_scope, 0, scaleMax),
      free_look: clampInt(profile.sensitivity.free_look, 0, scaleMax),
    },
    reasoning: {
      general: clampStr(profile.reasoning.general, 780, 'General aim setting.'),
      red_dot: clampStr(profile.reasoning.red_dot, 780, 'Red dot drag setting.'),
      scope_2x: clampStr(profile.reasoning.scope_2x, 780, '2X scope setting.'),
      scope_4x: clampStr(profile.reasoning.scope_4x, 780, '4X scope setting.'),
      sniper_scope: clampStr(profile.reasoning.sniper_scope, 780, 'Sniper scope setting.'),
      free_look: clampStr(profile.reasoning.free_look, 780, 'Free look setting.'),
    },
    confidence: clampStr(profile.confidence, 60, 'AI-Estimated Configuration'),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'sharedProfiles', shareId), payload);
    return shareId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getSharedProfile(shareId: string): Promise<SharedProfileDoc | null> {
  const path = `sharedProfiles/${shareId}`;
  try {
    const snap = await getDoc(doc(db, 'sharedProfiles', shareId));
    return snap.exists() ? (snap.data() as SharedProfileDoc) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// --- Device Requests ---
export async function submitDeviceRequest(
  uid: string,
  req: Omit<DeviceRequestDoc, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = safeId('dreq');
  const path = `deviceRequests/${id}`;
  const payload: DeviceRequestDoc = {
    id,
    userId: uid,
    brand: clampStr(req.brand, 60, 'Other'),
    model: clampStr(req.model, 100, 'Unknown Model'),
    ram: clampStr(req.ram, 30, '8GB'),
    processor: clampStr(req.processor, 100, 'Unknown'),
    refreshRate: clampStr(req.refreshRate, 30, '60Hz'),
    resolution: clampStr(req.resolution, 40, '1080 x 2400'),
    os: clampStr(req.os, 40, 'Android 14'),
    fpsOption: clampStr(req.fpsOption, 30, 'High (60 FPS)'),
    notes: clampStr(req.notes || '', 400, ''),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'deviceRequests', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToUserDeviceRequests(
  uid: string,
  onData: (items: DeviceRequestDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, 'deviceRequests'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: DeviceRequestDoc[] = [];
      snap.forEach((d) => list.push(d.data() as DeviceRequestDoc));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'deviceRequests')
  );
}

export function subscribeToAllDeviceRequests(
  onData: (items: DeviceRequestDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, 'deviceRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: DeviceRequestDoc[] = [];
      snap.forEach((d) => list.push(d.data() as DeviceRequestDoc));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'deviceRequests')
  );
}

export async function reviewDeviceRequest(
  req: DeviceRequestDoc,
  decision: 'approved' | 'rejected',
  adminUid: string
): Promise<void> {
  const path = `deviceRequests/${req.id}`;
  try {
    await updateDoc(doc(db, 'deviceRequests', req.id), {
      status: decision,
      updatedAt: serverTimestamp(),
    });
    if (decision === 'approved') {
      const hz = parseInt(req.refreshRate.replace(/[^0-9]/g, ''), 10) || 60;
      const devId = `${req.brand}-${req.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      await upsertDevice(
        {
          id: devId,
          brand: req.brand,
          series: 'Community Approved',
          model: req.model,
          ramVariants: [req.ram],
          storageVariants: ['128GB', '256GB'],
          processor: req.processor,
          refreshRates: hz > 60 ? [60, hz] : [60],
          resolution: req.resolution,
          displaySize: '6.6"',
          os: req.os,
          fpsOptions: [req.fpsOption],
          releaseYear: new Date().getFullYear(),
          tier: hz >= 120 ? 'mid-range' : 'budget',
          verified: true,
        },
        true,
        adminUid
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- User Reports ---
export async function submitUserReport(
  uid: string,
  report: Omit<UserReportDoc, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = safeId('rep');
  const path = `userReports/${id}`;
  const payload: UserReportDoc = {
    id,
    userId: uid,
    targetType: report.targetType,
    targetId: clampStr(report.targetId || '', 128),
    title: clampStr(report.title, 120, 'Issue report'),
    description: clampStr(report.description, 600, 'Reported via HEADSHOT LAB'),
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'userReports', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToUserReports(
  uid: string,
  onData: (items: UserReportDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, 'userReports'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: UserReportDoc[] = [];
      snap.forEach((d) => list.push(d.data() as UserReportDoc));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'userReports')
  );
}

export function subscribeToAllReports(onData: (items: UserReportDoc[]) => void): Unsubscribe {
  const q = query(collection(db, 'userReports'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: UserReportDoc[] = [];
      snap.forEach((d) => list.push(d.data() as UserReportDoc));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'userReports')
  );
}

export async function resolveUserReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const path = `userReports/${reportId}`;
  try {
    await updateDoc(doc(db, 'userReports', reportId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- App Settings ---
export const DEFAULT_APP_SETTINGS: AppSettingsDoc = {
  sensitivityScaleMax: 200,
  dailyAiLimitPerUser: 40,
  announcementBanner: '',
};

export function subscribeToAppSettings(onData: (settings: AppSettingsDoc) => void): Unsubscribe {
  const path = 'appSettings/global';
  return onSnapshot(
    doc(db, 'appSettings', 'global'),
    (snap) => {
      if (snap.exists()) {
        onData({ ...DEFAULT_APP_SETTINGS, ...(snap.data() as AppSettingsDoc) });
      } else {
        onData(DEFAULT_APP_SETTINGS);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function updateAppSettings(settings: Omit<AppSettingsDoc, 'updatedAt'>): Promise<void> {
  const path = 'appSettings/global';
  try {
    await setDoc(doc(db, 'appSettings', 'global'), {
      sensitivityScaleMax: clampInt(settings.sensitivityScaleMax, 100, 400),
      dailyAiLimitPerUser: clampInt(settings.dailyAiLimitPerUser, 1, 1000),
      announcementBanner: clampStr(settings.announcementBanner, 240, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- AI Usage Logging & Analytics ---
export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getUserTodayAiUsage(uid: string): Promise<number> {
  const dateKey = getTodayDateKey();
  const usageId = `${uid}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const snap = await getDoc(doc(db, 'aiUsageLogs', usageId));
    return snap.exists() ? Number(snap.data().count || 0) : 0;
  } catch {
    return 0;
  }
}

export async function incrementAiUsage(uid: string, modelName: string): Promise<void> {
  const dateKey = getTodayDateKey();
  const usageId = `${uid}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `aiUsageLogs/${usageId}`;
  try {
    const ref = doc(db, 'aiUsageLogs', usageId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentCount = Number(snap.data().count || 0);
      await updateDoc(ref, {
        count: currentCount + 1,
        lastModel: clampStr(modelName, 80, 'gemini-4-hydrogen'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        dateKey,
        count: 1,
        lastModel: clampStr(modelName, 80, 'gemini-4-hydrogen'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToAllAiUsage(onData: (logs: AiUsageLogDoc[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'aiUsageLogs'),
    (snap) => {
      const logs: AiUsageLogDoc[] = [];
      snap.forEach((d) => logs.push(d.data() as AiUsageLogDoc));
      onData(logs);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'aiUsageLogs')
  );
}

export function subscribeToAllProfilesAdmin(onData: (profiles: SensitivityProfileDoc[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'sensitivityProfiles'), orderBy('createdAt', 'desc')),
    (snap) => {
      const list: SensitivityProfileDoc[] = [];
      snap.forEach((d) => list.push(d.data() as SensitivityProfileDoc));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'sensitivityProfiles')
  );
}
