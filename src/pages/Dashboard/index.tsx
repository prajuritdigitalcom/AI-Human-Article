import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PenTool,
  FileText,
  Key,
  Cpu,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { getArticleHistory, getSavedApiKeys } from '../../utils/storage';
import { ArticleHistoryItem, ApiKeyConfig } from '../../types';
import { copyToClipboard } from '../../services/formatter';

export const DashboardPage: React.FC = () => {
  const [history, setHistory] = useState<ArticleHistoryItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getArticleHistory());
    setApiKeys(getSavedApiKeys());
  }, []);

  const totalArticles = history.length;
  const totalWords = history.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
  const activeKeysCount = apiKeys.filter((k) => k.status === 'active').length;

  const handleCopy = async (id: string, html: string) => {
    const success = await copyToClipboard(html);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-[#fe4c6f] space-y-8">
      {/* Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-8 border border-gray-800 shadow-xl">
        <div className="relative z-10 w-full">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe4c6f]/20 border border-[#fe4c6f]/30 text-[#fe4c6f] text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Humanizer Engine Ready
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3 w-full">
            Hasilkan Artikel SEO Terasa Alami & Bebas Pola AI
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 w-full">
            Diadaptasi dari repository <strong className="text-white">blader/humanizer</strong>. Tanpa database, tanpa backend berat, siap copy-paste langsung ke WordPress Classic Editor.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[#fe4c6f]/30"
            >
              <PenTool className="w-4 h-4" /> Mulai Generate Artikel
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm border border-white/20 transition-all"
            >
              <Key className="w-4 h-4" /> Kelola Gemini API Keys
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Artikel</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalArticles}</p>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Tersimpan di Local Browser</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#fe4c6f] flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Kata</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalWords.toLocaleString()}</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Siap Publikasi
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">API Key Aktif</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeKeysCount}</p>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Rotasi Round Robin</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Engine Rules</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">blader v2.9.1</p>
            <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Auto Update Check
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">Artikel Terbaru</h3>
            <p className="text-xs text-gray-500">Riwayat generasi artikel SEO terakhir Anda</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-[#fe4c6f] hover:underline flex items-center gap-1"
          >
            Lihat Semua Riwayat <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-sm text-gray-700">Belum ada artikel yang dibuat</p>
            <p className="text-xs text-gray-400 mt-1">
              Mulai buat artikel SEO pertama Anda dengan mengklik tombol Generate.
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#fe4c6f] text-white text-xs font-semibold rounded-lg hover:bg-[#e03c5d] transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" /> Generate Sekarang
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-x-auto">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#fe4c6f]">
                      {item.keyword}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Gaya: {item.style}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {item.plainText.substring(0, 140)}...
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-gray-500 mr-2">{item.wordCount} Kata</span>
                  <button
                    onClick={() => handleCopy(item.id, item.html)}
                    className="p-2 text-gray-600 hover:text-[#fe4c6f] hover:bg-rose-50 rounded-lg transition-colors"
                    title="Copy HTML"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <Link
                    to="/history"
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Buka di History"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
