import { ethers } from "ethers";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { decodeReferralCode, getGraphClient, useUserCodesOnAllChain } from ".";
import { gql } from "@apollo/client";
import { ACTIVE_PRODUCTION_CHAINS } from "config/chains";
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
          amount
          typeId
          token
          transactionHash
          timestamp
        }
        referrerTotalStats: referrerStats(
          first: 1000
          orderBy: volume
          orderDirection: desc
          where: { period: total, referrer: $account }
        ) {
          referralCode
          volume
          trades
          tradedReferralsCount
          registeredReferralsCount
          totalRebateUsd
          discountUsd
        }
        referrerLastDayStats: referrerStats(
          first: 1000
          where: { period: daily, referrer: $account, timestamp: $timestamp }
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
        referrerTierInfo: referrer(id: $account) {
          tierId
          id
          discountShare
        }
      }
    `;
    setLoading(true);

    async function getChainReferralData(chainId: number) {
      return getGraphClient(chainId)
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
            const item = {
              timestamp: parseInt(d.timestamp),
              transactionHash: d.transactionHash,
              receiver: ethers.utils.getAddress(d.receiver),
              amount: bigNumberify(d.amount),
              typeId: d.typeId,
              token: ethers.utils.getAddress(d.token),
            };
            if (d.typeId === DISTRIBUTION_TYPE_REBATES) {
              rebateDistributions.push(item);
            } else {
              discountDistributions.push(item);
            }
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
                acc.referrerRebates = acc.totalRebateUsd.sub(acc.discountUsd);
                return acc;
              },
              {
                totalRebateUsd: bigNumberify(0),
                volume: bigNumberify(0),
                discountUsd: bigNumberify(0),
                referrerRebates: bigNumberify(0),
                trades: 0,
                tradedReferralsCount: 0,
                registeredReferralsCount: 0,
              } as any
            );
          }

          let referrerTotalStats = res.data.referrerTotalStats.map(prepareStatsItem);
          return {
            rebateDistributions,
            discountDistributions,
            referrerTotalStats,
            referrerTierInfo: res.data.referrerTierInfo,
            referrerLastDayStats: res.data.referrerLastDayStats.map(prepareStatsItem),
            cumulativeStats: getCumulativeStats(referrerTotalStats),
            codes: res.data.referralCodes.map((e) => decodeReferralCode(e.code)),
            referralTotalStats: res.data.referralTotalStats
              ? {
                  volume: bigNumberify(res.data.referralTotalStats.volume),
                  discountUsd: bigNumberify(res.data.referralTotalStats.discountUsd),
                }
              : {
                  volume: bigNumberify(0),
                  discountUsd: bigNumberify(0),
                },
          };
        });
    }

    function accumulateResults(accumulator, currentValue, index) {
      const chainId = ACTIVE_PRODUCTION_CHAINS[index];

      accumulator[chainId] = currentValue;
      accumulator.total.registeredReferralsCount += currentValue.cumulativeStats.registeredReferralsCount;
      accumulator.total.affiliatesVolume = accumulator.total.affiliatesVolume.add(currentValue.cumulativeStats.volume);
      accumulator.total.referrerRebates = accumulator.total.referrerRebates
        .add(currentValue.cumulativeStats.totalRebateUsd)
        .sub(currentValue.cumulativeStats.discountUsd);
      accumulator.total.discountUsd = accumulator.total.discountUsd.add(
        currentValue.referralTotalStats.discountUsd || 0
      );
      accumulator.total.tradersVolume = accumulator.total.tradersVolume.add(
        currentValue.referralTotalStats.volume || 0
      );

      return accumulator;
    }

    const initialAccumulator = {
      total: {
        registeredReferralsCount: 0,
        affiliatesVolume: bigNumberify(0),
        referrerRebates: bigNumberify(0),
        discountUsd: bigNumberify(0),
        tradersVolume: bigNumberify(0),
      },
    };

    Promise.all(ACTIVE_PRODUCTION_CHAINS.map((chainId) => getChainReferralData(chainId)))
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
