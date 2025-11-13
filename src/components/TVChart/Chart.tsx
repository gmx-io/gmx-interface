import { Trans } from "@lingui/macro";
import { Suspense, lazy } from "react";

import { isDevelopment } from "config/env";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { DepthChart } from "components/DepthChart/DepthChart";
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
      <Trans>Market Graph</Trans>
    </div>
  ),
};

const TAB_CONTENTS = {
  PRICE: <TVChart />,
  DEPTH: <DepthChartContainer />,
  MARKET_GRAPH: (
    <Suspense fallback={<div>...</div>}>
      <LazyMarketGraph />
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

  if (!marketInfo) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-8 p-8">
      <ColorfulBanner color="blue">
        <span>
          <Trans>
            This simulated depth chart offers a hypothetical orderbook-style view of GMX liquidity—it's not how trades
            actually execute. Opens always execute at the mark price with zero impact applied, so any shown execution
            price for opening is purely virtual. The actual net price impact, applied only on closes, sums the displayed
            open and close impacts but is capped at 0.5%.{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2#price-impact-and-price-impact-rebates" newTab>
              Read more
            </ExternalLink>
            .
          </Trans>
        </span>
      </ColorfulBanner>
      <div className="w-full grow">
        <DepthChart marketInfo={marketInfo} />
      </div>
    </div>
  );
}

const ChartTabs = ({ tab, setTab }: { tab: string | undefined; setTab: (tab: string) => void }) => {
  return <Tabs options={TABS_OPTIONS} selectedValue={tab} onChange={setTab} />;
};
