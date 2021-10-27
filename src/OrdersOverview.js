import { useWeb3React } from "@web3-react/core"
import useSWR from "swr"
import cx from "classnames";

import {
  NavLink
} from "react-router-dom"

import { getContract } from "./Addresses"
import { useAllOrders, useAllOrdersStats, usePositionsForOrders } from "./Api"
import { getTokens, getWhitelistedTokens } from "./data/Tokens"
import {
  USD_DECIMALS,
  useChainId,
  getInfoTokens,
  formatAmount,
  shortenAddress,
  fetcher,
  expandDecimals,
  getTokenInfo,
  getExchangeRateDisplay,
  getExchangeRate,
  shouldInvertTriggerRatio,
  formatDateTime,
  getOrderKey
} from "./Helpers"
import ReaderV2 from "./abis/ReaderV2.json"

import "./OrdersOverview.css"

export default function OrdersOverview() {
  const { chainId } = useChainId()
  const { library } = useWeb3React()

  const readerAddress = getContract(chainId, "Reader")
  const vaultAddress = getContract(chainId, "Vault")
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")

  const tokens = getTokens(chainId)
  const whitelistedTokens = getWhitelistedTokens(chainId)
  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)

  const { data: vaultTokenInfo } = useSWR([true, chainId, readerAddress, "getFullVaultTokenInfo"], {
    fetcher: fetcher(library, ReaderV2, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const infoTokens = getInfoTokens(tokens, null, whitelistedTokens, vaultTokenInfo)

  const orders = useAllOrders(chainId, library)
  const stats = useAllOrdersStats()

  const positionsForOrders = usePositionsForOrders(chainId, library, orders.filter(order => order.type === "decrease"))

  let openTotal
  let executedTotal
  let cancelledTotal

  if (stats) {
    openTotal = stats.openDecrease + stats.openIncrease + stats.openSwap
    executedTotal = stats.executedDecrease + stats.executedIncrease + stats.executedSwap
    cancelledTotal = stats.cancelledDecrease + stats.cancelledIncrease + stats.cancelledSwap
  }

  const NEAR_TRESHOLD = 98

  return <div className="Orders-overview">
    {stats &&
      <p className="Orders-overview-stats">
        Total active: {openTotal}, executed: {executedTotal}, cancelled: {cancelledTotal}<br/>
        Increase active: {stats.openIncrease}, executed: {stats.executedIncrease}, cancelled: {stats.cancelledIncrease}<br/>
        Decrease active: {stats.openDecrease}, executed: {stats.executedDecrease}, cancelled: {stats.cancelledDecrease}<br/>
        Swap active: {stats.openSwap}, executed: {stats.executedSwap}, cancelled: {stats.cancelledSwap}<br/>
      </p>
    }
    <table className="Orders-overview-table">
      <thead>
        <tr>
          <th>Type</th>
          <th colSpan="2">Order</th>
          <th>Price</th>
          <th>Mark Price</th>
          <th>Diff</th>
          <th>Account</th>
          <th>Created At</th>
          <th>Index</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => {
          const { type } = order
          const key = getOrderKey(order)
          if (type === "swap") {
            const fromToken = getTokenInfo(infoTokens, order.path0, true, nativeTokenAddress)
            const toToken = getTokenInfo(infoTokens, "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", order.shoudUnwrap, nativeTokenAddress)

            const invert = shouldInvertTriggerRatio(fromToken, toToken)
            const markExchangeRate = getExchangeRate(fromToken, toToken)
            const prefix = (order.triggerAboveThreshold && !invert) || (!order.triggerAboveThreshold && invert) ? "> " : "< "
            const shouldExecute = markExchangeRate && markExchangeRate.lt(order.triggerRatio)
            const nearExecute = markExchangeRate && markExchangeRate.lt(order.triggerRatio.mul(100).div(NEAR_TRESHOLD))
            let diffPercent

            if (markExchangeRate) {
              const diff = order.triggerRatio.gt(markExchangeRate) ? order.triggerRatio.sub(markExchangeRate) : markExchangeRate.sub(order.triggerRatio)
              diffPercent = diff.mul(10000).div(markExchangeRate)
            }

            return <tr key={key}>
              <td>Swap</td>
              <td colSpan="2">
                {formatAmount(order.amountIn, fromToken.decimals, 4, true)} {fromToken.symbol}
                &nbsp;for&nbsp;
                {formatAmount(order.minOut, toToken.decimals, 4, true)} {toToken.symbol}
              </td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                {prefix}{getExchangeRateDisplay(order.triggerRatio, fromToken, toToken)}
              </td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                {getExchangeRateDisplay(markExchangeRate, fromToken, toToken)}
              </td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                {formatAmount(diffPercent, 2, 2)}%
              </td>
              <td>
                <NavLink to={`/actions/${order.account}`}>{shortenAddress(order.account)}</NavLink>
              </td>
              <td>{formatDateTime(order.createdTimestamp)}</td>
              <td>{order.index}</td>
            </tr>
          } else {
            const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress)
            const markPrice = order.triggerAboveThreshold ? indexToken.minPrice : indexToken.maxPrice
            let shouldExecute
            let nearExecute
            let diffPercent
            if (markPrice) {
              shouldExecute = order.triggerAboveThreshold
                ? markPrice.gt(order.triggerPrice)
                : markPrice.lt(order.triggerPrice)

              nearExecute = order.triggerAboveThreshold
                ? markPrice.gt(order.triggerPrice.mul(NEAR_TRESHOLD).div(100))
                : markPrice.lt(order.triggerPrice.mul(100).div(NEAR_TRESHOLD))

              const diff = markPrice.gt(order.triggerPrice) ? markPrice.sub(order.triggerPrice) : order.triggerPrice.sub(markPrice)
              diffPercent = diff.mul(10000).div(markPrice)
            }

            let error
            if (type === "decrease") {
              if (positionsForOrders && key in positionsForOrders) {
                const position = positionsForOrders[key]
                if (!position) {
                  error = "No position"
                } else if (order.sizeDelta.gt(position[0])) {
                  error = `Order size exceeds position`
                }
              }
            }

            return <tr key={key}>
              <td>{type.charAt(0).toUpperCase() + type.substring(1)}</td>
              <td>{order.isLong ? "Long" : "Short"} {indexToken.symbol}</td>
              <td>{type === "increase" ? "+" : "-"}${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}</td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                {order.triggerAboveThreshold ? "> " : "< "}
                {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                ${formatAmount(markPrice, USD_DECIMALS, 2, true)}
              </td>
              <td className={cx({negative: shouldExecute, near: nearExecute})}>
                {formatAmount(diffPercent, 2, 2)}%
              </td>
              <td>
                <NavLink to={`/actions/${order.account}`}>{shortenAddress(order.account)}</NavLink>
              </td>
              <td>{formatDateTime(order.createdTimestamp)}</td>
              <td>{order.index}</td>
              <td className="negative">
                {error}
              </td>
            </tr>
          }
        })}
      </tbody>
    </table>
  </div>
}
