import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { PositionSellerAllowedSlippageRow } from '@/components/PositionSeller/rows/PositionSellerAllowedSlippageRow';
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { AcceptablePriceImpactInputRow } from '@/components/TradeBox/TradeBoxRows/AcceptablePriceImpactInputRow';
import { ExpandableRow } from '@/components/TradeBox/TradeBoxRows/ExpandableRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { OrderOption, OrderType } from '@/selectors/order/types';
import {
  selectPositionSellerDefaultTriggerAcceptablePriceImpactBps,
  selectPositionSellerOrderOption,
  selectPositionSellerSelectedTriggerAcceptablePriceImpactBps,
  selectPositionSellerTriggerPriceInputValue,
  selectSetPositionSellerKeepLeverage,
  selectSetPositionSellerSelectedTriggerAcceptablePriceImpactBps,
} from '@/selectors/positionSeller/baseSelectors';
import { selectPositionSellerClosingPosition } from '@/selectors/positionSeller/selectPositionSellerClosingPosition';
import { selectPositionSellerDecreaseAmounts } from '@/selectors/positionSeller/selectPositionSellerDecreaseAmounts';
import { selectPositionSellerDecreaseAmountsWithKeepLeverage } from '@/selectors/positionSeller/selectPositionSellerDecreaseAmountsWithKeepLeverage';
import { selectPositionSellerFees } from '@/selectors/positionSeller/selectPositionSellerFees';
import { selectPositionSellerKeepLeverage } from '@/selectors/positionSeller/selectPositionSellerKeepLeverage';
import { selectPositionSellerLeverageDisabledByCollateral } from '@/selectors/positionSeller/selectPositionSellerLeverageDisabledByCollateral';
import { selectPositionSellerNextPositionValuesForDecrease } from '@/selectors/positionSeller/selectPositionSellerNextPositionValuesForDecrease';
import { selectTradeboxAdvancedOptions } from '@/selectors/tradebox/baseSelectors';
import {
  formatDeltaUsd,
  formatLeverage,
  formatUsd,
} from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import React, { useCallback } from 'react';

export function PositionSellerAdvancedRows() {
  const triggerPriceInputValue = useAppStore(
    selectPositionSellerTriggerPriceInputValue
  );
  const tradeboxAdvancedOptions = useAppStore(selectTradeboxAdvancedOptions);
  const [open, setOpen] = React.useState(
    tradeboxAdvancedOptions.advancedDisplay
  );
  const position = useAppStore(selectPositionSellerClosingPosition);
  const orderOption = useAppStore(selectPositionSellerOrderOption);
  const defaultTriggerAcceptablePriceImpactBps = useAppStore(
    selectPositionSellerDefaultTriggerAcceptablePriceImpactBps
  );
  const selectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectPositionSellerSelectedTriggerAcceptablePriceImpactBps
  );
  const setSelectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectSetPositionSellerSelectedTriggerAcceptablePriceImpactBps
  );
  const keepLeverage = useAppStore(selectPositionSellerKeepLeverage);
  const setKeepLeverage = useAppStore(selectSetPositionSellerKeepLeverage);
  const leverageCheckboxDisabledByCollateral = useAppStore(
    selectPositionSellerLeverageDisabledByCollateral
  );

  const isTrigger = orderOption === OrderOption.Trigger;

  const decreaseAmountsRaw = useAppStore(selectPositionSellerDecreaseAmounts);
  const decreaseAmountsWithKeepLeverage = useAppStore(
    selectPositionSellerDecreaseAmountsWithKeepLeverage
  );
  const decreaseAmounts = keepLeverage
    ? decreaseAmountsWithKeepLeverage
    : decreaseAmountsRaw;

  const nextPositionValues = useAppStore(
    selectPositionSellerNextPositionValuesForDecrease
  );

  const { fees } = useAppStore(selectPositionSellerFees);

  const isStopLoss =
    decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease;

  const acceptablePriceImpactInputRow = (() => {
    return (
      <AcceptablePriceImpactInputRow
        notAvailable={!triggerPriceInputValue || isStopLoss || !decreaseAmounts}
        acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
        recommendedAcceptablePriceImpactBps={
          defaultTriggerAcceptablePriceImpactBps
        }
        priceImpactFeeBps={fees?.positionPriceImpact?.bps}
        setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
      />
    );
  })();

  const sizeRow = (
    <ExchangeInfoRow
      label={t`Size`}
      value={
        <ValueTransition
          from={formatUsd(position?.sizeInUsd)}
          to={formatUsd(nextPositionValues?.nextSizeUsd)}
        />
      }
    />
  );

  const pnlRow =
    position &&
    (isTrigger ? (
      <ExchangeInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={
              <>
                {formatDeltaUsd(
                  decreaseAmounts?.estimatedPnl,
                  decreaseAmounts?.estimatedPnlPercentage
                )}
              </>
            }
            to={
              decreaseAmounts?.sizeDeltaUsd ? (
                <>
                  {formatDeltaUsd(
                    nextPositionValues?.nextPnl,
                    nextPositionValues?.nextPnlPercentage
                  )}
                </>
              ) : undefined
            }
          />
        }
      />
    ) : (
      <ExchangeInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={formatDeltaUsd(position.pnl, position.pnlPercentage)}
            to={formatDeltaUsd(
              nextPositionValues?.nextPnl,
              nextPositionValues?.nextPnlPercentage
            )}
          />
        }
      />
    ));

  const keepLeverageChecked = decreaseAmounts?.isFullClose
    ? false
    : (keepLeverage ?? false);
  let keepLeverageAtValue: string | undefined = '...';
  if (position?.leverageWithPnl && !decreaseAmounts?.isFullClose) {
    keepLeverageAtValue = formatLeverage(position.leverageWithPnl);
  }

  const keepLeverageText = (
    <Trans>Keep leverage at {keepLeverageAtValue}</Trans>
  );
  const renderKeepLeverageTooltipContent = useCallback(
    () => (
      <Trans>
        Keep leverage is not available as Position exceeds max allowed leverage.
      </Trans>
    ),
    []
  );
  const keepLeverageTextElem = leverageCheckboxDisabledByCollateral ? (
    <TooltipWithPortal
      handle={keepLeverageText}
      renderContent={renderKeepLeverageTooltipContent}
    />
  ) : (
    keepLeverageText
  );
  let leverageValue: React.ReactNode = '-';

  if (decreaseAmounts?.isFullClose) {
    leverageValue = t`N/A`;
  } else if (position) {
    if (decreaseAmounts?.sizeDeltaUsd.eq(position.sizeInUsd)) {
      leverageValue = '-';
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(position.leverageWithPnl)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }
  }

  if (!position) {
    return null;
  }

  return (
    <ExpandableRow
      className="-my-15"
      title={t`Advanced display`}
      open={open}
      onToggle={setOpen}
    >
      {isTrigger && acceptablePriceImpactInputRow}
      {!isTrigger && <PositionSellerAllowedSlippageRow />}
      <div className="App-card-divider" />
      <ExchangeInfoRow label={t`Leverage`} value={leverageValue} />

      <div className="PositionEditor-keep-leverage-settings">
        <ToggleSwitch
          textClassName="Exchange-info-label"
          isChecked={
            leverageCheckboxDisabledByCollateral ? false : keepLeverageChecked
          }
          setIsChecked={setKeepLeverage}
          disabled={
            leverageCheckboxDisabledByCollateral ?? decreaseAmounts?.isFullClose
          }
        >
          {keepLeverageTextElem}
        </ToggleSwitch>
      </div>
      {sizeRow}
      {pnlRow}

      <div className="Exchange-info-row">
        <div>
          <Tooltip
            handle={
              <span className="Exchange-info-label">
                <Trans>Collateral ({position?.collateralToken?.symbol})</Trans>
              </span>
            }
            position="top-start"
            renderContent={() => {
              return (
                <Trans>
                  Initial Collateral (Collateral excluding Borrow and Funding
                  Fee).
                </Trans>
              );
            }}
          />
        </div>
        <div className="align-right">
          <ValueTransition
            from={formatUsd(position?.collateralUsd)}
            to={formatUsd(nextPositionValues?.nextCollateralUsd)}
          />
        </div>
      </div>
    </ExpandableRow>
  );
}
