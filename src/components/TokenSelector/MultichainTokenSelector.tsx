import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";

import type { AnyChainId, ContractsChainId, SourceChainId } from "config/chains";
import { isSourceChain } from "config/multichain";
import type { TokenChainData } from "domain/multichain/types";
import { convertToUsd } from "domain/synthetics/tokens";
import { TokenBalanceType, type Token, type TokenData, type TokensData } from "domain/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import "./TokenSelector.scss";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
  className?: string;

  tokenAddress: string;
  payChainId: AnyChainId | 0 | undefined;

  tokensData: TokensData | undefined;
  selectedTokenLabel?: ReactNode | string;

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean, srcChainId: SourceChainId | undefined) => void;
  extendedSortSequence?: string[] | undefined;

  footerContent?: ReactNode;
  qa?: string;
  multichainTokens: TokenChainData[] | undefined;
  includeMultichainTokensInPay?: boolean;

  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
};

export function MultichainTokenSelector({
  chainId,
  srcChainId,
  tokensData,
  selectedTokenLabel,
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
  onDepositTokenAddress: propsOnDepositTokenAddress,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let token: Token | undefined = getToken(chainId, tokenAddress);

  const onSelectTokenAddress = (tokenAddress: string, _chainId: AnyChainId | 0) => {
    setIsModalVisible(false);
    // TODO MLTCH: bad readability
    propsOnSelectTokenAddress(
      tokenAddress,
      _chainId === 0,
      _chainId !== chainId && _chainId !== 0 && isSourceChain(_chainId) ? _chainId : undefined
    );
  };

  const onDepositTokenAddress = (tokenAddress: string, chainId: SourceChainId) => {
    setIsModalVisible(false);
    propsOnDepositTokenAddress(tokenAddress, chainId);
  };

  const isGmxAccountEmpty = useMemo(() => {
    if (!tokensData) return true;

    const allEmpty = Object.values(tokensData).every(
      (token) => token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n
    );

    return allEmpty;
  }, [tokensData]);

  const [activeFilter, setActiveFilter] = useState<"pay" | "deposit">("pay");

  const availableToTradeTokenList = useAvailableToTradeTokenList({
    activeFilter,
    srcChainId,
    searchKeyword,
    tokensData,
    extendedSortSequence,
    chainId,
    multichainTokens,
    includeMultichainTokensInPay,
  });
  const multichainTokenList = useMultichainTokensList({
    searchKeyword,
    multichainTokens,
    extendedSortSequence,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (activeFilter === "pay") {
        if (availableToTradeTokenList.length > 0) {
          onSelectTokenAddress(availableToTradeTokenList[0].address, availableToTradeTokenList[0].chainId);
        }
      } else {
        if (multichainTokenList.length > 0) {
          onDepositTokenAddress(multichainTokenList[0].address, multichainTokenList[0].sourceChainId);
        }
      }
    }
  };

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
    <div className={cx("TokenSelector", className)} onClick={(event) => event.stopPropagation()}>
      <SlideModal
        qa={qa + "-modal"}
        className="TokenSelector-modal text-body-medium"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={footerContent}
        headerContent={
          <div className="pb-12">
            <SearchInput
              value={searchKeyword}
              setValue={setSearchKeyword}
              className="mb-16"
              onKeyDown={handleKeyDown}
            />
            {isGmxAccountEmpty && srcChainId !== undefined ? (
              <div className="text-body-medium text-typography-secondary">
                <Trans>To begin trading on GMX deposit assets into GMX account.</Trans>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={activeFilter === "pay" ? "secondary" : "ghost"}
                  size="small"
                  className={cx({
                    "!text-typography-primary": activeFilter === "pay",
                  })}
                  onClick={() => setActiveFilter("pay")}
                >
                  <Trans>Available to Pay</Trans>
                </Button>
                <Button
                  type="button"
                  variant={activeFilter === "deposit" ? "secondary" : "ghost"}
                  size="small"
                  className={cx({
                    "!text-typography-primary": activeFilter === "deposit",
                  })}
                  onClick={() => setActiveFilter("deposit")}
                >
                  <Trans>Available to Deposit</Trans>
                </Button>
              </div>
            )}
          </div>
        }
        contentPadding={false}
      >
        {activeFilter === "pay" && (
          <AvailableToTradeTokenList onSelectTokenAddress={onSelectTokenAddress} tokens={availableToTradeTokenList} />
        )}
        {activeFilter === "deposit" && multichainTokens && (
          <MultichainTokenList tokens={multichainTokenList} onDepositTokenAddress={onDepositTokenAddress} />
        )}
      </SlideModal>
      <div
        data-qa={qa}
        className="group/hoverable group flex cursor-pointer items-center gap-5 whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {selectedTokenLabel || (
          <span className="inline-flex items-center">
            <TokenIcon
              className="mr-4"
              symbol={token.symbol}
              importSize={24}
              displaySize={20}
              chainIdBadge={payChainId}
            />
            {token.symbol}
          </span>
        )}

        <FaChevronDown className="w-12 text-typography-secondary group-hover:text-[inherit]" />
      </div>
    </div>
  );
}

type DisplayAvailableToTradeToken = TokenData & { balance: bigint; balanceUsd: bigint; chainId: AnyChainId | 0 };
function useAvailableToTradeTokenList({
  chainId,
  activeFilter,
  srcChainId,
  searchKeyword,
  tokensData,
  multichainTokens,
  extendedSortSequence,
  includeMultichainTokensInPay,
}: {
  chainId: ContractsChainId;
  activeFilter: "pay" | "deposit";
  srcChainId: SourceChainId | undefined;
  searchKeyword: string;
  tokensData: TokensData | undefined;
  multichainTokens: TokenChainData[] | undefined;
  extendedSortSequence?: string[];
  includeMultichainTokensInPay?: boolean;
}) {
  return useMemo(() => {
    if (activeFilter !== "pay") {
      return EMPTY_ARRAY;
    }

    const concatenatedTokens: DisplayAvailableToTradeToken[] = [];

    for (const token of Object.values(tokensData ?? (EMPTY_OBJECT as TokensData))) {
      if (token.gmxAccountBalance !== undefined && (srcChainId !== undefined || token.gmxAccountBalance > 0n)) {
        concatenatedTokens.push({
          ...token,
          balanceType: TokenBalanceType.GmxAccount,
          chainId: 0,
          balance: token.gmxAccountBalance,
          balanceUsd: 0n,
        });
      }
      if (token.walletBalance !== undefined && srcChainId === undefined) {
        const balanceUsd = convertToUsd(token.walletBalance, token.decimals, token.prices.maxPrice) ?? 0n;
        concatenatedTokens.push({
          ...token,
          balance: token.walletBalance,
          balanceUsd,
          balanceType: TokenBalanceType.Wallet,
          chainId,
        });
      }
    }

    if (includeMultichainTokensInPay && multichainTokens) {
      for (const token of multichainTokens) {
        if (token.sourceChainBalance === undefined || token.sourceChainPrices === undefined) {
          continue;
        }

        const balanceUsd =
          convertToUsd(token.sourceChainBalance, token.sourceChainDecimals, token.sourceChainPrices?.maxPrice) ?? 0n;
        concatenatedTokens.push({
          ...token,
          prices: token.sourceChainPrices,
          balance: token.sourceChainBalance,
          balanceUsd,
          chainId: token.sourceChainId,
          balanceType: TokenBalanceType.SourceChain,
        });
      }
    }

    let filteredTokens: DisplayAvailableToTradeToken[];
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

    const tokensWithBalance: DisplayAvailableToTradeToken[] = [];
    const tokensWithoutBalance: DisplayAvailableToTradeToken[] = [];

    for (const token of filteredTokens) {
      const balance = token.balance;

      if (balance !== undefined && balance > 0n) {
        tokensWithBalance.push(token);
      } else {
        tokensWithoutBalance.push(token);
      }
    }

    const sortedTokensWithBalance: DisplayAvailableToTradeToken[] = tokensWithBalance.sort((a, b) => {
      if (a.balanceUsd === b.balanceUsd) {
        return 0;
      }
      return b.balanceUsd - a.balanceUsd > 0n ? 1 : -1;
    });

    const sortedTokensWithoutBalance: DisplayAvailableToTradeToken[] = tokensWithoutBalance.sort((a, b) => {
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
    activeFilter,
    includeMultichainTokensInPay,
    multichainTokens,
    searchKeyword,
    tokensData,
    srcChainId,
    chainId,
    extendedSortSequence,
  ]);
}

function AvailableToTradeTokenList({
  onSelectTokenAddress,
  tokens,
}: {
  onSelectTokenAddress: (tokenAddress: string, chainId: AnyChainId | 0) => void;
  tokens: DisplayAvailableToTradeToken[];
}) {
  return (
    <VerticalScrollFadeContainer>
      {tokens.map((token) => {
        return (
          <div
            key={`${token.address}_${token.chainId}`}
            className="flex cursor-pointer items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
            onClick={() => onSelectTokenAddress(token.address, token.chainId)}
          >
            <div className="flex items-center gap-16">
              <TokenIcon
                symbol={token.symbol}
                className="size-40"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.chainId}
              />

              <div>
                <div className="text-body-large">{token.symbol}</div>
                <span className="text-body-small text-typography-secondary">{token.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-body-large">
                {token.balance > 0n &&
                  formatBalanceAmount(token.balance, token.decimals, undefined, {
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

type DisplayMultichainToken = TokenChainData & { sourceChainBalanceUsd: bigint };
function useMultichainTokensList({
  searchKeyword,
  multichainTokens,
  extendedSortSequence,
}: {
  searchKeyword: string;
  multichainTokens: TokenChainData[] | undefined;
  extendedSortSequence?: string[];
}) {
  const filteredTokens = useMemo(() => {
    if (!multichainTokens) {
      return EMPTY_ARRAY;
    }

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

  const sortedFilteredTokens: DisplayMultichainToken[] = useMemo((): DisplayMultichainToken[] => {
    const tokensWithBalance: DisplayMultichainToken[] = [];
    const tokensWithoutBalance: DisplayMultichainToken[] = [];

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

  return sortedFilteredTokens;
}

function MultichainTokenList({
  tokens,
  onDepositTokenAddress,
}: {
  tokens: DisplayMultichainToken[];
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
}) {
  return (
    <div>
      {tokens.map((token) => {
        return (
          <div
            key={token.address + "_" + token.sourceChainId}
            className="group flex cursor-pointer items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
            onClick={() => onDepositTokenAddress(token.address, token.sourceChainId)}
          >
            <div className="flex items-center gap-16">
              <TokenIcon
                symbol={token.symbol}
                className="size-40"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.sourceChainId}
              />

              <div>
                <div className="text-body-large">{token.symbol}</div>
                <span className="text-body-small text-typography-secondary">{token.name}</span>
              </div>
            </div>
            <div className="text-right group-gmx-hover:hidden">
              {(token.sourceChainBalance !== undefined && (
                <div className="text-body-large">
                  {token.sourceChainBalance > 0 &&
                    formatBalanceAmount(token.sourceChainBalance, token.sourceChainDecimals, undefined, {
                      isStable: token.isStable,
                    })}
                  {token.sourceChainBalance == 0n && "-"}
                </div>
              )) ||
                null}
              <span className="text-body-small text-typography-secondary">
                {token.sourceChainBalanceUsd !== undefined &&
                  token.sourceChainBalanceUsd > 0 &&
                  formatUsd(token.sourceChainBalanceUsd)}
              </span>
            </div>

            <Button variant="secondary" size="small" className="not-group-gmx-hover:hidden">
              <Trans>Deposit</Trans>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
