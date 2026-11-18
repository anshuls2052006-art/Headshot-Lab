import React, { useMemo, useState } from 'react';
import { GitCompare, Smartphone, Sliders } from 'lucide-react';
import type { GeneratedSensitivityResult, SensitivityProfileDoc, SmartphoneDevice } from '../types';

interface CompareViewProps {
  devices: SmartphoneDevice[];
  savedProfiles: SensitivityProfileDoc[];
  activeResult: GeneratedSensitivityResult | null;
  previousResult: GeneratedSensitivityResult | null;
  scaleMax: number;
}

type CompareTab = 'profiles' | 'devices';

export const CompareView: React.FC<CompareViewProps> = ({
  devices,
  savedProfiles,
  activeResult,
  previousResult,
  scaleMax,
}) => {
  const [tab, setTab] = useState<CompareTab>('profiles');

  // Build selectable profile pool (session current, session previous, + saved Firestore profiles)
  const profileOptions = useMemo(() => {
    const items: {
      id: string;
      label: string;
      device: string;
      style: string;
      sensitivity: GeneratedSensitivityResult['sensitivity'];
      reasoning: GeneratedSensitivityResult['reasoning'];
    }[] = [];

    if (activeResult) {
      items.push({
        id: '__active__',
        label: `Current Session · ${activeResult.device}`,
        device: activeResult.device,
        style: activeResult.gameplay_style,
        sensitivity: activeResult.sensitivity,
        reasoning: activeResult.reasoning,
      });
    }
    if (previousResult) {
      items.push({
        id: '__previous__',
        label: `Previous Session · ${previousResult.device}`,
        device: previousResult.device,
        style: previousResult.gameplay_style,
        sensitivity: previousResult.sensitivity,
        reasoning: previousResult.reasoning,
      });
    }
    savedProfiles.forEach((p) => {
      items.push({
        id: p.id,
        label: `${p.deviceName} · ${p.gameplayStyles.slice(0, 2).join(', ')}`,
        device: p.deviceName,
        style: p.gameplayStyles.join(', '),
        sensitivity: p.sensitivity,
        reasoning: p.reasoning,
      });
    });
    return items;
  }, [activeResult, previousResult, savedProfiles]);

  const [leftProfileId, setLeftProfileId] = useState<string>(profileOptions[0]?.id || '');
  const [rightProfileId, setRightProfileId] = useState<string>(profileOptions[1]?.id || profileOptions[0]?.id || '');

  const leftProfile = profileOptions.find((p) => p.id === leftProfileId) || profileOptions[0] || null;
  const rightProfile = profileOptions.find((p) => p.id === rightProfileId) || profileOptions[1] || profileOptions[0] || null;

  const [devAId, setDevAId] = useState<string>(devices[0]?.id || '');
  const [devBId, setDevBId] = useState<string>(devices[1]?.id || devices[0]?.id || '');
  const devA = devices.find((d) => d.id === devAId) || devices[0];
  const devB = devices.find((d) => d.id === devBId) || devices[1] || devices[0];

  const rows = [
    { key: 'general', label: 'General' },
    { key: 'red_dot', label: 'Red Dot' },
    { key: 'scope_2x', label: '2X Scope' },
    { key: 'scope_4x', label: '4X Scope' },
    { key: 'sniper_scope', label: 'Sniper Scope' },
    { key: 'free_look', label: 'Free Look' },
  ] as const;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Comparison Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Compare saved or iterative sensitivity configurations side-by-side, or benchmark two smartphones.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-black/60 border border-white/10">
          <button
            type="button"
            onClick={() => setTab('profiles')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'profiles' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Compare Sensitivity Profiles
          </button>
          <button
            type="button"
            onClick={() => setTab('devices')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'devices' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Compare Smartphones
          </button>
        </div>
      </div>

      {tab === 'profiles' ? (
        profileOptions.length < 1 ? (
          <div className="surface-panel rounded-2xl p-10 text-center space-y-3">
            <GitCompare className="w-8 h-8 text-zinc-500 mx-auto" />
            <div className="text-base font-semibold text-white">No sensitivity profiles available yet</div>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Generate at least one sensitivity profile in the Generator tab—or run AI Calibration Mode—to compare old vs new settings visually.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="surface-panel rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-rose-400 font-semibold mb-1.5">Profile A (Baseline / Old)</label>
                <select
                  value={leftProfile?.id || ''}
                  onChange={(e) => setLeftProfileId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                >
                  {profileOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-violet-400 font-semibold mb-1.5">Profile B (Target / Calibrated)</label>
                <select
                  value={rightProfile?.id || ''}
                  onChange={(e) => setRightProfileId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                >
                  {profileOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {leftProfile && rightProfile && (
              <>
                {/* Visual Bar Chart Comparison */}
                <div className="surface-panel rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-2xl font-bold text-white">Visual Sensitivity Delta</h2>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        <span className="w-3 h-2 rounded-sm bg-rose-500 inline-block" /> Profile A ({leftProfile.device})
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        <span className="w-3 h-2 rounded-sm bg-violet-500 inline-block" /> Profile B ({rightProfile.device})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {rows.map((row) => {
                      const valA = leftProfile.sensitivity[row.key];
                      const valB = rightProfile.sensitivity[row.key];
                      const delta = valB - valA;
                      const pctA = Math.min(100, Math.round((valA / scaleMax) * 100));
                      const pctB = Math.min(100, Math.round((valB / scaleMax) * 100));

                      return (
                        <div key={row.key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-200">{row.label}</span>
                            <div className="font-mono-tabular flex items-center gap-3">
                              <span className="text-rose-400">A: {valA}</span>
                              <span className="text-violet-400">B: {valB}</span>
                              <span className={delta === 0 ? 'text-zinc-500' : delta > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pctA}%` }} />
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pctB}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation Table */}
                <div className="surface-panel rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/10">
                    <h3 className="font-display text-2xl font-bold text-white">Why Values Differ</h3>
                  </div>
                  <div className="divide-y divide-white/10">
                    {rows.map((row) => {
                      const valA = leftProfile.sensitivity[row.key];
                      const valB = rightProfile.sensitivity[row.key];
                      return (
                        <div key={row.key} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                          <div className="lg:col-span-2 font-semibold text-white">
                            {row.label}
                            <div className="font-mono-tabular text-zinc-400 mt-1">
                              {valA} → {valB}
                            </div>
                          </div>
                          <div className="lg:col-span-5 text-zinc-300 leading-relaxed">
                            <span className="text-rose-400 font-semibold">Profile A: </span>
                            {leftProfile.reasoning[row.key]}
                          </div>
                          <div className="lg:col-span-5 text-zinc-300 leading-relaxed">
                            <span className="text-violet-400 font-semibold">Profile B: </span>
                            {rightProfile.reasoning[row.key]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      ) : (
        /* Smartphone Hardware Comparison */
        <div className="space-y-6">
          <div className="surface-panel rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-rose-400 font-semibold mb-1.5">Smartphone A</label>
              <select
                value={devA?.id || ''}
                onChange={(e) => setDevAId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.brand} {d.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-violet-400 font-semibold mb-1.5">Smartphone B</label>
              <select
                value={devB?.id || ''}
                onChange={(e) => setDevBId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.brand} {d.model}</option>
                ))}
              </select>
            </div>
          </div>

          {devA && devB && (
            <div className="surface-panel rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-5">Specification</th>
                    <th className="py-3.5 px-5 text-rose-300">{devA.brand} {devA.model}</th>
                    <th className="py-3.5 px-5 text-violet-300">{devB.brand} {devB.model}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-zinc-200">
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">Processor</td>
                    <td className="py-3 px-5">{devA.processor}</td>
                    <td className="py-3 px-5">{devB.processor}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">Max Refresh Rate</td>
                    <td className="py-3 px-5 font-mono-tabular">{Math.max(...devA.refreshRates)} Hz</td>
                    <td className="py-3 px-5 font-mono-tabular">{Math.max(...devB.refreshRates)} Hz</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">RAM Variants</td>
                    <td className="py-3 px-5 font-mono-tabular">{devA.ramVariants.join(', ')}</td>
                    <td className="py-3 px-5 font-mono-tabular">{devB.ramVariants.join(', ')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">Resolution & Size</td>
                    <td className="py-3 px-5">{devA.displaySize} · {devA.resolution}</td>
                    <td className="py-3 px-5">{devB.displaySize} · {devB.resolution}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">Game FPS Support</td>
                    <td className="py-3 px-5">{devA.fpsOptions.join(', ')}</td>
                    <td className="py-3 px-5">{devB.fpsOptions.join(', ')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 text-zinc-400">Performance Tier</td>
                    <td className="py-3 px-5 capitalize">{devA.tier}</td>
                    <td className="py-3 px-5 capitalize">{devB.tier}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
