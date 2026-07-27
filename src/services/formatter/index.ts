/**
 * Formatter Service
 * Prepares clean HTML compatible with WordPress Classic Editor,
 * audits compliance against MDN Standard HTML Elements Reference,
 * handles copying to clipboard, and downloading HTML files.
 */

/**
 * Standard HTML Elements as defined by Mozilla Developer Network (MDN)
 * Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements
 */
export const MDN_STANDARD_HTML_ELEMENTS = new Set([
  // Main & Document metadata
  'html', 'head', 'title', 'base', 'link', 'meta', 'style',
  // Content sectioning
  'body', 'article', 'section', 'nav', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'header', 'footer', 'address', 'main',
  // Text content
  'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'menu', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'div',
  // Inline text semantics
  'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby', 'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'bdi', 'bdo', 'span', 'br', 'wbr',
  // Image, media & embedded
  'ins', 'del', 'picture', 'source', 'img', 'iframe', 'embed', 'object', 'param', 'video', 'audio', 'track', 'map', 'area', 'svg', 'math', 'canvas', 'noscript', 'script',
  // Table
  'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
  // Forms
  'form', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'output', 'progress', 'meter', 'fieldset', 'legend',
  // Interactive
  'details', 'summary', 'dialog', 'slot', 'template'
]);

export interface MdnHtmlAuditResult {
  passed: boolean;
  score: number;
  totalTagsCount: number;
  validTagsCount: number;
  invalidTagsFound: string[];
  uniqueValidTagsUsed: string[];
  sanitizedHtml: string;
  auditDetails: string;
}

/**
 * Audits and sanitizes HTML content against official MDN HTML Element standards.
 */
export function auditAndSanitizeMdnHtml(html: string): MdnHtmlAuditResult {
  if (!html) {
    return {
      passed: true,
      score: 100,
      totalTagsCount: 0,
      validTagsCount: 0,
      invalidTagsFound: [],
      uniqueValidTagsUsed: [],
      sanitizedHtml: '',
      auditDetails: 'Konten kosong. Audit MDN HTML berstatus Lolos.',
    };
  }

  let cleaned = html.trim();

  // 1. Strip markdown fences if present
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');

  // 2. Convert markdown bold and italic formatting to HTML tags
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*([^\*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^\_\n]+)_/g, '<em>$1</em>');

  // 3. Convert obsolete/deprecated HTML tags to modern MDN standard elements
  cleaned = cleaned
    .replace(/<center([^>]*)>/gi, '<div class="text-center"$1>')
    .replace(/<\/center>/gi, '</div>')
    .replace(/<font([^>]*)>/gi, '<span$1>')
    .replace(/<\/font>/gi, '</span>')
    .replace(/<strike([^>]*)>/gi, '<s>')
    .replace(/<\/strike>/gi, '</s>')
    .replace(/<tt([^>]*)>/gi, '<code>')
    .replace(/<\/tt>/gi, '</code>')
    .replace(/<dir([^>]*)>/gi, '<ul>')
    .replace(/<\/dir>/gi, '</ul>');

  // 4. Convert <ul> with sequential numbers (1.) to proper <ol>
  cleaned = cleaned.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
    if (/<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*\s*1[\.\)\:]/i.test(inner)) {
      return `<ol${attrs}>${inner}</ol>`;
    }
    return match;
  });

  // 5. Strip manual numbers or bullets inside <li> elements to prevent double bullets
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(/(<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*)\s*(?:\d+[\.\)\:]|•|\-|\*|\#)\s*/gi, '$1');
  }

  // 6. Clean unnatural spacing before punctuation
  cleaned = cleaned.replace(/(\w|\>)\s+([,\.\:\;\?\!])(\s|\<|\w)/g, '$1$2$3');

  // 7. Audit all HTML tags in the document against MDN Standard HTML Elements
  const tagRegex = /<\/?([a-z0-9_\-]+)[^>]*>/gi;
  const invalidTagsSet = new Set<string>();
  const validTagsSet = new Set<string>();
  let totalTagsCount = 0;
  let validTagsCount = 0;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(cleaned)) !== null) {
    totalTagsCount++;
    const tagName = match[1].toLowerCase();
    if (MDN_STANDARD_HTML_ELEMENTS.has(tagName)) {
      validTagsCount++;
      validTagsSet.add(tagName);
    } else {
      invalidTagsSet.add(tagName);
    }
  }

  const invalidTagsFound = Array.from(invalidTagsSet);
  const uniqueValidTagsUsed = Array.from(validTagsSet);

  // 8. Strip any remaining invalid non-MDN custom tags while preserving inner content
  if (invalidTagsFound.length > 0) {
    invalidTagsFound.forEach((invTag) => {
      const openRegex = new RegExp(`<${invTag}[^>]*>`, 'gi');
      const closeRegex = new RegExp(`</${invTag}>`, 'gi');
      cleaned = cleaned.replace(openRegex, '').replace(closeRegex, '');
    });
  }

  const score = totalTagsCount > 0 ? Math.round((validTagsCount / totalTagsCount) * 100) : 100;
  const passed = invalidTagsFound.length === 0;

  const auditDetails = passed
    ? `Lolos Audit MDN HTML Element (100% dari ${totalTagsCount} tag mematuhi standar https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements). Tag valid yang digunakan: ${uniqueValidTagsUsed.map(t => `<${t}>`).join(', ')}.`
    : `Terdeteksi ${invalidTagsFound.length} tag non-standar MDN (${invalidTagsFound.map(t => `<${t}>`).join(', ')}). Seluruh tag telah disanitasi menjadi elemen standar MDN HTML.`;

  return {
    passed,
    score,
    totalTagsCount,
    validTagsCount,
    invalidTagsFound,
    uniqueValidTagsUsed,
    sanitizedHtml: cleaned,
    auditDetails,
  };
}

export function ensureImageAtVeryTop(html: string, imgUrl?: string, imgAlt?: string): string {
  if (!html) return html;
  
  let cleaned = html.trim();

  // If imgUrl is provided, ensure it is positioned at the very top
  if (imgUrl && imgUrl.trim()) {
    const targetUrl = imgUrl.trim();
    const targetAlt = imgAlt ? imgAlt.trim() : 'Gambar Artikel';
    const topImgTag = `<p><img src="${targetUrl}" alt="${targetAlt}" class="article-image my-6 rounded-xl w-full object-cover max-h-[450px]" /></p>`;

    // Check if html already starts with an image
    const startsWithImg = /^\s*(?:<p[^>]*>|<figure[^>]*>)?\s*<img[^>]+>/i.test(cleaned);
    if (!startsWithImg) {
      // Remove any duplicate img tag with the same src from deeper in the article
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicateImgRegex = new RegExp(`(?:<p[^>]*>|<figure[^>]*>)?\\s*<img[^>]+src=["']${escapeRegExp(targetUrl)}["'][^>]*>(?:\\s*<\\/p>|\\s*<\\/figure>)?`, 'gi');
      cleaned = cleaned.replace(duplicateImgRegex, '').trim();

      // If html starts with <h1> or <h2>, place image immediately after the title
      const headingMatch = cleaned.match(/^(\s*<h[12][^>]*>[\s\S]*?<\/h[12]>\s*)/i);
      if (headingMatch) {
        const heading = headingMatch[1];
        const rest = cleaned.substring(heading.length).trim();
        cleaned = `${heading}\n${topImgTag}\n${rest}`;
      } else {
        cleaned = `${topImgTag}\n${cleaned}`;
      }
    }
  } else {
    // If no imgUrl provided, check if there is any <img> tag inside html, move the first <img> to the very top
    const firstImgMatch = cleaned.match(/(?:<p[^>]*>|<figure[^>]*>)?\s*<img[^>]+src=["']([^"']+)["'][^>]*>(?:\s*<\/p>|\s*<\/figure>)?/i);
    if (firstImgMatch && !/^\s*(?:<p[^>]*>|<figure[^>]*>)?\s*<img[^>]+>/i.test(cleaned)) {
      const fullImgBlock = firstImgMatch[0];
      // Remove firstImgBlock from current position
      cleaned = cleaned.replace(fullImgBlock, '').trim();
      // Place it at the top or right after heading
      const headingMatch = cleaned.match(/^(\s*<h[12][^>]*>[\s\S]*?<\/h[12]>\s*)/i);
      if (headingMatch) {
        const heading = headingMatch[1];
        const rest = cleaned.substring(heading.length).trim();
        cleaned = `${heading}\n${fullImgBlock}\n${rest}`;
      } else {
        cleaned = `${fullImgBlock}\n${cleaned}`;
      }
    }
  }

  return cleaned;
}

export function getRawWordpressHtml(html: string): string {
  if (!html) return '';
  const audited = auditAndSanitizeMdnHtml(html);
  let cleaned = audited.sanitizedHtml;
  cleaned = ensureImageAtVeryTop(cleaned);
  // Remove tailwind utility classes if injected previously
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, '');
  return cleaned;
}

export function cleanWordPressHtml(html: string): string {
  if (!html) return '';
  const audited = auditAndSanitizeMdnHtml(html);
  let cleaned = audited.sanitizedHtml;
  cleaned = ensureImageAtVeryTop(cleaned);

  // Ensure headings have proper spacing and clean classes for preview rendering
  cleaned = cleaned.replace(/<h1([^>]*)>/gi, '<h1 class="text-3xl font-bold my-4 text-gray-900">');
  cleaned = cleaned.replace(/<h2([^>]*)>/gi, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 border-b pb-2">');
  cleaned = cleaned.replace(/<h3([^>]*)>/gi, '<h3 class="text-xl font-semibold mt-6 mb-3 text-gray-800">');
  cleaned = cleaned.replace(/<p([^>]*)>/gi, '<p class="my-4 text-gray-700 leading-relaxed text-base">');
  cleaned = cleaned.replace(/<ul([^>]*)>/gi, '<ul class="list-disc list-inside my-4 space-y-2 text-gray-700">');
  cleaned = cleaned.replace(/<ol([^>]*)>/gi, '<ol class="list-decimal list-inside my-4 space-y-2 text-gray-700">');
  cleaned = cleaned.replace(/<blockquote([^>]*)>/gi, '<blockquote class="border-l-4 border-[#fe4c6f] pl-4 italic my-6 text-gray-600 bg-gray-50 py-2 rounded-r-md">');

  return cleaned;
}

export function extractPlainTextFromHtml(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    // Fallback for older browsers / non-secure context
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return Promise.resolve(true);
    } catch (error) {
      textArea.remove();
      return Promise.resolve(false);
    }
  }
}

export function downloadHtmlFile(filename: string, content: string): void {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/html;charset=utf-8' });
  element.href = URL.createObjectURL(file);
  element.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

