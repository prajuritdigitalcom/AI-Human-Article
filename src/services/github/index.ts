export interface GithubCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  currentSha: string;
  latestSha: string;
  lastChecked: string;
  repo: string;
  error?: string;
}

export async function checkGithubHumanizerUpdate(): Promise<GithubCheckResult> {
  const response = await fetch('/api/github-check');
  const data = await response.json();
  return data;
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
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gagal memperbarui Humanizer Engine.');
  }
  return data;
}
