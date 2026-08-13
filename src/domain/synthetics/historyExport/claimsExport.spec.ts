import { describe, expect, it } from "vitest";

import { ClaimType } from "domain/synthetics/claimHistory/types";

import { buildClaimsCsvRows } from "./claimsExport";

describe("buildClaimsCsvRows", () => {
  it("expands every market and token leg deterministically", () => {
    const rows = buildClaimsCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "0xhash:4",
          eventName: ClaimType.ClaimFunding,
          account: "0xAccount",
          marketAddresses: ["0xMarketA", "0xMarketB"],
          tokenAddresses: ["0xTokenA", "0xTokenB"],
          amounts: ["12500000", "3250000"],
          tokenPrices: ["1000000000000000000000000", "1000000000000000000000000"],
          isLongOrders: [true, false],
          transactionHash: "0xHash",
          timestamp: 1783425600,
        },
      ],
      marketsInfoData: {
        "0xMarketA": {
          indexToken: { symbol: "ETH" },
          indexTokenAddress: "0xEth",
          isSpotOnly: false,
        },
        "0xMarketB": {
          indexToken: { symbol: "BTC" },
          indexTokenAddress: "0xBtc",
          isSpotOnly: false,
        },
      } as any,
      tokensData: {
        "0xTokenA": { symbol: "USDC", decimals: 6 },
        "0xTokenB": { symbol: "USDC", decimals: 6 },
      } as any,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      amount: "12.5",
      amount_usd: "12.5",
      is_long: true,
      leg_index: 0,
      record_id: "42161:0xhash:4:0",
      log_index: "4",
    });
    expect(rows[1]).toMatchObject({ amount: "3.25", is_long: false, leg_index: 1 });
  });

  it("keeps non-economic and unresolved rows for manual review", () => {
    const [row] = buildClaimsCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "request-1",
          eventName: ClaimType.SettleFundingFeeCreated,
          account: "0xAccount",
          marketAddresses: ["0xUnknownMarket"],
          tokenAddresses: [],
          amounts: [],
          tokenPrices: [],
          isLongOrders: [true],
          transactionHash: "0xHash",
          timestamp: 1783425600,
        },
      ],
      marketsInfoData: {},
      tokensData: {},
    });

    expect(row).toMatchObject({
      status: "created",
      amount: "",
      data_completeness: "partial",
      market_address: "0xUnknownMarket",
      claim_action_id: "42161:request-1",
    });
  });
});
