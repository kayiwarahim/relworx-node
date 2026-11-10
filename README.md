# Relworx Node.js SDK

[![CI](https://github.com/kayiwarahim/relworx-node/actions/workflows/ci.yml/badge.svg)](https://github.com/kayiwarahim/relworx-node/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@kayiwarahim/relworx.svg)](https://www.npmjs.com/package/@kayiwarahim/relworx)
[![License](https://img.shields.io/npm/l/@kayiwarahim/relworx.svg)](LICENSE)

A TypeScript-first Node.js SDK for the Relworx mobile-money API. It works with JavaScript and TypeScript applications, including Express, Fastify, NestJS and Next.js server-side code.

> Initial development release. Validate credentials and payment behaviour in the Relworx sandbox before production use.

## Requirements

- Node.js 20 or later (uses the built-in Fetch API).
- A Relworx business account, API key and account number.

## Installation

```bash
npm install @kayiwarahim/relworx
```

## Setup

```ts
import { createRelworx } from "@kayiwarahim/relworx";

const relworx = createRelworx({
  apiKey: process.env.RELWORX_API_KEY!,
  accountNo: process.env.RELWORX_ACCOUNT_NO!,
  // Optional:
  // baseUrl: "https://payments.relworx.com/api",
  // timeoutMs: 30_000,
});
```

Keep API credentials on the server. Never expose them in browser bundles, frontend environment variables, source control or logs.

## Collections

```ts
const result = await relworx.collections.request({
  reference: "ORDER-100001",
  msisdn: "+256701345672",
  currency: "UGX",
  amount: 10000,
  description: "Order payment",
});

console.log(result.internal_reference);
```

## Disbursements

```ts
const result = await relworx.disbursements.send({
  reference: "PAYOUT-100001",
  msisdn: "+256701345672",
  currency: "UGX",
  amount: 50000,
  description: "Customer payout",
});
```

## Wallet balance and transactions

```ts
const balance = await relworx.balance.get("UGX");
const status = await relworx.transactions.status("RELWORX_INTERNAL_REFERENCE");
const history = await relworx.transactions.history();
```

The SDK returns the provider's JSON response without renaming its fields. Save the returned `internal_reference` with your own payment record.

## Webhook signature verification

The SDK provides a framework-independent verifier. Pass the parsed webhook payload, the original `Relworx-Signature` header, the exact callback URL registered with Relworx and your webhook secret.

```ts
import { verifyWebhookSignature } from "@kayiwarahim/relworx";

const valid = verifyWebhookSignature(req.body, req.header("Relworx-Signature") ?? "", {
  webhookUrl: "https://your-domain.example/relworx/webhook",
  secret: process.env.RELWORX_WEBHOOK_SECRET!,
  toleranceSeconds: 300,
});

if (!valid) {
  res.status(401).send("Invalid webhook signature");
  return;
}

// Process idempotently; acknowledge only after safely accepting the event.
res.sendStatus(200);
```

The verifier follows the signature construction implemented in the companion Laravel package: HMAC-SHA256 over the callback URL, timestamp and sorted `status`, `customer_reference`, and `internal_reference` fields. Confirm the current signing contract against your Relworx account/API documentation before enabling it in production.

## Error handling and payment safety

```ts
import { RelworxError } from "@kayiwarahim/relworx";

try {
  await relworx.collections.request({
    reference: "ORDER-100002",
    msisdn: "+256701345672",
    currency: "UGX",
    amount: 10000,
  });
} catch (error) {
  if (error instanceof RelworxError) {
    console.error(error.message);
    console.error(error.httpStatus);
    if (error.outcomeUnknown) {
      // Reconcile using the transaction reference/status before retrying.
    }
  }
}
```

Collection and disbursement requests are asynchronous. An accepted request is not proof that the payment completed. Check transaction status or process a verified webhook before marking it successful.

**Do not blindly retry a payment POST after a timeout or connection failure.** Relworx may have accepted the request even if your application did not receive the response. Reconcile first using your customer reference and the provider's transaction status/history tools. The SDK does not automatically retry payment requests.

## Configuration

| Option | Required | Default | Description |
|---|---:|---|---|
| `apiKey` | Yes | — | Relworx API key |
| `accountNo` | Yes | — | Relworx business account number |
| `baseUrl` | No | `https://payments.relworx.com/api` | API base URL |
| `timeoutMs` | No | `30000` | Request timeout in milliseconds |
| `fetch` | No | Node global fetch | Optional Fetch-compatible implementation, useful for testing |

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Tests use a mocked Fetch implementation and do not move real money.

## Related package

- Laravel / Composer SDK: https://github.com/kayiwarahim/relworx
- Relworx API documentation: https://payments.relworx.com/docs

## License

MIT
