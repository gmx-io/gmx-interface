import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
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
  const { _ } = useLingui();

  return useMemo(() => {
    if (!collateralToken || !marketInfo) {
      return null;
    }

    return _(getCollateralInHint(tradeType, collateralToken, marketInfo));
  }, [_, collateralToken, marketInfo, tradeType]);
}

export function getCollateralInHint(
  tradeType: TradeType,
  collateralToken: TokenData,
  marketInfo: MarketInfo
): MessageDescriptor {
  const indexSymbol = marketInfo.indexToken.symbol;
  const collateralSymbol = collateralToken.symbol;

  if (tradeType === TradeType.Long) {
    if (collateralToken.isStable) {
      return msg`Pure ${indexSymbol} long. Exposure is only from the position.`;
    } else if (marketInfo.indexToken.isSynthetic) {
      return msg`Double exposure: long ${indexSymbol} from position + long ${collateralSymbol} from collateral. Liquidation price varies with ${collateralSymbol} price.`;
    } else {
      return msg`Double ${indexSymbol} exposure from position and collateral. Higher liquidation price than stablecoin collateral.`;
    }
  } else {
    if (collateralToken.isStable) {
      return msg`Pure ${indexSymbol} short. Exposure is only from the position.`;
    } else if (marketInfo.indexToken.isSynthetic) {
      return msg`Mixed exposure: short ${indexSymbol} + long ${collateralSymbol} collateral. Liquidation price varies with ${collateralSymbol} price.`;
    } else {
      return msg`Mixed exposure: short ${indexSymbol} + long ${collateralSymbol} collateral. Useful for delta-neutral strategies to earn funding.`;
    }
  }
}
