import { t } from "@lingui/macro";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { HIGH_SPREAD_THRESHOLD } from "config/constants";
import { USD_DECIMALS } from "config/factors";
import {
  selectTradeboxFromToken,
  selectTradeboxMarketInfo,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSpread } from "domain/tokens";
import { formatAmount } from "lib/numbers";
import { useMemo } from "react";

export function SwapSpreadRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const indexToken = marketInfo?.indexToken;

  const { isMarket, isSwap, isLong, isIncrease } = tradeFlags;

  const swapSpreadInfo = useMemo(() => {
    let spread = BigInt(0);

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread + toSpread;
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread + toSpread;

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread > HIGH_SPREAD_THRESHOLD;

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [isSwap, fromToken, toToken, isIncrease, indexToken, isMarket, isLong]);

  if (!isSwap || !swapSpreadInfo.showSpread || swapSpreadInfo.spread === undefined) {
    return null;
  }

  return (
    <SyntheticsInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
      {formatAmount(swapSpreadInfo.spread * 100n, USD_DECIMALS, 2, true)}%
    </SyntheticsInfoRow>
  );
}
