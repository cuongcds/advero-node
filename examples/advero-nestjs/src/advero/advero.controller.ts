import { Controller, Get } from '@nestjs/common';
import type { AdveroDashboardWidgetKey } from './advero.interface';
import { AdveroCachedResult, AdveroService } from './advero.service';

/**
 * JSON equivalent of advero-ci3's Advero_dashboard controller: one endpoint
 * aggregating wallet, recent campaigns, inventory, and advertiser/publisher
 * reports, each independently cached and independently allowed to fail
 * (one widget's error never blocks the others).
 *
 * Route prefixed "advero" (collision-safe, mirrors advero-ci3's
 * Advero_dashboard/Advero_lib naming) — mount as-is or re-export under your
 * own prefix.
 */
@Controller('advero')
export class AdveroController {
  constructor(private readonly advero: AdveroService) {}

  @Get('dashboard')
  async dashboard() {
    // A disabled widget (AdveroModuleOptions.widgets.{key} === false) is
    // skipped entirely here — no AdveroClient call, no cache entry, and no
    // key in the response — rather than being fetched and then hidden.
    const fetchers: Record<AdveroDashboardWidgetKey, () => Promise<AdveroCachedResult<any>>> = {
      wallet: () => this.advero.getWalletCached(),
      campaigns: () => this.advero.getRecentCampaignsCached(5),
      inventory: () => this.advero.getInventoryCached(5),
      advertiser_report: () => this.advero.getAdvertiserReportCached(30),
      publisher_report: () => this.advero.getPublisherReportCached(30),
    };

    const enabledKeys = (Object.keys(fetchers) as AdveroDashboardWidgetKey[]).filter((key) =>
      this.advero.isWidgetEnabled(key)
    );
    const results = await Promise.all(enabledKeys.map((key) => fetchers[key]()));

    const widgets: Partial<Record<AdveroDashboardWidgetKey, AdveroCachedResult<any>>> = {};
    enabledKeys.forEach((key, i) => {
      widgets[key] = results[i];
    });

    return { widgets };
  }
}
