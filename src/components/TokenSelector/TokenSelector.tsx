import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";

import { getMarketUiConfig } from "config/markets";
import { getMarketBadge, getMarketIndexName, getMarketPoolName, MarketsInfoData } from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import type { InfoTokens, Token, TokenInfo } from "domain/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { expandDecimals, formatBalanceAmount, formatBigUsd } from "lib/numbers";
import { searchBy } from "lib/searchBy";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import { WithMissedCoinsSearch } from "../WithMissedCoinsSearch/WithMissedCoinsSearch";

import "./TokenSelector.scss";

type TokenState = {
  disabled?: boolean;
  message?: string;
};

type ExtendedToken = Token & { isMarketToken?: boolean };

type Props = {
  chainId: number;
  label?: string;
  className?: string;
  tokenAddress: string;
  tokens: ExtendedToken[];
  infoTokens?: InfoTokens;
  tokenInfo?: TokenInfo;
  selectedTokenLabel?: ReactNode | string;
  showBalances?: boolean;
  showTokenImgInDropdown?: boolean;
  showSymbolImage?: boolean;
  getTokenState?: (info: TokenInfo) => TokenState | undefined;
  onSelectToken: (token: Token) => void;
  extendedSortSequence?: string[] | undefined;
  missedCoinsPlace?: MissedCoinsPlace;
  showTokenName?: boolean;
  footerContent?: ReactNode;
  marketsInfoData?: MarketsInfoData;
  qa?: string;
  chainIdBadge?: number;
};

export default function TokenSelector(props: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let tokenInfo: TokenInfo | undefined = props.tokenInfo;

  if (!tokenInfo) {
    try {
      tokenInfo = getToken(props.chainId, props.tokenAddress);
    } catch (e) {
      // ...ignore unsupported tokens
    }
  }

  const {
    tokens,
    infoTokens,
    selectedTokenLabel,
    showBalances = true,
    showTokenImgInDropdown = false,
    showSymbolImage = false,
    getTokenState = () => ({ disabled: false, message: null }),
    extendedSortSequence,
    showTokenName,
    footerContent,
    missedCoinsPlace,
    marketsInfoData,
    chainId,
    qa,
    chainIdBadge,
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

  const filteredTokens = useMemo(() => {
    if (!searchKeyword.trim()) {
      return visibleTokens;
    }

    return searchBy(
      visibleTokens,
      [
        (item) => {
          let name = item.name;
          if (item.isMarketToken) {
            const indexTokenAddress = getMarketUiConfig(props.chainId, item.address)?.indexTokenAddress;
            const indexToken = getToken(props.chainId, indexTokenAddress);
            name = indexToken.name ? `GM ${indexToken.name}` : name;
          }
          return stripBlacklistedWords(name);
        },
        "symbol",
      ],
      searchKeyword
    );
  }, [props.chainId, searchKeyword, visibleTokens]);

  const sortedFilteredTokens = useMemo(() => {
    const tokensWithBalance: ExtendedToken[] = [];
    const tokensWithoutBalance: ExtendedToken[] = showBalances ? [] : filteredTokens;

    for (const token of filteredTokens) {
      const info = infoTokens?.[token.address];
      if (showBalances) {
        if (info?.balance && info?.balance > 0) {
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

        if (bBalanceUsd === undefined) return -1;

        return bBalanceUsd - (aBalanceUsd ?? 0n) > 0 ? 1 : -1;
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
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTokens.length > 0) {
        onSelectToken(filteredTokens[0]);
      }
    }
  };

  if (!tokenInfo) {
    return null;
  }

  return (
    <div className={cx("TokenSelector", props.className)} onClick={(event) => event.stopPropagation()}>
      <SlideModal
        qa={qa + "-modal"}
        className="TokenSelector-modal text-typography-primary"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={props.label}
        footerContent={footerContent}
        contentPadding={false}
        headerContent={
          <SearchInput className="mb-16" value={searchKeyword} setValue={setSearchKeyword} onKeyDown={_handleKeyDown} />
        }
      >
        {missedCoinsPlace && (
          <WithMissedCoinsSearch
            searchKeyword={searchKeyword}
            place={missedCoinsPlace}
            isEmpty={!filteredTokens.length}
            isLoaded={Boolean(visibleTokens.length)}
          />
        )}
        <VerticalScrollFadeContainer className="flex grow flex-col gap-8 overflow-y-auto">
          {sortedFilteredTokens.map((token, tokenIndex) => {
            let info = infoTokens?.[token.address] || ({} as TokenInfo);

            let balance = info.balance;

            let balanceUsd: bigint | undefined = undefined;
            if (balance !== undefined && info.maxPrice !== undefined) {
              balanceUsd = bigMath.mulDiv(balance, info.maxPrice, expandDecimals(1, token.decimals));
            }

            const tokenState = getTokenState(info) || {};
            const marketToken = Object.values(marketsInfoData ?? {}).find(
              (market) => market.marketTokenAddress === token.address
            );
            const tokenBadge = token.isMarketToken && marketToken ? getMarketBadge(chainId, marketToken) : undefined;

            return (
              <div
                key={token.address}
                data-qa={`${qa}-token-${token.symbol}`}
                className={cx(
                  "text-body-medium flex w-full cursor-pointer items-center justify-between px-adaptive py-8 hover:bg-slate-800",
                  { disabled: tokenState.disabled }
                )}
                onClick={() => !tokenState.disabled && onSelectToken(token)}
              >
                {tokenState.disabled && tokenState.message && (
                  <TooltipWithPortal
                    className="TokenSelector-tooltip"
                    handle={<div className="TokenSelector-tooltip-backing" />}
                    position={tokenIndex < filteredTokens.length / 2 ? "bottom" : "top"}
                    variant="none"
                    closeOnDoubleClick
                    fitHandleWidth
                    renderContent={() => tokenState.message}
                  />
                )}
                <div className="Token-info">
                  {showTokenImgInDropdown && (
                    <TokenIcon symbol={token.symbol} displaySize={40} importSize={40} badge={tokenBadge} />
                  )}
                  <div className="items ml-16 flex gap-4">
                    <div>
                      {token.isMarketToken && marketToken ? `GM: ${getMarketIndexName(marketToken)}` : token.symbol}
                    </div>
                    {marketToken && <span className="text-accent">[{getMarketPoolName(marketToken)}]</span>}
                  </div>
                </div>
                <div className="text-body-large flex flex-col items-end gap-2">
                  {(showBalances && balance !== undefined && (
                    <div>
                      {balance > 0 &&
                        formatBalanceAmount(balance, token.decimals, undefined, { isStable: token.isStable })}
                      {balance == 0n && "-"}
                    </div>
                  )) ||
                    null}
                  <span className="text-body-small text-typography-secondary">
                    {showBalances &&
                      balanceUsd !== undefined &&
                      balanceUsd > 0 &&
                      formatBigUsd(balanceUsd, { displayDecimals: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
          {sortedFilteredTokens.length === 0 && (
            <div className="p-adaptive text-16 text-typography-secondary">
              <Trans>No tokens matched</Trans>
            </div>
          )}
        </VerticalScrollFadeContainer>
      </SlideModal>
      <div
        data-qa={qa}
        className="group/hoverable group flex cursor-pointer items-center gap-5 whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {selectedTokenLabel || (
          <span className="inline-flex items-center">
            {showSymbolImage && (
              <TokenIcon
                className="mr-4"
                symbol={tokenInfo.symbol}
                importSize={24}
                displaySize={20}
                chainIdBadge={chainIdBadge}
              />
            )}
            {showTokenName ? tokenInfo.name : tokenInfo.symbol}
          </span>
        )}
        <FaChevronDown className="w-12 text-typography-secondary group-hover:text-blue-300" />
      </div>
    </div>
  );
}
