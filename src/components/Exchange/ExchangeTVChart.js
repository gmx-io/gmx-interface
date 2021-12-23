import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import cx from "classnames";

import { createChart } from 'krasulya-lightweight-charts'

import {
	USD_DECIMALS,
	SWAP,
  INCREASE,
	getTokenInfo,
	formatAmount,
	formatDateTime,
  usePrevious,
  getLiquidationPrice,
  useLocalStorageSerializeKey
} from '../../Helpers'
import { getContract } from '../../Addresses'
import {
  getToken
} from '../../data/Tokens'
import { useChartPrices } from '../../Api'
import Tab from '../Tab/Tab'

import { getTokens } from '../../data/Tokens'

const IS_CANDLESTICKS = true

const PRICE_LINE_TEXT_WIDTH = 15

const timezoneOffset = -(new Date()).getTimezoneOffset() * 60

function getChartToken(swapOption, fromToken, toToken, chainId) {
  if (!fromToken || !toToken) { return }

  if (swapOption !== SWAP) { return toToken }

  if (fromToken.isUsdg && toToken.isUsdg) { return getTokens(chainId).find(t => t.isStable) }
  if (fromToken.isUsdg) { return toToken }
  if (toToken.isUsdg) { return fromToken }

  if (fromToken.isStable && toToken.isStable) { return toToken }
  if (fromToken.isStable) { return toToken }
  if (toToken.isStable) { return fromToken }

  return toToken
}

const DEFAULT_PERIOD = "4h"
const PERIODS = {
  "15m": 0.25,
  "1h": 1,
  "4h": 4,
  "1d": 24
}

function getPriceData(prices, chartToken, period) {
  if (!chartToken) {
    return {}
  }

  let priceData = []
  const now = parseInt(Date.now() / 1000)
  let lastPrice

  if (chartToken.isStable) {
    const now = Date.now() / 1000;
    const HOURS_IN_MONTH = 30 * 24;
    const SECONDS_IN_HOUR = 60 * 60;
    for (let i = HOURS_IN_MONTH; i > 0; i--) {
      priceData.push({
        time: now - i * SECONDS_IN_HOUR,
        value: 1,
        open: 1,
        close: 1,
        high: 1,
        low: 1
      })
    }
    return {
      lastPrice: 1,
      priceData
    }
  }

  if (prices && prices.length) {
    const result = [...prices];
    if (chartToken && chartToken.maxPrice && chartToken.minPrice) {
			const currentAveragePrice = chartToken.maxPrice.add(chartToken.minPrice).div(2)
      result.push([now, formatAmount(currentAveragePrice, USD_DECIMALS, 2)])
    }
    let minValue = result.length === 0 ? 1000000 : parseFloat(result[0][1])
    let maxValue = 0
    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      const chartValue = parseFloat(item[1])
      if (!isNaN(chartValue)) {
        if (chartValue > maxValue) {
          maxValue = chartValue
        }
        if (chartValue < minValue) {
          minValue = chartValue
        }
      }

      if (parseInt(item[0]) <= now) {
        priceData.push({
          time: item[0],
          value: chartValue
        })
      }
    }

    if (IS_CANDLESTICKS) {
      const groupedPriceData = []
      let prevFrame = 0
      const PERIOD = 60 * 60 * PERIODS[period]

      let open
      let low
      let high
      let close
      let time

      priceData.forEach((item, i) => {
        time = item.time + timezoneOffset
        const frame = Math.floor(time / PERIOD)
        const value = item.value

        if (prevFrame && frame > prevFrame) {
          close = close + (value - close) * 0.5

          groupedPriceData.push({
            time: prevFrame * PERIOD,
            open,
            low,
            high,
            close,
            frame: prevFrame
          })

          if (prevFrame && frame - prevFrame > 1) {
            let j = 1
            while (j < frame - prevFrame) {
              groupedPriceData.push({
                time: (prevFrame + j) * PERIOD,
                open: close,
                low: close,
                high: close,
                close: close,
                frame: prevFrame + j
              })
              j++

            }
          }

          open = 0
          low = 0
          high = 0
        }

        prevFrame = frame
        if (!open) open = close || value
        if (!low || value < low) low = value
        if (!high || value > high) high = value
        close = value
      })

      groupedPriceData.push({
        time: prevFrame * PERIOD,
        open,
        low,
        high,
        close,
        frame: prevFrame
      })
      priceData = groupedPriceData
    }

    if (priceData.length) {
      lastPrice = priceData[priceData.length - 1].value;
    }
  }
  return { lastPrice, priceData }
}

const getSeriesOptions = () => ({
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/area-series.md
  lineColor: '#5472cc',
  topColor: 'rgba(49, 69, 131, 0.4)',
  bottomColor: 'rgba(42, 64, 103, 0.0)',
  lineWidth: 2,
	priceLineColor: '#3a3e5e',
  downColor: '#fa3c58',
  wickDownColor: '#fa3c58',
  upColor: '#0ecc83',
  wickUpColor: '#0ecc83',
  borderVisible: false
});

const getChartOptions = (width, height) => ({
  width,
  height,
  layout: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    textColor: '#ccc',
    fontFamily: 'Relative'
  },
  localization: {
    // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#time-format
    timeFormatter: businessDayOrTimestamp => {
      return formatDateTime(businessDayOrTimestamp - timezoneOffset);
    }
  },
  grid: {
    vertLines: {
      visible: true,
			color: 'rgba(35, 38, 59, 1)',
			style: 2
    },
    horzLines: {
      visible: true,
			color: 'rgba(35, 38, 59, 1)',
			style: 2
    }
  },
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/time-scale.md#time-scale
  timeScale: {
    rightOffset: 5,
    borderVisible: false,
    barSpacing: 5,
    timeVisible: true,
    fixLeftEdge: true
  },
  // https://github.com/tradingview/lightweight-charts/blob/master/docs/customization.md#price-axis
  priceScale: {
    borderVisible: false
  },
  crosshair: {
    horzLine: {
      color: '#aaa'
    },
    vertLine: {
      color: '#aaa'
    },
    mode: 0
  }
});

export default function ExchangeTVChart(props) {
  const {
    swapOption,
    fromTokenAddress,
    toTokenAddress,
    infoTokens,
    chainId,
    positions,
    savedShouldShowPositionLines,
    orders
  } = props
  const [currentChart, setCurrentChart] = useState();
  const [currentSeries, setCurrentSeries] = useState();

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD)
  if (!(period in PERIODS)) {
    period = DEFAULT_PERIOD
  }

  const [hoveredCandlestick, setHoveredCandlestick] = useState()

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)
  const chartToken = getChartToken(swapOption, fromToken, toToken, chainId)

  const symbol = chartToken ? (chartToken.isNative ? chartToken.baseSymbol : chartToken.symbol) : undefined
  const marketName = chartToken ? symbol + "_USD" : undefined
  const previousMarketName = usePrevious(marketName)

  const currentOrders = useMemo(() => {
    if (swapOption === SWAP || !chartToken) {
      return [];
    }

    return orders.filter(order => {
      if (order.type === SWAP) {
        // we can't show non-stable to non-stable swap orders with existing charts
        // so to avoid users confusion we'll show only long/short orders
        return false;
      }

      const indexToken = getToken(chainId, order.indexToken);
      return (
        order.indexToken === chartToken.address
        || (chartToken.isNetwork && indexToken.isNative)
      )
    })
  }, [orders, chartToken, swapOption, chainId])

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const chartTokenAddress = chartToken ? (chartToken.isNetwork ? nativeTokenAddress : chartToken.address) : undefined
  const [prices, updatePrices] = useChartPrices(marketName, chartTokenAddress, chainId);
  const ref = useRef(null);
  const chartRef = useRef(null);

  const { priceData } = getPriceData(prices, chartToken, period)

  const [chartInited, setChartInited] = useState(false);
  useEffect(() => {
    if (marketName !== previousMarketName) {
      setChartInited(false);
    }
  }, [marketName, previousMarketName])

  const scaleChart = useCallback(() => {
    const from = Date.now() / 1000 - 7 * 86400 * PERIODS[period] / 2 + timezoneOffset;
    const to = Date.now() / 1000 + timezoneOffset;
    currentChart.timeScale().setVisibleRange({from, to});
  }, [currentChart, period]);

  const onCrosshairMove = useCallback(evt => {
    if (!evt.time) {
      setHoveredCandlestick(null)
      return
    }

    for (const point of evt.seriesPrices.values()) {
      setHoveredCandlestick(hoveredCandlestick => {
        if (hoveredCandlestick && hoveredCandlestick.time === evt.time) {
          // rerender optimisations
          return hoveredCandlestick
        }
        return {
          time: evt.time,
          ...point
        }
      })
      break
    }
  }, [setHoveredCandlestick])

  useEffect(() => {
    if (!ref.current || !priceData || !priceData.length || currentChart) {
      return;
    }

    const chart = createChart(
      chartRef.current,
      getChartOptions(chartRef.current.offsetWidth, chartRef.current.offsetHeight)
    );

    chart.subscribeCrosshairMove(onCrosshairMove)

    const series = IS_CANDLESTICKS
      ? chart.addCandlestickSeries(getSeriesOptions())
      : chart.addAreaSeries(getSeriesOptions())

    setCurrentChart(chart);
    setCurrentSeries(series);
  }, [ref, priceData, currentChart, onCrosshairMove])

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices(undefined, true)
    }, 60 * 1000)
    return () => clearInterval(interval);
  }, [updatePrices])

  useEffect(() => {
    if (!currentChart) { return; }
    const resizeChart = () => {
      currentChart.resize(chartRef.current.offsetWidth, chartRef.current.offsetHeight)
    }
    window.addEventListener('resize', resizeChart);
    return () => window.removeEventListener('resize', resizeChart);
  }, [currentChart]);

  useEffect(() => {
    if (currentSeries && priceData && priceData.length) {
      currentSeries.setData(priceData);

      if (!chartInited) {
        scaleChart()
        setChartInited(true);
      }
    }
  }, [priceData, currentSeries, chartInited, scaleChart])

  useEffect(() => {
    const lines = [];
    if (currentSeries && savedShouldShowPositionLines) {
      if (currentOrders && currentOrders.length > 0) {
        currentOrders.forEach(order => {
          const indexToken = getToken(chainId, order.indexToken)
          let tokenSymbol
          if (indexToken && indexToken.symbol) {
            tokenSymbol = indexToken.isNative ? indexToken.baseSymbol : indexToken.symbol
          }
          const title = `${order.type === INCREASE ? "Inc." : "Dec."} ${tokenSymbol} ${order.isLong ? "Long" : "Short"}`
          const color = '#3a3e5e'
          lines.push(currentSeries.createPriceLine({
            price: parseFloat(formatAmount(order.triggerPrice, USD_DECIMALS, 2)),
            color,
            title: title.padEnd(PRICE_LINE_TEXT_WIDTH, " ")
          }))
        })
      }
      if (positions && positions.length > 0) {
        const color = '#3a3e5e'

        positions.forEach(position => {
          lines.push(currentSeries.createPriceLine({
            price: parseFloat(formatAmount(position.averagePrice, USD_DECIMALS, 2)),
            color,
            title: (`Open ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`).padEnd(PRICE_LINE_TEXT_WIDTH, " ")
          }))

          const liquidationPrice = getLiquidationPrice(position)
          lines.push(currentSeries.createPriceLine({
            price: parseFloat(formatAmount(liquidationPrice, USD_DECIMALS, 2)),
            color,
            title: (`Liq. ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`).padEnd(PRICE_LINE_TEXT_WIDTH, " ")
          }))
        })
      }
    }
    return () => {
      lines.forEach(line => currentSeries.removePriceLine(line))
    }
  }, [currentOrders, positions, currentSeries, chainId, savedShouldShowPositionLines])

  const candleStatsHtml = useMemo(() => {
    if (!priceData) {
      return null
    }
    const candlestick = hoveredCandlestick || priceData[priceData.length - 1]
    if (!candlestick) {
      return null
    }

    const className = cx({
      "ExchangeChart-bottom-stats": true,
      positive: candlestick.open <= candlestick.close,
      negative: candlestick.open > candlestick.close,
      [`length-${String(parseInt(candlestick.close)).length}`]: true
    })

    const toFixedNumbers = 2

    return <div className={className}>
      <span className="ExchangeChart-bottom-stats-label">O</span><span className="ExchangeChart-bottom-stats-value">{candlestick.open.toFixed(toFixedNumbers)}</span>
      <span className="ExchangeChart-bottom-stats-label">H</span><span className="ExchangeChart-bottom-stats-value">{candlestick.high.toFixed(toFixedNumbers)}</span>
      <span className="ExchangeChart-bottom-stats-label">L</span><span className="ExchangeChart-bottom-stats-value">{candlestick.low.toFixed(toFixedNumbers)}</span>
      <span className="ExchangeChart-bottom-stats-label">C</span><span className="ExchangeChart-bottom-stats-value">{candlestick.close.toFixed(toFixedNumbers)}</span>
    </div>
  }, [hoveredCandlestick, priceData])

	let high
	let low
	let deltaPrice
	let currentAveragePrice
	let delta
	let deltaPercentage
	let deltaPercentageStr

  const now = parseInt(Date.now() / 1000)
	const timeThreshold = now - 24 * 60 * 60

	if (prices) {
		for (let i = prices.length - 1; i > 0; i--) {
			const [ time, value ] = prices[i]
			if (time < timeThreshold) {
				break;
			}
			if (!low) { low = value }
			if (!high) { high = value }

			if (value > high) { high = value }
			if (value < low) { low = value }

			deltaPrice = value
		}
	}

	if (chartToken && chartToken.minPrice && chartToken.maxPrice) {
		currentAveragePrice = chartToken.maxPrice.add(chartToken.minPrice).div(2)
	}

	if (deltaPrice && currentAveragePrice) {
		const average = parseFloat(formatAmount(currentAveragePrice, USD_DECIMALS, 2))
		delta = average - deltaPrice
		deltaPercentage = delta * 100 / average
		if (deltaPercentage > 0) {
			deltaPercentageStr = `+${deltaPercentage.toFixed(2)}%`
		} else {
			deltaPercentageStr = `${deltaPercentage.toFixed(2)}%`
		}
		if (deltaPercentage === 0) {
			deltaPercentageStr = "0.00"
		}
	}

  if (!chartToken) {
    return null
  }

  return (
    <div className="ExchangeChart tv" ref={ref}>
      <div className="ExchangeChart-top App-box App-box-border">
        <div className="ExchangeChart-top-inner">
          <div>
            <div className="ExchangeChart-title">
              {chartToken && `${chartToken.symbol} / USD`}
            </div>
          </div>
					<div>
						<div className="ExchangeChart-main-price">{formatAmount(chartToken.maxPrice, USD_DECIMALS, 2)}</div>
						<div className="ExchangeChart-info-label">${formatAmount(chartToken.minPrice, USD_DECIMALS, 2)}</div>
					</div>
					<div>
						<div className="ExchangeChart-info-label">24h Change</div>
						<div className={cx({ positive: deltaPercentage > 0, negative: deltaPercentage < 0 })}>
							{!deltaPercentageStr && "-"}
							{deltaPercentageStr && deltaPercentageStr}
						</div>
					</div>
					<div className="ExchangeChart-additional-info">
						<div className="ExchangeChart-info-label">24h High</div>
						<div>
							{!high && "-"}
							{high && high.toFixed(2)}
						</div>
					</div>
					<div className="ExchangeChart-additional-info">
						<div className="ExchangeChart-info-label">24h Low</div>
						<div>
							{!low && "-"}
							{low && low.toFixed(2)}
						</div>
					</div>
        </div>
      </div>
      <div className="ExchangeChart-bottom App-box App-box-border">
        <div className="ExchangeChart-bottom-header">
          <div className="ExchangeChart-bottom-controls">
            <Tab options={Object.keys(PERIODS)} option={period} setOption={setPeriod} />
          </div>
          {candleStatsHtml}
        </div>
        <div className="ExchangeChart-bottom-content" ref={chartRef}></div>
      </div>
    </div>
  )
}
