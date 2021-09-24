import { ethers } from 'ethers';
import { toast } from 'react-toastify'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { useState } from 'react'
import useSWR from 'swr'

import OrderBook from './abis/OrderBook.json'
import Router from './abis/Router.json'
import { getContract } from './Addresses'
import {
  SWAP_ORDER_EXECUTION_GAS_FEE,
  INCREASE_ORDER_EXECUTION_GAS_FEE,
  DECREASE_ORDER_EXECUTION_GAS_FEE,
  getExplorerUrl,
  getServerBaseUrl,
  getGasLimit,
  replaceNativeTokenAddress
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

async function getChartPricesFromStats(marketName, chainId) {
  let symbol = marketName.split('_')[0]
  if (symbol === 'WBTC') {
    symbol = 'BTC'
  } else if (symbol === 'WETH') {
    symbol = 'ETH'
  }
  const hostname = document.location.hostname === 'localhost' && false
    ? 'http://localhost:3105/'
    : 'https://stats.gambit.financial/'
  const from = Math.floor((Date.now() - 86400 * 1000 * 60) / 1000) // 2 months
  const url = `${hostname}api/chart/${symbol}?from=${from}&preferableChainId=${chainId}`
  const TIMEOUT = 5000
  const res = await new Promise((resolve, reject) => {
    fetch(url).then(resolve)
    setTimeout(() => reject(new Error(`${url} request timeout`)), TIMEOUT)
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const json = await res.json()

  const OBSOLETE_THRESHOLD = 60 * 60 * 2 // chainlink updates on Arbitrum are not too frequent
  if (json && json.length) {
    const lastTs = json[json.length - 1][0]
    const diff = Date.now() / 1000 - lastTs
    if (diff > OBSOLETE_THRESHOLD) {
      throw new Error('chart data is obsolete')
    }
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
  const { data: prices = [], mutate: updatePrices } = useSWR(['getChartPrices', marketName, chainId], {
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

export function approvePlugin(chainId, pluginAddress, { setIsApproving, library, onApproveSubmitted, pendingTxns, setPendingTxns }) {
  setIsApproving(true);

  const routerAddress = getContract(chainId, "Router")
  const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
  return callContract(chainId, contract, 'approvePlugin', [pluginAddress], {
    sentMsg: 'Approval Sent',
    successMsg: 'Plugin Approved',
    failMsg: 'Approval failed',
    pendingTxns,
    setPendingTxns
  })
  .then(() => {
    if (onApproveSubmitted) { onApproveSubmitted() }
  })
  .finally(() => {
    setIsApproving(false)
  })
}

export function createSwapOrder(
  chainId,
  library,
  path,
  amountIn,
  minOut,
  triggerRatio,
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
  path = replaceNativeTokenAddress(path)

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

export function createIncreaseOrder(
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

  const triggerAboveThreshold = !isLong
  const executionFee = INCREASE_ORDER_EXECUTION_GAS_FEE
  const shouldWrap = path[0] === nativeTokenAddress

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
    opts.value = path[0] === nativeTokenAddress ? amountIn.add(executionFee) : executionFee
  }

  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, 'createIncreaseOrder', params, opts)
}

export function createDecreaseOrder(
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

export function cancelSwapOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelSwapOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function cancelDecreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelDecreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function cancelIncreaseOrder(chainId, library, index, opts) {
  const params = [index];
  const method = 'cancelIncreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function updateDecreaseOrder(chainId, library, index, collateralDelta, sizeDelta, triggerPrice, triggerAboveThreshold, opts) {
  const params = [index, collateralDelta, sizeDelta, triggerPrice, triggerAboveThreshold]
  const method = 'updateDecreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function updateIncreaseOrder(chainId, library, index, sizeDelta, triggerPrice, triggerAboveThreshold, opts) {
  const params = [index, sizeDelta, triggerPrice, triggerAboveThreshold];
  const method = 'updateIncreaseOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function updateSwapOrder(chainId, library, index, minOut, triggerRatio, triggerAboveThreshold, opts) {
  const params = [index, minOut, triggerRatio, triggerAboveThreshold];
  const method = 'updateSwapOrder';
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())

  return callContract(chainId, contract, method, params, opts);
}

export function _executeOrder(chainId, library, method, account, index, feeReceiver, opts) {
  const params = [account, index, feeReceiver];
  const orderBookAddress = getContract(chainId, "OrderBook")
  const contract = new ethers.Contract(orderBookAddress, OrderBook.abi, library.getSigner())
  return callContract(chainId, contract, method, params, opts);
}

export function executeSwapOrder(chainId, library, account, index, feeReceiver, opts) {
  _executeOrder(chainId, library, 'executeSwapOrder', account, index, feeReceiver, opts);
}

export function executeIncreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  _executeOrder(chainId, library, 'executeIncreaseOrder', account, index, feeReceiver, opts);
}

export function executeDecreaseOrder(chainId, library, account, index, feeReceiver, opts) {
  _executeOrder(chainId, library, 'executeDecreaseOrder', account, index, feeReceiver, opts);
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
  return []
}

function ToastifyDebug(props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="Toastify-debug">
      {!open &&
        <span className="Toastify-debug-button" onClick={() => setOpen(true)}>show error</span> 
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
    if (!opts.gasLimit) {
      opts.gasLimit = await getGasLimit(contract, method, params, opts.value)
    }

    const res = await contract[method](...params, { gasLimit: opts.gasLimit, value: opts.value })
    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash
    const sentMsg = opts.sentMsg || "Transaction sent."
    toast.success(
      <div>
        {sentMsg} <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
        <br/>
      </div>
    );
    if (opts.setPendingTxns) {
      const pendingTxn = {
        hash: res.hash,
        message: opts.successMsg || "Transaction sent"
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
        failMsg = "Price has changed, try to increase slippage in settings or try again later"
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
    toast.error(failMsg);
    throw e
  }
}
