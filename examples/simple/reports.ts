/**
 * Pulling reports — campaign performance, publisher earnings, and an
 * advertiser's overall spend/performance across campaigns.
 *
 * Run: npx ts-node examples/simple/reports.ts
 */

import { AdveroClient, AdveroApiException } from '../../src';

const client = new AdveroClient(
  process.env.ADVERO_BASE_URL || 'https://api-advero.domain.com',
  process.env.ADVERO_API_KEY || 'YOUR_API_KEY',
  process.env.ADVERO_API_SECRET || 'YOUR_API_SECRET'
);

const dateRange = {
  from_date: '2026-10-01',
  to_date: '2026-10-31',
};

async function main() {
  // Per-campaign performance (impressions, clicks, spend) — only for
  // campaigns your organization owns as advertiser.
  const campaignId = 123;
  const campaignReport = await client.getCampaignReport(campaignId, dateRange);
  console.log(
    `Campaign #${campaignId}: ${campaignReport.impressions} impressions, ${campaignReport.clicks} clicks, ${campaignReport.spend} spent`
  );

  // Publisher earnings across all of your properties/placements.
  const publisherReport = await client.getPublisherReport(dateRange);
  console.log(`Publisher earnings: ${publisherReport.total_earnings}`);

  // Advertiser spend/performance across all of your campaigns.
  const advertiserReport = await client.getAdvertiserReport(dateRange);
  console.log(`Advertiser total spend: ${advertiserReport.total_spend}`);
}

main().catch((e) => {
  if (e instanceof AdveroApiException) {
    console.error(`Advero API error: ${e.message} (${e.apiCode}, HTTP ${e.statusCode})`);
  } else {
    console.error(`Request failed: ${e.message}`);
  }
  process.exit(1);
});
