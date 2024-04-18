import { chooseSuitableMarket, PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { TradeType } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { selectTradeboxSetTradeConfig, selectTradeboxTradeType } from ".";
import { selectPositionsInfoData, selectTokensData } from "../globalSelectors";
import { selectTradeboxGetMaxLongShortLiquidityPool } from "./selectTradeboxGetMaxLongShortLiquidityPool";
import { createSelector } from "context/SyntheticsStateContext/utils";

export const selectTradeboxChooseSuitableMarket = createSelector((q) => {
  const getMaxLongShortLiquidityPool = q(selectTradeboxGetMaxLongShortLiquidityPool);
  const tradeType = q(selectTradeboxTradeType);
  const positionsInfo = q(selectPositionsInfoData);
  const tokensData = q(selectTokensData);
  const setTradeConfig = q(selectTradeboxSetTradeConfig);

  const chooseSuitableMarketWrapped = (
    tokenAddress: string,
    preferredTradeType?: PreferredTradeTypePickStrategy,
    currentTradeType?: TradeType
  ) => {
    const token = getByKey(tokensData, tokenAddress);

    if (!token) return;

    const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

    const suitableParams = chooseSuitableMarket({
      indexTokenAddress: tokenAddress,
      maxLongLiquidityPool,
      maxShortLiquidityPool,
      isSwap: tradeType === TradeType.Swap,
      positionsInfo,
      preferredTradeType: preferredTradeType ?? tradeType,
      currentTradeType,
    });

    if (!suitableParams) return;

    setTradeConfig({
      collateralAddress: suitableParams.collateralTokenAddress,
      toTokenAddress: suitableParams.indexTokenAddress,
      marketAddress: suitableParams.marketTokenAddress,
      tradeType: suitableParams.tradeType,
    });

    return suitableParams;
  };

  return chooseSuitableMarketWrapped;
});
