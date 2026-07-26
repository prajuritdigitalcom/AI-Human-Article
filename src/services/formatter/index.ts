/**
 * Formatter Service
 * Prepares clean HTML compatible with WordPress Classic Editor,
 * handles copying to clipboard, and downloading HTML files.
 */

export function getRawWordpressHtml(html: string): string {
  if (!html) return '';
  let cleaned = html.trim();
  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');
  // Convert <ul> with sequential 1. numbers to <ol>
  cleaned = cleaned.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
    if (/<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*\s*1[\.\)\:]/i.test(inner)) {
      return `<ol${attrs}>${inner}</ol>`;
    }
    return match;
  });
  // Strip manual number/bullet prefixes inside <li> elements
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(/(<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*)\s*(?:\d+[\.\)\:]|•|\-|\*|\#)\s*/gi, '$1');
  }
  // Clean whitespace before punctuation
  cleaned = cleaned.replace(/(\w|\>)\s+([,\.\:\;\?\!])(\s|\<|\w)/g, '$1$2$3');
  // Remove tailwind utility classes if injected previously
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, '');
  return cleaned;
}

export function cleanWordPressHtml(html: string): string {
  if (!html) return '';

  let cleaned = html.trim();

  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');

  // Convert markdown bold and italic formatting to HTML tags
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*([^\*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^\_\n]+)_/g, '<em>$1</em>');

  // Convert <ul> with sequential 1. numbers to <ol>
  cleaned = cleaned.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
    if (/<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*\s*1[\.\)\:]/i.test(inner)) {
      return `<ol${attrs}>${inner}</ol>`;
    }
    return match;
  });

  // Strip manual number/bullet prefixes inside <li> elements
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(/(<li[^>]*>(?:\s*<[a-z1-6]+[^>]*>)*)\s*(?:\d+[\.\)\:]|•|\-|\*|\#)\s*/gi, '$1');
  }

  // Clean whitespace before punctuation
  cleaned = cleaned.replace(/(\w|\>)\s+([,\.\:\;\?\!])(\s|\<|\w)/g, '$1$2$3');

  // Ensure headings have proper spacing and clean classes
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
