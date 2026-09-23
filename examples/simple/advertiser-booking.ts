/**
 * Advertiser side: browse the marketplace, get a quote, create a campaign +
 * line item for a placement, attach a creative, and start the campaign
 * (which holds the budget from your wallet).
 *
 * Run: npx ts-node examples/simple/advertiser-booking.ts
 */

import { AdveroClient, AdveroApiException } from '../../src';

const client = new AdveroClient(
  process.env.ADVERO_BASE_URL || 'https://api-advero.domain.com',
  process.env.ADVERO_API_KEY || 'YOUR_API_KEY',
  process.env.ADVERO_API_SECRET || 'YOUR_API_SECRET'
);

async function main() {
  // 0. Check your wallet has enough available_balance before booking —
  //    starting a campaign later will fail with a 422 if it doesn't.
  const wallet = await client.getWallet();
  console.log(`Available balance: ${wallet.available_balance}`);

  // 1. Browse inventory. This never includes your own organization's
  //    placements, or placements with no pricing plan set — nothing
  //    returned here is unbookable. `keyword` matches property/placement
  //    name (drop it, or replace 'tech' below, to browse everything).
  let inventory = await client.getInventory({ keyword: 'tech', per_page: 20 });
  let placement = inventory.data[0];
  if (!placement) {
    // Nothing matched 'tech' — fall back to the first available placement.
    inventory = await client.getInventory({ per_page: 1 });
    placement = inventory.data[0];
  }
  if (!placement) {
    throw new Error('No inventory available to book.');
  }
  console.log(`Booking placement #${placement.id} (${placement.name})`);
  const pricingPlan = placement.pricing_plans[0];

  // 2. Get a quote first — the price for a CPD plan depends on the date
  //    range, and a FIXED plan's end_date is computed server-side from its
  //    own duration_days (don't compute either yourself).
  const quoteParams: Record<string, any> = {
    pricing_plan_id: pricingPlan.id,
    start_date: '2026-11-01',
  };
  if (pricingPlan.type !== 'FIXED') {
    quoteParams.end_date = '2026-11-07';
  }
  if (pricingPlan.type === 'CPC') {
    // CPC has no fixed cost of its own — you choose how much to hold as a
    // spending cap, billed per click as it runs.
    quoteParams.max_budget = 200000;
  }
  const quote = await client.quoteInventory(placement.id, quoteParams);
  console.log(`Quote: ${quote.total_amount} for ${quote.days ?? quote.duration_days ?? 'n/a'} day(s)`);

  // 3. Create the campaign, then a line item for the quoted placement.
  const campaign = await client.createCampaign({
    name: 'Q4 Launch',
    start_date: quoteParams.start_date,
    end_date: quote.end_date,
  });

  const lineItemData: Record<string, any> = {
    placement_id: placement.id,
    pricing_plan_id: pricingPlan.id,
    start_date: quoteParams.start_date,
    end_date: quote.end_date,
  };
  if (pricingPlan.type === 'CPC') {
    lineItemData.max_budget = quoteParams.max_budget;
  }
  const lineItem = await client.createCampaignLineItem(campaign.id, lineItemData);

  // 4. Attach a creative. file_url must already be a publicly reachable URL
  //    (e.g. uploaded to S3 by your own app beforehand) — this endpoint
  //    does not accept raw image bytes.
  await client.createLineItemCreative(lineItem.id, {
    file_url: 'https://cdn.example.com/creatives/banner.png',
    width: 300,
    height: 250,
    click_url: 'https://example.com/landing',
  });

  // 5. Start the campaign. This holds the quoted amount from your wallet and
  //    throws (VALIDATION_ERROR/insufficient balance) if it can't.
  await client.startCampaign(campaign.id);
  console.log(`Campaign #${campaign.id} started.`);
}

main().catch((e) => {
  if (e instanceof AdveroApiException) {
    console.error(`Advero API error: ${e.message} (${e.apiCode}, HTTP ${e.statusCode})`);
  } else {
    console.error(`Request failed: ${e.message}`);
  }
  process.exit(1);
});
