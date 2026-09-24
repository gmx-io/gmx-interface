import { BN } from '@coral-xyz/anchor';
import { getGmw420Enabled } from '@/config/featureFlagEnable';

export function parseDecimalToBN(value: string, decimals: number | string): BN {
  const isGmw420Enabled = getGmw420Enabled();
  const normalizedDecimals = isGmw420Enabled ? Number(decimals) : decimals;
  if (
    !Number.isSafeInteger(normalizedDecimals) ||
    Number(normalizedDecimals) < 0
  ) {
    if (isGmw420Enabled) {
      throw new Error('Decimals must be a non-negative safe integer');
    }
    console.error('Decimals must be a non-negative safe integer');
  }

  const match = value
    .trim()
    .match(/^([+-]?)(?=\d|\.\d)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);

  if (!match) {
    console.error('Invalid decimal number format');
  }

  const [, sign, integerPart, decimalPart = '', exponentPart = '0'] = match;
  const exponent = Number(exponentPart);
  if (!Number.isSafeInteger(exponent)) {
    console.error('Exponent must be a safe integer');
  }

  const digits = `${integerPart}${decimalPart}`;
  const scaledLength =
    integerPart.length + exponent + (normalizedDecimals as number);
  const unsignedIntegerString =
    scaledLength <= 0
      ? '0'
      : scaledLength < digits.length
        ? digits.slice(0, scaledLength)
        : digits.padEnd(scaledLength, '0');
  const normalizedIntegerString =
    unsignedIntegerString.replace(/^0+/, '') || '0';

  return new BN(
    sign === '-' && normalizedIntegerString !== '0'
      ? `-${normalizedIntegerString}`
      : normalizedIntegerString
  );
}
