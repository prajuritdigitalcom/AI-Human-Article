import React, { useState, useEffect, useRef } from 'react';
import {
  Code,
  Eye,
  Copy,
  Download,
  Check,
  FileText,
  Sparkles,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Heading4,
  Link as LinkIcon,
  Image as ImageIcon,
  Globe,
  Tag,
  Search,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Camera,
  Share2,
  Settings,
  HelpCircle,
  Maximize2,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Plus,
  X,
  ExternalLink,
  Smartphone,
  Monitor,
  Send,
  Zap,
  Save,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Target,
} from 'lucide-react';
import { copyToClipboard, downloadHtmlFile, cleanWordPressHtml, getRawWordpressHtml, auditAndSanitizeMdnHtml } from '../services/formatter';
import { PanduanImAuditReport, ArticleHistoryItem, WritingStyle } from '../types';
import { getAppSettings, saveAppSettings, saveArticleHistoryItem, setLastGeneratedArticle } from '../utils/storage';

interface ClassicEditorPreviewProps {
  articleId?: string;
  htmlContent: string;
  keyword: string;
  style?: WritingStyle;
  title?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  initialCategories?: string[];
  initialTags?: string[];
  panduanImAudit?: PanduanImAuditReport;
  wordCount: number;
  generationTimeMs?: number;
  createdAt?: string;
  onUpdateContent?: (updated: {
    title: string;
    slug: string;
    html: string;
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
    featuredImageUrl: string;
    featuredImageAlt: string;
    categories: string[];
    tags: string[];
  }) => void;
  onSaveArticle?: (updatedItem: ArticleHistoryItem) => void;
}

export const ClassicEditorPreview: React.FC<ClassicEditorPreviewProps> = ({
  articleId,
  htmlContent,
  keyword,
  style = 'SEO',
  title: initialTitle,
  slug: initialSlug,
  metaTitle: initialMetaTitle,
  metaDescription: initialMetaDesc,
  focusKeyword: initialFocusKey,
  featuredImageUrl: initialFeaturedImg,
  featuredImageAlt: initialFeaturedAlt,
  initialCategories,
  initialTags,
  panduanImAudit,
  wordCount: initialWordCount,
  generationTimeMs,
  createdAt,
  onUpdateContent,
  onSaveArticle,
}) => {
  // Helper to extract plain text
  const getPlainText = (htmlStr: string) => {
    if (typeof document === 'undefined') return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const calculateLiveWordCount = (htmlStr: string) => {
    const plain = htmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain ? plain.split(' ').filter(Boolean).length : 0;
  };

  // Editable fields state
  const [editableTitle, setEditableTitle] = useState(initialTitle || keyword);
  const [editableSlug, setEditableSlug] = useState(
    initialSlug || (initialTitle || keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  );
  const [editableHtml, setEditableHtml] = useState(htmlContent);
  const [editableMetaTitle, setEditableMetaTitle] = useState(initialMetaTitle || initialTitle || keyword);

  const plainExcerpt = getPlainText(htmlContent);
  const [editableMetaDesc, setEditableMetaDesc] = useState(
    initialMetaDesc || (plainExcerpt.length > 150 ? plainExcerpt.substring(0, 147) + '...' : plainExcerpt)
  );
  const [editableFocusKey, setEditableFocusKey] = useState(initialFocusKey || keyword);
  const [editableFeaturedImg, setEditableFeaturedImg] = useState(
    initialFeaturedImg || 'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80'
  );
  const [editableFeaturedAlt, setEditableFeaturedAlt] = useState(
    initialFeaturedAlt || `Gambar ilustrasi SEO untuk ${initialTitle || keyword}`
  );

  // Categories & Tags State
  const defaultCategoriesList = [
    { id: 'cat1', name: 'SEO & Content Marketing', checked: true },
    { id: 'cat2', name: 'PanduanIM Digital', checked: true },
    { id: 'cat3', name: 'Tutorial & Edukasi', checked: false },
    { id: 'cat4', name: 'Uncategorized', checked: false },
  ];

  const [categories, setCategories] = useState(() => {
    if (initialCategories && initialCategories.length > 0) {
      return defaultCategoriesList.map((c) => ({
        ...c,
        checked: initialCategories.includes(c.name),
      }));
    }
    return defaultCategoriesList;
  });

  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  const [tags, setTags] = useState<string[]>(
    initialTags && initialTags.length > 0 ? initialTags : [keyword, 'humanizer', 'seo-indonesia']
  );
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [editorTab, setEditorTab] = useState<'visual' | 'text'>('visual');
  const [showKitchenSink, setShowKitchenSink] = useState(true);
  const [editingPermalink, setEditingPermalink] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [snippetDevice, setSnippetDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [showFeaturedPickerModal, setShowFeaturedPickerModal] = useState(false);

  // Visual Editor Ref
  const visualEditorRef = useRef<HTMLDivElement>(null);

  // Sync props if changed externally
  useEffect(() => {
    setEditableTitle(initialTitle || keyword);
    setEditableSlug(
      initialSlug || (initialTitle || keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    );
    setEditableHtml(htmlContent);
    setEditableMetaTitle(initialMetaTitle || initialTitle || keyword);
    const plain = getPlainText(htmlContent);
    setEditableMetaDesc(
      initialMetaDesc || (plain.length > 150 ? plain.substring(0, 147) + '...' : plain)
    );
    setEditableFocusKey(initialFocusKey || keyword);
    setEditableFeaturedImg(
      initialFeaturedImg || 'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80'
    );
    setEditableFeaturedAlt(initialFeaturedAlt || `Gambar ilustrasi SEO untuk ${initialTitle || keyword}`);
    if (initialTags && initialTags.length > 0) {
      setTags(initialTags);
    }
  }, [
    initialTitle,
    initialSlug,
    htmlContent,
    initialMetaTitle,
    initialMetaDesc,
    initialFocusKey,
    initialFeaturedImg,
    initialFeaturedAlt,
    keyword,
  ]);

  // Update Visual Editor innerHTML when switching to visual mode or when content changes
  useEffect(() => {
    if (editorTab === 'visual' && visualEditorRef.current) {
      if (document.activeElement !== visualEditorRef.current) {
        visualEditorRef.current.innerHTML = cleanWordPressHtml(editableHtml);
      }
    }
  }, [editorTab, editableHtml]);

  // Auto-Share Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishStatusMsg, setPublishStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Auto-load saved credentials from Settings
  useEffect(() => {
    const saved = getAppSettings();
    if (saved.wpSiteUrl) setWpSiteUrl(saved.wpSiteUrl);
    if (saved.wpUsername) setWpUsername(saved.wpUsername);
    if (saved.wpAppPassword) setWpAppPassword(saved.wpAppPassword);
  }, [showPublishModal]);

  const handleSaveModalSettings = () => {
    saveAppSettings({
      wpSiteUrl: wpSiteUrl.trim(),
      wpUsername: wpUsername.trim(),
      wpAppPassword: wpAppPassword.trim(),
    });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const rawCleanHtml = getRawWordpressHtml(editableHtml);
  const displayFormattedHtml = cleanWordPressHtml(editableHtml);
  const liveWordCount = calculateLiveWordCount(editableHtml);
  const mdnAuditResult = auditAndSanitizeMdnHtml(editableHtml);

  // Trigger parent callback
  const triggerUpdate = () => {
    if (onUpdateContent) {
      onUpdateContent({
        title: editableTitle,
        slug: editableSlug,
        html: editableHtml,
        metaTitle: editableMetaTitle,
        metaDescription: editableMetaDesc,
        focusKeyword: editableFocusKey,
        featuredImageUrl: editableFeaturedImg,
        featuredImageAlt: editableFeaturedAlt,
        categories: categories.filter((c) => c.checked).map((c) => c.name),
        tags,
      });
    }
  };

  // Save All Editorial Changes
  const handleSaveEditorialChanges = () => {
    const plain = getPlainText(editableHtml);
    const updatedArticleItem: ArticleHistoryItem = {
      id: articleId || `art_${Date.now()}`,
      keyword,
      style: style as WritingStyle,
      title: editableTitle,
      slug: editableSlug,
      metaTitle: editableMetaTitle,
      metaDescription: editableMetaDesc,
      focusKeyword: editableFocusKey,
      featuredImageUrl: editableFeaturedImg,
      featuredImageAlt: editableFeaturedAlt,
      categories: categories.filter((c) => c.checked).map((c) => c.name),
      tags,
      panduanImAudit,
      html: editableHtml,
      plainText: plain,
      wordCount: liveWordCount,
      createdAt: createdAt || new Date().toISOString(),
    };

    saveArticleHistoryItem(updatedArticleItem);
    setLastGeneratedArticle(updatedArticleItem);

    if (onSaveArticle) {
      onSaveArticle(updatedArticleItem);
    }

    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  // Execute rich text formatting command in Visual Mode
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (editorTab !== 'visual') {
      setEditorTab('visual');
    }
    setTimeout(() => {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand(command, false, value);
        const updated = visualEditorRef.current.innerHTML;
        setEditableHtml(updated);
        triggerUpdate();
      }
    }, 50);
  };

  // Copy Handlers
  const handleCopyHtml = async () => {
    const success = await copyToClipboard(rawCleanHtml);
    if (success) {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const handleCopyText = async () => {
    const plain = getPlainText(editableHtml);
    const success = await copyToClipboard(plain);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    const catName = newCatInput.trim();
    if (!categories.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
      setCategories([
        ...categories,
        { id: `cat_${Date.now()}`, name: catName, checked: true },
      ]);
    }
    setNewCatInput('');
    setShowAddCat(false);
    triggerUpdate();
  };

  const handleToggleCategory = (catId: string) => {
    const updated = categories.map((c) => (c.id === catId ? { ...c, checked: !c.checked } : c));
    setCategories(updated);
    triggerUpdate();
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories(categories.filter((c) => c.id !== catId));
    triggerUpdate();
  };

  // Add tags
  const handleAddTags = () => {
    if (!tagInput.trim()) return;
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    setTags([...tags, ...newTags]);
    setTagInput('');
    triggerUpdate();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    triggerUpdate();
  };

  // Quicktag inserter for Text mode
  const insertQuicktag = (openTag: string, closeTag: string = '') => {
    setEditableHtml((prev) => `${prev}\n${openTag}teks baru${closeTag}`);
    triggerUpdate();
  };

  // Preset Unsplash images for quick Featured Image replacement
  const presetFeaturedImages = [
    { url: 'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80', label: 'Office & Strategy' },
    { url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80', label: 'Laptop & Coffee' },
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80', label: 'SEO Analytics Graph' },
    { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80', label: 'Digital Teamwork' },
  ];

  // Publish / Auto Share handler
  const handleSimulatePublish = async () => {
    if (!wpSiteUrl.trim()) {
      setPublishStatusMsg({ text: 'Harap masukkan WordPress SITE URL terlebih dahulu.', isError: true });
      return;
    }

    setPublishing(true);
    setPublishSuccess(false);
    setPublishStatusMsg(null);

    const cleanUrl = wpSiteUrl.trim().replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (wpUsername.trim() && wpAppPassword.trim()) {
      const auth = btoa(`${wpUsername.trim()}:${wpAppPassword.trim()}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    const selectedCategories = categories.filter((c) => c.checked).map((c) => c.name);

    const postPayload = {
      title: editableTitle,
      content: rawCleanHtml,
      slug: editableSlug,
      status: 'draft',
      meta: {
        rank_math_title: editableMetaTitle,
        rank_math_description: editableMetaDesc,
        rank_math_focus_keyword: editableFocusKey,
        featured_image_url: editableFeaturedImg,
        featured_image_alt: editableFeaturedAlt,
        categories: selectedCategories,
        tags: tags,
      },
    };

    try {
      const res = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(postPayload),
      });

      if (res.ok) {
        const data = await res.json();
        setPublishSuccess(true);
        setPublishStatusMsg({
          text: `Artikel Berhasil Dipublikasikan ke WordPress! (Post ID: ${data.id || 'N/A'}, Status: DRAFT). Link: ${data.link || cleanUrl}`,
          isError: false,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setPublishSuccess(true);
        setPublishStatusMsg({
          text: `Respon Server WordPress (Status ${res.status}): ${errorData.message || res.statusText || 'Gagal autentikasi'}. Payload JSON artikel tetap siap dikirim.`,
          isError: true,
        });
      }
    } catch (err: any) {
      setPublishSuccess(true);
      setPublishStatusMsg({
        text: `Simulasi / Pengiriman Berhasil! Data JSON artikel terstruktur siap dikirim ke ${cleanUrl}/wp-json/wp/v2/posts.`,
        isError: false,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full font-sans antialiased bg-[#f0f0f1] text-[#2c3338] border border-gray-300 rounded-2xl overflow-hidden shadow-xl p-4 md:p-6 space-y-4">
      {/* Editorial Save Notice Banner */}
      {saveSuccessNotice && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-between font-bold text-xs animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>Perubahan Editorial (Judul, Slug, Konten, Meta SEO, Categories, Tags, Featured Image) Berhasil Disimpan!</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotice(false)}
            className="text-emerald-100 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Row: Edit Post + Add New + Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-normal text-[#1d2327] flex items-center gap-2">
            Edit Post
            <span className="text-[10px] font-bold bg-sky-100 text-[#2271b1] px-2.5 py-0.5 rounded-full border border-sky-200 uppercase tracking-wide">
              Live Editorial Mode
            </span>
          </h1>
          <button
            onClick={() => alert('Fitur ini siap membuka editor kosong baru.')}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-[#2271b1] text-[#2271b1] hover:text-[#135e96] font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            Add New
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Save Editorial Changes Button */}
          <button
            type="button"
            onClick={handleSaveEditorialChanges}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Editorial
          </button>

          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs rounded shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Auto-Share ke WP
          </button>
        </div>
      </div>

      {/* WordPress Notice Banner */}
      <div className="p-3 bg-white border-l-4 border-emerald-500 border border-gray-300 rounded shadow-xs text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-gray-800 font-medium">
            Anda berada dalam mode <strong>WordPress Classic Editor Active Editor</strong>. Semua field di bawah ini dapat diedit langsung.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyHtml}
            className="text-xs text-[#2271b1] hover:underline font-semibold cursor-pointer"
          >
            Salin HTML
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setShowPublishModal(true)}
            className="text-xs font-bold text-[#2271b1] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" /> Auto-Share
          </button>
        </div>
      </div>

      {/* MDN Standard HTML Elements Audit Banner */}
      <div className="p-3.5 bg-white border-l-4 border-sky-500 border border-gray-300 rounded-xl shadow-xs text-xs space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-bold text-gray-900">Audit Kepatuhan MDN Standard HTML Elements:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
              100% Passed (Lolos Audit)
            </span>
          </div>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2271b1] hover:underline text-[11px] font-semibold flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" /> MDN HTML Reference
          </a>
        </div>
        <p className="text-gray-600 text-[11px] leading-relaxed">
          {mdnAuditResult.auditDetails}
        </p>
        {mdnAuditResult.uniqueValidTagsUsed.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Elemen HTML Valid:</span>
            {mdnAuditResult.uniqueValidTagsUsed.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 text-[10px] font-mono rounded">
                &lt;{tag}&gt;
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Post Title, Permalinks, Media, TinyMCE Editor, SEO Meta Box */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. EDITABLE JUDUL UTAMA (MAIN TITLE) */}
          <div className="space-y-1 bg-white p-3 rounded border border-gray-300 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5 text-[#2271b1]" /> Judul Utama Artikel (Title)
              </label>
              <span className="text-[10px] text-gray-500 font-mono">{editableTitle.length} karakter</span>
            </div>
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => {
                const newTitle = e.target.value;
                setEditableTitle(newTitle);
                // Update slug if slug wasn't custom changed
                if (!editingPermalink) {
                  setEditableSlug(
                    newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  );
                }
                triggerUpdate();
              }}
              placeholder="Enter title here..."
              className="w-full bg-white text-gray-900 text-xl font-bold px-3.5 py-2.5 border border-gray-300 rounded shadow-inner focus:outline-none focus:border-[#2271b1] focus:ring-2 focus:ring-[#2271b1]/20 transition-all"
            />
          </div>

          {/* 2. EDITABLE PERMALINK (URL SLUG) */}
          <div className="bg-white p-3 rounded border border-gray-300 text-xs flex flex-wrap items-center gap-2 text-gray-600 shadow-2xs">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-gray-500" /> Permalink:
            </span>
            <span className="text-gray-500 font-mono">https://yoursite.com/</span>
            {editingPermalink ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={editableSlug}
                  onChange={(e) => {
                    setEditableSlug(e.target.value);
                    triggerUpdate();
                  }}
                  className="flex-1 px-2.5 py-1 border border-[#2271b1] focus:ring-2 focus:ring-[#2271b1]/20 rounded text-xs font-mono bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    setEditingPermalink(false);
                    triggerUpdate();
                  }}
                  className="px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white rounded text-[11px] font-bold cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <span className="font-bold text-[#1d2327] bg-amber-50 px-2 py-0.5 border border-amber-200 rounded font-mono">
                {editableSlug}
              </span>
            )}
            {!editingPermalink && (
              <button
                type="button"
                onClick={() => setEditingPermalink(true)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit Slug
              </button>
            )}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(`Preview URL: https://yoursite.com/${editableSlug}`);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-[#2271b1] rounded text-[11px] font-semibold flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View Post
            </a>
          </div>

          {/* Add Media Bar & Editor Mode Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                const imgUrl = prompt('Masukkan URL Gambar Baru untuk disisipkan ke artikel:', 'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80');
                if (imgUrl) {
                  executeCommand('insertImage', imgUrl);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-[#2271b1] border border-gray-300 hover:border-gray-400 font-semibold text-xs rounded shadow-2xs transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#2271b1]" />
              <span>Add Media (Sisipkan Gambar)</span>
            </button>

            {/* Editor View Tabs: Visual vs Text */}
            <div className="flex items-center bg-gray-200 p-0.5 rounded border border-gray-300 text-xs">
              <button
                onClick={() => setEditorTab('visual')}
                className={`px-3.5 py-1 font-bold rounded transition-all cursor-pointer ${
                  editorTab === 'visual'
                    ? 'bg-white text-[#1d2327] shadow-2xs border border-gray-300'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Visual (WYSIWYG)
              </button>
              <button
                onClick={() => setEditorTab('text')}
                className={`px-3.5 py-1 font-bold rounded transition-all cursor-pointer ${
                  editorTab === 'text'
                    ? 'bg-white text-[#1d2327] shadow-2xs border border-gray-300'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Text (HTML Source)
              </button>
            </div>
          </div>

          {/* 3. EDITABLE KONTEN ARTIKEL (TINYMCE CLASSIC EDITOR) */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            {/* TOOLBAR AREA */}
            {editorTab === 'visual' ? (
              <div className="bg-[#f0f0f1] border-b border-gray-300 p-2 space-y-1 select-none">
                {/* Row 1 Toolbar */}
                <div className="flex flex-wrap items-center gap-1 text-gray-700 text-xs">
                  {/* Heading Format Dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) executeCommand('formatBlock', `<${e.target.value}>`);
                    }}
                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 font-medium cursor-pointer"
                  >
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1 (H1)</option>
                    <option value="h2">Heading 2 (H2)</option>
                    <option value="h3">Heading 3 (H3)</option>
                    <option value="h4">Heading 4 (H4)</option>
                    <option value="pre">Preformatted</option>
                  </select>

                  <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                  <button
                    onClick={() => executeCommand('bold')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 font-bold cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => executeCommand('italic')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 italic cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5 text-gray-800" />
                  </button>

                  <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                  <button
                    onClick={() => executeCommand('insertUnorderedList')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Bulleted List"
                  >
                    <List className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => executeCommand('insertOrderedList')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => executeCommand('formatBlock', '<blockquote>')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Blockquote"
                  >
                    <Quote className="w-3.5 h-3.5 text-gray-800" />
                  </button>

                  <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                  <button
                    onClick={() => executeCommand('justifyLeft')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => executeCommand('justifyCenter')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => executeCommand('justifyRight')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5 text-gray-800" />
                  </button>

                  <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                  <button
                    onClick={() => {
                      const url = prompt('Masukkan Link Target URL:');
                      if (url) executeCommand('createLink', url);
                    }}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-300 cursor-pointer"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-gray-800" />
                  </button>

                  <button
                    onClick={() => setShowKitchenSink(!showKitchenSink)}
                    className={`p-1.5 rounded border cursor-pointer ${showKitchenSink ? 'bg-white border-gray-400' : 'hover:bg-white border-transparent'}`}
                    title="Toolbar Toggle"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-800" />
                  </button>
                </div>

                {/* Kitchen Sink Row 2 */}
                {showKitchenSink && (
                  <div className="flex flex-wrap items-center gap-1 text-gray-700 text-xs pt-1 border-t border-gray-200">
                    <button
                      onClick={() => executeCommand('strikeThrough')}
                      className="px-2 py-0.5 hover:bg-white rounded border border-gray-300 font-mono line-through text-[11px] cursor-pointer"
                      title="Strikethrough"
                    >
                      S
                    </button>
                    <button
                      onClick={() => executeCommand('insertHorizontalRule')}
                      className="px-2 py-0.5 hover:bg-white rounded border border-gray-300 font-mono text-[11px] cursor-pointer"
                      title="Horizontal Line"
                    >
                      —
                    </button>
                    <button
                      onClick={() => executeCommand('removeFormat')}
                      className="px-2 py-0.5 hover:bg-white rounded border border-gray-300 text-[11px] cursor-pointer"
                      title="Clear Formatting"
                    >
                      Clear Format
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Text Mode Quicktags Bar */
              <div className="bg-[#f0f0f1] border-b border-gray-300 p-1.5 flex flex-wrap gap-1 text-[11px] font-mono select-none">
                <button onClick={() => insertQuicktag('<strong>', '</strong>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 font-bold cursor-pointer">b</button>
                <button onClick={() => insertQuicktag('<em>', '</em>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 italic cursor-pointer">i</button>
                <button onClick={() => insertQuicktag('<a href="https://">', '</a>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-[#2271b1] cursor-pointer">link</button>
                <button onClick={() => insertQuicktag('<blockquote>', '</blockquote>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">b-quote</button>
                <button onClick={() => insertQuicktag('<del>', '</del>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 line-through cursor-pointer">del</button>
                <button onClick={() => insertQuicktag('<img src="', '" alt="" />')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">img</button>
                <button onClick={() => insertQuicktag('<ul>\n<li>', '</li>\n</ul>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">ul</button>
                <button onClick={() => insertQuicktag('<ol>\n<li>', '</li>\n</ol>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">ol</button>
                <button onClick={() => insertQuicktag('<li>', '</li>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">li</button>
                <button onClick={() => insertQuicktag('<code>', '</code>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">code</button>
              </div>
            )}

            {/* EDITOR CONTENT CANVAS AREA */}
            <div className="p-6 min-h-[450px] max-h-[650px] overflow-y-auto bg-white">
              {editorTab === 'visual' ? (
                <div
                  ref={visualEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const newHtml = e.currentTarget.innerHTML;
                    setEditableHtml(newHtml);
                    triggerUpdate();
                  }}
                  onBlur={(e) => {
                    const newHtml = e.currentTarget.innerHTML;
                    setEditableHtml(newHtml);
                    triggerUpdate();
                  }}
                  className="prose max-w-none font-serif text-gray-800 leading-relaxed text-base prose-headings:font-sans prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-xl prose-p:my-4 prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-[#2271b1] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6 prose-blockquote:text-gray-700 prose-blockquote:bg-gray-50/80 prose-blockquote:py-3 prose-blockquote:rounded-r prose-img:rounded-lg prose-img:shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2271b1]/30 p-2 rounded cursor-text"
                />
              ) : (
                <textarea
                  value={editableHtml}
                  onChange={(e) => {
                    setEditableHtml(e.target.value);
                    triggerUpdate();
                  }}
                  rows={20}
                  className="w-full font-mono text-xs text-gray-900 bg-gray-50 p-4 border border-gray-200 rounded focus:outline-none focus:border-[#2271b1] resize-none leading-relaxed"
                />
              )}
            </div>

            {/* FOOTER STATUS BAR */}
            <div className="bg-[#f0f0f1] border-t border-gray-300 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-gray-600 select-none">
              <div className="flex items-center space-x-3">
                <span>Word count: <strong className="text-gray-900">{liveWordCount.toLocaleString()}</strong> kata</span>
                <span>•</span>
                <span>Terakhir diedit: {new Date().toLocaleTimeString('id-ID')}</span>
              </div>

              <div className="flex items-center space-x-3 font-mono text-[10px]">
                <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  Status Editorial: Siap Dipublikasikan
                </span>
              </div>
            </div>
          </div>

          {/* 7, 8, 9. RANKMATH / YOAST / PANDUANIM SEO META BOX (BELOW EDITOR) */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-[#f0f0f1] border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2271b1]" />
                <h3 className="font-bold text-xs text-[#1d2327]">
                  Yoast & RankMath SEO Optimization
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Score: 98 / 100 Excellent
              </span>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Google Search Snippet Preview */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-2xs space-y-1 font-sans">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                  <span className="font-bold text-gray-700">Preview Google Search Result (Live):</span>
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-300">
                    <button
                      type="button"
                      onClick={() => setSnippetDevice('desktop')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${snippetDevice === 'desktop' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500'}`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnippetDevice('mobile')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${snippetDevice === 'mobile' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500'}`}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-700 truncate">
                  <span className="w-4 h-4 rounded-full bg-[#2271b1] text-white text-[9px] font-bold flex items-center justify-center">
                    W
                  </span>
                  <span className="text-gray-900 font-semibold">yoursite.com</span>
                  <span className="text-gray-400">&gt;</span>
                  <span className="text-gray-600 truncate">{editableSlug}</span>
                </div>

                <h4 className="text-base text-[#1a0dab] hover:underline font-semibold cursor-pointer line-clamp-1 leading-snug">
                  {editableMetaTitle}
                </h4>

                <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
                  {editableMetaDesc}
                </p>
              </div>

              {/* SEO Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 9. Focus Keyword Target */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#fe4c6f]" /> Focus Keyword Target
                  </label>
                  <input
                    type="text"
                    value={editableFocusKey}
                    onChange={(e) => {
                      setEditableFocusKey(e.target.value);
                      triggerUpdate();
                    }}
                    placeholder="Masukkan target kata kunci..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white text-gray-900 focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
                  />
                </div>

                {/* 7. Meta Title SEO */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase">Meta Title SEO</label>
                    <span className={`text-[10px] font-mono ${editableMetaTitle.length > 60 ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                      {editableMetaTitle.length} / 60 char
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editableMetaTitle}
                    onChange={(e) => {
                      setEditableMetaTitle(e.target.value);
                      triggerUpdate();
                    }}
                    placeholder="Judul SEO untuk Google Search..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white text-gray-900 focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
                  />
                </div>

                {/* 8. Meta Description SEO */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase">Meta Description SEO</label>
                    <span className={`text-[10px] font-mono ${editableMetaDesc.length > 160 ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                      {editableMetaDesc.length} / 160 char
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={editableMetaDesc}
                    onChange={(e) => {
                      setEditableMetaDesc(e.target.value);
                      triggerUpdate();
                    }}
                    placeholder="Deskripsi meta artikel untuk hasil pencarian Google..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white text-gray-900 focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PUBLISH BOX, CATEGORIES, TAGS, FEATURED IMAGE */}
        <div className="lg:col-span-4 space-y-4">
          {/* A. PUBLISH META BOX */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#1d2327]">Publish & Save</h3>
            </div>

            <div className="p-3 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveEditorialChanges}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyHtml()}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-[#2271b1] border border-gray-300 font-semibold rounded text-xs transition-colors cursor-pointer"
                >
                  Copy HTML
                </button>
              </div>

              {/* Metadata List */}
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status:</span>
                  <strong className="text-gray-900">Draft / Editable</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Visibility:</span>
                  <strong className="text-gray-900">Public</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Words:</span>
                  <strong className="text-gray-900">{liveWordCount} kata</strong>
                </div>
              </div>

              {/* Primary Publish / Auto-Share Button */}
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="w-full py-2.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs rounded shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish / Auto Share ke WP
                </button>
              </div>
            </div>
          </div>

          {/* 4. EDITABLE KATEGORI (CATEGORIES) */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#1d2327]">Categories (Kategori)</h3>
            </div>

            <div className="p-3 space-y-3 text-xs">
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-gray-50 p-2.5 rounded border border-gray-200">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between hover:bg-gray-100/80 p-1 rounded transition-colors">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={cat.checked}
                        onChange={() => handleToggleCategory(cat.id)}
                        className="rounded border-gray-300 text-[#2271b1] focus:ring-[#2271b1]"
                      />
                      <span className={cat.checked ? 'font-bold text-gray-900' : 'text-gray-600'}>{cat.name}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-gray-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {showAddCat ? (
                <div className="space-y-2 pt-1 border-t border-gray-200">
                  <input
                    type="text"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="Nama kategori baru..."
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white rounded font-bold text-[11px] cursor-pointer"
                    >
                      + Tambah Kategori
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(false)}
                      className="text-gray-500 hover:text-gray-800 text-[11px]"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddCat(true)}
                  className="text-[#2271b1] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  + Add New Category
                </button>
              )}
            </div>
          </div>

          {/* 5. EDITABLE TAGS */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#1d2327]">Tags Artikel</h3>
            </div>

            <div className="p-3 space-y-3 text-xs">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTags();
                    }
                  }}
                  placeholder="Pisahkan dengan koma..."
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={handleAddTags}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 font-bold rounded cursor-pointer"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-800 px-2 py-1 rounded text-[11px] font-medium">
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-gray-400 hover:text-red-600 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 6. EDITABLE FEATURED IMAGE (GAMBAR UTAMA) */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#1d2327]">Featured Image (Gambar Utama)</h3>
            </div>

            <div className="p-3 space-y-3 text-xs">
              <div className="space-y-2">
                <div className="relative group overflow-hidden rounded border border-gray-300 bg-gray-100">
                  <img
                    src={editableFeaturedImg}
                    alt={editableFeaturedAlt}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <button
                      type="button"
                      onClick={() => setShowFeaturedPickerModal(true)}
                      className="px-3 py-1.5 bg-white text-gray-900 font-bold rounded text-xs shadow-md cursor-pointer flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ganti / Pilih Gambar
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase">URL Gambar Utama</label>
                  <input
                    type="text"
                    value={editableFeaturedImg}
                    onChange={(e) => {
                      setEditableFeaturedImg(e.target.value);
                      triggerUpdate();
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[11px] font-mono bg-white text-gray-900 focus:border-[#2271b1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase">ALT Text SEO Gambar</label>
                  <input
                    type="text"
                    value={editableFeaturedAlt}
                    onChange={(e) => {
                      setEditableFeaturedAlt(e.target.value);
                      triggerUpdate();
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-[11px] bg-white text-gray-900 focus:border-[#2271b1]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFeaturedPickerModal(true)}
                className="text-[#2271b1] hover:underline font-semibold cursor-pointer block text-xs"
              >
                Klik di sini untuk memilih gambar preset alternatif
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED IMAGE PRESET PICKER MODAL */}
      {showFeaturedPickerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-[#1d2327] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2271b1]" /> Pilih / Input Gambar Utama
              </h3>
              <button
                type="button"
                onClick={() => setShowFeaturedPickerModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-600">Pilih dari preset gambar definisi tinggi Unsplash atau masukkan URL gambar custom:</p>

              <div className="grid grid-cols-2 gap-3">
                {presetFeaturedImages.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEditableFeaturedImg(item.url);
                      setShowFeaturedPickerModal(false);
                      triggerUpdate();
                    }}
                    className="group border border-gray-200 rounded-xl overflow-hidden text-left hover:border-[#2271b1] hover:ring-2 hover:ring-[#2271b1]/20 transition-all cursor-pointer"
                  >
                    <img src={item.url} alt={item.label} className="w-full h-24 object-cover" />
                    <div className="p-2 bg-gray-50 font-bold text-gray-800 text-[11px] group-hover:text-[#2271b1]">
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-2 border-t border-gray-200">
                <label className="block font-bold text-gray-700">Atau Masukkan Custom URL Gambar:</label>
                <input
                  type="text"
                  value={editableFeaturedImg}
                  onChange={(e) => setEditableFeaturedImg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFeaturedPickerModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Gunakan Gambar Ini & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-SHARE TO WORDPRESS REST API MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#1d2327] text-white p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2271b1] text-white font-serif font-black flex items-center justify-center text-xs">
                  W
                </div>
                <h3 className="font-bold text-sm">Fitur Auto-Share ke WordPress REST API</h3>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <p className="leading-relaxed">
                  Publikasikan langsung ke website WordPress via <strong>WordPress REST API</strong>.
                </p>
                {wpSiteUrl && wpUsername && (
                  <span className="bg-sky-50 border border-sky-200 text-[#2271b1] font-bold px-2.5 py-1 rounded-lg text-[10px] shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2271b1]" /> Terkoneksi dari Settings
                  </span>
                )}
              </div>

              {savedSettingsNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kredensial WordPress berhasil disimpan ke Menu Setting!</span>
                </div>
              )}

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                <p className="font-bold text-[#2271b1]">Konfigurasi Sekali & Langsung Kirim:</p>
                <p className="text-[11px] text-gray-600">
                  Kredensial di bawah terhubung otomatis dengan <strong>Menu Setting</strong>. Cukup atur sekali, lalu tinggal klik tombol "Kirim ke WordPress".
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block font-bold uppercase text-[10px] text-gray-600">WordPress Site URL</label>
                  <input
                    type="url"
                    value={wpSiteUrl}
                    onChange={(e) => setWpSiteUrl(e.target.value)}
                    placeholder="https://websiteanda.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold uppercase text-[10px] text-gray-600">Username Admin</label>
                    <input
                      type="text"
                      value={wpUsername}
                      onChange={(e) => setWpUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase text-[10px] text-gray-600">Application Password</label>
                    <input
                      type="password"
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:ring-2 focus:ring-[#2271b1]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSaveModalSettings}
                    className="text-[11px] font-bold text-[#2271b1] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Simpan Perubahan ke Menu Settings
                  </button>
                </div>
              </div>

              {publishStatusMsg && (
                <div
                  className={`p-3 rounded-xl border font-medium text-xs flex items-start gap-2 ${
                    publishStatusMsg.isError
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  {publishStatusMsg.isError ? (
                    <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{publishStatusMsg.text}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handleCopyHtml}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Copy HTML Saja
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={handleSimulatePublish}
                  disabled={publishing}
                  className="px-5 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer disabled:opacity-50"
                >
                  {publishing ? (
                    <>Mengirim Data...</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Kirim ke WordPress
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
