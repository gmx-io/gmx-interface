import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD,
  HIGH_SPREAD_THRESHOLD,
} from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxAdvancedOptions,
  useTradeboxCollateralToken,
  useTradeboxDecreasePositionAmounts,
  useTradeboxDefaultTriggerAcceptablePriceImpactBps,
  useTradeboxFees,
  useTradeboxFromTokenAddress,
  useTradeboxIncreasePositionAmounts,
  useTradeboxLiquidity,
  useTradeboxMarketInfo,
  useTradeboxMaxLiquidityPath,
  useTradeboxSelectedTriggerAcceptablePriceImpactBps,
  useTradeboxSetSelectedAcceptablePriceImpactBps,
  useTradeboxSwapAmounts,
  useTradeboxToTokenAddress,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { OrderType } from "domain/synthetics/orders";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatPercentage, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useEffect, useMemo, useState } from "react";
import { AllowedSlippageRow } from "./AllowedSlippageRow";

export const RISK_THRESHOLD_BPS = 5000n;

export function AdvancedDisplayRows({ enforceVisible = false }: { enforceVisible?: boolean }) {
  const { advancedDisplay: isVisible } = useTradeboxAdvancedOptions();
  const tradeFlags = useTradeboxTradeFlags();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const decreaseAmounts = useTradeboxDecreasePositionAmounts();

  const setSelectedTriggerAcceptablePriceImpactBps = useTradeboxSetSelectedAcceptablePriceImpactBps();
  const selectedTriggerAcceptablePriceImpactBps = useTradeboxSelectedTriggerAcceptablePriceImpactBps();
  const defaultTriggerAcceptablePriceImpactBps = useTradeboxDefaultTriggerAcceptablePriceImpactBps();
  const fees = useTradeboxFees();

  const { savedAllowedSlippage } = useSettings();
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);

  const { isMarket, isLimit, isTrigger } = tradeFlags;

  const availableLiquidityRow = useAvailableLiquidityRow();
  const collateralSpreadRow = useCollateralSpreadRow();
  const swapSpreadRow = useSwapSpreadRow();

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage, isVisible]);

  const enableAcceptableImpactInput =
    (isLimit && increaseAmounts) ||
    (isTrigger && decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease);

  const acceptablePriceImpactBps = useMemo(() => {
    return selectedTriggerAcceptablePriceImpactBps ?? 0n;
  }, [selectedTriggerAcceptablePriceImpactBps]);

  const recommendedAcceptablePriceImpactBps = useMemo(() => {
    return defaultTriggerAcceptablePriceImpactBps ?? 0n;
  }, [defaultTriggerAcceptablePriceImpactBps]);

  const isZeroPrices = acceptablePriceImpactBps === 0n && recommendedAcceptablePriceImpactBps === 0n;

  if (!isVisible && !enforceVisible) {
    return null;
  }

  return (
    <>
      {swapSpreadRow}
      {availableLiquidityRow}
      {collateralSpreadRow}
      {isMarket && (
        <AllowedSlippageRow
          defaultSlippage={savedAllowedSlippage}
          allowedSlippage={allowedSlippage}
          setSlippage={setAllowedSlippage}
        />
      )}
      {(isLimit || isTrigger) && (
        <AcceptablePriceImpactInputRow
          notAvailable={!enableAcceptableImpactInput || isZeroPrices}
          acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps ?? 0n}
          recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps ?? 0n}
          priceImpactFeeBps={fees?.positionPriceImpact?.bps}
          setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
        />
      )}
    </>
  );
}

function useCollateralSpreadRow() {
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

function useSwapSpreadRow() {
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

function useAvailableLiquidityRow() {
  const tokensData = useTokensData();
  const tradeFlags = useTradeboxTradeFlags();
  const swapAmounts = useTradeboxSwapAmounts();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const toTokenAddress = useTradeboxToTokenAddress();
  const { longLiquidity, shortLiquidity } = useTradeboxLiquidity();
  const toToken = getByKey(tokensData, toTokenAddress);
  const { maxLiquidity: swapLiquidityUsd } = useTradeboxMaxLiquidityPath();
  const { isLong, isLimit, isSwap, isIncrease } = tradeFlags;

  if (!isLimit) {
    return null;
  }

  let availableLiquidityUsd: bigint | undefined = undefined;
  let availableLiquidityAmount: bigint | undefined = undefined;
  let isLiquidityRisk = false;

  let tooltipContent = "";

  if (isSwap && swapAmounts) {
    availableLiquidityUsd = swapLiquidityUsd;

    availableLiquidityAmount = convertToTokenAmount(availableLiquidityUsd, toToken?.decimals, toToken?.prices.maxPrice);

    isLiquidityRisk =
      bigMath.mulDiv(availableLiquidityUsd, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) < swapAmounts.usdOut;

    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
      : t`The order will only execute if the Min. Receive is met and there is sufficient liquidity.`;
  }

  if (isIncrease && increaseAmounts) {
    availableLiquidityUsd = isLong ? longLiquidity : shortLiquidity;

    isLiquidityRisk =
      bigMath.mulDiv(availableLiquidityUsd!, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) <
      increaseAmounts.sizeDeltaUsd;

    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the price conditions are met.`
      : t`The order will only execute if the price conditions are met and there is sufficient liquidity.`;
  }

  return (
    <ExchangeInfo.Row label={t`Available Liquidity`}>
      <Tooltip
        position="bottom-end"
        handleClassName={isLiquidityRisk ? "negative" : ""}
        handle={
          isSwap
            ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol)
            : formatUsd(availableLiquidityUsd)
        }
        renderContent={() => tooltipContent}
      />
    </ExchangeInfo.Row>
  );
}
