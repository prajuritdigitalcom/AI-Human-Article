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
  RotateCcw,
} from 'lucide-react';
import { WritingStyle, InternalLinkItem, ArticleHistoryItem } from '../../types';
import { generateArticleApi } from '../../services/gemini';
import { saveArticleHistoryItem, setLastGeneratedArticle } from '../../utils/storage';

export const GeneratePage: React.FC = () => {
  const navigate = useNavigate();

  // 5 PRD Inputs
  const [keyword, setKeyword] = useState('');
  const [style, setStyle] = useState<WritingStyle>('SEO');
  const [referenceInfo, setReferenceInfo] = useState('');
  const [imageLinksText, setImageLinksText] = useState('');
  const [internalLinksText, setInternalLinksText] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
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

    setError(null);
    setLoading(true);

    // Pipeline step updates for feedback
    setCurrentStep('1/4: Membaca Humanizer Rules & Konfigurasi API Key...');
    await new Promise((r) => setTimeout(r, 400));

    setCurrentStep('2/4: Mengirim Request ke Gemini Flash Proxy...');

    const imageLinks = imageLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));

    const internalLinks = parseInternalLinks(internalLinksText);

    try {
      setCurrentStep('3/4: Melakukan Rewrite Humanizer Prose & Menghapus AI Tone...');
      const response = await generateArticleApi({
        keyword: keyword.trim(),
        style,
        referenceInfo: referenceInfo.trim(),
        imageLinks,
        internalLinks,
      });

      setCurrentStep('4/4: Formatting HTML Classic WordPress Editor...');
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
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#fe4c6f]" />
              Form Generator Artikel AI Human
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Isi 5 informasi parameter di bawah ini. Prompt builder akan mengolah aturan humanizer secara otomatis.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#fe4c6f]/10 text-[#fe4c6f] hidden sm:inline-block">
            Standard 5-Input Mode
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Memproses Artikel</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
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
              <p className="text-[11px] text-gray-400">Kata kunci utama target SEO artikel Anda.</p>
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
              <p className="text-[11px] text-gray-400">Pilihan nada bicaranya (SEO, Semi Formal, Tutorial, dll).</p>
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
              <p className="text-[11px] text-gray-400">Gambar akan disisipkan otomatis dengan tag HTML &lt;img&gt;.</p>
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
              <p className="text-[11px] text-gray-400">
                Baris 1: Anchor Text, Baris 2: URL Target.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Model: gemini-flash-latest Proxy
            </div>
            <button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="inline-flex items-center gap-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-md shadow-[#fe4c6f]/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Loading Progress Pipeline */}
      {loading && (
        <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#fe4c6f] animate-spin" />
            <div>
              <h4 className="font-bold text-sm">Humanizer Engine Sedang Bekerja...</h4>
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
