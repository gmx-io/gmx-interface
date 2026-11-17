import { MessageDescriptor } from "@lingui/core";
import { Trans, msg } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { GMX_ACCOUNT_PSEUDO_CHAIN_ID, isSolanaNetwork } from "config/chains";
import { isSettlementChain } from "config/multichain";
import type { GmxAccountAvailableAssetsFilter } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountAvailableAssetsFilter, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSolanaWalletAssets } from "domain/solana/useSolanaWalletAssets";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import { UsdValue } from "components/NumericValue/UsdValue";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { useOpenWalletReceive } from "./hooks";

type FilterType = GmxAccountAvailableAssetsFilter;

const FILTERS: FilterType[] = ["gmxAccount", "wallet"];

const FILTER_TITLE_MAP: Record<FilterType, MessageDescriptor> = {
  gmxAccount: msg`GMX Account`,
  wallet: msg`Wallet`,
};

type DisplayToken = {
  chainId: number;
  symbol: string;
  iconSymbol?: string;
  name: string;
  isGmxAccount: boolean;
  balance: bigint | undefined;
  balanceUsd: bigint | undefined;
  decimals: number;
  isStable: boolean | undefined;
};

const tokenSorter = (a: DisplayToken, b: DisplayToken): 1 | -1 | 0 => {
  if (a.balanceUsd !== undefined && b.balanceUsd === undefined) {
    return -1;
  }

  if (a.balanceUsd === undefined && b.balanceUsd !== undefined) {
    return 1;
  }

  if (a.balanceUsd !== undefined && b.balanceUsd !== undefined) {
    // sort by balanceUsd
    return b.balanceUsd - a.balanceUsd > 0n ? 1 : -1;
  }

  return 0;
};

const AssetsList = ({
  tokens,
  noChainFilter,
  initialFilter = "gmxAccount",
  walletOnly,
}: {
  tokens: DisplayToken[];
  noChainFilter?: boolean;
  initialFilter?: FilterType;
  // Solana: wallet tokens only, no tabs, no EVM receive flow
  walletOnly?: boolean;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const titles = useLocalizedMap(FILTER_TITLE_MAP);
  const openWalletReceive = useOpenWalletReceive();

  const handleOpenWalletReceive = () => {
    openWalletReceive();
  };

  const tabsOptions = useMemo<TabOption<FilterType>[]>(
    () => FILTERS.map((filter) => ({ value: filter, label: titles[filter] })),
    [titles]
  );

  const sortedFilteredTokens = useMemo(() => {
    const filteredTokens = tokens.filter((token) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChainFilter =
        noChainFilter ||
        walletOnly ||
        (activeFilter === "gmxAccount" && token.isGmxAccount) ||
        (activeFilter === "wallet" && !token.isGmxAccount);

      return matchesSearch && matchesChainFilter;
    });

    return filteredTokens;
  }, [tokens, searchQuery, noChainFilter, walletOnly, activeFilter]);

  return (
    <div className="flex grow flex-col overflow-y-hidden">
      <div className="px-adaptive">
        <SearchInput value={searchQuery} setValue={setSearchQuery} noBorder />
      </div>

      {!noChainFilter && !walletOnly && (
        <div className="border-b-1/2 border-stroke-primary/80 px-adaptive">
          <Tabs type="underline" options={tabsOptions} selectedValue={activeFilter} onChange={setActiveFilter} />
        </div>
      )}
      <VerticalScrollFadeContainer className="flex grow flex-col overflow-y-auto pt-12">
        {sortedFilteredTokens.map((displayToken) => (
          <div
            key={displayToken.symbol + "_" + displayToken.chainId}
            className="flex items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
          >
            <div className="flex items-center gap-16">
              <TokenIcon
                symbol={displayToken.iconSymbol ?? displayToken.symbol}
                displaySize={40}
                chainIdBadge={displayToken.chainId}
              />
              <div>
                <div>{displayToken.symbol}</div>
                <div className="text-body-small text-typography-secondary">{displayToken.name}</div>
              </div>
            </div>
            <div className="text-right">
              <Amount
                className="text-body-large"
                amount={displayToken.balance}
                decimals={displayToken.decimals}
                isStable={displayToken.isStable}
              />
              <div className="text-body-small text-typography-secondary numbers">
                <UsdValue usd={displayToken.balanceUsd} />
              </div>
            </div>
          </div>
        ))}
        {sortedFilteredTokens.length === 0 &&
          (searchQuery !== "" ? (
            <div className="flex h-full flex-col items-center justify-center p-adaptive text-typography-secondary">
              <Trans>No assets found</Trans>
            </div>
          ) : walletOnly ? (
            <div className="flex h-full flex-col items-center justify-center p-adaptive text-typography-secondary">
              <Trans>No assets in your wallet</Trans>
            </div>
          ) : !noChainFilter && activeFilter === "wallet" ? (
            <div className="flex h-full flex-col items-center justify-center gap-12 p-adaptive">
              <span className="text-typography-secondary">
                <Trans>No assets in your wallet</Trans>
              </span>
              <Button variant="secondary" size="medium" onClick={handleOpenWalletReceive}>
                <Trans>Receive to wallet</Trans>
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-12 p-adaptive">
              <span className="text-typography-secondary">
                <Trans>No assets in your GMX Account</Trans>
              </span>
              <Button variant="secondary" size="medium" onClick={() => setIsVisibleOrView("deposit")}>
                <Trans>Deposit to GMX Account</Trans>
              </Button>
            </div>
          ))}
      </VerticalScrollFadeContainer>
    </div>
  );
};

const AssetListMultichain = () => {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  const displayTokens = useMemo(() => {
    return Object.values(tokensData || {})
      .filter((token) => !token.isNative && token.gmxAccountBalance !== 0n && token.gmxAccountBalance !== undefined)
      .map(
        (token): DisplayToken => ({
          chainId: GMX_ACCOUNT_PSEUDO_CHAIN_ID,
          symbol: token.symbol,
          name: token.name,
          isGmxAccount: true,
          balance: token.gmxAccountBalance,
          balanceUsd: convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices)),
          decimals: token.decimals,
          isStable: token.isStable,
        })
      )
      .sort(tokenSorter);
  }, [tokensData]);

  return <AssetsList noChainFilter tokens={displayTokens} />;
};

const AssetListSettlementChain = () => {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const [availableAssetsFilter] = useGmxAccountAvailableAssetsFilter();

  const displayTokens = useMemo(() => {
    const displayTokens: DisplayToken[] = Object.values(tokensData || {})
      .flatMap((tokenData): DisplayToken[] => [
        {
          ...tokenData,
          isGmxAccount: true,
          balance: tokenData.gmxAccountBalance,
          balanceUsd: convertToUsd(tokenData.gmxAccountBalance, tokenData.decimals, getMidPrice(tokenData.prices)),
          chainId: GMX_ACCOUNT_PSEUDO_CHAIN_ID,
          isStable: tokenData.isStable,
        },
        {
          ...tokenData,
          isGmxAccount: false,
          balance: tokenData.walletBalance,
          balanceUsd: convertToUsd(tokenData.walletBalance, tokenData.decimals, getMidPrice(tokenData.prices)),
          chainId: chainId,
          isStable: tokenData.isStable,
        },
      ])
      .filter((token) => token.balance !== undefined && token.balance > 0n)
      .sort(tokenSorter);

    return displayTokens;
  }, [chainId, tokensData]);

  return <AssetsList tokens={displayTokens} initialFilter={availableAssetsFilter} />;
};

// Solana is wallet-only: one list from the Solana RPC, without the GMX Account tab or the EVM token data.
const AssetListSolana = () => {
  const { networkId } = useChainId();
  const { address } = useSolanaWalletSession();
  const { assets, isLoading, balancesError } = useSolanaWalletAssets(address);

  const displayTokens = useMemo(
    () =>
      (assets ?? []).map(
        (asset): DisplayToken => ({
          chainId: networkId,
          symbol: asset.symbol,
          iconSymbol: asset.iconSymbol,
          name: asset.name,
          isGmxAccount: false,
          balance: asset.balance,
          balanceUsd: asset.balanceUsd,
          decimals: asset.decimals,
          isStable: asset.isStable,
        })
      ),
    [assets, networkId]
  );

  if (balancesError) {
    return (
      <div className="flex grow items-center justify-center p-adaptive text-typography-secondary">
        <Trans>Unable to load wallet balances</Trans>
      </div>
    );
  }

  if (isLoading && !assets) {
    return (
      <div className="flex grow items-center justify-center p-adaptive text-typography-secondary">
        <SpinnerIcon className="size-24 animate-spin" />
      </div>
    );
  }

  return <AssetsList tokens={displayTokens} walletOnly />;
};

export const AvailableToTradeAssetsView = () => {
  const { chainId } = useAccount();
  const { networkId } = useChainId();

  if (isSolanaNetwork(networkId)) {
    return <AssetListSolana />;
  }

  return isSettlementChain(chainId!) ? <AssetListSettlementChain /> : <AssetListMultichain />;
};
