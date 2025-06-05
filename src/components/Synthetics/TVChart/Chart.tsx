import { Trans } from "@lingui/macro";
import { Suspense, lazy } from "react";

import { isDevelopment } from "config/env";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { DepthChart } from "components/DepthChart/DepthChart";
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

const TABS_CLASSNAMES = {
  PRICE: {
    active: "border-b-2 border-b-blue-500",
    regular: "border-b-2 border-b-[transparent]",
  },
  DEPTH: {
    active: "border-b-2 border-b-blue-500",
    regular: "border-b-2 border-b-[transparent]",
  },
  MARKET_GRAPH: {
    active: "border-b-2 border-b-blue-500",
    regular: "border-b-2 border-b-[transparent]",
  },
};

const TABS = isDevelopment() ? ["PRICE", "DEPTH", "MARKET_GRAPH"] : ["PRICE", "DEPTH"];

const TABS_OPTIONS = TABS.map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
  className: TABS_CLASSNAMES[tab],
}));

export function Chart() {
  const [tab, setTab] = useLocalStorageSerializeKey("chart-tab", "PRICE");
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  return (
    <div className="ExchangeChart tv flex h-[60rem] flex-col [@media(min-width:2560px)]:min-h-[780px] [@media(min-width:3840px)]:min-h-[1140px]">
      <div className="flex grow flex-col overflow-hidden rounded-8 bg-slate-800 [@media(max-width:1920px)]:h-[53.6rem]">
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
    <div className="h-full w-full pb-8 pl-16">
      <DepthChart marketInfo={marketInfo} />
    </div>
  );
}

const ChartTabs = ({ tab, setTab }: { tab: string | undefined; setTab: (tab: string) => void }) => {
  return (
    <Tabs 
      options={TABS_OPTIONS}
      selectedValue={tab}
      onChange={setTab}
      regularOptionClassname="grow-0 -mb-[0.5px]"
      className="border-b border-stroke-primary"
    />
  );
};
