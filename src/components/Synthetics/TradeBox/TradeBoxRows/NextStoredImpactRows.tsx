import { t, Trans } from "@lingui/macro";

import {
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsd } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function NextStoredImpactRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);

  return (
    <>
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal
            handle={t`Stored Price Impact`}
            content={
              <Trans>
                The price impact is not applied until the decrease action. These are the current estimated values at
                increase.{" "}
                <ExternalLink href="https://docs.gmx.io/docs/trading/v2#price-impact" newTab>
                  Read more
                </ExternalLink>
                .
              </Trans>
            }
          />
        }
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
