import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import type { ContractsChainId, SourceChainId } from "config/chains";
import type { TokenChainData } from "domain/multichain/types";
import { convertToUsd } from "domain/synthetics/tokens";
import type { Token, TokenData, TokensData } from "domain/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
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
  size?: "m" | "l";
  className?: string;

  tokenAddress: string;
  isGmxAccount: boolean;

  tokensData: TokensData | undefined;
  selectedTokenLabel?: ReactNode | string;

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  extendedSortSequence?: string[] | undefined;

  footerContent?: ReactNode;
  qa?: string;
  multichainTokens: TokenChainData[] | undefined;

  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
};

export function MultichainTokenSelector({
  chainId,
  srcChainId,
  tokensData,
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

  const onDepositTokenAddress = (tokenAddress: string, chainId: SourceChainId) => {
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
    if (!tokensData) return true;

    const allEmpty = Object.values(tokensData).every(
      (token) => token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n
    );

    return allEmpty;
  }, [tokensData]);

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
              // onKeyDown={_handleKeyDown}
            />
            {isGmxAccountEmpty && srcChainId !== undefined ? (
              <div className="text-body-medium text-typography-secondary">
                <Trans>To begin trading on GMX deposit assets into GMX account</Trans>
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
          <AvailableToTradeTokenList
            isModalVisible={isModalVisible}
            setSearchKeyword={setSearchKeyword}
            onSelectTokenAddress={onSelectTokenAddress}
            searchKeyword={searchKeyword}
            tokensData={tokensData}
            extendedSortSequence={extendedSortSequence}
            chainId={chainId}
            srcChainId={srcChainId}
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
  srcChainId,
  isModalVisible,
  setSearchKeyword,
  searchKeyword,
  tokensData,
  extendedSortSequence,
  onSelectTokenAddress,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  isModalVisible: boolean;
  setSearchKeyword: (searchKeyword: string) => void;
  searchKeyword: string;
  tokensData: TokensData | undefined;
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

    for (const token of Object.values(tokensData ?? (EMPTY_OBJECT as TokensData))) {
      if (token.gmxAccountBalance !== undefined && (srcChainId !== undefined || token.gmxAccountBalance > 0n)) {
        concatenatedTokens.push({ ...token, isGmxAccount: true, balance: token.gmxAccountBalance, balanceUsd: 0n });
      }
      if (token.walletBalance !== undefined && srcChainId === undefined) {
        concatenatedTokens.push({ ...token, isGmxAccount: false, balance: token.walletBalance, balanceUsd: 0n });
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
        ],
        searchKeyword
      );
    }

    const tokensWithBalance: DisplayToken[] = [];
    const tokensWithoutBalance: DisplayToken[] = [];

    for (const token of filteredTokens) {
      const balance = token.isGmxAccount ? token.gmxAccountBalance : token.walletBalance;

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
  }, [searchKeyword, tokensData, srcChainId, extendedSortSequence]);

  return (
    <VerticalScrollFadeContainer>
      {sortedFilteredTokens.map((token) => {
        return (
          <div
            key={token.address + "_" + (token.isGmxAccount ? "gmx" : "settlement")}
            className="px-adaptive flex cursor-pointer items-center justify-between py-8 gmx-hover:bg-fill-surfaceElevated50"
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
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
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
            className="px-adaptive group flex cursor-pointer items-center justify-between py-8 gmx-hover:bg-fill-surfaceElevated50"
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
