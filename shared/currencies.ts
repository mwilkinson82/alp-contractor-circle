/**
 * Currency Configuration for Quantity Takeoff
 *
 * Defines supported currencies with construction-adjusted conversion factors.
 * Conversion factors account for BOTH forex rates AND construction cost differences
 * between countries (labor rates, material supply chains, regulatory costs).
 *
 * Base: USD at 10000 basis points (1.00x)
 * GBP: ~0.78 forex × ~1.05 construction premium = ~0.82x → 8200 basis points
 * AUD: ~1.52 forex × ~0.90 construction discount = ~1.37x → 13700 basis points
 *
 * These are approximate and will be refined with real market data.
 * The AI is instructed to price in the target currency directly when possible,
 * so these factors serve as a fallback/validation check.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** Country/region this currency is associated with */
  country: string;
  /** Locale string for Intl.NumberFormat */
  locale: string;
  /** Conversion factor from USD in basis points (10000 = 1.00x USD) */
  conversionFactor: number;
  /** Region group prefix for filtering cost regions */
  regionPrefix: string;
}

export const CURRENCIES: Currency[] = [
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    country: "United States",
    locale: "en-US",
    conversionFactor: 10000,
    regionPrefix: "",
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    country: "United Kingdom",
    locale: "en-GB",
    conversionFactor: 8200,
    regionPrefix: "uk-",
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    country: "Australia",
    locale: "en-AU",
    conversionFactor: 13700,
    regionPrefix: "au-",
  },
];

/** Lookup map: code → Currency */
const CURRENCY_MAP = new Map<string, Currency>(
  CURRENCIES.map((c) => [c.code, c])
);

/** Get currency by code */
export function getCurrency(code: string): Currency | null {
  return CURRENCY_MAP.get(code) || null;
}

/** Get the default currency */
export function getDefaultCurrency(): Currency {
  return CURRENCIES[0]; // USD
}

/**
 * Format a cost amount (in minor units / cents) for display.
 * @param cents - Amount in minor currency units (cents/pence)
 * @param currencyCode - ISO currency code (USD, GBP, AUD)
 */
export function formatCurrencyAmount(cents: number, currencyCode: string = "USD"): string {
  const currency = getCurrency(currencyCode);
  const locale = currency?.locale || "en-US";
  const code = currency?.code || "USD";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
