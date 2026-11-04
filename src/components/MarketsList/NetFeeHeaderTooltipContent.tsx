import { Trans } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";

import { TooltipContent, TooltipReadMore, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";

export function renderNetFeeHeaderTooltipContent() {
  return (
    <TooltipContent>
      <TooltipText>
        <Trans>Net rate = funding + borrowing fees.</Trans>
      </TooltipText>
      <div className="flex flex-col gap-4">
        <TooltipTitledText title={<Trans>Funding</Trans>}>
          <Trans>Balances longs vs shorts, paid between traders.</Trans>
        </TooltipTitledText>
        <TooltipReadMore href={DOCS_LINKS.fundingFees} />
      </div>
      <div className="flex flex-col gap-4">
        <TooltipTitledText title={<Trans>Borrowing</Trans>}>
          <Trans>Ensures available liquidity.</Trans>
        </TooltipTitledText>
        <TooltipReadMore href={DOCS_LINKS.borrowingFees} />
      </div>
    </TooltipContent>
  );
}
