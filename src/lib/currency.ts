// Every public-facing price leads with MZN (the agency's home currency)
// and carries a secondary "about this many dollars" hint, converted with
// a fixed rate the business sets by hand — not a live FX API, so a price
// never quietly shifts between one page load and the next. Update
// RATE_TO_MZN here if the real-world rate drifts meaningfully.
const RATE_TO_MZN: Record<string, number> = {
  MZN: 1,
  USD: 64,
  ZAR: 3.6,
};

/** Raw numeric conversion — exported for callers that need to sum several
 * amounts (possibly in different catalog currencies) before formatting the
 * total, rather than formatting each one and re-parsing the display string. */
export function toMZN(amount: number, currency: string): number {
  return amount * (RATE_TO_MZN[currency] ?? 1);
}

function formatNumber(amount: number, locale: "pt" | "en"): string {
  return Math.round(amount).toLocaleString(locale === "pt" ? "pt-PT" : "en-US");
}

/** The primary price line — always normalised to MZN, regardless of
 * which currency the catalog item is actually priced in. */
export function formatMZN(amount: number, currency: string, locale: "pt" | "en" = "pt"): string {
  return `MZN ${formatNumber(toMZN(amount, currency), locale)}`;
}

/** The secondary, approximate dollar line shown alongside the MZN price. */
export function formatUSDApprox(amount: number, currency: string, locale: "pt" | "en" = "pt"): string {
  const usd = toMZN(amount, currency) / RATE_TO_MZN.USD;
  return `≈ USD ${formatNumber(usd, locale)}`;
}
