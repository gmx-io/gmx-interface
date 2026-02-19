import { t, Trans } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";
import { selectBreakdownNetPriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsd } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function NextStoredImpactRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const breakdownNetPriceImpactEnabled = useSelector(selectBreakdownNetPriceImpactEnabled);

  if (!breakdownNetPriceImpactEnabled) {
    return null;
  }

  return (
    <>
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal
            handle={t`Stored price impact`}
            content={
              <Trans>
                Price impact is stored when you increase a position and applied when you decrease.{" "}
                <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
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
      {nextPositionValues?.potentialPriceImpactDiffUsd !== undefined &&
        nextPositionValues?.potentialPriceImpactDiffUsd > 0n && (
          <SyntheticsInfoRow
            label={t`Estimated impact rebate`}
            value={formatDeltaUsd(nextPositionValues?.potentialPriceImpactDiffUsd)}
            valueClassName="numbers text-green-500"
          />
        )}
    </>
  );
}
