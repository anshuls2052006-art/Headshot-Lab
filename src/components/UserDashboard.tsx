import React, { useState } from 'react';
import { deleteUser, sendEmailVerification, signOut, type User } from 'firebase/auth';
import {
  Star,
  Trash2,
  FileDown,
  LogOut,
  MailCheck,
  Smartphone,
  Sliders,
  History,
  AlertTriangle,
} from 'lucide-react';
import type {
  DeviceAnalysisConfig,
  DeviceRequestDoc,
  GeneratedSensitivityResult,
  SensitivityProfileDoc,
  UserProfileDoc,
  UserReportDoc,
} from '../types';
import { auth } from '../lib/firebase';
import {
  deleteSensitivityProfile,
  deleteUserAccountData,
  toggleFavoriteProfile,
} from '../lib/firestoreService';
import { exportSensitivityPdf } from '../lib/pdfExport';

interface UserDashboardProps {
  user: User | null;
  userProfile: UserProfileDoc | null;
  selectedDeviceConfig: DeviceAnalysisConfig;
  savedProfiles: SensitivityProfileDoc[];
  deviceRequests: DeviceRequestDoc[];
  userReports: UserReportDoc[];
  onOpenAuth: () => void;
  onLoadProfileToGenerator: (profile: SensitivityProfileDoc) => void;
  onCompareClick: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  selectedDeviceConfig,
  savedProfiles,
  deviceRequests,
  userReports,
  onOpenAuth,
  onLoadProfileToGenerator,
  onCompareClick,
  onNotify,
}) => {
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="surface-panel rounded-2xl p-8 space-y-4">
          <Sliders className="w-8 h-8 text-rose-400 mx-auto" />
          <h1 className="font-display text-3xl font-bold text-white">Player Dashboard</h1>
          <p className="text-sm text-zinc-400">
            Sign in to save sensitivity configurations, review calibration history, mark favorite loadouts, and track submitted device requests.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold cursor-pointer glow-crimson"
          >
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  const displayedProfiles = filterFavoritesOnly
    ? savedProfiles.filter((p) => p.isFavorite)
    : savedProfiles;

  const latestProfile = savedProfiles[0] || null;
  const calibrationHistory = savedProfiles.filter((p) => Boolean(p.parentProfileId || p.calibrationIssue));
  const recentWeapons = Array.from(new Set(savedProfiles.flatMap((p) => p.favoriteWeapons))).slice(0, 8);
  const recentStyles = Array.from(new Set(savedProfiles.flatMap((p) => p.gameplayStyles))).slice(0, 6);

  const handleToggleFav = async (p: SensitivityProfileDoc) => {
    try {
      await toggleFavoriteProfile(p.id, !p.isFavorite);
    } catch (err) {
      onNotify('error', 'Update failed', err instanceof Error ? err.message : 'Unable to update favorite.');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteSensitivityProfile(id);
      onNotify('info', 'Profile deleted');
    } catch (err) {
      onNotify('error', 'Delete failed', err instanceof Error ? err.message : 'Unable to delete profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onNotify('info', 'Signed out');
  };

  const handleResendVerification = async () => {
    try {
      await sendEmailVerification(user);
      onNotify('success', 'Verification email sent', 'Check your inbox and reload after verifying.');
    } catch (err) {
      onNotify('error', 'Verification failed', err instanceof Error ? err.message : 'Try again shortly.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccountData(user.uid);
      await deleteUser(user);
      setConfirmDeleteOpen(false);
      onNotify('info', 'Account permanently deleted');
    } catch (err) {
      onNotify(
        'error',
        'Re-authentication required',
        err instanceof Error ? err.message : 'Log out and sign back in recently before deleting your account.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight">
            {user.displayName || 'Player'}&apos;s Command Center
          </h1>
          <div className="text-xs text-zinc-400 mt-1">
            {user.email} · {user.emailVerified ? 'Verified Account' : 'Email Verification Pending'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!user.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
            >
              <MailCheck className="w-3.5 h-3.5" />
              Verify Email
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Top Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="surface-panel rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Smartphone className="w-4 h-4 text-rose-400" />
            <span>Selected Smartphone</span>
          </div>
          <div className="font-display text-2xl font-bold text-white">
            {selectedDeviceConfig.brand} {selectedDeviceConfig.model}
          </div>
          <div className="text-xs text-zinc-400 font-mono-tabular">
            {selectedDeviceConfig.refreshRate}Hz · {selectedDeviceConfig.ram} · {selectedDeviceConfig.gameFpsOption}
          </div>
        </div>

        <div className="surface-panel rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sliders className="w-4 h-4 text-violet-400" />
            <span>Latest Saved Sensitivity</span>
          </div>
          {latestProfile ? (
            <>
              <div className="font-display text-2xl font-bold text-white truncate">{latestProfile.deviceName}</div>
              <div className="text-xs font-mono-tabular text-zinc-300">
                Gen {latestProfile.sensitivity.general} · Red {latestProfile.sensitivity.red_dot} · 2X{' '}
                {latestProfile.sensitivity.scope_2x} · 4X {latestProfile.sensitivity.scope_4x}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-400">No profiles saved yet.</div>
          )}
        </div>

        <div className="surface-panel rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <History className="w-4 h-4 text-rose-400" />
            <span>Saved Profiles & Calibrations</span>
          </div>
          <div className="font-mono-tabular text-3xl font-bold text-white">
            {savedProfiles.length} <span className="text-sm font-normal text-zinc-400">profiles</span>
          </div>
          <div className="text-xs text-zinc-400">
            {calibrationHistory.length} calibrated iterations · {savedProfiles.filter((p) => p.isFavorite).length} favorites
          </div>
        </div>
      </div>

      {/* Favorite Weapons & Recent Styles */}
      {(recentWeapons.length > 0 || recentStyles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="surface-panel rounded-xl p-5 space-y-2">
            <div className="text-xs font-semibold text-zinc-400">Recent Favorite Weapons</div>
            <div className="text-sm text-zinc-200">
              {recentWeapons.length > 0 ? recentWeapons.join(' · ') : 'None saved yet'}
            </div>
          </div>
          <div className="surface-panel rounded-xl p-5 space-y-2">
            <div className="text-xs font-semibold text-zinc-400">Recently Used Gameplay Styles</div>
            <div className="text-sm text-zinc-200">
              {recentStyles.length > 0 ? recentStyles.join(' · ') : 'None saved yet'}
            </div>
          </div>
        </div>
      )}

      {/* Saved Profiles Table / Cards */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold text-white">Saved Sensitivity Profiles</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterFavoritesOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                filterFavoritesOnly
                  ? 'bg-rose-600/20 border-rose-500 text-rose-200'
                  : 'border-white/15 bg-white/5 text-zinc-300'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              {filterFavoritesOnly ? 'Showing Favorites' : 'Filter Favorites'}
            </button>

            <button
              type="button"
              onClick={onCompareClick}
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Compare Profiles
            </button>
          </div>
        </div>

        {displayedProfiles.length === 0 ? (
          <div className="surface-panel rounded-xl p-8 text-center text-sm text-zinc-400">
            {filterFavoritesOnly
              ? 'No favorite profiles marked yet.'
              : 'Generate and save a sensitivity profile to view your history here.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedProfiles.map((profile) => {
              const asResult: GeneratedSensitivityResult = {
                device: profile.deviceName,
                gameplay_style: profile.gameplayStyles.join(', '),
                sensitivity: profile.sensitivity,
                reasoning: profile.reasoning,
                weapon_recommendations: profile.weaponRecommendations,
                calibration_tips: profile.calibrationTips,
                confidence: profile.confidence,
                limitations: profile.limitations,
                isTestedSetting: profile.isTestedSetting,
              };

              return (
                <div key={profile.id} className="surface-panel rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-zinc-400">
                        {profile.calibrationIssue
                          ? `Calibrated: ${profile.calibrationIssue}`
                          : profile.gameplayStyles.slice(0, 2).join(' · ')}
                      </div>
                      <h3 className="font-display text-2xl font-bold text-white mt-0.5">{profile.deviceName}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleFav(profile)}
                        aria-label="Toggle favorite"
                        className="p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${profile.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(profile.id)}
                        aria-label="Delete profile"
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular bg-black/40 p-3 rounded-lg border border-white/10">
                    <div>GEN: <span className="text-white font-semibold">{profile.sensitivity.general}</span></div>
                    <div>RED: <span className="text-white font-semibold">{profile.sensitivity.red_dot}</span></div>
                    <div>2X: <span className="text-white font-semibold">{profile.sensitivity.scope_2x}</span></div>
                    <div>4X: <span className="text-white font-semibold">{profile.sensitivity.scope_4x}</span></div>
                    <div>AWM: <span className="text-white font-semibold">{profile.sensitivity.sniper_scope}</span></div>
                    <div>LOOK: <span className="text-white font-semibold">{profile.sensitivity.free_look}</span></div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadProfileToGenerator(profile)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Open & Calibrate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportSensitivityPdf({
                          result: asResult,
                          scaleMax: profile.sensitivityScaleMax,
                          accuracyFocus: profile.accuracyFocus,
                          weapons: profile.favoriteWeapons,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submitted Device Requests & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-2xl font-bold text-white">Your Device Submissions</h3>
          {deviceRequests.length === 0 ? (
            <p className="text-xs text-zinc-400">No unlisted smartphone requests submitted yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {deviceRequests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="text-white font-semibold">{req.brand} {req.model}</div>
                    <div className="text-zinc-400">{req.ram} · {req.refreshRate} · {req.processor}</div>
                  </div>
                  <span className="capitalize text-violet-300 font-semibold">{req.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-2xl font-bold text-white">Your Feedback Reports</h3>
          {userReports.length === 0 ? (
            <p className="text-xs text-zinc-400">No reports filed.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {userReports.map((rep) => (
                <div key={rep.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="text-white font-semibold">{rep.title}</div>
                    <div className="text-zinc-400 truncate max-w-xs">{rep.description}</div>
                  </div>
                  <span className="capitalize text-rose-300 font-semibold">{rep.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Deletion Confirmation */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="surface-panel rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display text-2xl font-bold text-white">Delete Account Permanently</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This removes your user profile, saved sensitivity profiles, device requests, and authentication record permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {deletingAccount ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
