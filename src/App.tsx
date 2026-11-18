import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { auth } from './lib/firebase';
import {
  checkIsAdmin,
  DEFAULT_APP_SETTINGS,
  ensureUserProfile,
  saveSensitivityProfile,
  subscribeToAppSettings,
  subscribeToDevices,
  subscribeToUserDeviceRequests,
  subscribeToUserProfile,
  subscribeToUserProfiles,
  subscribeToUserReports,
  updateUserProfile,
} from './lib/firestoreService';
import { VERIFIED_DEVICES } from './data/devices';
import type {
  AppRoute,
  AppSettingsDoc,
  DeviceAnalysisConfig,
  DeviceRequestDoc,
  GeneratedSensitivityResult,
  LanguageCode,
  SensitivityProfileDoc,
  SmartphoneDevice,
  ThemeMode,
  ToastMessage,
  UserProfileDoc,
  UserReportDoc,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { DeviceLab } from './components/DeviceLab';
import { GeneratorWorkspace } from './components/GeneratorWorkspace';
import { CompareView } from './components/CompareView';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SharedProfileView } from './components/SharedProfileView';

function buildInitialDeviceConfig(dev: SmartphoneDevice): DeviceAnalysisConfig {
  return {
    deviceId: dev.id,
    brand: dev.brand,
    series: dev.series,
    model: dev.model,
    ram: dev.ramVariants[0] || '8GB',
    storage: dev.storageVariants[0] || '128GB',
    processor: dev.processor,
    refreshRate: Math.max(...dev.refreshRates),
    resolution: dev.resolution,
    displaySize: dev.displaySize,
    os: dev.os,
    gameFpsOption: dev.fpsOptions[dev.fpsOptions.length - 1] || 'High (60 FPS)',
    graphicsSetting: dev.tier === 'budget' ? 'Smooth' : 'Standard',
    touchPreference: 'Default',
    dpi: '',
    tier: dev.tier,
    isCustomDevice: false,
  };
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState<AppRoute>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share') ? 'share' : 'home';
  });
  const [shareId, setShareId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share') || '';
  });

  const [language, setLanguage] = useState<LanguageCode>('en');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);

  const [devices, setDevices] = useState<SmartphoneDevice[]>(VERIFIED_DEVICES);
  const [appSettings, setAppSettings] = useState<AppSettingsDoc>(DEFAULT_APP_SETTINGS);
  const [selectedDeviceConfig, setSelectedDeviceConfig] = useState<DeviceAnalysisConfig>(() =>
    buildInitialDeviceConfig(VERIFIED_DEVICES[0])
  );

  const [activeResult, setActiveResult] = useState<GeneratedSensitivityResult | null>(null);
  const [previousResult, setPreviousResult] = useState<GeneratedSensitivityResult | null>(null);

  const [savedProfiles, setSavedProfiles] = useState<SensitivityProfileDoc[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequestDoc[]>([]);
  const [userReports, setUserReports] = useState<UserReportDoc[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // Boot splash timer
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 550);
    return () => clearTimeout(timer);
  }, []);

  // Theme class sync
  useEffect(() => {
    if (theme === 'amoled') {
      document.documentElement.classList.add('theme-amoled');
    } else {
      document.documentElement.classList.remove('theme-amoled');
    }
  }, [theme]);

  // Public Firestore listeners (devices & app settings)
  useEffect(() => {
    const unsubDevices = subscribeToDevices(setDevices);
    const unsubSettings = subscribeToAppSettings(setAppSettings);
    return () => {
      unsubDevices();
      unsubSettings();
    };
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const adminFlag = await checkIsAdmin(nextUser);
        setIsAdmin(adminFlag);
        if (nextUser.emailVerified) {
          await ensureUserProfile(nextUser, { language, theme }).catch(() => {});
        }
      } else {
        setIsAdmin(false);
        setUserProfile(null);
        setSavedProfiles([]);
        setDeviceRequests([]);
        setUserReports([]);
      }
    });
    return () => unsub();
  }, [language, theme]);

  // User-scoped Firestore listeners (only when verified & signed in)
  useEffect(() => {
    if (!user || !user.emailVerified) return;
    const u1 = subscribeToUserProfile(user.uid, (prof) => {
      setUserProfile(prof);
      if (prof?.preferredLanguage) setLanguage(prof.preferredLanguage);
      if (prof?.themeMode) setTheme(prof.themeMode);
    });
    const u2 = subscribeToUserProfiles(user.uid, setSavedProfiles);
    const u3 = subscribeToUserDeviceRequests(user.uid, setDeviceRequests);
    const u4 = subscribeToUserReports(user.uid, setUserReports);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [user]);

  const navigate = (next: AppRoute) => {
    if (next !== 'share' && shareId) {
      window.history.replaceState({}, '', '/');
      setShareId('');
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleLanguage = () => {
    const nextLang: LanguageCode = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    if (user && user.emailVerified) {
      void updateUserProfile(user.uid, { preferredLanguage: nextLang }).catch(() => {});
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'amoled' : 'dark';
    setTheme(nextTheme);
    if (user && user.emailVerified) {
      void updateUserProfile(user.uid, { themeMode: nextTheme }).catch(() => {});
    }
  };

  const handleSelectDeviceAndGenerate = (dev: SmartphoneDevice) => {
    const cfg = buildInitialDeviceConfig(dev);
    setSelectedDeviceConfig(cfg);
    if (user && user.emailVerified) {
      void updateUserProfile(user.uid, {
        selectedDeviceId: dev.id,
        selectedDeviceName: `${dev.brand} ${dev.model}`,
      }).catch(() => {});
    }
    navigate('generator');
  };

  const handleResultGenerated = (
    res: GeneratedSensitivityResult,
    isCalibration = false,
    issueSummary?: string
  ) => {
    if (activeResult) {
      setPreviousResult(activeResult);
    }
    setActiveResult(res);

    // Auto-record calibration iteration to user's history if signed in & verified
    if (isCalibration && user && user.emailVerified) {
      void saveSensitivityProfile(user.uid, {
        deviceName: res.device,
        deviceBrand: selectedDeviceConfig.brand,
        deviceModel: selectedDeviceConfig.model,
        deviceTier: selectedDeviceConfig.tier,
        isCustomDevice: selectedDeviceConfig.isCustomDevice,
        isTestedSetting: false,
        gameplayStyles: [res.gameplay_style || 'Calibrated'],
        accuracyFocus: 'Calibration Iteration',
        favoriteWeapons: [],
        sensitivityScaleMax: appSettings.sensitivityScaleMax,
        sensitivity: res.sensitivity,
        reasoning: res.reasoning,
        weaponRecommendations: res.weapon_recommendations,
        calibrationTips: res.calibration_tips,
        confidence: res.confidence,
        limitations: res.limitations,
        parentProfileId: savedProfiles[0]?.id,
        calibrationIssue: issueSummary || 'Match feedback adjustment',
        isFavorite: false,
      }).catch(() => {});
    }
  };

  const handleLoadProfileToGenerator = (profile: SensitivityProfileDoc) => {
    const matchingDev = devices.find(
      (d) => `${d.brand} ${d.model}`.toLowerCase() === profile.deviceName.toLowerCase()
    );
    if (matchingDev) {
      setSelectedDeviceConfig(buildInitialDeviceConfig(matchingDev));
    }
    setPreviousResult(activeResult);
    setActiveResult({
      device: profile.deviceName,
      gameplay_style: profile.gameplayStyles.join(', '),
      sensitivity: profile.sensitivity,
      reasoning: profile.reasoning,
      weapon_recommendations: profile.weaponRecommendations,
      calibration_tips: profile.calibrationTips,
      confidence: profile.confidence,
      limitations: profile.limitations,
      isTestedSetting: profile.isTestedSetting,
    });
    navigate('generator');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        {/* Animated Boot Overlay */}
        <AnimatePresence>
          {booting && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 bg-[#060609] flex flex-col items-center justify-center gap-4"
            >
              <div className="w-12 h-12 rounded-full border-2 border-rose-500/40 border-t-rose-500 animate-spin" />
              <div className="font-display text-3xl font-extrabold tracking-tight text-white">HEADSHOT LAB</div>
              <div className="text-xs text-zinc-400">Initializing Precision Sensitivity Engine</div>
            </motion.div>
          )}
        </AnimatePresence>

        <Navbar
          activeRoute={route}
          onNavigate={navigate}
          user={user}
          isAdmin={isAdmin}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenAuth={() => setAuthModalOpen(true)}
          announcementBanner={appSettings.announcementBanner}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {route === 'home' && (
                <LandingPage
                  devices={devices}
                  language={language}
                  onNavigate={navigate}
                  onSelectDeviceAndGenerate={handleSelectDeviceAndGenerate}
                />
              )}

              {route === 'devices' && (
                <DeviceLab
                  devices={devices}
                  selectedConfig={selectedDeviceConfig}
                  onChangeConfig={setSelectedDeviceConfig}
                  onProceedToGenerator={() => navigate('generator')}
                  language={language}
                  user={user}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onNotify={notify}
                />
              )}

              {route === 'generator' && (
                <GeneratorWorkspace
                  deviceConfig={selectedDeviceConfig}
                  scaleMax={appSettings.sensitivityScaleMax}
                  dailyAiLimit={appSettings.dailyAiLimitPerUser}
                  language={language}
                  user={user}
                  activeResult={activeResult}
                  previousResult={previousResult}
                  onResultGenerated={handleResultGenerated}
                  onChangeDeviceClick={() => navigate('devices')}
                  onComparePreviousClick={() => navigate('compare')}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onNotify={notify}
                />
              )}

              {route === 'compare' && (
                <CompareView
                  devices={devices}
                  savedProfiles={savedProfiles}
                  activeResult={activeResult}
                  previousResult={previousResult}
                  scaleMax={appSettings.sensitivityScaleMax}
                />
              )}

              {route === 'dashboard' && (
                <UserDashboard
                  user={user}
                  userProfile={userProfile}
                  selectedDeviceConfig={selectedDeviceConfig}
                  savedProfiles={savedProfiles}
                  deviceRequests={deviceRequests}
                  userReports={userReports}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onLoadProfileToGenerator={handleLoadProfileToGenerator}
                  onCompareClick={() => navigate('compare')}
                  onNotify={notify}
                />
              )}

              {route === 'admin' && (
                <AdminDashboard
                  user={user}
                  isAdmin={isAdmin}
                  devices={devices}
                  appSettings={appSettings}
                  onNotify={notify}
                />
              )}

              {route === 'share' && shareId && (
                <SharedProfileView
                  shareId={shareId}
                  onGenerateOwn={() => navigate('generator')}
                  onNotify={notify}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-white/10 py-8 pb-20 md:pb-8 bg-black/40">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-400">
            <div className="space-y-1">
              <div className="font-display text-lg font-bold text-white">HEADSHOT LAB</div>
              <div>YOUR DEVICE. YOUR AIM. YOUR PRECISION.</div>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <button type="button" onClick={() => navigate('home')} className="hover:text-white cursor-pointer">
                Home
              </button>
              <button type="button" onClick={() => navigate('devices')} className="hover:text-white cursor-pointer">
                Devices
              </button>
              <button type="button" onClick={() => navigate('generator')} className="hover:text-white cursor-pointer">
                Generator
              </button>
              <button type="button" onClick={() => navigate('compare')} className="hover:text-white cursor-pointer">
                Compare
              </button>
            </div>
          </div>
        </footer>

        {/* Toast Notifications */}
        <div className="fixed bottom-16 md:bottom-5 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pointer-events-auto surface-elevated rounded-xl p-3.5 shadow-2xl flex items-start gap-3"
              >
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{toast.title}</div>
                  {toast.description && (
                    <div className="text-[11px] text-zinc-400 mt-0.5 break-words">{toast.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(msg) => notify('success', msg)}
        />
      </div>
    </ErrorBoundary>
  );
}
