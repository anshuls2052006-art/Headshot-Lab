import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Trash2, Check, X, Edit3 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AiUsageLogDoc,
  AppSettingsDoc,
  DeviceRequestDoc,
  SensitivityProfileDoc,
  SmartphoneDevice,
  UserReportDoc,
} from '../types';
import {
  archiveOrDeleteDevice,
  resolveUserReport,
  reviewDeviceRequest,
  subscribeToAllAiUsage,
  subscribeToAllDeviceRequests,
  subscribeToAllProfilesAdmin,
  subscribeToAllReports,
  updateAppSettings,
  upsertDevice,
} from '../lib/firestoreService';
import { VERIFIED_DEVICES } from '../data/devices';

interface AdminDashboardProps {
  user: User | null;
  isAdmin: boolean;
  devices: SmartphoneDevice[];
  appSettings: AppSettingsDoc;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

type AdminTab = 'analytics' | 'devices' | 'requests' | 'reports' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  isAdmin,
  devices,
  appSettings,
  onNotify,
}) => {
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [requests, setRequests] = useState<DeviceRequestDoc[]>([]);
  const [reports, setReports] = useState<UserReportDoc[]>([]);
  const [aiLogs, setAiLogs] = useState<AiUsageLogDoc[]>([]);
  const [allProfiles, setAllProfiles] = useState<SensitivityProfileDoc[]>([]);

  // Settings form
  const [scaleMax, setScaleMax] = useState(appSettings.sensitivityScaleMax);
  const [dailyLimit, setDailyLimit] = useState(appSettings.dailyAiLimitPerUser);
  const [banner, setBanner] = useState(appSettings.announcementBanner);

  // Add/Edit device form
  const [editingId, setEditingId] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [model, setModel] = useState('');
  const [processor, setProcessor] = useState('');
  const [ramStr, setRamStr] = useState('8GB, 12GB');
  const [storageStr, setStorageStr] = useState('128GB, 256GB');
  const [hzStr, setHzStr] = useState('60, 120');
  const [resolution, setResolution] = useState('1080 x 2400 (FHD+)');
  const [displaySize, setDisplaySize] = useState('6.7"');
  const [os, setOs] = useState('Android 14');
  const [fpsStr, setFpsStr] = useState('Normal (30 FPS), High (60 FPS)');
  const [releaseYear, setReleaseYear] = useState(2025);
  const [tier, setTier] = useState<'budget' | 'mid-range' | 'flagship' | 'gaming'>('mid-range');

  useEffect(() => {
    setScaleMax(appSettings.sensitivityScaleMax);
    setDailyLimit(appSettings.dailyAiLimitPerUser);
    setBanner(appSettings.announcementBanner);
  }, [appSettings]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    const u1 = subscribeToAllDeviceRequests(setRequests);
    const u2 = subscribeToAllReports(setReports);
    const u3 = subscribeToAllAiUsage(setAiLogs);
    const u4 = subscribeToAllProfilesAdmin(setAllProfiles);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [isAdmin, user]);

  if (!user || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="surface-panel rounded-2xl p-8 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-400 mx-auto" />
          <h1 className="font-display text-3xl font-bold text-white">Restricted Admin Area</h1>
          <p className="text-sm text-zinc-400">
            Access is verified strictly via Firestore security rules and authenticated admin credentials.
          </p>
        </div>
      </div>
    );
  }

  const totalAiCalls = aiLogs.reduce((acc, item) => acc + (item.count || 0), 0);
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const openReports = reports.filter((r) => r.status === 'open');

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id =
        editingId ||
        `${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      await upsertDevice(
        {
          id,
          brand: brand.trim(),
          series: series.trim() || 'General',
          model: model.trim(),
          ramVariants: ramStr.split(',').map((s) => s.trim()).filter(Boolean),
          storageVariants: storageStr.split(',').map((s) => s.trim()).filter(Boolean),
          processor: processor.trim(),
          refreshRates: hzStr
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n) && n >= 30),
          resolution: resolution.trim(),
          displaySize: displaySize.trim(),
          os: os.trim(),
          fpsOptions: fpsStr.split(',').map((s) => s.trim()).filter(Boolean),
          releaseYear: Number(releaseYear) || 2025,
          tier,
          verified: true,
        },
        !editingId,
        user.uid
      );
      setEditingId('');
      setBrand('');
      setSeries('');
      setModel('');
      setProcessor('');
      onNotify('success', editingId ? 'Device updated' : 'Device added to catalog');
    } catch (err) {
      onNotify('error', 'Device save failed', err instanceof Error ? err.message : 'Check fields.');
    }
  };

  const handlePopulateEdit = (dev: SmartphoneDevice) => {
    setEditingId(dev.id);
    setBrand(dev.brand);
    setSeries(dev.series);
    setModel(dev.model);
    setProcessor(dev.processor);
    setRamStr(dev.ramVariants.join(', '));
    setStorageStr(dev.storageVariants.join(', '));
    setHzStr(dev.refreshRates.join(', '));
    setResolution(dev.resolution);
    setDisplaySize(dev.displaySize);
    setOs(dev.os);
    setFpsStr(dev.fpsOptions.join(', '));
    setReleaseYear(dev.releaseYear);
    setTier(dev.tier);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAppSettings({
        sensitivityScaleMax: Number(scaleMax),
        dailyAiLimitPerUser: Number(dailyLimit),
        announcementBanner: banner.trim(),
      });
      onNotify('success', 'Global platform settings updated');
    } catch (err) {
      onNotify('error', 'Failed to update settings', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-violet-400 font-semibold">Verified Administrator Session</div>
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight mt-0.5">
            Admin Control Console
          </h1>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-black/60 border border-white/10">
          {(
            [
              ['analytics', 'Analytics'],
              ['devices', `Devices (${devices.length})`],
              ['requests', `Requests (${pendingRequests.length})`],
              ['reports', `Reports (${openReports.length})`],
              ['settings', 'Settings & Content'],
            ] as [AdminTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === id ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="surface-panel rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Catalog Smartphones</div>
              <div className="font-mono-tabular text-3xl font-bold text-white">{devices.length}</div>
            </div>
            <div className="surface-panel rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Saved User Profiles</div>
              <div className="font-mono-tabular text-3xl font-bold text-white">{allProfiles.length}</div>
            </div>
            <div className="surface-panel rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Logged AI Generations</div>
              <div className="font-mono-tabular text-3xl font-bold text-rose-400">{totalAiCalls}</div>
            </div>
            <div className="surface-panel rounded-xl p-5 space-y-1">
              <div className="text-xs text-zinc-400">Pending Queue</div>
              <div className="font-mono-tabular text-3xl font-bold text-violet-400">
                {pendingRequests.length + openReports.length}
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-xl p-5 space-y-3">
            <h2 className="font-display text-2xl font-bold text-white">Recent API Usage Logs</h2>
            {aiLogs.length === 0 ? (
              <p className="text-xs text-zinc-400">No AI generation usage logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-zinc-400">
                    <tr>
                      <th className="py-2 pr-4">User UID</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Model</th>
                      <th className="py-2 text-right">Requests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono-tabular text-zinc-200">
                    {aiLogs.slice(0, 15).map((log, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4 truncate max-w-[180px]">{log.userId}</td>
                        <td className="py-2 pr-4">{log.dateKey}</td>
                        <td className="py-2 pr-4">{log.lastModel}</td>
                        <td className="py-2 text-right">{log.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSaveDevice} className="lg:col-span-5 surface-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">
                {editingId ? 'Edit Smartphone' : 'Add Smartphone'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={() => setEditingId('')}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Brand *</label>
                <input required value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Series *</label>
                <input required value={series} onChange={(e) => setSeries(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1">Model *</label>
                <input required value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1">Processor *</label>
                <input required value={processor} onChange={(e) => setProcessor(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">RAM Variants</label>
                <input value={ramStr} onChange={(e) => setRamStr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Refresh Rates (Hz)</label>
                <input value={hzStr} onChange={(e) => setHzStr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Resolution</label>
                <input value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white">
                  <option value="budget">Budget</option>
                  <option value="mid-range">Mid-range</option>
                  <option value="flagship">Flagship</option>
                  <option value="gaming">Gaming</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">OS</label>
                <input value={os} onChange={(e) => setOs(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Release Year</label>
                <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {editingId ? 'Save Changes' : 'Add Device'}
            </button>
          </form>

          <div className="lg:col-span-7 surface-panel rounded-2xl p-5 space-y-3 max-h-[600px] overflow-y-auto">
            <h2 className="font-display text-2xl font-bold text-white">Managed Smartphones</h2>
            <div className="divide-y divide-white/10">
              {devices.map((dev) => {
                const isBaseline = VERIFIED_DEVICES.some((b) => b.id === dev.id);
                return (
                  <div key={dev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{dev.brand} {dev.model}</div>
                      <div className="text-zinc-400 truncate">
                        {dev.processor} · {Math.max(...dev.refreshRates)}Hz · {dev.tier}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePopulateEdit(dev)}
                        aria-label="Edit device"
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          archiveOrDeleteDevice(dev.id, isBaseline, user.uid)
                            .then(() => onNotify('info', `${dev.model} removed`))
                            .catch((err) => onNotify('error', 'Delete failed', err.message))
                        }
                        aria-label="Delete device"
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="surface-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">User Device Submissions</h2>
          {requests.length === 0 ? (
            <p className="text-xs text-zinc-400">No device requests submitted yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {requests.map((req) => (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">{req.brand} {req.model}</div>
                    <div className="text-zinc-400">
                      {req.ram} · {req.processor} · {req.refreshRate} · {req.resolution} · {req.fpsOption}
                    </div>
                    {req.notes && <div className="text-zinc-500">Notes: {req.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            reviewDeviceRequest(req, 'approved', user.uid)
                              .then(() => onNotify('success', 'Device approved & added to catalog'))
                              .catch((err) => onNotify('error', 'Approval failed', err.message))
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            reviewDeviceRequest(req, 'rejected', user.uid)
                              .then(() => onNotify('info', 'Device request rejected'))
                              .catch((err) => onNotify('error', 'Rejection failed', err.message))
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    ) : (
                      <span className="capitalize font-semibold text-violet-300">{req.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="surface-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">User Feedback & Error Reports</h2>
          {reports.length === 0 ? (
            <p className="text-xs text-zinc-400">No reports open.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {reports.map((rep) => (
                <div key={rep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">{rep.title}</div>
                    <div className="text-zinc-400">{rep.description}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status === 'open' ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            resolveUserReport(rep.id, 'resolved')
                              .then(() => onNotify('success', 'Report resolved'))
                              .catch((err) => onNotify('error', 'Failed', err.message))
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            resolveUserReport(rep.id, 'dismissed')
                              .then(() => onNotify('info', 'Report dismissed'))
                              .catch((err) => onNotify('error', 'Failed', err.message))
                          }
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-zinc-300 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className="capitalize font-semibold text-zinc-400">{rep.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="surface-panel rounded-2xl p-6 max-w-xl space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">Platform Configuration</h2>
          <div>
            <label className="block text-xs text-zinc-300 mb-1">Free Fire India Sensitivity Scale Max (100–400)</label>
            <input
              type="number"
              min={100}
              max={400}
              value={scaleMax}
              onChange={(e) => setScaleMax(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-300 mb-1">Daily AI Generation Limit Per User</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-300 mb-1">Site Announcement Banner (Optional)</label>
            <input
              type="text"
              maxLength={240}
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              placeholder="e.g. Updated for OB46 sensitivity scaling (0–200)"
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
          >
            Save Configuration
          </button>
        </form>
      )}
    </div>
  );
};
