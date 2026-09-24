import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
import { Address, translateAddress } from '@coral-xyz/anchor';

export function isSameTokenAddress(
  a: Address | undefined | null,
  b: Address | undefined | null
): boolean {
  if (!a || !b) {
    return false;
  }
  const pubKeyA = translateAddress(a);
  const pubKeyB = translateAddress(b);

  if (pubKeyA.equals(pubKeyB)) {
    return true;
  }

  // Check if one is native token and other is wrapped native token
  const isANative = pubKeyA.equals(NATIVE_TOKEN_ADDRESS);
  const isAWrappedNative = pubKeyA.equals(WRAPPED_NATIVE_TOKEN_ADDRESS);
  const isBNative = pubKeyB.equals(NATIVE_TOKEN_ADDRESS);
  const isBWrappedNative = pubKeyB.equals(WRAPPED_NATIVE_TOKEN_ADDRESS);

  return (isANative && isBWrappedNative) || (isAWrappedNative && isBNative);
}
