import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileDown,
  Bookmark,
  RefreshCw,
  GitCompare,
  Sliders,
  Share2,
  Flag,
  Info,
} from 'lucide-react';
import type { GeneratedSensitivityResult, LanguageCode } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { exportSensitivityPdf } from '../lib/pdfExport';

interface SensitivityResultsProps {
  result: GeneratedSensitivityResult;
  scaleMax: number;
  accuracyFocus: string;
  weapons: string[];
  language: LanguageCode;
  saving: boolean;
  regenerating: boolean;
  onSaveProfile: () => void;
  onRegenerate: () => void;
  onOpenCalibration: () => void;
  onCompareWithPrevious: () => void;
  onShareProfile: () => void;
  onReportIssue: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SensitivityResults: React.FC<SensitivityResultsProps> = ({
  result,
  scaleMax,
  accuracyFocus,
  weapons,
  language,
  saving,
  regenerating,
  onSaveProfile,
  onRegenerate,
  onOpenCalibration,
  onCompareWithPrevious,
  onShareProfile,
  onReportIssue,
  onNotify,
}) => {
  const t = TRANSLATIONS[language];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cards = [
    { key: 'general', label: t.general, value: result.sensitivity.general, reason: result.reasoning.general },
    { key: 'red_dot', label: t.redDot, value: result.sensitivity.red_dot, reason: result.reasoning.red_dot },
    { key: 'scope_2x', label: t.scope2x, value: result.sensitivity.scope_2x, reason: result.reasoning.scope_2x },
    { key: 'scope_4x', label: t.scope4x, value: result.sensitivity.scope_4x, reason: result.reasoning.scope_4x },
    { key: 'sniper_scope', label: t.sniperScope, value: result.sensitivity.sniper_scope, reason: result.reasoning.sniper_scope },
    { key: 'free_look', label: t.freeLook, value: result.sensitivity.free_look, reason: result.reasoning.free_look },
  ];

  const handleCopySingle = async (key: string, label: string, val: number) => {
    try {
      await navigator.clipboard.writeText(`${label}: ${val}`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
      onNotify('success', `${label} copied (${val})`);
    } catch {
      onNotify('error', 'Clipboard unavailable');
    }
  };

  const handleCopyAll = async () => {
    const text = [
      `HEADSHOT LAB — ${result.device} (0-${scaleMax} Scale)`,
      `Style: ${result.gameplay_style} | Focus: ${accuracyFocus}`,
      `General: ${result.sensitivity.general}`,
      `Red Dot: ${result.sensitivity.red_dot}`,
      `2X Scope: ${result.sensitivity.scope_2x}`,
      `4X Scope: ${result.sensitivity.scope_4x}`,
      `Sniper Scope: ${result.sensitivity.sniper_scope}`,
      `Free Look: ${result.sensitivity.free_look}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      onNotify('success', 'All 6 sensitivity values copied to clipboard');
    } catch {
      onNotify('error', 'Clipboard unavailable');
    }
  };

  const handleDownloadPdf = () => {
    exportSensitivityPdf({
      result,
      scaleMax,
      accuracyFocus,
      weapons,
    });
    onNotify('success', 'PDF specification sheet downloaded');
  };

  return (
    <div className="space-y-6 pt-6 border-t border-white/10">
      {/* Header Banner */}
      <div className="surface-panel rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="text-rose-400 font-semibold">
              {result.isTestedSetting ? 'Verified Baseline Profile' : 'AI-Estimated Starting Configuration'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Scale: 0–{scaleMax}</span>
            <span aria-hidden="true">·</span>
            <span>{result.confidence}</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {t.resultsTitle} — {result.device}
          </h2>
          <div className="text-xs text-zinc-400">
            Gameplay Style: <span className="text-zinc-200">{result.gameplay_style}</span> · Accuracy Lab:{' '}
            <span className="text-zinc-200">{accuracyFocus}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            {t.copyAll}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-400" />
            {t.downloadPdf}
          </button>

          <button
            type="button"
            onClick={onSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : t.saveProfile}
          </button>
        </div>
      </div>

      {/* 6 Sensitivity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const pct = Math.min(100, Math.round((card.value / scaleMax) * 100));
          return (
            <div key={card.key} className="surface-panel rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wider text-zinc-400">{card.label}</span>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(card.key, card.label, card.value)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 cursor-pointer"
                  >
                    {copiedKey === card.key ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-mono-tabular text-4xl font-bold text-white">{card.value}</span>
                  <span className="text-xs font-mono-tabular text-zinc-500">/ {scaleMax}</span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-600 to-violet-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">{card.reason}</p>
            </div>
          );
        })}
      </div>

      {/* Action Strip */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenCalibration}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer glow-violet"
        >
          <Sliders className="w-4 h-4" />
          {t.calibrateBtn}
        </button>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          {t.regenerate}
        </button>

        <button
          type="button"
          onClick={onCompareWithPrevious}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <GitCompare className="w-4 h-4 text-rose-400" />
          {t.comparePrev}
        </button>

        <button
          type="button"
          onClick={onShareProfile}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-violet-400" />
          {t.shareBtn}
        </button>

        <button
          type="button"
          onClick={onReportIssue}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Flag className="w-4 h-4 text-zinc-400" />
          {t.reportBtn}
        </button>
      </div>

      {/* Weapon Advice, Calibration Tips & Transparent Limitations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="surface-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-xl font-bold text-white">Weapon Handling & Drag</h3>
          <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
            {result.weapon_recommendations.map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>

        <div className="surface-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-xl font-bold text-white">Training Ground Calibration</h3>
          <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
            {result.calibration_tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </div>

        <div className="surface-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-400" />
            <h3 className="font-display text-xl font-bold text-white">Limitations & Transparency</h3>
          </div>
          <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed">
            {result.limitations.map((lim, idx) => (
              <li key={idx}>• {lim}</li>
            ))}
            <li>• Sensitivity improves aim control and drag consistency; it does not increase weapon damage or guarantee 100% headshots.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
