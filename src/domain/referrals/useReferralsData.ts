import { ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { decodeReferralCode, useUserCodesOnAllChain } from ".";
import { gql } from "@apollo/client";
import { SUPPORTED_CHAIN_IDS } from "config/chains";
import { getReferralsGraphClient } from "lib/subgraph";
const DISTRIBUTION_TYPE_REBATES = "1";
const DISTRIBUTION_TYPE_DISCOUNT = "2";

export default function useReferralsData(account) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const ownerOnOtherChain = useUserCodesOnAllChain(account);
  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }
    const startOfDayTimestamp = Math.floor(Math.floor(Date.now() / 1000) / 86400) * 86400;

    const query = gql`
      query referralData($typeIds: [String!]!, $account: String!, $timestamp: Int!, $referralTotalStatsId: String!) {
        distributions(
          first: 1000
          orderBy: timestamp
          orderDirection: desc
          where: { receiver: $account, typeId_in: $typeIds }
        ) {
          receiver
          amounts
          typeId
          tokens
          transactionHash
          timestamp
          id
        }
        affiliateTotalStats: affiliateStats(
          first: 1000
          orderBy: volume
          orderDirection: desc
          where: { period: total, affiliate: $account }
        ) {
          referralCode
          volume
          trades
          tradedReferralsCount
          registeredReferralsCount
          totalRebateUsd
          discountUsd
        }
        affiliateLastDayStats: affiliateStats(
          first: 1000
          where: { period: daily, affiliate: $account, timestamp: $timestamp }
        ) {
          referralCode
          volume
          trades
          tradedReferralsCount
          registeredReferralsCount
          totalRebateUsd
          discountUsd
        }
        referralCodes(first: 1000, where: { owner: $account }) {
          code
        }
        referralTotalStats: referralStat(id: $referralTotalStatsId) {
          volume
          discountUsd
        }
        affiliateTierInfo: affiliate(id: $account) {
          tierId
          id
          discountShare
        }
      }
    `;
    setLoading(true);

    async function getChainReferralData(chainId: number) {
      const graphClient = getReferralsGraphClient(chainId);
      if (!graphClient) return null;
      return getReferralsGraphClient(chainId)
        .query({
          query,
          variables: {
            typeIds: [DISTRIBUTION_TYPE_REBATES, DISTRIBUTION_TYPE_DISCOUNT],
            account: (account || "").toLowerCase(),
            timestamp: startOfDayTimestamp,
            referralTotalStatsId: account && `total:0:${account.toLowerCase()}`,
          },
        })
        .then((res) => {
          const rebateDistributions: any[] = [];
          const discountDistributions: any[] = [];
          res.data.distributions.forEach((d) => {
            d.amounts.forEach((amount, i) => {
              const item = {
                timestamp: parseInt(d.timestamp),
                transactionHash: d.transactionHash,
                receiver: ethers.getAddress(d.receiver),
                amount: bigNumberify(amount),
                typeId: d.typeId,
                token: ethers.getAddress(d.tokens[i]),
              };
              if (d.typeId === DISTRIBUTION_TYPE_REBATES) {
                rebateDistributions.push(item);
              } else {
                discountDistributions.push(item);
              }
            });
          });

          function prepareStatsItem(e) {
            return {
              volume: bigNumberify(e.volume),
              trades: parseInt(e.trades),
              tradedReferralsCount: parseInt(e.tradedReferralsCount),
              registeredReferralsCount: parseInt(e.registeredReferralsCount),
              totalRebateUsd: bigNumberify(e.totalRebateUsd),
              discountUsd: bigNumberify(e.discountUsd),
              referralCode: decodeReferralCode(e.referralCode),
              ownerOnOtherChain: ownerOnOtherChain?.[chainId][e.referralCode],
            };
          }

          function getCumulativeStats(data: any[] = []) {
            return data.reduce(
              (acc, cv) => {
                acc.totalRebateUsd = acc.totalRebateUsd.add(cv.totalRebateUsd);
                acc.volume = acc.volume.add(cv.volume);
                acc.discountUsd = acc.discountUsd.add(cv.discountUsd);
                acc.trades = acc.trades + cv.trades;
                acc.tradedReferralsCount = acc.tradedReferralsCount + cv.tradedReferralsCount;
                acc.registeredReferralsCount = acc.registeredReferralsCount + cv.registeredReferralsCount;
                acc.affiliateRebates = acc.totalRebateUsd.sub(acc.discountUsd);
                return acc;
              },
              {
                totalRebateUsd: 0n,
                volume: 0n,
                discountUsd: 0n,
                affiliateRebates: 0n,
                trades: 0,
                tradedReferralsCount: 0,
                registeredReferralsCount: 0,
              } as any
            );
          }

          let affiliateTotalStats = res.data.affiliateTotalStats.map(prepareStatsItem);
          return {
            chainId,
            rebateDistributions,
            discountDistributions,
            affiliateTotalStats,
            affiliateTierInfo: res.data.affiliateTierInfo,
            affiliateLastDayStats: res.data.affiliateLastDayStats.map(prepareStatsItem),
            cumulativeStats: getCumulativeStats(affiliateTotalStats),
            codes: res.data.referralCodes.map((e) => decodeReferralCode(e.code)),
            referralTotalStats: res.data.referralTotalStats
              ? {
                  volume: bigNumberify(res.data.referralTotalStats.volume),
                  discountUsd: bigNumberify(res.data.referralTotalStats.discountUsd),
                }
              : {
                  volume: 0n,
                  discountUsd: 0n,
                },
          };
        });
    }

    function updateTotalStats(accumulator, currentValue) {
      const { cumulativeStats = {}, referralTotalStats = {} } = currentValue;

      accumulator.total.registeredReferralsCount += cumulativeStats.registeredReferralsCount || 0;
      accumulator.total.affiliatesVolume = accumulator.total.affiliatesVolume.add(cumulativeStats.volume || 0);
      accumulator.total.affiliateRebates = accumulator.total.affiliateRebates
        .add(cumulativeStats.totalRebateUsd || 0)
        .sub(cumulativeStats.discountUsd || 0);
      accumulator.total.discountUsd = accumulator.total.discountUsd.add(referralTotalStats.discountUsd || 0);
      accumulator.total.tradersVolume = accumulator.total.tradersVolume.add(referralTotalStats.volume || 0);

      return accumulator;
    }

    function accumulateResults(accumulator, currentValue) {
      if (!currentValue) return accumulator;
      const { chainId } = currentValue;
      accumulator[chainId] = currentValue;
      return updateTotalStats(accumulator, currentValue);
    }

    const initialAccumulator = {
      total: {
        registeredReferralsCount: 0,
        affiliatesVolume: 0n,
        affiliateRebates: 0n,
        discountUsd: 0n,
        tradersVolume: 0n,
      },
    };

    Promise.all(
      SUPPORTED_CHAIN_IDS.map(async (chainId) => {
        try {
          const data = await getChainReferralData(chainId);
          return data;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Failed to fetch referral data on chain %s", chainId, e);
          return null;
        }
      })
    )
      .then((res) => res.reduce(accumulateResults, initialAccumulator))
      .then(setData)
      // eslint-disable-next-line no-console
      .catch(console.warn)
      .finally(() => {
        setLoading(false);
      });
  }, [setData, account, ownerOnOtherChain]);

  return {
    data: data || null,
    loading,
  };
}
