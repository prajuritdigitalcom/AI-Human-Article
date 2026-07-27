export interface GithubCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  currentSha: string;
  latestSha: string;
  lastChecked: string;
  repo: string;
  error?: string;
}

async function safeParseGithubJson(response: Response, fallbackErr: string): Promise<any> {
  const rawText = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    if (rawText.toLowerCase().includes('the page c') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
      data = { error: `Server / Vercel mengembalikan respon HTML (HTTP ${response.status}). Cek Vercel Logs.` };
    } else {
      data = { error: rawText.trim() ? rawText : `${fallbackErr} (HTTP ${response.status})` };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `${fallbackErr} (HTTP ${response.status})`);
  }

  return data;
}

export async function checkGithubHumanizerUpdate(): Promise<GithubCheckResult> {
  try {
    const response = await fetch('/api/github-check');
    return await safeParseGithubJson(response, 'Gagal mengecek update GitHub');
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion: '4.0.0',
      currentSha: 'v4.0.0-revised',
      latestSha: 'v4.0.0-revised',
      lastChecked: new Date().toISOString(),
      repo: 'blader/humanizer',
      error: err?.message,
    };
  }
}

export async function triggerHumanizerUpdate(): Promise<{
  success: boolean;
  message: string;
  version: string;
  commitSha: string;
  lastChecked: string;
}> {
  const response = await fetch('/api/update-humanizer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await safeParseGithubJson(response, 'Gagal memperbarui Humanizer Engine');
}
