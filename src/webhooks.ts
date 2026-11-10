import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookPayload, WebhookVerificationOptions } from "./types.js";

export function verifyWebhookSignature(
  payload: WebhookPayload,
  signatureHeader: string,
  options: WebhookVerificationOptions,
): boolean {
  if (!options.secret || !options.webhookUrl || !signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const component of signatureHeader.split(",")) {
    const [key, value] = component.trim().split("=", 2);
    if (key && value) parts[key.trim()] = value.trim();
  }

  const timestamp = parts.t;
  const provided = parts.v;
  if (!timestamp || !/^\d+$/.test(timestamp) || !provided || !/^[a-f0-9]{64}$/i.test(provided)) return false;

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? 300;
  if (tolerance > 0 && Math.abs(now - Number(timestamp)) > tolerance) return false;

  const fields = ["status", "customer_reference", "internal_reference"] as const;
  const signed: Record<string, string> = {};
  for (const field of fields) {
    const value = payload[field];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return false;
    signed[field] = String(value);
  }

  const signedData = options.webhookUrl + timestamp + Object.keys(signed).sort()
    .map((key) => key + signed[key]).join("");
  const expected = createHmac("sha256", options.secret).update(signedData).digest();
  const received = Buffer.from(provided, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}
