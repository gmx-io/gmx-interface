import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { Address, translateAddress } from '@coral-xyz/anchor';

export function isWrappedNativeToken(
  address: Address | undefined | null
): boolean {
  if (!address) {
    return false;
  }
  const pubKey = translateAddress(address);
  return pubKey.equals(WRAPPED_NATIVE_TOKEN_ADDRESS);
}
