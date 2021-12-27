import { ethers } from 'ethers';
import { helperToast } from "./Helpers"
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'

import OrderBook from './abis/OrderBook.json'
import Vault from './abis/Vault.json'
import Router from './abis/Router.json'
import { getContract } from './Addresses'
import {
  SWAP_ORDER_EXECUTION_GAS_FEE,
  INCREASE_ORDER_EXECUTION_GAS_FEE,
  DECREASE_ORDER_EXECUTION_GAS_FEE,
  ARBITRUM,
  // DEFAULT_GAS_LIMIT,
  bigNumberify,
  getExplorerUrl,
  getServerBaseUrl,
  getGasLimit,
  replaceNativeTokenAddress,
  getProvider,
  getOrderKey
} from './Helpers'

const { AddressZero } = ethers.constants

// Ethereum network, Chainlink Aggregator contracts
const BTC_USD_FEED_ID = "0xae74faa92cb67a95ebcab07358bc222e33a34da7";
const BNB_USD_FEED_ID = "0xc45ebd0f901ba6b2b8c7e70b717778f055ef5e6d";
const ETH_USD_FEED_ID = "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6";
const LINK_USD_FEED_ID = "0xdfd03bfc3465107ce570a0397b247f546a42d0fa";
const UNI_USD_FEED_ID = "0x68577f915131087199fe48913d8b416b3984fd38";

const FEED_ID_MAP = {
  "BTC_USD": BTC_USD_FEED_ID,
  "ETH_USD": ETH_USD_FEED_ID,
  "BNB_USD": BNB_USD_FEED_ID,
  "LINK_USD": LINK_USD_FEED_ID,
  "UNI_USD": UNI_USD_FEED_ID
};

const CHAINLINK_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/deividask/chainlink";
const chainlinkClient = new ApolloClient({
  uri: CHAINLINK_GRAPH_API_URL,
  cache: new InMemoryCache()
});

const GMX_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats"
const gmxGraphClient = new ApolloClient({
  uri: GMX_GRAPH_API_URL,
  cache: new InMemoryCache()
});

const NISSOH_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault"
const nissohGraphClient = new ApolloClient({
  uri: NISSOH_GRAPH_API_URL,
  cache: new InMemoryCache()
});

export function useAllOrdersStats() {
  const query = gql(`{
    orderStat(id: "total") {
      openSwap
      openIncrease
      openDecrease
      executedSwap
      executedIncrease
      executedDecrease
      cancelledSwap
      cancelledIncrease
      cancelledDecrease
    }
  }`)

  const [res, setRes] = useState()

  useEffect(() => {
    gmxGraphClient.query({ query }).then(setRes).catch(console.warn)
  }, [setRes, query])

  return res ? res.data.orderStat : null
}

export function useUserStat() {
  const query = gql(`{
    userStat(id: "total") {
      id
      uniqueCount
    }
  }`)

  const [res, setRes] = useState()

  useEffect(() => {
    gmxGraphClient.query({ query }).then(setRes).catch(console.warn)
  }, [setRes, query])

  return res ? res.data.userStat : null
}

export function useLiquidationsData(chainId, account) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (chainId === ARBITRUM && account) {
      const query = gql(`{
         liquidatedPositions(
           where: {account: "${account.toLowerCase()}"}
           first: 100
           orderBy: timestamp
           orderDirection: desc
         ) {
           key
           timestamp
           borrowFee
           loss
           collateral
           size
           markPrice
           type
         }
      }`)
      gmxGraphClient.query({ query }).then(res => {
        const _data = res.data.liquidatedPositions.map(item => {
          return {
            ...item,
            size: bigNumberify(item.size),
            collateral: bigNumberify(item.collateral),
            markPrice: bigNumberify(item.markPrice)
          }
        })
        setData(_data)
      }).catch(console.warn)
    }
  }, [setData, chainId, account])

  return data
}

export function useAllPositions(chainId, library) {
  const count = 1000
  const query = gql(`{
    aggregatedTradeOpens(
      first: ${count}
    ) {
      account
      initialPosition{
        indexToken
        collateralToken
        isLong
        sizeDelta
      }
      increaseList {
        sizeDelta
      }
      decreaseList {
        sizeDelta
      }
    }
  }`)

  const [res, setRes] = useState()

  useEffect(() => {
    nissohGraphClient.query({ query }).then(setRes).catch(console.warn)
  }, [setRes, query])

  const key = res ? `allPositions${count}__` : false
  const { data: positions = [] } = useSWR(key, async () => {
    const provider = getProvider(library, chainId)
    const vaultAddress = getContract(chainId, "Vault")
    const contract = new ethers.Contract(vaultAddress, Vault.abi, provider)
    const ret = await Promise.all(res.data.aggregatedTradeOpens.map(async dataItem => {
      try {
        const { indexToken, collateralToken, isLong } = dataItem.initialPosition
        const positionData = await contract.getPosition(dataItem.account, collateralToken, indexToken, isLong)
        const position = {
          size: bigNumberify(positionData[0]),
          collateral: bigNumberify(positionData[1]),
          entryFundingRate: bigNumberify(positionData[3]),
          account: dataItem.account
        }
        position.fundingFee = await contract.getFundingFee(collateralToken, position.size, position.entryFundingRate)
        position.marginFee = position.size.div(1000)
        position.fee = position.fundingFee.add(position.marginFee)

        const THRESHOLD = 5000
        const collateralDiffPercent = position.fee.mul(10000).div(position.collateral)
        position.danger = collateralDiffPercent.gt(THRESHOLD)

        return position
      } catch (ex) {
        console.error(ex)
      }
    }))

    return ret.filter(Boolean)
  })

  return positions
}

export function useAllOrders(chainId, library) {
  const query = gql(`{
    orders(
      first: 1000,
      orderBy: createdTimestamp,
      orderDirection: desc,
      where: {status: "open"}
    ) {
      type
      account
      index
      status
      createdTimestamp
    }
  }`)

  const [res, setRes] = useState()

  useEffect(() => {
    gmxGraphClient.query({ query }).then(setRes)
  }, [setRes, query])

  const key = res ? res.data.orders.map(order => `${order.type}-${order.account}-${order.index}`) : null
  const { data: orders = [] } = useSWR(key, () => {
    const provider = getProvider(library, chainId)
    const orderBookAddress = getContract(chainId, "OrderBook")
    const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, provider)
    return Promise.all(res.data.orders.map(async order => {
      try {
        const type = order.type.charAt(0).toUpperCase() + order.type.substring(1)
        const method = `get${type}Order`
        const orderFromChain = await contract[method](order.account, order.index)
        const ret = {}
        for (const [key, val] of Object.entries(orderFromChain)) {
          ret[key] = val
        }
        if (order.type === "swap") {
          ret.path = [ret.path0, ret.path1, ret.path2].filter(address => address !== AddressZero)
        }
        ret.type = type
        ret.index = order.index
        ret.account = order.account
        ret.createdTimestamp = order.createdTimestamp
        return ret
      } catch (ex) {
        console.error(ex)
      }
    }))
  })

  return orders.filter(Boolean)
}

export function usePositionsForOrders(chainId, library, orders) {
  const key = orders ? orders.map(order => getOrderKey(order) + '____') : null
  const { data: positions = {} } = useSWR(key, async () => {
    const provider = getProvider(library, chainId)
    const vaultAddress = getContract(chainId, "Vault")
    const contract = new ethers.Contract(vaultAddress, Vault.abi, provider)
    const data = await Promise.all(orders.map(async order => {
      try {
        const position = await contract.getPosition(order.account, order.collateralToken, order.indexToken, order.isLong)
        if (position[0].eq(0)) {
          return [null, order]
        }
        return [position, order]
      } catch (ex) {
        console.error(ex)
      }
    }))
    return data.reduce((memo, [position, order]) => {
      memo[getOrderKey(order)] = position
      return memo
    }, {})
  })

  return positions
}

async function getChartPricesFromStats(marketName, chainId) {
  let symbol = marketName.split('_')[0]
  if (symbol === 'WBTC') {
    symbol = 'BTC'
  } else if (symbol === 'WETH') {
    symbol = 'ETH'
  }
  const hostname = document.location.hostname === 'localhost' && false
    ? 'http://localhost:3113/'
    : 'https://stats.gmx.io/'
  const from = Math.floor((Date.now() - 86400 * 1000 * 60) / 1000) // 2 months
  const url = `${hostname}api/chart/${symbol}?from=${from}&preferableChainId=${chainId}`
  const TIMEOUT = 3000
  const res = await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(`${url} request timeout`)), TIMEOUT)
    fetch(url).then(resolve).catch(reject)
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const json = await res.json()

  if (!json || json.length < 100) {
    throw new Error(`not enough prices: ${json?.length}`)
  }

  const OBSOLETE_THRESHOLD = 60 * 60 * 3 // chainlink updates on Arbitrum are not too frequent
  const lastTs = json[json.length - 1][0]
  const diff = Date.now() / 1000 - lastTs
  if (diff > OBSOLETE_THRESHOLD) {
    throw new Error('chart data is obsolete, last price record at ' + new Date(lastTs * 1000))
  }
  return json
}

function getChartPricesFromGraph(marketName) {
  if (marketName.startsWith('WBTC') || marketName.startsWith('WETH') || marketName.startsWith('WBNB')) {
    marketName = marketName.substr(1)
  }
  const feedId = FEED_ID_MAP[marketName];
  if (!feedId) {
    throw new Error(`undefined marketName ${marketName}`)
  }

  const PER_CHUNK = 1000;
  const CHUNKS_TOTAL = 6;
  const requests = [];
  for (let i = 0; i < CHUNKS_TOTAL; i++) {
    const query = gql(`{
      rounds(
        first: ${PER_CHUNK},
        skip: ${i * PER_CHUNK},
        orderBy: unixTimestamp,
        orderDirection: desc,
        where: {feed: "${feedId}"}
      ) {
        unixTimestamp,
        value
      }
    }`)
    requests.push(chainlinkClient.query({query}))
  }

  return Promise.all(requests).then(chunks => {
    const prices = [];
    const uniqTs = new Set();
    chunks.forEach(chunk => {
      chunk.data.rounds.forEach(item => {
        if (uniqTs.has(item.unixTimestamp)) {
          return;
        }

        uniqTs.add(item.unixTimestamp)
        prices.push([
            item.unixTimestamp,
            Number(item.value) / 1e8
        ]);
      })
    });

    return prices.sort(([timeA], [timeB]) => timeA - timeB);
  }).catch(err => {
    console.error(err);
  })
}

function invariant(condition, errorMsg) {
  if (!condition) {
    throw new Error(errorMsg)
  }
}

export function useTrades(chainId, account) {
  const url = (account && account.length > 0) ? `${getServerBaseUrl(chainId)}/actions?account=${account}` : `${getServerBaseUrl(chainId)}/actions`
  const { data: trades, mutate: updateTrades } = useSWR(url, {
    dedupingInterval: 30000,
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  return { trades, updateTrades }
}

export function useChartPrices(marketName, chainId) {
  const { data: prices = [], mutate: updatePrices } = useSWR(marketName && ['getChartPrices', marketName, chainId], {
    fetcher: async () => {
      try {
        return await getChartPricesFromStats(marketName, chainId)
      } catch (ex) {
        console.warn('chart request failed')
        console.warn(ex)
        try {
          return await getChartPricesFromGraph(marketName)
        } catch (ex2) {
          console.warn('fallback chart request failed')
          console.warn(ex2)
          return []
        }
      }
    },
    dedupingInterval: 60000,
    focusThrottleInterval: 60000 * 10
  })
  return [prices, updatePrices];
}

export async function approvePlugin(chainId, pluginAddress, { library, pendingTxns, setPendingTxns }) {
  const routerAddress = getContract(chainId, "Router")
  const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
  return callContract(chainId, contract, 'approvePlugin', [pluginAddress], {
    sentMsg: 'Enable orders sent',
    failMsg: 'Enable orders failed',
    pendingTxns,
    setPendingTxns
  })
}

export async function createSwapOrder(
  chainId,
  library,
  path,
  amountIn,
  minOut,
  triggerRatio,
  nativeTokenAddress,
  opts = {}
) {
  const executionFee = SWAP_ORDER_EXECUTION_GAS_FEE
  const triggerAboveThreshold = false
  let shouldWrap = false
  let shouldUnwrap = false
  opts.value = executionFee

  if (path[0] === AddressZero) {
    shouldWrap = true
    opts.value = opts.value.add(amountIn)
  }
  if (path[path.length - 1] === AddressZero) {
    shouldUnwrap = true
  }
  path = replaceNativeTokenAddress(path, nativeTokenAddress)

  const params = [
    path,
    amountIn,
    minOut,
    triggerRatio,
    triggerAboveThreshold,
    executionFee,
    shouldWrap,
    shouldUnwrap
  ]

  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, 'createSwapOrder', params, opts)
}

export async function createIncreaseOrder(
  chainId,
  library,
  nativeTokenAddress,
  path,
  amountIn,
  indexTokenAddress,
  minOut,
  sizeDelta,
  collateralTokenAddress,
  isLong,
  triggerPrice,
  opts = {}
) {
  invariant(!isLong || indexTokenAddress === collateralTokenAddress, "invalid token addresses")
  invariant(indexTokenAddress !== AddressZero, "indexToken is 0")
  invariant(collateralTokenAddress !== AddressZero, "collateralToken is 0")

  const fromETH = path[0] === AddressZero

  path = replaceNativeTokenAddress(path, nativeTokenAddress)
  const shouldWrap = fromETH
  const triggerAboveThreshold = !isLong
  const executionFee = INCREASE_ORDER_EXECUTION_GAS_FEE

  const params = [
    path,
    amountIn,
    indexTokenAddress,
    minOut,
    sizeDelta,
    collateralTokenAddress,
    isLong,
    triggerPrice,
    triggerAboveThreshold,
    executionFee,
    shouldWrap
  ]

  if (!opts.value) {
    opts.value = fromETH ? amountIn.add(executionFee) : executionFee
  }

  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, 'createIncreaseOrder', params, opts)
}

export async function createDecreaseOrder(
  chainId,
  library,
  indexTokenAddress,
  sizeDelta,
  collateralTokenAddress,
  collateralDelta,
  isLong,
  triggerPrice,
  triggerAboveThreshold,
  opts = {}
) {
  invariant(!isLong || indexTokenAddress === collateralTokenAddress, "invalid token addresses")
  invariant(indexTokenAddress !== AddressZero, "indexToken is 0")
  invariant(collateralTokenAddress !== AddressZero, "collateralToken is 0")

  const executionFee = DECREASE_ORDER_EXECUTION_GAS_FEE

  const params = [
    indexTokenAddress,
    sizeDelta,
    collateralTokenAddress,
    collateralDelta,
    isLong,
    triggerPrice,
    triggerAboveThreshold
  ];
  opts.value = executionFee
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, 'createDecreaseOrder', params, opts)
}

export async function cancelSwapOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelSwapOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function cancelDecreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelDecreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function cancelIncreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelIncreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function updateDecreaseOrder(chainId, library, index, collateralDelta, sizeDelta, triggerPrice, triggerAboveThreshold, opts) {
  const params = [index, collateralDelta, sizeDelta, triggerPrice, triggerAboveThreshold]
  const method = 'updateDecreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function updateIncreaseOrder(chainId, library, index, sizeDelta, triggerPrice, triggerAboveThreshold, opts) {
  const params = [index, sizeDelta, triggerPrice, triggerAboveThreshold];
  const method = 'updateIncreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function updateSwapOrder(chainId, library, index, minOut, triggerRatio, triggerAboveThreshold, opts) {
  const params = [index, minOut, triggerRatio, triggerAboveThreshold];
  const method = 'updateSwapOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export async function _executeOrder(chainId, library, method, account, index, feeReceiver, opts) {
  const params = [account, index, feeReceiver];
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())
  return callContract(chainId, contract, method, params, opts);
}

export function executeSwapOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, 'executeSwapOrder', account, index, feeReceiver, opts);
}

export function executeIncreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, 'executeIncreaseOrder', account, index, feeReceiver, opts);
}

export function executeDecreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  return _executeOrder(chainId, library, 'executeDecreaseOrder', account, index, feeReceiver, opts);
}

const NOT_ENOUGH_FUNDS = 'NOT_ENOUGH_FUNDS'
const USER_DENIED = 'USER_DENIED'
const SLIPPAGE = 'SLIPPAGE'
const TX_ERROR_PATTERNS = {
  [NOT_ENOUGH_FUNDS]: ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"],
  [USER_DENIED]: ["User denied transaction signature"],
  [SLIPPAGE]: ["Router: mark price lower than limit", "Router: mark price higher than limit"]
}
export function extractError(ex) {
  if (!ex) {
    return []
  }
  const message = ex.data?.message || ex.message
  if (!message) {
    return []
  }
  for (const [type, patterns] of Object.entries(TX_ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      if (message.includes(pattern)) {
        return [message, type]
      }
    }
  }
  return [message]
}

function ToastifyDebug(props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="Toastify-debug">
      {!open &&
        <span className="Toastify-debug-button" onClick={() => setOpen(true)}>Show error</span>
      }
      {open &&
        props.children
      }
    </div>
  )
}

export async function callContract(chainId, contract, method, params, opts) {
  try {
    if (!Array.isArray(params) && typeof params === 'object' && opts === undefined) {
      opts = params
      params = []
    }
    if (!opts) {
      opts = {}
    }

    if (!opts.gasLimit) {
      opts.gasLimit = await getGasLimit(contract, method, params, opts.value)
    }

    // if (opts.gasLimit.lt(DEFAULT_GAS_LIMIT)) {
    //   opts.gasLimit = bigNumberify(DEFAULT_GAS_LIMIT)
    // }

    const res = await contract[method](...params, { gasLimit: opts.gasLimit, value: opts.value })
    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash
    const sentMsg = opts.sentMsg || "Transaction sent."
    helperToast.success(
      <div>
        {sentMsg} <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
        <br/>
      </div>
    );
    if (opts.setPendingTxns) {
      const pendingTxn = {
        hash: res.hash,
        message: opts.successMsg || "Transaction completed."
      }
      opts.setPendingTxns(pendingTxns => [...pendingTxns, pendingTxn])
    }
    return res;
  } catch (e) {
    let failMsg
    const [message, type] = extractError(e)
    switch (type) {
      case NOT_ENOUGH_FUNDS:
        failMsg = (<div>
          There is not enough ETH in your account on Arbitrum to send this transaction.<br/>
          <br/>
          <a href={"https://arbitrum.io/bridge-tutorial/"} target="_blank" rel="noopener noreferrer">Bridge ETH to Arbitrum</a>
        </div>)
        break
      case USER_DENIED:
        failMsg = "Transaction was cancelled."
        break
      case SLIPPAGE:
        failMsg = "The mark price has changed, consider increasing your Slippage Tolerance by clicking on the \"...\" icon next to your address."
        break
      default:
        failMsg = (<div>
          {opts.failMsg || "Transaction failed."}<br/>
          {message &&
            <ToastifyDebug>
              {message}
            </ToastifyDebug>
          }
        </div>)
    }
    helperToast.error(failMsg);
    throw e
  }
}
