import { GenerateArticleParams, PanduanImAuditReport, ApiProvider } from '../../types';
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
  providerUsed?: string;
  modelUsedActual?: string;
  error?: string;
}

async function safeParseJsonResponse(response: Response, defaultErrorMsg: string): Promise<any> {
  const rawText = await response.text();
  let data: any = {};

  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    if (rawText.toLowerCase().includes('the page c') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
      data = {
        error: `Server / Vercel mengembalikan respon HTML (HTTP ${response.status}). Mohon pastikan file vercel.json sudah ada di root project. Cek Vercel Logs untuk detail error.`,
      };
    } else {
      data = {
        error: rawText.trim() ? rawText : `${defaultErrorMsg} (HTTP ${response.status}). Cek Vercel Logs untuk detailnya.`,
      };
    }
  }

  if (!response.ok) {
    const errMsg = data?.error || data?.message || `${defaultErrorMsg} (HTTP ${response.status}). Cek Vercel Logs untuk detailnya.`;
    throw new Error(errMsg);
  }

  return data;
}

export async function generateArticleApi(params: GenerateArticleParams): Promise<GenerationResponse> {
  const savedKeys = getSavedApiKeys().map((k) => ({
    key: k.key,
    provider: k.provider || 'gemini',
    model: k.model,
    fallbackModels: k.fallbackModels,
  }));

  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        customApiKeys: savedKeys,
      }),
    });
  } catch (netErr: any) {
    throw new Error('Gagal terhubung ke server/Vercel. Silakan periksa koneksi internet atau status server Anda.');
  }

  return await safeParseJsonResponse(response, 'Gagal menghasilkan artikel');
}

export async function testGeminiApiKeyApi(apiKey: string, provider: ApiProvider = 'gemini', model?: string) {
  let response: Response;
  try {
    response = await fetch('/api/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey, provider, model }),
    });
  } catch (netErr: any) {
    throw new Error('Gagal terhubung ke server/Vercel. Silakan periksa koneksi internet Anda.');
  }

  return await safeParseJsonResponse(response, 'Test API Key gagal');
}
