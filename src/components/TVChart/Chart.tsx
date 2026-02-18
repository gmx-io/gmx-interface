import { Trans } from "@lingui/macro";
import { Suspense, lazy, useState } from "react";

import { isDevelopment } from "config/env";
import { DOCS_LINKS } from "config/links";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { DepthChart } from "components/DepthChart/DepthChart";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Tabs from "components/Tabs/Tabs";

import { TVChart } from "./TVChart";

import "./TVChart.scss";

const LazyMarketGraph = lazy(() => import("components/DebugMarketGraph/DebugMarketGraph"));

const TAB_LABELS = {
  PRICE: (
    <div className="flex items-center gap-8">
      <Trans>Price</Trans>
    </div>
  ),
  DEPTH: (
    <div className="flex items-center gap-8">
      <Trans>Depth</Trans>
    </div>
  ),
  MARKET_GRAPH: (
    <div className="flex items-center gap-8">
      <Trans>Market graph</Trans>
    </div>
  ),
};

const TAB_CONTENTS = {
  PRICE: (
    <ErrorBoundary id="Chart-TVChart" variant="block">
      <TVChart />
    </ErrorBoundary>
  ),
  DEPTH: (
    <ErrorBoundary id="Chart-DepthChart" variant="block">
      <DepthChartContainer />
    </ErrorBoundary>
  ),
  MARKET_GRAPH: (
    <Suspense fallback={<div>...</div>}>
      <ErrorBoundary id="Chart-MarketGraph" variant="block">
        <LazyMarketGraph />
      </ErrorBoundary>
    </Suspense>
  ),
};

const TABS = isDevelopment() ? ["PRICE", "DEPTH", "MARKET_GRAPH"] : ["PRICE", "DEPTH"];

const TABS_OPTIONS = TABS.map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

export function Chart() {
  const [tab, setTab] = useLocalStorageSerializeKey("chart-tab", "PRICE");
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  return (
    <div className="ExchangeChart tv Synthetics-chart flex flex-col">
      <div className="flex grow flex-col overflow-hidden rounded-8 bg-slate-900">
        {isSwap ? (
          tab === "MARKET_GRAPH" ? (
            TAB_CONTENTS.MARKET_GRAPH
          ) : (
            <TVChart />
          )
        ) : (
          <>
            <ChartTabs tab={tab} setTab={setTab} />

            {TAB_CONTENTS[tab || "PRICE"]}
          </>
        )}
      </div>
    </div>
  );
}

function DepthChartContainer() {
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const [isDepthBannerDismissed, setIsDepthBannerDismissed] = useState(false);

  if (!marketInfo) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-8 p-8">
      {!isDepthBannerDismissed && (
        <ColorfulBanner color="blue" onClose={() => setIsDepthBannerDismissed(true)}>
          <span>
            <Trans>
              Simulated orderbook view of GMX liquidity. Opens execute at mark price with zero impact. Net price impact
              applies only on closes (capped, usually at 0.5%).{" "}
              <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                Read more
              </ExternalLink>.
            </Trans>
          </span>
        </ColorfulBanner>
      )}
      <div className="w-full grow">
        <DepthChart marketInfo={marketInfo} />
      </div>
    </div>
  );
}

const ChartTabs = ({ tab, setTab }: { tab: string | undefined; setTab: (tab: string) => void }) => {
  return <Tabs options={TABS_OPTIONS} selectedValue={tab} onChange={setTab} />;
};
