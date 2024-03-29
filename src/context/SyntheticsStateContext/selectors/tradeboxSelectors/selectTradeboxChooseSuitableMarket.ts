import { createEnhancedSelector } from "context/SyntheticsStateContext/utils";
import { chooseSuitableMarket } from "domain/synthetics/markets/chooseSuitableMarket";
import { TradeType } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { selectTradeboxSetToTokenAddress, selectTradeboxTradeType } from ".";
import { selectChainId, selectPositionsInfoData, selectTokensData } from "../globalSelectors";
import { selectTradeboxGetMaxLongShortLiquidityPool } from "./selectTradeboxGetMaxLongShortLiquidityPool";

export const selectTradeboxChooseSuitableMarket = createEnhancedSelector((q) => {
  const chainId = q(selectChainId);
  const getMaxLongShortLiquidityPool = q(selectTradeboxGetMaxLongShortLiquidityPool);
  const tradeType = q(selectTradeboxTradeType);
  const positionsInfo = q(selectPositionsInfoData);
  const tokensData = q(selectTokensData);
  const setSelectedToken = q(selectTradeboxSetToTokenAddress);

  const selectSuitableMarketWrapped = (tokenAddress: string, preferredTradeType?: TradeType) => {
    const token = getByKey(tokensData, tokenAddress);

    if (!token) return;

    const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

    const suitableParams = chooseSuitableMarket({
      chainId,
      tokenAddress,
      maxLongLiquidityPool,
      maxShortLiquidityPool,
      isSwap: tradeType === TradeType.Swap,
      positionsInfo,
      preferredTradeType: preferredTradeType ?? tradeType,
    });

    if (!suitableParams) return;

    setSelectedToken(suitableParams.indexTokenAddress, suitableParams.marketTokenAddress, suitableParams.tradeType);

    return suitableParams;
  };

  return selectSuitableMarketWrapped;
});
