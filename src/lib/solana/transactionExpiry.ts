import { signature as toSignature } from "@solana/kit";

import { getSolanaRpc } from "./rpc";

const RPC_TIMEOUT_MS = 20_000;

// A landed transaction is visible at any slot after it; an expired blockhash at a finalized block means it never will.
export async function isSolanaTransactionExpired(signature: string, lastValidBlockHeight: bigint | undefined) {
  const rpc = getSolanaRpc();
  const finalized = await rpc
    .getEpochInfo({ commitment: "finalized" })
    .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
  if (lastValidBlockHeight !== undefined && finalized.blockHeight <= lastValidBlockHeight) return false;
  const {
    context,
    value: [status],
  } = await rpc
    .getSignatureStatuses([toSignature(signature)], { searchTransactionHistory: true })
    .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
  return status === null && context.slot >= finalized.absoluteSlot;
}
