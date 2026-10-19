export function parseMinorUnits(value: string): bigint {
  const match = value.trim().match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

export function formatMinorUnits(value: bigint, currency = 'USD'): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');
  const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(whole);
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${negative ? '-' : ''}${symbol}${integer}.${fraction}`;
}

export function formatUsdMicros(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 1_000_000n;
  const fraction = String(absolute % 1_000_000n).padStart(6, '0').slice(0, 4);
  const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(whole);
  return `${negative ? '-' : ''}$${integer}.${fraction}`;
}
