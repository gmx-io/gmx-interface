import { dataStoreAddress, readReader } from "domain/testUtils/parity/context";
import { parity } from "domain/testUtils/parity/parity";
import {
  getMarketWithoutVirtualInventory,
  getSwapMidUsdIn,
  getOurSwapPriceImpact,
  getSwapTokens,
  isSwapMarket,
  swapCases,
} from "domain/testUtils/parity/swapPricing";
import { convertToContractTokenPrices } from "sdk/utils/tokens/utils";

parity("getPriceImpactForSwap <-> Reader.getSwapPriceImpact, impact before caps", {
  markets: isSwapMarket,
  cases: swapCases,
  ours: (input) => {
    const midUsdIn = getSwapMidUsdIn(input);

    return { priceImpactUsd: getOurSwapPriceImpact(input, midUsdIn).priceImpactDeltaUsd };
  },
  contract: async (input) => {
    const { ctx, market, testCase } = input;
    const [tokenIn, tokenOut] = getSwapTokens(input);
    const tokenInPrices = convertToContractTokenPrices(tokenIn.prices, tokenIn.decimals);
    const tokenOutPrices = convertToContractTokenPrices(tokenOut.prices, tokenOut.decimals);
    const [priceImpactUsd] = await readReader<readonly [bigint, bigint, bigint]>(ctx, "getSwapPriceImpact", [
      dataStoreAddress,
      market.marketTokenAddress,
      tokenIn.address,
      tokenOut.address,
      testCase.amountIn,
      tokenInPrices,
      tokenOutPrices,
    ]);

    return { priceImpactUsd };
  },
  fields: { priceImpactUsd: { bpsOf: getSwapMidUsdIn, toleranceBps: 0.001 } },
  requiredCases: [
    {
      name: "a swap where the virtual inventory impact wins",
      when: (input, ours) => {
        const poolMarket = getMarketWithoutVirtualInventory(input.market);
        const midUsdIn = getSwapMidUsdIn(input);
        const poolImpact = getOurSwapPriceImpact({ ...input, market: poolMarket }, midUsdIn);

        return ours.priceImpactUsd !== poolImpact.priceImpactDeltaUsd;
      },
    },
  ],
});
