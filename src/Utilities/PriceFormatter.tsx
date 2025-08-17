function formatMoney(amount: number | string, currency = "USD", locale = "en-US"): string {
  let numericAmount: number;

  if (typeof amount === "string") {
    numericAmount = parseFloat(amount.replace(/[^0-9.-]/g, "")); // Strip out commas, currency symbols, etc.
  } else {
    numericAmount = amount;
  }

  if (isNaN(numericAmount)) {
    return "";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency
  }).format(numericAmount);
}

export { formatMoney }