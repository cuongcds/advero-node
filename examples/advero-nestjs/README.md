# advero-nestjs (example)

Drop-in NestJS module wrapping [`advero-node`](../../) for a NestJS backend
that needs to call the Advero partner API — mirrors the shape of
`examples/advero-ci3` in `advero-php` (an overview dashboard: wallet, recent
campaigns, inventory, advertiser/publisher reports), but as a NestJS
module + JSON endpoint instead of a CodeIgniter controller + HTML view.

## What this is not

Not a runnable standalone NestJS app — there's no `main.ts`/Nest CLI
bootstrap, no `.env`. It's the `src/advero/*` files you copy into an existing
NestJS project that already has its own `AppModule`/bootstrap.

## Collision-safe by design

Everything is prefixed `Advero*` / namespaced under `src/advero/`, so copying
this into a project that already has its own `DashboardModule` or generic
`CacheModule` won't collide:

```
src/
  advero/
    advero.module.ts        # AdveroModule (forRoot/forRootAsync)
    advero.service.ts       # AdveroService — cached wrapper over AdveroClient
    advero.controller.ts    # AdveroController — GET /advero/dashboard
    advero.constants.ts     # ADVERO_CLIENT / ADVERO_MODULE_OPTIONS DI tokens
    advero.interface.ts     # AdveroModuleOptions / forRootAsync() types
    index.ts                # barrel export
  app.module.example.ts     # how to import AdveroModule into your AppModule
```

## Install

From your NestJS project's root:

```bash
npm install advero-node
```

Copy `src/advero/` into your own `src/`. Nothing else in this example
package (its own `package.json`/`tsconfig.json`) needs to be copied — those
exist here only so this example typechecks on its own.

## Wiring into your AppModule

Synchronous (static credentials, e.g. straight from `process.env`):

```ts
import { Module } from '@nestjs/common';
import { AdveroModule } from './advero';

@Module({
  imports: [
    AdveroModule.forRoot({
      baseUrl: process.env.ADVERO_BASE_URL!,
      apiKey: process.env.ADVERO_API_KEY!,
      apiSecret: process.env.ADVERO_API_SECRET!,
      cacheBucketMinutes: 30, // optional, default 30
    }),
  ],
})
export class AppModule {}
```

Async (e.g. via `@nestjs/config`'s `ConfigService`) — see
`src/app.module.example.ts` for the full snippet:

```ts
AdveroModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    baseUrl: config.get('ADVERO_BASE_URL'),
    apiKey: config.get('ADVERO_API_KEY'),
    apiSecret: config.get('ADVERO_API_SECRET'),
  }),
});
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ADVERO_BASE_URL` | yes | Advero API origin, e.g. `https://api-advero.domain.com` |
| `ADVERO_API_KEY` | yes | API key from Organization > API credentials |
| `ADVERO_API_SECRET` | yes | API secret paired with the key above |

## Dashboard endpoint

`GET /advero/dashboard` returns:

```json
{
  "widgets": {
    "wallet": { "ok": true, "data": { "available_balance": 1234000 }, "fetchedAt": 1730000000000, "fromCache": false },
    "campaigns": { "ok": true, "data": [ /* latest 5 */ ], "fetchedAt": 1730000000000, "fromCache": true },
    "inventory": { "ok": true, "data": { "data": [ /* 5 items */ ], "meta": { "total": 42 } }, "fetchedAt": 1730000000000, "fromCache": true },
    "advertiser_report": { "ok": true, "data": { "total_spend": 500000 }, "fetchedAt": 1730000000000, "fromCache": true },
    "publisher_report": { "ok": true, "data": { "total_earnings": 200000 }, "fetchedAt": 1730000000000, "fromCache": false }
  }
}
```

Each widget's `ok`/`error`/`fetchedAt`/`fromCache` fields are independent —
one Advero API call failing only affects that widget's entry, the rest of
the response still returns normally (`Promise.all` over independently
try/caught calls, same principle as advero-ci3's per-widget error handling).

`fetchedAt` is the current cache bucket boundary (ms epoch, floored down to
`cacheBucketMinutes`) — the same "As of HH:MM" concept as advero-ci3, so every
request within the same 30-minute window returns the same `fetchedAt` for a
given widget/filter combination.

## Caching strategy

`AdveroService` caches each widget's result in a plain in-memory `Map`, keyed
by `widget key + sorted filters + current bucket boundary` — directly
equivalent to `Advero_dashboard::fetchWithCache()` in `advero-ci3`, just
without a file-cache driver. A failed call is **never** cached, so a
transient Advero API outage self-heals on the very next request instead of
serving a cached error for the rest of the bucket.

This example intentionally uses a bare `Map` rather than
`@nestjs/cache-manager`, to stay dependency-free like `advero-php`'s use of
built-in `curl`/`json`. Trade-off: the cache is per-process/per-instance —
fine for a single-instance deployment or local dev, but each replica in a
multi-instance deployment will independently hit the Advero API on its own
first request per bucket. If you run more than one instance behind a load
balancer, swap the `Map` in `AdveroService` for `@nestjs/cache-manager` with
a Redis store so all instances share one cache — the bucket-key logic
(`buildCacheKey`/`currentBucketTimestamp`) doesn't need to change, only where
`get`/`set` write to.

To change the bucket size, pass `cacheBucketMinutes` to `forRoot()`/
`forRootAsync()` — no other file needs to change.

## Beyond the dashboard endpoint

`AdveroService.getClient()` returns the raw `AdveroClient` instance for any
call not covered by the cached dashboard helpers (e.g. `createCampaign()`,
`verifyProperty()`) — inject `AdveroService` into your own service/controller
and call `.getClient().createCampaign(...)` directly; those calls are not
cached, matching that they're normally one-off writes, not repeated reads.
