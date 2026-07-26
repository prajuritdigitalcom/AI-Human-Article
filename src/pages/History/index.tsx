import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Copy,
  Check,
  Search,
  FileText,
  Clock,
  Download,
  Eye,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ArticleHistoryItem } from '../../types';
import {
  getArticleHistory,
  deleteArticleHistoryItem,
  clearArticleHistory,
} from '../../utils/storage';
import { copyToClipboard, downloadHtmlFile } from '../../services/formatter';
import { ClassicEditorPreview } from '../../components/ClassicEditorPreview';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<ArticleHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ArticleHistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion modals state
  const [itemToDelete, setItemToDelete] = useState<ArticleHistoryItem | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  useEffect(() => {
    setHistory(getArticleHistory());
  }, []);

  const confirmDeleteSingle = () => {
    if (itemToDelete) {
      const updated = deleteArticleHistoryItem(itemToDelete.id);
      setHistory(updated);
      if (selectedItem?.id === itemToDelete.id) setSelectedItem(null);
      setItemToDelete(null);
    }
  };

  const confirmClearAll = () => {
    clearArticleHistory();
    setHistory([]);
    setSelectedItem(null);
    setShowClearAllModal(false);
  };

  const handleCopy = async (id: string, html: string) => {
    const success = await copyToClipboard(html);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.style.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata kunci atau judul..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#fe4c6f]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
            Total: <strong>{history.length}</strong> / 20 Artikel
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-gray-800">Tidak ada riwayat ditemukan</h3>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm ? 'Coba gunakan kata kunci pencarian lain.' : 'Artikel yang Anda buat akan tersimpan di sini secara otomatis.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#fe4c6f]">
                    {item.keyword}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.style}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-2 group-hover:text-[#fe4c6f] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {item.plainText}
                </p>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(item.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span>• {item.wordCount} Kata</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopy(item.id, item.html)}
                    className="p-1.5 text-gray-500 hover:text-[#fe4c6f] hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Copy HTML"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setSelectedItem(item)}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    title="Pratinjau Artikel"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="Hapus Artikel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Article Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Hapus Artikel Ini?</h3>
                <p className="text-xs text-gray-500">Tindakan ini akan menghapus artikel dari riwayat lokal Anda.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-semibold text-gray-800 line-clamp-2">{itemToDelete.title}</p>
              <p className="text-[11px] text-gray-500 mt-1">Kata kunci: <span className="font-medium text-[#fe4c6f]">{itemToDelete.keyword}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Artikel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Hapus SEMUA Riwayat?</h3>
                <p className="text-xs text-gray-500">Apakah Anda yakin ingin menghapus seluruh {history.length} artikel dari riwayat?</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
              ⚠️ Peringatan: Seluruh data riwayat generasi artikel yang tersimpan di browser Anda akan dihapus secara permanen.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#fe4c6f]">
                  {selectedItem.keyword}
                </span>
                <h3 className="font-bold text-base text-gray-900 truncate max-w-md">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <ClassicEditorPreview
                htmlContent={selectedItem.html}
                keyword={selectedItem.keyword}
                title={selectedItem.title}
                slug={selectedItem.slug}
                metaTitle={selectedItem.metaTitle}
                metaDescription={selectedItem.metaDescription}
                focusKeyword={selectedItem.focusKeyword}
                featuredImageUrl={selectedItem.featuredImageUrl}
                featuredImageAlt={selectedItem.featuredImageAlt}
                panduanImAudit={selectedItem.panduanImAudit}
                wordCount={selectedItem.wordCount}
                generationTimeMs={selectedItem.generationDurationMs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
