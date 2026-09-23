import { AdveroApiException } from './errors';
import type { AdveroClientOptions, AdveroParams, AdveroRecord } from './types';

/**
 * Server-side API client for the Advero partner API (api/* on the Advero
 * backend, excluding Auth/Organization which are session/JWT-based and out
 * of scope for this client).
 *
 * Authenticates with a per-Organization API key + secret issued via the
 * Advero UI (organization/api-credentials), sent as
 * "Authorization: Bearer {apiKey}:{secret}".
 *
 * Usage:
 *   const client = new AdveroClient('https://api-advero.domain.com', apiKey, apiSecret);
 *   const wallet = await client.getWallet();
 */
export class AdveroClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly timeoutMs: number;

  /**
   * @param baseUrl Origin of the Advero API, e.g. "https://api-advero.domain.com"
   *   (no default — must always be supplied explicitly).
   * @param apiKey API key issued for the Organization.
   * @param apiSecret API secret paired with apiKey.
   * @param options optional settings (timeoutMs, default 15000).
   */
  constructor(baseUrl: string, apiKey: string, apiSecret: string, options: AdveroClientOptions = {}) {
    const trimmedBaseUrl = (baseUrl ?? '').trim();
    const trimmedApiKey = (apiKey ?? '').trim();
    const trimmedApiSecret = (apiSecret ?? '').trim();

    if (trimmedBaseUrl === '') {
      throw new TypeError(
        'AdveroClient: "baseUrl" is required (no default is provided — pass the Advero API endpoint for your account).'
      );
    }
    if (trimmedApiKey === '') {
      throw new TypeError('AdveroClient: "apiKey" is required.');
    }
    if (trimmedApiSecret === '') {
      throw new TypeError('AdveroClient: "apiSecret" is required.');
    }

    this.baseUrl = trimmedBaseUrl.replace(/\/+$/, '');
    this.apiKey = trimmedApiKey;
    this.apiSecret = trimmedApiSecret;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  // ---------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------

  /** GET api/properties */
  async getProperties(): Promise<any> {
    return this.request('GET', '/api/properties');
  }

  /**
   * POST api/properties
   * @param data name, domain, verify_method (dns_txt|html_tag)
   */
  async createProperty(data: AdveroRecord): Promise<any> {
    return this.request('POST', '/api/properties', data);
  }

  /** GET api/properties/{id} */
  async getProperty(propertyId: number): Promise<any> {
    return this.request('GET', `/api/properties/${propertyId}`);
  }

  /** PUT api/properties/{id} */
  async updateProperty(propertyId: number, data: AdveroRecord): Promise<any> {
    return this.request('PUT', `/api/properties/${propertyId}`, data);
  }

  /** DELETE api/properties/{id} */
  async deleteProperty(propertyId: number): Promise<any> {
    return this.request('DELETE', `/api/properties/${propertyId}`);
  }

  /** POST api/properties/{id}/verify */
  async verifyProperty(propertyId: number): Promise<any> {
    return this.request('POST', `/api/properties/${propertyId}/verify`);
  }

  /** GET api/properties/{id}/placements */
  async getPropertyPlacements(propertyId: number): Promise<any> {
    return this.request('GET', `/api/properties/${propertyId}/placements`);
  }

  /**
   * POST api/properties/{id}/placements
   * @param data name, ad_format_id
   */
  async createPlacement(propertyId: number, data: AdveroRecord): Promise<any> {
    return this.request('POST', `/api/properties/${propertyId}/placements`, data);
  }

  // ---------------------------------------------------------------------
  // Placements
  // ---------------------------------------------------------------------

  /** GET api/placements/{id} */
  async getPlacement(placementId: number): Promise<any> {
    return this.request('GET', `/api/placements/${placementId}`);
  }

  /** PUT api/placements/{id} */
  async updatePlacement(placementId: number, data: AdveroRecord): Promise<any> {
    return this.request('PUT', `/api/placements/${placementId}`, data);
  }

  /** DELETE api/placements/{id} */
  async deletePlacement(placementId: number): Promise<any> {
    return this.request('DELETE', `/api/placements/${placementId}`);
  }

  // ---------------------------------------------------------------------
  // Pricing plans
  // ---------------------------------------------------------------------

  /** GET api/pricing-plans?placement_id={placementId} */
  async getPricingPlans(placementId: number): Promise<any> {
    return this.request('GET', '/api/pricing-plans', null, { placement_id: placementId });
  }

  /**
   * POST api/pricing-plans
   * @param data placement_id, type (CPD|CPC|FIXED), price, duration_days
   *   (required when type=FIXED), currency (optional, default VND)
   */
  async createPricingPlan(data: AdveroRecord): Promise<any> {
    return this.request('POST', '/api/pricing-plans', data);
  }

  /** GET api/pricing-plans/{id} */
  async getPricingPlan(pricingPlanId: number): Promise<any> {
    return this.request('GET', `/api/pricing-plans/${pricingPlanId}`);
  }

  /** PUT api/pricing-plans/{id} */
  async updatePricingPlan(pricingPlanId: number, data: AdveroRecord): Promise<any> {
    return this.request('PUT', `/api/pricing-plans/${pricingPlanId}`, data);
  }

  /** DELETE api/pricing-plans/{id} */
  async deletePricingPlan(pricingPlanId: number): Promise<any> {
    return this.request('DELETE', `/api/pricing-plans/${pricingPlanId}`);
  }

  // ---------------------------------------------------------------------
  // Marketplace / Inventory
  // ---------------------------------------------------------------------

  /**
   * GET api/inventory
   * @param params optional filters: ad_format_id, min_price, max_price, keyword, page, per_page
   */
  async getInventory(params: AdveroParams = {}): Promise<any> {
    return this.request('GET', '/api/inventory', null, params);
  }

  /**
   * GET api/inventory/{placementId}/quote
   * @param params pricing_plan_id (required), start_date (required),
   *   end_date (required unless the pricing plan is FIXED), max_budget (required when pricing plan is CPC)
   */
  async quoteInventory(placementId: number, params: AdveroParams): Promise<any> {
    return this.request('GET', `/api/inventory/${placementId}/quote`, null, params);
  }

  // ---------------------------------------------------------------------
  // Wallet
  // ---------------------------------------------------------------------

  /** GET api/wallet */
  async getWallet(): Promise<any> {
    return this.request('GET', '/api/wallet');
  }

  /**
   * GET api/wallet/transactions
   * @param params optional: page, per_page (10|20|50|100|200), from_date, to_date
   */
  async getWalletTransactions(params: AdveroParams = {}): Promise<any> {
    return this.request('GET', '/api/wallet/transactions', null, params);
  }

  // ---------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------

  /** GET api/campaigns */
  async getCampaigns(): Promise<any> {
    return this.request('GET', '/api/campaigns');
  }

  /**
   * POST api/campaigns
   * @param data name, start_date, end_date
   */
  async createCampaign(data: AdveroRecord): Promise<any> {
    return this.request('POST', '/api/campaigns', data);
  }

  /** GET api/campaigns/{id} */
  async getCampaign(campaignId: number): Promise<any> {
    return this.request('GET', `/api/campaigns/${campaignId}`);
  }

  /** PUT api/campaigns/{id} */
  async updateCampaign(campaignId: number, data: AdveroRecord): Promise<any> {
    return this.request('PUT', `/api/campaigns/${campaignId}`, data);
  }

  /** DELETE api/campaigns/{id} */
  async deleteCampaign(campaignId: number): Promise<any> {
    return this.request('DELETE', `/api/campaigns/${campaignId}`);
  }

  /** GET api/campaigns/{id}/line-items */
  async getCampaignLineItems(campaignId: number): Promise<any> {
    return this.request('GET', `/api/campaigns/${campaignId}/line-items`);
  }

  /**
   * POST api/campaigns/{id}/line-items
   * @param data placement_id, pricing_plan_id, start_date, end_date,
   *   max_budget (required when the pricing plan is CPC)
   */
  async createCampaignLineItem(campaignId: number, data: AdveroRecord): Promise<any> {
    return this.request('POST', `/api/campaigns/${campaignId}/line-items`, data);
  }

  /** POST api/campaigns/{id}/start */
  async startCampaign(campaignId: number): Promise<any> {
    return this.request('POST', `/api/campaigns/${campaignId}/start`);
  }

  // ---------------------------------------------------------------------
  // Line items
  // ---------------------------------------------------------------------

  /** GET api/line-items/{id} */
  async getLineItem(lineItemId: number): Promise<any> {
    return this.request('GET', `/api/line-items/${lineItemId}`);
  }

  /** PUT api/line-items/{id} */
  async updateLineItem(lineItemId: number, data: AdveroRecord): Promise<any> {
    return this.request('PUT', `/api/line-items/${lineItemId}`, data);
  }

  /** DELETE api/line-items/{id} */
  async deleteLineItem(lineItemId: number): Promise<any> {
    return this.request('DELETE', `/api/line-items/${lineItemId}`);
  }

  /**
   * POST api/line-items/{id}/creative
   * @param data file_url, width, height, click_url (optional).
   *   file_url must already point to a file uploaded (e.g. S3 presigned upload) —
   *   this endpoint does not accept raw file bytes.
   */
  async createLineItemCreative(lineItemId: number, data: AdveroRecord): Promise<any> {
    return this.request('POST', `/api/line-items/${lineItemId}/creative`, data);
  }

  // ---------------------------------------------------------------------
  // Creatives
  // ---------------------------------------------------------------------

  /** GET api/creatives/{id} */
  async getCreative(creativeId: number): Promise<any> {
    return this.request('GET', `/api/creatives/${creativeId}`);
  }

  /** DELETE api/creatives/{id} */
  async deleteCreative(creativeId: number): Promise<any> {
    return this.request('DELETE', `/api/creatives/${creativeId}`);
  }

  // ---------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------

  /**
   * GET api/reports/campaigns/{id}
   * @param params optional: from_date, to_date
   */
  async getCampaignReport(campaignId: number, params: AdveroParams = {}): Promise<any> {
    return this.request('GET', `/api/reports/campaigns/${campaignId}`, null, params);
  }

  /**
   * GET api/reports/publisher
   * @param params optional: from_date, to_date
   */
  async getPublisherReport(params: AdveroParams = {}): Promise<any> {
    return this.request('GET', '/api/reports/publisher', null, params);
  }

  /**
   * GET api/reports/advertiser
   * @param params optional: from_date, to_date
   */
  async getAdvertiserReport(params: AdveroParams = {}): Promise<any> {
    return this.request('GET', '/api/reports/advertiser', null, params);
  }

  // ---------------------------------------------------------------------
  // HTTP transport
  // ---------------------------------------------------------------------

  /**
   * Returns the decoded "data" from a successful response. When the response
   * also carries a "meta" block (paginated list endpoints, e.g. getInventory()/
   * getWalletTransactions()), the return value is { data, meta } instead.
   */
  private async request(
    method: string,
    path: string,
    body: AdveroRecord | null = null,
    query: AdveroParams | null = null
  ): Promise<any> {
    let url = this.baseUrl + path;
    if (query && Object.keys(query).length > 0) {
      const usp = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        usp.append(key, String(value));
      }
      const qs = usp.toString();
      if (qs) url += '?' + qs;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}:${this.apiSecret}`,
      Accept: 'application/json',
    };

    const init: RequestInit = { method, headers };
    if (body !== null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    init.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err: any) {
      throw new Error(`AdveroClient: HTTP request failed: ${err?.message ?? String(err)}`);
    } finally {
      clearTimeout(timeout);
    }

    const statusCode = response.status;
    const rawBody = await response.text();

    let decoded: unknown;
    try {
      decoded = rawBody === '' ? {} : JSON.parse(rawBody);
    } catch {
      throw new Error(`AdveroClient: unexpected non-JSON response (HTTP ${statusCode})`);
    }

    if (decoded === null || typeof decoded !== 'object') {
      throw new Error(`AdveroClient: unexpected non-JSON response (HTTP ${statusCode})`);
    }

    if (statusCode >= 200 && statusCode < 300) {
      return this.parseSuccessResponse(decoded as AdveroRecord);
    }

    const errorBlock = (decoded as AdveroRecord).error as AdveroRecord | undefined;
    const message = (errorBlock?.message as string | undefined) ?? 'Advero API request failed';
    const code = (errorBlock?.code as string | undefined) ?? 'UNKNOWN_ERROR';
    throw new AdveroApiException(message, code, statusCode);
  }

  /**
   * Success envelope is { "data": ..., "meta"?: {...} }. Returns "data"
   * directly when there is no meta, or { data, meta } when meta is present
   * (list endpoints with pagination, e.g. getInventory()/getWalletTransactions()).
   */
  private parseSuccessResponse(decoded: AdveroRecord): any {
    const data = decoded.data ?? null;
    if (Object.prototype.hasOwnProperty.call(decoded, 'meta')) {
      return { data, meta: decoded.meta };
    }
    return data;
  }
}
