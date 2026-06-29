import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "config/chains";
import { isSettlementChain } from "config/multichain";
import type { GmxAccountAvailableAssetsFilter } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountAvailableAssetsFilter } from "context/GmxAccountContext/hooks";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatUsd } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { Amount } from "components/Amount/Amount";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

type FilterType = GmxAccountAvailableAssetsFilter;

const FILTERS: FilterType[] = ["gmxAccount", "wallet"];

const FILTER_TITLE_MAP: Record<FilterType, MessageDescriptor> = {
  gmxAccount: msg`GMX Account`,
  wallet: msg`Wallet`,
};

type DisplayToken = {
  chainId: number;
  symbol: string;
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
}: {
  tokens: DisplayToken[];
  noChainFilter?: boolean;
  initialFilter?: FilterType;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const titles = useLocalizedMap(FILTER_TITLE_MAP);

  const tabsOptions = useMemo<TabOption<FilterType>[]>(
    () => FILTERS.map((filter) => ({ value: filter, label: titles[filter] })),
    [titles]
  );

  const sortedFilteredTokens = useMemo(() => {
    const filteredTokens = tokens.filter((token) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChainFilter =
        noChainFilter ||
        (activeFilter === "gmxAccount" && token.isGmxAccount) ||
        (activeFilter === "wallet" && !token.isGmxAccount);

      return matchesSearch && matchesChainFilter;
    });

    return filteredTokens;
  }, [tokens, searchQuery, noChainFilter, activeFilter]);

  return (
    <div className="flex grow flex-col overflow-y-hidden">
      <div className="px-adaptive">
        <SearchInput value={searchQuery} setValue={setSearchQuery} noBorder />
      </div>

      {!noChainFilter && (
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
              <TokenIcon symbol={displayToken.symbol} displaySize={40} chainIdBadge={displayToken.chainId} />
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
                {formatUsd(displayToken.balanceUsd)}
              </div>
            </div>
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

export const AvailableToTradeAssetsView = () => {
  const { chainId } = useAccount();

  return isSettlementChain(chainId!) ? <AssetListSettlementChain /> : <AssetListMultichain />;
};
