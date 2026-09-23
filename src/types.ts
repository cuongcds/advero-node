/**
 * Response shapes are intentionally loose (Record<string, unknown> / generics)
 * rather than fully modeled interfaces per resource: the API contract lives in
 * exactly one place (the Advero backend's api/* controllers), and duplicating
 * every field here would drift out of sync with it. Callers who want strict
 * typing can cast the returned value to their own interface.
 */

/** A single JSON object as returned inside a response envelope's "data" field. */
export type AdveroRecord = Record<string, unknown>;

/** Arbitrary request body / query params passed through to the API as-is. */
export type AdveroParams = Record<string, string | number | boolean | undefined | null>;

/** Pagination / extra info carried by list endpoints alongside "data". */
export interface AdveroMeta {
  [key: string]: unknown;
}

/** Result of an endpoint whose response envelope includes a "meta" block. */
export interface AdveroListResult<T = AdveroRecord> {
  data: T;
  meta: AdveroMeta;
}

export interface AdveroClientOptions {
  /** Per-request timeout in milliseconds. Default: 15000. */
  timeoutMs?: number;
}
