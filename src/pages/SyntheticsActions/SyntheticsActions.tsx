import "./Actions.scss";

import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getIsV1Supported } from "config/features";
import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { noop } from "lodash";
import { useCallback } from "react";

export default function SyntheticsActions() {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const checkSummedAccount = useAccount();
  const networkName = getChainName(chainId);
  const toggleNetwork = useCallback(
    () => switchNetwork(chainId === ARBITRUM ? AVALANCHE : ARBITRUM, active),
    [active, chainId]
  );

  return (
    <div className="default-container page-layout">
      {checkSummedAccount && (
        <div className="Actions-section">
          <PageTitle
            title={t`GMX V2 Account`}
            subtitle={
              <>
                <Trans>
                  GMX V2 {networkName} information for account: {checkSummedAccount}
                </Trans>
                {getIsV1Supported(chainId) && (
                  <Trans>
                    <div>
                      <ExternalLink newTab={false} href={`/#/actions/v1/${checkSummedAccount}`}>
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
      )}

      {checkSummedAccount && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Positions</Trans>
          </div>
          <PositionList
            onOrdersClick={noop}
            onSelectPositionClick={noop}
            onClosePositionClick={noop}
            onSettlePositionFeesClick={noop}
            openSettings={noop}
            hideActions
          />
        </div>
      )}
      {checkSummedAccount && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Orders</Trans>
          </div>
          <OrderList setSelectedOrdersKeys={noop} setPendingTxns={noop} hideActions />
        </div>
      )}
      <div className="Actions-section">
        <div className="Actions-title">
          {checkSummedAccount ? (
            <Trans>Actions</Trans>
          ) : (
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
          )}
        </div>
        <TradeHistory account={checkSummedAccount} forAllAccounts={!checkSummedAccount} shouldShowPaginationButtons />
      </div>
      <Footer />
    </div>
  );
}
