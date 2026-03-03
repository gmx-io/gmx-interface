import { Trans } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";

import "./NetFeeHeaderTooltipContent.scss";

export function renderNetFeeHeaderTooltipContent() {
  return (
    <div className="NetFeeHeaderTooltipContent-netfee-header-tooltip">
      <Trans>
        Net rate = funding + borrowing fees.
        <br />
        <br />
        Funding: Balances longs vs shorts, paid between traders.{" "}
        <ExternalLink newTab href={DOCS_LINKS.fundingFees}>
          Read more
        </ExternalLink>
        {"."}
        <br />
        <br />
        Borrowing: Ensures available liquidity.{" "}
        <ExternalLink newTab href={DOCS_LINKS.borrowingFees}>
          Read more
        </ExternalLink>
        {"."}
      </Trans>
    </div>
  );
}
