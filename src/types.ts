export type LanguageCode = 'en' | 'hi';
export type ThemeMode = 'dark' | 'amoled';

export type DeviceTier = 'budget' | 'mid-range' | 'flagship' | 'gaming' | 'custom';

export interface SmartphoneDevice {
  id: string;
  brand: string;
  series: string;
  model: string;
  ramVariants: string[];
  storageVariants: string[];
  processor: string;
  refreshRates: number[];
  resolution: string;
  displaySize: string;
  os: string;
  fpsOptions: string[];
  releaseYear: number;
  tier: 'budget' | 'mid-range' | 'flagship' | 'gaming';
  verified: boolean;
  archived?: boolean;
  isPopularGaming?: boolean;
  isRecentlyAdded?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DeviceAnalysisConfig {
  deviceId: string;
  brand: string;
  series: string;
  model: string;
  ram: string;
  storage: string;
  processor: string;
  refreshRate: number;
  resolution: string;
  displaySize: string;
  os: string;
  gameFpsOption: string;
  graphicsSetting: 'Smooth' | 'Standard' | 'Ultra' | 'Max';
  touchPreference: 'Default' | 'Fast Response' | 'Controlled Drag';
  dpi?: string;
  tier: DeviceTier;
  isCustomDevice: boolean;
}

export interface SensitivityValues {
  general: number;
  red_dot: number;
  scope_2x: number;
  scope_4x: number;
  sniper_scope: number;
  free_look: number;
}

export interface SensitivityReasoning {
  general: string;
  red_dot: string;
  scope_2x: string;
  scope_4x: string;
  sniper_scope: string;
  free_look: string;
}

export interface GeneratedSensitivityResult {
  device: string;
  gameplay_style: string;
  sensitivity: SensitivityValues;
  reasoning: SensitivityReasoning;
  weapon_recommendations: string[];
  calibration_tips: string[];
  confidence: string;
  limitations: string[];
  isTestedSetting?: boolean;
  modelUsed?: string;
}

export interface SensitivityProfileDoc {
  id: string;
  userId: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  deviceTier: DeviceTier;
  isCustomDevice: boolean;
  isTestedSetting: boolean;
  gameplayStyles: string[];
  accuracyFocus: string;
  favoriteWeapons: string[];
  sensitivityScaleMax: number;
  sensitivity: SensitivityValues;
  reasoning: SensitivityReasoning;
  weaponRecommendations: string[];
  calibrationTips: string[];
  confidence: string;
  limitations: string[];
  parentProfileId?: string;
  calibrationIssue?: string;
  isFavorite: boolean;
  shareCode: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SharedProfileDoc {
  shareId: string;
  ownerId: string;
  deviceName: string;
  gameplayStyles: string[];
  accuracyFocus: string;
  sensitivityScaleMax: number;
  sensitivity: SensitivityValues;
  reasoning: SensitivityReasoning;
  confidence: string;
  createdAt: unknown;
}

export interface DeviceRequestDoc {
  id: string;
  userId: string;
  brand: string;
  model: string;
  ram: string;
  processor: string;
  refreshRate: string;
  resolution: string;
  os: string;
  fpsOption: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserReportDoc {
  id: string;
  userId: string;
  targetType: 'device' | 'sensitivity' | 'bug';
  targetId?: string;
  title: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  selectedDeviceId?: string;
  selectedDeviceName?: string;
  preferredLanguage: LanguageCode;
  themeMode: ThemeMode;
  favoriteWeapons?: string[];
  gameplayStyles?: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AppSettingsDoc {
  sensitivityScaleMax: number;
  dailyAiLimitPerUser: number;
  announcementBanner: string;
  updatedAt?: unknown;
}

export interface AiUsageLogDoc {
  userId: string;
  dateKey: string;
  count: number;
  lastModel: string;
  updatedAt: unknown;
}

export type AppRoute = 'home' | 'devices' | 'generator' | 'compare' | 'dashboard' | 'admin' | 'share';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
