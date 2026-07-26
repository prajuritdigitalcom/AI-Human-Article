import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  ShieldCheck,
  Zap,
  RotateCw,
  Sliders,
  Check,
  Globe,
  Lock,
  User,
  Send,
  Save,
  HelpCircle,
} from 'lucide-react';
import { ApiKeyConfig } from '../../types';
import {
  getSavedApiKeys,
  saveApiKey,
  deleteApiKey,
  getAppSettings,
  saveAppSettings,
  AppSettings,
} from '../../utils/storage';
import { testGeminiApiKeyApi } from '../../services/gemini';

export const SettingsPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [showRawKeys, setShowRawKeys] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // WordPress REST API Settings State
  const [wpSiteUrl, setWpSiteUrl] = useState(settings.wpSiteUrl || '');
  const [wpUsername, setWpUsername] = useState(settings.wpUsername || '');
  const [wpAppPassword, setWpAppPassword] = useState(settings.wpAppPassword || '');
  const [showWpPassword, setShowWpPassword] = useState(false);
  const [savingWpSettings, setSavingWpSettings] = useState(false);
  const [testingWpConnection, setTestingWpConnection] = useState(false);
  const [wpStatusMessage, setWpStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    setKeys(getSavedApiKeys());
    const currentSettings = getAppSettings();
    setSettings(currentSettings);
    setWpSiteUrl(currentSettings.wpSiteUrl || '');
    setWpUsername(currentSettings.wpUsername || '');
    setWpAppPassword(currentSettings.wpAppPassword || '');
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    setAddingKey(true);
    setStatusMessage(null);

    const keyVal = newKeyInput.trim();
    try {
      // Test key latency and validity before saving
      const testResult = await testGeminiApiKeyApi(keyVal);

      const updated = saveApiKey(keyVal);
      setKeys(updated);
      setNewKeyInput('');
      setStatusMessage({
        text: `API Key berhasil ditambahkan dan terverifikasi (${testResult.latencyMs || 0}ms)!`,
        isError: false,
      });
    } catch (err: any) {
      // Still save even if test failed, but mark notice
      const updated = saveApiKey(keyVal);
      setKeys(updated);
      setNewKeyInput('');
      setStatusMessage({
        text: `API Key tersimpan, namun test panggil gagal: ${err?.message}`,
        isError: true,
      });
    } finally {
      setAddingKey(false);
    }
  };

  const handleTestKey = async (item: ApiKeyConfig) => {
    setTestingId(item.id);
    try {
      const res = await testGeminiApiKeyApi(item.key);
      const updatedKeys = keys.map((k) => {
        if (k.id === item.id) {
          return {
            ...k,
            status: res.status as any,
            latencyMs: res.latencyMs,
            lastUsed: new Date().toISOString(),
          };
        }
        return k;
      });
      setKeys(updatedKeys);
    } catch (err: any) {
      const updatedKeys = keys.map((k) => {
        if (k.id === item.id) {
          return { ...k, status: 'invalid' as const };
        }
        return k;
      });
      setKeys(updatedKeys);
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteKey = (id: string) => {
    const updated = deleteApiKey(id);
    setKeys(updated);
    setStatusMessage({ text: 'API Key berhasil dihapus.', isError: false });
  };

  const toggleShowRawKey = (id: string) => {
    setShowRawKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSettingToggle = (key: keyof AppSettings) => {
    const updated = saveAppSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  const handleSaveWpSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWpSettings(true);
    const updated = saveAppSettings({
      wpSiteUrl: wpSiteUrl.trim(),
      wpUsername: wpUsername.trim(),
      wpAppPassword: wpAppPassword.trim(),
    });
    setSettings(updated);
    setSavingWpSettings(false);
    setWpStatusMessage({
      text: 'Konfigurasi WordPress REST API berhasil disimpan! Kredensial tersimpan secara aman di browser Anda dan siap digunakan untuk tombol "Kirim ke WordPress".',
      isError: false,
    });
  };

  const handleTestWpConnection = async () => {
    if (!wpSiteUrl.trim()) {
      setWpStatusMessage({ text: 'Harap isi WordPress SITE URL terlebih dahulu.', isError: true });
      return;
    }
    setTestingWpConnection(true);
    setWpStatusMessage(null);
    try {
      const cleanUrl = wpSiteUrl.trim().replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (wpUsername.trim() && wpAppPassword.trim()) {
        const authString = btoa(`${wpUsername.trim()}:${wpAppPassword.trim()}`);
        headers['Authorization'] = `Basic ${authString}`;
      }
      const res = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?per_page=1`, {
        method: 'GET',
        headers,
      });
      if (res.ok) {
        setWpStatusMessage({
          text: `Koneksi Berhasil! REST API aktif dan siap menerima postingan di ${cleanUrl}/wp-json/wp/v2/posts.`,
          isError: false,
        });
      } else {
        setWpStatusMessage({
          text: `Respon server WordPress: Status ${res.status} (${res.statusText}). Mohon periksa kembali Username Admin & Application Password.`,
          isError: true,
        });
      }
    } catch (err: any) {
      setWpStatusMessage({
        text: `Gagal terhubung ke WordPress REST API: ${err?.message || 'CORS / Network Error'}. Pastikan URL diawali https:// dan website mendukung REST API.`,
        isError: true,
      });
    } finally {
      setTestingWpConnection(false);
    }
  };

  const maskKey = (str: string) => {
    if (!str) return '';
    if (str.length <= 8) return '••••••••';
    return `${str.substring(0, 4)}••••••••${str.substring(str.length - 4)}`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Gemini API Key Management */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#fe4c6f]" /> Kelola Gemini API Keys
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Mendukung banyak API Key tanpa batas. Rotasi otomatis (Round Robin) dan auto-fallback saat terkena limit quota 429.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {keys.length} Custom Key Tersimpan
          </span>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Add Key Form */}
        <form onSubmit={handleAddKey} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#fe4c6f]" /> Tambah Gemini API Key Baru
          </h3>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                API Key (AI Studio)
              </label>
              <input
                type="text"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono bg-white text-gray-900 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={addingKey || !newKeyInput.trim()}
              className="inline-flex items-center gap-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#fe4c6f]/20 disabled:opacity-50 shrink-0 cursor-pointer h-[38px]"
            >
              {addingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {addingKey ? 'Menguji & Menyimpan...' : 'Simpan API Key'}
            </button>
          </div>
        </form>

        {/* API Key Health Monitoring Dashboard Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#fe4c6f]" /> Status & Health Monitor Key
          </h3>

          {keys.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-600">Belum ada API Key lokal yang ditambahkan</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Aplikasi saat ini menggunakan fallback API Key dari Environment Variables.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {keys.map((item) => (
                <div key={item.id} className="p-4 bg-white hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{item.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'cooldown'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-gray-500 flex items-center gap-2">
                      <span>{showRawKeys[item.id] ? item.key : maskKey(item.key)}</span>
                      <button
                        onClick={() => toggleShowRawKey(item.id)}
                        className="text-gray-400 hover:text-gray-700 p-0.5"
                        title={showRawKeys[item.id] ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showRawKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                      {item.latencyMs && <span>Respons: {item.latencyMs}ms</span>}
                      {item.lastUsed && (
                        <span>
                          Terakhir dipakai: {new Date(item.lastUsed).toLocaleTimeString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleTestKey(item)}
                      disabled={testingId === item.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${testingId === item.id ? 'animate-spin' : ''}`} />
                      Test Key
                    </button>

                    <button
                      onClick={() => handleDeleteKey(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WordPress REST API Credentials Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#2271b1]" /> Konfigurasi WordPress REST API (Auto-Share)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Atur kredensial WordPress sekali, lalu kirim artikel langsung dari halaman Preview.
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
              settings.wpSiteUrl && settings.wpUsername
                ? 'bg-sky-100 text-[#2271b1]'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {settings.wpSiteUrl && settings.wpUsername ? 'Terkoneksi' : 'Belum Dikonfigurasi'}
          </span>
        </div>

        {wpStatusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              wpStatusMessage.isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {wpStatusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{wpStatusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveWpSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WordPress Site URL */}
            <div className="space-y-1 md:col-span-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-gray-500" /> WordPress SITE URL
              </label>
              <input
                type="url"
                value={wpSiteUrl}
                onChange={(e) => setWpSiteUrl(e.target.value)}
                placeholder="https://websiteanda.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1] focus:border-[#2271b1] outline-none"
              />
              <p className="text-[10px] text-gray-400">Gunakan URL lengkap diawali https://</p>
            </div>

            {/* Admin Username */}
            <div className="space-y-1 md:col-span-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" /> Username Admin
              </label>
              <input
                type="text"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1] focus:border-[#2271b1] outline-none"
              />
              <p className="text-[10px] text-gray-400">Username akun administrator WordPress</p>
            </div>

            {/* Application Password */}
            <div className="space-y-1 md:col-span-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-gray-500" /> Application Password
              </label>
              <div className="relative">
                <input
                  type={showWpPassword ? 'text' : 'password'}
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs font-mono bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1] focus:border-[#2271b1] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowWpPassword(!showWpPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  title={showWpPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showWpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400">
                Buat di WP Admin &gt; Users &gt; Profile &gt; Application Passwords
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <HelpCircle className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                Aplikasi menyimpan kredensial di browser lokal Anda.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestWpConnection}
                disabled={testingWpConnection || !wpSiteUrl}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-gray-300 disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${testingWpConnection ? 'animate-spin' : ''}`} />
                {testingWpConnection ? 'Menguji Connection...' : 'Test Koneksi WP REST API'}
              </button>

              <button
                type="submit"
                disabled={savingWpSettings}
                className="px-5 py-2.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingWpSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingWpSettings ? 'Menyimpan...' : 'Simpan Konfigurasi WordPress'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Preferences & System Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#fe4c6f]" /> Preferensi & Konfigurasi Rotasi
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Atur bagaimana API Key digilir dan diperiksa secara berkala.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="font-bold text-gray-900 text-sm">Rotasi Otomatis (Round Robin)</p>
              <p className="text-gray-500 mt-0.5">
                Menggilir pemakaian API Key secara berurutan untuk membagikan kuota secara merata.
              </p>
            </div>
            <button
              onClick={() => handleSettingToggle('roundRobinEnabled')}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.roundRobinEnabled ? 'bg-[#fe4c6f]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  settings.roundRobinEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="font-bold text-gray-900 text-sm">Otomatis Cek Update Humanizer</p>
              <p className="text-gray-500 mt-0.5">
                Memeriksa pembaruan aturan di GitHub blader/humanizer saat membuka aplikasi.
              </p>
            </div>
            <button
              onClick={() => handleSettingToggle('autoCheckUpdate')}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.autoCheckUpdate ? 'bg-[#fe4c6f]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  settings.autoCheckUpdate ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
