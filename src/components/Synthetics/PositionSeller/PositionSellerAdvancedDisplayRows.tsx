import { Trans, t } from "@lingui/macro";
import React, { useCallback } from "react";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  usePositionSeller,
  usePositionSellerKeepLeverage,
  usePositionSellerLeverageDisabledByCollateral,
} from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { formatDeltaUsd, formatPercentage, formatUsd } from "lib/numbers";
import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerFees,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { ExpandableRow } from "../ExpandableRow";

export type Props = {
  triggerPriceInputValue: string;
};

export function PositionSellerAdvancedRows(p: Props) {
  const { triggerPriceInputValue } = p;
  const tradeboxAdvancedOptions = useSelector(selectTradeboxAdvancedOptions);
  const [open, setOpen] = React.useState(tradeboxAdvancedOptions.advancedDisplay);
  const position = useSelector(selectPositionSellerPosition);

  const {
    allowedSlippage,
    defaultTriggerAcceptablePriceImpactBps,
    orderOption,
    setAllowedSlippage,
    setKeepLeverage,
    setSelectedTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
  } = usePositionSeller();
  const keepLeverage = usePositionSellerKeepLeverage();
  const leverageCheckboxDisabledByCollateral = usePositionSellerLeverageDisabledByCollateral();

  const isTrigger = orderOption === OrderOption.Trigger;

  const decreaseAmounts = useSelector(selectPositionSellerDecreaseAmounts);

  const nextPositionValues = useSelector(selectPositionSellerNextPositionValuesForDecrease);

  const { fees } = useSelector(selectPositionSellerFees);

  const isStopLoss = decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease;

  const acceptablePriceImpactInputRow = (() => {
    return (
      <AcceptablePriceImpactInputRow
        notAvailable={!triggerPriceInputValue || isStopLoss || !decreaseAmounts}
        acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
        recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
        priceImpactFeeBps={fees?.positionPriceImpact?.bps}
        setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
      />
    );
  })();

  const sizeRow = (
    <ExchangeInfoRow
      label={t`Size`}
      value={<ValueTransition from={formatUsd(position?.sizeInUsd)!} to={formatUsd(nextPositionValues?.nextSizeUsd)} />}
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
                {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
              </>
            }
            to={
              decreaseAmounts?.sizeDeltaUsd ? (
                <>
                  {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                  {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
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
            to={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage)}
          />
        }
      />
    ));

  const keepLeverageChecked = decreaseAmounts?.isFullClose ? false : keepLeverage ?? false;
  let keepLeverageAtValue: string | undefined = "...";
  if (position?.leverage && !decreaseAmounts?.isFullClose) {
    keepLeverageAtValue = formatLeverage(position.leverage);
  }

  const keepLeverageText = <Trans>Keep leverage at {keepLeverageAtValue}</Trans>;
  const renderKeepLeverageTooltipContent = useCallback(
    () => (
      <Trans>
        Keep leverage is not available as Position exceeds max. allowed leverage.{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
      </Trans>
    ),
    []
  );
  const keepLeverageTextElem = leverageCheckboxDisabledByCollateral ? (
    <TooltipWithPortal handle={keepLeverageText} renderContent={renderKeepLeverageTooltipContent} />
  ) : (
    keepLeverageText
  );
  let leverageValue: React.ReactNode = "-";

  if (decreaseAmounts?.isFullClose) {
    leverageValue = t`NA`;
  } else if (position) {
    if (decreaseAmounts?.sizeDeltaUsd === position.sizeInUsd) {
      leverageValue = "-";
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(position.leverage)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }
  }

  if (!position) {
    return null;
  }

  return (
    <ExpandableRow title={t`Advanced display`} open={open} onToggle={setOpen}>
      {isTrigger && acceptablePriceImpactInputRow}
      {!isTrigger && <AllowedSlippageRow allowedSlippage={allowedSlippage} setAllowedSlippage={setAllowedSlippage} />}
      <ExchangeInfoRow label={t`Leverage`} value={leverageValue} />

      <div className="PositionEditor-keep-leverage-settings">
        <ToggleSwitch
          textClassName="Exchange-info-label"
          isChecked={leverageCheckboxDisabledByCollateral ? false : keepLeverageChecked}
          setIsChecked={setKeepLeverage}
          disabled={leverageCheckboxDisabledByCollateral ?? decreaseAmounts?.isFullClose}
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
              return <Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>;
            }}
          />
        </div>
        <div className="align-right">
          <ValueTransition
            from={formatUsd(position?.collateralUsd)!}
            to={formatUsd(nextPositionValues?.nextCollateralUsd)}
          />
        </div>
      </div>
    </ExpandableRow>
  );
}
