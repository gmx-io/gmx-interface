import { BorshCoder, type Idl } from "@coral-xyz/anchor";
import { describe, expect, it } from "vitest";

import marketFixture from "./__fixtures__/marketAccount.json";
import positionFixture from "./__fixtures__/positionAccount.json";
import { decodeSolanaPosition } from "./decodeSolanaPosition";
import { findSolanaPositionPda } from "./solanaPositionPda";
import rawIdl from "../../idl/gmsol_store.json";
import { camelCaseGmsolIdl, toAnchorCamelCase } from "../../lib/gmsolIdl";
import { decodeSolanaMarket, findSolanaMarketPda } from "../../markets/decodeSolanaMarket";

const coder = new BorshCoder(camelCaseGmsolIdl(rawIdl as unknown as Idl));

describe("toAnchorCamelCase", () => {
  it("matches Anchor's naming", () => {
    expect(toAnchorCamelCase("Position")).toBe("position");
    expect(toAnchorCamelCase("size_in_usd")).toBe("sizeInUsd");
    expect(toAnchorCamelCase("market_token_mint")).toBe("marketTokenMint");
    expect(toAnchorCamelCase("my_account.field")).toBe("myAccount.field");
  });
});

describe("decodeSolanaPosition (mainnet fixture)", () => {
  const data = Buffer.from(positionFixture.base64, "base64");

  it("decodes the account fields", () => {
    const raw = decodeSolanaPosition(coder, positionFixture.pubkey, data, 7);
    expect(raw).toBeDefined();
    const { expected } = positionFixture;
    expect(raw).toMatchObject({
      pubkey: positionFixture.pubkey,
      slot: 7,
      kind: expected.kind,
      isLong: expected.kind === 1,
      owner: expected.owner,
      marketToken: expected.marketToken,
      collateralToken: expected.collateralToken,
      sizeInUsd: BigInt(expected.sizeInUsd),
      sizeInTokens: BigInt(expected.sizeInTokens),
      collateralAmount: BigInt(expected.collateralAmount),
      increasedAt: BigInt(expected.increasedAt),
      updatedAtSlot: BigInt(expected.updatedAtSlot),
      tradeId: BigInt(expected.tradeId),
    });
    expect(raw!.base64).toBe(positionFixture.base64);
  });

  it("matches the position PDA derived from its seeds", () => {
    const { expected } = positionFixture;
    const pda = findSolanaPositionPda(expected.owner, expected.marketToken, expected.collateralToken, expected.kind);
    expect(pda.toBase58()).toBe(positionFixture.pubkey);
  });

  it("matches the documented byte layout", () => {
    expect(data.readUInt8(42)).toBe(positionFixture.expected.kind);
    expect(data.subarray(0, 8)).toEqual(Buffer.from([170, 188, 143, 228, 122, 64, 247, 208]));
  });
});

describe("decodeSolanaMarket (mainnet fixture)", () => {
  it("decodes meta and the collateral factors", () => {
    const data = Buffer.from(marketFixture.base64, "base64");
    const market = decodeSolanaMarket(coder, marketFixture.address, data, 3);
    const { expected } = marketFixture;
    expect(market).toMatchObject({
      address: marketFixture.address,
      marketToken: expected.marketToken,
      indexToken: expected.indexToken,
      longToken: expected.longToken,
      shortToken: expected.shortToken,
      slot: 3,
      state: {
        minCollateralFactor: BigInt(expected.minCollateralFactor),
        minCollateralFactorForLiquidation: BigInt(expected.minCollateralFactorForLiquidation),
      },
    });
    expect(market.base64).toBe(marketFixture.base64);
  });

  it("matches the market PDA of the position's market token", () => {
    expect(findSolanaMarketPda(positionFixture.expected.marketToken).toBase58()).toBe(marketFixture.address);
  });
});
