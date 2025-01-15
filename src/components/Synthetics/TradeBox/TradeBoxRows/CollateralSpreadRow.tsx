import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { bigMath } from "lib/bigmath";
import { expandDecimals, formatPercentage } from "lib/numbers";

export function CollateralSpreadRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isMarket, isSwap } = tradeFlags;

  const collateralSpreadInfo = useSelector(selectTradeboxCollateralSpreadInfo);

  const collateralSpreadPercent =
    collateralSpreadInfo && collateralSpreadInfo.spread !== undefined
      ? bigMath.mulDiv(collateralSpreadInfo.spread, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals(1, USD_DECIMALS))
      : undefined;

  const showCollateralSpread = !isSwap && isMarket;

  if (!showCollateralSpread) {
    return null;
  }

  return (
    <SyntheticsInfoRow label={t`Collateral Spread`} isWarning={collateralSpreadInfo?.isHigh}>
      {collateralSpreadPercent !== undefined ? formatPercentage(collateralSpreadPercent) : "-"}
    </SyntheticsInfoRow>
  );
}
