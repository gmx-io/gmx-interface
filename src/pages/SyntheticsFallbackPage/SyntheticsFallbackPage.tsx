import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { isDevelopment } from "config/env";
import { sleep } from "lib/sleep";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

export function SyntheticsFallbackPage() {
  const { active } = useWallet();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Wait for chainId to be loaded before rendering
    sleep(100).then(() => setIsLoaded(true));
  }, []);

  if (!isLoaded) return null;

  return (
    <AppPageLayout>
      <div className="page-layout">
        <div className="page-not-found-container">
          <div className="page-not-found">
            <h2>
              <Trans>V2 doesn't currently support this network</Trans>
            </h2>

            <p className="go-back">
              <div>
                <Trans>
                  <span>Switch to:</span>
                </Trans>
              </div>

              <br />
              <div className="clickable underline" onClick={() => switchNetwork(ARBITRUM, active)}>
                {getChainName(ARBITRUM)}
              </div>

              <div className="clickable underline" onClick={() => switchNetwork(AVALANCHE, active)}>
                {getChainName(AVALANCHE)}
              </div>

              {isDevelopment() && (
                <>
                  <div className="clickable underline" onClick={() => switchNetwork(AVALANCHE_FUJI, active)}>
                    {getChainName(AVALANCHE_FUJI)}
                  </div>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
