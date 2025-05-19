import { Trans } from "@lingui/macro";
import { Provider, ethers } from "ethers";
import { Suspense, lazy, useEffect, useRef } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import type { Address } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { subscribeToV1Events } from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { AccountDashboard } from "pages/AccountDashboard/AccountDashboard";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { VERSION_QUERY_PARAM } from "pages/AccountDashboard/constants";
import { AccountsRouter } from "pages/Actions/ActionsRouter";
import BeginAccountTransfer from "pages/BeginAccountTransfer/BeginAccountTransfer";
import Buy from "pages/Buy/Buy";
import BuyGlp from "pages/BuyGlp/BuyGlp";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import ClaimEsGmx from "pages/ClaimEsGmx/ClaimEsGmx";
import CompleteAccountTransfer from "pages/CompleteAccountTransfer/CompleteAccountTransfer";
import DashboardV2 from "pages/Dashboard/DashboardV2";
import Earn from "pages/Earn/Earn";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import { Exchange } from "pages/Exchange/Exchange";
import Jobs from "pages/Jobs/Jobs";
import { CompetitionRedirect, LeaderboardPage } from "pages/LeaderboardPage/LeaderboardPage";
import { MarketPoolsPage } from "pages/MarketPoolsPage/MarketPoolsPage";
import NftWallet from "pages/NftWallet/NftWallet";
import OrdersOverview from "pages/OrdersOverview/OrdersOverview";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import PositionsOverview from "pages/PositionsOverview/PositionsOverview";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";
import Referrals from "pages/Referrals/Referrals";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import Stats from "pages/Stats/Stats";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import { TestPermits } from "pages/TestPermits/TestPernits";
import { abis } from "sdk/abis";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
export const UiPage = () => <Suspense fallback={<Trans>Loading...</Trans>}>{<LazyUiPage />}</Suspense>;

export function MainRoutes({ openSettings }: { openSettings: () => void }) {
  const exchangeRef = useRef<any>();
  const { hasV1LostFocus } = useHasLostFocus();
  const { chainId } = useChainId();

  const { wsProvider } = useWebsocketProvider();

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  useEffect(() => {
    const wsVaultAbi = chainId === ARBITRUM ? abis.VaultV2 : abis.VaultV2b;
    if (hasV1LostFocus || !wsProvider) {
      return;
    }

    const wsVault = new ethers.Contract(vaultAddress, wsVaultAbi, wsProvider as Provider);
    const wsPositionRouter = new ethers.Contract(positionRouterAddress, abis.PositionRouter, wsProvider as Provider);

    const callExchangeRef = (method, ...args) => {
      if (!exchangeRef || !exchangeRef.current) {
        return;
      }

      exchangeRef.current[method](...args);
    };

    // handle the subscriptions here instead of within the Exchange component to avoid unsubscribing and re-subscribing
    // each time the Exchange components re-renders, which happens on every data update
    const unsubscribe = subscribeToV1Events(wsVault, wsPositionRouter, callExchangeRef);

    return function cleanup() {
      unsubscribe();
    };
  }, [chainId, vaultAddress, positionRouterAddress, wsProvider, hasV1LostFocus]);

  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/trade" />
      </Route>
      <Route exact path="/price_impact_rebates_stats">
        <PriceImpactRebatesStatsPage />
      </Route>
      <Route exact path="/v1/:tradeType?">
        <Exchange ref={exchangeRef} openSettings={openSettings} />
      </Route>
      <Route exact path="/dashboard">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="dashboard">
          <DashboardV2 />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/stats/v1">
        <Stats />
      </Route>
      <Redirect exact from="/stats/v2" to="/stats" />
      <Route exact path="/stats">
        <SyntheticsStats />
      </Route>
      <Route exact path="/earn">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="earn">
          <Earn />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/buy">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="buy">
          <Buy />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/pools">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
          <MarketPoolsPage />
        </SyntheticsStateContextProvider>
      </Route>

      <Route exact path="/trade/:tradeType?">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="trade">
          <SyntheticsPage openSettings={openSettings} />
        </SyntheticsStateContextProvider>
      </Route>
      <Redirect from="/v2" to="/trade" />
      <Route exact path="/buy_glp">
        <BuyGlp />
      </Route>
      <Route exact path="/jobs">
        <Jobs />
      </Route>
      <Route exact path="/buy_gmx">
        <BuyGMX />
      </Route>
      <Route exact path="/ecosystem">
        <Ecosystem />
      </Route>
      <Route path="/leaderboard/">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="leaderboard">
          <LeaderboardPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/competitions/">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
          <CompetitionRedirect />
        </SyntheticsStateContextProvider>
      </Route>
      <Route path="/competitions/:leaderboardPageKey">
        <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
          <LeaderboardPage />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/referrals">
        <Referrals />
      </Route>
      <Route exact path="/referrals/:account">
        <Referrals />
      </Route>
      <Route exact path="/nft_wallet">
        <NftWallet />
      </Route>
      <Route exact path="/claim_es_gmx">
        <ClaimEsGmx />
      </Route>

      <Route exact path="/actions/:v/:account">
        {({ match }) => (
          <Redirect
            to={buildAccountDashboardUrl(match?.params.account as Address, chainId, match?.params.v === "v1" ? 1 : 2)}
          />
        )}
      </Route>
      <Redirect exact from="/actions/v1" to={`/accounts?${VERSION_QUERY_PARAM}=1`} />
      <Redirect exact from="/actions/v2" to="/accounts" />
      <Redirect exact from="/actions" to="/accounts" />
      <Redirect exact from="/actions/:account" to="/accounts/:account" />

      <Route exact path="/accounts">
        <AccountsRouter />
      </Route>
      <Route exact path="/accounts/:account">
        <AccountDashboard />
      </Route>

      <Route exact path="/referrals-tier">
        <ReferralsTier />
      </Route>
      <Route exact path="/stats">
        <Stats />
      </Route>
      <Route exact path="/orders_overview">
        <OrdersOverview />
      </Route>
      <Route exact path="/positions_overview">
        <PositionsOverview />
      </Route>
      <Route exact path="/begin_account_transfer">
        <BeginAccountTransfer />
      </Route>
      <Route exact path="/complete_account_transfer/:sender/:receiver">
        <CompleteAccountTransfer />
      </Route>
      {isDevelopment() && (
        <Route exact path="/ui">
          <UiPage />
        </Route>
      )}
      {isDevelopment() && (
        <Route exact path="/permits">
          <TestPermits />
        </Route>
      )}
      <Route path="/parsetx/:network/:tx">
        <ParseTransactionPage />
      </Route>

      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
