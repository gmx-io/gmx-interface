import { useState } from "react";
import { useMedia } from "react-use";

import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { TVChartHeader } from "./TVChartHeader";

import Tab from "components/Tab/Tab";

import AntennaBarsIcon from "img/ic_antenna_bars.svg?react";
import CandlestickChartIcon from "img/ic_candlestick_chart.svg?react";
import { DepthChart } from "./DepthChart";
import { TVChart } from "./TVChart";

import "./TVChart.scss";

const TABS = ["PRICE", "DEPTH"];

const TAB_LABELS = {
  PRICE: (
    <div className="flex items-center gap-8">
      <CandlestickChartIcon />
      PRICE
    </div>
  ),
  DEPTH: (
    <div className="flex items-center gap-8">
      <AntennaBarsIcon />
      DEPTH
    </div>
  ),
};

export function Chart() {
  const isMobile = useMedia("(max-width: 700px)");

  const [tab, setTab] = useState("PRICE");

  return (
    <div className="ExchangeChart tv">
      <TVChartHeader isMobile={isMobile} />

      <div className="flex h-[49.6rem] flex-col overflow-hidden rounded-4 bg-slate-800 text-15">
        <div className="px-20 py-10">
          <Tab type="inline" options={TABS} option={tab} optionLabels={TAB_LABELS} onChange={setTab} />
        </div>

        {tab === "PRICE" ? <TVChart /> : <DepthChartContainer />}
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
    <div className="h-full w-full pb-8 pl-16 pr-8">
      <DepthChart marketInfo={marketInfo} />
    </div>
  );
}
