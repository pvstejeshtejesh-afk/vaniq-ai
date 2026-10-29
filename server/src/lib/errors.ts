// Standardized API error with HTTP status.
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new ApiError(400, 'bad_request', msg, details);
export const unauthorized = (msg = 'Authentication required') =>
  new ApiError(401, 'unauthorized', msg);
export const forbidden = (msg = 'Not permitted') => new ApiError(403, 'forbidden', msg);
export const notFound = (msg = 'Resource not found') => new ApiError(404, 'not_found', msg);
export const conflict = (msg: string) => new ApiError(409, 'conflict', msg);
export const tooMany = (msg = 'Too many requests') => new ApiError(429, 'rate_limited', msg);
