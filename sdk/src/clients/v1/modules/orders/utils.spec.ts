import { getAddress } from "viem";
import type { Address } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { OrderType } from "utils/orders";

import { matchByMarket } from "./utils";

describe("matchByMarket", () => {
  it("matches a limit increase order by target collateral when the raw collateral address is lowercased", () => {
    const marketAddress = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
    const longTokenAddress = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const shortTokenAddress = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    const result = matchByMarket({
      order: {
        marketAddress,
        initialCollateralTokenAddress: longTokenAddress.toLowerCase(),
        isLong: true,
        orderType: OrderType.LimitIncrease,
        shouldUnwrapNativeToken: false,
        swapPath: [marketAddress],
      } as any,
      nonSwapRelevantDefinedFiltersLowercased: [
        {
          marketAddress: marketAddress.toLowerCase() as Address,
          direction: "long",
          collateralAddress: shortTokenAddress.toLowerCase() as Address,
        },
      ],
      hasNonSwapRelevantDefinedMarkets: true,
      pureDirectionFilters: [],
      hasPureDirectionFilters: false,
      swapRelevantDefinedMarketsLowercased: [],
      hasSwapRelevantDefinedMarkets: false,
      marketsInfoData: {
        [marketAddress]: {
          marketTokenAddress: marketAddress,
          longTokenAddress,
          shortTokenAddress,
          longToken: {
            address: longTokenAddress,
          },
          shortToken: {
            address: shortTokenAddress,
          },
        } as any,
      },
      chainId: ARBITRUM,
    });

    expect(result).toBe(true);
  });
});
