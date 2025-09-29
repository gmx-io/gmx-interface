import { useEffect, useMemo } from "react";

import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectChartLines } from "context/SyntheticsStateContext/selectors/chartSelectors/selectChartLines";
import { selectSetIsCandlesLoaded } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { CHART_PERIODS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import TVChartContainer from "components/TVChartContainer/TVChartContainer";

import "./TVChart.scss";

const DEFAULT_PERIOD = "5m";

export function TVChart() {
  const { chainId } = useChainId();
  const { chartToken, symbol: chartTokenSymbol } = useSelector(selectChartToken);
  const visualMultiplier = useSelector(selectSelectedMarketVisualMultiplier);
  const setIsCandlesLoaded = useSelector(selectSetIsCandlesLoaded);

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const chartLines = useSelector(selectChartLines);

  useEffect(
    function updatePeriod() {
      if (!period || !(period in CHART_PERIODS)) {
        setPeriod(DEFAULT_PERIOD);
      }
    },
    [period, setPeriod]
  );

  const chartTokenProp = useMemo(
    () =>
      chartToken
        ? {
            symbol: chartToken.symbol,
            ...chartToken.prices,
          }
        : {
            symbol: chartTokenSymbol || "",
            minPrice: 0n,
            maxPrice: 0n,
          },
    [chartToken, chartTokenSymbol]
  );

  if (!chartTokenSymbol) {
    return null;
  }

  return (
    <div className="relative grow">
      <TVChartContainer
        chartLines={chartLines}
        chainId={chainId}
        period={period}
        setIsCandlesLoaded={setIsCandlesLoaded}
        visualMultiplier={visualMultiplier}
        setPeriod={setPeriod}
        chartToken={chartTokenProp}
        supportedResolutions={SUPPORTED_RESOLUTIONS_V2}
      />
    </div>
  );
}
