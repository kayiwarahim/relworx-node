import { describe, expect, it, vi } from "vitest";
import { createRelworx, RelworxError, verifyWebhookSignature } from "../src/index.js";
import { createHmac } from "node:crypto";

const config = {
  apiKey: "test-api-key",
  accountNo: "TEST-ACCOUNT",
  baseUrl: "https://payments.relworx.com/api",
};

function payment() {
  return {
    reference: "ORDER-100001",
    msisdn: "+256701345672",
    currency: "ugx",
    amount: 10000,
    description: "Test order",
  };
}

describe("Relworx SDK", () => {
  it("sends a collection request using the Relworx headers and account number", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ success: true, internal_reference: "rw-123" }),
      { status: 200 },
    ));
    const sdk = createRelworx({ ...config, fetch: fetchMock });

    const result = await sdk.collections.request(payment());
    expect(result.internal_reference).toBe("rw-123");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://payments.relworx.com/api/mobile-money/request-payment");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-api-key");
    expect(new Headers(init?.headers).get("accept")).toBe("application/vnd.relworx.v2");
    expect(JSON.parse(String(init?.body))).toMatchObject({ account_no: "TEST-ACCOUNT", currency: "UGX" });
  });

  it("uses the disbursement endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const sdk = createRelworx({ ...config, fetch: fetchMock });
    await sdk.disbursements.send(payment());
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/mobile-money/send-payment");
  });

  it("uses wallet balance and transaction endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const sdk = createRelworx({ ...config, fetch: fetchMock });
    await sdk.balance.get("ugx");
    await sdk.transactions.status("internal-123");
    await sdk.transactions.history();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("check-wallet-balance");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("internal_reference=internal-123");
    expect(String(fetchMock.mock.calls[2]![0])).toContain("/payment-requests/transactions");
  });

  it("rejects invalid payment input before making a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const sdk = createRelworx({ ...config, fetch: fetchMock });
    expect(() => sdk.collections.request({ ...payment(), reference: "short" })).toThrow(RelworxError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks payment network failures as an unknown outcome", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const sdk = createRelworx({ ...config, fetch: fetchMock });
    await expect(sdk.collections.request(payment())).rejects.toMatchObject({ outcomeUnknown: true });
  });

  it("does not mark read-only network failures as unknown payment outcomes", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const sdk = createRelworx({ ...config, fetch: fetchMock });
    await expect(sdk.balance.get()).rejects.toMatchObject({ outcomeUnknown: false });
  });

  it("verifies Relworx webhook signatures", () => {
    const payload = {
      status: "success",
      customer_reference: "ORDER-100001",
      internal_reference: "relworx-123",
    };
    const timestamp = "1700000000";
    const url = "https://merchant.example/relworx/webhook";
    const secret = "test-secret";
    const signed = url + timestamp + "customer_reference" + payload.customer_reference
      + "internal_reference" + payload.internal_reference + "status" + payload.status;
    const signature = createHmac("sha256", secret).update(signed).digest("hex");

    expect(verifyWebhookSignature(payload, `t=${timestamp},v=${signature}`, {
      webhookUrl: url, secret, now: 1700000000,
    })).toBe(true);
    expect(verifyWebhookSignature(payload, `t=${timestamp},v=bad`, {
      webhookUrl: url, secret, now: 1700000000,
    })).toBe(false);
  });
});
