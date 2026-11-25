import { getBase58Decoder } from "@solana/kit";
import { expect, it, vi } from "vitest";

import { isSolanaTransactionExpired } from "../transactionExpiry";

const rpc = vi.hoisted(() => ({ getEpochInfo: vi.fn(), getSignatureStatuses: vi.fn() }));
vi.mock("../rpc", () => ({ getSolanaRpc: () => rpc }));

const signature = getBase58Decoder().decode(new Uint8Array(64).fill(7));
const seen = { err: null, confirmationStatus: "processed", slot: 15n };

// The finalized block is at height 11 and slot 20.
it.each([
  ["not expired inside its lifetime", 11n, null, 20n, false],
  ["expired when missing after its lifetime ended at a finalized block", 10n, null, 20n, true],
  ["not expired when seen after its lifetime ended", 10n, seen, 20n, false],
  ["not expired when missing on a node behind the finalized slot", 10n, null, 19n, false],
  ["expired when missing with no recorded lifetime", undefined, null, 20n, true],
  ["not expired when seen with no recorded lifetime", undefined, seen, 20n, false],
] as const)("%s", async (_, lastValidBlockHeight, status, contextSlot, expired) => {
  rpc.getEpochInfo.mockReturnValue({ send: async () => ({ blockHeight: 11n, absoluteSlot: 20n }) });
  rpc.getSignatureStatuses.mockReturnValue({ send: async () => ({ context: { slot: contextSlot }, value: [status] }) });
  expect(await isSolanaTransactionExpired(signature, lastValidBlockHeight)).toBe(expired);
});

it("never reads an RPC failure as expiry", async () => {
  rpc.getEpochInfo.mockReturnValue({ send: async () => ({ blockHeight: 11n, absoluteSlot: 20n }) });
  rpc.getSignatureStatuses.mockReturnValue({
    send: async () => {
      throw new Error("429 Too Many Requests");
    },
  });
  await expect(isSolanaTransactionExpired(signature, 10n)).rejects.toThrow("429");
});
