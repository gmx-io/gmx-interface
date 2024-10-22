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
import { Options } from "./hooks/usePositionEditorFees";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";

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

  if (!position || collateralDeltaUsd === undefined) {
    return null;
  }

  return (
    <ExpandableRow className="-my-15" title={t`Advanced display`} open={open} onToggle={setOpen}>
      <ExchangeInfo.Group>
        <ExchangeInfoRow
          label={t`Leverage`}
          value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
        />
        <ExchangeInfoRow label={t`Size`} value={formatUsd(position.sizeInUsd)} />
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
              to={collateralDeltaUsd !== undefined && collateralDeltaUsd > 0 ? formatUsd(nextCollateralUsd) : undefined}
            />
          </div>
        </div>
      </ExchangeInfo.Group>
    </ExpandableRow>
  );
}
