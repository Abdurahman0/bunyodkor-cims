import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with K, M, B suffixes
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 */
export function formatNumberWithSuffix(num: number, decimals: number = 1): string {
  if (num === 0) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1_000_000_000) {
    return sign + (absNum / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (absNum >= 1_000_000) {
    return sign + (absNum / 1_000_000).toFixed(decimals) + 'M';
  } else if (absNum >= 1_000) {
    return sign + (absNum / 1_000).toFixed(decimals) + 'K';
  }

  return num.toString();
}

/**
 * Format currency with locale formatting
 * @param amount - The amount to format
 * @param currency - Currency code (default: UZS)
 * @param locale - Locale string (default: uz-UZ)
 * @param compact - Use compact notation for large numbers (default: false)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'UZS',
  locale: string = 'uz-UZ',
  compact: boolean = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return formatNumberWithSuffix(amount) + ' ' + currency;
  }

  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(amount) + ' ' + currency;
}

/**
 * Format number with locale thousand separators
 * @param num - The number to format
 * @param locale - Locale string (default: uz-UZ)
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(num);
}
