import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { getMarketByLabel } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getOpportunityAssetLabel, OpportunityAsset } from "./useOpportunities";

describe("getOpportunityAssetLabel", () => {
  it("resolves only config-backed assets before markets info loads PRO-4093", () => {
    const cases: { chainId: ContractsChainId; asset: OpportunityAsset; label: string | undefined }[] = [
      {
        chainId: AVALANCHE,
        asset: { type: "token", address: getTokenBySymbol(AVALANCHE, "GMX").address },
        label: "GMX",
      },
      {
        chainId: ARBITRUM,
        asset: { type: "token", address: getTokenBySymbol(ARBITRUM, "USDC").address },
        label: "USDC",
      },
      {
        chainId: ARBITRUM,
        asset: { type: "market", address: getMarketByLabel(ARBITRUM, "ETH/USD [WETH-USDC]").marketTokenAddress },
        label: undefined,
      },
    ];

    for (const { chainId, asset, label } of cases) {
      expect(getOpportunityAssetLabel(asset, { chainId, marketsInfoData: undefined })).toBe(label);
    }
  });
});
