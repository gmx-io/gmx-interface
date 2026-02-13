import useSWR from "swr";
import { getAddress } from "viem";

import { CONTRACTS_CHAIN_IDS } from "config/chains";
import { getIndexerUrl } from "config/indexers";
import { REFERRAL_SUPPORTED_CHAIN_IDS } from "lib/indexers";
import { EMPTY_ARRAY } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { decodeReferralCode } from "sdk/utils/referrals";

import {
  AffiliateTotalStats,
  CodeOwnershipInfo,
  RebateDistribution,
  RebateDistributionType,
  ReferralCodeStats,
  ReferralsStats,
  TotalReferralsStats,
  TraderReferralTotalStats,
} from "../types";
import { getCodeOwnersData } from "./useUserCodesOnAllChain";

type ReferralsGraphqlResponse = {
  distributions: {
    typeId: string;
    receiver: string;
    markets: string[];
    tokens: string[];
    amounts: string[];
    amountsInUsd: string[];
    timestamp: string;
    transactionHash: string;
    id: string;
  }[];
  affiliateStats: {
    referralCode: string;
    trades: string;
    tradedReferralsCount: string;
    registeredReferralsCount: string;
    volume: string;
    totalRebateUsd: string;
    discountUsd: string;
    v1Data: { volume: string; totalRebateUsd: string; discountUsd: string };
    v2Data: { volume: string; totalRebateUsd: string; discountUsd: string };
  }[];
  referralCodes: { code: string }[];
  referralTotalStats: {
    volume: string;
    discountUsd: string;
    v1Data: { volume: string; discountUsd: string };
    v2Data: { volume: string; discountUsd: string };
  } | null;
  affiliateTierInfo: { tierId: number; id: string; discountShare: string } | null;
};

type AffiliateStatRow = ReferralsGraphqlResponse["affiliateStats"][number];

const REFERRALS_GQL = /* GraphQL */ `
  query referralData($typeIds: [String!]!, $account: String!, $referralTotalStatsId: String!) {
    distributions(
      first: 1000
      orderBy: timestamp
      orderDirection: desc
      where: { receiver: $account, typeId_in: $typeIds }
    ) {
      receiver
      typeId
      receiver
      markets
      tokens
      amounts
      amountsInUsd
      transactionHash
      timestamp
      id
    }
    affiliateStats: affiliateStats(
      first: 1000
      orderBy: volume
      orderDirection: desc
      where: { period: total, affiliate: $account }
    ) {
      referralCode
      trades
      tradedReferralsCount
      registeredReferralsCount
      volume
      totalRebateUsd
      discountUsd
      v1Data {
        volume
        discountUsd
        totalRebateUsd
      }
      v2Data {
        volume
        totalRebateUsd
        discountUsd
      }
    }
    referralCodes(first: 1000, where: { owner: $account }) {
      code
    }
    referralTotalStats: referralStat(id: $referralTotalStatsId) {
      volume
      discountUsd
      v1Data {
        volume
        discountUsd
      }
      v2Data {
        volume
        discountUsd
      }
    }
    affiliateTierInfo: affiliate(id: $account) {
      tierId
      id
      discountShare
    }
  }
`;

function getAffiliateRebateUsd(data: { totalRebateUsd: string; discountUsd: string }) {
  return BigInt(data.totalRebateUsd) - BigInt(data.discountUsd);
}

function keepFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

function parseReferralCodeStats(
  affiliateStat: AffiliateStatRow,
  allOwnersOnOtherChainsMap: { [code: string]: { [chainId: number]: CodeOwnershipInfo } }
): ReferralCodeStats {
  return {
    referralCode: decodeReferralCode(affiliateStat.referralCode),
    trades: parseInt(affiliateStat.trades),
    tradedReferralsCount: parseInt(affiliateStat.tradedReferralsCount),
    registeredReferralsCount: parseInt(affiliateStat.registeredReferralsCount),
    allOwnersOnOtherChains: allOwnersOnOtherChainsMap[affiliateStat.referralCode],
    volume: BigInt(affiliateStat.volume),
    totalRebateUsd: BigInt(affiliateStat.totalRebateUsd),
    affiliateRebateUsd: getAffiliateRebateUsd(affiliateStat),
    discountUsd: BigInt(affiliateStat.discountUsd),
    v1Data: {
      volume: BigInt(affiliateStat.v1Data.volume),
      totalRebateUsd: BigInt(affiliateStat.v1Data.totalRebateUsd),
      discountUsd: BigInt(affiliateStat.v1Data.discountUsd),
      affiliateRebateUsd: getAffiliateRebateUsd(affiliateStat.v1Data),
    },
    v2Data: {
      volume: BigInt(affiliateStat.v2Data.volume),
      totalRebateUsd: BigInt(affiliateStat.v2Data.totalRebateUsd),
      discountUsd: BigInt(affiliateStat.v2Data.discountUsd),
      affiliateRebateUsd: getAffiliateRebateUsd(affiliateStat.v2Data),
    },
  };
}

function reduceAffiliateStatsToTotal(affiliateStats: AffiliateStatRow[]): AffiliateTotalStats {
  return affiliateStats.reduce<AffiliateTotalStats>(
    (acc, cv) => {
      acc.trades = acc.trades + parseInt(cv.trades);
      acc.tradedReferralsCount = acc.tradedReferralsCount + parseInt(cv.tradedReferralsCount);
      acc.registeredReferralsCount = acc.registeredReferralsCount + parseInt(cv.registeredReferralsCount);
      acc.totalRebateUsd = acc.totalRebateUsd + BigInt(cv.totalRebateUsd);
      acc.volume = acc.volume + BigInt(cv.volume);
      acc.discountUsd = acc.discountUsd + BigInt(cv.discountUsd);
      acc.affiliateRebateUsd = acc.affiliateRebateUsd + getAffiliateRebateUsd(cv);
      acc.v1Data.volume = acc.v1Data.volume + BigInt(cv.v1Data.volume);
      acc.v1Data.totalRebateUsd = acc.v1Data.totalRebateUsd + BigInt(cv.v1Data.totalRebateUsd);
      acc.v1Data.discountUsd = acc.v1Data.discountUsd + BigInt(cv.v1Data.discountUsd);
      acc.v1Data.affiliateRebateUsd = acc.v1Data.affiliateRebateUsd + getAffiliateRebateUsd(cv.v1Data);
      acc.v2Data.volume = acc.v2Data.volume + BigInt(cv.v2Data.volume);
      acc.v2Data.totalRebateUsd = acc.v2Data.totalRebateUsd + BigInt(cv.v2Data.totalRebateUsd);
      acc.v2Data.discountUsd = acc.v2Data.discountUsd + BigInt(cv.v2Data.discountUsd);
      acc.v2Data.affiliateRebateUsd = acc.v2Data.affiliateRebateUsd + getAffiliateRebateUsd(cv.v2Data);
      return acc;
    },
    {
      trades: 0,
      tradedReferralsCount: 0,
      registeredReferralsCount: 0,
      volume: 0n,
      totalRebateUsd: 0n,
      affiliateRebateUsd: 0n,
      discountUsd: 0n,
      v1Data: {
        volume: 0n,
        totalRebateUsd: 0n,
        affiliateRebateUsd: 0n,
        discountUsd: 0n,
      },
      v2Data: {
        volume: 0n,
        totalRebateUsd: 0n,
        affiliateRebateUsd: 0n,
        discountUsd: 0n,
      },
    }
  );
}

async function fetchChainReferralData(chainId: number, account: string): Promise<ReferralsStats> {
  const referralsUrl = getIndexerUrl(chainId, "referrals");
  if (!referralsUrl) {
    throw new Error(`Referrals URL not found for chain ${chainId}`);
  }

  const res = await graphqlFetcher<ReferralsGraphqlResponse>(referralsUrl, REFERRALS_GQL, {
    typeIds: Object.values(RebateDistributionType),
    account: account.toLowerCase(),
    referralTotalStatsId: `total:0:${account.toLowerCase()}`,
  });

  if (!res) {
    throw new Error(`Failed to fetch referrals data for chain ${chainId}`);
  }

  const affiliateDistributions: RebateDistribution[] = [];
  const traderDistributions: RebateDistribution[] = [];

  for (const d of res.distributions) {
    const item: RebateDistribution = {
      typeId: d.typeId as RebateDistributionType,
      receiver: getAddress(d.receiver),
      markets: d.markets.map((market) => getAddress(market)),
      tokens: d.tokens.map((token) => getAddress(token)),
      amounts: d.amounts.map(BigInt),
      amountsInUsd: d.amountsInUsd.map(BigInt),
      timestamp: parseInt(d.timestamp),
      transactionHash: d.transactionHash,
      id: d.id,
    };

    if (d.typeId === RebateDistributionType.Rebate || d.typeId === RebateDistributionType.Claim) {
      affiliateDistributions.push(item);
    } else {
      traderDistributions.push(item);
    }
  }

  const referralCodes = res.referralCodes.map((e) => e.code);
  const allCodesOwnersOnOtherChains = await Promise.allSettled(
    CONTRACTS_CHAIN_IDS.filter((otherChainId) => otherChainId !== chainId).map(async (otherChainId) => ({
      chainId: otherChainId,
      data: await getCodeOwnersData(otherChainId, account, referralCodes),
    }))
  ).then((allChainsResult) => allChainsResult.filter(keepFulfilled).map((r) => r.value));

  const allOwnersOnOtherChainsMap: {
    [code: string]: {
      [chainId: number]: CodeOwnershipInfo;
    };
  } = {};
  for (const chainCodesOwners of allCodesOwnersOnOtherChains) {
    for (const codeOwnershipInfo of chainCodesOwners.data || EMPTY_ARRAY) {
      if (!allOwnersOnOtherChainsMap[codeOwnershipInfo.code]) {
        allOwnersOnOtherChainsMap[codeOwnershipInfo.code] = {};
      }
      allOwnersOnOtherChainsMap[codeOwnershipInfo.code][chainCodesOwners.chainId] = codeOwnershipInfo;
    }
  }

  const affiliateReferralCodesStats: ReferralCodeStats[] = res.affiliateStats
    .filter((affiliateStat) => res.referralCodes.some((code) => code.code === affiliateStat.referralCode))
    .map((affiliateStat) => parseReferralCodeStats(affiliateStat, allOwnersOnOtherChainsMap));

  const affiliateTotalStats = reduceAffiliateStatsToTotal(res.affiliateStats);

  const traderReferralTotalStats: TraderReferralTotalStats = res.referralTotalStats
    ? {
        volume: BigInt(res.referralTotalStats.volume)!,
        discountUsd: BigInt(res.referralTotalStats.discountUsd)!,
        v1Data: {
          volume: BigInt(res.referralTotalStats.v1Data.volume)!,
          discountUsd: BigInt(res.referralTotalStats.v1Data.discountUsd)!,
        },
        v2Data: {
          volume: BigInt(res.referralTotalStats.v2Data.volume)!,
          discountUsd: BigInt(res.referralTotalStats.v2Data.discountUsd)!,
        },
      }
    : {
        volume: 0n,
        discountUsd: 0n,
        v1Data: { volume: 0n, discountUsd: 0n },
        v2Data: { volume: 0n, discountUsd: 0n },
      };

  return {
    chainId,
    affiliateDistributions,
    traderDistributions,
    affiliateReferralCodesStats,
    affiliateTierInfo: res.affiliateTierInfo
      ? {
          id: res.affiliateTierInfo.id,
          tierId: res.affiliateTierInfo.tierId,
          discountShare: BigInt(res.affiliateTierInfo.discountShare),
        }
      : undefined,
    affiliateTotalStats,
    traderReferralTotalStats,
    codes: res.referralCodes.map((e) => decodeReferralCode(e.code)),
  };
}

function aggregateChainResultsToTotalStats(chainResults: ReferralsStats[]): TotalReferralsStats {
  return chainResults.reduce<TotalReferralsStats>(
    (accumulator, currentValue) => {
      const { chainId } = currentValue;
      accumulator.chains[chainId] = currentValue;
      const { affiliateTotalStats, traderReferralTotalStats } = currentValue;
      accumulator.total.registeredReferralsCount += affiliateTotalStats.registeredReferralsCount;
      accumulator.total.affiliateVolume = accumulator.total.affiliateVolume + affiliateTotalStats.volume;
      accumulator.total.affiliateRebateUsd =
        accumulator.total.affiliateRebateUsd + affiliateTotalStats.affiliateRebateUsd;
      accumulator.total.discountUsd = accumulator.total.discountUsd + traderReferralTotalStats.discountUsd;
      accumulator.total.traderVolume = accumulator.total.traderVolume + traderReferralTotalStats.volume;
      return accumulator;
    },
    {
      total: {
        registeredReferralsCount: 0,
        affiliateVolume: 0n,
        affiliateRebateUsd: 0n,
        discountUsd: 0n,
        traderVolume: 0n,
      },
      chains: {},
    } satisfies TotalReferralsStats
  );
}

export async function fetchReferralsData(account: string): Promise<TotalReferralsStats> {
  const allChainResults = await Promise.allSettled(
    REFERRAL_SUPPORTED_CHAIN_IDS.map(async (chainId) => fetchChainReferralData(chainId, account))
  );

  const chainResults = allChainResults.filter(keepFulfilled).map((r) => r.value);

  return aggregateChainResultsToTotalStats(chainResults);
}

export function getReferralsDataKey(account?: string | null) {
  return account ? ["referrals-data", account] : null;
}
export function useReferralsData(account?: string | null) {
  const { data, isLoading } = useSWR<TotalReferralsStats>(
    getReferralsDataKey(account),
    () => fetchReferralsData(account!),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    isLoading,
  };
}
