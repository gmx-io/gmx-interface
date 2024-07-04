import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { HIGH_SPREAD_THRESHOLD } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxFromTokenAddress,
  useTradeboxMarketInfo,
  useTradeboxToTokenAddress,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { getSpread } from "domain/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";

export function SwapSpreadRow() {
  const tradeFlags = useTradeboxTradeFlags();
  const tokenData = useTokensData();
  const fromTokenAddress = useTradeboxFromTokenAddress();
  const fromToken = getByKey(tokenData, fromTokenAddress);
  const toTokenAddress = useTradeboxToTokenAddress();
  const toToken = getByKey(tokenData, toTokenAddress);
  const marketInfo = useTradeboxMarketInfo();
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

  if (!isSwap) {
    return null;
  }

  return (
    swapSpreadInfo.showSpread &&
    swapSpreadInfo.spread !== undefined && (
      <ExchangeInfo.Row label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
        {formatAmount(swapSpreadInfo.spread * 100n, USD_DECIMALS, 2, true)}%
      </ExchangeInfo.Row>
    )
  );
}
