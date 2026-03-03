import { Trans } from "@lingui/macro";

import { Quarter } from "./Quarter";

export function Quareters() {
  return (
    <div className="flex flex-row gap-0 overflow-x-scroll pt-8 scrollbar-hide">
      <Quarter lastCompleted>
        <Trans>
          <p>Solana support</p>
          <p>Botanix support</p>
          <p>GMX Express</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p className="text-slate-600">Multichain</p>
          <p className="text-slate-600">MegaETH support</p>
          <p>Just-in-time liquidity</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p>Cross-margin</p>
          <p>Cross-collateral</p>
        </Trans>
      </Quarter>
      <Quarter>
        <Trans>
          <p>Market groups</p>
          <p>Net open interest</p>
        </Trans>
      </Quarter>
    </div>
  );
}
