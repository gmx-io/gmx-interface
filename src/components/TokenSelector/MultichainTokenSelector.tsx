import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";

import {
  AVALANCHE,
  getChainName,
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  type AnyChainId,
  type ContractsChainId,
  type GmxAccountPseudoChainId,
  type SourceChainId,
} from "config/chains";
import { getSourceChainDecimalsMapped, isSourceChain } from "config/multichain";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import type { TokenChainData } from "domain/multichain/types";
import { getMarketBadge } from "domain/synthetics/markets/utils";
import { convertToUsd } from "domain/synthetics/tokens";
import { TokenBalanceType, Token, TokensData } from "domain/tokens";
import { getMidPrice, stripBlacklistedWords } from "domain/tokens/utils";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { searchBy } from "lib/searchBy";
import {
  getIsSpotOnlyMarket,
  getMarketIndexToken,
  getTokenSymbolByMarket,
  isMarketTokenAddress,
  MARKETS,
} from "sdk/configs/markets";
import { getToken, GM_STUB_ADDRESS } from "sdk/configs/tokens";
import { getMarketIndexName, getMarketPoolName } from "sdk/utils/markets";

import Button from "components/Button/Button";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ArrowDownIcon from "img/ic_arrow_down.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { ConnectWalletModalContent } from "./ConnectWalletModalContent";
import type { DisplayToken } from "./types";

import "./TokenSelector.scss";

type BalanceSource = "gmxAccount" | "wallet";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
  className?: string;

  tokenAddress: string;
  payChainId: AnyChainId | GmxAccountPseudoChainId | undefined;

  tokensData: TokensData | undefined;

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean, srcChainId: SourceChainId | undefined) => void;
  extendedSortSequence?: string[] | undefined;

  footerContent?: ReactNode;
  qa?: string;
  multichainTokens: TokenChainData[] | undefined;
  includeMultichainTokensInPay?: boolean;

  // TODO(FEDEV-3882): no longer used after the GMX Account / Wallet tabs redesign — deposit now goes
  // through the footer "Deposit to GMX Account" button. Kept optional to avoid touching the trade-form
  // call sites (TradeBox/TradeboxMarginFields/MarginField); remove in a dedicated cleanup.
  // eslint-disable-next-line react/no-unused-prop-types
  onDepositTokenAddress?: (tokenAddress: string, chainId: SourceChainId) => void;

  isConnected?: boolean;
  walletIconUrls?: string[];
  openConnectModal?: () => void;
};

export function MultichainTokenSelector({
  chainId,
  srcChainId,
  tokensData,
  extendedSortSequence,
  footerContent,
  qa,
  onSelectTokenAddress: propsOnSelectTokenAddress,
  tokenAddress,
  payChainId,
  className,
  label,
  multichainTokens,
  includeMultichainTokensInPay,
  isConnected,
  walletIconUrls,
  openConnectModal,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  let token: Token | undefined = isMarketTokenAddress(chainId, tokenAddress)
    ? getToken(chainId, GM_STUB_ADDRESS)
    : getToken(chainId, tokenAddress);

  const onSelectTokenAddress = (tokenAddress: string, tokenChainId: AnyChainId | GmxAccountPseudoChainId) => {
    setIsModalVisible(false);
    const isGmxAccount = tokenChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID;
    const tokenSrcChainId =
      tokenChainId !== chainId && tokenChainId !== GMX_ACCOUNT_PSEUDO_CHAIN_ID && isSourceChain(tokenChainId, chainId)
        ? tokenChainId
        : undefined;
    propsOnSelectTokenAddress(tokenAddress, isGmxAccount, tokenSrcChainId);
  };

  const isGmxAccountEmpty = useMemo(() => {
    if (!tokensData) return true;

    const allEmpty = Object.values(tokensData).every(
      (token) => token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n
    );

    return allEmpty;
  }, [tokensData]);

  const [activeFilter, setActiveFilter] = useState<BalanceSource>("gmxAccount");

  const isAvalancheSettlement = chainId === AVALANCHE;

  const availableToTradeTokenList = useAvailableToTradeTokenList({
    srcChainId,
    searchKeyword,
    tokensData,
    extendedSortSequence,
    chainId,
    multichainTokens,
    includeMultichainTokensInPay,
    includeGmxAccountTokens: !isAvalancheSettlement,
  });

  const gmxAccountTokens = useMemo(
    () => availableToTradeTokenList.filter((token) => token.balanceType === TokenBalanceType.GmxAccount),
    [availableToTradeTokenList]
  );
  const walletTokens = useMemo(
    () => availableToTradeTokenList.filter((token) => token.balanceType !== TokenBalanceType.GmxAccount),
    [availableToTradeTokenList]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const activeList = activeFilter === "gmxAccount" ? gmxAccountTokens : walletTokens;
      if (activeList.length > 0) {
        onSelectTokenAddress(activeList[0].address, activeList[0].chainId);
      }
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
      const preferredTab: BalanceSource = payChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID ? "gmxAccount" : "wallet";
      setActiveFilter(isAvalancheSettlement || isGmxAccountEmpty ? "wallet" : preferredTab);
    }
  }, [isAvalancheSettlement, isGmxAccountEmpty, isModalVisible, payChainId, setSearchKeyword]);

  const tabsOptions: TabOption<BalanceSource>[] = useMemo(() => {
    return [
      { value: "gmxAccount", label: <Trans>GMX Account</Trans> },
      { value: "wallet", label: <Trans>Wallet</Trans> },
    ];
  }, []);

  const handleFooterClick = () => {
    setIsModalVisible(false);
    setGmxAccountModalOpen(activeFilter === "gmxAccount" ? "deposit" : "walletReceive");
  };

  const modalFooter =
    isConnected === false ? (
      footerContent
    ) : (
      <Button
        variant="secondary"
        size="medium"
        className="w-full !text-typography-primary"
        onClick={handleFooterClick}
      >
        <ArrowDownIcon className="size-20 text-blue-300" />
        {activeFilter === "gmxAccount" ? <Trans>Deposit to GMX Account</Trans> : <Trans>Deposit to Wallet</Trans>}
      </Button>
    );

  if (!token) {
    return null;
  }

  return (
    <div className={cx("TokenSelector", className)} onClick={(event) => event.stopPropagation()}>
      <SlideModal
        qa={qa + "-modal"}
        className="TokenSelector-modal MultichainTokenSelector-modal text-body-medium"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={modalFooter}
        headerContent={
          isConnected === false ? null : (
            <div>
              <SearchInput
                value={searchKeyword}
                setValue={setSearchKeyword}
                className="mb-16"
                onKeyDown={handleKeyDown}
              />
              {!isAvalancheSettlement && (
                <Tabs
                  type="underline"
                  options={tabsOptions}
                  selectedValue={activeFilter}
                  onChange={setActiveFilter}
                />
              )}
            </div>
          )
        }
        contentPadding={false}
        disableOverflowHandling={isConnected === false}
      >
        {isConnected === false ? (
          <ConnectWalletModalContent openConnectModal={openConnectModal} walletIconUrls={walletIconUrls} />
        ) : (
          <>
            {activeFilter === "gmxAccount" && (
              <AvailableToTradeTokenList
                chainId={chainId}
                onSelectTokenAddress={onSelectTokenAddress}
                tokens={gmxAccountTokens}
                className="py-16"
              />
            )}
            {activeFilter === "wallet" && (
              <AvailableToTradeTokenList
                chainId={chainId}
                onSelectTokenAddress={onSelectTokenAddress}
                tokens={walletTokens}
                className="py-16"
              />
            )}
          </>
        )}
      </SlideModal>
      <div
        data-qa={qa}
        className="group/hoverable group flex cursor-pointer items-center gap-5 whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {!token.isPlatformToken || token.isPlatformTradingToken ? (
          <span className="inline-flex items-center">
            <TokenIcon className="mr-4" symbol={token.symbol} displaySize={20} chainIdBadge={payChainId} />
            {token.symbol}
          </span>
        ) : (
          <span className="inline-flex items-center">
            <TokenIcon
              symbol={getTokenSymbolByMarket(chainId, tokenAddress, "index")}
              className="mr-4"
              displaySize={20}
              chainIdBadge={payChainId}
            />

            {getMarketIndexName({
              indexToken: getMarketIndexToken(chainId, tokenAddress)!,
              isSpotOnly: getIsSpotOnlyMarket(chainId, tokenAddress),
            })}
          </span>
        )}
        <ChevronDownIcon className="w-16 text-typography-secondary group-hover:text-[inherit]" />
      </div>
    </div>
  );
}

function useAvailableToTradeTokenList({
  chainId,
  srcChainId,
  searchKeyword,
  tokensData,
  multichainTokens,
  extendedSortSequence,
  includeMultichainTokensInPay,
  includeSettlementChainTokens = false,
  includeGmxAccountTokens = true,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  searchKeyword: string;
  tokensData: TokensData | undefined;
  multichainTokens: TokenChainData[] | undefined;
  extendedSortSequence?: string[];
  includeMultichainTokensInPay?: boolean;
  includeSettlementChainTokens?: boolean;
  includeGmxAccountTokens?: boolean;
}) {
  return useMemo(() => {
    const concatenatedTokens: DisplayToken[] = [];

    for (const token of Object.values(tokensData ?? (EMPTY_OBJECT as TokensData))) {
      if (includeGmxAccountTokens) {
        if (token.gmxAccountBalance !== undefined && (srcChainId !== undefined || token.gmxAccountBalance > 0n)) {
          const balanceUsd = convertToUsd(token.gmxAccountBalance, token.decimals, token.prices.maxPrice) ?? 0n;
          concatenatedTokens.push({
            ...token,
            balanceType: TokenBalanceType.GmxAccount,
            chainId: GMX_ACCOUNT_PSEUDO_CHAIN_ID,
            balance: token.gmxAccountBalance,
            balanceUsd,
          });
        }
      }

      if (token.walletBalance !== undefined && (srcChainId === undefined || includeSettlementChainTokens)) {
        const balanceUsd = convertToUsd(token.walletBalance, token.decimals, token.prices.maxPrice) ?? 0n;
        concatenatedTokens.push({
          ...token,
          balance: token.walletBalance,
          balanceUsd,
          balanceType: TokenBalanceType.Wallet,
          chainId,
        });
      }

      if (token.sourceChainBalance !== undefined && srcChainId !== undefined) {
        const sourceChainDecimals = getSourceChainDecimalsMapped(chainId, srcChainId, token.address);

        if (sourceChainDecimals === undefined) {
          continue;
        }

        const balanceUsd = convertToUsd(token.sourceChainBalance, sourceChainDecimals, getMidPrice(token.prices))!;

        concatenatedTokens.push({
          ...token,
          balance: token.sourceChainBalance,
          decimals: sourceChainDecimals,
          balanceUsd,
          balanceType: TokenBalanceType.SourceChain,
          chainId: srcChainId,
        });
      }
    }

    if (includeMultichainTokensInPay && multichainTokens) {
      for (const token of multichainTokens) {
        if (token.sourceChainBalance === undefined || token.sourceChainPrices === undefined) {
          continue;
        }

        if (concatenatedTokens.some((t) => t.address === token.address && t.chainId === token.sourceChainId)) {
          continue;
        }

        const balanceUsd =
          convertToUsd(token.sourceChainBalance, token.sourceChainDecimals, token.sourceChainPrices?.maxPrice) ?? 0n;

        concatenatedTokens.push({
          ...token,
          prices: token.sourceChainPrices,
          balance: token.sourceChainBalance,
          decimals: token.sourceChainDecimals,
          balanceUsd,
          chainId: token.sourceChainId,
          balanceType: TokenBalanceType.SourceChain,
        });
      }
    }

    let filteredTokens: DisplayToken[];
    if (!searchKeyword.trim()) {
      filteredTokens = concatenatedTokens;
    } else {
      filteredTokens = searchBy(
        concatenatedTokens,
        [
          (item) => {
            let name = item.name;

            return stripBlacklistedWords(name);
          },
          "symbol",
          (item) => (item.searchAliases ?? []).join(" "),
        ],
        searchKeyword
      );
    }

    const tokensWithBalance: DisplayToken[] = [];
    const tokensWithoutBalance: DisplayToken[] = [];

    for (const token of filteredTokens) {
      const balance = token.balance;

      if (balance !== undefined && balance > 0n) {
        tokensWithBalance.push(token);
      } else {
        tokensWithoutBalance.push(token);
      }
    }

    const sortedTokensWithBalance: DisplayToken[] = tokensWithBalance.sort((a, b) => {
      if (a.balanceUsd === b.balanceUsd) {
        return 0;
      }
      return b.balanceUsd - a.balanceUsd > 0n ? 1 : -1;
    });

    const sortedTokensWithoutBalance: DisplayToken[] = tokensWithoutBalance.sort((a, b) => {
      if (extendedSortSequence) {
        // making sure to use the wrapped address if it exists in the extended sort sequence
        const aAddress =
          a.wrappedAddress && extendedSortSequence.includes(a.wrappedAddress) ? a.wrappedAddress : a.address;

        const bAddress =
          b.wrappedAddress && extendedSortSequence.includes(b.wrappedAddress) ? b.wrappedAddress : b.address;

        return extendedSortSequence.indexOf(aAddress) - extendedSortSequence.indexOf(bAddress);
      }

      return 0;
    });

    return [...sortedTokensWithBalance, ...sortedTokensWithoutBalance];
  }, [
    includeMultichainTokensInPay,
    multichainTokens,
    searchKeyword,
    tokensData,
    includeGmxAccountTokens,
    srcChainId,
    includeSettlementChainTokens,
    chainId,
    extendedSortSequence,
  ]);
}

export function AvailableToTradeTokenList({
  chainId,
  onSelectTokenAddress,
  tokens,
  className,
}: {
  chainId: ContractsChainId;
  onSelectTokenAddress: (tokenAddress: string, chainId: AnyChainId | GmxAccountPseudoChainId) => void;
  tokens: DisplayToken[];
  className?: string;
}) {
  return (
    <VerticalScrollFadeContainer className={className}>
      {tokens.map((token) => {
        return (
          <div
            key={`${token.address}_${token.chainId}`}
            className="flex cursor-pointer items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
            onClick={() => onSelectTokenAddress(token.address, token.chainId)}
          >
            <div className="flex items-center gap-16">
              {token.isPlatformToken && isMarketTokenAddress(chainId, token.address) ? (
                <>
                  <TokenIcon
                    symbol={getTokenSymbolByMarket(chainId, token.address, "index")}
                    className="size-40"
                    displaySize={40}
                    chainIdBadge={token.chainId}
                    badge={getMarketBadge(chainId, token.address)}
                  />

                  <div>
                    <div className="text-body-large">
                      <Trans>GM:</Trans>{" "}
                      {getMarketIndexName({
                        indexToken: getMarketIndexToken(chainId, token.address)!,
                        isSpotOnly: false,
                      })}{" "}
                      <span className="text-accent">
                        [
                        {getMarketPoolName({
                          longToken: getToken(chainId, MARKETS[chainId]?.[token.address]?.longTokenAddress),
                          shortToken: getToken(chainId, MARKETS[chainId]?.[token.address]?.shortTokenAddress),
                        })}
                        ]
                      </span>
                    </div>
                    <span className="text-body-small text-typography-secondary">
                      <Trans>From</Trans>{" "}
                      {token.chainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID ? (
                        <Trans>GMX Account</Trans>
                      ) : (
                        getChainName(token.chainId)
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <TokenIcon symbol={token.symbol} className="size-40" displaySize={40} chainIdBadge={token.chainId} />
                  <div>
                    <div className="text-body-large">{token.symbol}</div>
                    <span className="text-body-small text-typography-secondary">{token.name}</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-body-large">
                {token.balance > 0n &&
                  formatBalanceAmount(token.balance, token.sourceChainDecimals ?? token.decimals, undefined, {
                    isStable: token.isStable,
                  })}
                {token.balance == 0n && "-"}
              </div>

              <span className="text-body-small text-typography-secondary">
                {token.balanceUsd > 0n && formatUsd(token.balanceUsd)}
              </span>
            </div>
          </div>
        );
      })}
    </VerticalScrollFadeContainer>
  );
}
