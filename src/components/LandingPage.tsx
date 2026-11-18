import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Smartphone, Crosshair, Sliders, ShieldAlert, ChevronRight } from 'lucide-react';
import type { AppRoute, LanguageCode, SmartphoneDevice } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { OPTIMIZATION_GUIDES } from '../data/gameOptions';

interface LandingPageProps {
  devices: SmartphoneDevice[];
  language: LanguageCode;
  onNavigate: (route: AppRoute) => void;
  onSelectDeviceAndGenerate: (device: SmartphoneDevice) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  devices,
  language,
  onNavigate,
  onSelectDeviceAndGenerate,
}) => {
  const t = TRANSLATIONS[language];
  const recentDevices = devices.filter((d) => d.isRecentlyAdded).slice(0, 4);
  const gamingDevices = devices.filter((d) => d.isPopularGaming || d.tier === 'gaming').slice(0, 6);

  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Subtle live animated grid + radial crimson/violet ambient field */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 25%, rgba(255, 36, 66, 0.16), transparent 45%), radial-gradient(circle at 82% 20%, rgba(139, 92, 246, 0.14), transparent 45%), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
          }}
        />

        <div className="relative max-w-[1360px] mx-auto px-4 sm:px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-7 flex flex-col justify-center space-y-6"
          >
            <div className="text-xs font-medium tracking-wider text-rose-400">
              {t.tagline}
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[0.98] text-balance max-w-2xl">
              {t.heroHeadline}
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed">
              {t.heroSubheading}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('generator')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer glow-crimson"
              >
                {t.heroCtaPrimary}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('devices')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.heroCtaSecondary}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-zinc-400">
              <span>{devices.length}+ Verified Smartphones</span>
              <span aria-hidden="true">·</span>
              <span>Gemini AI Engine</span>
              <span aria-hidden="true">·</span>
              <span>Iterative Match Calibration</span>
              <span aria-hidden="true">·</span>
              <span>Configurable Sensitivity Scale</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="lg:col-span-5"
          >
            <div className="relative h-full min-h-[260px] rounded-2xl overflow-hidden border border-white/10 bg-[#0d0e14]">
              <img
                src="/src/assets/images/hero_crosshair_rig_1795010930339.jpg"
                alt="Esports gaming smartphone calibrated for Free Fire India headshot precision"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-6">
                <div className="text-xs text-rose-400 font-medium">Hardware-Aware Sensitivity Pipeline</div>
                <div className="font-display text-2xl font-bold text-white mt-1">
                  Display Refresh Rate · FPS Cap · Drag Curve
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {t.howItWorksTitle}
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Three structured stages align your smartphone hardware with your preferred Free Fire India weapons and drag mechanics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('devices')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 hover:text-rose-300 cursor-pointer whitespace-nowrap shrink-0"
          >
            Open Device Lab <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="surface-panel rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono-tabular text-rose-400">01. Device Profiling</div>
            <h3 className="font-display text-2xl font-bold text-white">Select or Enter Hardware</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Pick from verified Samsung, Xiaomi, POCO, Realme, iQOO, OnePlus, Vivo, Oppo, and iPhone specs—or enter custom specifications manually.
            </p>
          </div>

          <div className="surface-panel rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono-tabular text-violet-400">02. Combat & Weapon Loadout</div>
            <h3 className="font-display text-2xl font-bold text-white">Define Drag & Accuracy Focus</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Combine One-Tap, Short Drag, or Precision Aim styles with your favorite ARs, SMGs, Shotguns, Pistols, and Snipers.
            </p>
          </div>

          <div className="surface-panel rounded-xl p-6 space-y-3">
            <div className="text-xs font-mono-tabular text-rose-400">03. Iterative AI Calibration</div>
            <h3 className="font-display text-2xl font-bold text-white">Refine From Match Feedback</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Test your starting configuration in Training Grounds, report overshoot or scope shake, and let AI apply controlled deltas.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {t.featuresTitle}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Built around real hardware constraints—never flat copy-paste numbers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 surface-panel rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <Crosshair className="w-6 h-6 text-rose-400" />
                <h3 className="font-display text-2xl font-bold text-white">AI Calibration Mode</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Overshooting above the head or stopping on the chest? Calibration Mode adjusts only the implicated sensitivity sliders in small increments and tracks every version.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('generator')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Launch AI Generator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="min-h-[220px] bg-black">
              <img
                src="/src/assets/images/lab_calibration_scope_1795010930408.jpg"
                alt="Precision optical scope calibration hardware"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-6">
            <div className="surface-panel rounded-2xl p-6 space-y-2">
              <Sliders className="w-5 h-5 text-violet-400" />
              <h3 className="font-display text-xl font-bold text-white">Configurable Sensitivity Scale</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Supports Free Fire India&apos;s updated 0–200 scale as well as custom scale limits managed dynamically in platform settings.
              </p>
            </div>
            <div className="surface-panel rounded-2xl p-6 space-y-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="font-display text-xl font-bold text-white">Honest Hardware Transparency</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Clearly separates verified manufacturer specs from custom entries, and distinguishes AI-estimated starting settings from physically tested baselines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RECENTLY ADDED & POPULAR GAMING PHONES */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-12">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl font-bold text-white tracking-tight">
              {t.recentDevicesTitle}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('devices')}
              className="text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              View All Devices
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDevices.map((dev) => (
              <button
                key={dev.id}
                type="button"
                onClick={() => onSelectDeviceAndGenerate(dev)}
                className="text-left surface-panel hover:border-rose-500/50 rounded-xl p-5 transition-colors space-y-2 cursor-pointer"
              >
                <div className="text-xs text-zinc-400">
                  {dev.brand} · {dev.releaseYear}
                </div>
                <div className="font-display text-xl font-bold text-white truncate">{dev.model}</div>
                <div className="text-xs text-zinc-400 truncate">{dev.processor}</div>
                <div className="pt-1 text-xs font-mono-tabular text-rose-400">
                  {Math.max(...dev.refreshRates)}Hz · {dev.ramVariants.join('/')}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight">
            {t.popularGamingTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamingDevices.map((dev) => (
              <button
                key={dev.id}
                type="button"
                onClick={() => onSelectDeviceAndGenerate(dev)}
                className="text-left surface-panel hover:border-violet-500/50 rounded-xl p-5 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-xs text-violet-400">{dev.brand} · {dev.tier}</div>
                  <div className="font-display text-xl font-bold text-white truncate">{dev.model}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {dev.processor} · {Math.max(...dev.refreshRates)}Hz
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-zinc-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT & GAMING OPTIMIZATION GUIDE */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 surface-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-black">
            <img
              src="/src/assets/images/device_matrix_phones_1795010930972.jpg"
              alt="Supported gaming and flagship smartphones"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 space-y-3 flex-1">
            <h2 className="font-display text-3xl font-bold text-white">{t.aboutTitle}</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              HEADSHOT LAB is engineered specifically for Free Fire India mobile players across budget, mid-range, flagship, and dedicated gaming smartphones. Instead of repeating generic one-size-fits-all numbers, our AI engine correlates display refresh rate, SoC performance, game FPS cap, weapon handling, and player drag feedback.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 surface-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-white">{t.optimizationGuideTitle}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Safe, reliable in-game configuration practices for stable frame pacing and consistent drag response.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {OPTIMIZATION_GUIDES.map((guide, index) => (
              <div key={guide.title} className="py-4 first:pt-0 last:pb-0 space-y-1">
                <div className="text-sm font-semibold text-white">
                  0{index + 1}. {guide.title}
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{guide.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
