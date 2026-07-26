import { ArticleHistoryItem, ApiKeyConfig } from '../types';

const HISTORY_KEY = 'ai_human_articles_history';
const KEYS_KEY = 'ai_human_gemini_api_keys';
const SETTINGS_KEY = 'ai_human_settings';

export interface AppSettings {
  defaultStyle: string;
  autoCheckUpdate: boolean;
  roundRobinEnabled: boolean;
  maskApiKeys: boolean;
  wpSiteUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultStyle: 'SEO',
  autoCheckUpdate: true,
  roundRobinEnabled: true,
  maskApiKeys: true,
  wpSiteUrl: '',
  wpUsername: '',
  wpAppPassword: '',
};

// --- History Storage ---
const MAX_HISTORY_ITEMS = 20;

export function getArticleHistory(): ArticleHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: ArticleHistoryItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch (err) {
    console.error('Error reading article history:', err);
    return [];
  }
}

export function saveArticleHistoryItem(item: ArticleHistoryItem): ArticleHistoryItem[] {
  const history = getArticleHistory();
  const updated = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving article history:', err);
  }
  return updated;
}

export function deleteArticleHistoryItem(id: string): ArticleHistoryItem[] {
  const history = getArticleHistory();
  const updated = history.filter((item) => item.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting article history item:', err);
  }
  return updated;
}

export function clearArticleHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing history:', err);
  }
}

// --- Custom API Keys Storage ---
export function getSavedApiKeys(): ApiKeyConfig[] {
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading saved API keys:', err);
    return [];
  }
}

export function saveApiKey(key: string, name?: string): ApiKeyConfig[] {
  const keys = getSavedApiKeys();
  const trimmed = key.trim();
  if (!trimmed) return keys;

  const existingIdx = keys.findIndex((k) => k.key === trimmed);
  const maskedLabel = trimmed.length > 8 ? `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}` : 'Key';
  const newItem: ApiKeyConfig = {
    id: existingIdx >= 0 ? keys[existingIdx].id : `key_${Date.now()}`,
    key: trimmed,
    name: name || `API Key (${maskedLabel})`,
    status: 'active',
    requestCount: existingIdx >= 0 ? keys[existingIdx].requestCount : 0,
    errorCount: existingIdx >= 0 ? keys[existingIdx].errorCount : 0,
  };

  let updated: ApiKeyConfig[];
  if (existingIdx >= 0) {
    updated = [...keys];
    updated[existingIdx] = newItem;
  } else {
    updated = [...keys, newItem];
  }

  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving API key:', err);
  }
  return updated;
}

export function updateApiKeyStatus(
  id: string,
  status: 'active' | 'cooldown' | 'invalid' | 'offline',
  latencyMs?: number
): ApiKeyConfig[] {
  const keys = getSavedApiKeys();
  const updated = keys.map((k) => {
    if (k.id === id) {
      return {
        ...k,
        status,
        latencyMs: latencyMs !== undefined ? latencyMs : k.latencyMs,
        lastUsed: status === 'active' ? new Date().toISOString() : k.lastUsed,
        requestCount: k.requestCount + 1,
        errorCount: status !== 'active' ? k.errorCount + 1 : k.errorCount,
      };
    }
    return k;
  });

  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error updating API key status:', err);
  }
  return updated;
}

export function deleteApiKey(id: string): ApiKeyConfig[] {
  const keys = getSavedApiKeys();
  const updated = keys.filter((k) => k.id !== id);
  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting API key:', err);
  }
  return updated;
}

export function setLastGeneratedArticle(item: ArticleHistoryItem): void {
  try {
    localStorage.setItem('ai_human_last_article', JSON.stringify(item));
  } catch (err) {
    console.error('Error saving last article:', err);
  }
}

export function getLastGeneratedArticle(): ArticleHistoryItem | null {
  try {
    const raw = localStorage.getItem('ai_human_last_article');
    if (raw) return JSON.parse(raw);
    const history = getArticleHistory();
    return history.length > 0 ? history[0] : null;
  } catch (err) {
    console.error('Error reading last article:', err);
    return null;
  }
}

// --- App Settings Storage ---
export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
  return updated;
}
