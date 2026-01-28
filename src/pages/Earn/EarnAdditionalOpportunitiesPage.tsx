import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { BOTANIX } from "config/chains";
import {
  selectGlvAndMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { GlvAndGmMarketsInfoData, useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { TokensData } from "sdk/types/tokens";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import OpportunityCard from "components/Earn/AdditionalOpportunities/OpportunityCard";
import OpportunityFilters, {
  AVAILABLE_FILTERS,
  OpportunityFilterValue,
} from "components/Earn/AdditionalOpportunities/OpportunityFilters";
import {
  OpportunityAsset,
  ST_GMX_OPPORTUNITY_ASSET,
  getOpportunityAssetKey,
  getOpportunityAssetLabel,
  useOpportunities,
  useOpportunityTagLabels,
} from "components/Earn/AdditionalOpportunities/useOpportunities";
import Loader from "components/Loader/Loader";

import EarnPageLayout from "./EarnPageLayout";

function collectUserMarketAssets(
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  marketTokensData: ReturnType<typeof useMarketTokensData>["marketTokensData"]
): OpportunityAsset[] {
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

      const asset: OpportunityAsset = { type: isGlvInfo(info) ? "glv" : "market", address };
      return asset;
    })
    .filter(defined);
}

const collectUserTokenAssets = (tokensData: TokensData | undefined): OpportunityAsset[] => {
  return Object.values(tokensData || {})
    .filter(
      (token) =>
        (token.balance !== undefined && token.balance > 0n) ||
        (token.walletBalance !== undefined && token.walletBalance > 0n) ||
        (token.gmxAccountBalance !== undefined && token.gmxAccountBalance > 0n)
    )
    .map((token) => ({ type: "token", address: token.address }) as OpportunityAsset);
};

export default function EarnAdditionalOpportunitiesPage() {
  const history = useHistory();
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const { data: processedData } = useStakingProcessedData();
  const tokensData = useSelector(selectTokensData);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerDismissed, setIsBannerDismissed] = useLocalStorageSerializeKey(
    "additional-opportunities-banner-dismissed",
    false
  );

  const handleDismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, [setIsBannerDismissed]);

  const { filter: filterParam } = useParams<{ filter: string | undefined }>();

  const isUserDataLoaded = useMemo(() => {
    if (!account) return true;

    return !!marketsInfoData && !!tokensData && !!marketTokensData;
  }, [account, marketsInfoData, tokensData, marketTokensData]);

  const activeFilter = useMemo<OpportunityFilterValue>(() => {
    if (filterParam && AVAILABLE_FILTERS.includes(filterParam as OpportunityFilterValue)) {
      return filterParam as OpportunityFilterValue;
    }

    return account ? "for-me" : "all";
  }, [filterParam, account]);

  const userAssets = useMemo(() => {
    const userAssetKeys = new Set<string>();

    collectUserMarketAssets(marketsInfoData, marketTokensData).forEach((asset) => {
      userAssetKeys.add(getOpportunityAssetKey(asset));
    });

    collectUserTokenAssets(tokensData).forEach((asset) => {
      userAssetKeys.add(getOpportunityAssetKey(asset));
    });

    if (processedData && (processedData.gmxInStakedGmx ?? 0n) > 0n) {
      userAssetKeys.add(getOpportunityAssetKey(ST_GMX_OPPORTUNITY_ASSET));
    }

    return userAssetKeys;
  }, [marketsInfoData, marketTokensData, processedData, tokensData]);

  const allOpportunities = useOpportunities();

  const opportunityTagLabels = useOpportunityTagLabels();

  const hasForMeOpportunities = useMemo(() => {
    return allOpportunities.some((opportunity) =>
      opportunity.assets.some((asset) => userAssets.has(getOpportunityAssetKey(asset)))
    );
  }, [allOpportunities, userAssets]);

  useEffect(() => {
    if (!filterParam && isUserDataLoaded) {
      const defaultFilter = hasForMeOpportunities ? "for-me" : "all";
      history.replace(`/earn/additional_opportunities/${defaultFilter}`);
    }
  }, [filterParam, hasForMeOpportunities, isUserDataLoaded, history]);

  const filteredOpportunities = useMemo(() => {
    let list = allOpportunities;

    if (activeFilter === "for-me") {
      list = list
        .map((opportunity) => {
          const assets = opportunity.assets.filter((asset) => userAssets.has(getOpportunityAssetKey(asset)));
          return assets.length > 0 ? { ...opportunity, assets } : null;
        })
        .filter(defined);
    } else if (activeFilter !== "all") {
      list = list.filter((opportunity) => opportunity.tags.includes(activeFilter));
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      list = list.filter((opportunity) => {
        const matchesName = opportunity.name.toLowerCase().includes(normalizedQuery);
        const matchesTokens = opportunity.assets.some((asset) =>
          getOpportunityAssetLabel(asset, {
            marketsInfoData,
            tokensData,
          })
            ?.toLowerCase()
            .includes(normalizedQuery)
        );
        const matchesTags = opportunity.tags.some((tag) =>
          opportunityTagLabels[tag].toLowerCase().includes(normalizedQuery)
        );

        return matchesName || matchesTokens || matchesTags;
      });
    }

    return list;
  }, [activeFilter, allOpportunities, searchQuery, userAssets, opportunityTagLabels, marketsInfoData, tokensData]);

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
      if (userAssets.size === 0) {
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
  }, [activeFilter, allOpportunities.length, chainId, searchQuery, userAssets.size]);

  return (
    <EarnPageLayout>
      <div className="flex flex-col gap-8">
        <OpportunityFilters activeFilter={activeFilter} search={searchQuery} onSearchChange={setSearchQuery} />

        {!isBannerDismissed && (
          <ColorfulBanner onClose={handleDismissBanner}>
            <Trans>
              Maximize your earnings on your ecosystem tokens (GMX, GLV and GM) with the following integrated partner
              protocols.
            </Trans>
          </ColorfulBanner>
        )}

        {activeFilter === "for-me" && !isUserDataLoaded ? (
          <Loader />
        ) : filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.name}
                opportunity={opportunity}
                marketsInfoData={marketsInfoData}
                tokensData={tokensData}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-12 bg-slate-900 p-20 text-13 text-typography-secondary">{emptyStateMessage}</div>
        )}
      </div>
    </EarnPageLayout>
  );
}
