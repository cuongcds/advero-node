import type { ModuleMetadata, Type } from '@nestjs/common';

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
