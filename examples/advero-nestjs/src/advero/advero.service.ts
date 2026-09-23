import { Inject, Injectable } from '@nestjs/common';
import type { AdveroClient } from 'advero-node';
import { ADVERO_CLIENT, ADVERO_MODULE_OPTIONS } from './advero.constants';
import type { AdveroDashboardWidgetKey, AdveroModuleOptions } from './advero.interface';

export interface AdveroCachedResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /** Bucket boundary (ms epoch, floored down to cacheBucketMinutes) this result belongs to. */
  fetchedAt: number;
  fromCache: boolean;
}

interface CacheEntry {
  bucketTs: number;
  payload: unknown;
}

/**
 * Wraps AdveroClient with the same cache-bucket strategy as advero-ci3's
 * Advero_dashboard::fetchWithCache(): each (key + filters) combination is
 * cached for cacheBucketMinutes at a time, keyed by the current bucket
 * boundary — so the cache expires by construction (once the boundary moves,
 * the old key is never looked up again) without a separate TTL sweep.
 *
 * Uses a plain in-memory Map instead of @nestjs/cache-manager to keep this
 * example dependency-free (mirrors advero-php's zero-dependency ethos) — for
 * a multi-instance/production deployment, swap this for a shared cache
 * (Redis via @nestjs/cache-manager) so buckets are consistent across
 * instances; the bucket-key logic below stays the same either way.
 */
@Injectable()
export class AdveroService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(ADVERO_CLIENT) private readonly client: AdveroClient,
    @Inject(ADVERO_MODULE_OPTIONS) private readonly options: AdveroModuleOptions
  ) {}

  /** Direct access to the underlying AdveroClient for anything not covered by the cached helpers below. */
  getClient(): AdveroClient {
    return this.client;
  }

  /**
   * Mirrors advero-ci3's dashboard_widgets[].enabled — a key left out of
   * AdveroModuleOptions.widgets defaults to enabled, so existing configs
   * that never set `widgets` keep showing every widget unchanged.
   */
  isWidgetEnabled(key: AdveroDashboardWidgetKey): boolean {
    return this.options.widgets?.[key] !== false;
  }

  async getWalletCached(): Promise<AdveroCachedResult<any>> {
    return this.fetchWithCache('wallet', {}, () => this.client.getWallet());
  }

  async getRecentCampaignsCached(limit = 5): Promise<AdveroCachedResult<any>> {
    return this.fetchWithCache('campaigns', { limit }, async () => {
      const campaigns = await this.client.getCampaigns();
      return Array.isArray(campaigns) ? campaigns.slice(0, limit) : campaigns;
    });
  }

  async getInventoryCached(perPage = 5): Promise<AdveroCachedResult<any>> {
    const filters = { per_page: perPage };
    return this.fetchWithCache('inventory', filters, () => this.client.getInventory(filters));
  }

  async getAdvertiserReportCached(days = 30): Promise<AdveroCachedResult<any>> {
    const filters = this.lastNDaysRange(days);
    return this.fetchWithCache('advertiser_report', filters, () => this.client.getAdvertiserReport(filters));
  }

  async getPublisherReportCached(days = 30): Promise<AdveroCachedResult<any>> {
    const filters = this.lastNDaysRange(days);
    return this.fetchWithCache('publisher_report', filters, () => this.client.getPublisherReport(filters));
  }

  /**
   * Shared cache/error/fetchedAt wrapper, one per dashboard data point —
   * equivalent to Advero_dashboard::fetchWithCache() in advero-ci3.
   * A failed call is never cached, so a transient outage self-heals on the
   * very next request instead of being "stuck" showing an error.
   */
  private async fetchWithCache<T>(
    key: string,
    filters: Record<string, unknown>,
    fetch: () => Promise<T>
  ): Promise<AdveroCachedResult<T>> {
    const bucketMinutes = Math.max(1, this.options.cacheBucketMinutes ?? 30);
    const bucketTs = this.currentBucketTimestamp(bucketMinutes);
    const cacheKey = this.buildCacheKey(key, filters, bucketTs);

    const cached = this.cache.get(cacheKey);
    if (cached && cached.bucketTs === bucketTs) {
      return { ok: true, data: cached.payload as T, fetchedAt: bucketTs, fromCache: true };
    }

    try {
      const data = await fetch();
      this.cache.set(cacheKey, { bucketTs, payload: data });
      return { ok: true, data, fetchedAt: bucketTs, fromCache: false };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err), fetchedAt: bucketTs, fromCache: false };
    }
  }

  private buildCacheKey(key: string, filters: Record<string, unknown>, bucketTs: number): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = filters[k];
        return acc;
      }, {});
    return `advero_dashboard_${key}_${JSON.stringify(sortedFilters)}_${bucketTs}`;
  }

  /** Current time floored down to the nearest bucketMinutes boundary (ms epoch). */
  private currentBucketTimestamp(bucketMinutes: number): number {
    const bucketMs = bucketMinutes * 60 * 1000;
    return Math.floor(Date.now() / bucketMs) * bucketMs;
  }

  private lastNDaysRange(days: number): { from_date: string; to_date: string } {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    return { from_date: this.formatDate(fromDate), to_date: this.formatDate(toDate) };
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
