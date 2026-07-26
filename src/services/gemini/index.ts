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
    throw new Error('Gagal terhubung ke server. Silakan periksa koneksi internet atau status server Anda.');
  }

  let data: any = {};
  try {
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.toLowerCase().includes('the page c') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        data = { error: 'Server atau proxy jaringan mengalami error/timeout. Silakan periksa API Key Gemini Anda di menu Pengaturan.' };
      } else {
        data = { error: rawText || 'Respon dari server tidak dapat diproses.' };
      }
    }
  } catch (err: any) {
    data = { error: 'Gagal membaca respon server. Silakan coba lagi.' };
  }

  if (!response.ok) {
    const errMsg = data?.error || 'Gagal menghasilkan artikel. Silakan periksa kembali API Key Gemini Anda di menu Pengaturan.';
    throw new Error(errMsg);
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
