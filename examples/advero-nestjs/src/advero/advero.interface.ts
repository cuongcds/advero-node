import type { ModuleMetadata, Type } from '@nestjs/common';

/** Keys match AdveroService's *Cached() methods / the dashboard response's widgets.{key}. */
export type AdveroDashboardWidgetKey =
  | 'wallet'
  | 'campaigns'
  | 'inventory'
  | 'advertiser_report'
  | 'publisher_report';

export interface AdveroModuleOptions {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  /** Per-request HTTP timeout in ms, forwarded to AdveroClient. Default: 15000. */
  timeoutMs?: number;
  /**
   * Dashboard cache bucket size in minutes, mirroring advero-ci3's
   * cache_bucket_minutes. Default: 30.
   */
  cacheBucketMinutes?: number;
  /**
   * Per-widget on/off switch for GET /advero/dashboard, mirroring
   * advero-ci3's dashboard_widgets[].enabled — a widget set to `false` here
   * is never fetched (no AdveroClient call, no cache entry) and is omitted
   * from the response entirely, rather than being fetched and hidden.
   * Any key left out defaults to enabled (`true`), so existing configs
   * that don't set `widgets` keep showing every widget unchanged.
   */
  widgets?: Partial<Record<AdveroDashboardWidgetKey, boolean>>;
}

export interface AdveroOptionsFactory {
  createAdveroOptions(): Promise<AdveroModuleOptions> | AdveroModuleOptions;
}

export interface AdveroModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<AdveroOptionsFactory>;
  useClass?: Type<AdveroOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<AdveroModuleOptions> | AdveroModuleOptions;
  inject?: any[];
}
