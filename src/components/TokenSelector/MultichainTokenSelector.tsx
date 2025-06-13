import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import type { ContractsChainId, SourceChainId } from "config/chains";
import type { TokenChainData } from "domain/multichain/types";
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
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
  size?: "m" | "l";
  className?: string;

  tokenAddress: string;
  isGmxAccount: boolean;

  walletTokensData: TokensData | undefined;
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
  chainId,
  srcChainId,
  walletTokensData,
  gmxAccountTokensData,
  selectedTokenLabel,
  extendedSortSequence,
  footerContent,
  size = "m",
  qa,
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
  let token: Token | undefined = getToken(chainId, tokenAddress);

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

  const [activeFilter, setActiveFilter] = useState<"pay" | "deposit">("pay");

  useEffect(() => {
    if (isModalVisible) {
      setSearchKeyword("");

      if (srcChainId === undefined) {
        setActiveFilter("pay");
      } else {
        if (isGmxAccountEmpty) {
          setActiveFilter("deposit");
        } else {
          setActiveFilter("pay");
        }
      }
    }
  }, [isGmxAccountEmpty, isModalVisible, setSearchKeyword, srcChainId]);

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
        className="TokenSelector-modal text-body-medium text-white"
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
            {isGmxAccountEmpty && srcChainId !== undefined ? (
              <div className="text-body-medium mt-8 text-slate-100">
                <Trans>To begin trading on GMX deposit assets into GMX account</Trans>
              </div>
            ) : (
              <div className="mt-16 flex gap-4">
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
        contentPadding={false}
        noDivider
      >
        {activeFilter === "pay" && (
          <AvailableToTradeTokenList
            isModalVisible={isModalVisible}
            setSearchKeyword={setSearchKeyword}
            onSelectTokenAddress={onSelectTokenAddress}
            searchKeyword={searchKeyword}
            walletTokensData={walletTokensData}
            gmxAccountTokensData={gmxAccountTokensData}
            extendedSortSequence={extendedSortSequence}
            chainId={chainId}
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
  chainId,
  isModalVisible,
  setSearchKeyword,
  searchKeyword,
  walletTokensData,
  gmxAccountTokensData,
  extendedSortSequence,
  onSelectTokenAddress,
}: {
  chainId: ContractsChainId;
  isModalVisible: boolean;
  setSearchKeyword: (searchKeyword: string) => void;
  searchKeyword: string;
  walletTokensData: TokensData | undefined;
  gmxAccountTokensData: TokensData | undefined;
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
    for (const token of Object.values(walletTokensData ?? (EMPTY_OBJECT as TokensData))) {
      concatenatedTokens.push({ ...token, isGmxAccount: false, balance: token.balance ?? 0n, balanceUsd: 0n });
    }
    for (const token of Object.values(gmxAccountTokensData ?? (EMPTY_OBJECT as TokensData))) {
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
      const balance = token.isGmxAccount
        ? gmxAccountTokensData?.[token.address]?.balance
        : walletTokensData?.[token.address]?.balance;

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
  }, [walletTokensData, gmxAccountTokensData, searchKeyword, extendedSortSequence]);

  return (
    <div>
      {sortedFilteredTokens.map((token) => {
        return (
          <div
            key={token.address + "_" + (token.isGmxAccount ? "gmx" : "settlement")}
            className="gmx-hover-gradient flex cursor-pointer items-center justify-between px-16 py-8"
            onClick={() => onSelectTokenAddress(token.address, token.isGmxAccount)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={token.symbol}
                className="size-40"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.isGmxAccount ? 0 : chainId}
              />

              <div>
                <div className="text-body-large">{token.symbol}</div>
                <span className="text-body-small text-slate-100">{token.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-body-large">
                {token.balance > 0n && formatBalanceAmount(token.balance, token.decimals)}
                {token.balance == 0n && "-"}
              </div>

              <span className="text-body-small text-slate-100">
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
            className="group gmx-hover-gradient-to-l flex cursor-pointer items-center justify-between px-16 py-8"
            onClick={() => onDepositTokenAddress(token.address, token.sourceChainId)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={token.symbol}
                className="size-40"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.sourceChainId}
              />

              <div>
                <div className="text-body-large">{token.symbol}</div>
                <span className="text-body-small text-slate-100">{token.name}</span>
              </div>
            </div>
            <div className="text-right group-gmx-hover:hidden">
              {(token.sourceChainBalance !== undefined && (
                <div className="text-body-large">
                  {token.sourceChainBalance > 0 &&
                    formatBalanceAmount(token.sourceChainBalance, token.sourceChainDecimals)}
                  {token.sourceChainBalance == 0n && "-"}
                </div>
              )) ||
                null}
              <span className="text-body-small text-slate-100">
                {token.sourceChainBalanceUsd !== undefined && token.sourceChainBalanceUsd > 0 && (
                  <div>${formatAmount(token.sourceChainBalanceUsd, USD_DECIMALS, 2, true)}</div>
                )}
              </span>
            </div>
            <div className="text-right not-group-gmx-hover:hidden">
              <Trans>Deposit</Trans>
            </div>
          </div>
        );
      })}
    </div>
  );
}
