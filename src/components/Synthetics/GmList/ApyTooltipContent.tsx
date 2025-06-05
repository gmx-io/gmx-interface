import { Trans } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";

export function ApyTooltipContent() {
  return (
    <p className="text-white">
      <Trans>
        <p className="mb-12">The APY is an estimate based on fees collected during the selected period. It excludes:</p>
        <ul className="mb-8 list-disc">
          <li className="p-2">price changes of the underlying token(s)</li>
          <li className="p-2">traders' PnL, which is expected to be neutral in the long term</li>
          <li className="p-2">funding fees, which are exchanged between traders</li>
        </ul>
        <p className="mb-12">
          <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
            Read more about GM token pricing
          </ExternalLink>
          .
        </p>
        <p>
          For detailed stats and comparisons, check the GMX V2 LP Dashboard.{" "}
          <ExternalLink href="https://dune.com/gmx-io/v2-lp-dashboard">GMX Dune Dashboard</ExternalLink>.
        </p>
      </Trans>
    </p>
  );
}
