import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  encodeSolanaSignature,
  estimateConfirmSeconds,
  formatEstimate,
  isSolanaAddress,
  maxSolSendAmount,
  solanaSendBlock,
} from "./solanaTransfer";

const RECIPIENT = "So11111111111111111111111111111111111111112";

describe("solana transfer", () => {
  it("accepts a Solana address and rejects anything else", () => {
    expect(isSolanaAddress(RECIPIENT)).toBe(true);
    expect(isSolanaAddress("not-an-address")).toBe(false);
    expect(encodeSolanaSignature(new PublicKey(RECIPIENT).toBytes())).toBe(RECIPIENT);
  });

  it("deducts the network fee from the max SOL amount", () => {
    expect(maxSolSendAmount(1_000_000_000n, 5_000n)).toBe(999_995_000n);
    expect(maxSolSendAmount(5_000n, 5_000n)).toBe(0n);
    expect(
      solanaSendBlock({
        recipient: RECIPIENT,
        amount: maxSolSendAmount(1_000_000_000n, 5_000n),
        assetBalance: 1_000_000_000n,
        solBalance: 1_000_000_000n,
        fee: 5_000n,
        native: true,
      })
    ).toBeUndefined();
    expect(
      solanaSendBlock({
        recipient: RECIPIENT,
        amount: 1_000_000_000n,
        assetBalance: 1_000_000_000n,
        solBalance: 1_000_000_000n,
        fee: 5_000n,
        native: true,
      })
    ).toBe("insufficient-sol");
  });

  it("estimates confirmation from recent slot time", () => {
    expect(estimateConfirmSeconds({ numSlots: 120, samplePeriodSecs: 60 })).toBe(1);
    expect(estimateConfirmSeconds({ numSlots: 30, samplePeriodSecs: 60 })).toBe(4);
    expect(estimateConfirmSeconds(undefined)).toBeUndefined();
    expect(formatEstimate(1)).toBe("1s");
    expect(formatEstimate(100)).toBe("1m 40s");
  });

  it("blocks an SPL send when SOL cannot cover the fee", () => {
    expect(
      solanaSendBlock({
        recipient: RECIPIENT,
        amount: 1n,
        assetBalance: 10n,
        solBalance: 1_000n,
        fee: 5_000n,
        native: false,
      })
    ).toBe("insufficient-sol");
    expect(
      solanaSendBlock({
        recipient: RECIPIENT,
        amount: 11n,
        assetBalance: 10n,
        solBalance: 1_000_000n,
        fee: 5_000n,
        native: false,
      })
    ).toBe("insufficient-balance");
  });
});
