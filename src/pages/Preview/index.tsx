import React, { useState, useEffect } from 'react';
import {
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  History,
  CheckCircle2,
  Share2,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ArticleHistoryItem } from '../../types';
import { getLastGeneratedArticle, getArticleHistory } from '../../utils/storage';
import { ClassicEditorPreview } from '../../components/ClassicEditorPreview';
import { useNavigate, Link } from 'react-router-dom';

export const PreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentArticle, setCurrentArticle] = useState<ArticleHistoryItem | null>(null);
  const [allHistory, setAllHistory] = useState<ArticleHistoryItem[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    const history = getArticleHistory();
    setAllHistory(history);
    const last = getLastGeneratedArticle();
    setCurrentArticle(last);
  }, []);

  const handleSelectArticle = (article: ArticleHistoryItem) => {
    setCurrentArticle(article);
    setShowSelector(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Selector Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#fe4c6f]/10 text-[#fe4c6f] rounded-xl font-bold">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                Preview Classic Editor Plugin WordPress
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Authentic UI Replica
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Pratinjau artikel yang telah digenerate sesuai tampilan asli plugin WordPress Classic Editor (TinyMCE).
            </p>
          </div>
        </div>

        {/* Article Selector Dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {allHistory.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl border border-gray-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#fe4c6f]" />
                <span className="truncate max-w-[200px]">
                  {currentArticle ? currentArticle.title : 'Pilih Artikel dari Riwayat'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showSelector && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  <div className="p-3 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                    Pilih Artikel ({allHistory.length})
                  </div>
                  {allHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectArticle(item)}
                      className={`w-full text-left p-3 hover:bg-rose-50/50 transition-colors flex flex-col gap-0.5 cursor-pointer ${
                        currentArticle?.id === item.id ? 'bg-rose-50/80 border-l-4 border-[#fe4c6f]' : ''
                      }`}
                    >
                      <span className="font-bold text-xs text-gray-900 truncate">{item.title}</span>
                      <span className="text-[10px] text-gray-500 flex items-center justify-between">
                        <span>Keyword: {item.keyword}</span>
                        <span>{item.wordCount} Kata</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link
            to="/generate"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#fe4c6f]/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate Artikel Baru
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {currentArticle ? (
        <ClassicEditorPreview
          htmlContent={currentArticle.html}
          keyword={currentArticle.keyword}
          title={currentArticle.title}
          slug={currentArticle.slug}
          metaTitle={currentArticle.metaTitle}
          metaDescription={currentArticle.metaDescription}
          focusKeyword={currentArticle.focusKeyword}
          featuredImageUrl={currentArticle.featuredImageUrl}
          featuredImageAlt={currentArticle.featuredImageAlt}
          panduanImAudit={currentArticle.panduanImAudit}
          wordCount={currentArticle.wordCount}
          generationTimeMs={currentArticle.generationDurationMs}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#fe4c6f] flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Belum Ada Artikel untuk Di-Preview</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Silakan generate artikel baru terlebih dahulu atau pilih dari riwayat artikel yang tersimpan.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/generate')}
              className="inline-flex items-center gap-2 bg-[#fe4c6f] hover:bg-[#e03c5d] text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md shadow-[#fe4c6f]/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Buka Form Generate Artikel Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
