import Footer from "components/Footer/Footer";
import { Trans } from "@lingui/macro";
import { useEffect, useState } from "react";
import { sleep } from "lib/sleep";
import { AVALANCHE_FUJI, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";

export function SyntheticsFallbackPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    sleep(100).then(() => setIsLoaded(true));
  }, []);

  if (!isLoaded) return null;

  return (
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
            <div className="clickable underline" onClick={() => switchNetwork(AVALANCHE_FUJI, true)}>
              {getChainName(AVALANCHE_FUJI)}
            </div>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
