import crypto from 'node:crypto';
import {
  type NormalizedRecord,
  type SourceAdapter,
  type FetchWindowResult,
  computeContentHash,
  redactApiKey,
} from '../adapter.js';
import { logger } from '../../../config/logger.js';

export interface OpenFdaAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  timeoutMs?: number;
  pacingDelayMs?: number;
  fetchFn?: typeof fetch;
}

export interface OpenFdaRecordRaw {
  recall_number?: string;
  classification?: string;
  recalling_firm?: string;
  reason_for_recall?: string;
  report_date?: string;
  recall_initiation_date?: string;
  country?: string;
  status?: string;
  product_description?: string;
  [key: string]: unknown;
}

export interface OpenFdaApiResponse {
  meta?: {
    last_updated?: string;
    results?: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results?: OpenFdaRecordRaw[];
  error?: {
    code: string;
    message: string;
  };
}

export class OpenFdaAdapter implements SourceAdapter {
  readonly source = 'openfda_enforcement';
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  private readonly timeoutMs: number;
  private readonly pacingDelayMs: number;
  private readonly fetchFn: typeof fetch;
  private lastRequestTime = 0;

  constructor(options: OpenFdaAdapterOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.baseUrl = options.baseUrl || 'https://api.fda.gov/drug/enforcement.json';
    this.maxRetries = options.maxRetries ?? 3;
    this.initialBackoffMs = options.initialBackoffMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.pacingDelayMs = options.pacingDelayMs ?? 500; // Pacing: at most 2 requests/second
    this.fetchFn = options.fetchFn || fetch;
  }

  /**
   * Parse YYYYMMDD date format defensively
   */
  static parseFdaDate(val?: string | null): Date | null {
    if (!val || typeof val !== 'string') return null;
    const cleaned = val.trim();
    if (!/^\d{8}$/.test(cleaned)) return null;
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);

    const date = new Date(Date.UTC(year, month, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }

  /**
   * Severity number mapping: Class I -> 3, Class II -> 2, Class III -> 1, otherwise null with warning
   */
  static mapSeverity(classification?: string | null): {
    severityRaw: string | null;
    severityNum: number | null;
  } {
    if (!classification) {
      return { severityRaw: null, severityNum: null };
    }
    const clean = classification.trim();
    const upper = clean.toUpperCase();

    if (upper.includes('CLASS I') && !upper.includes('CLASS II') && !upper.includes('CLASS III')) {
      return { severityRaw: clean, severityNum: 3 };
    }
    if (upper.includes('CLASS II') && !upper.includes('CLASS III')) {
      return { severityRaw: clean, severityNum: 2 };
    }
    if (upper.includes('CLASS III')) {
      return { severityRaw: clean, severityNum: 1 };
    }

    logger.warn({ classification: clean }, 'Unknown or unusual openFDA classification encountered');
    return { severityRaw: clean, severityNum: null };
  }

  /**
   * Sanitizes and caps very long arrays in raw record at 20 items (annotated)
   */
  static sanitizeRawRecord(record: OpenFdaRecordRaw): Record<string, unknown> {
    const raw: Record<string, unknown> = {};
    const cappedArrays: string[] = [];

    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        if (value.length > 20) {
          raw[key] = value.slice(0, 20);
          cappedArrays.push(`${key} (capped at 20 from ${value.length})`);
        } else {
          raw[key] = value;
        }
      } else {
        raw[key] = value;
      }
    }

    if (cappedArrays.length > 0) {
      raw._arrayTruncationNote = `Capped arrays at 20 items: ${cappedArrays.join(', ')}`;
    }

    return raw;
  }

  /**
   * Normalizes an openFDA record into standard NormalizedRecord.
   * E22: A record without recall_number is stored, never skipped:
   * source_id = event_id + ":" + first 12 hex chars of sha256(product_description).
   * Flag it in the run note.
   */
  normalizeRecord(item: OpenFdaRecordRaw): NormalizedRecord | null {
    let sourceId: string;

    const rawRecallNumber = item.recall_number?.trim();
    if (rawRecallNumber) {
      sourceId = rawRecallNumber;
    } else {
      const eventIdStr = item.event_id ? String(item.event_id).trim() : 'no_event';
      const desc = item.product_description || '';
      const descHash = crypto.createHash('sha256').update(desc).digest('hex').slice(0, 12);
      sourceId = `${eventIdStr}:${descHash}`;
      logger.warn(
        { eventId: eventIdStr, firm: item.recalling_firm, sourceId },
        'E22: openFDA record missing recall_number stored with synthetic source_id'
      );
    }

    const { severityRaw, severityNum } = OpenFdaAdapter.mapSeverity(item.classification);
    const firmName = item.recalling_firm ? item.recalling_firm.trim() : null;
    const title = `${sourceId} - ${firmName || 'Unknown Firm'}`;

    const rawSummary = item.reason_for_recall ? item.reason_for_recall.trim() : null;
    const summary = rawSummary && rawSummary.length > 2000 ? rawSummary.slice(0, 2000) : rawSummary;

    const reportDate = OpenFdaAdapter.parseFdaDate(item.report_date);
    const recallInitiationDate = OpenFdaAdapter.parseFdaDate(item.recall_initiation_date);
    const eventDate = reportDate; // eventDate = report_date per spec

    const country = item.country ? item.country.trim() : null;
    const eventId = item.event_id ? String(item.event_id).trim() : null;

    // URL without API key (UI labels it "raw FDA record")
    const cleanUrl = rawRecallNumber
      ? `https://api.fda.gov/drug/enforcement.json?search=recall_number:"${encodeURIComponent(rawRecallNumber)}"`
      : `https://api.fda.gov/drug/enforcement.json?search=event_id:"${encodeURIComponent(eventId || '')}"`;

    const raw = OpenFdaAdapter.sanitizeRawRecord(item);
    const contentHash = computeContentHash(raw);

    return {
      source: this.source,
      sourceId,
      signalType: 'recall',
      trust: 'official',
      firmName,
      severityRaw,
      severityNum,
      title,
      summary,
      eventDate,
      recallInitiationDate,
      reportDate,
      country,
      eventId,
      url: cleanUrl,
      raw,
      contentHash,
    };
  }

  /**
   * Generates calendar-month chunks between startDate and endDate
   * Dates in YYYYMMDD format
   */
  static generateMonthChunks(
    startDateStr: string,
    endDateStr: string
  ): Array<{ start: string; end: string }> {
    const startYear = parseInt(startDateStr.slice(0, 4), 10);
    const startMonth = parseInt(startDateStr.slice(4, 6), 10) - 1;
    const startDay = parseInt(startDateStr.slice(6, 8), 10);

    const endYear = parseInt(endDateStr.slice(0, 4), 10);
    const endMonth = parseInt(endDateStr.slice(4, 6), 10) - 1;
    const endDay = parseInt(endDateStr.slice(6, 8), 10);

    const start = new Date(Date.UTC(startYear, startMonth, startDay));
    const end = new Date(Date.UTC(endYear, endMonth, endDay));

    const chunks: Array<{ start: string; end: string }> = [];
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    while (current <= end) {
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth();

      // First day of chunk
      const chunkStart = current < start ? start : current;

      // Last day of month
      const nextMonthFirst = new Date(Date.UTC(year, month + 1, 1));
      const lastDayOfMonth = new Date(nextMonthFirst.getTime() - 24 * 60 * 60 * 1000);
      const chunkEnd = lastDayOfMonth > end ? end : lastDayOfMonth;

      const format = (d: Date) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}${m}${day}`;
      };

      chunks.push({
        start: format(chunkStart),
        end: format(chunkEnd),
      });

      // Move to next month
      current = nextMonthFirst;
    }

    return chunks;
  }

  /**
   * Paced, retrying HTTP fetch
   */
  private async executeFetch(url: string): Promise<Response> {
    let attempt = 0;
    let delay = this.initialBackoffMs;

    while (attempt <= this.maxRetries) {
      // Respect pacing delay (at most 2 requests/sec)
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.pacingDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.pacingDelayMs - elapsed));
      }
      this.lastRequestTime = Date.now();

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await this.fetchFn(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });
        clearTimeout(timer);

        if (response.ok) {
          return response;
        }

        // 404 from openFDA means no matching records found
        if (response.status === 404) {
          return response;
        }

        // Retryable: 429 or 5xx
        if (response.status === 429 || response.status >= 500) {
          attempt++;
          if (attempt > this.maxRetries) {
            throw new Error(`HTTP ${response.status}: Failed after ${this.maxRetries} retries`);
          }

          let waitTime = delay;
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const parsedSeconds = parseInt(retryAfter, 10);
            if (!isNaN(parsedSeconds)) {
              waitTime = parsedSeconds * 1000;
            }
          } else {
            // Exponential backoff + jitter
            const jitter = Math.random() * 300;
            waitTime = delay + jitter;
            delay *= 2;
          }

          logger.warn(
            {
              status: response.status,
              attempt,
              waitTimeMs: Math.round(waitTime),
              url: redactApiKey(url, this.apiKey),
            },
            'openFDA returned retryable error; waiting before retry'
          );

          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // Non-retryable 4xx error
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${redactApiKey(text, this.apiKey)}`);
      } catch (err: any) {
        attempt++;
        if (attempt > this.maxRetries) {
          const safeMessage = redactApiKey(err.message || String(err), this.apiKey);
          logger.error({ err: safeMessage, url: redactApiKey(url, this.apiKey) }, 'openFDA fetch failed permanently');
          throw new Error(safeMessage);
        }

        const jitter = Math.random() * 300;
        const waitTime = delay + jitter;
        delay *= 2;

        logger.warn(
          {
            err: redactApiKey(err.message || String(err), this.apiKey),
            attempt,
            waitTimeMs: Math.round(waitTime),
            url: redactApiKey(url, this.apiKey),
          },
          'openFDA network error; waiting before retry'
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('Unexpected retry loop exhaustion');
  }

  /**
   * Fetches single sub-window with pagination
   */
  private async fetchChunk(
    start: string,
    end: string,
    onProgress?: (chunk: NormalizedRecord[]) => Promise<void>
  ): Promise<{ records: NormalizedRecord[]; sourceLastUpdated: Date | null }> {
    const limit = 100;
    let skip = 0;
    let total = 0;
    let sourceLastUpdated: Date | null = null;
    const records: NormalizedRecord[] = [];

    while (true) {
      let queryUrl = `${this.baseUrl}?search=report_date:[${start}+TO+${end}]&limit=${limit}&skip=${skip}`;
      if (this.apiKey) {
        queryUrl += `&api_key=${encodeURIComponent(this.apiKey)}`;
      }

      const response = await this.executeFetch(queryUrl);

      if (response.status === 404) {
        // No records in this date window
        break;
      }

      let data: OpenFdaApiResponse;
      try {
        data = (await response.json()) as OpenFdaApiResponse;
      } catch (err: any) {
        throw new Error(`Malformed JSON from openFDA: ${redactApiKey(err.message, this.apiKey)}`);
      }

      if (data.meta?.last_updated) {
        sourceLastUpdated = new Date(data.meta.last_updated);
      }

      total = data.meta?.results?.total ?? 0;

      // Detect if window would exceed skip limit (~25,000) and split if on first page
      if (skip === 0 && total > 25000) {
        logger.warn(
          { start, end, total },
          'openFDA chunk exceeds skip limit; splitting window further'
        );
        return this.splitAndFetch(start, end, onProgress);
      }

      const rawItems = data.results || [];
      if (rawItems.length === 0) {
        break;
      }

      const normalizedChunk: NormalizedRecord[] = [];
      for (const rawItem of rawItems) {
        const norm = this.normalizeRecord(rawItem);
        if (norm) {
          normalizedChunk.push(norm);
        }
      }

      records.push(...normalizedChunk);

      if (onProgress && normalizedChunk.length > 0) {
        await onProgress(normalizedChunk);
      }

      skip += limit;
      if (skip >= total || rawItems.length < limit) {
        break;
      }
    }

    return { records, sourceLastUpdated };
  }

  /**
   * Split oversize window into two halves and fetch each
   */
  private async splitAndFetch(
    start: string,
    end: string,
    onProgress?: (chunk: NormalizedRecord[]) => Promise<void>
  ): Promise<{ records: NormalizedRecord[]; sourceLastUpdated: Date | null }> {
    const startDate = OpenFdaAdapter.parseFdaDate(start)!;
    const endDate = OpenFdaAdapter.parseFdaDate(end)!;
    const midTime = startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2;
    const midDate = new Date(midTime);

    const format = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };

    const midStr = format(midDate);
    const nextDay = new Date(midDate.getTime() + 24 * 60 * 60 * 1000);
    const nextDayStr = format(nextDay);

    const firstHalf = await this.fetchChunk(start, midStr, onProgress);
    const secondHalf = await this.fetchChunk(nextDayStr, end, onProgress);

    return {
      records: [...firstHalf.records, ...secondHalf.records],
      sourceLastUpdated: secondHalf.sourceLastUpdated || firstHalf.sourceLastUpdated,
    };
  }

  /**
   * Main entry point to fetch an entire date window in calendar month chunks
   */
  async fetchWindow(
    startDateStr: string,
    endDateStr: string,
    onProgress?: (chunk: NormalizedRecord[]) => Promise<void>
  ): Promise<FetchWindowResult> {
    const chunks = OpenFdaAdapter.generateMonthChunks(startDateStr, endDateStr);
    logger.info(
      {
        source: this.source,
        startDate: startDateStr,
        endDate: endDateStr,
        chunkCount: chunks.length,
      },
      'Starting window-based openFDA ingestion'
    );

    const allRecords: NormalizedRecord[] = [];
    let latestSourceUpdate: Date | null = null;
    let partialFailures = 0;

    for (const chunk of chunks) {
      try {
        const result = await this.fetchChunk(chunk.start, chunk.end, onProgress);
        allRecords.push(...result.records);
        if (result.sourceLastUpdated) {
          latestSourceUpdate = result.sourceLastUpdated;
        }
      } catch (err: any) {
        partialFailures++;
        logger.error(
          {
            chunk,
            err: redactApiKey(err.message || String(err), this.apiKey),
          },
          'openFDA chunk failed after retries; continuing with next chunk'
        );
      }
    }

    if (partialFailures > 0 && allRecords.length === 0) {
      throw new Error(`All ${partialFailures} chunks failed during openFDA ingestion`);
    }

    return {
      records: allRecords,
      sourceLastUpdated: latestSourceUpdate,
      totalAvailable: allRecords.length,
    };
  }
}
