import { describe, expect, it } from "vitest";

import type { GmPaySource } from "domain/synthetics/markets/types";
import type { TokenData } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { ARBITRUM, SOURCE_BASE_MAINNET as BASE } from "sdk/configs/chainIds";
import type { SourceChainId } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { resolveWithdrawalPaySource } from "./resolveWithdrawalPaySource";

const GM = expandDecimals(1, 18);
const WALLET: GmPaySource = "settlementChain";
const GMX: GmPaySource = "gmxAccount";
const SOURCE_CHAIN: GmPaySource = "sourceChain";

function gm(walletBalance?: bigint, gmxAccountBalance?: bigint, sourceChainBalance?: bigint): TokenData {
  return {
    ...getTokenBySymbol(ARBITRUM, "GM"),
    address: "0x6f095F58e9Eb2c583A1828202712c03962491d7e",
    prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
    walletBalance,
    gmxAccountBalance,
    sourceChainBalance,
  };
}

type Row = [
  name: string,
  paySource: GmPaySource,
  srcChainId: SourceChainId | undefined,
  token: TokenData | undefined,
  isSourceChainBalanceLoading: boolean,
  expected: GmPaySource,
];

describe("resolveWithdrawalPaySource", () => {
  // A zero source chain balance comes as undefined, so it counts only after those balances load
  it.each<Row>([
    ["GM only in GMX Account", WALLET, undefined, gm(0n, 995658338322534466n), false, GMX],
    ["GM only in the wallet", GMX, undefined, gm(996041493910484076n, 0n), false, WALLET],
    ["GM in both", WALLET, undefined, gm(213n * GM, 6n * GM), false, WALLET],
    ["no GM", GMX, undefined, gm(0n, 0n), false, GMX],
    ["wallet balance loading", WALLET, undefined, gm(undefined, 6n * GM), false, WALLET],
    ["GMX Account balance loading", WALLET, undefined, gm(0n, undefined), false, WALLET],
    ["on Base, market token not loaded", SOURCE_CHAIN, BASE, undefined, false, SOURCE_CHAIN],
    ["on Base, GM only in GMX Account", SOURCE_CHAIN, BASE, gm(0n, 110n * GM), false, GMX],
    ["on Base, its balances loading", SOURCE_CHAIN, BASE, gm(0n, 110n * GM), true, SOURCE_CHAIN],
    ["on Base, GMX Account empty, Base balances loading", GMX, BASE, gm(0n, 0n), true, GMX],
    ["on Base, GM only on Base", GMX, BASE, gm(0n, 0n, 5n * GM), false, SOURCE_CHAIN],
  ])(
    "picks the source that holds the GM when the chosen one is empty PRO-4563: %s",
    (_, paySource, srcChainId, token, isSourceChainBalanceLoading, expected) => {
      expect(resolveWithdrawalPaySource({ paySource, srcChainId, token, isSourceChainBalanceLoading })).toBe(expected);
    }
  );
});
