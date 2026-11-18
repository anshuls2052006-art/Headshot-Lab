import React, { useEffect, useState } from 'react';
import { Copy, FileDown, ArrowRight } from 'lucide-react';
import { getSharedProfile } from '../lib/firestoreService';
import { exportSensitivityPdf } from '../lib/pdfExport';
import type { GeneratedSensitivityResult, SharedProfileDoc } from '../types';

interface SharedProfileViewProps {
  shareId: string;
  onGenerateOwn: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SharedProfileView: React.FC<SharedProfileViewProps> = ({
  shareId,
  onGenerateOwn,
  onNotify,
}) => {
  const [profile, setProfile] = useState<SharedProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSharedProfile(shareId)
      .then((res) => {
        if (active) setProfile(res);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-zinc-400">
        Loading shared sensitivity configuration...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="surface-panel rounded-2xl p-8 space-y-3">
          <h1 className="font-display text-3xl font-bold text-white">Shared Profile Not Found</h1>
          <p className="text-xs text-zinc-400">This sensitivity link may have been removed or is invalid.</p>
          <button
            type="button"
            onClick={onGenerateOwn}
            className="px-5 py-2.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
          >
            Generate Your Own Sensitivity
          </button>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'GENERAL', val: profile.sensitivity.general, reason: profile.reasoning.general },
    { label: 'RED DOT', val: profile.sensitivity.red_dot, reason: profile.reasoning.red_dot },
    { label: '2X SCOPE', val: profile.sensitivity.scope_2x, reason: profile.reasoning.scope_2x },
    { label: '4X SCOPE', val: profile.sensitivity.scope_4x, reason: profile.reasoning.scope_4x },
    { label: 'SNIPER SCOPE', val: profile.sensitivity.sniper_scope, reason: profile.reasoning.sniper_scope },
    { label: 'FREE LOOK', val: profile.sensitivity.free_look, reason: profile.reasoning.free_look },
  ];

  const handleCopyAll = async () => {
    const text = rows.map((r) => `${r.label}: ${r.val}`).join('\n');
    await navigator.clipboard.writeText(text);
    onNotify('success', 'Shared sensitivity copied');
  };

  const handlePdf = () => {
    const asGen: GeneratedSensitivityResult = {
      device: profile.deviceName,
      gameplay_style: profile.gameplayStyles.join(', '),
      sensitivity: profile.sensitivity,
      reasoning: profile.reasoning,
      weapon_recommendations: [],
      calibration_tips: [],
      confidence: profile.confidence,
      limitations: [],
    };
    exportSensitivityPdf({
      result: asGen,
      scaleMax: profile.sensitivityScaleMax,
      accuracyFocus: profile.accuracyFocus,
      weapons: [],
    });
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 space-y-6 pb-20">
      <div className="surface-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-violet-400">
            Shared HEADSHOT LAB Configuration · Scale 0–{profile.sensitivityScaleMax}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-0.5">
            {profile.deviceName}
          </h1>
          <div className="text-xs text-zinc-400 mt-1">
            {profile.gameplayStyles.join(', ')} · {profile.accuracyFocus}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Copy All
          </button>
          <button
            type="button"
            onClick={handlePdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            type="button"
            onClick={onGenerateOwn}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
          >
            Customize For My Phone <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.label} className="surface-panel rounded-xl p-5 space-y-3">
            <div className="text-xs text-zinc-400 font-semibold">{r.label}</div>
            <div className="font-mono-tabular text-4xl font-bold text-white">{r.val}</div>
            <p className="text-xs text-zinc-300 leading-relaxed">{r.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
