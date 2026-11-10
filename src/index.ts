export { RelworxClient } from "./client.js";
export { RelworxError } from "./errors.js";
export { BalanceService, CollectionsService, DisbursementsService, TransactionsService } from "./services.js";
export { verifyWebhookSignature } from "./webhooks.js";
export type {
  PaymentRequest,
  RelworxConfig,
  RelworxResponse,
  WebhookPayload,
  WebhookVerificationOptions,
} from "./types.js";

import { RelworxClient } from "./client.js";
import { BalanceService, CollectionsService, DisbursementsService, TransactionsService } from "./services.js";
import type { RelworxConfig } from "./types.js";

export class Relworx {
  readonly collections: CollectionsService;
  readonly disbursements: DisbursementsService;
  readonly balance: BalanceService;
  readonly transactions: TransactionsService;

  constructor(config: RelworxConfig) {
    const client = new RelworxClient(config);
    this.collections = new CollectionsService(client);
    this.disbursements = new DisbursementsService(client);
    this.balance = new BalanceService(client);
    this.transactions = new TransactionsService(client);
  }
}

export function createRelworx(config: RelworxConfig): Relworx {
  return new Relworx(config);
}
