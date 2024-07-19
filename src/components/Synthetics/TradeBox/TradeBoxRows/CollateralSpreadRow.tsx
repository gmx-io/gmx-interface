import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { BASIS_POINTS_DIVISOR_BIGINT, COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD } from "config/factors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { bigMath } from "lib/bigmath";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatPercentage } from "lib/numbers";
import { useEffect, useState } from "react";

export function CollateralSpreadRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isMarket, isSwap } = tradeFlags;

  const collateralSpreadInfo = useSelector(selectTradeboxCollateralSpreadInfo);

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
