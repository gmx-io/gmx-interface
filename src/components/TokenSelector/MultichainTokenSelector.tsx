import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { TokenChainData } from "context/GmxAccountContext/types";
import { convertToUsd } from "domain/synthetics/tokens";
import type { Token, TokenData, TokensData } from "domain/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { formatAmount, formatBalanceAmount } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { USD_DECIMALS } from "sdk/configs/factors";
import { getToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

import "./TokenSelector.scss";

type Props = {
  walletChainId: number;
  settlementChainId: number;

  label?: string;
  size?: "m" | "l";
  className?: string;

  tokenAddress: string;
  isGmxAccount: boolean;

  walletPayableTokensData: TokensData | undefined;
  selectedTokenLabel?: ReactNode | string;

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  extendedSortSequence?: string[] | undefined;

  footerContent?: ReactNode;
  qa?: string;
  gmxAccountTokensData: TokensData | undefined;
  multichainTokens: TokenChainData[] | undefined;

  onDepositTokenAddress: (tokenAddress: string, chainId: number) => void;
};

export function MultichainTokenSelector({
  walletChainId,
  settlementChainId,
  // tokens,
  // infoTokens,
  walletPayableTokensData: tokensData,
  selectedTokenLabel,
  // showBalances = true,
  // showTokenImgInDropdown = false,
  extendedSortSequence,
  footerContent,
  // missedCoinsPlace,

  // chainId,
  size = "m",
  qa,
  gmxAccountTokensData = EMPTY_OBJECT,
  onSelectTokenAddress: propsOnSelectTokenAddress,
  tokenAddress,
  isGmxAccount,
  className,
  label,
  multichainTokens,
  onDepositTokenAddress: propsOnDepositTokenAddress,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let token: Token | undefined = getToken(settlementChainId, tokenAddress);

  const onSelectTokenAddress = (tokenAddress: string, isGmxAccount: boolean) => {
    setIsModalVisible(false);
    propsOnSelectTokenAddress(tokenAddress, isGmxAccount);
  };

  const onDepositTokenAddress = (tokenAddress: string, chainId: number) => {
    setIsModalVisible(false);
    propsOnDepositTokenAddress(tokenAddress, chainId);
  };

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible]);

  // TODO implement
  // const _handleKeyDown = (e) => {
  //   if (e.key === "Enter") {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     if (filteredTokens.length > 0) {
  //       onSelectToken(filteredTokens[0]);
  //     }
  //   }
  // };

  const isGmxAccountEmpty = useMemo(() => {
    if (!gmxAccountTokensData) return true;

    const allEmpty = Object.values(gmxAccountTokensData).every(
      (token) => token.balance === undefined || token.balance === 0n
    );

    return allEmpty;
  }, [gmxAccountTokensData]);

  const [activeFilter, setActiveFilter] = useState<"pay" | "deposit">(isGmxAccountEmpty ? "deposit" : "pay");

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible, setSearchKeyword]);

  if (!token) {
    return null;
  }

  return (
    <div
      className={cx(
        "TokenSelector",
        {
          "-mr-2": size === "m",
          "text-h2 -mr-5": size === "l",
        },
        className
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <SlideModal
        qa={qa + "-modal"}
        className="TokenSelector-modal text-white"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={footerContent}
        headerContent={
          <>
            <SearchInput
              className="*:!text-body-medium min-[700px]:mt-15"
              value={searchKeyword}
              setValue={setSearchKeyword}
              // onKeyDown={_handleKeyDown}
            />
            {isGmxAccountEmpty ? (
              <div className="text-body-medium mt-8 text-slate-100">
                <Trans>To begin trading on GMX deposit assets into GMX account</Trans>
              </div>
            ) : (
              <div className="mt-8 flex gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  slim
                  className={cx({
                    "!bg-cold-blue-500": activeFilter === "pay",
                  })}
                  onClick={() => setActiveFilter("pay")}
                >
                  <Trans>Available to Pay</Trans>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  slim
                  className={cx({
                    "!bg-cold-blue-500": activeFilter === "deposit",
                  })}
                  onClick={() => setActiveFilter("deposit")}
                >
                  <Trans>Available to Deposit</Trans>
                </Button>
              </div>
            )}
          </>
        }
      >
        {/* {missedCoinsPlace && (
          <WithMissedCoinsSearch
            searchKeyword={searchKeyword}
            place={missedCoinsPlace}
            isEmpty={!filteredTokens.length}
            isLoaded={Boolean(visibleTokens.length)}
          />
        )} */}

        {activeFilter === "pay" && tokensData && (
          <AvailableToTradeTokenList
            isModalVisible={isModalVisible}
            setSearchKeyword={setSearchKeyword}
            onSelectTokenAddress={onSelectTokenAddress}
            searchKeyword={searchKeyword}
            tokensData={tokensData}
            extendedSortSequence={extendedSortSequence}
            gmxAccountTokensData={gmxAccountTokensData}
            walletChainId={walletChainId}
            settlementChainId={settlementChainId}
          />
        )}
        {activeFilter === "deposit" && multichainTokens && (
          <MultichainTokenList
            isModalVisible={isModalVisible}
            setSearchKeyword={setSearchKeyword}
            searchKeyword={searchKeyword}
            multichainTokens={multichainTokens}
            extendedSortSequence={extendedSortSequence}
            onDepositTokenAddress={onDepositTokenAddress}
          />
        )}
        {/* {sortedFilteredTokens.length === 0 && (
          <div className="text-16 text-slate-100">
            <Trans>No tokens matched.</Trans>
          </div>
        )} */}
      </SlideModal>
      <div
        data-qa={qa}
        className="flex cursor-pointer items-center whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {selectedTokenLabel || (
          <span className="inline-flex items-center">
            <TokenIcon
              className="mr-5"
              symbol={token.symbol}
              importSize={24}
              displaySize={20}
              chainIdBadge={isGmxAccount ? 0 : undefined}
            />
            <span>{token.symbol}</span>
          </span>
        )}
        <BiChevronDown className="text-body-large" />
      </div>
    </div>
  );
}

function AvailableToTradeTokenList({
  walletChainId,
  settlementChainId,
  isModalVisible,
  setSearchKeyword,
  searchKeyword,
  tokensData,
  gmxAccountTokensData,
  extendedSortSequence,
  onSelectTokenAddress,
}: {
  walletChainId: number;
  settlementChainId: number;
  isModalVisible: boolean;
  setSearchKeyword: (searchKeyword: string) => void;
  searchKeyword: string;
  tokensData: TokensData;
  gmxAccountTokensData: TokensData;
  extendedSortSequence?: string[];
  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
}) {
  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible, setSearchKeyword]);

  const sortedFilteredTokens = useMemo(() => {
    type DisplayToken = TokenData & { balance: bigint; balanceUsd: bigint; isGmxAccount: boolean };

    const concatenatedTokens: DisplayToken[] = [];
    for (const token of Object.values(tokensData)) {
      concatenatedTokens.push({ ...token, isGmxAccount: false, balance: token.balance ?? 0n, balanceUsd: 0n });
    }
    for (const token of Object.values(gmxAccountTokensData)) {
      concatenatedTokens.push({ ...token, isGmxAccount: true, balance: token.balance ?? 0n, balanceUsd: 0n });
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
        ],
        searchKeyword
      );
    }

    const tokensWithBalance: DisplayToken[] = [];
    const tokensWithoutBalance: DisplayToken[] = [];

    for (const token of filteredTokens) {
      const balance = tokensData?.[token.address]?.balance;

      if (balance !== undefined && balance > 0n) {
        const balanceUsd = convertToUsd(balance, token.decimals, token.prices.maxPrice) ?? 0n;
        tokensWithBalance.push({ ...token, balanceUsd });
      } else {
        tokensWithoutBalance.push({ ...token, balanceUsd: 0n });
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
  }, [tokensData, gmxAccountTokensData, searchKeyword, extendedSortSequence]);

  return (
    <div>
      {sortedFilteredTokens.map((token) => {
        return (
          <div
            key={token.address}
            // data-qa={`${qa}-token-${token.symbol}`}
            className={cx("TokenSelector-token-row")}
            onClick={() => onSelectTokenAddress(token.address, token.isGmxAccount)}
          >
            <div className="Token-info">
              <TokenIcon
                symbol={token.symbol}
                className="token-logo"
                displaySize={40}
                importSize={40}
                chainIdBadge={settlementChainId !== walletChainId ? 0 : token.isGmxAccount ? 0 : walletChainId}
              />

              <div className="Token-symbol">
                <div className="Token-text">{token.symbol}</div>
                <span className="text-accent">{token.name}</span>
              </div>
            </div>
            <div className="Token-balance">
              <div className="Token-text">
                {token.balance > 0n && formatBalanceAmount(token.balance, token.decimals)}
                {token.balance == 0n && "-"}
              </div>

              <span className="text-accent">
                {token.balanceUsd > 0n && <div>${formatAmount(token.balanceUsd, USD_DECIMALS, 2, true)}</div>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MultichainTokenList({
  isModalVisible,
  setSearchKeyword,
  searchKeyword,
  multichainTokens,
  extendedSortSequence,
  onDepositTokenAddress,
}: {
  isModalVisible: boolean;
  setSearchKeyword: (searchKeyword: string) => void;
  searchKeyword: string;
  multichainTokens: TokenChainData[];
  extendedSortSequence?: string[];
  onDepositTokenAddress: (tokenAddress: string, chainId: number) => void;
}) {
  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");
    }
  }, [isModalVisible, setSearchKeyword]);

  const filteredTokens = useMemo(() => {
    if (!searchKeyword.trim()) {
      return multichainTokens;
    }

    return searchBy(
      multichainTokens,
      [
        (item) => {
          let name = item.name;

          return stripBlacklistedWords(name);
        },
        "symbol",
      ],
      searchKeyword
    );
  }, [searchKeyword, multichainTokens]);

  type DisplayToken = TokenChainData & { sourceChainBalanceUsd: bigint };

  const sortedFilteredTokens: DisplayToken[] = useMemo((): DisplayToken[] => {
    const tokensWithBalance: DisplayToken[] = [];
    const tokensWithoutBalance: DisplayToken[] = [];

    for (const token of filteredTokens) {
      const balance = token.sourceChainBalance;

      if (balance !== undefined && balance > 0n) {
        const balanceUsd = convertToUsd(balance, token.sourceChainDecimals, token.sourceChainPrices?.maxPrice) ?? 0n;
        tokensWithBalance.push({ ...token, sourceChainBalanceUsd: balanceUsd });
      } else {
        tokensWithoutBalance.push({ ...token, sourceChainBalanceUsd: 0n });
      }
    }

    const sortedTokensWithBalance = tokensWithBalance.sort((a, b) => {
      return b.sourceChainBalanceUsd - a.sourceChainBalanceUsd > 0n ? 1 : -1;
    });

    const sortedTokensWithoutBalance = tokensWithoutBalance.sort((a, b) => {
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
  }, [filteredTokens, extendedSortSequence]);

  return (
    <div>
      {sortedFilteredTokens.map((token) => {
        return (
          <div
            key={token.address + "_" + token.sourceChainId}
            // data-qa={`${qa}-token-${token.symbol}`}
            className={cx("TokenSelector-token-row")}
            onClick={() => onDepositTokenAddress(token.address, token.sourceChainId)}
          >
            <div className="Token-info">
              <TokenIcon
                symbol={token.symbol}
                className="token-logo"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.sourceChainId}
              />

              <div className="Token-symbol">
                <div className="Token-text">{token.symbol}</div>
                <span className="text-accent">{token.name}</span>
              </div>
            </div>
            <div className="Token-balance">
              {(token.sourceChainBalance !== undefined && (
                <div className="Token-text">
                  {token.sourceChainBalance > 0 &&
                    formatBalanceAmount(token.sourceChainBalance, token.sourceChainDecimals)}
                  {token.sourceChainBalance == 0n && "-"}
                </div>
              )) ||
                null}
              <span className="text-accent">
                {token.sourceChainBalanceUsd !== undefined && token.sourceChainBalanceUsd > 0 && (
                  <div>${formatAmount(token.sourceChainBalanceUsd, USD_DECIMALS, 2, true)}</div>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
