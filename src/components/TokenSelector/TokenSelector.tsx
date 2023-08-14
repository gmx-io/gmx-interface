import React, { useState, useEffect, ReactNode, useMemo } from "react";
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
import { convertToUsd } from "domain/synthetics/tokens";

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
  extendedSortSequence?: string[] | undefined;
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
    extendedSortSequence,
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

  const onSearchKeywordChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  const filteredTokens = visibleTokens.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const sortedFilteredTokens = useMemo(() => {
    const tokensWithBalance: Token[] = [];
    const tokensWithoutBalance: Token[] = showBalances ? [] : filteredTokens;

    for (const token of filteredTokens) {
      const info = infoTokens?.[token.address];
      if (showBalances) {
        if (info?.balance?.gt(0)) {
          tokensWithBalance.push(token);
        } else {
          tokensWithoutBalance.push(token);
        }
      }
    }

    const sortedTokensWithBalance = tokensWithBalance.sort((a, b) => {
      const aInfo = infoTokens?.[a.address];
      const bInfo = infoTokens?.[b.address];

      if (!aInfo || !bInfo) return 0;

      if (aInfo?.balance && bInfo?.balance && aInfo?.maxPrice && bInfo?.maxPrice) {
        const aBalanceUsd = convertToUsd(aInfo.balance, a.decimals, aInfo.minPrice);
        const bBalanceUsd = convertToUsd(bInfo.balance, b.decimals, bInfo.minPrice);

        return bBalanceUsd?.sub(aBalanceUsd || 0).gt(0) ? 1 : -1;
      }
      return 0;
    });

    const sortedTokensWithoutBalance = tokensWithoutBalance.sort((a, b) => {
      const aInfo = infoTokens?.[a.address];
      const bInfo = infoTokens?.[b.address];

      if (!aInfo || !bInfo) return 0;

      if (extendedSortSequence) {
        // making sure to use the wrapped address if it exists in the extended sort sequence
        const aAddress =
          aInfo.wrappedAddress && extendedSortSequence.includes(aInfo.wrappedAddress)
            ? aInfo.wrappedAddress
            : aInfo.address;

        const bAddress =
          bInfo.wrappedAddress && extendedSortSequence.includes(bInfo.wrappedAddress)
            ? bInfo.wrappedAddress
            : bInfo.address;

        return extendedSortSequence.indexOf(aAddress) - extendedSortSequence.indexOf(bAddress);
      }

      return 0;
    });

    return [...sortedTokensWithBalance, ...sortedTokensWithoutBalance];
  }, [filteredTokens, infoTokens, extendedSortSequence, showBalances]);

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredTokens.length > 0) {
      onSelectToken(filteredTokens[0]);
    }
  };

  if (!tokenInfo) {
    return null;
  }

  const tokenImage = showSymbolImage ? importImage(`ic_${tokenInfo.symbol.toLowerCase()}_24.svg`) : undefined;

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
          {sortedFilteredTokens.map((token, tokenIndex) => {
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
