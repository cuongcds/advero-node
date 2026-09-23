/**
 * Thrown when the Advero API returns an error envelope
 * ({ "error": { "message", "code" } }) on a non-2xx response.
 */
export class AdveroApiException extends Error {
  /** Machine-readable error code from the API response's error.code field. */
  public readonly apiCode: string;
  /** HTTP status code of the failed response. */
  public readonly statusCode: number;

  constructor(message: string, apiCode: string, statusCode: number) {
    super(message);
    this.name = 'AdveroApiException';
    this.apiCode = apiCode;
    this.statusCode = statusCode;
    // Restore prototype chain (needed when targeting ES2020 down-compiled by some bundlers).
    Object.setPrototypeOf(this, AdveroApiException.prototype);
  }
}
