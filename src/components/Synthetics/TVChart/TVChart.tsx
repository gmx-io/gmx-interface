import { t } from "@lingui/macro";
import cx from "classnames";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import TVChartContainer, { ChartLine } from "components/TVChartContainer/TVChartContainer";
import { convertTokenAddress, isChartAvailabeForToken } from "config/tokens";
import { OrdersInfoData, PositionOrderInfo, isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { getCandlesDelta, getMidPrice, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useLastCandles } from "domain/synthetics/tokens/useLastCandles";
import { Token } from "domain/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd, numberWithCommas } from "lib/numbers";
import { useEffect, useMemo, useRef } from "react";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";

import "./TVChart.scss";

export type Props = {
  ordersInfo?: OrdersInfoData;
  positionsInfo?: PositionsInfoData;
  savedShouldShowPositionLines: boolean;
  chartTokenAddress?: string;
  onSelectChartTokenAddress: (tokenAddress: string) => void;
  availableTokens?: Token[];
  disableSelectToken?: boolean;
};

const DEFAULT_PERIOD = "5m";

export function TVChart({
  ordersInfo,
  positionsInfo,
  savedShouldShowPositionLines,
  chartTokenAddress,
  onSelectChartTokenAddress,
  availableTokens,
  disableSelectToken,
}: Props) {
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);

  const dataProvider = useRef<TVDataProvider>();
  const [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  const chartToken = getTokenData(tokensData, chartTokenAddress);

  const tokenOptions: DropdownOption[] =
    availableTokens
      ?.filter((token) => isChartAvailabeForToken(chainId, token.symbol))
      .map((token) => ({
        label: `${token.symbol} / USD`,
        value: token.address,
      })) || [];

  const selectedTokenOption = tokenOptions.find((option) => option.value === chartTokenAddress);
  const currentAveragePrice = chartToken?.prices ? getMidPrice(chartToken.prices) : undefined;

  const { candles } = useLastCandles(chainId, chartToken?.symbol, period);

  const period24Hours = 24 * 60 * 60;

  const candlesDelta = useMemo(() => {
    if (!candles || !currentAveragePrice) {
      return undefined;
    }

    return getCandlesDelta(candles, currentAveragePrice, period24Hours);
  }, [candles, currentAveragePrice, period24Hours]);

  const chartLines = useMemo(() => {
    if (!chartTokenAddress) {
      return [];
    }

    const orderLines: ChartLine[] = Object.values(ordersInfo || {})
      .filter((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        const positionOrder = order as PositionOrderInfo;

        return (
          positionOrder.marketInfo &&
          positionOrder.triggerPrice &&
          convertTokenAddress(chainId, positionOrder.marketInfo.indexTokenAddress, "wrapped") ===
            convertTokenAddress(chainId, chartTokenAddress, "wrapped")
        );
      })
      .map((order) => {
        const positionOrder = order as PositionOrderInfo;

        const longOrShortText = order.isLong ? t`Long` : t`Short`;
        const orderTypeText = isIncreaseOrderType(order.orderType) ? t`Inc.` : t`Dec.`;
        const tokenSymbol = getTokenData(tokensData, positionOrder.marketInfo.indexTokenAddress, "native")?.symbol;

        return {
          title: `${longOrShortText} ${orderTypeText} ${tokenSymbol}`,
          price: parseFloat(formatAmount(positionOrder.triggerPrice, USD_DECIMALS, 2)),
        };
      });

    const positionLines = Object.values(positionsInfo || {}).reduce((acc, position) => {
      if (
        position.marketInfo &&
        convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") ===
          convertTokenAddress(chainId, chartTokenAddress, "wrapped")
      ) {
        const longOrShortText = position.isLong ? t`Long` : t`Short`;
        const tokenSymbol = getTokenData(tokensData, position.marketInfo?.indexTokenAddress, "native")?.symbol;

        acc.push({
          title: t`Open ${longOrShortText} ${tokenSymbol}`,
          price: parseFloat(formatAmount(position.entryPrice, USD_DECIMALS, 2)),
        });

        acc.push({
          title: t`Liq. ${longOrShortText} ${tokenSymbol}`,
          price: parseFloat(formatAmount(position.liquidationPrice, USD_DECIMALS, 2)),
        });
      }

      return acc;
    }, [] as ChartLine[]);

    return orderLines.concat(positionLines);
  }, [chainId, chartTokenAddress, ordersInfo, positionsInfo, tokensData]);

  function onSelectTokenOption(option: DropdownOption) {
    onSelectChartTokenAddress(option.value);
  }

  function onSelectChartToken(token: Token) {
    onSelectChartTokenAddress(token.address);
  }

  useEffect(() => {
    dataProvider.current = new SyntheticsTVDataProvider();
  }, []);

  useEffect(
    function updatePeriod() {
      if (!period || !(period in CHART_PERIODS)) {
        setPeriod(DEFAULT_PERIOD);
      }
    },
    [period, setPeriod]
  );

  return (
    <div className="ExchangeChart tv">
      <div className="ExchangeChart-top App-box App-box-border">
        <div className="ExchangeChart-top-inner">
          <div>
            <Dropdown
              className="chart-token-selector"
              options={tokenOptions}
              selectedOption={selectedTokenOption}
              onSelect={onSelectTokenOption}
              disabled={disableSelectToken}
            />
          </div>
          <div>
            <div className="ExchangeChart-main-price">{formatUsd(chartToken?.prices?.maxPrice) || "..."}</div>
            <div className="ExchangeChart-info-label">{formatUsd(chartToken?.prices?.minPrice) || "..."}</div>
          </div>
          <div>
            <div className="ExchangeChart-info-label">24h Change</div>
            <div
              className={cx({
                positive: candlesDelta?.deltaPercentage && candlesDelta?.deltaPercentage > 0,
                negative: candlesDelta?.deltaPercentage && candlesDelta?.deltaPercentage < 0,
              })}
            >
              {candlesDelta?.deltaPercentageStr || "-"}
            </div>
          </div>
          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">24h High</div>
            <div>{candlesDelta?.high ? numberWithCommas(candlesDelta.high.toFixed(2)) : "-"}</div>
          </div>
          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">24h Low</div>
            <div>{candlesDelta?.low ? numberWithCommas(candlesDelta?.low.toFixed(2)) : "-"}</div>
          </div>
        </div>
      </div>
      <div className="ExchangeChart-bottom App-box App-box-border">
        {chartToken && (
          <TVChartContainer
            chartLines={chartLines}
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            symbol={chartToken.symbol}
            chainId={chainId}
            onSelectToken={onSelectChartToken}
            dataProvider={dataProvider.current}
          />
        )}
      </div>
    </div>
  );
}
