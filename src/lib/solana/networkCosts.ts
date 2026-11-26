import type { TransactionMessageBytesBase64 } from "@solana/kit";

import { retryUntilSolanaSlotReached } from "./minContextSlot";
import { getSolanaRpc } from "./rpc";

const RPC_TIMEOUT_MS = 20_000;
const rentExemptMinimums = new Map<number, Promise<bigint>>();
const messageFees = new Map<string, Promise<bigint | null>>();

function cached<K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>, isFinal: (value: V) => boolean) {
  let value = cache.get(key);
  if (!value) {
    value = load();
    cache.set(key, value);
    value.then(
      (result) => !isFinal(result) && cache.delete(key),
      () => cache.delete(key)
    );
  }
  return value;
}

export async function fetchSolanaRentExemptMinimums<K extends string>(sizes: Record<K, number>) {
  const entries = await Promise.all(
    (Object.entries(sizes) as [K, number][]).map(async ([key, size]) => {
      const lamports = await cached(
        rentExemptMinimums,
        size,
        () =>
          getSolanaRpc()
            .getMinimumBalanceForRentExemption(BigInt(size), { commitment: "confirmed" })
            .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) }),
        () => true
      );
      return [key, lamports] as const;
    })
  );
  return Object.fromEntries(entries) as Record<K, bigint>;
}

/** Null while the RPC does not know the message's blockhash, which is not cached. */
export function fetchSolanaMessageFee(message: TransactionMessageBytesBase64, minContextSlot?: bigint) {
  return cached(
    messageFees,
    message,
    async () =>
      (
        await retryUntilSolanaSlotReached(() =>
          getSolanaRpc()
            .getFeeForMessage(message, { commitment: "confirmed", minContextSlot })
            .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) })
        )
      ).value,
    (fee) => fee !== null
  );
}
