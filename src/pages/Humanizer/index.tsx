import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Github,
  Check,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
} from 'lucide-react';
import { checkGithubHumanizerUpdate, triggerHumanizerUpdate } from '../../services/github';
import { getHumanizerRules, toggleHumanizerRule } from '../../services/humanizer';
import { HumanizerRule } from '../../types';

export const HumanizerPage: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState({
    version: '5.1.0',
    commitSha: 'v5.1.0-patch',
    lastChecked: new Date().toISOString(),
    latestSha: 'v5.1.0-patch',
    hasUpdate: false,
  });

  const [rules, setRules] = useState<HumanizerRule[]>([]);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    setRules(getHumanizerRules());
    checkVersion();
  }, []);

  const checkVersion = async () => {
    setChecking(true);
    try {
      const res = await checkGithubHumanizerUpdate();
      if (res) {
        setVersionInfo({
          version: res.currentVersion || '5.1.0',
          commitSha: res.currentSha || 'v5.1.0-patch',
          lastChecked: res.lastChecked || new Date().toISOString(),
          latestSha: res.latestSha || res.currentSha || 'v5.1.0-patch',
          hasUpdate: !!res.hasUpdate,
        });
      }
    } catch (err) {
      console.warn('Error checking github humanizer update:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleUpdateNow = async () => {
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const res = await triggerHumanizerUpdate();
      setUpdateMessage(res.message);
      setVersionInfo((prev) => ({
        ...prev,
        version: res.version,
        commitSha: res.commitSha,
        hasUpdate: false,
        lastChecked: new Date().toISOString(),
      }));
    } catch (err: any) {
      setUpdateMessage(`Gagal update: ${err?.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleRule = (id: string) => {
    const updated = toggleHumanizerRule(id);
    setRules(updated);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Humanizer Engine</h2>
            </div>
            <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
              Mengadopsi aturan terbaru dari repository <strong className="text-gray-900">blader/humanizer</strong> dengan pembaruan otomatis setiap 1 jam.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkVersion}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              Cek Pembaruan
            </button>

            <button
              onClick={handleUpdateNow}
              disabled={updating}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                versionInfo.hasUpdate
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 animate-pulse'
                  : 'bg-[#fe4c6f] hover:bg-[#e03c5d] shadow-[#fe4c6f]/20'
              }`}
            >
              {updating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Update Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Current Version</span>
            <span className="text-sm font-bold text-gray-900 mt-0.5 block">{versionInfo.version}</span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Commit SHA</span>
            <span className="text-sm font-mono font-bold text-gray-900 mt-0.5 block">
              {versionInfo.commitSha}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Repository</span>
            <span className="text-sm font-bold text-gray-900 mt-0.5 block flex items-center gap-1">
              <Github className="w-3.5 h-3.5" /> blader/humanizer
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Status</span>
            <span className="text-sm font-bold text-emerald-600 mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {versionInfo.hasUpdate ? 'Pembaruan Tersedia' : 'Up to date'}
            </span>
          </div>
        </div>

        {updateMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{updateMessage}</span>
          </div>
        )}
      </div>

      {/* Rules Customizer Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#fe4c6f]" /> Aturan Engine Aktif
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Anda dapat mengaktifkan atau menonaktifkan aturan penulisan humanis di bawah ini.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {rules.filter((r) => r.enabled).length} / {rules.length} Aturan Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-xl border transition-all ${
                rule.enabled ? 'bg-white border-gray-200 shadow-2xs' : 'bg-gray-50/70 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-900">{rule.title}</h4>
                    {rule.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{rule.description}</p>
                </div>

                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className="text-2xl text-[#fe4c6f] hover:opacity-80 transition-opacity"
                  title={rule.enabled ? 'Nonaktifkan Aturan' : 'Aktifkan Aturan'}
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-8 h-8 text-[#fe4c6f]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Example Comparison Box */}
              {rule.exampleBad && rule.exampleGood && (
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-red-50/70 border border-red-100 p-3 rounded-lg">
                    <span className="font-bold text-red-600 block mb-1">❌ Pola AI Tipikal:</span>
                    <p className="text-gray-700 italic">"{rule.exampleBad}"</p>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-lg">
                    <span className="font-bold text-emerald-700 block mb-1">✅ Hasil Humanizer:</span>
                    <p className="text-gray-700 italic">"{rule.exampleGood}"</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
