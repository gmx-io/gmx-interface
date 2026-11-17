import { t, Trans } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";
import { selectBreakdownNetPriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxNextPositionValues,
  selectTradeboxExistingPositionForPreview,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsdParts } from "lib/numbers";

import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

export function NextStoredImpactRows() {
  const existingPosition = useSelector(selectTradeboxExistingPositionForPreview);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const breakdownNetPriceImpactEnabled = useSelector(selectBreakdownNetPriceImpactEnabled);

  if (!breakdownNetPriceImpactEnabled) {
    return null;
  }

  return (
    <>
      <SyntheticsInfoRow
        label={
          <StandardTooltip
            handle={t`Stored price impact`}
            content={
              <TooltipContent>
                <TooltipText>
                  <Trans>Price impact is stored when you increase a position and applied when you decrease.</Trans>
                </TooltipText>
                <TooltipLink href={DOCS_LINKS.priceImpact}>
                  <Trans>Read more</Trans>
                </TooltipLink>
              </TooltipContent>
            }
          />
        }
        value={
          nextPositionValues?.nextPendingImpactDeltaUsd !== undefined &&
          existingPosition?.pendingImpactUsd !== undefined ? (
            <ValueTransition
              from={formatDeltaUsdParts(existingPosition?.pendingImpactUsd)}
              to={formatDeltaUsdParts(nextPositionValues?.nextPendingImpactDeltaUsd)}
            />
          ) : (
            <DeltaUsdValue deltaUsd={nextPositionValues?.nextPendingImpactDeltaUsd} />
          )
        }
        valueClassName="numbers"
      />
      {nextPositionValues?.potentialPriceImpactDiffUsd !== undefined &&
        nextPositionValues?.potentialPriceImpactDiffUsd > 0n && (
          <SyntheticsInfoRow
            label={t`Estimated impact rebate`}
            value={<DeltaUsdValue deltaUsd={nextPositionValues?.potentialPriceImpactDiffUsd} />}
            valueClassName="numbers text-green-500"
          />
        )}
    </>
  );
}
