import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// In-memory key tracking for health metrics
interface KeyTracker {
  key: string;
  name: string;
  provider: 'gemini' | 'openrouter';
  model?: string;
  fallbackModels?: string[];
  status: 'active' | 'cooldown' | 'invalid' | 'offline';
  cooldownUntil: number;
  requestCount: number;
  errorCount: number;
  lastUsed?: string;
  latencyMs?: number;
}

let roundRobinIndex = 0;
const keyTrackersMap = new Map<string, KeyTracker>();

interface EnvKeyItem {
  key: string;
  provider: 'gemini' | 'openrouter';
  model?: string;
  fallbackModels?: string[];
}

function getEnvApiKeys(): EnvKeyItem[] {
  const items: EnvKeyItem[] = [];

  // Gemini Keys
  if (process.env.GEMINI_API_KEY) items.push({ key: process.env.GEMINI_API_KEY, provider: 'gemini' });
  if (process.env.GEMINI_API_KEY_1) items.push({ key: process.env.GEMINI_API_KEY_1, provider: 'gemini' });
  if (process.env.GEMINI_API_KEY_2) items.push({ key: process.env.GEMINI_API_KEY_2, provider: 'gemini' });
  if (process.env.GEMINI_API_KEY_3) items.push({ key: process.env.GEMINI_API_KEY_3, provider: 'gemini' });

  Object.keys(process.env).forEach((k) => {
    if (k.startsWith("GEMINI_API_KEY_") && process.env[k]) {
      if (!items.some((i) => i.key === process.env[k])) {
        items.push({ key: process.env[k]!, provider: 'gemini' });
      }
    }
  });

  // OpenRouter Keys
  const openrouterDefaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';
  if (process.env.OPENROUTER_API_KEY) items.push({ key: process.env.OPENROUTER_API_KEY, provider: 'openrouter', model: openrouterDefaultModel });
  if (process.env.OPENROUTER_API_KEY_1) items.push({ key: process.env.OPENROUTER_API_KEY_1, provider: 'openrouter', model: openrouterDefaultModel });
  if (process.env.OPENROUTER_API_KEY_2) items.push({ key: process.env.OPENROUTER_API_KEY_2, provider: 'openrouter', model: openrouterDefaultModel });

  Object.keys(process.env).forEach((k) => {
    if (k.startsWith("OPENROUTER_API_KEY_") && process.env[k]) {
      if (!items.some((i) => i.key === process.env[k])) {
        items.push({ key: process.env[k]!, provider: 'openrouter', model: openrouterDefaultModel });
      }
    }
  });

  return items.filter((i) => Boolean(i.key));
}

function initOrGetKeyTracker(
  key: string,
  label?: string,
  provider: 'gemini' | 'openrouter' = 'gemini',
  model?: string,
  fallbackModels?: string[]
): KeyTracker {
  if (!keyTrackersMap.has(key)) {
    const masked = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "Key";
    const providerTag = provider === 'openrouter' ? 'OpenRouter' : 'Gemini';
    keyTrackersMap.set(key, {
      key,
      name: label || `${providerTag} Key (${masked})`,
      provider,
      model: provider === 'openrouter' ? (model || 'openai/gpt-4o-mini') : undefined,
      fallbackModels: provider === 'openrouter' ? fallbackModels : undefined,
      status: 'active',
      cooldownUntil: 0,
      requestCount: 0,
      errorCount: 0,
    });
  } else {
    const existing = keyTrackersMap.get(key)!;
    existing.provider = provider;
    if (model) existing.model = model;
    if (fallbackModels) existing.fallbackModels = fallbackModels;
  }
  return keyTrackersMap.get(key)!;
}

type CustomKeyInput = string | { key: string; provider?: 'gemini' | 'openrouter'; model?: string; fallbackModels?: string[] };

function getAvailableKeys(customKeys?: CustomKeyInput[]): KeyTracker[] {
  const normalizedCustom: EnvKeyItem[] = [];
  if (Array.isArray(customKeys)) {
    for (const c of customKeys) {
      if (typeof c === 'string' && c.trim()) {
        normalizedCustom.push({ key: c.trim(), provider: 'gemini' });
      } else if (c && typeof c === 'object' && c.key && c.key.trim()) {
        normalizedCustom.push({
          key: c.key.trim(),
          provider: c.provider || 'gemini',
          model: c.model,
          fallbackModels: Array.isArray(c.fallbackModels) ? c.fallbackModels : undefined,
        });
      }
    }
  }

  const envKeys = getEnvApiKeys();
  const combined: EnvKeyItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of [...normalizedCustom, ...envKeys]) {
    if (!seenKeys.has(item.key)) {
      seenKeys.add(item.key);
      combined.push(item);
    }
  }

  const now = Date.now();
  const trackers: KeyTracker[] = [];

  for (let i = 0; i < combined.length; i++) {
    const item = combined[i];
    const tracker = initOrGetKeyTracker(
      item.key,
      `${item.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} Key #${i + 1}`,
      item.provider,
      item.model,
      item.fallbackModels
    );

    if (tracker.status === 'cooldown' && tracker.cooldownUntil <= now) {
      tracker.status = 'active';
    }

    trackers.push(tracker);
  }

  return trackers;
}

// Select next active key via Round Robin
function selectNextActiveKey(trackers: KeyTracker[]): KeyTracker | null {
  const activeTrackers = trackers.filter(t => t.status === 'active');
  if (activeTrackers.length === 0) {
    // Fallback: search for any key whose cooldown is closest to expiring
    const cooldownTrackers = trackers.filter(t => t.status === 'cooldown');
    if (cooldownTrackers.length > 0) {
      cooldownTrackers.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
      return cooldownTrackers[0];
    }
    return null;
  }

  roundRobinIndex = roundRobinIndex % activeTrackers.length;
  const selected = activeTrackers[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % activeTrackers.length;
  return selected;
}

// Post-processing filter to enforce strict PanduanIM style, MDN HTML standard & eradicate remaining AI signatures
function applyPanduanIMHumanizerFilter(html: string): string {
  if (!html) return html;

  let cleaned = html;

  // 0. Remove markdown code fences if AI inadvertently wrapped the output
  cleaned = cleaned.replace(/^```html\s*/gi, "");
  cleaned = cleaned.replace(/^```\s*/gi, "");
  cleaned = cleaned.replace(/\s*```$/gi, "");

  // 1. Remove all Em dashes (—) and En dashes (–) which trigger AI detectors
  cleaned = cleaned.replace(/—/g, ", ");
  cleaned = cleaned.replace(/–/g, ", ");
  cleaned = cleaned.replace(/\s+--\s+/g, ", ");

  // 2. Normalize capitalization of "anda" / "Anda" per standard Indonesian grammar rules:
  // Capital "Anda" at start of sentences, clauses, headings, or after punctuation; lowercase "anda" in the middle of sentences.
  cleaned = cleaned.replace(/([\.\?\!\>\:\;]\s*)anda\b/g, "$1Anda");
  cleaned = cleaned.replace(/([a-z\d\,]\s+)Anda\b/g, "$1anda");

  // 3. Eradicate forbidden robotic AI transitional phrases
  cleaned = cleaned.replace(/Lebih dari sekadar\s*/gi, "");
  cleaned = cleaned.replace(/Bukan lagi sekadar\s*/gi, "");
  cleaned = cleaned.replace(/bukan sekadar\s*/gi, "");
  cleaned = cleaned.replace(/Di era digital saat ini,?\s*/gi, "");
  cleaned = cleaned.replace(/Di era digital,?\s*/gi, "");
  cleaned = cleaned.replace(/Dalam dunia yang terus berkembang,?\s*/gi, "");
  cleaned = cleaned.replace(/Di sinilah ([^<]+) hadir/gi, "$1 menjadi solusinya");

  // Replace robotic transitions with PanduanIM style natural connectors
  cleaned = cleaned.replace(/<p>Selain itu,/gi, "<p>Nah, bukan cuma itu.");
  cleaned = cleaned.replace(/Selain itu,/gi, "Nah,");
  cleaned = cleaned.replace(/Oleh karena itu,/gi, "Makanya,");
  cleaned = cleaned.replace(/Di samping itu,/gi, "Lalu,");
  cleaned = cleaned.replace(/Dengan demikian,/gi, "Artinya,");
  cleaned = cleaned.replace(/Penting untuk diingat bahwa/gi, "Ingat:");
  cleaned = cleaned.replace(/Dapat disimpulkan bahwa/gi, "Singkatnya,");
  cleaned = cleaned.replace(/Sebagai kesimpulan,?/gi, "Langkah selanjutnya:");
  cleaned = cleaned.replace(/Pada akhirnya,/gi, "Pada kenyataannya,");
  cleaned = cleaned.replace(/Sering kali timbul pertanyaan,?/gi, "Pertanyaannya:");
  cleaned = cleaned.replace(/Tak kalah penting,?/gi, "Satu hal lagi:");

  // 4. Convert any accidental Markdown formatting (**bold**, *italic*) to clean HTML inside HTML text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // 5. Clean deprecated non-semantic HTML tags (MDN Reference Standard compliance)
  cleaned = cleaned.replace(/<center>/gi, '<div style="text-align: center;">');
  cleaned = cleaned.replace(/<\/center>/gi, '</div>');
  cleaned = cleaned.replace(/<font[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/font>/gi, '');
  cleaned = cleaned.replace(/<marquee[^>]*>([\s\S]*?)<\/marquee>/gi, '$1');

  // 6. Remove unnatural sequential numbers prefixing <h2> headings (e.g. <h2>1. Judul</h2> -> <h2>Judul</h2>)
  cleaned = cleaned.replace(/<h2([^>]*)>\s*\d+[\.\)\:]\s*/gi, '<h2$1>');

  // 7A. MDN HTML List Compliance: Convert <ul> blocks containing sequential manual numbers (1., 2., 3.) to <ol>
  cleaned = cleaned.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
    if (/<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*\s*1[\.\)\:]/i.test(inner)) {
      return `<ol${attrs}>${inner}</ol>`;
    }
    return match;
  });

  // 7B. MDN HTML List Compliance: Strip manual number/bullet prefixes inside ALL <li> elements (handles nested <strong>/<b>/<em>/<span>)
  // Run 2 passes to clean double wrappers or nested artifacts
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(/(<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*)\s*(?:\d+[\.\)\:]|•|\-|\*|\#)\s*/gi, "$1");
  }

  // 7C. Clean whitespace artifacts before punctuation (e.g. "Sangrai Kopi , Memahami" -> "Sangrai Kopi, Memahami")
  cleaned = cleaned.replace(/(\w|\>)\s+([,\.\:\;\?\!])(\s|\<|\w)/g, "$1$2$3");

  // 8. Ensure <img> tags have semantic accessibility attributes (alt, loading="lazy", decoding="async")
  cleaned = cleaned.replace(/<img\s+([^>]*src=["'][^"']+["'][^>]*)>/gi, (match) => {
    let imgTag = match;
    if (!/alt=/i.test(imgTag)) {
      imgTag = imgTag.replace('<img ', '<img alt="Ilustrasi PanduanIM" ');
    }
    if (!/loading=/i.test(imgTag)) {
      imgTag = imgTag.replace('<img ', '<img loading="lazy" ');
    }
    if (!/decoding=/i.test(imgTag)) {
      imgTag = imgTag.replace('<img ', '<img decoding="async" ');
    }
    return imgTag;
  });

  // 9. Ensure external <a> links have security rel="noopener noreferrer"
  cleaned = cleaned.replace(/<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi, (match) => {
    if (!/rel=/i.test(match)) {
      return match.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
    }
    return match;
  });

  // 10. Clean empty HTML tags
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<h2>\s*<\/h2>/gi, '');
  cleaned = cleaned.replace(/<h3>\s*<\/h3>/gi, '');
  cleaned = cleaned.replace(/<ul>\s*<\/ul>/gi, '');

  return cleaned;
}

// Automated Audit Function checking article against PanduanIM writing standards, MDN HTML standard & Google Helpful Content (E-E-A-T)
function auditPanduanIMStyle(html: string, wordCount: number, title: string, keyword: string) {
  const checks: Array<{
    id: string;
    label: string;
    category: 'Validasi HTML (MDN)' | 'POV & Style' | 'Kedalaman & E-E-A-T' | 'Anti-AI Burstiness' | 'Struktur & SEO';
    passed: boolean;
    detail: string;
  }> = [];

  const lowerHtml = html.toLowerCase();

  // 1. MDN HTML Elements & Semantic Validation Audit (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)
  const containsDeprecatedTags = /<(center|font|marquee|dir|strike)\b/i.test(html);
  const containsRawMarkdown = /```|\*\*|##/.test(html);
  const hasManualListNumbering = /<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*\s*(?:\d+[\.\)\:]|•|\-|\*)\s*/i.test(html);
  const isMdnHtmlValid = !containsDeprecatedTags && !containsRawMarkdown && !hasManualListNumbering;

  checks.push({
    id: 'mdn_html_validity',
    label: 'Validasi Elemen HTML Semantik (MDN HTML Standard)',
    category: 'Validasi HTML (MDN)',
    passed: isMdnHtmlValid,
    detail: isMdnHtmlValid
      ? '100% Bebas tag usang/non-standar, steril dari markdown tersisa & penomoran ganda, serta sesuai standar elemen semantik MDN Web Docs.'
      : 'Terdeteksi elemen HTML non-standar, sisa sintaks markdown, atau penomoran manual ganda di dalam tag <li>.'
  });

  checks.push({
    id: 'mdn_list_semantics',
    label: 'Semantik Elemen Daftar HTML MDN (Steril dari Bullet/Number Stacking)',
    category: 'Validasi HTML (MDN)',
    passed: !hasManualListNumbering,
    detail: !hasManualListNumbering
      ? '100% Bebas dari penomoran manual ganda (seperti "1." atau "•") di dalam tag <li>. Mematuhi standar semantik MDN HTML.'
      : 'Terdeteksi penomoran manual ("1.", "•") di dalam tag <li> yang menyebabkan tumpang tindih penanda daftar (bullet/number stacking) sesuai standar MDN HTML.'
  });

  // 2. Check Practitioner POV ("saya", "anda", "kita")
  const hasPractitionerPOV = /\b(saya|anda|kita)\b/i.test(html);
  checks.push({
    id: 'pov',
    label: 'Point of View (POV) Praktisi PanduanIM ("saya" & "anda")',
    category: 'POV & Style',
    passed: hasPractitionerPOV,
    detail: hasPractitionerPOV 
      ? 'Menggunakan kata sapaan langsung ("saya", "anda", "kita") khas mentor/praktisi PanduanIM.' 
      : 'Belum terdeteksi kata sapaan langsung praktisi ("saya"/"anda").'
  });

  // 3. Check Absence of Em-dashes and En-dashes
  const hasEmDashes = /[—–]|--/.test(html);
  checks.push({
    id: 'em_dash',
    label: 'Steril dari Em-Dash & Ciri Khas AI',
    category: 'Anti-AI Burstiness',
    passed: !hasEmDashes,
    detail: !hasEmDashes 
      ? '100% bebas dari em-dash (—) dan simbol penghubung ala AI.' 
      : 'Terdeteksi simbol em-dash yang berpotensi memicu detektor AI.'
  });

  // 4. Check Absence of Robotic AI Connectors
  const roboticPhrases = ['lebih dari sekadar', 'di era digital', 'dalam dunia yang terus berkembang', 'di sinilah', 'sebagaimana telah dijelaskan', 'oleh karena itu', 'dengan demikian'];
  const foundRobotic = roboticPhrases.filter(p => lowerHtml.includes(p));
  checks.push({
    id: 'robotic_phrases',
    label: 'Bebas Kosa Kata & Kalimat Klise AI',
    category: 'Anti-AI Burstiness',
    passed: foundRobotic.length === 0,
    detail: foundRobotic.length === 0
      ? 'Tidak ditemukan frasa transisi kaku ala AI.'
      : `Ditemukan frasa klise AI: "${foundRobotic.join(', ')}".`
  });

  // 5. Check Depth & Word Count ("Tuntas & Padat" - 1000+ words, ideally 1200-1500+)
  const isDeepContent = wordCount >= 1000;
  checks.push({
    id: 'content_depth',
    label: 'Kedalaman Artikel (Tuntas & Padat 1000+ Kata)',
    category: 'Kedalaman & E-E-A-T',
    passed: isDeepContent,
    detail: isDeepContent
      ? `Panjang artikel mencapai ${wordCount} kata (Syarat Tuntas & Padat PanduanIM: >= 1000 kata).`
      : `Panjang artikel (${wordCount} kata) masih di bawah standar Tuntas & Padat PanduanIM (1000+ kata).`
  });

  // 6. Check Structure: Step-by-Step / Mindset Shifts ("Lupakan X")
  const hasStepByStep = /langkah|step|cara|panduan|1\.|2\.|3\.|<ul|lupakan/i.test(html);
  checks.push({
    id: 'step_by_step',
    label: 'Instruksi Eksekusi & Mindset Shift ("Lupakan X")',
    category: 'Struktur & SEO',
    passed: hasStepByStep,
    detail: hasStepByStep
      ? 'Memuat alur eksekusi atau pola perubahan mindset ("Lupakan X") yang jelas.'
      : 'Belum memuat instruksi eksekusi langkah demi langkah.'
  });

  // 7. Check Real-world Scenarios / Grounded Analogies ("Contoh", "Bayangkan", "Ibarat")
  const hasRealScenario = /contoh|bayangkan|skenario|misalkan|studi kasus|ibarat|budi|rina/i.test(html);
  checks.push({
    id: 'real_scenario',
    label: 'Analogi Membumi & Skenario Riil Lapangan',
    category: 'Kedalaman & E-E-A-T',
    passed: hasRealScenario,
    detail: hasRealScenario
      ? 'Dilengkapi analogi budaya membumi atau skenario nyata (tokoh fiktif/studi kasus).'
      : 'Belum memuat contoh skenario riil lapangan.'
  });

  // 8. Check Short Paragraph Burstiness & Rhythm
  const pMatches = html.match(/<p>([\s\S]*?)<\/p>/gi) || [];
  let longPCount = 0;
  pMatches.forEach(p => {
    const text = p.replace(/<[^>]+>/g, '').trim();
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 3) longPCount++;
  });
  const isBurstRhythm = longPCount <= 2;
  checks.push({
    id: 'burst_rhythm',
    label: 'Ritme Paragraf Ultra-Pendek (1-2 Kalimat)',
    category: 'Anti-AI Burstiness',
    passed: isBurstRhythm,
    detail: isBurstRhythm
      ? 'Paragraf disusun ringkas (1-2 kalimat) untuk kenyamanan membaca di HP & desktop.'
      : `Ditemukan ${longPCount} paragraf panjang (> 3 kalimat) yang perlu dipotong.`
  });

  // 9. Check No "Kesimpulan" Title
  const hasKesimpulanTitle = /<h[23][^>]*>\s*(kesimpulan|conclusion|ringkasan)\s*<\/h[23]>/i.test(html);
  checks.push({
    id: 'no_kesimpulan_title',
    label: 'Penutup Berorientasi Aksi (Tanpa Judul "Kesimpulan")',
    category: 'Struktur & SEO',
    passed: !hasKesimpulanTitle,
    detail: !hasKesimpulanTitle
      ? 'Penutup berupa rencana aksi nyata (Action Plan) tanpa judul kaku "Kesimpulan".'
      : 'Terdeteksi judul "Kesimpulan" kaku. Disarankan diganti judul berorientasi aksi.'
  });

  // 10. Check FAQ Section
  const hasFAQ = /faq|pertanyaan|sering ditanyakan|h3/i.test(html) && /<h[23][^>]*>[\s\S]*?(faq|pertanyaan)/i.test(html);
  checks.push({
    id: 'faq_section',
    label: 'Seksi FAQ Praktisi (Tuntas Menjawab Pertanyaan)',
    category: 'Kedalaman & E-E-A-T',
    passed: hasFAQ,
    detail: hasFAQ
      ? 'Dilengkapi seksi FAQ praktisi untuk meng-cover search intent pengguna.'
      : 'Belum memuat seksi FAQ praktisi.'
  });

  // 11. Check Bolding & Italics Usage for Visual Scannability
  const hasFormatting = /<strong>/.test(html) && (/<em>/.test(html) || /<i>/.test(html));
  checks.push({
    id: 'formatting_scannability',
    label: 'Visual Scannability (Penekanan Cetak Tebal & Miring)',
    category: 'POV & Style',
    passed: hasFormatting,
    detail: hasFormatting
      ? 'Memuat penekanan cetak tebal & miring pada poin penting untuk pemindaian cepat.'
      : 'Penekanan visual (bold/italic) masih minim.'
  });

  // 12. Check Explicit Closing Section (Summary & CTA Wajib Setelah FAQ)
  const faqIdx = html.search(/<h[23][^>]*>[\s\S]*?(faq|pertanyaan)/i);
  let hasClosingAfterFaq = true;
  if (faqIdx !== -1) {
    const afterFaqContent = html.substring(faqIdx);
    hasClosingAfterFaq = /langkah|aksi|sekarang|checklist|mulai|eksekusi|selanjutnya|siap|coba|ringkasan|hubungi/i.test(afterFaqContent);
  }
  checks.push({
    id: 'closing_after_faq',
    label: 'Penutup Eksplisit (Ringkasan & CTA Wajib Setelah FAQ)',
    category: 'Struktur & SEO',
    passed: hasClosingAfterFaq,
    detail: hasClosingAfterFaq
      ? 'Memuat ringkasan & CTA eksplisit yang menutup artikel secara utuh setelah seksi FAQ.'
      : 'Artikel terhenti di jawaban FAQ terakhir tanpa ringkasan & CTA penutup yang jelas.'
  });

  // 13. Check Rhetorical Questions in Main Body (excluding FAQ titles)
  let bodyTextWithoutFaq = html;
  if (faqIdx !== -1) {
    bodyTextWithoutFaq = html.substring(0, faqIdx);
  }
  const bodyQuestionMatches = bodyTextWithoutFaq.match(/<p>[\s\S]*?\?[\s\S]*?<\/p>/gi) || [];
  const hasRhetoricalQuestionsInBody = bodyQuestionMatches.length >= 2;
  checks.push({
    id: 'rhetorical_questions_body',
    label: 'Pertanyaan Retoris Jembatan Paragraf (Min. 2 di Isi Utama)',
    category: 'Anti-AI Burstiness',
    passed: hasRhetoricalQuestionsInBody,
    detail: hasRhetoricalQuestionsInBody
      ? `Terdeteksi ${bodyQuestionMatches.length} pertanyaan retoris sebagai jembatan paragraf di isi utama.`
      : 'Pertanyaan retoris di isi utama masih kurang (minimal 2 sebagai jembatan antar-paragraf).'
  });

  // 14. Check FAQ Paragraph Length Compliance (Short paragraphs in FAQ answers)
  let faqParagraphsCompliant = true;
  if (faqIdx !== -1) {
    const faqSectionHtml = html.substring(faqIdx);
    const faqPMatches = faqSectionHtml.match(/<p>([\s\S]*?)<\/p>/gi) || [];
    faqPMatches.forEach(p => {
      const text = p.replace(/<[^>]+>/g, '').trim();
      const wordCountP = text.split(/\s+/).filter(Boolean).length;
      if (wordCountP > 60) {
        faqParagraphsCompliant = false;
      }
    });
  }
  checks.push({
    id: 'faq_paragraph_length',
    label: 'Kepatuhan Paragraf Pendek Section FAQ (Maks ~60 Kata/Paragraf)',
    category: 'Anti-AI Burstiness',
    passed: faqParagraphsCompliant,
    detail: faqParagraphsCompliant
      ? 'Jawaban FAQ terpecah dengan baik menjadi paragraf-paragraf pendek dan tidak padat.'
      : 'Terdeteksi jawaban FAQ berupa blok teks padat (> 60 kata dalam 1 paragraf).'
  });

  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    score,
    passedCount,
    totalCount: checks.length,
    checks,
  };
}

// Load Humanizer Rules from SKILL.md
function loadHumanizerSkillContent(): string {
  try {
    const skillPath = path.join(process.cwd(), "humanizer", "SKILL.md");
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, "utf-8");
    }
  } catch (err) {
    console.error("Error reading humanizer SKILL.md:", err);
  }
  return "Write naturally in human prose. Avoid AI jargon, repetitive sentence structures, and cliché robotic openings.";
}

// Read version info
function loadHumanizerVersionInfo() {
  try {
    const versionPath = path.join(process.cwd(), "humanizer", "version.json");
    if (fs.existsSync(versionPath)) {
      return JSON.parse(fs.readFileSync(versionPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading version.json:", err);
  }
  return { version: "2.9.1", lastChecked: new Date().toISOString(), commitSha: "523374d", repo: "blader/humanizer" };
}

// --- API ENDPOINTS ---

// API Health & Summary
app.get("/api/health", (req, res) => {
  const envKeys = getEnvApiKeys();
  const allTrackers = Array.from(keyTrackersMap.values());
  const activeCount = allTrackers.filter(t => t.status === 'active').length;
  const cooldownCount = allTrackers.filter(t => t.status === 'cooldown').length;
  const invalidCount = allTrackers.filter(t => t.status === 'invalid').length;

  res.json({
    status: "ok",
    envKeysConfigured: envKeys.length,
    totalTrackedKeys: allTrackers.length,
    activeKeys: activeCount,
    cooldownKeys: cooldownCount,
    invalidKeys: invalidCount,
    roundRobinIndex,
    humanizerVersion: loadHumanizerVersionInfo()
  });
});

// Test API Key
app.post("/api/test-key", async (req, res) => {
  const { apiKey, provider = 'gemini', model } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ status: "invalid", message: "API key is required" });
  }

  const cleanKey = apiKey.trim();
  const targetProvider: 'gemini' | 'openrouter' = provider === 'openrouter' ? 'openrouter' : 'gemini';
  const targetModel = model || (targetProvider === 'openrouter' ? 'openai/gpt-4o-mini' : undefined);
  const startTime = Date.now();

  try {
    if (targetProvider === 'openrouter') {
      const openRouterRes = await fetch("https://openrouter.ai/api/v1/key", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "HTTP-Referer": "https://aistudio.build",
          "X-Title": "AI Human Article Generator",
        },
      });

      const latencyMs = Date.now() - startTime;
      const tracker = initOrGetKeyTracker(cleanKey, undefined, 'openrouter', targetModel);
      tracker.latencyMs = latencyMs;
      tracker.lastUsed = new Date().toISOString();

      if (openRouterRes.ok) {
        tracker.status = 'active';
        return res.json({
          status: "active",
          message: `OpenRouter API Key valid & active (Model: ${targetModel})`,
          latencyMs,
          responseSample: "OK",
        });
      } else if (openRouterRes.status === 401) {
        tracker.status = 'invalid';
        return res.status(401).json({ status: "invalid", message: "Invalid OpenRouter API Key (401 Unauthorized)", latencyMs });
      } else if (openRouterRes.status === 429) {
        tracker.status = 'cooldown';
        tracker.cooldownUntil = Date.now() + 60000;
        return res.status(429).json({ status: "cooldown", message: "OpenRouter Quota Exceeded (429 Cooldown)", latencyMs });
      } else {
        tracker.status = 'offline';
        return res.status(500).json({ status: "offline", message: `OpenRouter error status ${openRouterRes.status}`, latencyMs });
      }
    } else {
      const ai = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: "Reply with the word 'OK' to confirm API status.",
      });

      const latencyMs = Date.now() - startTime;
      const tracker = initOrGetKeyTracker(cleanKey, undefined, 'gemini');
      tracker.status = 'active';
      tracker.latencyMs = latencyMs;
      tracker.lastUsed = new Date().toISOString();

      return res.json({
        status: "active",
        message: "Gemini API Key valid and active",
        latencyMs,
        responseSample: response.text ? response.text.trim() : "OK"
      });
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = error?.message || String(error);
    const is401 = errMsg.includes("401") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("invalid api key");
    const is429 = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("resource exhausted");

    const tracker = initOrGetKeyTracker(cleanKey, undefined, targetProvider, targetModel);
    tracker.errorCount += 1;
    tracker.latencyMs = latencyMs;

    if (is401) {
      tracker.status = 'invalid';
      return res.status(401).json({ status: "invalid", message: "Invalid API Key (401 Unauthorized)", latencyMs });
    } else if (is429) {
      tracker.status = 'cooldown';
      tracker.cooldownUntil = Date.now() + 60000;
      return res.status(429).json({ status: "cooldown", message: "Quota exceeded (429 Cooldown 60s)", latencyMs });
    }

    tracker.status = 'offline';
    return res.status(500).json({ status: "offline", message: `API Key test failed: ${errMsg}`, latencyMs });
  }
});

// Check GitHub Humanizer update
app.get("/api/github-check", async (req, res) => {
  try {
    const currentVersion = loadHumanizerVersionInfo();
    // Fetch latest commit from github repository blader/humanizer
    const githubRes = await fetch("https://api.github.com/repos/blader/humanizer/commits/main", {
      headers: {
        "User-Agent": "AI-Human-Article-Generator",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (githubRes.ok) {
      const githubData = await githubRes.json();
      const latestSha = githubData.sha ? githubData.sha.substring(0, 12) : currentVersion.commitSha;
      const hasUpdate = latestSha !== currentVersion.commitSha;

      return res.json({
        hasUpdate,
        currentVersion: currentVersion.version,
        currentSha: currentVersion.commitSha,
        latestSha,
        lastChecked: new Date().toISOString(),
        repo: "blader/humanizer"
      });
    }

    // If GitHub API rate limits or offline, return current cache as valid
    return res.json({
      hasUpdate: false,
      currentVersion: currentVersion.version,
      currentSha: currentVersion.commitSha,
      latestSha: currentVersion.commitSha,
      lastChecked: new Date().toISOString(),
      note: "GitHub status checked (cached/mocked)"
    });
  } catch (err: any) {
    const currentVersion = loadHumanizerVersionInfo();
    return res.json({
      hasUpdate: false,
      currentVersion: currentVersion.version,
      currentSha: currentVersion.commitSha,
      latestSha: currentVersion.commitSha,
      lastChecked: new Date().toISOString(),
      error: err?.message
    });
  }
});

// Update Humanizer Rules from GitHub
app.post("/api/update-humanizer", async (req, res) => {
  try {
    // Attempt fetch raw SKILL.md from blader/humanizer main branch
    const rawRes = await fetch("https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md", {
      headers: { "User-Agent": "AI-Human-Article-Generator" }
    });

    let newContent = "";
    if (rawRes.ok) {
      newContent = await rawRes.text();
    }

    let parsedVersion = "2.9.1";
    if (newContent) {
      // Try to match version in table or metadata e.g. "version | 2.9.1" or "version: 2.9.1"
      const vMatch = newContent.match(/version\s*[:|]\s*["']?v?([0-9]+\.[0-9]+\.[0-9]+)/i) || newContent.match(/v([0-9]+\.[0-9]+\.[0-9]+)/i);
      if (vMatch && vMatch[1]) {
        parsedVersion = vMatch[1];
      }
    }

    let newSha = "523374d";
    try {
      const commitRes = await fetch("https://api.github.com/repos/blader/humanizer/commits/main", {
        headers: {
          "User-Agent": "AI-Human-Article-Generator",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        if (commitData.sha) {
          newSha = commitData.sha.substring(0, 10);
        }
        const msgMatch = commitData.commit?.message?.match(/v([0-9]+\.[0-9]+\.[0-9]+)/i);
        if (msgMatch && msgMatch[1]) {
          parsedVersion = msgMatch[1];
        }
      }
    } catch (e) {
      console.warn("Error fetching commit metadata:", e);
    }

    const updatedVersionObj = {
      version: parsedVersion,
      lastChecked: new Date().toISOString(),
      commitSha: newSha,
      repo: "blader/humanizer"
    };

    // Save local files
    const skillPath = path.join(process.cwd(), "humanizer", "SKILL.md");
    const versionPath = path.join(process.cwd(), "humanizer", "version.json");

    if (newContent && newContent.length > 50) {
      fs.writeFileSync(skillPath, newContent, "utf-8");
    }
    fs.writeFileSync(versionPath, JSON.stringify(updatedVersionObj, null, 2), "utf-8");

    return res.json({
      success: true,
      message: `Humanizer Engine updated successfully to v${parsedVersion} (SHA: ${newSha}) from blader/humanizer!`,
      version: updatedVersionObj.version,
      commitSha: newSha,
      lastChecked: updatedVersionObj.lastChecked
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to update Humanizer Engine: ${err?.message}`
    });
  }
});

// MAIN ARTICLE GENERATION ENDPOINT WITH ROUND ROBIN & RETRY
app.post("/api/generate", async (req, res) => {
  const { keyword, style, referenceInfo, imageLinks, internalLinks, customApiKeys } = req.body;

  if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
    return res.status(400).json({ error: "Fokus Keyword wajib diisi." });
  }

  const allKeyTrackers = getAvailableKeys(customApiKeys);

  if (allKeyTrackers.length === 0) {
    return res.status(400).json({
      error: "API Key belum dimasukkan. Silakan masukkan minimal 1 API Key (Gemini atau OpenRouter) di menu Pengaturan (Settings) agar dapat melakukan generate artikel."
    });
  }

  const humanizerRules = loadHumanizerSkillContent();

  // Format images & internal links instructions
  let imageInstructions = "";
  if (Array.isArray(imageLinks) && imageLinks.length > 0) {
    const cleanedLinks = imageLinks.filter(l => l && l.trim().startsWith("http"));
    if (cleanedLinks.length > 0) {
      imageInstructions = `
\n[IMAGE EMBEDDING & ALT TEXT DIRECTIVE]:
The user provided custom image URLs:
${cleanedLinks.map((url, idx) => `Image ${idx + 1}: ${url.trim()}`).join("\n")}
1. Set "featuredImageUrl" to the first image URL: "${cleanedLinks[0]}".
2. Create a compelling, descriptive, SEO-optimized ALT text for "featuredImageAlt" incorporating "${keyword.trim()}".
3. Insert these custom images into relevant H2 sections as clean HTML <img src="URL" alt="Descriptive SEO alt text related to '${keyword.trim()}'" class="article-image my-6 rounded-xl w-full object-cover max-h-[450px]" /> inside "articleHtml".
`;
    }
  }

  if (!imageInstructions) {
    imageInstructions = `
\n[UNSPLASH FEATURED & CONTENT IMAGE DIRECTIVE]:
The user did NOT provide custom image URLs. You MUST auto-generate image URLs from Unsplash (https://unsplash.com):
1. Select/generate a high-quality Unsplash photo URL for "featuredImageUrl" (e.g. "https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80" or relevant Unsplash photo URL for '${keyword.trim()}').
2. Write a highly descriptive, natural, SEO-optimized ALT text for "featuredImageAlt" that describes what is shown in the photo and naturally includes '${keyword.trim()}'.
3. Inside "articleHtml", embed the featured image or 1-2 relevant Unsplash images into the content using clean HTML <img src="..." alt="Descriptive ALT text with target keyword" class="article-image my-6 rounded-xl w-full object-cover max-h-[450px]" />.
`;
  }

  let internalLinkInstructions = "";
  if (Array.isArray(internalLinks) && internalLinks.length > 0) {
    const validLinks = internalLinks.filter(l => l.anchorText && l.url);
    if (validLinks.length > 0) {
      internalLinkInstructions = `
\n[INTERNAL LINKING DIRECTIVE]:
Seamlessly integrate these internal links into paragraph context using the specified anchor text. Use pure HTML <a href="URL" class="text-pink-600 underline font-medium hover:text-pink-700">${keyword} anchor</a>:
${validLinks.map(l => `- Anchor Text: "${l.anchorText.trim()}" -> URL: ${l.url.trim()}`).join("\n")}
`;
    }
  }
  // Build full system and user prompt
  const systemPrompt = `You are "PIM-Writer", the master writing engine that 100% replicates the signature writing style, structure, and tone of PanduanIM.com (Darmawan)—Indonesia's premier internet marketing and SEO masterclass blog.

[HUMANIZER RULES & STYLE GUIDE]:
${humanizerRules}

[PANDUANIM (DARMAWAN STYLE) - COMPLETE ENGINE BLUEPRINT]:

1. PERSONA & PRONOUNS:
   - Write as an experienced, direct, blak-blakan practitioner/mentor—NOT a neutral encyclopedia or textbook.
   - Author POV: Use "saya" for first-person.
   - Reader Address: Address the reader as "anda". Follow standard capitalization rules: write "Anda" with CAPITAL A if it is the FIRST word in a sentence or heading, but use lowercase "anda" when it is in the MIDDLE of a sentence (e.g., "...pada kayu FJL. Anda bisa..." vs "...cara agar bisnis anda..."). NEVER use "kamu", "lo/gue", or informal slang.
   - Tone: Confident, bold, slightly provocative at the start, yet warm and step-by-step guiding.

2. MANDATORY MACRO-STRUCTURE:
   a) **HOOK PEMBUKA** (1 short paragraph, 1-3 sentences):
      - MUST choose naturally from 1 of 5 hook variants (Do NOT default to #1):
        1. Klaim berani ("Saya akan katakan secara terang-terangan: [X].")
        2. Mitos vs fakta ("Kata orang, [X] itu [mitos].")
        3. Pertanyaan retoris ("[Pertanyaan besar yang jadi keresahan pembaca]?")
        4. Angka mengejutkan ("[Statistik] — tapi [twist].") [ONLY if valid data available]
        5. Kontras dulu/sekarang ("Dulu [kondisi lama]. Sekarang [kondisi baru].")
      - NEVER start with dictionary definitions or AI clichés ("Di era digital...", "Saat ini...", "Lebih dari sekadar...").
   b) **AGITASI MASALAH** (2-4 short idea groups, <= 10-12 short paragraphs total before H2 #1):
      - Highlight the gap between expectations vs reality.
      - End with a standalone 1-word or 1-phrase paragraph for dramatic pause ("Gagal.", "Sia-sia.", "Ternyata tidak.", "Nol besar.").
   c) **JANJI / PREVIEW SOLUSI** (1-2 paragraphs):
      - Introduce the solution framework clearly. If part of a series, show roadmap with 1-2 sentence summaries per chapter ("1. [Judul Bab] — [Ringkasan 1-2 kalimat]").
   d) **ISI UTAMA** (4-5 core strategic H2 sections):
      - H2 Headings: Organic, descriptive, non-numbered H2 titles (e.g., "<h2>Mengapa Strategi [Topik] Anda Selalu Stagnan</h2>", "<h2>Prinsip Utama yang Wajib Anda Kuasai</h2>"). NEVER prefix H2s with numbers like "1.", "2."!
      - Concept Explanations: Always use the "mitos-dulu-baru-fakta" pattern (explain common misconception first, then the true reality).
      - BLOCKQUOTE DEFINITIONS: MANDATORY to define key concepts inside a blockquote:
        <blockquote><strong>[Istilah]</strong> adalah [definisi singkat, 1-2 kalimat].</blockquote>
      - MINI-STORY / ANALOGY: MANDATORY to include at least 1 mini-story or analogy featuring fictional characters like "Budi" or "Rina" to illustrate a real-world user scenario.
      - LIST TYPES: Use numbered lists (<ol><li>) for sequential steps, execution checklists, decision stages, and process workflows where sequence matters. Use bullet lists (<ul><li>) ONLY for non-sequential options or categories.
      - Section Summary: Close each H2 section with 1 short wrap-up sentence before moving to the next section.
   e) **SEKSI FAQ PRAKTISI & ATURAN PARAGRAF FAQ**:
      - Include 3-4 real practitioner FAQ items answered with deep, practical expertise.
      - FAQ PARAGRAF PENDEK (MANDATORY): Section FAQ MUST strictly obey ultra-short paragraph rules! NEVER answer a FAQ question in 1 dense block paragraph (> 60 words). Break every FAQ answer into 2-3 ultra-short paragraphs (max 3-4 lines / ~20 words per line) or bullet lists.
   f) **RINGKASAN & PENUTUP (WAJIB ADA & MANDATORY AFTER FAQ)**:
      - This closing section MUST appear at the very end of the article, AFTER the FAQ section! FAQ is NOT a replacement for the conclusion — always add a summary + CTA AFTER the FAQ section. Never let the article end abruptly on a FAQ answer.
      - Start with reader validation ("Sekarang Anda sudah paham...").
      - Summarize key takeaways in 1-2 short sentences.
      - Provide a concrete Call to Action titled "Langkah Konkret yang Harus Anda Ambil Hari Ini" or "Checklist Eksekusi Anda".
      - NO "Kesimpulan" or "Conclusion" title!

3. MIKRO-GAYA & ANTI-AI RHYTHM:
   - Paragraph length: ULTRA-SHORT (1-2 sentences per paragraph, max 3-4 lines / ~20 words per line). NO dense text blocks!
   - Non-rigid EYD: Do not be rigidly academic with formal grammar rules (EYD). Prioritize natural flow and "enak dibaca".
   - Standalone punchy paragraphs: Use 1-word or 1-phrase paragraphs for dramatic emphasis ("Gagal.", "Simpel kan?", "5x lipat!", "Ternyata tidak.").
   - Dramatic ellipsis "…": Connect thoughts across paragraphs ("Tapi…", "Ternyata…", "Nah…", "Masih ada lagi…", "Begini maksudnya…").
   - Rhetorical questions: MANDATORY to include at least 2-3 rhetorical questions inside the MAIN BODY TEXT as paragraph connectors ("Kenapa bisa begitu?", "Masuk akal?", "Lalu apa solusinya?"). FAQ question titles DO NOT count towards this quota!
   - Conditional sentences: "Kalau anda [situasi], maka anda [aksi/hasil]."
   - Occasional CAPITALIZATION for emphasis ("Bukan begitu, yang benar adalah SEBALIKNYA.").
   - Use <strong>teks tebal</strong> for key terms & emotional emphasis.
   - Use <em>kata miring</em> for foreign or technical terms at first mention.
   - ABSOLUTELY NO em-dashes (—) or en-dashes (–).
   - ABSOLUTELY NO robotic connectors ("Pertama-tama,", "Selain itu,", "Oleh karena itu,", "Dengan demikian,").

4. ADVANCED TECHNIQUES & VERIFIED TECHNICAL DATA:
   - **Inverted Pyramid**: Put the most crucial insight/benefit/takeaway at the very start of a section/paragraph, not buried at the end.
   - **Mindset Shift "Lupakan X"**: Tell readers to unlearn/doubt the flawed old way before introducing the new framework ("Lupakan [cara lama] dulu."). This opening can be labeled "0." before step "1.".
   - **Dissect Bad Examples**: Analyze concrete bad/flawed examples point-by-point to show why they fail.
   - **Grounded Everyday Analogies**: Use familiar Indonesian everyday analogies (food like nasi goreng, daily habits) rather than technical jargon.
   - **Meta-Commentary & Empathetic Questions**: "Coba bayangkan, apa yang anda rasakan kalau [skenario]?", "Gara-gara [sebab], banyak orang jadi [akibat]."
   - **VERIFIED TECHNICAL DATA ONLY**: Absolute prohibition against fabricating unverified technical numbers, precise percentages (e.g. moisture 10%-14%), exact dimensions, exact durations, or exact material ages without verification. Use qualitative ranges if uncertain!

[FORMATTING & OUTPUT DIRECTIVE]:
- You MUST output a valid JSON object matching this exact structure:
{
  "title": "Judul Utama Artikel yang Menarik, Padat & Natural (Gaya PanduanIM)",
  "slug": "slug-url-artikel-yang-seo-friendly",
  "metaTitle": "Meta Title SEO (Panjang 50-60 karakter, memikat & mengandung focus keyword)",
  "metaDescription": "Meta Description SEO (Panjang 120-155 karakter, ajakan membaca & rangkuman bernilai)",
  "focusKeyword": "Focus Keyword Target Utama",
  "featuredImageUrl": "URL Gambar Utama (Dari Unsplash atau input pengguna)",
  "featuredImageAlt": "Teks ALT Gambar Utama yang deskriptif & SEO friendly",
  "articleHtml": "Konten lengkap artikel dalam format HTML semantic murni"
}
- Do NOT output markdown fences like \`\`\`json or \`\`\`. Output raw JSON directly.
- The "articleHtml" field MUST contain pure HTML starting with an <h2> or <h1> title, using semantic tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <a href="...">, <img src="..." />.
- DO NOT use Markdown formatting syntax (such as **text**, *text*, _text_) inside "articleHtml"! ALWAYS use <strong>teks tebal</strong> for bold and <em>teks miring</em> for italics.
- STRICT HTML LIST SEMANTICS (MDN HTML STANDARD): NEVER write manual numeric or bullet prefixes (such as "1.", "2.", "3.", "1)", "•", "-") inside <li> tags! HTML <ul> and <ol> tags automatically render bullet points and numbers. Writing "<li>1. Text</li>" or "<li><strong>1. Text</strong></li>" produces broken duplicate markers ("• 1. Text") in browsers and strictly violates MDN HTML Element standards.
- DO NOT add unnatural spaces before punctuation (e.g. write "Kopi, Memahami" NOT "Kopi , Memahami").`;

  const userPrompt = `
Generate a complete, deeply researched, masterclass-level article ("Tuntas & Padat" PanduanIM style) and SEO metadata based on these specifications:

- **Target Keyword**: ${keyword.trim()}
- **Writing Style**: ${style || "SEO"}
- **Reference Context**: ${referenceInfo && referenceInfo.trim() ? referenceInfo.trim() : "N/A"}
${imageInstructions}
${internalLinkInstructions}

CRITICAL REQUIREMENT: Ensure the article in "articleHtml" is comprehensive, highly detailed, and exhaustive (1500+ words). Focus on 4-5 core strategic sections with organic non-numbered H2 headings. Follow standard capitalization rules for "anda"/"Anda" (capitalize "Anda" at the start of sentences or headings, use lowercase "anda" in the middle of sentences). Include at least 1 blockquote definition, 1 mini-story (e.g. "Budi" or "Rina"), grounded everyday Indonesian analogies, bullet lists (<ul><li>) for all breakdowns, ultra-short paragraphs (1-2 sentences / max 3-4 lines), dramatic ellipsis "…", Piramida Terbalik / Mindset Shift ("Lupakan X"), a practitioner FAQ section, and a MANDATORY explicit Action Plan + summary closing section AFTER the FAQ section (never end on a FAQ answer, no "Kesimpulan" title). Never invent unverified technical claims or fake statistics! Make it 100% compliant with Google's Helpful Content System (E-E-A-T) and PanduanIM writing standards!
`;

  const maxRetries = Math.min(allKeyTrackers.length * 2, 6);
  let attemptCount = 0;
  let lastErrorMsg = "";

  while (attemptCount < maxRetries) {
    attemptCount++;
    const selectedTracker = selectNextActiveKey(allKeyTrackers);

    if (!selectedTracker) {
      lastErrorMsg = "Semua API Key (Gemini / OpenRouter) saat ini dalam status cooldown atau invalid.";
      break;
    }

    const startTime = Date.now();
    selectedTracker.requestCount += 1;
    selectedTracker.lastUsed = new Date().toISOString();

    try {
      let responseText = "";
      let actualModelUsed: string | undefined = undefined;

      if (selectedTracker.provider === 'openrouter') {
        const primaryModel = selectedTracker.model || "openai/gpt-4o-mini";
        const fallbackList = Array.isArray(selectedTracker.fallbackModels) ? selectedTracker.fallbackModels : [];
        const modelChain = [primaryModel, ...fallbackList].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

        const requestBody: any = {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.98,
          top_p: 0.95,
          response_format: { type: "json_object" },
        };

        if (modelChain.length > 1) {
          requestBody.models = modelChain; // OpenRouter fallback model array feature
        } else {
          requestBody.model = modelChain[0] || "openai/gpt-4o-mini";
        }

        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${selectedTracker.key.trim()}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aistudio.build",
            "X-Title": "AI Human Article Generator",
          },
          body: JSON.stringify(requestBody),
        });

        if (!openRouterRes.ok) {
          const errText = await openRouterRes.text();
          throw new Error(`OpenRouter HTTP ${openRouterRes.status}: ${errText}`);
        }

        const orData = await openRouterRes.json();
        responseText = orData.choices?.[0]?.message?.content || "";
        actualModelUsed = orData.model || modelChain[0];
      } else {
        actualModelUsed = "gemini-flash-latest";
        const ai = new GoogleGenAI({
          apiKey: selectedTracker.key.trim(),
          httpOptions: {
            headers: { "User-Agent": "aistudio-build" },
          },
        });

        // Primary model target gemini-flash-latest with boosted temperature for AI detection bypass
        const response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [
            { role: "user", parts: [{ text: userPrompt }] }
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.98,
            topP: 0.95,
            responseMimeType: "application/json",
          },
        });

        responseText = response.text || "";
      }

      const latencyMs = Date.now() - startTime;
      selectedTracker.latencyMs = latencyMs;
      selectedTracker.status = 'active';

      responseText = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();

      let title = keyword.trim();
      let slug = "";
      let metaTitle = "";
      let metaDescription = "";
      let focusKeyword = keyword.trim();
      let featuredImageUrl = "";
      let featuredImageAlt = "";
      let rawHtml = "";

      try {
        const parsed = JSON.parse(responseText);
        title = parsed.title || title;
        slug = parsed.slug || "";
        metaTitle = parsed.metaTitle || "";
        metaDescription = parsed.metaDescription || "";
        focusKeyword = parsed.focusKeyword || focusKeyword;
        featuredImageUrl = parsed.featuredImageUrl || parsed.featuredImage || "";
        featuredImageAlt = parsed.featuredImageAlt || parsed.altText || "";
        rawHtml = parsed.articleHtml || parsed.html || parsed.content || "";
      } catch (err) {
        rawHtml = responseText;
      }

      if (!rawHtml) {
        rawHtml = responseText;
      }

      // Convert any stray markdown bold and italic syntax to pure HTML tags & apply PanduanIM humanizer filter
      rawHtml = rawHtml
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.*?)__/g, "<strong>$1</strong>")
        .replace(/\*([^\*\n]+)\*/g, "<em>$1</em>")
        .replace(/_([^\_\n]+)_/g, "<em>$1</em>");

      rawHtml = applyPanduanIMHumanizerFilter(rawHtml);

      // Extract plain text for word count calculation
      const plainText = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const wordCount = plainText ? plainText.split(/\s+/).length : 0;

      // Extract title fallback from H1/H2 if missing
      if (!title || title === keyword) {
        const titleMatch = rawHtml.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
        }
      }

      // Fallback for slug if missing
      if (!slug) {
        slug = (title || keyword)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      // Fallback for metaTitle if missing
      if (!metaTitle) {
        metaTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
      }

      // Fallback for metaDescription if missing
      if (!metaDescription) {
        metaDescription = plainText.length > 150 ? plainText.substring(0, 147) + "..." : plainText;
      }

      // Extract image fallback from HTML if featuredImageUrl is missing
      if (!featuredImageUrl) {
        const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        if (imgMatch && imgMatch[1]) {
          featuredImageUrl = imgMatch[1];
          const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
          if (altMatch && altMatch[1]) {
            featuredImageAlt = altMatch[1];
          }
        }
      }

      // Default Unsplash image fallback if still missing
      if (!featuredImageUrl) {
        featuredImageUrl = `https://images.unsplash.com/photo-1542744094-3a31b272c365?auto=format&fit=crop&w=1200&q=80`;
      }
      if (!featuredImageAlt) {
        featuredImageAlt = `Gambar ilustrasi SEO untuk ${title || keyword}`;
      }

      // Run automated PanduanIM Writing & E-E-A-T Audit
      const panduanImAudit = auditPanduanIMStyle(rawHtml, wordCount, title, keyword.trim());

      return res.json({
        success: true,
        title,
        slug,
        metaTitle,
        metaDescription,
        focusKeyword,
        featuredImageUrl,
        featuredImageAlt,
        panduanImAudit,
        keyword: keyword.trim(),
        style,
        html: rawHtml,
        plainText,
        wordCount,
        generationDurationMs: latencyMs,
        keyUsedName: selectedTracker.name,
        providerUsed: selectedTracker.provider,
        modelUsedActual: actualModelUsed || selectedTracker.model,
      });

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error?.message || String(error);
      selectedTracker.errorCount += 1;
      selectedTracker.latencyMs = latencyMs;

      const is401 = errMsg.includes("401") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("invalid api key");
      const is429 = errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("resource exhausted");

      if (is401) {
        selectedTracker.status = 'invalid';
      } else if (is429) {
        selectedTracker.status = 'cooldown';
        selectedTracker.cooldownUntil = Date.now() + 60000; // 60 seconds cooldown
      } else {
        selectedTracker.status = 'offline';
      }

      lastErrorMsg = `Attempt ${attemptCount} with key ${selectedTracker.name} failed: ${errMsg}`;
      console.warn(lastErrorMsg);
    }
  }

  return res.status(400).json({
    error: `Semua API Key (Gemini / OpenRouter) yang terdaftar sedang mengalami limit kuota (429) atau tidak valid (${attemptCount} percobaan gagal). Silakan tambahkan API Key baru atau periksa status key Anda di menu Pengaturan.`
  });
});

// Vite Middleware for development & static fallback for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server AI Human Article Generator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
