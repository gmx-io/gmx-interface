import { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { isSettlementChain } from "config/multichain";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

type FilterType = "all" | "gmxAccount" | "wallet";

const FILTERS: FilterType[] = ["all", "wallet", "gmxAccount"];

const FILTER_TITLE_MAP: Record<FilterType, MessageDescriptor> = {
  all: msg`All`,
  gmxAccount: msg`GMX Account`,
  wallet: msg`Wallet`,
};

type DisplayToken = {
  chainId: number;
  symbol: string;
  isGmxAccount: boolean;
  balance: bigint | undefined;
  balanceUsd: bigint | undefined;
  decimals: number;
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

const AssetsList = ({ tokens, noChainFilter }: { tokens: DisplayToken[]; noChainFilter?: boolean }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const titles = useLocalizedMap(FILTER_TITLE_MAP);

  const sortedFilteredTokens = useMemo(() => {
    const filteredTokens = tokens.filter((token) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChainFilter =
        noChainFilter ||
        activeFilter === "all" ||
        (activeFilter === "gmxAccount" && token.isGmxAccount) ||
        (activeFilter === "wallet" && !token.isGmxAccount);

      return matchesSearch && matchesChainFilter;
    });

    return filteredTokens;
  }, [tokens, searchQuery, noChainFilter, activeFilter]);

  return (
    <div className="flex grow flex-col overflow-y-hidden pt-adaptive">
      <div className="mb-16 px-adaptive">
        <SearchInput value={searchQuery} setValue={setSearchQuery} noBorder />
      </div>

      {!noChainFilter && (
        <div className="mb-12 flex gap-4 px-adaptive">
          {FILTERS.map((filter) => (
            <Button
              key={filter}
              type="button"
              variant={activeFilter === filter ? "secondary" : "ghost"}
              size="small"
              className={cx({
                "!text-typography-primary": activeFilter === filter,
              })}
              onClick={() => setActiveFilter(filter)}
            >
              {titles[filter]}
            </Button>
          ))}
        </div>
      )}
      <VerticalScrollFadeContainer className="flex grow flex-col overflow-y-auto">
        {sortedFilteredTokens.map((displayToken) => (
          <div
            key={displayToken.symbol + "_" + displayToken.chainId}
            className="flex items-center justify-between px-adaptive py-8 gmx-hover:bg-slate-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={displayToken.symbol}
                displaySize={40}
                importSize={40}
                chainIdBadge={displayToken.chainId}
              />
              <div>
                <div>{displayToken.symbol}</div>
                <div className="text-body-small text-slate-100">
                  {displayToken.chainId === 0 ? t`GMX Account` : getChainName(displayToken.chainId)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(displayToken.balance ?? 0n, displayToken.decimals)}</div>
              <div className="text-body-small text-slate-100">{formatUsd(displayToken.balanceUsd)}</div>
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
          chainId: 0,
          symbol: token.symbol,
          isGmxAccount: true,
          balance: token.gmxAccountBalance,
          balanceUsd: convertToUsd(token.gmxAccountBalance, token.decimals, getMidPrice(token.prices)),
          decimals: token.decimals,
        })
      )
      .sort(tokenSorter);
  }, [tokensData]);

  return <AssetsList noChainFilter tokens={displayTokens} />;
};

const AssetListSettlementChain = () => {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  const displayTokens = useMemo(() => {
    const displayTokens: DisplayToken[] = Object.values(tokensData || {})
      .flatMap((tokenData): DisplayToken[] => [
        {
          ...tokenData,
          isGmxAccount: true,
          balance: tokenData.gmxAccountBalance,
          balanceUsd: convertToUsd(tokenData.gmxAccountBalance, tokenData.decimals, getMidPrice(tokenData.prices)),
          chainId: 0,
        },
        {
          ...tokenData,
          isGmxAccount: false,
          balance: tokenData.walletBalance,
          balanceUsd: convertToUsd(tokenData.walletBalance, tokenData.decimals, getMidPrice(tokenData.prices)),
          chainId: chainId,
        },
      ])
      .filter((token) => token.balance !== undefined && token.balance > 0n)
      .sort(tokenSorter);

    return displayTokens;
  }, [chainId, tokensData]);

  return <AssetsList tokens={displayTokens} />;
};

export const AvailableToTradeAssetsView = () => {
  const { chainId } = useAccount();

  return isSettlementChain(chainId!) ? <AssetListSettlementChain /> : <AssetListMultichain />;
};
