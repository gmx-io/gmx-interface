import { Trans } from "@lingui/macro";
import { Suspense, lazy, useMemo } from "react";
import { useMedia } from "react-use";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { DepthChart } from "components/DepthChart/DepthChart";
import Tab from "components/Tab/Tab";
import { ChartHeader } from "./ChartHeader";
import { TVChart } from "./TVChart";

import AntennaBarsIcon from "img/ic_antenna_bars.svg?react";
import CandlestickChartIcon from "img/ic_candlestick_chart.svg?react";

import "./TVChart.scss";

const LazyBiNetworkChart = lazy(() => import("react-icons/bi").then((mod) => ({ default: mod.BiNetworkChart })));
const LazyMarketGraph = lazy(() => import("./MarketGraph"));

const TABS = ["PRICE", "DEPTH"];
const DEBUG_TABS = ["PRICE", "DEPTH", "MARKET_GRAPH"];

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

export function Chart() {
  const isMobile = useMedia("(max-width: 700px)");
  const [tab, setTab] = useLocalStorageSerializeKey("chart-tab", "PRICE");
  const { isSwap } = useSelector(selectTradeboxTradeFlags);
  const showDebugValues = useShowDebugValues();

  const tabs = useMemo(() => {
    if (showDebugValues) {
      return DEBUG_TABS;
    }

    return TABS;
  }, [showDebugValues]);

  return (
    <div className="ExchangeChart tv">
      <ChartHeader isMobile={isMobile} />

      <div className="flex h-[49.6rem] flex-col overflow-hidden rounded-4 bg-slate-800">
        {isSwap ? (
          <TVChart />
        ) : (
          <>
            <div className="text-body-medium border-b border-stroke-primary px-20 py-10">
              <Tab
                type="inline"
                className="flex"
                options={tabs}
                option={tab}
                optionLabels={TAB_LABELS}
                onChange={setTab}
              />
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
