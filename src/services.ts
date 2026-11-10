import { RelworxClient } from "./client.js";
import { RelworxError } from "./errors.js";
import { validatePaymentRequest } from "./validation.js";
import type { PaymentRequest, RelworxResponse } from "./types.js";

export class CollectionsService {
  constructor(private readonly client: RelworxClient) {}

  request(data: PaymentRequest): Promise<RelworxResponse> {
    validatePaymentRequest(data);
    return this.client.post("/mobile-money/request-payment", {
      ...data,
      currency: data.currency.toUpperCase(),
    });
  }
}

export class DisbursementsService {
  constructor(private readonly client: RelworxClient) {}

  send(data: PaymentRequest): Promise<RelworxResponse> {
    validatePaymentRequest(data);
    return this.client.post("/mobile-money/send-payment", {
      ...data,
      currency: data.currency.toUpperCase(),
    });
  }
}

export class BalanceService {
  constructor(private readonly client: RelworxClient) {}

  get(currency = "UGX"): Promise<RelworxResponse> {
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new RelworxError("The currency must be a three-letter ISO currency code.");
    }
    return this.client.get("/mobile-money/check-wallet-balance", { currency: normalized });
  }
}

export class TransactionsService {
  constructor(private readonly client: RelworxClient) {}

  status(internalReference: string): Promise<RelworxResponse> {
    const reference = internalReference.trim();
    if (!reference) throw new RelworxError("An internal reference is required.");
    return this.client.get("/mobile-money/check-request-status", { internal_reference: reference });
  }

  history(): Promise<RelworxResponse> {
    return this.client.get("/payment-requests/transactions");
  }
}
