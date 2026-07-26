export type WritingStyle = 
  | 'SEO' 
  | 'Formal' 
  | 'Semi Formal' 
  | 'Tutorial' 
  | 'News' 
  | 'Sales' 
  | 'Company Profile';

export interface InternalLinkItem {
  anchorText: string;
  url: string;
}

export interface GenerateArticleParams {
  keyword: string;
  style: WritingStyle;
  referenceInfo?: string;
  imageLinks?: string[];
  internalLinks?: InternalLinkItem[];
  customApiKeys?: string[];
}

export interface ApiKeyConfig {
  id: string;
  key: string; // Stored masked or encrypted in local UI
  name: string;
  status: 'active' | 'cooldown' | 'invalid' | 'offline';
  latencyMs?: number;
  lastUsed?: string;
  requestCount: number;
  errorCount: number;
  cooldownUntil?: number;
}

export interface PanduanImAuditCheck {
  id: string;
  label: string;
  category: 'Validasi HTML (MDN)' | 'POV & Style' | 'Kedalaman & E-E-A-T' | 'Anti-AI Burstiness' | 'Struktur & SEO';
  passed: boolean;
  detail: string;
}

export interface PanduanImAuditReport {
  score: number;
  passedCount: number;
  totalCount: number;
  checks: PanduanImAuditCheck[];
}

export interface ArticleHistoryItem {
  id: string;
  keyword: string;
  style: WritingStyle;
  title: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  panduanImAudit?: PanduanImAuditReport;
  html: string;
  plainText: string;
  wordCount: number;
  createdAt: string;
  categories?: string[];
  tags?: string[];
  keyUsed?: string;
  generationDurationMs?: number;
}

export interface HumanizerVersionInfo {
  version: string;
  lastChecked: string;
  commitSha: string;
  repo: string;
  hasUpdate?: boolean;
  latestCommitSha?: string;
}

export interface HumanizerRule {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  exampleBad?: string;
  exampleGood?: string;
}

export interface ApiHealthMetrics {
  totalKeys: number;
  activeKeys: number;
  cooldownKeys: number;
  invalidKeys: number;
  roundRobinIndex: number;
  lastUsedKeyName?: string;
}
