import { isSolanaError, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED } from "@solana/kit";

import { sleep } from "lib/sleep";

const RETRIES = 4;
const RETRY_DELAY_MS = 500;

export async function retryUntilSolanaSlotReached<T>(read: () => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await read();
    } catch (error) {
      if (
        retry === RETRIES ||
        !isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED)
      ) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
}
