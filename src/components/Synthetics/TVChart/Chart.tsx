import { Trans } from "@lingui/macro";
import { useMedia } from "react-use";

import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { DepthChart } from "components/DepthChart/DepthChart";
import Tabs from "components/Tabs/Tabs";

import { ChartHeader } from "./ChartHeader";
import { TVChart } from "./TVChart";

import AntennaBarsIcon from "img/ic_antenna_bars.svg?react";
import CandlestickChartIcon from "img/ic_candlestick_chart.svg?react";

import "./TVChart.scss";

const TABS = ["PRICE", "DEPTH"];

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
};

const TABS_OPTIONS = TABS.map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

export function Chart() {
  const isMobile = useMedia("(max-width: 700px)");
  const [tab, setTab] = useLocalStorageSerializeKey("chart-tab", "PRICE");
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  return (
    <div className="ExchangeChart tv">
      <ChartHeader isMobile={isMobile} />

      <div className="flex h-[49.6rem] flex-col overflow-hidden rounded-4 bg-slate-800">
        {isSwap ? (
          <TVChart />
        ) : (
          <>
            <div className="text-body-medium border-b border-stroke-primary px-20 py-10">
              <Tabs
                type="inline"
                className="flex"
                options={TABS_OPTIONS}
                selectedValue={tab ?? null}
                onChange={setTab}
              />
            </div>

            {tab === "PRICE" ? <TVChart /> : <DepthChartContainer />}
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
