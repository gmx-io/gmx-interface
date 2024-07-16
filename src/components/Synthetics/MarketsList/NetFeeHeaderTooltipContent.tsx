import { Trans } from "@lingui/macro";
import { DOCS_LINKS } from "config/links";
import ExternalLink from "components/ExternalLink/ExternalLink";

import "./NetFeeHeaderTooltipContent.scss";

export function renderNetFeeHeaderTooltipContent() {
  return (
    <div className="NetFeeHeaderTooltipContent-netfee-header-tooltip">
      <Trans>
        Net rate combines funding and borrowing fees but excludes open, swap or impact fees.
        <br />
        <br />
        Funding fees help to balance longs and shorts and are exchanged between both sides.{" "}
        <ExternalLink newTab href={DOCS_LINKS.fundingFees}>
          Read more
        </ExternalLink>
        .
        <br />
        <br />
        Borrowing fees help ensure available liquidity.{" "}
        <ExternalLink newTab href={DOCS_LINKS.borrowingFees}>
          Read more
        </ExternalLink>
        .
      </Trans>
    </div>
  );
}
