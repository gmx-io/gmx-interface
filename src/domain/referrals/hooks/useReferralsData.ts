import { BigNumber, BigNumberish, ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { useUserCodesOnAllChain } from ".";
import { gql } from "@apollo/client";
import { SUPPORTED_CHAIN_IDS } from "config/chains";
import { decodeReferralCode } from "../utils";
import { getReferralsGraphClient } from "lib/subgraph";
import {
  AffiliateTotalStats,
  RebateDistribution,
  RebateDistributionType,
  ReferralCodeStats,
  ReferralsStats,
  TotalReferralsStats,
  TraderReferralTotalStats,
} from "../types";

export function useReferralsData(account?: string | null) {
  const [data, setData] = useState<TotalReferralsStats>();
  const [loading, setLoading] = useState(true);
  const ownerOnOtherChain = useUserCodesOnAllChain(account);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    const query = gql`
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
    setLoading(true);

    async function getChainReferralData(chainId: number): Promise<ReferralsStats | undefined> {
      const graphClient = getReferralsGraphClient(chainId);
      if (!graphClient) return undefined;

      return getReferralsGraphClient(chainId)
        .query({
          query,
          variables: {
            typeIds: Object.values(RebateDistributionType),
            account: (account || "").toLowerCase(),
            referralTotalStatsId: account && `total:0:${account.toLowerCase()}`,
          },
          fetchPolicy: "no-cache",
        })
        .then((res) => {
          const affiliateDistributions: RebateDistribution[] = [];
          const traderDistributions: RebateDistribution[] = [];

          res.data.distributions.forEach((d) => {
            const item = {
              typeId: d.typeId,
              receiver: ethers.utils.getAddress(d.receiver),
              markets: d.markets.map((market) => ethers.utils.getAddress(market)),
              tokens: d.tokens.map((token) => ethers.utils.getAddress(token)),
              amounts: d.amounts.map((a) => bigNumberify(a)!),
              amountsInUsd: d.amountsInUsd.map((a) => bigNumberify(a)!),
              timestamp: parseInt(d.timestamp),
              transactionHash: d.transactionHash,
            };
            if (d.typeId === RebateDistributionType.Rebate || d.typeId === RebateDistributionType.Claim) {
              affiliateDistributions.push(item);
            } else {
              traderDistributions.push(item);
            }
          });

          function getAffiliateRebateUsd(data: { totalRebateUsd: BigNumberish; discountUsd: BigNumberish }) {
            return bigNumberify(data.totalRebateUsd)!.sub(data.discountUsd);
          }

          const affiliateReferralCodesStats: ReferralCodeStats[] = res.data.affiliateStats.map((e) => ({
            referralCode: decodeReferralCode(e.referralCode),
            trades: parseInt(e.trades),
            tradedReferralsCount: parseInt(e.tradedReferralsCount),
            registeredReferralsCount: parseInt(e.registeredReferralsCount),
            ownerOnOtherChain: ownerOnOtherChain?.[chainId]?.[e.referralCode],
            volume: bigNumberify(e.volume),
            totalRebateUsd: bigNumberify(e.totalRebateUsd),
            affiliateRebateUsd: getAffiliateRebateUsd(e),
            discountUsd: bigNumberify(e.discountUsd),
            v1Data: {
              volume: bigNumberify(e.v1Data.volume),
              totalRebateUsd: bigNumberify(e.v1Data.totalRebateUsd),
              discountUsd: bigNumberify(e.v1Data.discountUsd),
              affiliateRebateUsd: getAffiliateRebateUsd(e.v1Data),
            },
            v2Data: {
              volume: bigNumberify(e.v2Data.volume),
              totalRebateUsd: bigNumberify(e.v2Data.totalRebateUsd),
              discountUsd: bigNumberify(e.v2Data.discountUsd),
              affiliateRebateUsd: getAffiliateRebateUsd(e.v2Data),
            },
          }));

          const affiliateTotalStats: AffiliateTotalStats = res.data.affiliateStats.reduce(
            (acc: AffiliateTotalStats, cv) => {
              acc.trades = acc.trades + parseInt(cv.trades);
              acc.tradedReferralsCount = acc.tradedReferralsCount + parseInt(cv.tradedReferralsCount);
              acc.registeredReferralsCount = acc.registeredReferralsCount + parseInt(cv.registeredReferralsCount);

              acc.totalRebateUsd = acc.totalRebateUsd.add(cv.totalRebateUsd);
              acc.volume = acc.volume.add(cv.volume);
              acc.discountUsd = acc.discountUsd.add(cv.discountUsd);
              acc.affiliateRebateUsd = acc.affiliateRebateUsd.add(getAffiliateRebateUsd(cv));

              acc.v1Data.volume = acc.v1Data.volume.add(cv.v1Data.volume);
              acc.v1Data.totalRebateUsd = acc.v1Data.totalRebateUsd.add(cv.v1Data.totalRebateUsd);
              acc.v1Data.discountUsd = acc.v1Data.discountUsd.add(cv.v1Data.discountUsd);
              acc.v1Data.affiliateRebateUsd = acc.v1Data.affiliateRebateUsd.add(getAffiliateRebateUsd(cv.v1Data));

              acc.v2Data.volume = acc.v2Data.volume.add(cv.v2Data.volume);
              acc.v2Data.totalRebateUsd = acc.v2Data.totalRebateUsd.add(cv.v2Data.totalRebateUsd);
              acc.v2Data.discountUsd = acc.v2Data.discountUsd.add(cv.v2Data.discountUsd);
              acc.v2Data.affiliateRebateUsd = acc.v2Data.affiliateRebateUsd.add(getAffiliateRebateUsd(cv.v2Data));
              return acc;
            },
            {
              trades: 0,
              tradedReferralsCount: 0,
              registeredReferralsCount: 0,
              volume: bigNumberify(0),
              totalRebateUsd: bigNumberify(0),
              affiliateRebateUsd: bigNumberify(0),
              discountUsd: bigNumberify(0),
              v1Data: {
                volume: bigNumberify(0),
                totalRebateUsd: bigNumberify(0),
                affiliateRebateUsd: bigNumberify(0),
                discountUsd: bigNumberify(0),
              },
              v2Data: {
                volume: bigNumberify(0),
                totalRebateUsd: bigNumberify(0),
                affiliateRebateUsd: bigNumberify(0),
                discountUsd: bigNumberify(0),
              },
            } as AffiliateTotalStats
          );

          const traderReferralTotalStats: TraderReferralTotalStats = res.data.referralTotalStats
            ? {
                volume: bigNumberify(res.data.referralTotalStats.volume)!,
                discountUsd: bigNumberify(res.data.referralTotalStats.discountUsd)!,
                v1Data: {
                  volume: bigNumberify(res.data.referralTotalStats.v1Data.volume)!,
                  discountUsd: bigNumberify(res.data.referralTotalStats.v1Data.discountUsd)!,
                },
                v2Data: {
                  volume: bigNumberify(res.data.referralTotalStats.v2Data.volume)!,
                  discountUsd: bigNumberify(res.data.referralTotalStats.v2Data.discountUsd)!,
                },
              }
            : {
                volume: bigNumberify(0)!,
                discountUsd: bigNumberify(0)!,
                v1Data: {
                  volume: bigNumberify(0)!,
                  discountUsd: bigNumberify(0)!,
                },
                v2Data: {
                  volume: bigNumberify(0)!,
                  discountUsd: bigNumberify(0)!,
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

    Promise.all(
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
      .then((res) =>
        res.reduce(
          (accumulator, currentValue) => {
            if (!currentValue) return accumulator;
            const { chainId } = currentValue;
            accumulator.chains[chainId] = currentValue;
            const { affiliateTotalStats, traderReferralTotalStats } = currentValue;

            accumulator.total.registeredReferralsCount += affiliateTotalStats.registeredReferralsCount;
            accumulator.total.affiliateVolume = accumulator.total.affiliateVolume.add(affiliateTotalStats.volume);
            accumulator.total.affiliateRebateUsd = accumulator.total.affiliateRebateUsd.add(
              affiliateTotalStats.affiliateRebateUsd
            );

            accumulator.total.discountUsd = accumulator.total.discountUsd.add(traderReferralTotalStats.discountUsd);
            accumulator.total.traderVolume = accumulator.total.traderVolume.add(traderReferralTotalStats.volume);

            return accumulator;
          },
          {
            total: {
              registeredReferralsCount: 0,
              affiliateVolume: BigNumber.from(0),
              affiliateRebateUsd: BigNumber.from(0),
              discountUsd: BigNumber.from(0),
              traderVolume: BigNumber.from(0),
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
  }, [setData, account, ownerOnOtherChain]);

  return {
    data: data,
    loading,
  };
}
