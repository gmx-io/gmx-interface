import { t } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import { usePrevious, useMedia } from "react-use";

import TVChartContainer, { ChartLine } from "components/TVChartContainer/TVChartContainer";
import { convertTokenAddress, getPriceDecimals } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import {
  useOrdersInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTradeboxSetToTokenAddress } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { PositionOrderInfo, isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { getTokenData } from "domain/synthetics/tokens";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens/useOracleKeeperFetcher";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { Token } from "domain/tokens";

import { useChainId } from "lib/chains";
import { CHART_PERIODS } from "lib/legacy";
import { USD_DECIMALS } from "config/factors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount } from "lib/numbers";

import { TVChartHeader } from "./TVChartHeader";

import "./TVChart.scss";

const DEFAULT_PERIOD = "5m";

export function TVChart() {
  const chartToken = useSelector(selectChartToken);
  const ordersInfo = useOrdersInfoData();
  const tokensData = useTokensData();
  const positionsInfo = usePositionsInfoData();

  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const [dataProvider, setDataProvider] = useState<SyntheticsTVDataProvider>();
  const chartTokenAddress = chartToken?.address;

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const oraclePriceDecimals = useSelector(selectSelectedMarketPriceDecimals);

  const setToTokenAddress = useSelector(selectTradeboxSetToTokenAddress);

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
          positionOrder.triggerPrice !== undefined &&
          convertTokenAddress(chainId, positionOrder.marketInfo.indexTokenAddress, "wrapped") ===
            convertTokenAddress(chainId, chartTokenAddress, "wrapped")
        );
      })
      .map((order) => {
        const positionOrder = order as PositionOrderInfo;
        const priceDecimal = getPriceDecimals(chainId, positionOrder.indexToken.symbol);

        const longOrShortText = order.isLong ? t`Long` : t`Short`;
        const orderTypeText = isIncreaseOrderType(order.orderType) ? t`Inc.` : t`Dec.`;
        const tokenSymbol = getTokenData(tokensData, positionOrder.marketInfo.indexTokenAddress, "native")?.symbol;

        return {
          title: `${longOrShortText} ${orderTypeText} ${tokenSymbol}`,
          price: parseFloat(formatAmount(positionOrder.triggerPrice, USD_DECIMALS, priceDecimal)),
        };
      });

    const positionLines = Object.values(positionsInfo || {}).reduce((acc, position) => {
      const priceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);
      if (
        position.marketInfo &&
        convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") ===
          convertTokenAddress(chainId, chartTokenAddress, "wrapped")
      ) {
        const longOrShortText = position.isLong ? t`Long` : t`Short`;
        const tokenSymbol = getTokenData(tokensData, position.marketInfo?.indexTokenAddress, "native")?.symbol;
        const liquidationPrice = formatAmount(position?.liquidationPrice, USD_DECIMALS, priceDecimal);

        acc.push({
          title: t`Open ${longOrShortText} ${tokenSymbol}`,
          price: parseFloat(formatAmount(position.entryPrice, USD_DECIMALS, priceDecimal)),
        });
        if (liquidationPrice && liquidationPrice !== "NA") {
          acc.push({
            title: t`Liq. ${longOrShortText} ${tokenSymbol}`,
            price: parseFloat(liquidationPrice),
          });
        }
      }

      return acc;
    }, [] as ChartLine[]);

    return orderLines.concat(positionLines);
  }, [chainId, chartTokenAddress, ordersInfo, positionsInfo, tokensData]);

  function onSelectChartToken(token: Token) {
    setToTokenAddress(token.address);
  }

  const previousChainId = usePrevious(chainId);

  useEffect(() => {
    if (chainId !== previousChainId) {
      dataProvider?.finalize();
    }
  }, [chainId, previousChainId, dataProvider]);

  useEffect(() => {
    if (!chainId) {
      return;
    }

    const dataProvider = new SyntheticsTVDataProvider({
      resolutions: SUPPORTED_RESOLUTIONS_V2,
      oracleFetcher: oracleKeeperFetcher,
      chainId,
    });
    setDataProvider(dataProvider);

    return () => {
      dataProvider.finalize();
    };
  }, [oracleKeeperFetcher, chainId]);

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
            symbol: "",
            minPrice: 0n,
            maxPrice: 0n,
          },
    [chartToken]
  );

  const isMobile = useMedia("(max-width: 700px)");

  return (
    <div className="ExchangeChart tv">
      <TVChartHeader isMobile={isMobile} />
      <div className="ExchangeChart-bottom App-box App-box-border">
        {chartToken && (
          <TVChartContainer
            chartLines={chartLines}
            symbol={chartToken.symbol}
            chainId={chainId}
            onSelectToken={onSelectChartToken}
            dataProvider={dataProvider}
            period={period}
            setPeriod={setPeriod}
            chartToken={chartTokenProp}
            supportedResolutions={SUPPORTED_RESOLUTIONS_V2}
            oraclePriceDecimals={oraclePriceDecimals}
          />
        )}
      </div>
    </div>
  );
}
