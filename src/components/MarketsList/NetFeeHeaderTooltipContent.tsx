import { Trans } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";

import { TooltipContent, TooltipLink, TooltipText, TooltipTitledText } from "components/Tooltip/TooltipBlocks";

export function renderNetFeeHeaderTooltipContent() {
  return (
    <TooltipContent>
      <TooltipText>
        <Trans>Net rate = funding + borrowing fees.</Trans>
      </TooltipText>
      <div className="flex flex-col gap-2">
        <TooltipTitledText title={<Trans>Funding</Trans>}>
          <Trans>Balances longs vs shorts, paid between traders.</Trans>
        </TooltipTitledText>
        <TooltipLink href={DOCS_LINKS.fundingFees}>
          <Trans>Read more</Trans>
        </TooltipLink>
      </div>
      <div className="flex flex-col gap-2">
        <TooltipTitledText title={<Trans>Borrowing</Trans>}>
          <Trans>Ensures available liquidity.</Trans>
        </TooltipTitledText>
        <TooltipLink href={DOCS_LINKS.borrowingFees}>
          <Trans>Read more</Trans>
        </TooltipLink>
      </div>
    </TooltipContent>
  );
}
