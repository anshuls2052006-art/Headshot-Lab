export interface GameplayStyleOption {
  id: string;
  label: string;
  description: string;
}

export const GAMEPLAY_STYLES: GameplayStyleOption[] = [
  { id: 'One-Tap Headshot', label: 'One-Tap Headshot', description: 'Crisp single-bullet upward flicks with shotguns & Desert Eagle.' },
  { id: 'Drag Headshot', label: 'Drag Headshot', description: 'Sustained vertical drag velocity for AR & SMG red-number bursts.' },
  { id: 'Short Drag', label: 'Short Drag', description: 'Compact thumb travel for tight close-to-mid quarters engagements.' },
  { id: 'Long Drag', label: 'Long Drag', description: 'Extended swipe curve for medium-to-long range head tracking.' },
  { id: 'Precision Aim', label: 'Precision Aim', description: 'Lower micro-jitter around head level for disciplined burst control.' },
  { id: 'Close-Range Combat', label: 'Close-Range Combat', description: 'High camera turn speed for fast 1v1 rush and gloo-wall reactions.' },
  { id: 'Long-Range Combat', label: 'Long-Range Combat', description: 'Stabilized 2X/4X/Sniper tracking across open terrain.' },
  { id: 'Balanced Gameplay', label: 'Balanced Gameplay', description: 'Versatile all-rounder calibration for Clash Squad & Battle Royale.' },
  { id: 'Custom Profile', label: 'Custom Profile', description: 'Define your own custom thumb-speed or claw-grip preferences.' },
];

export interface WeaponCategoryGroup {
  category: string;
  weapons: string[];
}

export const WEAPON_CATEGORIES: WeaponCategoryGroup[] = [
  {
    category: 'Assault Rifles',
    weapons: ['AK', 'SCAR', 'XM8', 'GROZA', 'M4A1', 'WOODPECKER'],
  },
  {
    category: 'SMGs',
    weapons: ['MP40', 'MP5', 'UMP', 'THOMPSON', 'VECTOR'],
  },
  {
    category: 'Shotguns',
    weapons: ['M1887', 'MAG-7', 'M1014', 'TREATMENT SHOTGUN'],
  },
  {
    category: 'Pistols',
    weapons: ['DESERT EAGLE', 'USP', 'G18'],
  },
  {
    category: 'Snipers',
    weapons: ['AWM', 'KAR98K', 'M82B'],
  },
];

export interface AccuracyFocusOption {
  id: string;
  label: string;
  summary: string;
}

export const ACCURACY_PROFILES: AccuracyFocusOption[] = [
  {
    id: 'Maximum aim precision',
    label: 'Maximum aim precision',
    summary: 'Prioritizes micro-stability and reduced crosshair overshoot when locking near head height.',
  },
  {
    id: 'Balanced accuracy',
    label: 'Balanced accuracy',
    summary: 'Balances horizontal camera sweep speed with predictable vertical drag resistance.',
  },
  {
    id: 'Fast aim response',
    label: 'Fast aim response',
    summary: 'Elevates General and Red Dot responsiveness for quick 180-degree turns and fast gloo-wall placement.',
  },
  {
    id: 'Controlled drag',
    label: 'Controlled drag',
    summary: 'Tuned vertical swipe progression to reduce aim flying past the target crown.',
  },
  {
    id: 'Close-range accuracy',
    label: 'Close-range accuracy',
    summary: 'Calibrated for hip-fire and fast SMG/shotgun drag arcs inside 15 meters.',
  },
  {
    id: 'Long-range accuracy',
    label: 'Long-range accuracy',
    summary: 'Dampens 2X, 4X, and Sniper Scope sensitivity for steady distant head tracking.',
  },
];

export const CALIBRATION_ISSUES = [
  { id: 'aim_above_head', label: 'Aim is going above the head (overshooting)' },
  { id: 'aim_below_head', label: 'Aim is stopping below the head / chest (undershooting)' },
  { id: 'aim_too_fast', label: 'Aim is moving too fast during turns' },
  { id: 'aim_too_slow', label: 'Aim feels sluggish / moving too slowly' },
  { id: 'scope_unstable', label: '2X / 4X / Sniper scope feels shaky or unstable' },
  { id: 'inconsistent_drag', label: 'Inconsistent drag control across matches' },
];

export const OPTIMIZATION_GUIDES = [
  {
    title: 'Frame Rate vs Graphics Priority',
    detail: 'Set FPS to High (or Ultra where supported) before raising Graphics. Consistent frame pacing reduces touch-input variance during fast drag shots.',
  },
  {
    title: 'Display Refresh Synchronization',
    detail: 'Ensure your phone display is locked to 90Hz/120Hz/144Hz in system settings rather than adaptive battery-saver 60Hz while playing Clash Squad or BR.',
  },
  {
    title: 'Thermal Throttling Prevention',
    detail: 'Avoid charging while playing and lower Graphics to Smooth or Standard on budget/mid-range chipsets to prevent mid-match frame drops.',
  },
  {
    title: 'Fire Button Position & Drag Clearance',
    detail: 'Leave adequate vertical screen space above your Fire Button (42%–55% size) so upward drag strokes do not hit the screen bezel.',
  },
];
