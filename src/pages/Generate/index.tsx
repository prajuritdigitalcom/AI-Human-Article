import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenTool,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Link2,
  ListFilter,
  Zap,
  Key,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { WritingStyle, InternalLinkItem, ArticleHistoryItem } from '../../types';
import { generateArticleApi } from '../../services/gemini';
import { saveArticleHistoryItem, setLastGeneratedArticle, getSavedApiKeys } from '../../utils/storage';

export const GeneratePage: React.FC = () => {
  const navigate = useNavigate();

  // 5 PRD Inputs
  const [keyword, setKeyword] = useState('');
  const [style, setStyle] = useState<WritingStyle>('SEO');
  const [referenceInfo, setReferenceInfo] = useState('');
  const [imageLinksText, setImageLinksText] = useState('');
  const [internalLinksText, setInternalLinksText] = useState('');

  // Saved API Keys state
  const savedKeys = getSavedApiKeys();
  const activeKeys = savedKeys.filter((k) => k.status === 'active' || !k.status);

  // UI state
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [activeKeyName, setActiveKeyName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const writingStyles: WritingStyle[] = [
    'SEO',
    'Formal',
    'Semi Formal',
    'Tutorial',
    'News',
    'Sales',
    'Company Profile',
  ];

  const handleReset = () => {
    setKeyword('');
    setStyle('SEO');
    setReferenceInfo('');
    setImageLinksText('');
    setInternalLinksText('');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to parse internal link pairs
  const parseInternalLinks = (text: string): InternalLinkItem[] => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const items: InternalLinkItem[] = [];

    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i] && lines[i + 1]) {
        items.push({
          anchorText: lines[i],
          url: lines[i + 1],
        });
      } else if (lines[i] && lines[i].startsWith('http')) {
        items.push({
          anchorText: keyword || 'baca selengkapnya',
          url: lines[i],
        });
      }
    }
    return items;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError('Fokus Keyword wajib diisi.');
      return;
    }

    // Check if user has no saved API keys
    const currentKeys = getSavedApiKeys();
    if (currentKeys.length === 0) {
      setError(
        'Belum ada Gemini API Key yang dimasukkan di browser. Silakan tambahkan minimal 1 API Key Gemini Anda di menu Pengaturan (Settings) agar sistem dapat memproses artikel.'
      );
      return;
    }

    setError(null);
    setLoading(true);

    const keyLabelToDisplay = currentKeys.length > 0
      ? currentKeys[0].name || `API Key (${currentKeys[0].key.substring(0, 4)}...${currentKeys[0].key.substring(currentKeys[0].key.length - 4)})`
      : 'Key Gemini Default';
    
    setActiveKeyName(keyLabelToDisplay);

    // Pipeline step updates for feedback
    setCurrentStep(`1/4: Menyiapkan Humanizer Rules & Memilih ${keyLabelToDisplay}...`);
    await new Promise((r) => setTimeout(r, 400));

    setCurrentStep(`2/4: Mengirim Request ke Gemini Proxy dengan ${keyLabelToDisplay}...`);

    const imageLinks = imageLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));

    const internalLinks = parseInternalLinks(internalLinksText);

    try {
      setCurrentStep(`3/4: Melakukan Rewrite Humanizer Prose (${keyLabelToDisplay} Aktif)...`);
      const response = await generateArticleApi({
        keyword: keyword.trim(),
        style,
        referenceInfo: referenceInfo.trim(),
        imageLinks,
        internalLinks,
      });

      if (response.keyUsedName) {
        setActiveKeyName(response.keyUsedName);
      }

      setCurrentStep(`4/4: Formatting HTML Classic WordPress Editor (${response.keyUsedName || keyLabelToDisplay})...`);
      await new Promise((r) => setTimeout(r, 300));

      // Save to localStorage history
      const historyItem: ArticleHistoryItem = {
        id: `art_${Date.now()}`,
        keyword: response.keyword || keyword,
        style: (response.style as WritingStyle) || style,
        title: response.title || keyword,
        slug: response.slug,
        metaTitle: response.metaTitle,
        metaDescription: response.metaDescription,
        focusKeyword: response.focusKeyword || response.keyword || keyword,
        featuredImageUrl: response.featuredImageUrl,
        featuredImageAlt: response.featuredImageAlt,
        panduanImAudit: response.panduanImAudit,
        html: response.html,
        plainText: response.plainText,
        wordCount: response.wordCount,
        createdAt: new Date().toISOString(),
        generationDurationMs: response.generationDurationMs,
      };
      saveArticleHistoryItem(historyItem);
      setLastGeneratedArticle(historyItem);

      // Redirect immediately to Preview page
      navigate('/preview');
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menghasilkan artikel.');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Form Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#fe4c6f]" />
              Form Generator Artikel AI Human
            </h2>
            {/* Header Title */}
          </div>

          {/* Active API Key Status Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                savedKeys.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
              title="Kelola API Key Gemini di Menu Pengaturan"
            >
              <Key className="w-3.5 h-3.5" />
              {savedKeys.length > 0 ? (
                <span>
                  {savedKeys.length} API Key Terpasang
                </span>
              ) : (
                <span>Belum Ada API Key (Klik untuk Tambah)</span>
              )}
            </button>
          </div>
        </div>

        {/* Clear & Friendly Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-900">Gagal Memproses Artikel</p>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>

            {(error.toLowerCase().includes('api key') ||
              error.toLowerCase().includes('settings') ||
              error.toLowerCase().includes('pengaturan') ||
              error.toLowerCase().includes('limit') ||
              error.toLowerCase().includes('429') ||
              error.toLowerCase().includes('dimasukkan')) && (
              <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-rose-600 font-medium">
                  Informasi: Sistem membutuhkan Gemini API Key aktif agar pembuatan artikel dapat berjalan.
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#fe4c6f]/20 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  Input API Keys di Menu Settings
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input 1: Fokus Keyword */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#fe4c6f]" />
                1. Fokus Keyword <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Contoh: Cara Membuat Kopi V60 Enak di Rumah"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
              />
            </div>

            {/* Input 2: Gaya Penulisan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <ListFilter className="w-4 h-4 text-[#fe4c6f]" />
                2. Gaya Penulisan <span className="text-red-500">*</span>
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as WritingStyle)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] text-sm text-gray-900 outline-none transition-all bg-white"
              >
                {writingStyles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input 3: Informasi Referensi */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#fe4c6f]" />
              3. Informasi Referensi / Poin Penting (Opsional)
            </label>
            <textarea
              rows={3}
              value={referenceInfo}
              onChange={(e) => setReferenceInfo(e.target.value)}
              placeholder="Tambahkan poin-poin penting, kutipan pakar, spesifikasi produk, atau fakta pendukung..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] text-sm text-gray-900 placeholder-gray-400 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input 4: Link Gambar */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#fe4c6f]" />
                4. Link Gambar (Satu URL Per Baris)
              </label>
              <textarea
                rows={4}
                value={imageLinksText}
                onChange={(e) => setImageLinksText(e.target.value)}
                placeholder="https://example.com/gambar1.jpg&#10;https://example.com/gambar2.png"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-mono text-xs resize-none"
              />
            </div>

            {/* Input 5: Internal Link */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-[#fe4c6f]" />
                5. Internal Link (Anchor Text & URL Bergantian)
              </label>
              <textarea
                rows={4}
                value={internalLinksText}
                onChange={(e) => setInternalLinksText(e.target.value)}
                placeholder="Teks Anchor Kopi Arabika&#10;https://websiteanda.com/kopi-arabika&#10;Panduan Sangrai Kopi&#10;https://websiteanda.com/sangrai"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#fe4c6f] focus:border-[#fe4c6f] text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-mono text-xs resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Model: gemini-flash-latest</span>
              <span className="text-gray-300">•</span>
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <Key className="w-3 h-3 text-[#fe4c6f]" />
                {savedKeys.length > 0
                  ? `${savedKeys.length} API Key Terpasang`
                  : 'Key: Belum Ditambahkan'}
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="inline-flex items-center gap-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-md shadow-[#fe4c6f]/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Article
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading Progress Pipeline with API Key Notification */}
      {loading && (
        <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#fe4c6f] animate-spin shrink-0" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm flex items-center gap-2">
                Humanizer Engine Sedang Bekerja...
                {activeKeyName && (
                  <span className="text-[10px] bg-white/10 text-rose-300 px-2 py-0.5 rounded-md font-mono border border-white/10">
                    <Key className="w-3 h-3 inline mr-1" />
                    {activeKeyName}
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-300">{currentStep}</p>
            </div>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-[#fe4c6f] h-full w-3/4 animate-pulse rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
};
