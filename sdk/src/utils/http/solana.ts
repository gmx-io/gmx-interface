import type { HttpResponseMetadata, SolanaReadOptions } from "./types";

export type { SolanaReadOptions } from "./types";

export function parseSolanaSlotHeader(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }
  const slot = Number(value);
  return Number.isSafeInteger(slot) && slot >= 0 ? slot : undefined;
}

export function getSolanaResponseHandler(onResponse: SolanaReadOptions["onResponse"]) {
  return onResponse
    ? ({ headers }: HttpResponseMetadata) => onResponse({ slot: parseSolanaSlotHeader(headers.get("x-solana-slot")) })
    : undefined;
}
