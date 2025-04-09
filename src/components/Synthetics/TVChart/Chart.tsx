import { Trans } from "@lingui/macro";
import { Suspense, lazy } from "react";
import { useMedia } from "react-use";

import { isDevelopment } from "config/env";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { DepthChart } from "components/DepthChart/DepthChart";
import Tabs from "components/Tabs/Tabs";

import AntennaBarsIcon from "img/ic_antenna_bars.svg?react";
import CandlestickChartIcon from "img/ic_candlestick_chart.svg?react";

import { ChartHeader } from "./ChartHeader";
import { TVChart } from "./TVChart";

import "./TVChart.scss";

const LazyBiNetworkChart = lazy(() => import("react-icons/bi").then((mod) => ({ default: mod.BiNetworkChart })));
const LazyMarketGraph = lazy(() => import("components/DebugMarketGraph/DebugMarketGraph"));

const TAB_LABELS = {
  PRICE: (
    <div className="flex items-center gap-8">
      <CandlestickChartIcon />
      <Trans>PRICE</Trans>
    </div>
  ),
  DEPTH: (
    <div className="flex items-center gap-8">
      <AntennaBarsIcon />
      <Trans>DEPTH</Trans>
    </div>
  ),
  MARKET_GRAPH: (
    <div className="flex items-center gap-8">
      <Suspense fallback={<div>...</div>}>
        <LazyBiNetworkChart />
      </Suspense>
      MARKET GRAPH
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
  const isMobile = useMedia("(max-width: 700px)");
  const [tab, setTab] = useLocalStorageSerializeKey("chart-tab", "PRICE");
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  return (
    <div className="ExchangeChart tv flex h-[60rem] flex-col [@media(min-width:2560px)]:min-h-[780px] [@media(min-width:3840px)]:min-h-[1140px]">
      <ChartHeader isMobile={isMobile} />

      <div className="flex grow flex-col overflow-hidden rounded-4 bg-slate-800 [@media(max-width:1920px)]:h-[53.6rem]">
        {isSwap ? (
          tab === "MARKET_GRAPH" ? (
            TAB_CONTENTS.MARKET_GRAPH
          ) : (
            <TVChart />
          )
        ) : (
          <>
            <div className="text-body-medium border-b border-stroke-primary px-20 py-10">
              <Tabs type="inline" className="flex" options={TABS_OPTIONS} selectedValue={tab} onChange={setTab} />
            </div>

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
    <div className="h-full w-full pb-8 pl-16">
      <DepthChart marketInfo={marketInfo} />
    </div>
  );
}
