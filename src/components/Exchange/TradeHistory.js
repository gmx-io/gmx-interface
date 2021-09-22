import React, { useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
	formatAmount,
	bigNumberify,
	USD_DECIMALS,
	getExplorerUrl,
	formatDateTime,
  deserialize
} from '../../Helpers'
import {
  useTrades
} from '../../Api'

import './TradeHistory.css';

export default function TradeHistory(props) {
  const {
  	account,
  	infoTokens,
  	getTokenInfo,
    chainId,
    nativeTokenAddress
  } = props

  const { trades, updateTrades } = useTrades(chainId, account)

  useEffect(() => {
    const interval = setInterval(() => {
      updateTrades(undefined, true)
    }, 10 * 1000)
    return () => clearInterval(interval);
  }, [updateTrades])

  const getMsg = useCallback((trade) => {
    const tradeData = trade.data
    const params = JSON.parse(tradeData.params);
    const defaultMsg = ""

    if (tradeData.action === "BuyUSDG") {
      const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress)
      if (!token) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.tokenAmount, token.decimals, 4, true)} ${token.symbol} for ${formatAmount(params.usdgAmount, 18, 4, true)} USDG`
    }

    if (tradeData.action === "SellUSDG") {
      const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress)
      if (!token) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.usdgAmount, 18, 4, true)} USDG for ${formatAmount(params.tokenAmount, token.decimals, 4, true)} ${token.symbol}`
    }

    if (tradeData.action === "Swap") {
      const tokenIn = getTokenInfo(infoTokens, params.tokenIn, true, nativeTokenAddress)
      const tokenOut = getTokenInfo(infoTokens, params.tokenOut, true, nativeTokenAddress)
      if (!tokenIn || !tokenOut) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.amountIn, tokenIn.decimals, 4, true)} ${tokenIn.symbol} for ${formatAmount(params.amountOut, tokenOut.decimals, 4, true)} ${tokenOut.symbol}`
    }

    if (tradeData.action === "IncreasePosition-Long" || tradeData.action === "IncreasePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress)
      if (!indexToken) {
        return defaultMsg
      }
      if (bigNumberify(params.sizeDelta).eq(0)) {
        return `Deposit ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD into ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}`
      }
      return `Increase ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}, +${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, 2, true)} USD`
    }

    if (tradeData.action === "DecreasePosition-Long" || tradeData.action === "DecreasePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress)
      if (!indexToken) {
        return defaultMsg
      }
      if (bigNumberify(params.sizeDelta).eq(0)) {
        return `Withdraw ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD from ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}`
      }
      return `
        Decrease ${indexToken.symbol} ${params.isLong ? "Long" : "Short"},
        -${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, 2, true)} USD
      `
    }

    if (tradeData.action === "LiquidatePosition-Long" || tradeData.action === "LiquidatePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress)
      if (!indexToken) {
        return defaultMsg
      }
      return `
        Liquidated ${indexToken.symbol} ${params.isLong ? "Long" : "Short"},
        ${formatAmount(params.size, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, 2, true)} USD
      `
    }

    if (["ExecuteIncreaseOrder", "ExecuteDecreaseOrder"].includes(tradeData.action)) {
      const order = deserialize(params.order);
      const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress)
      if (!indexToken) {
        return defaultMsg
      }
      const typeDisplay = order.type === "Increase" ? "Limit" : "Trigger";
      const longShortDisplay = order.isLong ? "Long" : "Short";
      const triggerPriceDisplay = formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)
      const sizeDeltaDisplay = `${order.type === "Increase" ? "+" : "-"}${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}`;
      return `
        Execute ${typeDisplay} Order, ${indexToken.symbol} ${longShortDisplay},
        ${sizeDeltaDisplay} USD, Trigger Price: ${triggerPriceDisplay} USD
      `
    }

    if (tradeData.action === "ExecuteSwapOrder") {
      const order = deserialize(params.order);
      const fromToken = getTokenInfo(infoTokens, order.path[0])
      if (!fromToken) {
        return defaultMsg
      }
      const fromAmountDisplay = formatAmount(order.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true, nativeTokenAddress)
      const toToken = getTokenInfo(infoTokens, order.path[order.path.length - 1])
      return `
        Execute Limit Order, Swap ${fromAmountDisplay} ${fromToken.symbol} for ${toToken.symbol}
      `;
    }
  }, [getTokenInfo, infoTokens, nativeTokenAddress])

  const tradesWithMessages = useMemo(() => {
    if (!trades) {
      return [];
    }

    return trades.map(trade => ({
      msg: getMsg(trade),
      ...trade
    })).filter(trade => trade.msg)
  }, [trades, getMsg])

  return (
    <div className="TradeHistory">
    {(tradesWithMessages.length === 0) && <div className="TradeHistory-row App-box">
      No trades yet
    </div>
    }
    {(tradesWithMessages.length > 0) && tradesWithMessages.slice(0, 30).map((trade, index) => {
      const tradeData = trade.data
      const txUrl = getExplorerUrl(chainId) + "tx/" + tradeData.txhash

      let msg = getMsg(trade)

      if (!msg) {
        return null;
      }

      return (
        <div className="TradeHistory-row App-box App-box-border" key={index}>
          <div>
            <div className="muted TradeHistory-time">
              {formatDateTime(tradeData.timestamp)}
              {(!account || account.length === 0) && <span> (<Link to={`/actions/${tradeData.account}`}>{tradeData.account}</Link>)</span>}
            </div>
            <a className="plain" href={txUrl} target="_blank" rel="noopener noreferrer">{msg}</a>
          </div>
        </div>
      )
    })}
    </div>
  )
}
