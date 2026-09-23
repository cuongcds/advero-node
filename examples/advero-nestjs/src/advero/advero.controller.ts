import { Controller, Get } from '@nestjs/common';
import { AdveroService } from './advero.service';

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
    const [wallet, campaigns, inventory, advertiserReport, publisherReport] = await Promise.all([
      this.advero.getWalletCached(),
      this.advero.getRecentCampaignsCached(5),
      this.advero.getInventoryCached(5),
      this.advero.getAdvertiserReportCached(30),
      this.advero.getPublisherReportCached(30),
    ]);

    return {
      widgets: {
        wallet,
        campaigns,
        inventory,
        advertiser_report: advertiserReport,
        publisher_report: publisherReport,
      },
    };
  }
}
