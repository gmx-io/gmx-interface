import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import TVChartContainer, { ChartLine } from "components/TVChartContainer/TVChartContainer";
import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { convertTokenAddress, getPriceDecimals, getToken, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { OrdersInfoData, PositionOrderInfo, isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokensData, getTokenData } from "domain/synthetics/tokens";
import { use24hPriceDelta } from "domain/synthetics/tokens/use24PriceDelta";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens/useOracleKeeperFetcher";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd, numberWithCommas } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import "./TVChart.scss";
import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";
import { AvailableTokenOptions, TradeType } from "domain/synthetics/trade";
import { MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import { helperToast } from "lib/helperToast";
import { BigNumber } from "ethers";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  selectTradeboxSetToTokenAddress,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";

export type Props = {
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;
  savedShouldShowPositionLines: boolean;
  ordersInfo?: OrdersInfoData;
  positionsInfo?: PositionsInfoData;
  tokensData?: TokensData;
  chartTokenAddress?: string;
  availableTokens?: Token[];
  avaialbleTokenOptions: AvailableTokenOptions;
  marketsInfoData?: MarketsInfoData;
};

const DEFAULT_PERIOD = "5m";

export function TVChart({
  ordersInfo,
  positionsInfo,
  tokensData,
  savedShouldShowPositionLines,
  chartTokenAddress,
  availableTokens,
  tradePageVersion,
  setTradePageVersion,
  avaialbleTokenOptions,
  marketsInfoData,
}: Props) {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const [dataProvider, setDataProvider] = useState<SyntheticsTVDataProvider>();

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const chartToken = getTokenData(tokensData, chartTokenAddress);

  const tokenOptions: Token[] | undefined = availableTokens?.filter((token) =>
    isChartAvailabeForToken(chainId, token.symbol)
  );

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;
  const dayPriceDelta = use24hPriceDelta(chainId, chartToken?.symbol);
  const currentTradeType = useSelector(selectTradeboxTradeType);
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
          positionOrder.triggerPrice &&
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

  function onSelectTokenOption(address: string, marketTokenAddress?: string, tradeType?: TradeType) {
    setToTokenAddress(address, marketTokenAddress, tradeType);

    if (marketTokenAddress) {
      const marketInfo = getByKey(marketsInfoData, marketTokenAddress);
      const nextTradeType = tradeType ?? currentTradeType;
      if (nextTradeType === TradeType.Swap) return;
      if (marketInfo && nextTradeType) {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        helperToast.success(
          <Trans>
            <span>{nextTradeType === TradeType.Long ? t`Long` : t`Short`}</span>{" "}
            <div className="inline-flex">
              <span>{indexName}</span>
              <span className="subtext gm-toast">[{poolName}]</span>
            </div>{" "}
            <span>market selected</span>
          </Trans>
        );
      }
    }
  }

  function onSelectChartToken(token: Token) {
    setToTokenAddress(token.address);
  }

  useEffect(() => {
    setDataProvider(new SyntheticsTVDataProvider({ resolutions: SUPPORTED_RESOLUTIONS_V2, oracleKeeperFetcher }));
  }, [oracleKeeperFetcher]);

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
            minPrice: BigNumber.from(0),
            maxPrice: BigNumber.from(0),
          },
    [chartToken]
  );

  return (
    <div className="ExchangeChart tv">
      <div className="ExchangeChart-header">
        <div className="ExchangeChart-info">
          <div className="ExchangeChart-top-inner">
            <ChartTokenSelector
              chainId={chainId}
              selectedToken={selectedTokenOption}
              onSelectToken={onSelectTokenOption}
              options={tokenOptions}
              avaialbleTokenOptions={avaialbleTokenOptions}
              positionsInfo={positionsInfo}
            />
            <div className="Chart-min-max-price">
              <div className="ExchangeChart-main-price">
                {formatUsd(chartToken?.prices?.maxPrice, {
                  displayDecimals: chartToken?.priceDecimals,
                }) || "..."}
              </div>
              <div className="ExchangeChart-info-label">
                {formatUsd(chartToken?.prices?.minPrice, {
                  displayDecimals: chartToken?.priceDecimals,
                }) || "..."}
              </div>
            </div>

            <div className="Chart-24h-change">
              <div className="ExchangeChart-info-label">24h Change</div>
              <div
                className={cx({
                  positive: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage > 0,
                  negative: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage < 0,
                })}
              >
                {dayPriceDelta?.deltaPercentageStr || "-"}
              </div>
            </div>
            <div className="ExchangeChart-additional-info">
              <div className="ExchangeChart-info-label">24h High</div>
              <div>
                {dayPriceDelta?.high
                  ? numberWithCommas(dayPriceDelta.high.toFixed(chartToken?.priceDecimals || 2))
                  : "-"}
              </div>
            </div>
            <div className="ExchangeChart-additional-info Chart-24h-low">
              <div className="ExchangeChart-info-label">24h Low</div>
              <div>
                {dayPriceDelta?.low
                  ? numberWithCommas(dayPriceDelta?.low.toFixed(chartToken?.priceDecimals || 2))
                  : "-"}
              </div>
            </div>
          </div>
        </div>
        <div className="ExchangeChart-info VersionSwitch-wrapper">
          <VersionSwitch currentVersion={tradePageVersion} setCurrentVersion={setTradePageVersion} />
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
            dataProvider={dataProvider}
            period={period}
            setPeriod={setPeriod}
            chartToken={chartTokenProp}
            supportedResolutions={SUPPORTED_RESOLUTIONS_V2}
            tradePageVersion={tradePageVersion}
            setTradePageVersion={setTradePageVersion}
          />
        )}
      </div>
    </div>
  );
}
