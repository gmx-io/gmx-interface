import type { MessagingFee } from "domain/multichain/types";

export function sendQuoteFromNative(nativeFee: bigint): MessagingFee {
  return {
    nativeFee,
    lzTokenFee: 0n,
  };
}
