import { describe, expect, it } from "vitest";

import { SETTLEMENT_CHAINS } from "config/multichain";
import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  getChainName,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_CHAIN_IDS,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SourceChainId,
} from "sdk/configs/chains";
import { getNativeToken } from "sdk/configs/tokens";

import { areChainsRelated } from "../areChainsRelated";
import { NATIVE_TOKEN_PRICE_MAP } from "../nativeTokenPriceMap";

const SOURCE_CHAIN_NATIVE_SYMBOL_MAP: Record<SourceChainId, string> = {
  [SOURCE_OPTIMISM_SEPOLIA]: "ETH",
  [SOURCE_SEPOLIA]: "ETH",
  [SOURCE_BASE_MAINNET]: "ETH",
  [SOURCE_BSC_MAINNET]: "BNB",
  [SOURCE_ETHEREUM_MAINNET]: "ETH",
  [ARBITRUM]: "ETH",
  [AVALANCHE]: "AVAX",
  [ARBITRUM_SEPOLIA]: "ETH",
  [AVALANCHE_FUJI]: "AVAX",
};

describe("NATIVE_TOKEN_PRICE_MAP", () => {
  it("should be defined", () => {
    for (const srcChainId of SOURCE_CHAIN_IDS) {
      for (const settlementChainId of SETTLEMENT_CHAINS) {
        if (!areChainsRelated(settlementChainId, srcChainId)) {
          continue;
        }

        const srcChainNativeSymbol = SOURCE_CHAIN_NATIVE_SYMBOL_MAP[srcChainId];
        const settlementChainNativeSymbol = getNativeToken(settlementChainId).symbol;

        if (srcChainNativeSymbol === settlementChainNativeSymbol) {
          continue;
        }

        expect(
          Object.keys(NATIVE_TOKEN_PRICE_MAP[srcChainId]?.[settlementChainId] ?? {}).length > 0,
          `Native token price map is not defined for ${getChainName(srcChainId)} -> ${getChainName(settlementChainId)}`
        ).toBeTruthy();
      }
    }
  });
});
