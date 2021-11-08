import React, { useEffect } from 'react'
import useSWR from 'swr'
import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import { useParams } from 'react-router-dom'

import './style.css';

import { getContract } from '../../Addresses'
import {
  formatAmount,
  expandDecimals,
  fetcher,
  getInfoTokens,
  getTokenInfo,
  getServerBaseUrl,
  useAccountOrders
} from '../../Helpers'
import { getToken, getTokens, getWhitelistedTokens } from '../../data/Tokens'
import { getPositions, getPositionQuery } from '../Exchange'
import PositionsList from '../../components/Exchange/PositionsList'
import OrdersList from '../../components/Exchange/OrdersList'

import TradeHistory from '../../components/Exchange/TradeHistory'
import Reader from '../../abis/Reader.json'
import ReaderV2 from '../../abis/ReaderV2.json'

const USD_DECIMALS = 30

export default function Actions() {
  const { account } = useParams()
  const { active, library } = useWeb3React()

  const chainId = 42161
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const vaultAddress = getContract(chainId, "Vault")
  const readerAddress = getContract(chainId, "Reader")

  const shouldShowPnl = false

  let checkSummedAccount = ""
  if (ethers.utils.isAddress(account)) {
    checkSummedAccount = ethers.utils.getAddress(account)
  }
  const pnlUrl = `${getServerBaseUrl(chainId)}/pnl?account=${checkSummedAccount}`
  const { data: pnlData, mutate: updatePnlData } = useSWR([pnlUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const tokens = getTokens(chainId)
  const whitelistedTokens = getWhitelistedTokens(chainId)
  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress)

  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)
  const tokenAddresses = tokens.map(token => token.address)
  const { data: tokenBalances, mutate: updateTokenBalances } = useSWR([active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: fetcher(library, Reader, [tokenAddresses]),
  })

  const { data: positionData, mutate: updatePositionData } = useSWR([active, chainId, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: fetcher(library, Reader, [positionQuery.collateralTokens, positionQuery.indexTokens, positionQuery.isLong]),
  })

  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([active, chainId, readerAddress, "getFullVaultTokenInfo"], {
    fetcher: fetcher(library, ReaderV2, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const { data: fundingRateInfo, mutate: updateFundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: fetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  })

  const infoTokens = getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo)
  const { positions, positionsMap } = getPositions(chainId, positionQuery, positionData, infoTokens, false)

  const flagOrdersEnabled = true
  const [orders, updateOrders] = useAccountOrders(flagOrdersEnabled, checkSummedAccount)

  useEffect(() => {
    const interval = setInterval(() => {
      updatePnlData(undefined, true)
      updateTokenBalances(undefined, true)
      updatePositionData(undefined, true)
      updateVaultTokenInfo(undefined, true)
      updateFundingRateInfo(undefined, true)
    }, 10 * 1000)
    return () => clearInterval(interval);
  }, [updatePnlData, updateTokenBalances, updatePositionData,
      updateVaultTokenInfo, updateFundingRateInfo])

  return(
    <div className="Actions">
      {checkSummedAccount.length > 0 && <div className="Actions-section">
        Account: {checkSummedAccount}
      </div>}
      {shouldShowPnl && <div className="Actions-section">
        <div className="Actions-title">PnL</div>
        {(!pnlData || pnlData.length === 0) && <div>No PnLs found</div>}
        {(pnlData && pnlData.length > 0) && pnlData.map((pnlRow, index) => {
          const token = getToken(chainId, pnlRow.data.indexToken)
          return (
            <div className="TradeHistory-row App-box App-box-border" key={index}>
              <div>{token.symbol} {pnlRow.data.isLong ? "Long" : "Short"} Profit: {formatAmount(pnlRow.data.profit, USD_DECIMALS, 2, true)} USD</div>
              <div>{token.symbol} {pnlRow.data.isLong ? "Long" : "Short"} Loss: {formatAmount(pnlRow.data.loss, USD_DECIMALS, 2, true)} USD</div>
            </div>
          )
        })}
      </div>}
      {checkSummedAccount.length > 0 && <div className="Actions-section">
        <div className="Actions-title">Positions</div>
          <PositionsList
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            account={checkSummedAccount}
            library={library}
            flagOrdersEnabled={false}
            savedIsPnlInLeverage={false}
            chainId={chainId}
            orders={orders}
            nativeTokenAddress={nativeTokenAddress}
          />
      </div>}
      {flagOrdersEnabled && <div className="Actions-section">
        <div className="Actions-title">Orders</div>
        <OrdersList
          account={checkSummedAccount}
          infoTokens={infoTokens}
          positionsMap={positionsMap}
          chainId={chainId}
          orders={orders}
          updateOrders={updateOrders}
          hideActions
        />
      </div>
      }
      <div className="Actions-section">
        <div className="Actions-title">Actions</div>
        <TradeHistory
          account={checkSummedAccount}
          infoTokens={infoTokens}
          getTokenInfo={getTokenInfo}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
        />
      </div>
    </div>
  )
}
