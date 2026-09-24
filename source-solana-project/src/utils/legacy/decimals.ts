import { BN_ONE, BN_ZERO } from '@/config/constants';
import { getGmw213Enabled } from '@/config/featureFlagEnable';
import { getUnit } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

const KMB_UPPER = getGmw213Enabled();

export function expandDecimals(n: BN, decimals: number): BN {
  return n.mul(getUnit(decimals));
}

/**
 * Limits the number of decimal places in a string representation of a number
 * @param amountStr The string representation of the number
 * @param maxDecimals The maximum number of decimal places to allow
 * @returns The string with limited decimal places
 */
export function limitDecimals(amountStr: string, maxDecimals: number): string {
  // Handle case where no decimals are allowed
  if (maxDecimals === 0) {
    // Round to nearest integer
    const num = parseFloat(amountStr);
    if (isNaN(num)) {
      return amountStr.split('.')[0];
    }
    return Math.round(num).toString();
  }

  // Check for scientific notation
  const scientificMatch = amountStr.match(/^([+-]?\d*\.?\d*)([eE][+-]?\d+)$/);
  if (scientificMatch) {
    const [, mantissa, exponent] = scientificMatch;
    return limitDecimals(mantissa, maxDecimals) + exponent;
  }

  // Find decimal point position
  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    // If we have more decimals than allowed, round instead of truncate
    if (decimals > maxDecimals) {
      const num = parseFloat(amountStr);
      if (isNaN(num)) {
        // Fallback to truncate if parsing fails
        const diff = decimals - maxDecimals;
        return amountStr.substring(0, amountStr.length - diff);
      }
      // Use toFixed for rounding, but handle potential precision issues
      const rounded = num.toFixed(maxDecimals);
      return rounded;
    }
  }

  return amountStr;
}

export function limitDecimalsWithoutHalfUp(amountStr: string, maxDecimals: number): string {
  // Handle case where no decimals are allowed
  if (maxDecimals === 0) {
    return amountStr.split('.')[0];
  }
  // Check for scientific notation
  const scientificMatch = amountStr.match(/^([+-]?\d*\.?\d*)([eE][+-]?\d+)$/);
  if (scientificMatch) {
    const [, mantissa, exponent] = scientificMatch;
    return limitDecimals(mantissa, maxDecimals) + exponent;
  }

  // Find decimal point position
  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    // If we have more decimals than allowed, truncate
    if (decimals > maxDecimals) {
      const diff = decimals - maxDecimals;
      amountStr = amountStr.substring(0, amountStr.length - diff);
    }
  }

  return amountStr;
}


/**
 * Trims trailing zeros and unnecessary decimal points from a string representation of a number
 * For example: "123.4500" -> "123.45", "123.0" -> "123", "123." -> "123"
 * @param amount The string representation of the number
 * @returns The string with trailing zeros and unnecessary decimal points removed
 */
export function trimZeroDecimals(amount: string, keepTrailingZeros: boolean = false) : string{
  if (keepTrailingZeros) {
    return amount || '0';
  }

  // Handle scientific notation
  const scientificMatch = amount.match(/^([+-]?\d*\.?\d*)(e[+-]?\d+)$/i);
  if (scientificMatch) {
    const [, mantissa, exponent] = scientificMatch;
    return trimZeroDecimals(mantissa) + exponent;
  }

  // Handle empty string or single zero
  if (!amount || amount === '0') {
    return '0';
  }

  // Split into integer and decimal parts
  const parts = amount.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1];

  // If no decimal part, return the integer part
  if (!decimalPart) {
    return integerPart;
  }

  // Trim trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, '');

  // If decimal part is empty after trimming, return integer part
  if (!trimmedDecimal) {
    return integerPart;
  }

  // Combine parts with decimal point
  return `${integerPart}.${trimmedDecimal}`;
}

/**
 * Removes trailing zeros from a number by converting it to a Number type
 * Note: This will also normalize the number format (e.g., remove leading zeros, scientific notation)
 * @param amount The amount as string or number
 * @returns The amount without trailing zeros, or the original amount if it cannot be converted
 */
export function removeTrailingZeros(amount: string | number): string | number {
  // Handle special case for zero values
  if (
    amount === 0 ||
    amount === '0' ||
    (typeof amount === 'string' && parseFloat(amount) === 0)
  ) {
    return 0;
  }

  // Convert to number
  const amountWithoutZeros = Number(amount);

  // If conversion fails or results in 0 when input wasn't explicitly zero, return original
  if (!amountWithoutZeros && amount !== 0 && amount !== '0') {
    return amount;
  }

  // Return the normalized number
  return amountWithoutZeros;
}

/**
 * Pads a number string with zeros after the decimal point to reach the minimum number of decimal places
 * @param amountStr The number string to pad
 * @param minDecimals The minimum number of decimal places required
 * @returns The padded number string
 */
export function padDecimals(amountStr: string, minDecimals: number): string {
  if (minDecimals === 0) {
    return amountStr;
  }

  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    if (decimals < minDecimals) {
      const paddingLength = minDecimals - decimals;
      amountStr = amountStr.padEnd(amountStr.length + paddingLength, '0');
    }
  } else {
    amountStr = amountStr + '.' + '0'.repeat(minDecimals);
  }
  return amountStr;
}

/**
 * Formats a number string by adding commas as thousand separators
 * @param amountStr The number string to format
 * @returns The formatted string with commas, or '...' if the input is empty
 */
export function numberWithCommas(amountStr: string): string {
  if (!amountStr) {
    return '...';
  }

  const parts = amountStr.split('.');

  // Remove leading zeros and handle negative numbers
  const match = parts[0].match(/^(-?)0*(\d+)$/);
  if (match) {
    const [, sign, num] = match;
    parts[0] = sign + num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return parts.join('.');
}

export function numberWithCommasKMBWithoutUnit(
  amountStr: string,
  options: {
    useUnit?: boolean,
    decimals?: number
  } = {}
): string {

  const { useUnit = false, decimals = 2 } = options;

  if (!amountStr) return '...';

  let raw = amountStr.replace(/,/g, '');

  if (isNaN(Number(raw))) return amountStr;

  let num = Number(raw);
  const isNegative = num < 0;
  num = Math.abs(num);

  let unit = '';
  if (useUnit) {
    if (num >= 1_000_000_000) {
      num = num / 1_000_000_000;
      unit = KMB_UPPER ? 'B' : 'b';
    } else if (num >= 1_000_000) {
      num = num / 1_000_000;
      unit = KMB_UPPER ? 'M' : 'm';
    } else if (num >= 1_000) {
      num = num / 1_000;
      unit = KMB_UPPER ? 'K' : 'k';
    }
    raw = num.toFixed(decimals);
  }

  const parts = raw.split('.');

  const match = parts[0].match(/^(-?)0*(\d+)$/);
  if (match) {
    const [, sign, numStr] = match;
    parts[0] = sign + numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const final = parts.join('.');

  return (isNegative ? '-' : '') + final + unit;
}

/**
 * Performs division with magnitude-based rounding up
 * For positive numbers: rounds up
 * For negative numbers: rounds towards negative infinity
 * @param a The dividend
 * @param b The divisor
 * @returns The rounded quotient
 */
export function roundUpMagnitudeDivision(a: BN, b: BN): BN {
  if (b.isZero()) {
    return BN_ZERO;
  }

  if (a.isZero()) {
    return BN_ZERO;
  }

  // Convert to positive numbers
  const absA = a.abs();
  const absB = b.abs();

  // Calculate result with positive numbers (always rounding up)
  const absResult = absA.add(absB).sub(BN_ONE).div(absB);

  // Determine the sign of the result
  const isNegativeResult = a.isNeg() !== b.isNeg();

  // Apply the sign
  return isNegativeResult ? absResult.neg() : absResult;
}

export function roundUpDivision(a: BN, b: BN): BN {
  if (a.isZero()) {
    return BN_ZERO;
  }

  if (b.isZero()) {
    return BN_ZERO;
  }
  // Convert to positive numbers
  const absA = a.abs();
  const absB = b.abs();

  // Calculate result with positive numbers
  const absResult = absA.div(absB);
  const hasRemainder = absA.mod(absB).gt(BN_ZERO);

  // Add 1 if there is a remainder and the result should be positive
  const isNegativeResult = a.isNeg() !== b.isNeg();
  const finalAbsResult =
    hasRemainder && !isNegativeResult ? absResult.add(BN_ONE) : absResult;

  // Apply the sign
  return isNegativeResult ? finalAbsResult.neg() : finalAbsResult;
}

export function roundToTwoDecimals(n: number) {
  return Math.round(n * 100) / 100;
}
