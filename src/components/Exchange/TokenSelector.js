import React, { useState } from 'react'
import cx from "classnames";

import { formatAmount, expandDecimals, bigNumberify } from "../../Helpers"

import { getToken } from '../../data/Tokens'

import { BiChevronDown } from 'react-icons/bi'

import Modal from '../Modal/Modal'

import './TokenSelector.css';

export default function TokenSelector(props) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const tokenInfo = getToken(props.chainId, props.tokenAddress)
  const { tokens, mintingCap, infoTokens, showMintingCap, disabled } = props

  const onSelectToken = (token) => {
    setIsModalVisible(false)
    props.onSelectToken(token)
  }

  if (!tokenInfo) {
    return null
  }

  return (
    <div className={cx("TokenSelector", { disabled }, props.className)}>
      <Modal isVisible={isModalVisible} setIsVisible={setIsModalVisible} label={props.label}>
        <div className="TokenSelector-tokens">
          {tokens.map(token => {
            let info = infoTokens ? infoTokens[token.address] : {}
            let mintAmount
            let balance = info.balance
            if (showMintingCap && mintingCap && info.usdgAmount) {
              mintAmount = mintingCap.sub(info.usdgAmount)
            }
            if (mintAmount && mintAmount.lt(0)) {
              mintAmount = bigNumberify(0)
            }
            let balanceUsd
            if (balance && info.maxPrice) {
              balanceUsd = balance.mul(info.maxPrice).div(expandDecimals(1, token.decimals))
            }
            return (
              <div className="TokenSelector-token-row" onClick={() => onSelectToken(token)} key={token.address}>
                <div  className="TokenSelector-top-row">
                  <div>
                    {token.symbol}
                  </div>
                  {balance && <div className="align-right">
                    {balance.gt(0) && formatAmount(balance, token.decimals, 4, true)}
                    {balance.eq(0) && "-"}
                  </div>}
                </div>
                <div className="TokenSelector-content-row">
                  <div className="TokenSelector-token-name">
                    {token.name}
                  </div>
                  {mintAmount && <div className="align-right">
                    Mintable: {formatAmount(mintAmount, token.decimals, 2, true)} USDG
                  </div>}
                  {(showMintingCap && !mintAmount) && <div className="align-right">-</div>}
                  {(!showMintingCap && balanceUsd && balanceUsd.gt(0)) && <div className="align-right">
                    ${formatAmount(balanceUsd, 30, 2, true)}
                  </div>}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>
      <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
        {tokenInfo.symbol}
        <BiChevronDown className="TokenSelector-caret" />
      </div>
    </div>
  )
}
