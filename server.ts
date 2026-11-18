import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = 'gemini-4-hydrogen';

// Load Firebase projectId safely for ID token verification (requires no IAM)
let firebaseProjectId = '';
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (raw?.projectId && raw.projectId !== 'remixed-project-id') {
      firebaseProjectId = raw.projectId;
    }
  }
} catch {
  // Ignore config read errors on boot; token verification remains optional if unconfigured
}

const adminApp = firebaseProjectId
  ? (getAdminApps().length ? getAdminApp() : initializeAdminApp({ projectId: firebaseProjectId }))
  : null;

const SYSTEM_INSTRUCTION = `You are HEADSHOT LAB AI, a specialized Free Fire India sensitivity recommendation assistant.

Your responsibility is to create device-aware, personalized sensitivity recommendations.

Analyze the player's smartphone specifications, display refresh rate, game FPS availability, preferred weapons, gameplay style, and feedback.

Generate a reasonable starting configuration rather than pretending that universally perfect settings exist.

Never claim that a setting guarantees 100% headshots.

Never claim sensitivity directly increases weapon damage.

Use the current supported sensitivity scale provided in the prompt.

Return structured JSON containing:

{
  "device": "Selected device",
  "gameplay_style": "Selected style",
  "sensitivity": {
    "general": 0,
    "red_dot": 0,
    "scope_2x": 0,
    "scope_4x": 0,
    "sniper_scope": 0,
    "free_look": 0
  },
  "reasoning": {
    "general": "Explanation",
    "red_dot": "Explanation",
    "scope_2x": "Explanation",
    "scope_4x": "Explanation",
    "sniper_scope": "Explanation",
    "free_look": "Explanation"
  },
  "weapon_recommendations": [],
  "calibration_tips": [],
  "confidence": "Estimated confidence",
  "limitations": []
}

Ensure all values remain within the supported sensitivity range.

Do not fabricate device specifications.

If device information is missing, ask for manual specifications or clearly mark the assumptions.

Be precise, consistent, and transparent.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Simple in-memory sliding-window rate limiter per IP/User
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return true;
}

function buildSensitivitySchema(scaleMax: number) {
  return {
    type: Type.OBJECT,
    properties: {
      device: { type: Type.STRING, description: 'Selected smartphone name.' },
      gameplay_style: { type: Type.STRING, description: 'Selected gameplay styles summary.' },
      sensitivity: {
        type: Type.OBJECT,
        properties: {
          general: { type: Type.INTEGER, description: `General sensitivity (0-${scaleMax})` },
          red_dot: { type: Type.INTEGER, description: `Red Dot sensitivity (0-${scaleMax})` },
          scope_2x: { type: Type.INTEGER, description: `2X Scope sensitivity (0-${scaleMax})` },
          scope_4x: { type: Type.INTEGER, description: `4X Scope sensitivity (0-${scaleMax})` },
          sniper_scope: { type: Type.INTEGER, description: `Sniper Scope sensitivity (0-${scaleMax})` },
          free_look: { type: Type.INTEGER, description: `Free Look sensitivity (0-${scaleMax})` },
        },
        required: ['general', 'red_dot', 'scope_2x', 'scope_4x', 'sniper_scope', 'free_look'],
      },
      reasoning: {
        type: Type.OBJECT,
        properties: {
          general: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for General.' },
          red_dot: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for Red Dot.' },
          scope_2x: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for 2X Scope.' },
          scope_4x: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for 4X Scope.' },
          sniper_scope: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for Sniper Scope.' },
          free_look: { type: Type.STRING, description: 'Device-specific reasoning, expected benefit, and adjustment advice for Free Look.' },
        },
        required: ['general', 'red_dot', 'scope_2x', 'scope_4x', 'sniper_scope', 'free_look'],
      },
      weapon_recommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Weapon-specific drag technique, scope usage, and handling notes.',
      },
      calibration_tips: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Actionable adjustment tips for training ground testing.',
      },
      confidence: { type: Type.STRING, description: 'Estimated confidence level and whether settings are AI-estimated.' },
      limitations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Transparent limitations, missing hardware specs, or assumptions.',
      },
    },
    required: [
      'device',
      'gameplay_style',
      'sensitivity',
      'reasoning',
      'weapon_recommendations',
      'calibration_tips',
      'confidence',
      'limitations',
    ],
  };
}

function clamp(val: unknown, min: number, max: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(num)));
}

async function resolveCallerUid(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !adminApp) {
    return null;
  }
  try {
    const token = authHeader.slice(7).trim();
    const decoded = await getAdminAuth(adminApp).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: GEMINI_MODEL });
  });

  app.post('/api/sensitivity/generate', async (req, res) => {
    try {
      const callerUid = await resolveCallerUid(req);
      const clientKey = callerUid || req.ip || 'anonymous';
      if (!checkRateLimit(clientKey)) {
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait a few minutes before generating another sensitivity profile.',
        });
        return;
      }

      const {
        device,
        gameplayStyles,
        customStyleNote,
        accuracyFocus,
        favoriteWeapons,
        currentSensitivity,
        scaleMax,
        language,
      } = req.body || {};

      if (!device || !device.brand || !device.model) {
        res.status(400).json({ error: 'Valid smartphone device specifications are required.' });
        return;
      }

      const activeScaleMax = clamp(scaleMax ?? 200, 100, 400);
      const stylesList = Array.isArray(gameplayStyles) && gameplayStyles.length > 0
        ? gameplayStyles.slice(0, 8)
        : ['Balanced Gameplay'];
      const weaponsList = Array.isArray(favoriteWeapons) ? favoriteWeapons.slice(0, 10) : [];

      const prompt = `Generate a personalized Free Fire India sensitivity starting configuration on a 0 to ${activeScaleMax} scale.

DEVICE HARDWARE & IN-GAME CONFIGURATION:
- Brand & Model: ${String(device.brand)} ${String(device.model)} (${String(device.series || 'Standard')})
- Device Tier: ${String(device.tier || 'mid-range')}
- Custom / Unverified Spec Entry: ${device.isCustomDevice ? 'Yes (user-supplied specs)' : 'No (verified catalog specs)'}
- RAM / Storage: ${String(device.ram || 'Not specified')} / ${String(device.storage || 'Not specified')}
- Processor / SoC: ${String(device.processor || 'Not specified')}
- Display Size & Resolution: ${String(device.displaySize || 'Not specified')} | ${String(device.resolution || 'Not specified')}
- Selected Refresh Rate: ${Number(device.refreshRate || 60)}Hz
- Operating System: ${String(device.os || 'Not specified')}
- Selected Game FPS Option: ${String(device.gameFpsOption || 'High (60 FPS)')}
- In-Game Graphics Setting: ${String(device.graphicsSetting || 'Standard')}
- Touch Response Preference: ${String(device.touchPreference || 'Default')}
- Optional Device DPI: ${device.dpi ? String(device.dpi) : 'Default (not modified)'}

PLAYER PREFERENCES:
- Gameplay Styles: ${stylesList.join(', ')}${customStyleNote ? ` | Custom Note: ${String(customStyleNote).slice(0, 200)}` : ''}
- Accuracy Lab Focus: ${String(accuracyFocus || 'Balanced accuracy')}
- Favorite Weapons: ${weaponsList.length > 0 ? weaponsList.join(', ') : 'General mixed loadout'}
- Current Baseline Sensitivity (if provided): ${currentSensitivity ? JSON.stringify(currentSensitivity) : 'None provided'}
- Output Language Preference: ${language === 'hi' ? 'Write explanations in clear Hindi (Devanagari) with English weapon/setting names.' : 'English'}

STRICT INSTRUCTIONS:
1. All 6 sensitivity integers MUST be strictly between 0 and ${activeScaleMax}.
2. Tailor values specifically to this device's refresh rate (${Number(device.refreshRate || 60)}Hz), SoC tier (${String(device.tier || 'mid-range')}), screen size, FPS option, and chosen weapons/style. Never return identical flat numbers.
3. For each sensitivity reasoning field, include: (a) why the value fits this device & refresh rate, (b) expected gameplay benefit, and (c) what direction (+/- 3 to 8 points) to adjust if aim overshoots or undershoots.
4. In weapon_recommendations, provide concrete handling, drag-arc, and scope advice for the selected weapons (${weaponsList.join(', ') || 'AR/SMG/Shotgun'}) and explicitly note that sensitivity optimizes aim control rather than increasing weapon damage.
5. In confidence, clearly label this as an "AI-Estimated Starting Configuration" (never claim it is a physically lab-tested guarantee).`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: buildSensitivitySchema(activeScaleMax),
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response returned by Gemini API.');
      }

      const parsed = JSON.parse(rawText);
      const sanitized = {
        device: String(parsed.device || `${device.brand} ${device.model}`).slice(0, 140),
        gameplay_style: String(parsed.gameplay_style || stylesList.join(', ')).slice(0, 140),
        sensitivity: {
          general: clamp(parsed.sensitivity?.general, 0, activeScaleMax),
          red_dot: clamp(parsed.sensitivity?.red_dot, 0, activeScaleMax),
          scope_2x: clamp(parsed.sensitivity?.scope_2x, 0, activeScaleMax),
          scope_4x: clamp(parsed.sensitivity?.scope_4x, 0, activeScaleMax),
          sniper_scope: clamp(parsed.sensitivity?.sniper_scope, 0, activeScaleMax),
          free_look: clamp(parsed.sensitivity?.free_look, 0, activeScaleMax),
        },
        reasoning: {
          general: String(parsed.reasoning?.general || 'Calibrated for baseline camera turn responsiveness.').slice(0, 750),
          red_dot: String(parsed.reasoning?.red_dot || 'Tuned for close-to-mid range headshot drag control.').slice(0, 750),
          scope_2x: String(parsed.reasoning?.scope_2x || 'Balanced for mid-range tracking stability.').slice(0, 750),
          scope_4x: String(parsed.reasoning?.scope_4x || 'Controlled magnification movement to prevent recoil jitter.').slice(0, 750),
          sniper_scope: String(parsed.reasoning?.sniper_scope || 'Precision flick speed for AWM/Kar98k/M82B.').slice(0, 750),
          free_look: String(parsed.reasoning?.free_look || 'Situational awareness camera sweep speed.').slice(0, 750),
        },
        weapon_recommendations: Array.isArray(parsed.weapon_recommendations)
          ? parsed.weapon_recommendations.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        calibration_tips: Array.isArray(parsed.calibration_tips)
          ? parsed.calibration_tips.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        confidence: String(parsed.confidence || 'AI-Estimated Starting Configuration (Moderate-High Confidence)').slice(0, 60),
        limitations: Array.isArray(parsed.limitations)
          ? parsed.limitations.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        isTestedSetting: false,
        modelUsed: GEMINI_MODEL,
      };

      res.json(sanitized);
    } catch (error) {
      console.error('Gemini generate error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate sensitivity settings.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/sensitivity/calibrate', async (req, res) => {
    try {
      const callerUid = await resolveCallerUid(req);
      const clientKey = callerUid || req.ip || 'anonymous';
      if (!checkRateLimit(clientKey)) {
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait before running another calibration step.',
        });
        return;
      }

      const {
        deviceName,
        previousSensitivity,
        issues,
        playerNotes,
        gameplayStyles,
        favoriteWeapons,
        scaleMax,
        language,
      } = req.body || {};

      if (!previousSensitivity || !Array.isArray(issues) || issues.length === 0) {
        res.status(400).json({ error: 'Previous sensitivity settings and at least one feedback issue are required.' });
        return;
      }

      const activeScaleMax = clamp(scaleMax ?? 200, 100, 400);

      const prompt = `Perform an iterative AI CALIBRATION step for a Free Fire India player on a 0 to ${activeScaleMax} scale.

DEVICE: ${String(deviceName || 'Smartphone')}
GAMEPLAY STYLE: ${Array.isArray(gameplayStyles) ? gameplayStyles.join(', ') : 'Balanced Gameplay'}
FAVORITE WEAPONS: ${Array.isArray(favoriteWeapons) ? favoriteWeapons.join(', ') : 'Mixed'}

PREVIOUS SENSITIVITY SETTINGS:
${JSON.stringify(previousSensitivity)}

PLAYER MATCH FEEDBACK ISSUES:
- ${issues.map((i: unknown) => String(i)).join('\n- ')}
${playerNotes ? `PLAYER NOTES: ${String(playerNotes).slice(0, 300)}` : ''}
OUTPUT LANGUAGE: ${language === 'hi' ? 'Hindi (Devanagari) with English setting labels' : 'English'}

CALIBRATION RULES (CRITICAL):
1. Make SMALL, CONTROLLED adjustments (typically 3 to 10 points on a 200-scale, or 2 to 6 points on a 100-scale) ONLY to the sensitivity sliders directly linked to the reported issues!
2. Do NOT randomly overhaul unrelated sliders — keep unaffected sliders equal or minimally stabilized.
3. If aim goes above the head (overshoot), make a small downward adjustment to General and/or Red Dot.
4. If aim stops below the head (undershoot), make a small upward adjustment to General and/or Red Dot.
5. If scope is unstable, make a small downward adjustment to 2X Scope, 4X Scope, and/or Sniper Scope.
6. Clearly explain every adjusted value vs unchanged value in reasoning, and note exact previous -> new delta in calibration_tips.
7. Ensure all values remain integers within 0 to ${activeScaleMax}.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: buildSensitivitySchema(activeScaleMax),
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response returned by Gemini API during calibration.');
      }

      const parsed = JSON.parse(rawText);
      const sanitized = {
        device: String(parsed.device || deviceName || 'Smartphone').slice(0, 140),
        gameplay_style: String(parsed.gameplay_style || 'Calibrated Profile').slice(0, 140),
        sensitivity: {
          general: clamp(parsed.sensitivity?.general, 0, activeScaleMax),
          red_dot: clamp(parsed.sensitivity?.red_dot, 0, activeScaleMax),
          scope_2x: clamp(parsed.sensitivity?.scope_2x, 0, activeScaleMax),
          scope_4x: clamp(parsed.sensitivity?.scope_4x, 0, activeScaleMax),
          sniper_scope: clamp(parsed.sensitivity?.sniper_scope, 0, activeScaleMax),
          free_look: clamp(parsed.sensitivity?.free_look, 0, activeScaleMax),
        },
        reasoning: {
          general: String(parsed.reasoning?.general || 'Adjusted based on match feedback.').slice(0, 750),
          red_dot: String(parsed.reasoning?.red_dot || 'Adjusted based on match feedback.').slice(0, 750),
          scope_2x: String(parsed.reasoning?.scope_2x || 'Adjusted based on match feedback.').slice(0, 750),
          scope_4x: String(parsed.reasoning?.scope_4x || 'Adjusted based on match feedback.').slice(0, 750),
          sniper_scope: String(parsed.reasoning?.sniper_scope || 'Adjusted based on match feedback.').slice(0, 750),
          free_look: String(parsed.reasoning?.free_look || 'Preserved for consistent camera look speed.').slice(0, 750),
        },
        weapon_recommendations: Array.isArray(parsed.weapon_recommendations)
          ? parsed.weapon_recommendations.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        calibration_tips: Array.isArray(parsed.calibration_tips)
          ? parsed.calibration_tips.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        confidence: String(parsed.confidence || 'AI-Calibrated Iteration (Controlled Delta)').slice(0, 60),
        limitations: Array.isArray(parsed.limitations)
          ? parsed.limitations.slice(0, 8).map((s: unknown) => String(s).slice(0, 450))
          : [],
        isTestedSetting: false,
        modelUsed: GEMINI_MODEL,
      };

      res.json(sanitized);
    } catch (error) {
      console.error('Gemini calibrate error:', error);
      const message = error instanceof Error ? error.message : 'Failed to calibrate sensitivity settings.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HEADSHOT LAB server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start HEADSHOT LAB server:', err);
  process.exit(1);
});
