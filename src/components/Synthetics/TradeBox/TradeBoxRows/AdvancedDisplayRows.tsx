import { t } from "@lingui/macro";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxAllowedSlippage,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxExecutionFee,
  selectTradeboxExecutionPrice,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxToToken,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatPercentage, formatUsd } from "lib/numbers";
import { ReactNode, useCallback, useMemo } from "react";

import { ExecutionPriceRow } from "components/Synthetics/ExecutionPriceRow";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { applySlippageToPrice } from "sdk/utils/trade";
import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { EntryPriceRow } from "./EntryPriceRow";
import { LimitPriceRow } from "./LimitPriceRow";
import { SwapSpreadRow } from "./SwapSpreadRow";

function LeverageInfoRows() {
  const { isIncrease, isTrigger } = useSelector(selectTradeboxTradeFlags);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);

  if (isIncrease && selectedPosition) {
    return (
      <SyntheticsInfoRow
        label={t`Leverage`}
        value={
          nextPositionValues?.nextLeverage && increaseAmounts?.sizeDeltaUsd && increaseAmounts?.sizeDeltaUsd > 0 ? (
            <ValueTransition
              from={formatLeverage(selectedPosition?.leverage)}
              to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
            />
          ) : (
            "-"
          )
        }
      />
    );
  } else if (isTrigger && selectedPosition) {
    let leverageValue: ReactNode = "-";

    if (decreaseAmounts?.isFullClose) {
      leverageValue = t`NA`;
    } else if (selectedPosition.sizeInUsd === (decreaseAmounts?.sizeDeltaUsd || 0n)) {
      leverageValue = "-";
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(selectedPosition.leverage)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }

    return (
      <>
        <SyntheticsInfoRow label={t`Leverage`} value={leverageValue} />
      </>
    );
  }

  return null;
}

function ExistingPositionInfoRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const { isSwap, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);

  if (!selectedPosition || isSwap) {
    return null;
  }

  return (
    <>
      {selectedPosition?.sizeInUsd && selectedPosition.sizeInUsd > 0 && (
        <SyntheticsInfoRow
          label={t`Size`}
          value={
            <ValueTransition
              from={formatUsd(selectedPosition.sizeInUsd)!}
              to={formatUsd(nextPositionValues?.nextSizeUsd)}
            />
          }
        />
      )}
      {!isIncrease && (
        <SyntheticsInfoRow
          label={t`PnL`}
          value={
            <ValueTransition
              from={
                <>
                  {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                  {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
                </>
              }
              to={
                decreaseAmounts?.sizeDeltaUsd && decreaseAmounts.sizeDeltaUsd > 0 ? (
                  <>
                    {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                    {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                  </>
                ) : undefined
              }
            />
          }
        />
      )}
      <SyntheticsInfoRow
        label={t`Collateral (${selectedPosition?.collateralToken?.symbol})`}
        value={
          <ValueTransition
            from={formatUsd(selectedPosition?.collateralUsd)}
            to={formatUsd(nextPositionValues?.nextCollateralUsd)}
          />
        }
      />
    </>
  );
}

function IncreaseOrderRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isMarket, isLong } = tradeFlags;
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const executionPrice = useSelector(selectTradeboxExecutionPrice);
  const toToken = useSelector(selectTradeboxToToken);

  const acceptablePrice =
    isMarket && increaseAmounts?.acceptablePrice
      ? applySlippageToPrice(allowedSlippage, increaseAmounts.acceptablePrice, true, isLong)
      : increaseAmounts?.acceptablePrice;

  return (
    <>
      <ExecutionPriceRow
        tradeFlags={tradeFlags}
        fees={fees}
        acceptablePrice={acceptablePrice}
        executionPrice={executionPrice ?? undefined}
        visualMultiplier={toToken?.visualMultiplier}
      />
    </>
  );
}

export function TradeBoxAdvancedGroups() {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isIncrease, isMarket, isLimit, isTrigger } = tradeFlags;

  const { isLiquidityRisk } = useSelector(selectTradeboxLiquidityInfo);

  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);

  const isInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      return limitPrice === undefined || limitPrice === 0n;
    }

    return decreaseAmounts && decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease;
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  const collateralSpreadInfo = useSelector(selectTradeboxCollateralSpreadInfo);

  const hasError = useMemo(() => {
    return isLiquidityRisk || collateralSpreadInfo?.isHigh;
  }, [isLiquidityRisk, collateralSpreadInfo]);

  const toggleAdvancedDisplay = useCallback(
    (value: boolean) => {
      setOptions((ops) => ({
        ...ops,
        advancedDisplay: value,
      }));
    },
    [setOptions]
  );

  const isVisible = options.advancedDisplay;

  return (
    <ExpandableRow
      open={isVisible}
      title={t`Execution Details`}
      onToggle={toggleAdvancedDisplay}
      disableCollapseOnError={false}
      hasError={hasError}
      className="flex flex-col gap-14"
      contentClassName="flex flex-col gap-14"
      scrollIntoViewOnMobile
    >
      {(isLimit || isTrigger) && !isSwap && (
        <>
          <AcceptablePriceImpactInputRow
            notAvailable={
              isInputDisabled ||
              defaultTriggerAcceptablePriceImpactBps === undefined ||
              selectedTriggerAcceptablePriceImpactBps === undefined
            }
            acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
            recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
            priceImpactFeeBps={fees?.positionPriceImpact?.bps}
            setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
          />
          <div className="h-1 bg-stroke-primary" />
        </>
      )}

      {isIncrease && <IncreaseOrderRow />}
      <TradeFeesRow {...fees} feesType={feesType} />
      <NetworkFeeRow executionFee={executionFee} />

      {(isSwap || isLimit || (isMarket && !isSwap) || isMarket) && <div className="h-1 bg-stroke-primary" />}

      {/* only when isSwap */}
      {isSwap && <SwapSpreadRow />}
      {isSwap && isLimit && <LimitPriceRow />}
      {/* only when isLimit */}
      {isLimit && <AvailableLiquidityRow />}
      {/* only when isMarket and not a swap */}
      {isMarket && !isSwap && <CollateralSpreadRow />}
      {isMarket && <AllowedSlippageRow />}

      {((isIncrease && selectedPosition) || (isTrigger && selectedPosition)) && (
        <div className="h-1 bg-stroke-primary" />
      )}

      <LeverageInfoRows />
      <EntryPriceRow />
      <ExistingPositionInfoRows />
    </ExpandableRow>
  );
}
