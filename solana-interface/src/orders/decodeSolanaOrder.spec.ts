import { BorshCoder, type Idl } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { buildOrderAccountFixture, ORDER_DISCRIMINATOR_BYTES } from "./buildOrderAccountFixture";
import { decodeSolanaOrder } from "./decodeSolanaOrder";
import { ORDER_ACCOUNT_SIZE, ORDER_OWNER_OFFSET, ORDER_STORE_OFFSET, SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import { GMX_SOLANA_STORE_ADDRESS } from "../config/solanaProgram";
import rawIdl from "../idl/gmsol_store.json";
import { camelCaseGmsolIdl } from "../lib/gmsolIdl";

const coder = new BorshCoder(camelCaseGmsolIdl(rawIdl as unknown as Idl));
const address = () => Keypair.generate().publicKey.toBase58();

const owner = address();
const marketToken = address();
const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const wsol = "So11111111111111111111111111111111111111112";
const position = address();
const hop = address();

describe("decodeSolanaOrder", () => {
  it("matches the IDL account size and discriminator", () => {
    expect(coder.accounts.size("order")).toBe(ORDER_ACCOUNT_SIZE);
    const data = buildOrderAccountFixture({
      store: GMX_SOLANA_STORE_ADDRESS,
      owner,
      marketToken,
      initialCollateralToken: usdc,
      longToken: wsol,
      shortToken: usdc,
      kind: SOLANA_ORDER_KIND.LimitIncrease,
      collateralToken: usdc,
    });
    expect(data.subarray(0, 8)).toEqual(Buffer.from(ORDER_DISCRIMINATOR_BYTES));
    expect(new PublicKey(data.subarray(ORDER_STORE_OFFSET, ORDER_STORE_OFFSET + 32)).toBase58()).toBe(
      GMX_SOLANA_STORE_ADDRESS
    );
    expect(new PublicKey(data.subarray(ORDER_OWNER_OFFSET, ORDER_OWNER_OFFSET + 32)).toBase58()).toBe(owner);
  });

  it("decodes a long limit increase order with a position", () => {
    const data = buildOrderAccountFixture({
      store: GMX_SOLANA_STORE_ADDRESS,
      owner,
      marketToken,
      actionState: 0,
      updatedAt: 1_700_000_000n,
      updatedAtSlot: 42n,
      initialCollateralToken: usdc,
      longToken: wsol,
      shortToken: usdc,
      kind: SOLANA_ORDER_KIND.LimitIncrease,
      side: 0,
      collateralToken: usdc,
      position,
      initialCollateralDeltaAmount: 5_000_000n,
      sizeDeltaUsd: 100n * 10n ** 20n,
      triggerPrice: 123_456n,
      acceptablePrice: 130_000n,
    });
    const raw = decodeSolanaOrder(coder, "orderPubkey", data, 7);
    expect(raw).toMatchObject({
      pubkey: "orderPubkey",
      slot: 7,
      owner,
      store: GMX_SOLANA_STORE_ADDRESS,
      marketToken,
      actionState: 0,
      kind: 6,
      isLong: true,
      positionAddress: position,
      initialCollateralToken: usdc,
      collateralToken: usdc,
      longToken: wsol,
      shortToken: usdc,
      finalOutputToken: undefined,
      sizeDeltaUsd: 100n * 10n ** 20n,
      initialCollateralDeltaAmount: 5_000_000n,
      triggerPrice: 123_456n,
      acceptablePrice: 130_000n,
      minOutputAmount: 0n,
      primarySwapPath: [],
      updatedAt: 1_700_000_000n,
      updatedAtSlot: 42n,
    });
  });

  it("decodes a short swap order with an output token and a swap path", () => {
    const data = buildOrderAccountFixture({
      store: GMX_SOLANA_STORE_ADDRESS,
      owner,
      marketToken,
      initialCollateralToken: usdc,
      finalOutputToken: wsol,
      longToken: wsol,
      shortToken: usdc,
      primarySwapPath: [hop],
      kind: SOLANA_ORDER_KIND.LimitSwap,
      side: 1,
      collateralToken: wsol,
      initialCollateralDeltaAmount: 10_000_000n,
      minOutput: 50_000_000n,
    });
    const raw = decodeSolanaOrder(coder, "swap", data, 1);
    expect(raw).toMatchObject({
      kind: 5,
      isLong: false,
      positionAddress: undefined,
      finalOutputToken: wsol,
      minOutputAmount: 50_000_000n,
      primarySwapPath: [hop],
    });
  });

  it("returns undefined for an unknown kind", () => {
    const data = buildOrderAccountFixture({
      store: GMX_SOLANA_STORE_ADDRESS,
      owner,
      marketToken,
      initialCollateralToken: usdc,
      longToken: wsol,
      shortToken: usdc,
      kind: 9,
      collateralToken: usdc,
    });
    expect(decodeSolanaOrder(coder, "x", data, 1)).toBeUndefined();
  });
});
