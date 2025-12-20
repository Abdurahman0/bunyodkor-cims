/**
 * Format large numbers with suffixes (K, M, B, T)
 * Examples:
 * 1234 -> 1.2K
 * 1234567 -> 1.2M
 * 1234567890 -> 1.2B
 * 60000000000 -> 60B
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num === 0) return '0';

  const absNum = Math.abs(num);

  if (absNum < 1000) {
    return num.toLocaleString();
  }

  const units = ['', 'K', 'M', 'B', 'T'];
  const order = Math.floor(Math.log10(absNum) / 3);
  const unitIndex = Math.min(order, units.length - 1);
  const unitValue = absNum / Math.pow(1000, unitIndex);

  return (num < 0 ? '-' : '') + unitValue.toFixed(decimals) + units[unitIndex];
}

/**
 * Format currency with locale-specific formatting
 * Example: 1234567.89 -> 1,234,567.89 or 1 234 567,89 depending on locale
 */
export function formatCurrency(
  amount: number,
  currency: string = 'UZS',
  locale: string = 'uz-UZ'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency with large number suffixes for compact display
 * Example: 60000000000 UZS -> 60B UZS
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = 'UZS'
): string {
  return `${formatLargeNumber(amount)} ${currency}`;
}

/**
 * Format number with locale-specific thousand separators
 * Example: 1234567 -> 1,234,567 or 1 234 567 depending on locale
 */
export function formatNumber(num: number, locale: string = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format percentage
 * Example: 0.1234 -> 12.3%
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Smart number formatter - automatically chooses between full and compact format
 * based on screen size and number magnitude
 */
export function formatSmartNumber(
  num: number,
  options?: {
    compact?: boolean;
    currency?: string;
    locale?: string;
  }
): string {
  const { compact = false, currency, locale = 'uz-UZ' } = options || {};

  // For compact mode or very large numbers, use compact format
  if (compact || Math.abs(num) >= 1000000) {
    return currency ? formatCompactCurrency(num, currency) : formatLargeNumber(num);
  }

  // For smaller numbers, use full format
  return currency ? formatCurrency(num, currency, locale) : formatNumber(num, locale);
}
