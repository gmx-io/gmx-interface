import { describe, expect, it } from "vitest";

import {
  ARBITRUM,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  type SourceChainId,
} from "config/chains";
import { getMappedTokenId, getMultichainTokenId, isSelfOftToken } from "config/multichain";
import { getTokenBySymbol } from "sdk/configs/tokens";

const GM_ETH_USDC = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const GLV_ETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;

describe("isSelfOftToken", () => {
  it.each<SourceChainId>([SOURCE_ETHEREUM_MAINNET, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET])(
    "is true for GM and GLV on source chain %i",
    (srcChainId) => {
      expect(isSelfOftToken(getMappedTokenId(ARBITRUM, GM_ETH_USDC, srcChainId)!)).toBe(true);
      expect(isSelfOftToken(getMappedTokenId(ARBITRUM, GLV_ETH_USDC, srcChainId)!)).toBe(true);
    }
  );

  it("is false for GM and GLV on Arbitrum, which go through an adapter", () => {
    expect(isSelfOftToken(getMultichainTokenId(ARBITRUM, GM_ETH_USDC)!)).toBe(false);
    expect(isSelfOftToken(getMultichainTokenId(ARBITRUM, GLV_ETH_USDC)!)).toBe(false);
  });

  it("is false for tokens that go through a Stargate pool", () => {
    expect(isSelfOftToken(getMappedTokenId(ARBITRUM, USDC, SOURCE_ETHEREUM_MAINNET)!)).toBe(false);
    expect(isSelfOftToken(getMultichainTokenId(ARBITRUM, USDC)!)).toBe(false);
  });
});
