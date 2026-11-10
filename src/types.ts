export interface RelworxConfig {
  apiKey: string;
  accountNo: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export interface PaymentRequest {
  reference: string;
  msisdn: string;
  currency: string;
  amount: number;
  description?: string;
  [key: string]: unknown;
}

export type RelworxResponse = Record<string, unknown>;

export interface WebhookPayload {
  status: string;
  customer_reference: string;
  internal_reference: string;
  [key: string]: unknown;
}

export interface WebhookVerificationOptions {
  webhookUrl: string;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}
