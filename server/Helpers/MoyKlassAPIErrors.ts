/** Base error for MoyKlass API interactions. */
export class MoyKlassApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'MoyKlassApiError';
    Object.setPrototypeOf(this, MoyKlassApiError.prototype);
  }
}

/** Error for authentication failures (e.g., 401 Unauthorized). */
export class MoyKlassAuthError extends MoyKlassApiError {
  constructor(message: string = 'Authentication failed. Invalid API Key or token.', status: number = 401) {
    super(message, status);
    this.name = 'MoyKlassAuthError';
    Object.setPrototypeOf(this, MoyKlassAuthError.prototype);
  }
}

/** Error for requests resulting in 404 Not Found. */
export class MoyKlassNotFoundError extends MoyKlassApiError {
  constructor(message: string = 'Resource not found.', status: number = 404) {
    super(message, status);
    this.name = 'MoyKlassNotFoundError';
    Object.setPrototypeOf(this, MoyKlassNotFoundError.prototype);
  }
}

/** Error for requests resulting in 400 Bad Request. */
export class MoyKlassBadRequestError extends MoyKlassApiError {
  constructor(message: string = 'Bad request. Check your parameters.', status: number = 400) {
    super(message, status);
    this.name = 'MoyKlassBadRequestError';
    Object.setPrototypeOf(this, MoyKlassBadRequestError.prototype);
  }
}

/** Error for API rate limit exceeded (e.g., 429 Too Many Requests). */
export class MoyKlassRateLimitError extends MoyKlassApiError {
  constructor(message: string = 'API rate limit exceeded. Please try again later.', status: number = 429) {
    super(message, status);
    this.name = 'MoyKlassRateLimitError';
    Object.setPrototypeOf(this, MoyKlassRateLimitError.prototype);
  }
}

/** Generic error for network or unexpected Axios errors. */
export class MoyKlassNetworkError extends MoyKlassApiError {
  constructor(message: string = 'Network error or unexpected API response.', originalError?: Error) {
    super(message);
    this.name = 'MoyKlassNetworkError';
    if (originalError) {
      this.message = `${message} Original error: ${originalError.message}`;
    }
    Object.setPrototypeOf(this, MoyKlassNetworkError.prototype);
  }
}
