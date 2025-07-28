import { Trans } from "@lingui/macro";

import { Quarter } from "./Quarter";

export function Quareters() {
  return (
    <div className="flex flex-row gap-24 overflow-x-scroll">
      <Quarter title="Q1 2025">
        <ul>
          <li>
            <Trans>Solana Support</Trans>
          </li>
        </ul>
      </Quarter>
      <Quarter title="Q2 2025">
        <ul>
          <li>
            <Trans>Multichain</Trans>
          </li>
          <li>
            <Trans>Botanix Support</Trans>
          </li>
          <li>
            <Trans>GMX Express</Trans>
          </li>
        </ul>
      </Quarter>
      <Quarter title="Q3 2025">
        <ul>
          <li>
            <Trans>Real World Assets</Trans>
          </li>
          <li>
            <Trans>Staking and trading tiers</Trans>
          </li>
          <li>
            <Trans>Net Open Interest</Trans>
          </li>
        </ul>
      </Quarter>
      <Quarter title="Q4 2025">
        <ul>
          <li>
            <Trans>Cross-Collateral</Trans>
          </li>
          <li>
            <Trans>Cross-Margin</Trans>
          </li>
          <li>
            <Trans>Market Groups</Trans>
          </li>
          <li>
            <Trans>Just in Time Liquidity</Trans>
          </li>
        </ul>
      </Quarter>
    </div>
  );
}
