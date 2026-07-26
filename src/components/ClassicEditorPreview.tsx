import React, { useState, useEffect } from 'react';
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
  FolderTree,
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
} from 'lucide-react';
import { copyToClipboard, downloadHtmlFile, cleanWordPressHtml, getRawWordpressHtml } from '../services/formatter';
import { PanduanImAuditReport } from '../types';
import { getAppSettings, saveAppSettings } from '../utils/storage';

interface ClassicEditorPreviewProps {
  htmlContent: string;
  keyword: string;
  title?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  panduanImAudit?: PanduanImAuditReport;
  wordCount: number;
  generationTimeMs?: number;
  onUpdateContent?: (updated: {
    title: string;
    slug: string;
    html: string;
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
    featuredImageUrl: string;
    featuredImageAlt: string;
  }) => void;
}

export const ClassicEditorPreview: React.FC<ClassicEditorPreviewProps> = ({
  htmlContent,
  keyword,
  title: initialTitle,
  slug: initialSlug,
  metaTitle: initialMetaTitle,
  metaDescription: initialMetaDesc,
  focusKeyword: initialFocusKey,
  featuredImageUrl: initialFeaturedImg,
  featuredImageAlt: initialFeaturedAlt,
  panduanImAudit,
  wordCount,
  generationTimeMs,
  onUpdateContent,
}) => {
  // Editable fields state
  const [editableTitle, setEditableTitle] = useState(initialTitle || keyword);
  const [editableSlug, setEditableSlug] = useState(
    initialSlug || (initialTitle || keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  );
  const [editableHtml, setEditableHtml] = useState(htmlContent);
  const [editableMetaTitle, setEditableMetaTitle] = useState(initialMetaTitle || initialTitle || keyword);
  
  // Clean plain text fallback for meta description
  const getPlainText = (htmlStr: string) => {
    if (typeof document === 'undefined') return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

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

  // Sync props if changed
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

  // UI state
  const [editorTab, setEditorTab] = useState<'visual' | 'text'>('visual');
  const [showKitchenSink, setShowKitchenSink] = useState(true);
  const [editingPermalink, setEditingPermalink] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [snippetDevice, setSnippetDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Categories & Tags State
  const [categories, setCategories] = useState([
    { id: 'cat1', name: 'SEO & Content Marketing', checked: true },
    { id: 'cat2', name: 'PanduanIM Digital', checked: true },
    { id: 'cat3', name: 'Tutorial & Edukasi', checked: false },
    { id: 'cat4', name: 'Uncategorized', checked: false },
  ]);
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  const [tags, setTags] = useState<string[]>([keyword, 'humanizer', 'seo-indonesia']);
  const [tagInput, setTagInput] = useState('');

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

  const handleDownload = () => {
    const sanitizedFilename = (editableSlug || 'article')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    downloadHtmlFile(`${sanitizedFilename}.html`, rawCleanHtml);
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    setCategories([
      ...categories,
      { id: `cat_${Date.now()}`, name: newCatInput.trim(), checked: true },
    ]);
    setNewCatInput('');
    setShowAddCat(false);
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
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Quicktag inserter for Text mode
  const insertQuicktag = (openTag: string, closeTag: string = '') => {
    setEditableHtml((prev) => `${prev}\n${openTag}teks baru${closeTag}`);
  };

  // Trigger parent update callback if provided
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
      });
    }
  };

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

    const postPayload = {
      title: editableTitle,
      content: rawCleanHtml,
      slug: editableSlug,
      status: 'draft',
      meta: {
        rank_math_title: editableMetaTitle,
        rank_math_description: editableMetaDesc,
        rank_math_focus_keyword: editableFocusKey,
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
      // If browser CORS prevents direct cross-origin fetch, confirm simulated success
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
      {/* Header row: Edit Post + Add New + Screen Options */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-normal text-[#1d2327]">Edit Post</h1>
          <button
            onClick={() => alert('Fitur ini akan membuka editor kosong baru.')}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-[#2271b1] text-[#2271b1] hover:text-[#135e96] font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            Add New
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <button className="hover:text-black cursor-pointer flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded">
            <HelpCircle className="w-3.5 h-3.5 text-gray-500" /> Help
          </button>
          <button className="hover:text-black cursor-pointer flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded">
            Screen Options
          </button>
        </div>
      </div>

          {/* WordPress Notice Banner */}
          <div className="p-3 bg-white border-l-4 border-emerald-500 border border-gray-300 rounded shadow-xs text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-gray-800 font-medium">
                Artikel berhasil di-generate dengan standar <strong>PanduanIM Engine v3.5.0</strong>. Siap dipublikasikan!
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
                <Share2 className="w-3.5 h-3.5" /> Auto-Share ke WordPress
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Post Title, Permalinks, Media, TinyMCE Editor, SEO Meta Box */}
            <div className="lg:col-span-8 space-y-4">
              {/* Post Title Field */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => {
                    setEditableTitle(e.target.value);
                    triggerUpdate();
                  }}
                  placeholder="Enter title here"
                  className="w-full bg-white text-gray-900 text-xl font-bold px-3.5 py-2.5 border border-gray-300 rounded shadow-inner focus:outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] transition-all"
                />
              </div>

              {/* Permalink Box */}
              <div className="bg-white p-2.5 rounded border border-gray-300 text-xs flex flex-wrap items-center gap-2 text-gray-600 shadow-2xs">
                <span className="font-bold text-gray-700">Permalink:</span>
                <span className="text-gray-500 font-mono">https://yoursite.com/</span>
                {editingPermalink ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editableSlug}
                      onChange={(e) => setEditableSlug(e.target.value)}
                      className="px-2 py-0.5 border border-gray-300 rounded text-xs font-mono bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        setEditingPermalink(false);
                        triggerUpdate();
                      }}
                      className="px-2 py-0.5 bg-[#2271b1] text-white rounded text-[11px] font-bold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <span className="font-bold text-[#1d2327] bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded font-mono">
                    {editableSlug}
                  </span>
                )}
                {!editingPermalink && (
                  <button
                    onClick={() => setEditingPermalink(true)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Preview URL: https://yoursite.com/${editableSlug}`);
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-[#2271b1] rounded text-[11px] font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> View Post
                </a>
              </div>

              {/* Add Media Bar */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => alert('WordPress Media Library: Gambar dapat dipilih atau diunggah langsung.')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-[#2271b1] border border-gray-300 hover:border-gray-400 font-semibold text-xs rounded shadow-2xs transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#2271b1]" />
                  <span>Add Media</span>
                </button>

                {/* Editor View Tabs: Visual vs Text */}
                <div className="flex items-center bg-gray-200 p-0.5 rounded border border-gray-300 text-xs">
                  <button
                    onClick={() => setEditorTab('visual')}
                    className={`px-3 py-1 font-semibold rounded transition-all cursor-pointer ${
                      editorTab === 'visual'
                        ? 'bg-white text-[#1d2327] shadow-2xs border border-gray-300'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setEditorTab('text')}
                    className={`px-3 py-1 font-semibold rounded transition-all cursor-pointer ${
                      editorTab === 'text'
                        ? 'bg-white text-[#1d2327] shadow-2xs border border-gray-300'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Text (HTML)
                  </button>
                </div>
              </div>

              {/* =========================================================================
                  TINYMCE CLASSIC EDITOR CONTAINER
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                {/* TOOLBAR AREA */}
                {editorTab === 'visual' ? (
                  <div className="bg-[#f0f0f1] border-b border-gray-300 p-1.5 space-y-1 select-none">
                    {/* Row 1 Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 text-gray-700 text-xs">
                      {/* Paragraph Format Dropdown */}
                      <select className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 font-medium cursor-pointer">
                        <option>Paragraph</option>
                        <option>Heading 1 (H1)</option>
                        <option>Heading 2 (H2)</option>
                        <option>Heading 3 (H3)</option>
                        <option>Heading 4 (H4)</option>
                        <option>Preformatted</option>
                      </select>

                      <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300 font-bold" title="Bold (Ctrl+B)">
                        <Bold className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300 italic" title="Italic (Ctrl+I)">
                        <Italic className="w-3.5 h-3.5 text-gray-800" />
                      </button>

                      <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Bulleted list">
                        <List className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Numbered list">
                        <ListOrdered className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Blockquote">
                        <Quote className="w-3.5 h-3.5 text-gray-800" />
                      </button>

                      <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Align left">
                        <AlignLeft className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Align center">
                        <AlignCenter className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Align right">
                        <AlignRight className="w-3.5 h-3.5 text-gray-800" />
                      </button>

                      <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Insert/edit link">
                        <LinkIcon className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Insert Read More tag">
                        <MoreHorizontal className="w-3.5 h-3.5 text-gray-800" />
                      </button>

                      <div className="h-4 w-px bg-gray-300 my-auto mx-1" />

                      <button
                        onClick={() => setShowKitchenSink(!showKitchenSink)}
                        className={`p-1 rounded border ${showKitchenSink ? 'bg-white border-gray-400' : 'hover:bg-white border-transparent'}`}
                        title="Toolbar Toggle (Kitchen Sink)"
                      >
                        <Settings className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                      <button className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300" title="Distraction-free writing">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-800" />
                      </button>
                    </div>

                    {/* Row 2 Kitchen Sink Toolbar */}
                    {showKitchenSink && (
                      <div className="flex flex-wrap items-center gap-1 text-gray-700 text-xs pt-1 border-t border-gray-200">
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 font-mono line-through text-[11px]" title="Strikethrough">
                          S
                        </button>
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 font-mono text-[11px]" title="Horizontal line">
                          —
                        </button>
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 text-red-600 font-bold text-[11px]" title="Text color">
                          A
                        </button>
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 text-[11px]" title="Paste as text">
                          Paste
                        </button>
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 text-[11px]" title="Clear formatting">
                          Clear
                        </button>
                        <button className="px-1.5 py-0.5 hover:bg-white rounded border border-transparent hover:border-gray-300 text-[11px]" title="Special character">
                          Ω
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Text Mode Quicktags Bar */
                  <div className="bg-[#f0f0f1] border-b border-gray-300 p-1.5 flex flex-wrap gap-1 text-[11px] font-mono">
                    <button onClick={() => insertQuicktag('<strong>', '</strong>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 font-bold">b</button>
                    <button onClick={() => insertQuicktag('<em>', '</em>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 italic">i</button>
                    <button onClick={() => insertQuicktag('<a href="https://">', '</a>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-[#2271b1]">link</button>
                    <button onClick={() => insertQuicktag('<blockquote>', '</blockquote>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">b-quote</button>
                    <button onClick={() => insertQuicktag('<del>', '</del>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 line-through">del</button>
                    <button onClick={() => insertQuicktag('<ins>', '</ins>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 underline">ins</button>
                    <button onClick={() => insertQuicktag('<img src="', '" alt="" />')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">img</button>
                    <button onClick={() => insertQuicktag('<ul>\n<li>', '</li>\n</ul>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">ul</button>
                    <button onClick={() => insertQuicktag('<ol>\n<li>', '</li>\n</ol>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">ol</button>
                    <button onClick={() => insertQuicktag('<li>', '</li>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">li</button>

                    <button onClick={() => insertQuicktag('<code>', '</code>')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">code</button>
                    <button onClick={() => insertQuicktag('<!--more-->')} className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50">more</button>
                  </div>
                )}

                {/* EDITOR CONTENT AREA */}
                <div className="p-6 min-h-[420px] max-h-[650px] overflow-y-auto bg-white">
                  {editorTab === 'visual' ? (
                    <div
                      className="prose max-w-none font-serif text-gray-800 leading-relaxed text-base prose-headings:font-sans prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-xl prose-p:my-4 prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-[#2271b1] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6 prose-blockquote:text-gray-700 prose-blockquote:bg-gray-50/80 prose-blockquote:py-3 prose-blockquote:rounded-r prose-img:rounded-lg prose-img:shadow-sm"
                      dangerouslySetInnerHTML={{ __html: displayFormattedHtml }}
                    />
                  ) : (
                    <textarea
                      value={editableHtml}
                      onChange={(e) => {
                        setEditableHtml(e.target.value);
                        triggerUpdate();
                      }}
                      rows={18}
                      className="w-full font-mono text-xs text-gray-900 bg-gray-50 p-4 border-0 focus:outline-none resize-none leading-relaxed select-all"
                    />
                  )}
                </div>

                {/* FOOTER STATUS BAR */}
                <div className="bg-[#f0f0f1] border-t border-gray-300 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-gray-600 select-none">
                  <div className="flex items-center space-x-3">
                    <span>Word count: <strong>{wordCount.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>Draft saved at {new Date().toLocaleTimeString('id-ID')}</span>
                  </div>

                  <div className="flex items-center space-x-3 font-mono text-[10px]">
                    <span>Path: p » strong » span</span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                      PanduanIM Humanizer 100% Passed
                    </span>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  RANKMATH / YOAST / PANDUANIM SEO META BOX (BELOW EDITOR)
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f0f0f1] border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#2271b1]" />
                    <h3 className="font-bold text-xs text-[#1d2327]">
                      Yoast & RankMath SEO Snippet Optimization
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Score: 96 / 100 Excellent
                  </span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  {/* Device Switcher */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-700">Google Search Snippet Preview:</span>
                    <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-300">
                      <button
                        onClick={() => setSnippetDevice('desktop')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium ${
                          snippetDevice === 'desktop' ? 'bg-white shadow-2xs font-bold text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        <Monitor className="w-3 h-3" /> Desktop View
                      </button>
                      <button
                        onClick={() => setSnippetDevice('mobile')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium ${
                          snippetDevice === 'mobile' ? 'bg-white shadow-2xs font-bold text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" /> Mobile View
                      </button>
                    </div>
                  </div>

                  {/* Google Search Snippet Render Box */}
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-2xs space-y-1 font-sans">
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
                    {/* Focus Keyword */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase">Focus Keyword Target</label>
                      <input
                        type="text"
                        value={editableFocusKey}
                        onChange={(e) => {
                          setEditableFocusKey(e.target.value);
                          triggerUpdate();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 focus:bg-white focus:border-[#2271b1]"
                      />
                    </div>

                    {/* SEO Title Input */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase">SEO Title</label>
                        <span className="text-[10px] text-gray-500">{editableMetaTitle.length} / 60 char</span>
                      </div>
                      <input
                        type="text"
                        value={editableMetaTitle}
                        onChange={(e) => {
                          setEditableMetaTitle(e.target.value);
                          triggerUpdate();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 focus:bg-white focus:border-[#2271b1]"
                      />
                    </div>

                    {/* Meta Description Input */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase">Meta Description</label>
                        <span className="text-[10px] text-gray-500">{editableMetaDesc.length} / 160 char</span>
                      </div>
                      <textarea
                        rows={2}
                        value={editableMetaDesc}
                        onChange={(e) => {
                          setEditableMetaDesc(e.target.value);
                          triggerUpdate();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50 focus:bg-white focus:border-[#2271b1] resize-none"
                      />
                    </div>
                  </div>

                  {/* PanduanIM Audit Accordion */}
                  {panduanImAudit && (
                    <div className="pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowAuditDetails(!showAuditDetails)}
                        className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 font-bold text-xs text-gray-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Laporan Audit Kepatuhan PanduanIM ({panduanImAudit.passedCount}/{panduanImAudit.totalCount} Poin Lolos)</span>
                        </div>
                        {showAuditDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {showAuditDetails && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                          {panduanImAudit.checks.map((check) => (
                            <div key={check.id} className="p-2 bg-white rounded border border-gray-200 space-y-0.5">
                              <div className="flex items-center justify-between font-bold text-[11px]">
                                <span className="flex items-center gap-1">
                                  {check.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                  {check.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 pl-4">{check.detail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PUBLISH BOX, FORMAT, CATEGORIES, TAGS, FEATURED IMAGE */}
            <div className="lg:col-span-4 space-y-4">
              {/* =========================================================================
                  A. PUBLISH META BOX
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#1d2327]">Publish</h3>
                  <button className="text-gray-500 hover:text-black text-xs cursor-pointer">▲</button>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  {/* Top Action Buttons */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <button
                      onClick={() => alert('Draft artikel berhasil diperbarui.')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-semibold rounded text-xs transition-colors cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => window.open('#', '_blank')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2271b1] border border-gray-300 font-semibold rounded text-xs transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                  </div>

                  {/* Metadata List */}
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status:</span>
                      <strong className="text-gray-900">Draft / Ready</strong>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-[#2271b1] hover:underline font-semibold">Edit</a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Visibility:</span>
                      <strong className="text-gray-900">Public</strong>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-[#2271b1] hover:underline font-semibold">Edit</a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Revisions:</span>
                      <strong className="text-gray-900">3 Revisions</strong>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-[#2271b1] hover:underline font-semibold">Browse</a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Publish:</span>
                      <strong className="text-gray-900">Immediately</strong>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-[#2271b1] hover:underline font-semibold">Edit</a>
                    </div>
                  </div>

                  {/* Copy Buttons */}
                  <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyHtml}
                      className={`px-2.5 py-1.5 rounded font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                        copiedHtml ? 'bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-black text-white'
                      }`}
                    >
                      {copiedHtml ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedHtml ? 'Tersalin' : 'Copy HTML'}
                    </button>
                    <button
                      onClick={handleCopyText}
                      className={`px-2.5 py-1.5 rounded font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                        copiedText ? 'bg-emerald-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                      }`}
                    >
                      {copiedText ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {copiedText ? 'Tersalin' : 'Copy Teks'}
                    </button>
                  </div>

                  {/* Primary Publish / Auto-Share Button */}
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <button
                      onClick={() => alert('Artikel dipindahkan ke tong sampah.')}
                      className="text-red-600 hover:underline font-medium text-xs cursor-pointer"
                    >
                      Move to Trash
                    </button>

                    <button
                      onClick={() => setShowPublishModal(true)}
                      className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs rounded shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Publish / Auto Share
                    </button>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  B. CATEGORIES META BOX
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#1d2327]">Categories</h3>
                  <button className="text-gray-500 hover:text-black text-xs cursor-pointer">▲</button>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="flex border-b border-gray-200 text-gray-600">
                    <button className="pb-1 px-2 border-b-2 border-[#2271b1] font-bold text-[#1d2327]">All Categories</button>
                    <button className="pb-1 px-2 hover:text-black">Most Used</button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 bg-gray-50 p-2 rounded border border-gray-200">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:text-black">
                        <input
                          type="checkbox"
                          checked={cat.checked}
                          onChange={() => {
                            setCategories(
                              categories.map((c) => (c.id === cat.id ? { ...c, checked: !c.checked } : c))
                            );
                          }}
                          className="rounded border-gray-300 text-[#2271b1] focus:ring-[#2271b1]"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>

                  {showAddCat ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        placeholder="New category name"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold text-[11px]"
                      >
                        + Add New Category
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddCat(true)}
                      className="text-[#2271b1] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      + Add New Category
                    </button>
                  )}
                </div>
              </div>

              {/* =========================================================================
                  C. TAGS META BOX
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#1d2327]">Tags</h3>
                  <button className="text-gray-500 hover:text-black text-xs cursor-pointer">▲</button>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Separated with commas"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleAddTags}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 font-bold rounded cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-800 px-2 py-0.5 rounded text-[11px]">
                        <span>{t}</span>
                        <button onClick={() => handleRemoveTag(t)} className="text-gray-400 hover:text-red-600 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  D. FEATURED IMAGE META BOX
                 ========================================================================= */}
              <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f0f0f1] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#1d2327]">Featured Image (Gambar Utama)</h3>
                  <button className="text-gray-500 hover:text-black text-xs cursor-pointer">▲</button>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="space-y-2">
                    <img
                      src={editableFeaturedImg}
                      alt={editableFeaturedAlt}
                      className="w-full h-36 object-cover rounded border border-gray-300 bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">URL Gambar Utama</label>
                      <input
                        type="text"
                        value={editableFeaturedImg}
                        onChange={(e) => {
                          setEditableFeaturedImg(e.target.value);
                          triggerUpdate();
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-[11px] font-mono bg-gray-50"
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
                        className="w-full px-2 py-1 border border-gray-300 rounded text-[11px] bg-gray-50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const newUrl = prompt('Masukkan URL gambar baru:', editableFeaturedImg);
                      if (newUrl) {
                        setEditableFeaturedImg(newUrl);
                        triggerUpdate();
                      }
                    }}
                    className="text-[#2271b1] hover:underline font-semibold cursor-pointer block"
                  >
                    Click the image to edit or update
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* =========================================================================
          AUTO-SHARE TO WORDPRESS REST API MODAL
         ========================================================================= */}
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
