import React, { useState } from 'react';
import { Crosshair, Smartphone, Target, ShieldAlert, Sparkles, AlertCircle, SlidersHorizontal } from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  DeviceAnalysisConfig,
  GeneratedSensitivityResult,
  LanguageCode,
  SensitivityValues,
} from '../types';
import { ACCURACY_PROFILES, GAMEPLAY_STYLES, WEAPON_CATEGORIES } from '../data/gameOptions';
import { TRANSLATIONS } from '../i18n/translations';
import { SensitivityResults } from './SensitivityResults';
import { CalibrationModal } from './CalibrationModal';
import {
  createSharedProfile,
  getUserTodayAiUsage,
  incrementAiUsage,
  saveSensitivityProfile,
  submitUserReport,
} from '../lib/firestoreService';

interface GeneratorWorkspaceProps {
  deviceConfig: DeviceAnalysisConfig;
  scaleMax: number;
  dailyAiLimit: number;
  language: LanguageCode;
  user: User | null;
  activeResult: GeneratedSensitivityResult | null;
  previousResult: GeneratedSensitivityResult | null;
  onResultGenerated: (res: GeneratedSensitivityResult, isCalibration?: boolean, issueSummary?: string) => void;
  onChangeDeviceClick: () => void;
  onComparePreviousClick: () => void;
  onOpenAuth: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const GeneratorWorkspace: React.FC<GeneratorWorkspaceProps> = ({
  deviceConfig,
  scaleMax,
  dailyAiLimit,
  language,
  user,
  activeResult,
  onResultGenerated,
  onChangeDeviceClick,
  onComparePreviousClick,
  onOpenAuth,
  onNotify,
}) => {
  const t = TRANSLATIONS[language];

  const [gameplayStyles, setGameplayStyles] = useState<string[]>(['One-Tap Headshot', 'Drag Headshot']);
  const [customStyleNote, setCustomStyleNote] = useState('');
  const [favoriteWeapons, setFavoriteWeapons] = useState<string[]>(['M1887', 'MP40', 'DESERT EAGLE']);
  const [accuracyFocus, setAccuracyFocus] = useState<string>('Balanced accuracy');
  const [includeCurrentBaseline, setIncludeCurrentBaseline] = useState(false);
  const [baselineSens, setBaselineSens] = useState<SensitivityValues>({
    general: 140,
    red_dot: 120,
    scope_2x: 110,
    scope_4x: 95,
    sniper_scope: 80,
    free_look: 100,
  });

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [lastProfileId, setLastProfileId] = useState<string | undefined>(undefined);

  const toggleStyle = (id: string) => {
    setGameplayStyles((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  };

  const toggleWeapon = (weapon: string) => {
    setFavoriteWeapons((prev) => {
      if (prev.includes(weapon)) return prev.filter((w) => w !== weapon);
      if (prev.length >= 10) {
        onNotify('info', 'Maximum 10 favorite weapons', 'Deselect one weapon before adding another.');
        return prev;
      }
      return [...prev, weapon];
    });
  };

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const handleGenerate = async () => {
    setErrorMsg(null);
    if (user && user.emailVerified) {
      const usedToday = await getUserTodayAiUsage(user.uid);
      if (usedToday >= dailyAiLimit) {
        setErrorMsg(`Daily AI generation limit (${dailyAiLimit}) reached for today. Try again tomorrow.`);
        return;
      }
    }

    setGenerating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/sensitivity/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          device: deviceConfig,
          gameplayStyles,
          customStyleNote: gameplayStyles.includes('Custom Profile') ? customStyleNote : '',
          accuracyFocus,
          favoriteWeapons,
          currentSensitivity: includeCurrentBaseline ? baselineSens : null,
          scaleMax,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate sensitivity configuration.');
      }

      if (user && user.emailVerified) {
        void incrementAiUsage(user.uid, data.modelUsed || 'gemini-4-hydrogen').catch(() => {});
      }

      onResultGenerated(data as GeneratedSensitivityResult, false);
      onNotify('success', 'AI Sensitivity Generated', `Optimized for ${deviceConfig.brand} ${deviceConfig.model}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate sensitivity.';
      setErrorMsg(msg);
      onNotify('error', 'Generation Failed', msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!activeResult) return;
    if (!user) {
      onOpenAuth();
      onNotify('info', 'Sign in required', 'Sign in to save sensitivity profiles to your account.');
      return;
    }
    if (!user.emailVerified) {
      onNotify('error', 'Email verification required', 'Verify your email address before saving profiles.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveSensitivityProfile(user.uid, {
        deviceName: activeResult.device,
        deviceBrand: deviceConfig.brand,
        deviceModel: deviceConfig.model,
        deviceTier: deviceConfig.tier,
        isCustomDevice: deviceConfig.isCustomDevice,
        isTestedSetting: Boolean(activeResult.isTestedSetting),
        gameplayStyles,
        accuracyFocus,
        favoriteWeapons,
        sensitivityScaleMax: scaleMax,
        sensitivity: activeResult.sensitivity,
        reasoning: activeResult.reasoning,
        weaponRecommendations: activeResult.weapon_recommendations,
        calibrationTips: activeResult.calibration_tips,
        confidence: activeResult.confidence,
        limitations: activeResult.limitations,
        ...(lastProfileId ? { parentProfileId: lastProfileId } : {}),
        isFavorite: false,
      });
      setLastProfileId(saved.id);
      onNotify('success', 'Profile saved to Dashboard', `${saved.deviceName} sensitivity stored.`);
    } catch (err) {
      onNotify('error', 'Save failed', err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareProfile = async () => {
    if (!activeResult) return;
    if (!user || !user.emailVerified) {
      onOpenAuth();
      onNotify('info', 'Sign in required', 'Sign in with a verified account to create a public share link.');
      return;
    }

    try {
      const shareId = `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await createSharedProfile(user.uid, {
        shareId,
        deviceName: activeResult.device,
        gameplayStyles,
        accuracyFocus,
        sensitivityScaleMax: scaleMax,
        sensitivity: activeResult.sensitivity,
        reasoning: activeResult.reasoning,
        confidence: activeResult.confidence,
      });
      const url = `${window.location.origin}/?share=${shareId}`;
      await navigator.clipboard.writeText(url);
      onNotify('success', 'Shareable profile link copied!', url);
    } catch (err) {
      onNotify('error', 'Unable to share profile', err instanceof Error ? err.message : 'Error creating share link.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) {
      onOpenAuth();
      return;
    }
    try {
      await submitUserReport(user.uid, {
        targetType: 'sensitivity',
        targetId: deviceConfig.deviceId,
        title: reportTitle.trim() || `Issue with ${deviceConfig.model}`,
        description: reportDesc.trim(),
      });
      setReportOpen(false);
      setReportTitle('');
      setReportDesc('');
      onNotify('success', 'Report submitted', 'Thank you. Admins will review your feedback.');
    } catch (err) {
      onNotify('error', 'Report failed', err instanceof Error ? err.message : 'Unable to send report.');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10 pb-20">
      {/* Top Selected Device Banner */}
      <div className="surface-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-600/15 border border-rose-500/30">
            <Smartphone className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">
              Active Hardware Target · {deviceConfig.isCustomDevice ? 'Unverified Custom Entry' : 'Verified Specs'} · Scale 0–{scaleMax}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-0.5">
              {deviceConfig.brand} {deviceConfig.model}
            </h1>
            <div className="text-xs text-zinc-400 mt-1 font-mono-tabular">
              {deviceConfig.ram} RAM · {deviceConfig.refreshRate}Hz · {deviceConfig.gameFpsOption} · {deviceConfig.processor}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangeDeviceClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Change Smartphone / Specs
        </button>
      </div>

      {/* Step 1: Gameplay Style Selection */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{t.gameplayStyleTitle}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select one or more combat styles to shape camera sweep speed and vertical drag curve.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GAMEPLAY_STYLES.map((style) => {
            const selected = gameplayStyles.includes(style.id);
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => toggleStyle(style.id)}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-rose-950/35 border-rose-500 text-white'
                    : 'surface-panel hover:border-white/25 text-zinc-300'
                }`}
              >
                <div className="text-sm font-semibold">{style.label}</div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{style.description}</p>
              </button>
            );
          })}
        </div>

        {gameplayStyles.includes('Custom Profile') && (
          <div className="surface-panel rounded-xl p-4">
            <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
              Custom Gameplay Profile Notes
            </label>
            <input
              type="text"
              value={customStyleNote}
              onChange={(e) => setCustomStyleNote(e.target.value)}
              placeholder="e.g. 3-finger claw grip, prefer fast gloo-wall crouch turns and short upward drag"
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </section>

      {/* Step 2: Weapon-Specific Optimization */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{t.weaponOptTitle}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose up to 10 favorite weapons. Sensitivity affects aim control and drag arc—it does not independently guarantee a headshot or alter weapon damage.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-violet-300">{favoriteWeapons.length} / 10 selected</span>
        </div>

        <div className="surface-panel rounded-2xl p-5 space-y-5">
          {WEAPON_CATEGORIES.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="text-xs font-semibold text-zinc-400 tracking-wide">{group.category}</div>
              <div className="flex flex-wrap gap-2">
                {group.weapons.map((weapon) => {
                  const active = favoriteWeapons.includes(weapon);
                  return (
                    <button
                      key={weapon}
                      type="button"
                      onClick={() => toggleWeapon(weapon)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {weapon}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 3: ACCURACY LAB & Optional Baseline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-400" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{t.accuracyLabTitle}</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Select your primary aim stability priority. Accuracy controls crosshair travel consistency—not bullet damage.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACCURACY_PROFILES.map((item) => {
              const active = accuracyFocus === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccuracyFocus(item.id)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-violet-950/35 border-violet-500 text-white'
                      : 'surface-panel hover:border-white/25 text-zinc-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.summary}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Current Sensitivity Baseline */}
        <div className="lg:col-span-5 surface-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
              <h3 className="font-display text-xl font-bold text-white">Current Sensitivity (Optional)</h3>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCurrentBaseline}
                onChange={(e) => setIncludeCurrentBaseline(e.target.checked)}
              />
              <span>Include</span>
            </label>
          </div>
          <p className="text-xs text-zinc-400">
            Provide your existing in-game values if you want AI to build relative to your current muscle memory.
          </p>

          {includeCurrentBaseline && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(
                [
                  ['general', 'General'],
                  ['red_dot', 'Red Dot'],
                  ['scope_2x', '2X Scope'],
                  ['scope_4x', '4X Scope'],
                  ['sniper_scope', 'Sniper Scope'],
                  ['free_look', 'Free Look'],
                ] as [keyof SensitivityValues, string][]
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-zinc-400 mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    max={scaleMax}
                    value={baselineSens[k]}
                    onChange={(e) =>
                      setBaselineSens((prev) => ({
                        ...prev,
                        [k]: Math.max(0, Math.min(scaleMax, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono-tabular"
                  />
                </div>
              ))}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer glow-crimson disabled:opacity-60"
          >
            {generating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Analyzing Hardware & Generating...
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4" />
                Generate AI Sensitivity Settings
              </>
            )}
          </button>

          <div className="flex items-start gap-2 text-[11px] text-zinc-500">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Powered server-side via Gemini AI. Generates realistic starting baselines tailored to your hardware.</span>
          </div>
        </div>
      </section>

      {/* Results Dashboard */}
      {activeResult && (
        <SensitivityResults
          result={activeResult}
          scaleMax={scaleMax}
          accuracyFocus={accuracyFocus}
          weapons={favoriteWeapons}
          language={language}
          saving={saving}
          regenerating={generating}
          onSaveProfile={handleSaveProfile}
          onRegenerate={handleGenerate}
          onOpenCalibration={() => setCalibrationOpen(true)}
          onCompareWithPrevious={onComparePreviousClick}
          onShareProfile={handleShareProfile}
          onReportIssue={() => setReportOpen(true)}
          onNotify={onNotify}
        />
      )}

      {/* Calibration Modal */}
      {activeResult && (
        <CalibrationModal
          isOpen={calibrationOpen}
          onClose={() => setCalibrationOpen(false)}
          currentResult={activeResult}
          scaleMax={scaleMax}
          gameplayStyles={gameplayStyles}
          favoriteWeapons={favoriteWeapons}
          language={language}
          getAuthToken={getAuthToken}
          onCalibrated={(calibrated, issueSummary) => {
            onResultGenerated(calibrated, true, issueSummary);
            onNotify('success', 'Calibration Applied', 'Controlled adjustments made from your match feedback.');
          }}
        />
      )}

      {/* Report Issue Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="surface-panel rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-white">Report Spec or Sensitivity Issue</h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Summary</label>
                <input
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Incorrect refresh rate or overshoot on 2X scope"
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Details</label>
                <textarea
                  required
                  rows={3}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe the device model or recommendation issue..."
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/15 text-xs text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
