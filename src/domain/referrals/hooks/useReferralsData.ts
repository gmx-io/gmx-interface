import { gql } from "@apollo/client";
import { SUPPORTED_CHAIN_IDS } from "config/chains";
import { BigNumberish, ethers } from "ethers";
import { BN_ZERO } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { getReferralsGraphClient } from "lib/subgraph";
import { useEffect, useState } from "react";
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
import { decodeReferralCode } from "../utils";
import { getCodeOwnersData } from "./useUserCodesOnAllChain";

const REFERRALS_GQL = gql`
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

export function useReferralsData(account?: string | null) {
  const [data, setData] = useState<TotalReferralsStats>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    setLoading(true);

    async function getChainReferralData(chainId: number): Promise<ReferralsStats | undefined> {
      const graphClient = getReferralsGraphClient(chainId);
      if (!graphClient) return undefined;

      return getReferralsGraphClient(chainId)
        .query({
          query: REFERRALS_GQL,
          variables: {
            typeIds: Object.values(RebateDistributionType),
            account: (account || "").toLowerCase(),
            referralTotalStatsId: account && `total:0:${account.toLowerCase()}`,
          },
          fetchPolicy: "no-cache",
        })
        .then(async (res) => {
          const affiliateDistributions: RebateDistribution[] = [];
          const traderDistributions: RebateDistribution[] = [];

          res.data.distributions.forEach((d) => {
            const item = {
              typeId: d.typeId,
              receiver: ethers.getAddress(d.receiver),
              markets: d.markets.map((market) => ethers.getAddress(market)),
              tokens: d.tokens.map((token) => ethers.getAddress(token)),
              amounts: d.amounts.map((a) => BigInt(a)),
              amountsInUsd: d.amountsInUsd.map((a) => BigInt(a)),
              timestamp: parseInt(d.timestamp),
              transactionHash: d.transactionHash,
              id: d.id,
            };
            if (d.typeId === RebateDistributionType.Rebate || d.typeId === RebateDistributionType.Claim) {
              affiliateDistributions.push(item);
            } else {
              traderDistributions.push(item);
            }
          });

          function getAffiliateRebateUsd(data: { totalRebateUsd: BigNumberish; discountUsd: BigNumberish }) {
            return BigInt(data.totalRebateUsd) - BigInt(data.discountUsd);
          }

          //#region Code Ownership Info
          // Getting all owners of the referral codes on other chains

          const referralCodes = res.data.referralCodes.map((e) => e.code);
          const allCodesOwnersOnOtherChains = await Promise.allSettled(
            SUPPORTED_CHAIN_IDS.filter((otherChainId) => otherChainId !== chainId).map(async (otherChainId) => ({
              chainId: otherChainId,
              data: await getCodeOwnersData(otherChainId, account, referralCodes),
            }))
          ).then((allChainsResult) =>
            allChainsResult
              .filter(
                (
                  chainResult
                ): chainResult is PromiseFulfilledResult<{
                  chainId: number;
                  data: CodeOwnershipInfo[] | undefined;
                }> => chainResult.status === "fulfilled"
              )
              .map((r) => r.value)
          );

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
          //#endregion

          const affiliateReferralCodesStats: ReferralCodeStats[] = res.data.affiliateStats
            .filter((e) => {
              return res.data.referralCodes.some((c) => c.code === e.referralCode);
            })
            .map(
              (e): ReferralCodeStats => ({
                referralCode: decodeReferralCode(e.referralCode),
                trades: parseInt(e.trades),
                tradedReferralsCount: parseInt(e.tradedReferralsCount),
                registeredReferralsCount: parseInt(e.registeredReferralsCount),
                allOwnersOnOtherChains: allOwnersOnOtherChainsMap[e.referralCode],
                volume: BigInt(e.volume),
                totalRebateUsd: BigInt(e.totalRebateUsd),
                affiliateRebateUsd: getAffiliateRebateUsd(e),
                discountUsd: BigInt(e.discountUsd),
                v1Data: {
                  volume: BigInt(e.v1Data.volume),
                  totalRebateUsd: BigInt(e.v1Data.totalRebateUsd),
                  discountUsd: BigInt(e.v1Data.discountUsd),
                  affiliateRebateUsd: getAffiliateRebateUsd(e.v1Data),
                },
                v2Data: {
                  volume: BigInt(e.v2Data.volume),
                  totalRebateUsd: BigInt(e.v2Data.totalRebateUsd),
                  discountUsd: BigInt(e.v2Data.discountUsd),
                  affiliateRebateUsd: getAffiliateRebateUsd(e.v2Data),
                },
              })
            );

          const affiliateTotalStats: AffiliateTotalStats = res.data.affiliateStats.reduce(
            (acc: AffiliateTotalStats, cv) => {
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
              volume: BN_ZERO,
              totalRebateUsd: BN_ZERO,
              affiliateRebateUsd: BN_ZERO,
              discountUsd: BN_ZERO,
              v1Data: {
                volume: BN_ZERO,
                totalRebateUsd: BN_ZERO,
                affiliateRebateUsd: BN_ZERO,
                discountUsd: BN_ZERO,
              },
              v2Data: {
                volume: BN_ZERO,
                totalRebateUsd: BN_ZERO,
                affiliateRebateUsd: BN_ZERO,
                discountUsd: BN_ZERO,
              },
            } as AffiliateTotalStats
          );

          const traderReferralTotalStats: TraderReferralTotalStats = res.data.referralTotalStats
            ? {
                volume: BigInt(res.data.referralTotalStats.volume)!,
                discountUsd: BigInt(res.data.referralTotalStats.discountUsd)!,
                v1Data: {
                  volume: BigInt(res.data.referralTotalStats.v1Data.volume)!,
                  discountUsd: BigInt(res.data.referralTotalStats.v1Data.discountUsd)!,
                },
                v2Data: {
                  volume: BigInt(res.data.referralTotalStats.v2Data.volume)!,
                  discountUsd: BigInt(res.data.referralTotalStats.v2Data.discountUsd)!,
                },
              }
            : {
                volume: BN_ZERO,
                discountUsd: BN_ZERO,
                v1Data: {
                  volume: BN_ZERO,
                  discountUsd: BN_ZERO,
                },
                v2Data: {
                  volume: BN_ZERO,
                  discountUsd: BN_ZERO,
                },
              };

          return {
            chainId,
            affiliateDistributions,
            traderDistributions,
            affiliateReferralCodesStats,
            affiliateTierInfo: res.data.affiliateTierInfo,
            affiliateTotalStats,
            traderReferralTotalStats,
            codes: res.data.referralCodes.map((e) => decodeReferralCode(e.code)),
          } as ReferralsStats;
        });
    }

    Promise.allSettled(
      SUPPORTED_CHAIN_IDS.map(async (chainId) => {
        try {
          const data = await getChainReferralData(chainId);
          return data;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          return undefined;
        }
      })
    )
      .then((allChainResults) =>
        allChainResults
          .filter<PromiseFulfilledResult<ReferralsStats>>(
            (maybeFulfilledChainResult): maybeFulfilledChainResult is PromiseFulfilledResult<ReferralsStats> =>
              maybeFulfilledChainResult.status === "fulfilled"
          )
          .map((fulfilledChainResult) => fulfilledChainResult.value)
          .reduce(
            (accumulator, currentValue) => {
              if (!currentValue) return accumulator;
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
                affiliateVolume: BN_ZERO,
                affiliateRebateUsd: BN_ZERO,
                discountUsd: BN_ZERO,
                traderVolume: BN_ZERO,
              },
              chains: {},
            } as TotalReferralsStats
          )
      )
      .then(setData)
      // eslint-disable-next-line no-console
      .catch(console.warn)
      .finally(() => {
        setLoading(false);
      });
  }, [setData, account]);

  return {
    data: data,
    loading,
  };
}
