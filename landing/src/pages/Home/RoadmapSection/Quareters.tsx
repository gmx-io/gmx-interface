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
          <p>Multichain</p>
          <p>Just-in-time liquidity</p>
          <p>MegaETH support</p>
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
