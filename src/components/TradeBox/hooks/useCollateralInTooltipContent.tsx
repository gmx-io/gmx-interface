import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import {
  selectTradeboxCollateralToken,
  selectTradeboxMarketInfo,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketInfo } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { TradeType } from "sdk/utils/trade/types";

export function useCollateralInTooltipContent() {
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const tradeType = useSelector(selectTradeboxTradeType);

  return useMemo(() => {
    if (!collateralToken || !marketInfo) {
      return null;
    }

    return getCollateralInHintText(tradeType, collateralToken, marketInfo);
  }, [collateralToken, marketInfo, tradeType]);
}

export function getCollateralInHintText(tradeType: TradeType, collateralToken: TokenData, marketInfo: MarketInfo) {
  const indexSymbol = marketInfo.indexToken.symbol;
  const collateralSymbol = collateralToken.symbol;

  if (tradeType === TradeType.Long) {
    if (collateralToken.isStable) {
      return <Trans>Pure {indexSymbol} long. Your exposure is only from the position.</Trans>;
    } else if (marketInfo.indexToken.isSynthetic) {
      return (
        <Trans>
          Double exposure: Long {indexSymbol} from position + long {collateralSymbol} from collateral. Liquidation price
          varies with {collateralSymbol} price.
        </Trans>
      );
    } else {
      return (
        <Trans>
          Double {indexSymbol} exposure from position and collateral. Higher liquidation price than stablecoin
          collateral.
        </Trans>
      );
    }
  } else {
    if (collateralToken.isStable) {
      return <Trans>Pure {indexSymbol} short. Your exposure is only from the position.</Trans>;
    } else if (marketInfo.indexToken.isSynthetic) {
      return (
        <Trans>
          Mixed exposure: Short {indexSymbol} + long {collateralSymbol} collateral. Liquidation price varies with{" "}
          {collateralSymbol} price.
        </Trans>
      );
    } else {
      return (
        <Trans>
          Mixed exposure: Short {indexSymbol} + long {collateralSymbol} collateral. Useful for delta-neutral strategies
          to earn funding.
        </Trans>
      );
    }
  }
}
