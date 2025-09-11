import { t } from "@lingui/macro";

import {
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function NextStoredImpactRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);

  return (
    <>
      <SyntheticsInfoRow
        label={t`Stored Price Impact`}
        value={
          nextPositionValues?.nextPendingImpactDeltaUsd !== undefined &&
          selectedPosition?.pendingImpactUsd !== undefined ? (
            <ValueTransition
              from={formatDeltaUsd(selectedPosition?.pendingImpactUsd)}
              to={formatDeltaUsd(nextPositionValues?.nextPendingImpactDeltaUsd)}
            />
          ) : (
            formatDeltaUsd(nextPositionValues?.nextPendingImpactDeltaUsd)
          )
        }
        valueClassName="numbers"
      />
    </>
  );
}
