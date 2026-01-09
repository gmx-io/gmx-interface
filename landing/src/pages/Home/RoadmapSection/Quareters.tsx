import { Trans } from "@lingui/macro";

import { Quarter } from "./Quarter";

export function Quareters() {
  return (
    <div className="flex flex-row gap-0 overflow-x-scroll pt-8 scrollbar-hide">
      <Quarter lastCompleted>
        <Trans>
          <p>Solana Support</p>
          <p>Botanix Support</p>
          <p>GMX Express</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p className="text-slate-600">Multichain</p>
          <p>Just in Time Liquidity</p>
          <p>MegaETH Support</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p>Cross-Margin</p>
          <p>Cross-Collateral</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p>Market Groups</p>
          <p>Net Open Interest</p>
        </Trans>
      </Quarter>
    </div>
  );
}
