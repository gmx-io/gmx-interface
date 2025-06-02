import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { isSettlementChain } from "context/GmxAccountContext/config";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import { useGmxAccountTokensDataObject } from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { ModalShrinkingContent } from "./ModalShrinkingContent";

type FilterType = "all" | "gmxBalance" | "wallet";

const FILTERS: FilterType[] = ["all", "gmxBalance", "wallet"];

const FILTER_TITLE_MAP: Record<FilterType, MessageDescriptor> = {
  all: msg`All`,
  gmxBalance: msg`Gmx Balance`,
  wallet: msg`Wallet`,
};

type DisplayToken = {
  chainId: number;
  symbol: string;
  isGmxAccountBalance: boolean;
  balance: bigint | undefined;
  balanceUsd: bigint | undefined;
  decimals: number;
};

const AssetsList = ({ tokens, noChainFilter }: { tokens: DisplayToken[]; noChainFilter?: boolean }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const titles = useLocalizedMap(FILTER_TITLE_MAP);

  const sortedTokens = useMemo(() => {
    return tokens.sort((a, b) => {
      if (a.balanceUsd !== undefined && b.balanceUsd === undefined) {
        // a first
        return -1;
      }

      if (a.balanceUsd === undefined && b.balanceUsd !== undefined) {
        // b first
        return 1;
      }

      if (a.balanceUsd !== undefined && b.balanceUsd !== undefined) {
        // sort by balanceUsd
        return b.balanceUsd - a.balanceUsd > 0n ? 1 : -1;
      }

      return 0;
    });
  }, [tokens]);

  const sortedFilteredTokens = useMemo(() => {
    const filteredTokens = sortedTokens.filter((token) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChainFilter =
        noChainFilter ||
        activeFilter === "all" ||
        (activeFilter === "gmxBalance" && token.isGmxAccountBalance) ||
        (activeFilter === "wallet" && !token.isGmxAccountBalance);

      return matchesSearch && matchesChainFilter;
    });

    return filteredTokens;
  }, [sortedTokens, searchQuery, noChainFilter, activeFilter]);

  return (
    <ModalShrinkingContent className="gap-8 overflow-y-hidden pt-16">
      {!noChainFilter && (
        <div className="flex gap-4 px-16">
          {FILTERS.map((filter) => (
            <Button
              key={filter}
              type="button"
              variant="ghost"
              slim
              className={cx({
                "!bg-cold-blue-500": activeFilter === filter,
              })}
              onClick={() => setActiveFilter(filter)}
            >
              {titles[filter]}
            </Button>
          ))}
        </div>
      )}

      <div className="px-16">
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {sortedFilteredTokens.map((displayToken) => (
          <div
            key={displayToken.symbol + "_" + displayToken.chainId}
            className="flex items-center justify-between px-16 py-8 gmx-hover:bg-slate-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={displayToken.symbol}
                displaySize={40}
                importSize={40}
                chainIdBadge={noChainFilter ? undefined : displayToken.chainId}
              />
              <div>
                <div>{displayToken.symbol}</div>
                <div className="text-body-small text-slate-100">{getChainName(displayToken.chainId)}</div>
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(displayToken.balance ?? 0n, displayToken.decimals, displayToken.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatUsd(displayToken.balanceUsd)}</div>
            </div>
          </div>
        ))}
      </div>
    </ModalShrinkingContent>
  );
};

const AssetListMultichain = () => {
  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  const displayTokens = useMemo(() => {
    return Object.values(gmxAccountTokensData)
      .filter((token) => !token.isNative)
      .map(
        (token): DisplayToken => ({
          chainId: 0,
          symbol: token.symbol,
          isGmxAccountBalance: true,
          balance: token.balance,
          balanceUsd: convertToUsd(token.balance, token.decimals, getMidPrice(token.prices)),
          decimals: token.decimals,
        })
      );
  }, [gmxAccountTokensData]);

  return <AssetsList noChainFilter tokens={displayTokens} />;
};

const AssetListSettlementChain = () => {
  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  const displayTokens = useMemo(() => {
    const gmxAccountDisplayTokens = Object.values(gmxAccountTokensData).map(
      (token): DisplayToken => ({
        chainId: 0,
        symbol: token.symbol,
        isGmxAccountBalance: true,
        balance: token.balance,
        balanceUsd: convertToUsd(token.balance, token.decimals, getMidPrice(token.prices)),
        decimals: token.decimals,
      })
    );

    const settlementChainDisplayTokens = Object.values(tokensData || {})
      .map(
        (token): DisplayToken => ({
          chainId: chainId!,
          symbol: token.symbol,
          isGmxAccountBalance: false,
          balance: token.balance,
          balanceUsd: convertToUsd(token.balance, token.decimals, getMidPrice(token.prices)),
          decimals: token.decimals,
        })
      )
      .filter((token) => token.balance !== undefined && token.balance > 0n);

    const displayTokens: DisplayToken[] = [...gmxAccountDisplayTokens, ...settlementChainDisplayTokens];

    return displayTokens;
  }, [chainId, gmxAccountTokensData, tokensData]);

  return <AssetsList tokens={displayTokens} />;
};

export const AvailableToTradeAssetsView = () => {
  const { chainId } = useAccount();

  return isSettlementChain(chainId!) ? <AssetListSettlementChain /> : <AssetListMultichain />;
};
