import { t } from "@lingui/macro";
import cx from "classnames";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import TVChartContainer, { ChartLine } from "components/TVChartContainer/TVChartContainer";
import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { convertTokenAddress, getPriceDecimals, getToken, isChartAvailabeForToken } from "config/tokens";
import { OrdersInfoData, PositionOrderInfo, isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokensData, getTokenData } from "domain/synthetics/tokens";
import { use24hPriceDelta } from "domain/synthetics/tokens/use24PriceDelta";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { Token } from "domain/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd, numberWithCommas } from "lib/numbers";
import { useEffect, useMemo, useRef } from "react";
import { useMedia } from "react-use";
import "./TVChart.scss";
import { SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";

export type Props = {
  ordersInfo?: OrdersInfoData;
  positionsInfo?: PositionsInfoData;
  tokensData?: TokensData;
  savedShouldShowPositionLines: boolean;
  chartTokenAddress?: string;
  onSelectChartTokenAddress: (tokenAddress: string) => void;
  availableTokens?: Token[];
  disableSelectToken?: boolean;
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;
};

const DEFAULT_PERIOD = "5m";

export function TVChart({
  ordersInfo,
  positionsInfo,
  tokensData,
  savedShouldShowPositionLines,
  chartTokenAddress,
  onSelectChartTokenAddress,
  availableTokens,
  disableSelectToken,
  tradePageVersion,
  setTradePageVersion,
}: Props) {
  const { chainId } = useChainId();
  const isMobile = useMedia("(max-width: 768px)");
  const isSmallMobile = useMedia("(max-width: 470px)");

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const dataProvider = useRef<TVDataProvider>();
  const chartToken = getTokenData(tokensData, chartTokenAddress);

  const tokenOptions: DropdownOption[] =
    availableTokens
      ?.filter((token) => isChartAvailabeForToken(chainId, token.symbol))
      .map((token) => ({
        label: `${token.symbol} / USD`,
        value: token.address,
      })) || [];

  const selectedTokenOption = chartTokenAddress
    ? {
        label: `${getToken(chainId, chartTokenAddress).symbol} / USD`,
        value: chartTokenAddress,
      }
    : undefined;

  const dayPriceDelta = use24hPriceDelta(chainId, chartToken?.symbol);

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

  function onSelectTokenOption(option: DropdownOption) {
    onSelectChartTokenAddress(option.value);
  }

  function onSelectChartToken(token: Token) {
    onSelectChartTokenAddress(token.address);
  }

  useEffect(() => {
    dataProvider.current = new SyntheticsTVDataProvider({ resolutions: SUPPORTED_RESOLUTIONS_V2 });
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
      <div className="TVChart-top-card ExchangeChart-top App-box App-box-border">
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
          {!isSmallMobile && (
            <div>
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
          )}
          {!isSmallMobile && (
            <div>
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
          )}
          {!isMobile && (
            <>
              <div className="ExchangeChart-additional-info">
                <div className="ExchangeChart-info-label">24h High</div>
                <div>
                  {dayPriceDelta?.high
                    ? numberWithCommas(dayPriceDelta.high.toFixed(chartToken?.priceDecimals || 2))
                    : "-"}
                </div>
              </div>
              <div className="ExchangeChart-additional-info">
                <div className="ExchangeChart-info-label">24h Low</div>
                <div>
                  {dayPriceDelta?.low
                    ? numberWithCommas(dayPriceDelta?.low.toFixed(chartToken?.priceDecimals || 2))
                    : "-"}
                </div>
              </div>
            </>
          )}
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
            dataProvider={dataProvider.current}
            period={period}
            setPeriod={setPeriod}
            chartToken={{
              symbol: chartToken.symbol,
              ...chartToken.prices,
            }}
            supportedResolutions={SUPPORTED_RESOLUTIONS_V2}
          />
        )}
      </div>
    </div>
  );
}
