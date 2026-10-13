const fallbackCurrency = "USD";

export function currencyCodeFor(value) {
  const normalized = String(value ?? fallbackCurrency).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallbackCurrency;
}

export function currencySymbolFor(value) {
  const currency = currencyCodeFor(value);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0).find((part) => part.type === "currency")?.value ?? "$";
  } catch {
    return "$";
  }
}
