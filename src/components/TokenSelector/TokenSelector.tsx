import React, { useState, useEffect, ReactNode } from "react";
import cx from "classnames";

import { BiChevronDown } from "react-icons/bi";

import Modal from "../Modal/Modal";

import dropDownIcon from "img/DROP_DOWN.svg";
import searchIcon from "img/search.svg";
import "./TokenSelector.css";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import { bigNumberify, expandDecimals, formatAmount } from "lib/numbers";
import { getToken } from "config/tokens";
import { importImage } from "lib/legacy";
import { t } from "@lingui/macro";
import { useMedia } from "react-use";
import { InfoTokens, Token, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";

type TokenState = {
  disabled?: boolean;
  message?: string;
};

type Props = {
  chainId: number;
  label?: string;
  className?: string;
  tokenAddress: string;
  tokens: Token[];
  infoTokens?: InfoTokens;
  showMintingCap?: boolean;
  mintingCap?: BigNumber;
  disabled?: boolean;
  selectedTokenLabel?: ReactNode | string;
  showBalances?: boolean;
  showTokenImgInDropdown?: boolean;
  showSymbolImage?: boolean;
  showNewCaret?: boolean;
  getTokenState?: (info: TokenInfo) => TokenState | undefined;
  disableBodyScrollLock?: boolean;
  onSelectToken: (token: Token) => void;
};

export default function TokenSelector(props: Props) {
  const isSmallerScreen = useMedia("(max-width: 700px)");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let tokenInfo: TokenInfo | undefined;

  try {
    tokenInfo = getToken(props.chainId, props.tokenAddress);
  } catch (e) {
    // ...ignore unsupported tokens
  }

  const {
    tokens,
    mintingCap,
    infoTokens,
    showMintingCap,
    disabled,
    selectedTokenLabel,
    showBalances = true,
    showTokenImgInDropdown = false,
    showSymbolImage = false,
    showNewCaret = false,
    getTokenState = () => ({ disabled: false, message: null }),
  } = props;

  const visibleTokens = tokens.filter((t) => t && !t.isTempHidden);

  const onSelectToken = (token) => {
    setIsModalVisible(false);
    props.onSelectToken(token);
  };

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible]);

  if (!tokenInfo) {
    return null;
  }

  const tokenImage = showSymbolImage ? importImage(`ic_${tokenInfo.symbol.toLowerCase()}_24.svg`) : undefined;

  const onSearchKeywordChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  const filteredTokens = visibleTokens.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      onSelectToken(filteredTokens[0]);
    }
  };

  return (
    <div className={cx("TokenSelector", { disabled }, props.className)} onClick={(event) => event.stopPropagation()}>
      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={props.label}
        headerContent={() => (
          <div className="TokenSelector-token-row TokenSelector-token-input-row">
            <input
              type="text"
              placeholder={t`Search Token`}
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e)}
              onKeyDown={_handleKeyDown}
              autoFocus={!isSmallerScreen}
              className="Tokenselector-search-input"
              style={{
                backgroundImage: `url(${searchIcon})`,
              }}
            />
          </div>
        )}
      >
        <div className="TokenSelector-tokens">
          {filteredTokens.map((token, tokenIndex) => {
            const tokenPopupImage = importImage(`ic_${token.symbol.toLowerCase()}_40.svg`);
            let info = infoTokens?.[token.address] || ({} as TokenInfo);

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
              balanceUsd = balance.mul(info.maxPrice).div(expandDecimals(1, token.decimals));
            }

            const tokenState = getTokenState(info) || {};

            return (
              <div
                key={token.address}
                className={cx("TokenSelector-token-row", { disabled: tokenState.disabled })}
                onClick={() => !tokenState.disabled && onSelectToken(token)}
              >
                {tokenState.disabled && tokenState.message && (
                  <TooltipWithPortal
                    className="TokenSelector-tooltip"
                    handle={<div className="TokenSelector-tooltip-backing" />}
                    position={tokenIndex < filteredTokens.length / 2 ? "center-bottom" : "center-top"}
                    disableHandleStyle
                    closeOnDoubleClick
                    fitHandleWidth
                    renderContent={() => tokenState.message}
                  />
                )}
                <div className="Token-info">
                  {showTokenImgInDropdown && <img src={tokenPopupImage} alt={token.name} className="token-logo" />}
                  <div className="Token-symbol">
                    <div className="Token-text">{token.symbol}</div>
                    <span className="text-accent">{token.name}</span>
                  </div>
                </div>
                <div className="Token-balance">
                  {showBalances && balance && (
                    <div className="Token-text">
                      {balance.gt(0) && formatAmount(balance, token.decimals, 4, true)}
                      {balance.eq(0) && "-"}
                    </div>
                  )}
                  <span className="text-accent">
                    {mintAmount && <div>Mintable: {formatAmount(mintAmount, token.decimals, 2, true)} USDG</div>}
                    {showMintingCap && !mintAmount && <div>-</div>}
                    {!showMintingCap && showBalances && balanceUsd && balanceUsd.gt(0) && (
                      <div>${formatAmount(balanceUsd, 30, 2, true)}</div>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      {selectedTokenLabel ? (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {selectedTokenLabel}
          {!showNewCaret && <BiChevronDown className="TokenSelector-caret" />}
        </div>
      ) : (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {tokenInfo.symbol}
          {showSymbolImage && <img src={tokenImage} alt={tokenInfo.symbol} className="TokenSelector-box-symbol" />}
          {showNewCaret && <img src={dropDownIcon} alt="Dropdown Icon" className="TokenSelector-box-caret" />}
          {!showNewCaret && <BiChevronDown className="TokenSelector-caret" />}
        </div>
      )}
    </div>
  );
}
