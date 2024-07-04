import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD,
  HIGH_SPREAD_THRESHOLD,
} from "config/factors";
import {
  useTradeboxCollateralToken,
  useTradeboxMarketInfo,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatPercentage } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

export function CollateralSpreadRow() {
  const tradeFlags = useTradeboxTradeFlags();
  const marketInfo = useTradeboxMarketInfo();
  const collateralToken = useTradeboxCollateralToken();

  const { isMarket, isSwap } = tradeFlags;

  const { indexToken } = marketInfo ?? {};

  const collateralSpreadInfo = useMemo(() => {
    if (!indexToken || !collateralToken) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken.prices);

    if (getIsEquivalentTokens(collateralToken, indexToken)) {
      return {
        spread: totalSpread,
        isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
      };
    }

    totalSpread = totalSpread + getSpread(collateralToken!.prices!);

    return {
      spread: totalSpread,
      isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
    };
  }, [collateralToken, indexToken]);

  const [initialCollateralSpread, setInitialCollateralSpread] = useState<bigint | undefined>();
  const collateralSpreadPercent =
    collateralSpreadInfo && collateralSpreadInfo.spread !== undefined
      ? bigMath.mulDiv(collateralSpreadInfo.spread, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals(1, USD_DECIMALS))
      : undefined;

  const isNearZeroFromStart =
    initialCollateralSpread === 0n &&
    (collateralSpreadPercent ?? 0) < COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD;

  const showCollateralSpread = !isSwap && isMarket && !isNearZeroFromStart;

  useEffect(() => {
    if (collateralSpreadPercent !== undefined && initialCollateralSpread === undefined) {
      setInitialCollateralSpread(collateralSpreadPercent);
    }
  }, [collateralSpreadPercent, initialCollateralSpread]);

  if (!showCollateralSpread) {
    return null;
  }

  return (
    <ExchangeInfo.Row label={t`Collateral Spread`} isWarning={collateralSpreadInfo?.isHigh}>
      {formatPercentage(collateralSpreadPercent)}
    </ExchangeInfo.Row>
  );
}
