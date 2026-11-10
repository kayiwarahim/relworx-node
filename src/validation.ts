import { RelworxError } from "./errors.js";
import type { PaymentRequest } from "./types.js";

export function validatePaymentRequest(data: PaymentRequest): void {
  for (const field of ["reference", "msisdn", "currency", "amount"] as const) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      throw new RelworxError(`The ${field} field is required.`);
    }
  }

  if (typeof data.reference !== "string" || data.reference.length < 8 || data.reference.length > 36) {
    throw new RelworxError("The reference must contain between 8 and 36 characters.");
  }
  if (typeof data.msisdn !== "string" || !/^\+[1-9][0-9]{7,14}$/.test(data.msisdn)) {
    throw new RelworxError("The msisdn must be an internationally formatted phone number, e.g. +256701345678.");
  }
  if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
    throw new RelworxError("The amount must be a finite positive number.");
  }
  if (typeof data.currency !== "string" || !/^[A-Za-z]{3}$/.test(data.currency)) {
    throw new RelworxError("The currency must be a three-letter ISO currency code.");
  }
  if (data.description !== undefined && typeof data.description !== "string") {
    throw new RelworxError("The description must be a string.");
  }
}
