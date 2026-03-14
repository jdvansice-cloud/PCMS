import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── ITBMS Tax Helpers ───────────────────────────────────
// All prices in the system are stored as ITBMS-inclusive (final price).
// These helpers extract the tax component for display on receipts/invoices.

const ITBMS_RATE = 0.07;
const ITBMS_DIVISOR = 1 + ITBMS_RATE; // 1.07

/** Given a final (tax-inclusive) price, return the subtotal (pre-tax). */
export function getSubtotal(finalPrice: number): number {
  return Math.round((finalPrice / ITBMS_DIVISOR) * 100) / 100;
}

/** Given a final (tax-inclusive) price, return the ITBMS tax amount. */
export function getItbmsAmount(finalPrice: number): number {
  const subtotal = getSubtotal(finalPrice);
  return Math.round((finalPrice - subtotal) * 100) / 100;
}

/** Break down a final price into subtotal + ITBMS. For tax-exempt items, ITBMS is 0. */
export function getItbmsBreakdown(finalPrice: number, isTaxExempt: boolean = false) {
  if (isTaxExempt) {
    return { subtotal: finalPrice, itbms: 0, total: finalPrice };
  }
  const subtotal = getSubtotal(finalPrice);
  const itbms = getItbmsAmount(finalPrice);
  return { subtotal, itbms, total: finalPrice };
}

/** Format a number as Panama currency (B/. or $). */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
