import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { closeWsolAccountInstructions, unwrapErrorMessage } from "./unwrapWsol";

const owner = new PublicKey("11111111111111111111111111111111");
const account = new PublicKey("So11111111111111111111111111111111111111112");

describe("closeWsolAccountInstructions", () => {
  it("returns no instructions when there are no accounts", () => {
    expect(closeWsolAccountInstructions([], owner)).toEqual([]);
  });

  it("closes each account back to the owner", () => {
    const [instruction] = closeWsolAccountInstructions([account], owner);

    expect(Array.from(instruction.data)).toEqual([9]);
    expect(instruction.keys.map((key) => key.pubkey.toBase58())).toEqual([
      account.toBase58(),
      owner.toBase58(),
      owner.toBase58(),
    ]);
    expect(instruction.keys.map((key) => [key.isSigner, key.isWritable])).toEqual([
      [false, true],
      [false, true],
      [true, false],
    ]);
  });
});

describe("unwrapErrorMessage", () => {
  it("uses a rejection message when the wallet rejects the signature", () => {
    expect(unwrapErrorMessage(new Error("User rejected the request."))).toBe("Signature rejected.");
  });
});
