import { Trans } from "@lingui/macro";
import cx from "classnames";
import { memo, ReactNode, useEffect, useMemo, useState } from "react";

import type { ContractsChainId, SourceChainId } from "config/chains";
import type { TokenChainData } from "domain/multichain/types";
import { convertToUsd } from "domain/synthetics/tokens";
import type { Token, TokenData, TokensData } from "domain/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import "./TokenSelector.scss";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
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

  isConnected?: boolean;
  walletIconUrls?: string[];
  openConnectModal?: () => void;
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
  isGmxAccount,
  className,
  label,
  multichainTokens,
  onDepositTokenAddress: propsOnDepositTokenAddress,
  isConnected,
  walletIconUrls,
  openConnectModal,
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
          onSelectTokenAddress(availableToTradeTokenList[0].address, availableToTradeTokenList[0].isGmxAccount);
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

  const tabsOptions: TabOption<"pay" | "deposit">[] = useMemo(() => {
    return [
      { value: "pay", label: <Trans>Available to Pay</Trans> },
      { value: "deposit", label: <Trans>Available to Deposit</Trans> },
    ];
  }, []);

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
          isConnected === false ? null : (
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
                <Tabs type="inline" options={tabsOptions} selectedValue={activeFilter} onChange={setActiveFilter} />
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
            {activeFilter === "pay" && (
              <AvailableToTradeTokenList
                onSelectTokenAddress={onSelectTokenAddress}
                tokens={availableToTradeTokenList}
                chainId={chainId}
              />
            )}
            {activeFilter === "deposit" && multichainTokens && (
              <MultichainTokenList tokens={multichainTokenList} onDepositTokenAddress={onDepositTokenAddress} />
            )}
          </>
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
              chainIdBadge={isGmxAccount ? 0 : undefined}
            />
            {token.symbol}
          </span>
        )}

        <ChevronDownIcon className="w-16 text-typography-secondary group-hover:text-[inherit]" />
      </div>
    </div>
  );
}

type DisplayAvailableToTradeToken = TokenData & { balance: bigint; balanceUsd: bigint; isGmxAccount: boolean };
function useAvailableToTradeTokenList({
  activeFilter,
  srcChainId,
  searchKeyword,
  tokensData,
  extendedSortSequence,
}: {
  activeFilter: "pay" | "deposit";
  srcChainId: SourceChainId | undefined;
  searchKeyword: string;
  tokensData: TokensData | undefined;
  extendedSortSequence?: string[];
}) {
  return useMemo(() => {
    if (activeFilter !== "pay") {
      return EMPTY_ARRAY;
    }

    const concatenatedTokens: DisplayAvailableToTradeToken[] = [];

    for (const token of Object.values(tokensData ?? (EMPTY_OBJECT as TokensData))) {
      if (token.gmxAccountBalance !== undefined && (srcChainId !== undefined || token.gmxAccountBalance > 0n)) {
        concatenatedTokens.push({ ...token, isGmxAccount: true, balance: token.gmxAccountBalance, balanceUsd: 0n });
      }
      if (token.walletBalance !== undefined && srcChainId === undefined) {
        concatenatedTokens.push({ ...token, isGmxAccount: false, balance: token.walletBalance, balanceUsd: 0n });
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
      const balance = token.isGmxAccount ? token.gmxAccountBalance : token.walletBalance;

      if (balance !== undefined && balance > 0n) {
        const balanceUsd = convertToUsd(balance, token.decimals, token.prices.maxPrice) ?? 0n;
        tokensWithBalance.push({ ...token, balanceUsd });
      } else {
        tokensWithoutBalance.push({ ...token, balanceUsd: 0n });
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
  }, [activeFilter, searchKeyword, tokensData, srcChainId, extendedSortSequence]);
}

function AvailableToTradeTokenList({
  chainId,
  onSelectTokenAddress,
  tokens,
}: {
  chainId: ContractsChainId;
  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  tokens: DisplayAvailableToTradeToken[];
}) {
  return (
    <VerticalScrollFadeContainer>
      {tokens.map((token) => {
        return (
          <div
            key={token.address + "_" + (token.isGmxAccount ? "gmx" : "settlement")}
            className="flex cursor-pointer items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
            onClick={() => onSelectTokenAddress(token.address, token.isGmxAccount)}
          >
            <div className="flex items-center gap-16">
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

const ConnectWalletModalContent = memo(function ConnectWalletModalContent({
  openConnectModal,
  walletIconUrls,
}: {
  openConnectModal: (() => void) | undefined;
  walletIconUrls: string[] | undefined;
}) {
  return (
    <div className="flex grow flex-col items-center justify-center gap-20 p-adaptive">
      {walletIconUrls?.length && (
        <div className="flex rounded-full bg-slate-800 p-2">
          {walletIconUrls.map((url, index) => (
            <img
              src={url}
              alt="Wallet Icon"
              className="relative -ml-8 size-24 rounded-full border-2 border-slate-800 first-of-type:ml-0"
              // Safety: walletIconUrls is not changing, memo prevents parent caused re-renders
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              style={{
                zIndex: walletIconUrls.length - index,
              }}
              key={url}
            />
          ))}
        </div>
      )}
      <div className="text-body-medium text-center text-typography-secondary">
        <Trans>
          Please connect your wallet to view
          <br />
          all available payment options
        </Trans>
      </div>
      <ConnectWalletButton onClick={openConnectModal}>
        <Trans>Connect Wallet</Trans>
      </ConnectWalletButton>
    </div>
  );
});
