import crypto from 'node:crypto';

export interface NormalizedRecord {
  source: string;
  sourceId: string;
  signalType: 'recall' | 'news';
  trust: 'official' | 'unverified';
  firmName: string | null;
  severityRaw: string | null;
  severityNum: number | null;
  title: string;
  summary: string | null;
  eventDate: Date | null;
  recallInitiationDate: Date | null;
  reportDate: Date | null;
  country: string | null;
  eventId: string | null;
  url: string;
  raw: Record<string, unknown>;
  contentHash: string;
}

export interface FetchWindowResult {
  records: NormalizedRecord[];
  sourceLastUpdated: Date | null;
  totalAvailable: number;
}

export interface SourceAdapter {
  readonly source: string;
  fetchWindow(
    startDate: string,
    endDate: string,
    onProgress?: (chunk: NormalizedRecord[]) => Promise<void>
  ): Promise<FetchWindowResult>;
}

/**
 * Key-sorted canonical serialization for deterministic hashing
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJson(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalJson(val);
  });
  return '{' + entries.join(',') + '}';
}

/**
 * Computes sha256 hash of a stable key-sorted serialization of raw record
 */
export function computeContentHash(raw: Record<string, unknown>): string {
  const canonical = canonicalJson(raw);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Redacts any openFDA or generic api_key query parameters from strings/logs/URLs
 */
export function redactApiKey(text: string, knownKey?: string): string {
  if (!text) return text;
  let result = text;
  if (knownKey && knownKey.length > 4) {
    result = result.split(knownKey).join('[REDACTED]');
  }
  // Regex to redact api_key=value or api_key: "value"
  result = result.replace(/([?&]api_key=)[^& \t\n\r"']+/gi, '$1[REDACTED]');
  result = result.replace(/(["']?api_key["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, '$1[REDACTED]$3');
  return result;
}
