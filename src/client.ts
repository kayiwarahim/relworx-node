import { RelworxError } from "./errors.js";
import type { RelworxConfig, RelworxResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://payments.relworx.com/api";

export class RelworxClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly accountNo: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(config: RelworxConfig) {
    if (!config.apiKey?.trim() || !config.accountNo?.trim()) {
      throw new RelworxError("Relworx configuration requires apiKey and accountNo.");
    }

    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new RelworxError("Relworx baseUrl must be a valid HTTP or HTTPS URL.");
    }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new RelworxError("Relworx baseUrl must use HTTP or HTTPS.");
    }

    const timeoutMs = config.timeoutMs ?? 30_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new RelworxError("timeoutMs must be a positive integer.");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.accountNo = config.accountNo;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new RelworxError("A Fetch API implementation is required. Use Node.js 20 or later.");
    }
  }

  async get(path: string, query: Record<string, string> = {}): Promise<RelworxResponse> {
    const params = new URLSearchParams({ ...query, account_no: this.accountNo });
    return this.send(path, { method: "GET", query: params }, false);
  }

  async post(path: string, payload: Record<string, unknown>): Promise<RelworxResponse> {
    return this.send(path, {
      method: "POST",
      body: JSON.stringify({ ...payload, account_no: this.accountNo }),
    }, true);
  }

  private async send(
    path: string,
    request: { method: "GET" | "POST"; query?: URLSearchParams; body?: string },
    paymentRequest: boolean,
  ): Promise<RelworxResponse> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, "")}`);
    if (request.query) url.search = request.query.toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: request.method,
          headers: {
            Accept: "application/vnd.relworx.v2",
            Authorization: `Bearer ${this.apiKey}`,
            ...(request.body ? { "Content-Type": "application/json" } : {}),
          },
          ...(request.body ? { body: request.body } : {}),
          signal: controller.signal,
          redirect: "manual",
        });
      } catch (cause) {
        throw new RelworxError(
          paymentRequest
            ? "Could not confirm the Relworx payment request outcome because the connection failed. Check transaction status before attempting another payment."
            : "Could not connect to Relworx.",
          { outcomeUnknown: paymentRequest, cause },
        );
      }

      const raw = await response.text();
      let body: unknown = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = { raw };
        }
      }

      if (!response.ok) {
        const record = isRecord(body) ? body : {};
        const messageValue = record.message ?? record.error;
        const message = typeof messageValue === "string" ? messageValue : "Relworx API request failed.";
        throw new RelworxError(message, {
          httpStatus: response.status,
          responseBody: body,
          relworxCode: record.code === undefined ? undefined : String(record.code),
          outcomeUnknown: paymentRequest && (response.status >= 500 || response.status >= 300 && response.status < 400),
        });
      }

      if (!isRecord(body)) {
        throw new RelworxError("Relworx returned an invalid JSON response.", { httpStatus: response.status });
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isRecord(value: unknown): value is RelworxResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
