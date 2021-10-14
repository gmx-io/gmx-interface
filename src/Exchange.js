import React, { useEffect, useState, useMemo, useCallback } from 'react'

import { useWeb3React } from '@web3-react/core'
import useSWR from 'swr'
import { ethers } from 'ethers'

import {
  BASIS_POINTS_DIVISOR,
  getTokenInfo,
  SWAP,
  LONG,
  SHORT,
  getConnectWalletHandler,
  fetcher,
  expandDecimals,
  getPositionKey,
  getLeverage,
  useLocalStorageSerializeKey,
  getDeltaStr,
  useChainId,
  getInfoTokens,
  useOrders
} from './Helpers'
import { getConstant } from './Constants'
import { approvePlugin } from './Api'

import { getContract } from './Addresses'
import { getTokens, getToken, getWhitelistedTokens, getTokenBySymbol } from './data/Tokens'

import Reader from './abis/ReaderV2.json'
import VaultV2 from './abis/VaultV2.json'
import Token from './abis/Token.json'
import Router from './abis/Router.json'

import SwapBox from './components/Exchange/SwapBox'
import ExchangeTVChart from './components/Exchange/ExchangeTVChart'
import PositionsList from './components/Exchange/PositionsList'
import OrdersList from './components/Exchange/OrdersList'
import TradeHistory from './components/Exchange/TradeHistory'
import ExchangeWalletTokens from './components/Exchange/ExchangeWalletTokens'
import Tab from './components/Tab/Tab'
import Footer from "./Footer"

import './Exchange.css';

const { AddressZero } = ethers.constants

const getTokenAddress = (token, nativeTokenAddress) => {
  if (token.address === AddressZero) {
    return nativeTokenAddress
  }
  return token.address
}

export function getPositions(chainId, positionQuery, positionData, infoTokens, includeDelta) {
  const propsLength = getConstant(chainId, "positionReaderPropsLength")
  const positions = []
  const positionsMap = {}
  if (!positionData) {
    return { positions, positionsMap }
  }
  const { collateralTokens, indexTokens, isLong } = positionQuery
  for (let i = 0; i < collateralTokens.length; i++) {
    const collateralToken = getTokenInfo(infoTokens, collateralTokens[i], true, getContract(chainId, "NATIVE_TOKEN"))
    const indexToken = getTokenInfo(infoTokens, indexTokens[i], true, getContract(chainId, "NATIVE_TOKEN"))
    const key = getPositionKey(collateralTokens[i], indexTokens[i], isLong[i])

    const position = {
      key,
      collateralToken,
      indexToken,
      isLong: isLong[i],
      size: positionData[i * propsLength],
      collateral: positionData[i * propsLength + 1],
      averagePrice: positionData[i * propsLength + 2],
      entryFundingRate: positionData[i * propsLength + 3],
      cumulativeFundingRate: collateralToken.cumulativeFundingRate,
      hasRealisedProfit: positionData[i * propsLength + 4].eq(1),
      realisedPnl: positionData[i * propsLength + 5],
      lastIncreasedTime: positionData[i * propsLength + 6].toNumber(),
      hasProfit: positionData[i * propsLength + 7].eq(1),
      delta: positionData[i * propsLength + 8],
      markPrice: isLong[i] ? indexToken.minPrice : indexToken.maxPrice
    }

    position.pendingDelta = position.delta
    if (position.collateral.gt(0)) {
      if (position.delta.eq(0) && position.averagePrice && position.markPrice) {
        const priceDelta = position.averagePrice.gt(position.markPrice) ? position.averagePrice.sub(position.markPrice) : position.markPrice.sub(position.averagePrice)
        position.pendingDelta = position.size.mul(priceDelta).div(position.averagePrice)
      }
      position.deltaPercentage = position.pendingDelta.mul(BASIS_POINTS_DIVISOR).div(position.collateral)

      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: position.pendingDelta,
        deltaPercentage: position.deltaPercentage,
        hasProfit: position.hasProfit
      })

      position.deltaStr = deltaStr
      position.deltaPercentageStr = deltaPercentageStr

      position.netValue = position.hasProfit ? position.collateral.add(position.pendingDelta) : position.collateral.sub(position.pendingDelta)
    }

    position.leverage = getLeverage({
      size: position.size,
      collateral: position.collateral,
      entryFundingRate: position.entryFundingRate,
      cumulativeFundingRate: position.cumulativeFundingRate,
      hasProfit: position.hasProfit,
      delta: position.delta,
      includeDelta
    })

    positionsMap[key] = position

    if (position.size.gt(0)) {
      positions.push(position)
    }
  }

  return { positions, positionsMap }
}

export function getPositionQuery(tokens, nativeTokenAddress) {
  const collateralTokens = []
  const indexTokens = []
  const isLong = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.isStable) { continue }
    if (token.isWrapped) { continue }
    collateralTokens.push(getTokenAddress(token, nativeTokenAddress))
    indexTokens.push(getTokenAddress(token, nativeTokenAddress))
    isLong.push(true)
  }

  for (let i = 0; i < tokens.length; i++) {
    const stableToken = tokens[i]
    if (!stableToken.isStable) { continue }

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j]
      if (token.isStable) { continue }
      if (token.isWrapped) { continue }
      collateralTokens.push(stableToken.address)
      indexTokens.push(getTokenAddress(token, nativeTokenAddress))
      isLong.push(false)
    }
  }

  return { collateralTokens, indexTokens, isLong }
}

export default function Exchange({ savedIsPnlInLeverage, setSavedIsPnlInLeverage, savedSlippageAmount, pendingTxns, setPendingTxns, savedShouldShowOrderLines }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { activate, active, account, library } = useWeb3React()
  const { chainId } = useChainId()

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")

  const vaultAddress = getContract(chainId, "Vault")
  const readerAddress = getContract(chainId, "Reader")
  const usdgAddress = getContract(chainId, "USDG")

  const whitelistedTokens = getWhitelistedTokens(chainId)
  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)

  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress)

  const defaultCollateralSymbol = getConstant(chainId, "defaultCollateralSymbol")
  const defaultTokenSelection = useMemo(() => ({
    [SWAP]: {
      from: getTokenBySymbol(chainId, "ETH").address,
      to: getTokenBySymbol(chainId, "USDC").address,
    },
    [LONG]: {
      from: getTokenBySymbol(chainId, "ETH").address,
      to: getTokenBySymbol(chainId, "ETH").address,
    },
    [SHORT]: {
      from: getTokenBySymbol(chainId, defaultCollateralSymbol).address,
      to: getTokenBySymbol(chainId, "ETH").address,
    }
  }), [chainId, defaultCollateralSymbol])

  const [tokenSelection, setTokenSelection] = useLocalStorageSerializeKey([chainId, "Exchange-token-selection"], defaultTokenSelection)
  const [swapOption, setSwapOption] = useLocalStorageSerializeKey([chainId, 'Swap-option'], LONG)

  const fromTokenAddress = tokenSelection[swapOption].from
  const toTokenAddress = tokenSelection[swapOption].to

  const setFromTokenAddress = useCallback(address => {
    setTokenSelection(tokenSelection => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
      newTokenSelection[swapOption].from = address
    })
  }, [swapOption, setTokenSelection])

  const setToTokenAddress = useCallback(address => {
    setTokenSelection(tokenSelection => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
      newTokenSelection[swapOption].to = address
    })
  }, [swapOption, setTokenSelection])

  const [isConfirming, setIsConfirming] = useState(false);
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);

  const connectWallet = getConnectWalletHandler(activate)

  const tokens = getTokens(chainId)
  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([active, chainId, readerAddress, "getFullVaultTokenInfo"], {
    fetcher: fetcher(library, Reader, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const tokenAddresses = tokens.map(token => token.address)
  const { data: tokenBalances, mutate: updateTokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: fetcher(library, Reader, [tokenAddresses]),
  })

  const { data: positionData, mutate: updatePositionData } = useSWR(active && [active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: fetcher(library, Reader, [positionQuery.collateralTokens, positionQuery.indexTokens, positionQuery.isLong]),
  })

  const { data: fundingRateInfo, mutate: updateFundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: fetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  })

  const { data: totalTokenWeights, mutate: updateTotalTokenWeights } = useSWR([`Exchange:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"], {
    fetcher: fetcher(library, VaultV2),
  })

  const { data: usdgSupply, mutate: updateUsdgSupply } = useSWR([`Exchange:usdgSupply:${active}`, chainId, usdgAddress, "totalSupply"], {
    fetcher: fetcher(library, Token),
  })

  const orderBookAddress = getContract(chainId, "OrderBook")
  const routerAddress = getContract(chainId, "Router")
  const { data: orderBookApproved, mutate: updateOrderBookApproved } = useSWR(active && [active, chainId, routerAddress, "approvedPlugins", account, orderBookAddress], {
    fetcher: fetcher(library, Router)
  });

  useEffect(() => {
    if (active) {
      function onBlock() {
        updateVaultTokenInfo(undefined, true)
        updateTokenBalances(undefined, true)
        updatePositionData(undefined, true)
        updateFundingRateInfo(undefined, true)
        updateTotalTokenWeights(undefined, true)
        updateUsdgSupply(undefined, true)
        updateOrderBookApproved(undefined, true)
      }
      library.on('block', onBlock)
      return () => {
        library.removeListener('block', onBlock)
      }
    }
  }, [active, library, chainId,
      updateVaultTokenInfo, updateTokenBalances, updatePositionData,
      updateFundingRateInfo, updateTotalTokenWeights, updateUsdgSupply,
      updateOrderBookApproved])

  const infoTokens = getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo)
  const { positions, positionsMap } = getPositions(chainId, positionQuery, positionData, infoTokens, savedIsPnlInLeverage)

  const [flagOrdersEnabled] = useLocalStorageSerializeKey(
    [chainId, "Flag-orders-enabled"],
    getConstant(chainId, "defaultFlagOrdersEnabled") || document.location.hostname.includes("deploy-preview") || document.location.hostname === "localhost"
  );
  const [orders, updateOrders] = useOrders(flagOrdersEnabled)

  const [isWaitingForPluginApproval, setIsWaitingForPluginApproval] = useState(false);
  const [isPluginApproving, setIsPluginApproving] = useState(false);

  const approveOrderBook = () => {
    setIsPluginApproving(true)
    approvePlugin(chainId, orderBookAddress, {
      library,
      pendingTxns,
      setPendingTxns
    }).then(() => {
      setIsWaitingForPluginApproval(true)
      updateOrderBookApproved(undefined, true);
    }).finally(() => {
      setIsPluginApproving(false)
    })
  }

  const LIST_SECTIONS = [
    'Positions',
    flagOrdersEnabled ? 'Orders' : undefined,
    'Trades'
  ].filter(Boolean)
  let [listSection, setListSection] = useLocalStorageSerializeKey([chainId, 'List-section'], LIST_SECTIONS[0]);
  const LIST_SECTIONS_LABELS = {
    "Orders": orders.length ? `Orders (${orders.length})` : undefined
  }
  if (!LIST_SECTIONS.includes(listSection)) {
    listSection = LIST_SECTIONS[0]
  }

  if (!getToken(chainId, toTokenAddress)) {
    return null
  }

  const getListSection = () => {
    return (
      <div>
        <Tab
          options={LIST_SECTIONS}
          optionLabels={LIST_SECTIONS_LABELS}
          option={listSection}
          onChange={section => setListSection(section)}
          type="inline"
          className="Exchange-list-tabs"
        />
        {listSection === 'Positions' &&
          <PositionsList
            setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
            approveOrderBook={approveOrderBook}
            isPluginApproving={isPluginApproving}
            isWaitingForPluginApproval={isWaitingForPluginApproval}
            updateOrderBookApproved={updateOrderBookApproved}
            orderBookApproved={orderBookApproved}
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            account={account}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            flagOrdersEnabled={flagOrdersEnabled}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
            orders={orders}
          />
        }
        {listSection === 'Orders' &&
          <OrdersList
            active={active}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            infoTokens={infoTokens}
            positionsMap={positionsMap}
            chainId={chainId}
            orders={orders}
            updateOrders={updateOrders}
            totalTokenWeights={totalTokenWeights}
            usdgSupply={usdgSupply}
          />
        }
        {listSection === 'Trades' &&
          <TradeHistory
            account={account}
            infoTokens={infoTokens}
            getTokenInfo={getTokenInfo}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
          />
        }
      </div>
    )
  }

  const onSelectWalletToken = (token) => {
    setFromTokenAddress(token.address)
  }

  const renderChart = () => {
    return <ExchangeTVChart
      fromTokenAddress={fromTokenAddress}
      toTokenAddress={toTokenAddress}
      infoTokens={infoTokens}
      swapOption={swapOption}
      flagOrdersEnabled={flagOrdersEnabled}
      chainId={chainId}
      savedShouldShowOrderLines={savedShouldShowOrderLines}
    />
  }

  return (
    <div className="Exchange">
      <div className="Exchange-content">
        <div className="Exchange-left">
          {renderChart()}
          <div className="Exchange-lists large">
            {getListSection()}
          </div>
        </div>
        <div className="Exchange-right">
          <SwapBox
            setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
            approveOrderBook={approveOrderBook}
            isPluginApproving={isPluginApproving}
            isWaitingForPluginApproval={isWaitingForPluginApproval}
            updateOrderBookApproved={updateOrderBookApproved}
            orderBookApproved={orderBookApproved}
            orders={orders}
            flagOrdersEnabled={flagOrdersEnabled}
            chainId={chainId}
            infoTokens={infoTokens}
            active={active}
            connectWallet={connectWallet}
            library={library}
            account={account}
            positionsMap={positionsMap}
            fromTokenAddress={fromTokenAddress}
            setFromTokenAddress={setFromTokenAddress}
            toTokenAddress={toTokenAddress}
            setToTokenAddress={setToTokenAddress}
            swapOption={swapOption}
            setSwapOption={setSwapOption}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            tokenSelection={tokenSelection}
            setTokenSelection={setTokenSelection}
            isConfirming={isConfirming}
            setIsConfirming={setIsConfirming}
            isPendingConfirmation={isPendingConfirmation}
            setIsPendingConfirmation={setIsPendingConfirmation}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
            nativeTokenAddress={nativeTokenAddress}
            savedSlippageAmount={savedSlippageAmount}
            totalTokenWeights={totalTokenWeights}
            usdgSupply={usdgSupply}
          />
          <div className="Exchange-wallet-tokens">
            <div className="Exchange-wallet-tokens-content">
              <ExchangeWalletTokens
                tokens={tokens}
                infoTokens={infoTokens}
                onSelectToken={onSelectWalletToken}
              />
            </div>
          </div>
        </div>
        <div className="Exchange-lists small">
          {getListSection()}
        </div>
      </div>
      <Footer />
    </div>
  )
}
