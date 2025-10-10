import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";

import { selectIsSetAcceptablePriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultAllowedSwapSlippageBps,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarkPrice,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedAllowedSwapSlippageBps,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxSetSelectedAllowedSwapSlippageBps,
  selectTradeboxTotalSwapImpactBps,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
  selectTradeboxTriggerRatioInputValue,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { formatUsd } from "lib/numbers";
import { ExecutionFee } from "sdk/types/fees";
import { isStopIncreaseOrderType } from "sdk/utils/orders";

import { AcceptablePriceImpactInputRow } from "components/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { AllowedSwapSlippageInputRow } from "components/AllowedSwapSlippageInputRowImpl/AllowedSwapSlippageInputRowImpl";
import { ExitPriceRow } from "components/ExitPriceRow/ExitPriceRow";
import { ExpandableRow } from "components/ExpandableRow";
import { NetworkFeeRow } from "components/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { TradeFeesRow } from "components/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { EntryPriceRow } from "./EntryPriceRow";
import { NextStoredImpactRows } from "./NextStoredImpactRows";
import { SwapSpreadRow } from "./SwapSpreadRow";
import { useTradeboxAllowedSwapSlippageValues } from "../hooks/useTradeboxAllowedSwapSlippageValues";

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
        <SyntheticsInfoRow label={t`Leverage`} value={leverageValue} valueClassName="numbers" />
      </>
    );
  }

  return null;
}

function ExistingPositionInfoRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  if (!selectedPosition || isSwap) {
    return null;
  }

  return (
    <>
      {selectedPosition?.sizeInUsd !== undefined && selectedPosition.sizeInUsd > 0 && (
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

export function TradeBoxAdvancedGroups({
  slippageInputId,
  gasPaymentParams,
  totalExecutionFee,
}: {
  slippageInputId: string;
  gasPaymentParams: GasPaymentParams | undefined;
  totalExecutionFee: ExecutionFee | undefined;
}) {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isMarket, isLimit, isTrigger, isTwap, isLong } = tradeFlags;

  const { isLiquidityRisk } = useSelector(selectTradeboxLiquidityInfo);

  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);
  const triggerRatioInputValue = useSelector(selectTradeboxTriggerRatioInputValue);
  const totalSwapImpactBps = useSelector(selectTradeboxTotalSwapImpactBps);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);

  const defaultAllowedSwapSlippageBps = useSelector(selectTradeboxDefaultAllowedSwapSlippageBps);
  const selectedAllowedSwapSlippageBps = useSelector(selectTradeboxSelectedAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectTradeboxSetSelectedAllowedSwapSlippageBps);

  useTradeboxAllowedSwapSlippageValues();

  const isPriceImpactInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      if (increaseAmounts.limitOrderType && isStopIncreaseOrderType(increaseAmounts.limitOrderType)) {
        return true;
      }

      return limitPrice === undefined || limitPrice === 0n;
    }

    return decreaseAmounts && decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease;
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  const isSwapImpactInputDisabled = useMemo(() => {
    if (isLimit && isSwap) {
      return !triggerRatioInputValue;
    }

    return true;
  }, [isLimit, isSwap, triggerRatioInputValue]);

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
  const markPrice = useSelector(selectTradeboxMarkPrice);

  return (
    <ExpandableRow
      open={isVisible}
      title={t`Execution Details`}
      onToggle={toggleAdvancedDisplay}
      disableCollapseOnError={false}
      hasError={hasError}
      contentClassName="flex flex-col gap-14"
      scrollIntoViewOnMobile
    >
      {isTrigger ? (
        <ExitPriceRow isSwap={isSwap} fees={fees} price={isTrigger ? limitPrice : markPrice} isLong={isLong} />
      ) : null}
      {(isLimit || isTrigger || isTwap) && !isSwap && isSetAcceptablePriceImpactEnabled && (
        <>
          <AcceptablePriceImpactInputRow
            notAvailable={
              isPriceImpactInputDisabled ||
              defaultTriggerAcceptablePriceImpactBps === undefined ||
              selectedTriggerAcceptablePriceImpactBps === undefined
            }
            acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
            recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
            priceImpactFeeBps={
              isTrigger ? fees?.decreasePositionPriceImpact?.bps : fees?.increasePositionPriceImpact?.bps
            }
            setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
          />
        </>
      )}

      <TradeFeesRow {...fees} feesType={feesType} />
      <NetworkFeeRow executionFee={totalExecutionFee} gasPaymentParams={gasPaymentParams} />

      {isTwap && isSwap ? (
        <SyntheticsInfoRow label={<Trans>Acceptable Swap Impact</Trans>} value={<Trans>N/A</Trans>} />
      ) : null}

      {/* only when isSwap */}
      {isSwap && <SwapSpreadRow />}
      {/* only when isLimit */}
      {isSwap && isLimit && (
        <AllowedSwapSlippageInputRow
          notAvailable={
            isSwapImpactInputDisabled ||
            defaultAllowedSwapSlippageBps === undefined ||
            selectedAllowedSwapSlippageBps === undefined
          }
          totalSwapImpactBps={totalSwapImpactBps}
          allowedSwapSlippageBps={selectedAllowedSwapSlippageBps}
          recommendedAllowedSwapSlippageBps={defaultAllowedSwapSlippageBps}
          setAllowedSwapSlippageBps={setSelectedAllowedSwapSlippageBps}
        />
      )}
      {(isLimit || isTwap) && <AvailableLiquidityRow />}
      {/* only when isMarket and not a swap */}
      {!isTwap && (
        <>
          {isMarket && !isSwap && <CollateralSpreadRow />}
          {isMarket && <AllowedSlippageRow slippageInputId={slippageInputId} />}
          {!isSwap && <NextStoredImpactRows />}
          <LeverageInfoRows />
          <EntryPriceRow />
          <ExistingPositionInfoRows />
        </>
      )}
    </ExpandableRow>
  );
}
