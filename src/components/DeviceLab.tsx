import React, { useMemo, useState } from 'react';
import { Search, Smartphone, Compass, PlusCircle, Check, ArrowRight, Cpu, Monitor, AlertCircle } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { DeviceAnalysisConfig, LanguageCode, SmartphoneDevice } from '../types';
import { BRAND_CATEGORIES } from '../data/devices';
import { TRANSLATIONS } from '../i18n/translations';
import { submitDeviceRequest } from '../lib/firestoreService';

interface DeviceLabProps {
  devices: SmartphoneDevice[];
  selectedConfig: DeviceAnalysisConfig;
  onChangeConfig: (cfg: DeviceAnalysisConfig) => void;
  onProceedToGenerator: () => void;
  language: LanguageCode;
  user: User | null;
  onOpenAuth: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const DeviceLab: React.FC<DeviceLabProps> = ({
  devices,
  selectedConfig,
  onChangeConfig,
  onProceedToGenerator,
  language,
  user,
  onOpenAuth,
  onNotify,
}) => {
  const t = TRANSLATIONS[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedSeries, setSelectedSeries] = useState<string>('All');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showFinderModal, setShowFinderModal] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Custom device / Request form state
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customRam, setCustomRam] = useState('8GB');
  const [customStorage, setCustomStorage] = useState('128GB');
  const [customProcessor, setCustomProcessor] = useState('');
  const [customHz, setCustomHz] = useState('90');
  const [customResolution, setCustomResolution] = useState('1080 x 2400');
  const [customDisplaySize, setCustomDisplaySize] = useState('6.6"');
  const [customOs, setCustomOs] = useState('Android 14');
  const [customFps, setCustomFps] = useState('High (60 FPS)');
  const [customNotes, setCustomNotes] = useState('');
  const [submitAlsoAsRequest, setSubmitAlsoAsRequest] = useState(true);

  const availableSeries = useMemo(() => {
    if (selectedBrand === 'All') return [];
    const match = BRAND_CATEGORIES.find((b) => b.brand.toLowerCase() === selectedBrand.toLowerCase());
    if (match) return match.series;
    return Array.from(new Set(devices.filter((d) => d.brand === selectedBrand).map((d) => d.series)));
  }, [selectedBrand, devices]);

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return devices.filter((dev) => {
      if (selectedBrand !== 'All' && dev.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (selectedSeries !== 'All' && dev.series.toLowerCase() !== selectedSeries.toLowerCase()) return false;
      if (!q) return true;
      return (
        dev.model.toLowerCase().includes(q) ||
        dev.brand.toLowerCase().includes(q) ||
        dev.series.toLowerCase().includes(q) ||
        dev.processor.toLowerCase().includes(q)
      );
    });
  }, [devices, searchQuery, selectedBrand, selectedSeries]);

  const selectedDeviceObj = useMemo(
    () => devices.find((d) => d.id === selectedConfig.deviceId) || null,
    [devices, selectedConfig.deviceId]
  );

  const handleSelectDevice = (dev: SmartphoneDevice) => {
    const maxHz = Math.max(...dev.refreshRates);
    const defaultFps = dev.fpsOptions[dev.fpsOptions.length - 1] || 'High (60 FPS)';
    onChangeConfig({
      deviceId: dev.id,
      brand: dev.brand,
      series: dev.series,
      model: dev.model,
      ram: dev.ramVariants[0] || '8GB',
      storage: dev.storageVariants[0] || '128GB',
      processor: dev.processor,
      refreshRate: maxHz,
      resolution: dev.resolution,
      displaySize: dev.displaySize,
      os: dev.os,
      gameFpsOption: defaultFps,
      graphicsSetting: dev.tier === 'budget' ? 'Smooth' : dev.tier === 'mid-range' ? 'Standard' : 'Ultra',
      touchPreference: 'Default',
      dpi: '',
      tier: dev.tier,
      isCustomDevice: false,
    });
    onNotify('info', `${dev.brand} ${dev.model} loaded`, 'Configure RAM, refresh rate, and FPS below.');
  };

  const handleApplyCustomDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBrand.trim() || !customModel.trim()) return;
    const hzNum = Math.max(60, Math.min(240, parseInt(customHz, 10) || 60));

    onChangeConfig({
      deviceId: `custom-${Date.now()}`,
      brand: customBrand.trim(),
      series: 'Custom Entry',
      model: customModel.trim(),
      ram: customRam,
      storage: customStorage,
      processor: customProcessor.trim() || 'User-entered SoC',
      refreshRate: hzNum,
      resolution: customResolution.trim() || '1080 x 2400',
      displaySize: customDisplaySize.trim() || '6.6"',
      os: customOs.trim() || 'Android / iOS',
      gameFpsOption: customFps,
      graphicsSetting: 'Standard',
      touchPreference: 'Default',
      dpi: '',
      tier: 'custom',
      isCustomDevice: true,
    });

    if (submitAlsoAsRequest && user) {
      if (!user.emailVerified) {
        onNotify('info', 'Custom specs applied', 'Verify your email to submit the device request to our catalog.');
      } else {
        setRequestSubmitting(true);
        try {
          await submitDeviceRequest(user.uid, {
            brand: customBrand.trim(),
            model: customModel.trim(),
            ram: customRam,
            processor: customProcessor.trim() || 'Not specified',
            refreshRate: `${hzNum}Hz`,
            resolution: customResolution.trim(),
            os: customOs.trim(),
            fpsOption: customFps,
            notes: customNotes.trim(),
          });
          onNotify('success', 'Custom specs applied & device request submitted', 'Admins will review before marking verified.');
        } catch (err) {
          onNotify('error', 'Request submission failed', err instanceof Error ? err.message : 'Unable to submit request.');
        } finally {
          setRequestSubmitting(false);
        }
      }
    } else {
      onNotify('success', 'Custom smartphone profile active', 'Marked clearly as unverified custom specifications.');
    }

    setShowCustomModal(false);
  };

  const browserDetection = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const ua = navigator.userAgent;
    const width = window.screen.width;
    const height = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    const physicalW = Math.round(width * dpr);
    const physicalH = Math.round(height * dpr);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const cores = navigator.hardwareConcurrency || 'Unavailable';
    return {
      osHint: isIOS ? 'Apple iOS' : isAndroid ? 'Android' : 'Desktop / Other Browser',
      viewportCss: `${width} x ${height}`,
      estimatedPhysicalPx: `${physicalW} x ${physicalH} (DPR ${dpr})`,
      logicalCores: String(cores),
      userAgent: ua,
    };
  }, []);

  const optimizationRecommendations = useMemo(() => {
    const tips: string[] = [];
    if (selectedConfig.tier === 'budget') {
      tips.push('Use Smooth graphics with High FPS to keep frame pacing steady during close-range drag shots.');
    } else if (selectedConfig.tier === 'mid-range') {
      tips.push('Standard graphics + High FPS gives optimal thermal stability over long Clash Squad sessions.');
    } else {
      tips.push('Enable 90Hz/120Hz display mode in system settings and prioritize High/Ultra FPS over Shadow effects.');
    }
    if (selectedConfig.refreshRate >= 120) {
      tips.push(`Your ${selectedConfig.refreshRate}Hz panel tracks rapid finger sweeps cleanly; moderate Red Dot helps prevent overshooting.`);
    } else {
      tips.push('On 60Hz panels, slightly higher General sensitivity compensates for lower frame-to-frame visual feedback.');
    }
    if (selectedConfig.isCustomDevice) {
      tips.push('Using custom user-entered specifications. Verify your in-game FPS cap matches what your device sustains without lag.');
    }
    return tips;
  }, [selectedConfig]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Smartphone Selection & Device Lab
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Search verified Android & iOS smartphones across 18 manufacturers, analyze hardware constraints, or enter custom specifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFinderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-violet-400" />
            Device Finder
          </button>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rose-500/40 bg-rose-600/15 hover:bg-rose-600/25 text-rose-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-rose-400" />
            {t.phoneNotListed}
          </button>
        </div>
      </div>

      {/* Search & Brand Filter */}
      <div className="surface-panel rounded-2xl p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('All');
              setSelectedSeries('All');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedBrand === 'All'
                ? 'bg-rose-600 text-white'
                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            All Brands ({devices.length})
          </button>
          {BRAND_CATEGORIES.map((b) => (
            <button
              key={b.brand}
              type="button"
              onClick={() => {
                setSelectedBrand(b.brand);
                setSelectedSeries('All');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedBrand === b.brand
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {b.brand}
            </button>
          ))}
        </div>

        {availableSeries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs text-zinc-400 mr-1">Series:</span>
            <button
              type="button"
              onClick={() => setSelectedSeries('All')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                selectedSeries === 'All' ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-300'
              }`}
            >
              All
            </button>
            {availableSeries.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSeries(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  selectedSeries === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Split: Catalog Grid + Live Device Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Device List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Showing {filteredDevices.length} smartphones</span>
            <span>Click any model to inspect & configure</span>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="surface-panel rounded-xl p-8 text-center space-y-4">
              <Smartphone className="w-8 h-8 text-zinc-500 mx-auto" />
              <div className="space-y-1">
                <div className="text-base font-semibold text-white">No matching smartphone found</div>
                <p className="text-xs text-zinc-400">
                  Enter your device hardware manually or submit a catalog addition request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                {t.phoneNotListed}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredDevices.map((dev) => {
                const isSelected = selectedConfig.deviceId === dev.id;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => handleSelectDevice(dev)}
                    className={`text-left rounded-xl p-4 transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/30 border-rose-500'
                        : 'surface-panel hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-zinc-400">
                        {dev.brand} · {dev.series}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-rose-400 shrink-0" />}
                    </div>
                    <div className="font-display text-xl font-bold text-white mt-1 truncate">{dev.model}</div>
                    <div className="text-xs text-zinc-400 mt-1 truncate">{dev.processor}</div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono-tabular">
                      <span className="text-zinc-300">{Math.max(...dev.refreshRates)}Hz · {dev.ramVariants.join('/')}</span>
                      <span className="capitalize text-violet-300">{dev.tier}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Advanced Device Analysis Dashboard */}
        <div className="lg:col-span-5 surface-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs text-rose-400 font-medium">
                {selectedConfig.isCustomDevice ? 'Unverified Custom Specification' : 'Verified Device Specification'}
              </div>
              <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                {selectedConfig.brand} {selectedConfig.model}
              </h2>
              <div className="text-xs text-zinc-400 mt-1">
                {selectedConfig.series} · Tier: <span className="capitalize text-zinc-200">{selectedConfig.tier}</span>
              </div>
            </div>
            <Cpu className="w-5 h-5 text-violet-400 shrink-0" />
          </div>

          {/* Hardware Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <div className="text-zinc-400">Processor</div>
              <div className="text-zinc-100 font-medium mt-0.5 truncate">{selectedConfig.processor}</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <div className="text-zinc-400">Display</div>
              <div className="text-zinc-100 font-medium mt-0.5 truncate">
                {selectedConfig.displaySize} · {selectedConfig.resolution}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <div className="text-zinc-400">Operating System</div>
              <div className="text-zinc-100 font-medium mt-0.5 truncate">{selectedConfig.os}</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <div className="text-zinc-400">Performance Category</div>
              <div className="text-zinc-100 font-medium mt-0.5 capitalize">{selectedConfig.tier}</div>
            </div>
          </div>

          {/* Interactive Configuration Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">RAM Variant</label>
                <select
                  value={selectedConfig.ram}
                  onChange={(e) => onChangeConfig({ ...selectedConfig, ram: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {(selectedDeviceObj?.ramVariants || [selectedConfig.ram, '4GB', '6GB', '8GB', '12GB', '16GB'])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((ram) => (
                      <option key={ram} value={ram}>{ram}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Storage</label>
                <select
                  value={selectedConfig.storage}
                  onChange={(e) => onChangeConfig({ ...selectedConfig, storage: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {(selectedDeviceObj?.storageVariants || [selectedConfig.storage, '64GB', '128GB', '256GB', '512GB'])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Active Refresh Rate</label>
                <select
                  value={selectedConfig.refreshRate}
                  onChange={(e) => onChangeConfig({ ...selectedConfig, refreshRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {(selectedDeviceObj?.refreshRates || [60, 90, 120, 144])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((hz) => (
                      <option key={hz} value={hz}>{hz} Hz</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Game FPS Option</label>
                <select
                  value={selectedConfig.gameFpsOption}
                  onChange={(e) => onChangeConfig({ ...selectedConfig, gameFpsOption: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {(selectedDeviceObj?.fpsOptions || ['Normal (30 FPS)', 'High (60 FPS)', 'Ultra (90 FPS)'])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((fps) => (
                      <option key={fps} value={fps}>{fps}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Graphics Setting</label>
                <select
                  value={selectedConfig.graphicsSetting}
                  onChange={(e) =>
                    onChangeConfig({
                      ...selectedConfig,
                      graphicsSetting: e.target.value as DeviceAnalysisConfig['graphicsSetting'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Smooth">Smooth</option>
                  <option value="Standard">Standard</option>
                  <option value="Ultra">Ultra</option>
                  <option value="Max">Max</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Touch Response Preference</label>
                <select
                  value={selectedConfig.touchPreference}
                  onChange={(e) =>
                    onChangeConfig({
                      ...selectedConfig,
                      touchPreference: e.target.value as DeviceAnalysisConfig['touchPreference'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Default">Default</option>
                  <option value="Fast Response">Fast Response</option>
                  <option value="Controlled Drag">Controlled Drag</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Current Developer DPI (Optional)</label>
              <input
                type="text"
                value={selectedConfig.dpi || ''}
                onChange={(e) => onChangeConfig({ ...selectedConfig, dpi: e.target.value.slice(0, 12) })}
                placeholder="Leave blank if stock DPI (e.g. 411 or 500)"
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="text-xs font-semibold text-zinc-200">Device Optimization Notes</div>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              {optimizationRecommendations.map((tip) => (
                <li key={tip} className="leading-relaxed">• {tip}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={onProceedToGenerator}
            className="w-full py-3 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer glow-crimson"
          >
            Continue to AI Sensitivity Generator
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Device Modal ("MY PHONE IS NOT LISTED") */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="surface-panel rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-white">Custom Smartphone Specifications</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Enter your device details accurately. User-entered specifications are flagged as unverified until reviewed by an administrator.
            </p>

            <form onSubmit={handleApplyCustomDevice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Brand *</label>
                  <input
                    required
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="e.g. Lava, iQOO, Poco"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Exact Model *</label>
                  <input
                    required
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. Agni 2 5G"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">RAM</label>
                  <input
                    value={customRam}
                    onChange={(e) => setCustomRam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Storage</label>
                  <input
                    value={customStorage}
                    onChange={(e) => setCustomStorage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Processor / SoC</label>
                  <input
                    value={customProcessor}
                    onChange={(e) => setCustomProcessor(e.target.value)}
                    placeholder="e.g. Dimensity 7050"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Refresh Rate (Hz)</label>
                  <input
                    type="number"
                    min={60}
                    max={240}
                    value={customHz}
                    onChange={(e) => setCustomHz(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Screen Resolution</label>
                  <input
                    value={customResolution}
                    onChange={(e) => setCustomResolution(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Operating System</label>
                  <input
                    value={customOs}
                    onChange={(e) => setCustomOs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Display Size</label>
                  <input
                    value={customDisplaySize}
                    onChange={(e) => setCustomDisplaySize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Available Game FPS</label>
                  <select
                    value={customFps}
                    onChange={(e) => setCustomFps(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                  >
                    <option value="Normal (30 FPS)">Normal (30 FPS)</option>
                    <option value="High (60 FPS)">High (60 FPS)</option>
                    <option value="Ultra (90 FPS)">Ultra (90 FPS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Any touch quirks, screen protector thickness, etc."
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={submitAlsoAsRequest}
                  onChange={(e) => setSubmitAlsoAsRequest(e.target.checked)}
                />
                <span>Also submit this phone to the verified catalog queue {user ? '' : '(requires Sign In)'}</span>
              </label>

              {!user && submitAlsoAsRequest && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-xs text-rose-400 underline cursor-pointer"
                >
                  Sign in to submit device request
                </button>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/15 text-xs text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {requestSubmitting ? 'Saving...' : 'Use Custom Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Finder Modal */}
      {showFinderModal && browserDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="surface-panel rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-violet-400" />
                <h3 className="font-display text-2xl font-bold text-white">Device Finder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFinderModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-3 rounded-lg bg-violet-950/30 border border-violet-500/30 text-xs text-violet-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>
                Web browsers cannot directly measure hardware touch-sampling rate or in-game FPS. Use these browser hints to identify your phone in Settings &gt; About Phone.
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-zinc-400">Detected Platform</span>
                <span className="text-white font-medium">{browserDetection.osHint}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-zinc-400">Logical Screen Size</span>
                <span className="text-white font-mono-tabular">{browserDetection.viewportCss}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-zinc-400">Estimated Pixel Grid</span>
                <span className="text-white font-mono-tabular">{browserDetection.estimatedPhysicalPx}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-zinc-400">CPU Threads</span>
                <span className="text-white font-mono-tabular">{browserDetection.logicalCores}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              On Android, open <strong>Settings &gt; About phone</strong> for your exact Model Number. On iPhone, check <strong>Settings &gt; General &gt; About</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
