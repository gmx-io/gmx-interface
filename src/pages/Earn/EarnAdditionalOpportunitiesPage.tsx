import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { BOTANIX } from "config/chains";
import {
  selectGlvAndMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvAndGmMarketsInfoData, getMarketPoolName, useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { useProcessedData } from "pages/Stake/useProcessedData";
import { TokensData } from "sdk/types/tokens";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import OpportunityCard from "components/Earn/AdditionalOpportunities/OpportunityCard";
import OpportunityFilters, { OpportunityFilterValue } from "components/Earn/AdditionalOpportunities/OpportunityFilters";
import { useOpportunities, useOpportunityTagLabels } from "components/Earn/AdditionalOpportunities/useOpportunities";

import EarnPageLayout from "./EarnPageLayout";

function collectUserMarketTokenLabels(
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  marketTokensData: ReturnType<typeof useMarketTokensData>["marketTokensData"]
): string[] {
  if (!marketsInfoData || !marketTokensData) {
    return [];
  }

  return Object.values(marketsInfoData)
    .map((info) => {
      const address = isGlvInfo(info) ? info.glvTokenAddress : info.marketTokenAddress;
      const balance = marketTokensData[address]?.balance;

      if (balance === undefined || balance <= 0n) {
        return null;
      }

      return `${isGlvInfo(info) ? "GLV" : "GM"} ${getMarketPoolName(info, "-")}`;
    })
    .filter(defined);
}

const collectUserTokenLabels = (tokensData: TokensData | undefined): string[] => {
  return Object.values(tokensData || {})
    .filter(
      (token) =>
        (token.balance !== undefined && token.balance > 0n) ||
        (token.walletBalance !== undefined && token.walletBalance > 0n) ||
        (token.gmxAccountBalance !== undefined && token.gmxAccountBalance > 0n)
    )
    .map((token) => token.symbol);
};

export default function EarnAdditionalOpportunitiesPage() {
  const { chainId, srcChainId } = useChainId();
  const { data: processedData } = useProcessedData();
  const tokensData = useSelector(selectTokensData);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });

  const [activeFilter, setActiveFilter] = useState<OpportunityFilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const userTokens = useMemo(() => {
    const userAssets = new Set([
      ...collectUserMarketTokenLabels(marketsInfoData, marketTokensData),
      ...collectUserTokenLabels(tokensData),
    ]);

    if (processedData) {
      if ((processedData.gmxInStakedGmx ?? 0n) > 0n) {
        userAssets.add("stGMX");
      }
    }

    return userAssets;
  }, [marketsInfoData, marketTokensData, processedData, tokensData]);

  const allOpportunities = useOpportunities();

  const opportunityTagLabels = useOpportunityTagLabels();

  const filteredOpportunities = useMemo(() => {
    let list = allOpportunities;

    if (activeFilter === "for-me") {
      list = list.filter((opportunity) => opportunity.assets.some((token) => userTokens.has(token)));
    } else if (activeFilter !== "all") {
      list = list.filter((opportunity) => opportunity.tags.includes(activeFilter));
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      list = list.filter((opportunity) => {
        const matchesName = opportunity.name.toLowerCase().includes(normalizedQuery);
        const matchesTokens = opportunity.assets.some((token) => token.toLowerCase().includes(normalizedQuery));
        const matchesTags = opportunity.tags.some((tag) =>
          opportunityTagLabels[tag].toLowerCase().includes(normalizedQuery)
        );

        return matchesName || matchesTokens || matchesTags;
      });
    }

    return list;
  }, [activeFilter, allOpportunities, searchQuery, userTokens, opportunityTagLabels]);

  const emptyStateMessage = useMemo(() => {
    if (chainId === BOTANIX) {
      return (
        <Trans>No additional opportunities at this time on Botanix. Change to Arbitrum or Avalanche to see more.</Trans>
      );
    }

    if (allOpportunities.length === 0) {
      return <Trans>No additional opportunities are available on this chain yet.</Trans>;
    }

    if (activeFilter === "for-me") {
      if (userTokens.size === 0) {
        return (
          <Trans>
            No eligible holdings detected. Acquire or stake GMX, GLV, or GM tokens to unlock personalized opportunities.
          </Trans>
        );
      }

      return <Trans>No opportunities currently match your holdings. Try another filter or check back soon.</Trans>;
    }

    if (searchQuery.trim().length > 0) {
      return <Trans>No opportunities match your search.</Trans>;
    }

    return <Trans>No opportunities match the selected filters.</Trans>;
  }, [activeFilter, allOpportunities.length, chainId, searchQuery, userTokens.size]);

  return (
    <EarnPageLayout>
      <ColorfulBanner>
        <Trans>
          Maximize your earnings on your ecosystem tokens (GMX, GLV and GM) with the following integrated partner
          protocols.
        </Trans>
      </ColorfulBanner>

      <div className="flex flex-col gap-8">
        <OpportunityFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          search={searchQuery}
          onSearchChange={setSearchQuery}
          isForMeDisabled={userTokens.size === 0}
        />

        {filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} marketsInfoData={marketsInfoData} />
            ))}
          </div>
        ) : (
          <div className="rounded-12 bg-slate-900 p-20 text-13 text-typography-secondary">{emptyStateMessage}</div>
        )}
      </div>
    </EarnPageLayout>
  );
}
