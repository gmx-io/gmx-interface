import { Trans } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";

export default function EarnDocumentation() {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <h4 className="text-16 font-medium text-typography-primary">
        <Trans>Documentation</Trans>
      </h4>
      <div className="flex flex-col gap-8">
        <ExternalLink
          href="https://docs.gmx.io/docs/tokenomics/gmx-token"
          variant="icon"
          className="text-12 font-medium text-typography-secondary"
        >
          <Trans>GMX Token</Trans>
        </ExternalLink>
        <ExternalLink
          href="https://docs.gmx.io/docs/tokenomics/rewards"
          variant="icon"
          className="text-12 font-medium text-typography-secondary"
        >
          <Trans>GMX Rewards</Trans>
        </ExternalLink>
        <ExternalLink
          href="https://docs.gmx.io/docs/providing-liquidity/v2#glv-pools"
          variant="icon"
          className="text-12 font-medium text-typography-secondary"
        >
          <Trans>GLV Vaults</Trans>
        </ExternalLink>
        <ExternalLink
          href="https://docs.gmx.io/docs/providing-liquidity/v2#gm-pools"
          variant="icon"
          className="text-12 font-medium text-typography-secondary"
        >
          <Trans>GM Pools</Trans>
        </ExternalLink>
      </div>
    </div>
  );
}
