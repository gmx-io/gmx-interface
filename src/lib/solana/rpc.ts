import { Address, createSolanaRpc } from "@solana/kit";

import { getSolanaRpcUrl } from "config/rpc";

const MAX_ACCOUNTS_PER_REQUEST = 100;
const RPC_TIMEOUT = 15_000;

let rpc: ReturnType<typeof createSolanaRpc> | undefined;

export function getSolanaRpc() {
  if (!rpc) {
    rpc = createSolanaRpc(getSolanaRpcUrl());
  }
  return rpc;
}

export async function fetchSolanaAccounts(addresses: readonly Address[]) {
  const rpc = getSolanaRpc();
  const batches = Array.from({ length: Math.ceil(addresses.length / MAX_ACCOUNTS_PER_REQUEST) }, (_, index) =>
    addresses.slice(index * MAX_ACCOUNTS_PER_REQUEST, (index + 1) * MAX_ACCOUNTS_PER_REQUEST)
  );
  const responses = await Promise.all(
    batches.map(async (batch) => {
      const { value } = await rpc
        .getMultipleAccounts(batch, { encoding: "base64", commitment: "confirmed" })
        .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT) });
      if (value.length !== batch.length) {
        throw new Error("Solana RPC returned an incomplete account batch");
      }
      return value;
    })
  );
  return responses.flat();
}
