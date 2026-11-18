import React, { useState } from 'react';
import { Sliders, X, AlertCircle } from 'lucide-react';
import { CALIBRATION_ISSUES } from '../data/gameOptions';
import type { GeneratedSensitivityResult, LanguageCode } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResult: GeneratedSensitivityResult;
  scaleMax: number;
  gameplayStyles: string[];
  favoriteWeapons: string[];
  language: LanguageCode;
  getAuthToken: () => Promise<string | null>;
  onCalibrated: (newResult: GeneratedSensitivityResult, issueSummary: string) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentResult,
  scaleMax,
  gameplayStyles,
  favoriteWeapons,
  language,
  getAuthToken,
  onCalibrated,
}) => {
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [playerNotes, setPlayerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleIssue = (label: string) => {
    setSelectedIssues((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleRunCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIssues.length === 0) {
      setErrorMsg('Select at least one match feedback issue to calibrate.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/sensitivity/calibrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deviceName: currentResult.device,
          previousSensitivity: currentResult.sensitivity,
          issues: selectedIssues,
          playerNotes,
          gameplayStyles,
          favoriteWeapons,
          scaleMax,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Calibration request failed.');
      }

      onCalibrated(data as GeneratedSensitivityResult, selectedIssues.join('; '));
      setSelectedIssues([]);
      setPlayerNotes('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete AI calibration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="surface-panel rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-violet-400" />
            <div>
              <h3 className="font-display text-2xl font-bold text-white">AI Calibration Mode</h3>
              <p className="text-xs text-zinc-400">
                Controlled incremental adjustments based on real match feedback.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calibration modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-black/40 border border-white/10 grid grid-cols-3 gap-2 text-xs font-mono-tabular">
          <div>Gen: <span className="text-white">{currentResult.sensitivity.general}</span></div>
          <div>Red Dot: <span className="text-white">{currentResult.sensitivity.red_dot}</span></div>
          <div>2X: <span className="text-white">{currentResult.sensitivity.scope_2x}</span></div>
          <div>4X: <span className="text-white">{currentResult.sensitivity.scope_4x}</span></div>
          <div>Sniper: <span className="text-white">{currentResult.sensitivity.sniper_scope}</span></div>
          <div>Look: <span className="text-white">{currentResult.sensitivity.free_look}</span></div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRunCalibration} className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-200">What happened in your test matches?</div>
            <div className="space-y-2">
              {CALIBRATION_ISSUES.map((issue) => {
                const checked = selectedIssues.includes(issue.label);
                return (
                  <label
                    key={issue.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-violet-950/40 border-violet-500 text-white'
                        : 'bg-black/40 border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIssue(issue.label)}
                    />
                    <span>{issue.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">
              Additional Match Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={playerNotes}
              onChange={(e) => setPlayerNotes(e.target.value)}
              placeholder="e.g. M1887 drags smoothly, but MP40 drags overshoot past the head at 15m"
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/15 text-xs text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Calibrating...' : 'Apply AI Calibration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
