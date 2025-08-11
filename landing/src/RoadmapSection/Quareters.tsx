import { Trans } from "@lingui/macro";

import { Quarter } from "./Quarter";

export function Quareters() {
  return (
    <div className="flex flex-row gap-0 overflow-x-scroll sm:gap-24">
      <Quarter title="Q1 2025">
        <Trans>
          <p>Solana Support</p>
        </Trans>
      </Quarter>
      <Quarter title="Q2 2025">
        <Trans>
          <p>Multichain</p>
          <p>Botanix Support</p>
          <p>GMX Express</p>
        </Trans>
      </Quarter>
      <Quarter title="Q3 2025">
        <Trans>
          <p>Real World Assets</p>
          <p>Staking and trading tiers</p>
          <p>Net Open Interest</p>
        </Trans>
      </Quarter>
      <Quarter title="Q4 2025">
        <Trans>
          <p>Cross-Collateral</p>
          <p>Cross-Margin</p>
          <p>Market Groups</p>
          <p>Just in Time Liquidity</p>
        </Trans>
      </Quarter>
    </div>
  );
}
