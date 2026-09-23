# advero-node

Server-side Node.js/TypeScript API client for the Advero API
(`api-advero.domain.com`). Lets a publisher/advertiser with a Node.js backend
call Advero directly — create/manage Campaigns, sync Wallet state,
register/verify Properties, book marketplace inventory, pull reports —
without going through the Advero UI.

This is distinct from the browser-side Advero SDKs (JS/Android/Swift/Flutter
client snippets publishers embed to *display* ads): `advero-node` is a
server-to-server HTTP client, has no DOM/browser code, and authenticates with
an API key/secret instead of a verified property key.

## Install

```bash
npm install advero-node
```

Requires **Node.js >= 18** (for built-in `fetch`/`AbortController` — see
[Design notes](#design-notes--implementation-choices)). No other runtime
dependencies.

## Authentication

Every request is authenticated as `Authorization: Bearer {apiKey}:{secret}`,
tied to your Organization.

To get an API key/secret pair:

1. Log in to Advero and go to **Organization settings > API credentials**
   (`/organization/api-credentials`).
2. Click **Create API credential**.
3. Copy both the **API key** and **API secret** shown — the secret is
   displayed only once, right after creation, and cannot be viewed again
   (revoke and create a new one if you lose it).

`AdveroClient` never assumes a default host — `baseUrl` is always a required
constructor argument, so you always point it explicitly at your Advero
instance (e.g. `https://api-advero.domain.com`). Ask whoever manages your
Advero deployment for the correct value if you don't already know it.

```ts
import { AdveroClient } from 'advero-node';

const client = new AdveroClient('https://api-advero.domain.com', apiKey, apiSecret);
```

Missing `baseUrl`, `apiKey`, or `apiSecret` throws `TypeError` immediately,
before any request is made — see [Design notes](#design-notes--implementation-choices)
for why `TypeError`.

## Usage

```ts
import { AdveroClient, AdveroApiException } from 'advero-node';

const client = new AdveroClient('https://api-advero.domain.com', apiKey, apiSecret);

async function main() {
  // Wallet
  const wallet = await client.getWallet();
  console.log(wallet.available_balance);

  // Properties (publisher side)
  const property = await client.createProperty({
    name: 'My Blog',
    domain: 'blog.example.com',
    verify_method: 'html_tag', // or 'dns_txt'
  });
  await client.verifyProperty(property.id);

  const placement = await client.createPlacement(property.id, {
    name: 'Sidebar 300x250',
    ad_format_id: 1,
  });

  // Marketplace (advertiser side)
  const inventory = await client.getInventory({ keyword: 'tech', per_page: 20 });
  for (const item of inventory.data) {
    // inventory also carries inventory.meta (total/page/per_page)
  }

  const quote = await client.quoteInventory(placement.id, {
    pricing_plan_id: 42,
    start_date: '2026-10-01',
    end_date: '2026-10-07',
  });

  // Campaigns
  const campaign = await client.createCampaign({
    name: 'Q4 Launch',
    start_date: '2026-10-01',
    end_date: '2026-10-31',
  });

  const lineItem = await client.createCampaignLineItem(campaign.id, {
    placement_id: placement.id,
    pricing_plan_id: 42,
    start_date: '2026-10-01',
    end_date: '2026-10-07',
    // max_budget: 500000, // required only when the pricing plan is CPC
  });

  await client.createLineItemCreative(lineItem.id, {
    file_url: 'https://cdn.example.com/creatives/banner.png',
    width: 300,
    height: 250,
    click_url: 'https://example.com/landing',
  });

  await client.startCampaign(campaign.id);

  // Reports
  const report = await client.getCampaignReport(campaign.id, {
    from_date: '2026-10-01',
    to_date: '2026-10-31',
  });
}

main().catch((e) => {
  if (e instanceof AdveroApiException) {
    // API responded with { "error": { "message", "code" } }
    console.error(`${e.message} (${e.apiCode}, HTTP ${e.statusCode})`);
  } else {
    // Network error, timeout, or a non-JSON response
    console.error(e.message);
  }
});
```

More end-to-end examples (publisher onboarding, advertiser booking flow
including the CPC `max_budget` case, pulling reports) are in
[`examples/simple/`](examples/simple/). For a fuller integration — a
NestJS module/service/controller exposing a widget-based Advero overview
dashboard, with bucketed caching — see
[`examples/advero-nestjs/`](examples/advero-nestjs/).

## Response shape

Advero's `api/*` endpoints return a consistent envelope:

- Success: `{ "data": ..., "meta": {...}? }`, HTTP 200.
- Error: `{ "error": { "message": "...", "code": "..." } }`, HTTP 4xx/5xx.

Every `AdveroClient` method returns the decoded `data` directly (an object,
or an array for a collection). If the response also has a `meta` block
(paginated endpoints), the method instead returns `{ data, meta }` so
pagination info isn't discarded — see `getInventory()`/
`getWalletTransactions()` in the example above.

On a non-2xx response, `AdveroClient` throws `AdveroApiException` (extends
`Error`) with `message`/`apiCode`/`statusCode` populated from the error
envelope, so callers never need to parse the JSON error body themselves.

## Method reference

| Domain | Methods | Endpoint(s) covered |
| --- | --- | --- |
| Properties | `getProperties()`, `createProperty()`, `getProperty()`, `updateProperty()`, `deleteProperty()`, `verifyProperty()`, `getPropertyPlacements()`, `createPlacement()` | `GET/POST api/properties`, `GET/PUT/DELETE api/properties/{id}`, `POST api/properties/{id}/verify`, `GET/POST api/properties/{id}/placements` |
| Placements | `getPlacement()`, `updatePlacement()`, `deletePlacement()` | `GET/PUT/DELETE api/placements/{id}` |
| Pricing plans | `getPricingPlans()`, `createPricingPlan()`, `getPricingPlan()`, `updatePricingPlan()`, `deletePricingPlan()` | `GET/POST api/pricing-plans`, `GET/PUT/DELETE api/pricing-plans/{id}` |
| Marketplace | `getInventory()`, `quoteInventory()` | `GET api/inventory`, `GET api/inventory/{id}/quote` |
| Wallet | `getWallet()`, `getWalletTransactions()` | `GET api/wallet`, `GET api/wallet/transactions` |
| Campaigns | `getCampaigns()`, `createCampaign()`, `getCampaign()`, `updateCampaign()`, `deleteCampaign()`, `getCampaignLineItems()`, `createCampaignLineItem()`, `startCampaign()` | `GET/POST api/campaigns`, `GET/PUT/DELETE api/campaigns/{id}`, `GET/POST api/campaigns/{id}/line-items`, `POST api/campaigns/{id}/start` |
| Line items | `getLineItem()`, `updateLineItem()`, `deleteLineItem()`, `createLineItemCreative()` | `GET/PUT/DELETE api/line-items/{id}`, `POST api/line-items/{id}/creative` |
| Creatives | `getCreative()`, `deleteCreative()` | `GET/DELETE api/creatives/{id}` |
| Reports | `getCampaignReport()`, `getPublisherReport()`, `getAdvertiserReport()` | `GET api/reports/campaigns/{id}`, `GET api/reports/publisher`, `GET api/reports/advertiser` |

`Auth`/`Organization` endpoints are intentionally **not** covered — they
authenticate a logged-in user/session via JWT, a different mechanism from the
Organization API key/secret this SDK uses, and are out of scope for a
server-to-server client.

## Design notes / implementation choices

- **CommonJS, not ESM.** `package.json` declares `"type": "commonjs"` with
  `main`/`types` pointing at `dist/`. Chosen over ESM because the primary
  target audience (a NestJS backend, per `examples/advero-nestjs/`) still
  defaults to CommonJS in most current project templates, and this way the
  package works with both `require()` and `import` (via `esModuleInterop`)
  without consumers needing `"type": "module"` in their own `package.json` or
  dealing with dual-package hazard. TypeScript is compiled once, to CJS.
- **Built-in `fetch`, not axios/node-fetch.** Keeps the package
  dependency-free at runtime. Requires Node >= 18 (`engines` field in
  `package.json`); `AbortController` (also built in since Node 15) is used to
  implement the request timeout.
- **`TypeError` for constructor validation**, not a custom
  `AdveroValidationError` — missing/blank `baseUrl`/`apiKey`/`apiSecret` is a
  programmer error (a misconfigured call site), not something calling code
  is expected to catch and branch on at runtime, so a built-in error type is
  enough; `AdveroApiException` is reserved for actual API error responses,
  which callers *are* expected to catch and inspect (`apiCode`/`statusCode`).
- **Loosely typed responses (`any` / `Record<string, unknown>`), not a fully
  modeled interface per resource.** The API response contract lives in
  exactly one place — the Advero backend's `api/*` controllers — and
  hand-modeling every field here would drift out of sync with it over time.
  Trade-off: no compile-time autocomplete on
  response fields; callers who want that can cast a method's result to their
  own interface (e.g. `const wallet = await client.getWallet() as MyWallet`).
  Request bodies/query params (`AdveroParams`) are typed just enough to catch
  obviously wrong value types (string/number/boolean) while still passing
  through whatever fields the API expects, for the same reason.
- **Field/query-param validation** (required fields per pricing plan type,
  etc.) is intentionally left to the API itself — the SDK passes your
  `data`/`params` object through as-is and surfaces any `422
  VALIDATION_ERROR` via `AdveroApiException`.

## Examples

- [`examples/simple/`](examples/simple/) — plain Node/TypeScript scripts, no
  framework: `publisher-onboarding.ts`, `advertiser-booking.ts`, `reports.ts`.
- [`examples/advero-nestjs/`](examples/advero-nestjs/) — `AdveroModule`
  (`forRoot`/`forRootAsync`), `AdveroService` (cached wrapper), and
  `AdveroController` (`GET /advero/dashboard`) for an existing NestJS
  project, with per-widget caching on a configurable time bucket and a
  `fetchedAt` timestamp on each result.
