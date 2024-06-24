import { Trans, t } from "@lingui/macro";
import { useCallback } from "react";

import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getIsV1Supported } from "config/features";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";

import "./SyntheticsActions.scss";

export default function SyntheticsActions() {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const networkName = getChainName(chainId);
  const toggleNetwork = useCallback(
    () => switchNetwork(chainId === ARBITRUM ? AVALANCHE : ARBITRUM, active),
    [active, chainId]
  );

  return (
    <div className="default-container page-layout">
      <div className="Actions-section">
        <div className="Actions-title">
          <PageTitle
            isTop
            title={t`GMX V2 Actions`}
            subtitle={
              <>
                <Trans>GMX V2 {networkName} actions for all accounts.</Trans>

                {getIsV1Supported(chainId) && (
                  <Trans>
                    <div>
                      <ExternalLink newTab={false} href="/#/actions/v1">
                        Check on GMX V1 {networkName}
                      </ExternalLink>{" "}
                      or{" "}
                      <span className="cursor-pointer underline" onClick={toggleNetwork}>
                        switch network to {chainId === ARBITRUM ? "Avalanche" : "Arbitrum"}
                      </span>
                      .
                    </div>
                  </Trans>
                )}
              </>
            }
          />
        </div>
        <TradeHistory account={undefined} forAllAccounts={true} shouldShowPaginationButtons />
      </div>
      <Footer />
    </div>
  );
}
