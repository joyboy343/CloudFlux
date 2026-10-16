export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSignedUsd(amount: number) {
  if (amount === 0) {
    return formatUsd(0);
  }

  return `${amount > 0 ? "+" : "−"}${formatUsd(Math.abs(amount))}`;
}
