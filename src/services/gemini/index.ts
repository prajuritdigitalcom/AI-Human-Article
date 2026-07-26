import { GenerateArticleParams, PanduanImAuditReport } from '../../types';
import { getSavedApiKeys } from '../../utils/storage';

export interface GenerationResponse {
  success: boolean;
  title: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  panduanImAudit?: PanduanImAuditReport;
  keyword: string;
  style: string;
  html: string;
  plainText: string;
  wordCount: number;
  generationDurationMs: number;
  keyUsedName?: string;
  error?: string;
}

export async function generateArticleApi(params: GenerateArticleParams): Promise<GenerationResponse> {
  const savedKeys = getSavedApiKeys().map((k) => k.key);

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      customApiKeys: savedKeys,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Gagal menghasilkan artikel. Silakan periksa kembali API Key Anda.');
  }

  return data;
}

export async function testGeminiApiKeyApi(apiKey: string) {
  const response = await fetch('/api/test-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });

  const data = await response.json();
  return data;
}
