import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { Token } from '@/selectors/token/types';
import { limitDecimals } from '@/utils/legacy/decimals';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { TokenConfig, Tokens } from 'gmsol';
import { getByKey } from '../lib/object';

/**
 * Parses a decimal string into a BN with the specified number of decimals
 * @param value The decimal string to parse
 * @param decimals The number of decimals to parse to (default: USD_DECIMALS)
 * @returns BN representation of the value
 * @throws {TypeError} If value is not a string
 * @throws {Error} If decimal places exceed decimals limit
 */
export function parseUnits(value: string, decimals = USD_DECIMALS): BN {
  if (typeof value !== 'string') {
    throw new TypeError('Value must be a string');
  }

  const parts = value.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  if (decimalPart.length > decimals) {
    throw new Error('Decimal places exceed decimals limit');
  }

  // Pad the decimal part with zeros to match the decimals
  const fullDecimalPart = (decimalPart + '0'.repeat(decimals)).substring(
    0,
    decimals
  );

  // Combine integer and decimal parts
  const fullNumber = integerPart + fullDecimalPart;

  // Remove leading zeros but keep at least one digit
  const cleanNumber = fullNumber.replace(/^0+/, '') || '0';

  return new BN(cleanNumber);
}

function isValidNumberFormat(value: string): boolean {
  // Check if the string matches the pattern of a valid number
  // Allows: optional minus sign, digits, optional decimal point, optional digits
  return /^-?\d*\.?\d*$/.test(value) && value.length > 0;
}

export function parseValue(
  value: string,
  tokenDecimals: number
): BN | undefined {
  // Check if the value has valid number format
  if (!isValidNumberFormat(value)) {
    return undefined;
  }
  // Check if the value is a valid number
  const pValue = parseFloat(value);
  if (isNaN(pValue)) {
    return undefined;
  }

  const limitedValue = limitDecimals(value, tokenDecimals);
  return parseUnits(limitedValue, tokenDecimals);
}

export function parseAmount(value: string, token?: Token): BN | undefined {
  return (
    (token ? parseValue(value || '0', token.decimals) : BN_ZERO) ?? BN_ZERO
  );
}

export function toBigInt(amount: BN) {
  return BigInt(amount.toString());
}

export function nonNegativeBN(value: BN | null | undefined): BN {
  if (!value) return BN_ZERO;
  return value.lt(BN_ZERO) ? BN_ZERO : value;
}

export const parseToken = (address: string, token: TokenConfig) => {
  const tokenAddress = new PublicKey(address);
  const type = (token as TokenConfig & { type?: Token['type'] }).type;

  return {
    symbol: token.symbol,
    address: tokenAddress,
    decimals: token.decimals,
    decimals_gmx: token.decimals_gmx,
    isWrappedNative: tokenAddress.equals(WRAPPED_NATIVE_TOKEN_ADDRESS),
    isNative: tokenAddress.equals(NATIVE_TOKEN_ADDRESS),
    isStable: token.isStable,
    priceDecimals: token.priceDecimals,
    wrappedAddress: token.wrappedAddress
      ? new PublicKey(token.wrappedAddress)
      : undefined,
    isSynthetic: token.isSynthetic,
    shouldWrap: token.shouldWrap,
    isSpl2022Mint: token.isSpl2022Mint,
    type,
  } satisfies Token as Token;
};

export const parseTokens = (tokens: Tokens) => {
  const ans: { [address: string]: Token } = {};
  for (const address in tokens) {
    ans[address] = parseToken(address, tokens[address]);
  }
  for (const address in ans) {
    const token = ans[address];
    const wrappedAddress = token.wrappedAddress?.toBase58();
    const wrappedToken = getByKey(ans, wrappedAddress);
    if (wrappedToken) {
      wrappedToken.isWrapped = true;
      if (!wrappedToken.isWrappedNative) {
        wrappedToken.unwrappedAddress = new PublicKey(address);
      }
    }
  }
  return ans;
};
