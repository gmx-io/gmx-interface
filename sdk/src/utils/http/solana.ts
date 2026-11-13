import type { HttpResponseMetadata } from "./types";

export type SolanaReadOptions = {
  minContextSlot?: number;
  onResponse?: (response: { slot: number | undefined }) => void;
};

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
