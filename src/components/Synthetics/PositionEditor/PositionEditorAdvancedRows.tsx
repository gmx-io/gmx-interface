import { Trans, t } from "@lingui/macro";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { formatLeverage } from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import { formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useState } from "react";

import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";

import { ExpandableRow } from "../ExpandableRow";
import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { Options, usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

export function PositionEditorAdvancedRows({ selectedCollateralAddress, collateralInputValue, operation }: Options) {
  const tokensData = useTokensData();

  const position = usePositionEditorPosition();

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const collateralPrice = collateralToken?.prices.minPrice;

  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const { nextCollateralUsd, nextLeverage } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  const { advancedDisplay } = useSelector(selectTradeboxAdvancedOptions);
  const [open, setOpen] = useState(advancedDisplay);

  const { fees, executionFee } = usePositionEditorFees({
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  if (!position || collateralDeltaUsd === undefined) {
    return null;
  }

  return (
    <ExpandableRow
      title={t`Advanced display`}
      open={open}
      onToggle={setOpen}
      contentClassName="flex flex-col gap-14 pt-14"
    >
      <TradeFeesRow {...fees} feesType="edit" shouldShowRebate={false} />
      <NetworkFeeRow executionFee={executionFee} />

      <SyntheticsInfoRow
        label={t`Leverage`}
        value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
      />
      <SyntheticsInfoRow label={t`Size`} value={formatUsd(position.sizeInUsd)} />
      <SyntheticsInfoRow
        label={
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
        }
        value={
          <ValueTransition
            from={formatUsd(position?.collateralUsd)!}
            to={collateralDeltaUsd !== undefined && collateralDeltaUsd > 0 ? formatUsd(nextCollateralUsd) : undefined}
          />
        }
      />
    </ExpandableRow>
  );
}
