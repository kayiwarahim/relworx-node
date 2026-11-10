export interface RelworxErrorOptions {
  httpStatus?: number;
  responseBody?: unknown;
  relworxCode?: string;
  outcomeUnknown?: boolean;
  cause?: unknown;
}

export class RelworxError extends Error {
  readonly httpStatus?: number;
  readonly responseBody?: unknown;
  readonly relworxCode?: string;
  readonly outcomeUnknown: boolean;

  constructor(message: string, options: RelworxErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "RelworxError";
    this.httpStatus = options.httpStatus;
    this.responseBody = options.responseBody;
    this.relworxCode = options.relworxCode;
    this.outcomeUnknown = options.outcomeUnknown ?? false;
  }
}
