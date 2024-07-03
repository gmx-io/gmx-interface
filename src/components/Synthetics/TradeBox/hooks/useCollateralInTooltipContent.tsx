import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import {
  useTradeboxCollateralToken,
  useTradeboxMarketInfo,
  useTradeboxTradeType,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { MarketInfo } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { TradeType } from "../../../../domain/synthetics/trade/types";

export function useCollateralInTooltipContent() {
  const collateralToken = useTradeboxCollateralToken();
  const marketInfo = useTradeboxMarketInfo();
  const tradeType = useTradeboxTradeType();

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
      return <Trans>You will be long {indexSymbol} only from your long position.</Trans>;
    } else if (marketInfo.indexToken.isSynthetic) {
      return (
        <Trans>
          You will be long {indexSymbol} from your long position, while being long {collateralSymbol} from your{" "}
          {collateralSymbol} collateral. The liquidation price will vary based on the price of {collateralSymbol}.
        </Trans>
      );
    } else {
      return (
        <Trans>
          You will be long {indexSymbol} from your long position, as well as from your {collateralSymbol} collateral.
          The liquidation price is higher compared to using a stablecoin as collateral since the worth of the collateral
          will change with its price.
        </Trans>
      );
    }
  } else {
    if (collateralToken.isStable) {
      return <Trans>You will be short {indexSymbol} only from your short position.</Trans>;
    } else if (marketInfo.indexToken.isSynthetic) {
      return (
        <Trans>
          You will be short {indexSymbol} from your short position, while being long {collateralSymbol} from your{" "}
          {collateralSymbol} collateral. The liquidation price will vary based on the price of {collateralSymbol}.
        </Trans>
      );
    } else {
      return (
        <Trans>
          You will be short {indexSymbol} from your short position, while being long {collateralSymbol} from your{" "}
          {collateralSymbol} collateral. This can be useful for delta-neutral strategies to earn funding fees.
        </Trans>
      );
    }
  }
}
