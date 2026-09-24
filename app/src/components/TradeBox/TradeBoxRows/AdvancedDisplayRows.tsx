import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { AcceptablePriceImpactInputRow } from '@/components/TradeBox/TradeBoxRows/AcceptablePriceImpactInputRow';
import { AllowedSlippageRow } from '@/components/TradeBox/TradeBoxRows/AllowedSlippageRow';
import { CollateralSpreadRow } from '@/components/TradeBox/TradeBoxRows/CollateralSpreadRow';
import { EntryPriceRow } from '@/components/TradeBox/TradeBoxRows/EntryPriceRow';
import { ExpandableRow } from '@/components/TradeBox/TradeBoxRows/ExpandableRow';
import { SwapSpreadRow } from '@/components/TradeBox/TradeBoxRows/SwapSpreadRow';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import {
  formatLeverage,
  formatPercentage,
  formatUsd,
} from '@/utils/legacy/format';
import { OrderType } from '@/selectors/order/types';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';

import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { ReactNode, useCallback, useMemo } from 'react';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import {
  selectSetTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxAdvancedOptions,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxIsLeverageEnabled,
  selectTradeboxKeepLeverage,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxTradeLeverage,
  selectTradeboxTriggerPriceInputValue,
  selectSetTradeboxKeepLeverage,
  selectSetTradeboxAdvancedOptions,
} from '@/selectors/tradebox/baseSelectors';
import { parseValue } from '@/utils/legacy/parse';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxNextPositionValues } from '@/selectors/tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxCollateralSpreadInfo } from '@/selectors/tradebox/selectTradeboxCollateralSpreadInfo';
import { selectTradeboxLiquidityInfo } from '@/selectors/tradebox/selectTradeboxLiquidityInfo';

export function AdvancedDisplayRows() {
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const limitPriceInputValue = useAppStore(
    selectTradeboxTriggerPriceInputValue
  );
  const limitPrice = parseValue(limitPriceInputValue, USD_DECIMALS);

  const setSelectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectSetTradeboxSelectedTriggerAcceptablePriceImpactBps
  );
  const selectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps
  );
  const defaultTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxDefaultTriggerAcceptablePriceImpactBps
  );
  const fees = useAppStore(selectTradeboxTradeFees);
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);

  const { isMarket, isLimit, isTrigger, isSwap } = tradeFlags;

  const isInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      return limitPrice === undefined || new BN(limitPrice).isZero();
    }

    return (
      decreaseAmounts &&
      decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease
    );
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  return (
    <>
      {!isWrapOrUnwrap && <SwapSpreadRow />}
      {/* {!isWrapOrUnwrap && <AvailableLiquidityRow />} */}
      {!isWrapOrUnwrap && <CollateralSpreadRow />}
      {isMarket && !isWrapOrUnwrap && <AllowedSlippageRow />}
      {(isLimit || isTrigger) && !isSwap && (
        <AcceptablePriceImpactInputRow
          className="!mb-4 !mt-4"
          notAvailable={
            isInputDisabled ||
            defaultTriggerAcceptablePriceImpactBps === undefined ||
            selectedTriggerAcceptablePriceImpactBps === undefined
          }
          acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
          recommendedAcceptablePriceImpactBps={
            defaultTriggerAcceptablePriceImpactBps
          }
          priceImpactFeeBps={fees?.positionPriceImpact?.bps}
          setAcceptablePriceImpactBps={
            setSelectedTriggerAcceptablePriceImpactBps
          }
        />
      )}
    </>
  );
}

function LeverageInfoRows() {
  const { isIncrease, isTrigger } = useAppStore(selectTradeboxTradeFlags);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const isLeverageEnabled = useAppStore(selectTradeboxIsLeverageEnabled);
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const leverage = useAppStore(selectTradeboxTradeLeverage);
  const keepLeverage = useAppStore(selectTradeboxKeepLeverage);
  const setKeepLeverage = useAppStore(selectSetTradeboxKeepLeverage);

  if (isIncrease) {
    return (
      <ExchangeInfoRow
        label={t`Leverage`}
        value={
          nextPositionValues?.nextLeverage &&
          increaseAmounts?.sizeDeltaUsd &&
          increaseAmounts?.sizeDeltaUsd.gt(BN_ZERO) ? (
            <ValueTransition
              from={formatLeverage(selectedPosition?.leverageWithPnl)}
              to={formatLeverage(nextPositionValues?.nextLeverage) || '-'}
            />
          ) : (
            formatLeverage(
              isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage
            ) || '-'
          )
        }
      />
    );
  } else if (isTrigger && selectedPosition) {
    let leverageValue: ReactNode = '-';

    if (decreaseAmounts?.isFullClose) {
      leverageValue = t`N/A`;
    } else if (
      selectedPosition.sizeInUsd.eq(decreaseAmounts?.sizeDeltaUsd || BN_ZERO)
    ) {
      leverageValue = '-';
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(selectedPosition.leverageWithPnl)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }

    const keepLeverageChecked = decreaseAmounts?.isFullClose
      ? false
      : (keepLeverage ?? false);

    return (
      <>
        <ExchangeInfoRow label={t`Leverage`} value={leverageValue} />
        {selectedPosition?.leverage && (
          <ToggleSwitch
            isChecked={keepLeverageChecked}
            setIsChecked={setKeepLeverage}
            disabled={decreaseAmounts?.isFullClose}
          >
            <span className="text-14 text-gray-300">
              <Trans>
                Keep leverage at{' '}
                {formatLeverage(selectedPosition.leverageWithPnl)}
              </Trans>
            </span>
          </ToggleSwitch>
        )}
      </>
    );
  }
}

function ExistingPositionInfoRows() {
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);
  const { isSwap, isIncrease } = useAppStore(selectTradeboxTradeFlags);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);

  if (!selectedPosition || isSwap) {
    return null;
  }

  return (
    <>
      {selectedPosition?.sizeInUsd &&
        selectedPosition.sizeInUsd.gt(BN_ZERO) && (
          <ExchangeInfoRow
            label={t`Size`}
            value={
              <ValueTransition
                from={formatUsd(selectedPosition.sizeInUsd)}
                to={formatUsd(nextPositionValues?.nextSizeUsd)}
              />
            }
          />
        )}
      {!isIncrease && (
        <ExchangeInfoRow
          label={t`PnL`}
          value={
            <ValueTransition
              from={
                <>
                  {formatUsd(decreaseAmounts?.estimatedPnl)} (
                  {formatPercentage(
                    decreaseAmounts?.estimatedPnlPercentage,
                    2,
                    { fallbackToZero: true, signed: true }
                  )}
                  )
                </>
              }
              to={
                decreaseAmounts?.sizeDeltaUsd &&
                decreaseAmounts.sizeDeltaUsd.gt(BN_ZERO) ? (
                  <>
                    {formatUsd(nextPositionValues?.nextPnl)} (
                    {formatPercentage(
                      nextPositionValues?.nextPnlPercentage,
                      2,
                      {
                        fallbackToZero: true,
                        signed: true,
                      }
                    )}
                    )
                  </>
                ) : undefined
              }
            />
          }
        />
      )}
      <ExchangeInfoRow
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

export function TradeBoxAdvancedGroups({ className }: { className?: string }) {
  const options = useAppStore(selectTradeboxAdvancedOptions);
  const setOptions = useAppStore(selectSetTradeboxAdvancedOptions);
  const { isSwap } = useAppStore(selectTradeboxTradeFlags);

  const { isLiquidityRisk } = useAppStore(selectTradeboxLiquidityInfo);
  const collateralSpreadInfo = useAppStore(selectTradeboxCollateralSpreadInfo);

  const hasError = useMemo(() => {
    return isLiquidityRisk || collateralSpreadInfo?.isHigh;
  }, [isLiquidityRisk, collateralSpreadInfo]);

  const toggleAdvancedDisplay = useCallback(
    (value: boolean) => {
      setOptions({
        ...options,
        advancedDisplay: value,
      });
    },
    [setOptions, options]
  );

  const isVisible = isSwap ? true : options.advancedDisplay;

  return (
    <ExpandableRow
      open={isVisible}
      title={t`Advanced Display`}
      hideExpand={isSwap}
      onToggle={toggleAdvancedDisplay}
      disableCollapseOnError={false}
      hasError={hasError}
      className={className}
    >
      <AdvancedDisplayRows />
      {/* <div className="App-card-divider" /> */}
      <LeverageInfoRows />
      <EntryPriceRow />
      <ExistingPositionInfoRows />
      {!isSwap && <div className="App-card-divider" />}
    </ExpandableRow>
  );
}
