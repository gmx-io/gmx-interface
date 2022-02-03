import React, { useState } from "react";
import cx from "classnames";

import { formatAmount, expandDecimals, bigNumberify } from "../../Helpers";

import { getToken } from "../../data/Tokens";

import { BiChevronDown } from "react-icons/bi";

import Modal from "../Modal/Modal";

import "./TokenSelector.css";

export default function TokenSelector(props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const tokenInfo = getToken(props.chainId, props.tokenAddress);
  const { tokens, mintingCap, infoTokens, showMintingCap, disabled } = props;

  const onSelectToken = token => {
    setIsModalVisible(false);
    props.onSelectToken(token);
  };

  if (!tokenInfo) {
    return null;
  }

  return (
    <div className={cx("TokenSelector", { disabled }, props.className)}>
      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={props.label}
      >
        <div className="TokenSelector-tokens">
          {tokens.map(token => {
            let info = infoTokens ? infoTokens[token.address] : {};
            let mintAmount;
            let balance = info.balance;
            if (showMintingCap && mintingCap && info.usdgAmount) {
              mintAmount = mintingCap.sub(info.usdgAmount);
            }
            if (mintAmount && mintAmount.lt(0)) {
              mintAmount = bigNumberify(0);
            }
            let balanceUsd;
            if (balance && info.maxPrice) {
              balanceUsd = balance
                .mul(info.maxPrice)
                .div(expandDecimals(1, token.decimals));
            }
            return (
              <div
                className="TokenSelector-token-row"
                onClick={() => onSelectToken(token)}
                key={token.address}
              >
                <div className="Token-info">
                  <img
                    src={
                      `/images/icons/ic_${token.symbol?.toLowerCase()}_lg.svg` ||
                      token.imageUrl
                    }
                    alt=""
                    className="token-logo"
                  />
                  <div className="Token-symbol">
                    <div className="Token-text">{token.symbol}</div>
                    <span className="text-accent">{token.name}</span>
                  </div>
                </div>
                <div className="Token-balance">
                  {balance && (
                    <div className="Token-text">
                      {balance.gt(0) &&
                        formatAmount(balance, token.decimals, 4, true)}
                      {balance.eq(0) && "-"}
                    </div>
                  )}
                  <span className="text-accent">
                    {mintAmount && (
                      <div>
                        Mintable:{" "}
                        {formatAmount(mintAmount, token.decimals, 2, true)} USDG
                      </div>
                    )}
                    {showMintingCap && !mintAmount && <div>-</div>}
                    {!showMintingCap && balanceUsd && balanceUsd.gt(0) && (
                      <div>${formatAmount(balanceUsd, 30, 2, true)}</div>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <div
        className="TokenSelector-box"
        onClick={() => setIsModalVisible(true)}
      >
        {tokenInfo.symbol}
        <BiChevronDown className="TokenSelector-caret" />
      </div>
    </div>
  );
}
