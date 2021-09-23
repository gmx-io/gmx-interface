import React, { useEffect, useState, useMemo, useCallback } from 'react'

import { toast } from 'react-toastify'
import { useWeb3React } from '@web3-react/core'
import cx from "classnames";
import useSWR from 'swr'
import { ethers } from 'ethers'

import {
  BASIS_POINTS_DIVISOR,
  USD_DECIMALS,
  getTokenInfo,
  SWAP,
  LONG,
  SHORT,
  getConnectWalletHandler,
  fetcher,
  formatAmount,
  expandDecimals,
  usePrevious,
  getExplorerUrl,
  getPositionKey,
  getUsd,
  getLiquidationPrice,
  getLeverage,
  useLocalStorageSerializeKey,
  getDeltaStr,
  useChainId,
  getInfoTokens,
  useOrders
} from './Helpers'
import { getConstant } from './Constants'

import { getContract } from './Addresses'
import { getTokens, getToken, getWhitelistedTokens, getTokenBySymbol } from './data/Tokens'

import Reader from './abis/Reader.json'
import VaultV2 from './abis/VaultV2.json'
import Token from './abis/Token.json'

import SwapBox from './components/Exchange/SwapBox'
import ExchangeTVChart from './components/Exchange/ExchangeTVChart'
import PositionSeller from './components/Exchange/PositionSeller'
import OrdersList from './components/Exchange/OrdersList'
import TradeHistory from './components/Exchange/TradeHistory'
import PositionEditor from './components/Exchange/PositionEditor'
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
      // TODO for Gambit we need different indexes
      lastIncreasedTime: positionData[i * propsLength + 6],
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

export function PositionsList(props) {
  const {
    positions,
    positionsMap,
    infoTokens,
    active,
    account,
    library,
    pendingTxns,
    setPendingTxns,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders
  } = props
  const [positionToEditKey, setPositionToEditKey] = useState(undefined)
  const [positionToSellKey, setPositionToSellKey] = useState(undefined)
  const [isPositionEditorVisible, setIsPositionEditorVisible] = useState(undefined)
  const [isPositionSellerVisible, setIsPositionSellerVisible] = useState(undefined)
  const [collateralTokenAddress, setCollateralTokenAddress] = useState(undefined)

  const editPosition = (position) => {
    setCollateralTokenAddress(position.collateralToken.address)
    setPositionToEditKey(position.key)
    setIsPositionEditorVisible(true)
  }

  const sellPosition = (position) => {
    setPositionToSellKey(position.key)
    setIsPositionSellerVisible(true)
  }

  return (
    <div>
      <PositionEditor
        positionsMap={positionsMap}
        positionKey={positionToEditKey}
        isVisible={isPositionEditorVisible}
        setIsVisible={setIsPositionEditorVisible}
        infoTokens={infoTokens}
        active={active}
        account={account}
        library={library}
        collateralTokenAddress={collateralTokenAddress}
        pendingTxns={pendingTxns}
        setPendingTxns={setPendingTxns}
        getLiquidationPrice={getLiquidationPrice}
        getUsd={getUsd}
        getLeverage={getLeverage}
        savedIsPnlInLeverage={savedIsPnlInLeverage}
        chainId={chainId}
      />
      {isPositionSellerVisible &&
        <PositionSeller
          positionsMap={positionsMap}
          positionKey={positionToSellKey}
          isVisible={isPositionSellerVisible}
          setIsVisible={setIsPositionSellerVisible}
          infoTokens={infoTokens}
          active={active}
          account={account}
          orders={orders}
          library={library}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          flagOrdersEnabled={flagOrdersEnabled}
          savedIsPnlInLeverage={savedIsPnlInLeverage}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
        />
      }
      {(positions) && <div className="Exchange-list small">
        <div>
          {positions.length === 0 && (
            <div className="Exchange-empty-positions-list-note App-card">
              No open positions
            </div>
          )}
          {positions.map(position => {
            const liquidationPrice = getLiquidationPrice(position)
            return (<div key={position.key} className="App-card">
              <div className="App-card-title">
                <span className="Exchange-list-title">{position.indexToken.symbol}</span>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Side</div>
                  <div>
                    <span className={cx("Exchange-list-side", { positive: position.isLong, negative: !position.isLong })}>
                      {position.isLong ? "Long" : "Short" }
                    </span>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Size</div>
                  <div>
                     ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">PnL</div>
                  <div>
                    <span className={cx({ positive: position.hasProfit && position.pendingDelta.gt(0), negative: !position.hasProfit && position.pendingDelta.gt(0) })}>
                      {position.deltaStr} ({position.deltaPercentageStr})
                    </span>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Leverage</div>
                  <div>
                     {formatAmount(position.leverage, 4, 2, true)}x
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Collateral</div>
                  <div>
                     ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Entry Price</div>
                  <div>
                    ${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Mark Price</div>
                  <div>
                    ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Liq. Price</div>
                  <div>
                    ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <button className="App-button-option App-card-option" onClick={() => editPosition(position)}>
                  Edit
                </button>
                <button  className="App-button-option App-card-option" onClick={() => sellPosition(position)}>
                  Close
                </button>
              </div>
            </div>)
          })}
        </div>
      </div>}
      <table className="Exchange-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>Position</th>
            <th>Side</th>
            <th>Size</th>
            <th>Collateral</th>
            <th className="Exchange-list-extra-info">Entry Price</th>
            <th className="Exchange-list-extra-info">Mark Price</th>
            <th className="Exchange-list-extra-info">Liq. Price</th>
            <th>PnL</th>
            <th></th>
            <th></th>
          </tr>
        {positions.length === 0 &&
          <tr>
            <td>
              <div className="Exchange-empty-positions-list-note">
                No open positions
              </div>
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td className="Exchange-list-extra-info"></td>
            <td className="Exchange-list-extra-info"></td>
            <td className="Exchange-list-extra-info"></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        }
        {positions.map(position => {
          const liquidationPrice = getLiquidationPrice(position)
          return (
            <tr key={position.key}>
              <td>
                <div className="Exchange-list-title">{position.indexToken.symbol}</div>
                <div className="Exchange-list-leverage-container">
                  <div className="Exchange-list-leverage">
                      {formatAmount(position.leverage, 4, 2, true)}x
                  </div>
                </div>
              </td>
              <td className={cx({ positive: position.isLong, negative: !position.isLong })}>
                {position.isLong ? "Long" : "Short" }
              </td>
              <td>
                ${formatAmount(position.size, USD_DECIMALS, 2, true)}
              </td>
              <td>
                ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
              </td>
              <td className="Exchange-list-extra-info">${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</td>
              <td className="Exchange-list-extra-info">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</td>
              <td className="Exchange-list-extra-info">${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}</td>
              <td className={cx({ positive: position.hasProfit && position.pendingDelta.gt(0), negative: !position.hasProfit && position.pendingDelta.gt(0) })}>
                  {position.deltaStr} ({position.deltaPercentageStr})
              </td>
              <td>
                <button className="Exchange-list-action" onClick={() => editPosition(position)}>
                  Edit
                </button>
              </td>
              <td>
                <button  className="Exchange-list-action" onClick={() => sellPosition(position)}>
                  Close
                </button>
              </td>
            </tr>
          )
        })
        }
        </tbody>
      </table>
    </div>
  )
}

export default function Exchange({ savedIsPnlInLeverage, setSavedIsPnlInLeverage, savedSlippageAmount }) {
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

  const [pendingTxns, setPendingTxns] = useState([])

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

  const prevAccount = usePrevious(account)
  useEffect(() => {
    if (prevAccount !== account) {
      setPendingTxns([])
    }
  }, [prevAccount, account])

  useEffect(() => {
    setPendingTxns([])
  }, [chainId])

  const tokens = getTokens(chainId)
  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([active, chainId, readerAddress, "getVaultTokenInfo"], {
    fetcher: fetcher(library, Reader, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const tokenAddresses = tokens.map(token => token.address)
  const { data: tokenBalances, mutate: updateTokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: fetcher(library, Reader, [tokenAddresses]),
  })

  const usdcToken = getTokenBySymbol(chainId, "USDC")
  const { data: usdcBufferAmount, mutate: updateUsdcBufferAmount } = useSWR(active && [active, chainId, vaultAddress, "bufferAmounts"], {
    fetcher: fetcher(library, VaultV2, [usdcToken.address])
  })
  const bufferAmounts = {
    [usdcToken.address]: usdcBufferAmount
  }

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

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns = []
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i]
        const receipt = await library.getTransactionReceipt(pendingTxn.hash)
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash
            toast.error(
              <div>
              Txn failed. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
              <br/>
              </div>
            )
          }
          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash
            toast.success(
              <div>
              {pendingTxn.message}. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
              <br/>
              </div>
            )
          }
          continue
        }
        updatedPendingTxns.push(pendingTxn)
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns)
      }
    }

    const interval = setInterval(() => {
      checkPendingTxns()
    }, 2 * 1000)
    return () => clearInterval(interval);
  }, [library, pendingTxns, chainId])

  useEffect(() => {
    if (active) {
      function onBlock() {
        updateVaultTokenInfo(undefined, true)
        updateTokenBalances(undefined, true)
        updatePositionData(undefined, true)
        updateFundingRateInfo(undefined, true)
        updateTotalTokenWeights(undefined, true)
        updateUsdgSupply(undefined, true)
        updateUsdcBufferAmount(undefined, true)
      }
      library.on('block', onBlock)
      return () => {
        library.removeListener('block', onBlock)
      }
    }
  }, [active, library, chainId, updateUsdcBufferAmount,
      updateVaultTokenInfo, updateTokenBalances, updatePositionData,
      updateFundingRateInfo, updateTotalTokenWeights, updateUsdgSupply])

  const infoTokens = getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo, undefined, bufferAmounts)
  const { positions, positionsMap } = getPositions(chainId, positionQuery, positionData, infoTokens, savedIsPnlInLeverage)

  const [flagOrdersEnabled] = useLocalStorageSerializeKey(
    [chainId, "Flag-orders-enabled"],
    getConstant(chainId, "defaultFlagOrdersEnabled")
  );
  const [orders, updateOrders] = useOrders(flagOrdersEnabled)

  const LIST_SECTIONS = [
    'Positions',
    flagOrdersEnabled ? 'Orders' : undefined,
    'Trades'
  ].filter(Boolean)
  let [listSection, setListSection] = useLocalStorageSerializeKey([chainId, 'List-section'], LIST_SECTIONS[0]);
  const LIST_SECTIONS_LABELS = {
    'Positions': "Positions",
    'Orders': orders.length ? `Orders (${orders.length})` : undefined
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
            account={account}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            infoTokens={infoTokens}
            positionsMap={positionsMap}
            chainId={chainId}
            orders={orders}
            updateOrders={updateOrders}
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
