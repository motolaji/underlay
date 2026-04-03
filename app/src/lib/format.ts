export function formatUsdc(raw: bigint) {
  const dollars = Number(raw) / 1_000_000;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

export function formatBps(value: number) {
  return formatPercent(value / 100);
}

export function formatCountLabel(selected: number, max: number) {
  return `${selected} of ${max} outcomes selected`;
}

export function parseUsdcInput(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0n;
  }

  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) {
    throw new Error("Invalid USDC value");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(6, "0");

  return BigInt(whole) * 1_000_000n + BigInt(paddedFraction);
}
