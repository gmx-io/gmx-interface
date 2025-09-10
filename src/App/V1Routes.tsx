import { Trans } from "@lingui/macro";
import { Provider, ethers } from "ethers";
import { Suspense, lazy, useEffect, useRef } from "react";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import type { Address } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
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
import BuyGlp from "pages/BuyGlp/BuyGlp";
import { Exchange } from "pages/Exchange/Exchange";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import { ParseTransactionPage } from "pages/ParseTransaction/ParseTransaction";
import Stake from "pages/Stake/Stake";
import { abis } from "sdk/abis";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
export const UiPage = () => <Suspense fallback={<Trans>Loading...</Trans>}>{<LazyUiPage />}</Suspense>;

export function V1Routes({ openSettings }: { openSettings: () => void }) {
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

  const { pathname } = useLocation();

  // new page should be scrolled to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Switch>
      <Route exact path="/">
        <RedirectWithQuery to="/v1" />
      </Route>
      <Route exact path="/v1/:tradeType?">
        <Exchange ref={exchangeRef} openSettings={openSettings} />
      </Route>
      <Route exact path="/earn">
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="stake">
          <Stake />
        </SyntheticsStateContextProvider>
      </Route>
      <Route exact path="/sell_glp">
        <BuyGlp />
      </Route>
      <Route exact path="/begin_account_transfer">
        <BeginAccountTransfer />
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

      <Route path="/parsetx/:network/:tx">
        <ParseTransactionPage />
      </Route>

      <Route path="*">
        <PageNotFound />
      </Route>
    </Switch>
  );
}
