/**
 * Publisher side: register a website, verify its domain, add a placement
 * and a pricing plan for it — everything a publisher needs before their
 * inventory can show up in the Advero marketplace.
 *
 * Run: npx ts-node examples/simple/publisher-onboarding.ts
 * (or compile with tsc and run the .js output — no framework required)
 */

import { AdveroClient, AdveroApiException } from '../../src';

// baseUrl/apiKey/apiSecret are never defaulted by the client — get your own
// from Organization > API Credentials in the Advero UI, and your own
// baseUrl from whoever manages your Advero deployment.
const client = new AdveroClient(
  process.env.ADVERO_BASE_URL || 'https://api-advero.domain.com',
  process.env.ADVERO_API_KEY || 'YOUR_API_KEY',
  process.env.ADVERO_API_SECRET || 'YOUR_API_SECRET'
);

async function main() {
  // 1. Register the website. verify_method is 'dns_txt' or 'html_tag' — see
  //    the response's domain verify_token for what to publish.
  const property = await client.createProperty({
    name: 'My Blog',
    domain: 'blog.example.com',
    verify_method: 'html_tag',
  });
  console.log(`Created property #${property.id}`);

  // 2. Once the meta tag/DNS record is actually in place on your site, ask
  //    Advero to check it. Repeat this call until it succeeds — it's a live
  //    check, not instant on creation.
  const verifyResult = await client.verifyProperty(property.id);
  for (const domainResult of verifyResult) {
    console.log(`  domain ${domainResult.domain}: ${domainResult.verified ? 'verified' : 'not verified yet'}`);
  }

  // 3. Add a placement (an ad slot on that site) — ad_format_id refers to a
  //    size Advero already has configured (e.g. 300x250).
  const placement = await client.createPlacement(property.id, {
    name: 'Sidebar 300x250',
    ad_format_id: 1,
  });
  console.log(`Created placement #${placement.id}`);

  // 4. Set a price for it. duration_days is required only when type is
  //    FIXED (the plan's price covers exactly that many days, computed from
  //    whatever start_date an advertiser later books).
  const pricingPlan = await client.createPricingPlan({
    placement_id: placement.id,
    type: 'CPD',
    price: 50000,
  });
  console.log(`Created pricing plan #${pricingPlan.id} (${pricingPlan.type} @ ${pricingPlan.price})`);
}

main().catch((e) => {
  if (e instanceof AdveroApiException) {
    // API responded with { "error": { "message", "code" } }
    console.error(`Advero API error: ${e.message} (${e.apiCode}, HTTP ${e.statusCode})`);
  } else {
    // Network error, timeout, or a non-JSON response
    console.error(`Request failed: ${e.message}`);
  }
  process.exit(1);
});
