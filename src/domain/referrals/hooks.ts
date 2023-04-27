import { BigNumber, BigNumberish, ethers } from "ethers";
import { gql } from "@apollo/client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";

import ReferralStorage from "abis/ReferralStorage.json";
import { MAX_REFERRAL_CODE_LENGTH, isAddressZero, isHashZero } from "lib/legacy";
import { getContract } from "config/contracts";
import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import {
  arbitrumReferralsGraphClient,
  avalancheFujiReferralsGraphClient,
  avalancheReferralsGraphClient,
} from "lib/subgraph/clients";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { getProvider } from "lib/rpc";
import { basisPointsToFloat, bigNumberify } from "lib/numbers";
import { Web3Provider } from "@ethersproject/providers";
import {
  AffiliateTotalStats,
  ReferralCodeStats,
  ReferralsStatsData,
  RewardDistribution,
  RewardDistributionType,
  TraderReferralTotalStats,
  UserReferralInfo,
} from "./types";

const ACTIVE_CHAINS = [ARBITRUM, AVALANCHE];

function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiReferralsGraphClient;
  }

  throw new Error(`Unsupported chain ${chainId}`);
}

export function decodeReferralCode(hexCode) {
  try {
    return ethers.utils.parseBytes32String(hexCode);
  } catch (ex) {
    let code = "";
    hexCode = hexCode.substring(2);
    for (let i = 0; i < 32; i++) {
      code += String.fromCharCode(parseInt(hexCode.substring(i * 2, i * 2 + 2), 16));
    }
    return code.trim();
  }
}

export function encodeReferralCode(code) {
  let final = code.replace(/[^\w_]/g, ""); // replace everything other than numbers, string  and underscor to ''
  if (final.length > MAX_REFERRAL_CODE_LENGTH) {
    return ethers.constants.HashZero;
  }
  return ethers.utils.formatBytes32String(final);
}

async function getCodeOwnersData(network, account, codes = []) {
  if (codes.length === 0 || !account || !network) {
    return undefined;
  }
  const query = gql`
    query allCodes($codes: [String!]!) {
      referralCodes(where: { code_in: $codes }) {
        owner
        id
      }
    }
  `;
  return getGraphClient(network)
    .query({ query, variables: { codes } })
    .then(({ data }) => {
      const { referralCodes } = data;
      const codeOwners = referralCodes.reduce((acc, cv) => {
        acc[cv.id] = cv.owner;
        return acc;
      }, {});
      return codes.map((code) => {
        const owner = codeOwners[code];
        return {
          code,
          codeString: decodeReferralCode(code),
          owner,
          isTaken: Boolean(owner),
          isTakenByCurrentUser: owner && owner.toLowerCase() === account.toLowerCase(),
        };
      });
    });
}

export function useUserCodesOnAllChain(account) {
  const [data, setData] = useState<any>(null);
  const query = gql`
    query referralCodesOnAllChain($account: String!) {
      referralCodes(first: 1000, where: { owner: $account }) {
        code
      }
    }
  `;
  useEffect(() => {
    async function main() {
      const [arbitrumCodes, avalancheCodes] = await Promise.all(
        ACTIVE_CHAINS.map((chainId) => {
          return getGraphClient(chainId)
            .query({ query, variables: { account: (account || "").toLowerCase() } })
            .then(({ data }) => {
              return data.referralCodes.map((c) => c.code);
            });
        })
      );
      const [codeOwnersOnAvax = [], codeOwnersOnArbitrum = []] = await Promise.all([
        getCodeOwnersData(AVALANCHE, account, arbitrumCodes),
        getCodeOwnersData(ARBITRUM, account, avalancheCodes),
      ]);

      setData({
        [ARBITRUM]: codeOwnersOnAvax.reduce((acc, cv) => {
          acc[cv.code] = cv;
          return acc;
        }, {} as any),
        [AVALANCHE]: codeOwnersOnArbitrum.reduce((acc, cv) => {
          acc[cv.code] = cv;
          return acc;
        }, {} as any),
      });
    }

    main();
  }, [account, query]);
  return data;
}

type ReferralsDataResult = {
  referralsData?: ReferralsStatsData;
  loading: boolean;
};

export function useReferralsData(chainId: number, account?: string | null): ReferralsDataResult {
  const [data, setData] = useState<ReferralsStatsData>();
  const [loading, setLoading] = useState(true);
  const ownerOnOtherChain = useUserCodesOnAllChain(account);
  useEffect(() => {
    if (!chainId || !account) {
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
          typeId
          receiver
          markets
          tokens
          amounts
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

    getGraphClient(chainId)
      .query({
        query,
        variables: {
          typeIds: Object.values(RewardDistributionType),
          account: (account || "").toLowerCase(),
          referralTotalStatsId: account && `total:0:${account.toLowerCase()}`,
        },
      })
      .then((res) => {
        const affiliateDistributions: RewardDistribution[] = [];
        const traderDistributions: RewardDistribution[] = [];

        res.data.distributions.forEach((d) => {
          const item = {
            typeId: d.typeId,
            receiver: ethers.utils.getAddress(d.receiver),
            markets: d.markets.map((market) => ethers.utils.getAddress(market)),
            tokens: d.tokens.map((token) => ethers.utils.getAddress(token)),
            amounts: d.amounts.map((a) => bigNumberify(a)!),
            timestamp: parseInt(d.timestamp),
            transactionHash: d.transactionHash,
          };
          if (d.typeId === RewardDistributionType.Rebate || d.typeId === RewardDistributionType.Claim) {
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

        setData({
          affiliateDistributions,
          traderDistributions,
          affiliateReferralCodesStats,
          affiliateTierInfo: res.data.affiliateTierInfo,
          affiliateTotalStats,
          codes: res.data.referralCodes.map((e) => decodeReferralCode(e.code)),
          traderReferralTotalStats,
        });
      })
      // eslint-disable-next-line no-console
      .catch(console.warn)
      .finally(() => {
        setLoading(false);
      });
  }, [setData, chainId, account, ownerOnOtherChain]);

  return {
    referralsData: data,
    loading,
  };
}

export async function registerReferralCode(chainId, referralCode, library, opts) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const referralCodeHex = encodeReferralCode(referralCode);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, library.getSigner());
  return callContract(chainId, contract, "registerCode", [referralCodeHex], opts);
}

export async function setTraderReferralCodeByUser(chainId, referralCode, library, opts) {
  const referralCodeHex = encodeReferralCode(referralCode);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, library.getSigner());
  const codeOwner = await contract.codeOwners(referralCodeHex);
  if (isAddressZero(codeOwner)) {
    const errorMsg = "Referral code does not exist";
    helperToast.error(errorMsg);
    return Promise.reject(errorMsg);
  }
  return callContract(chainId, contract, "setTraderReferralCodeByUser", [referralCodeHex], opts);
}

export async function getReferralCodeOwner(chainId, referralCode) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(undefined, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const codeOwner = await contract.codeOwners(referralCode);
  return codeOwner;
}

export function useUserReferralInfo(
  library: Web3Provider | undefined,
  chainId: number,
  account?: string | null
): UserReferralInfo | undefined {
  const { userReferralCode, userReferralCodeString, attachedOnChain } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { affiliateTier: tierId } = useAffiliateTier(library, chainId, codeOwner);
  const { totalRebate, discountShare } = useTiers(library, chainId, tierId);

  if (!userReferralCode || !userReferralCodeString || !codeOwner || !tierId || !totalRebate || !discountShare) {
    return undefined;
  }

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    affiliate: codeOwner,
    tierId,
    totalRebate,
    totalRebateFactor: basisPointsToFloat(totalRebate),
    discountShare,
    discountFactor: basisPointsToFloat(discountShare),
  };
}

export function useUserReferralCode(library, chainId, account) {
  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: onChainCode } = useSWR<string>(
    account && ["ReferralStorage", chainId, referralStorageAddress, "traderReferralCodes", account],
    { fetcher: contractFetcher(library, ReferralStorage) }
  );

  const { data: localStorageCodeOwner } = useSWR(
    localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
      ? ["ReferralStorage", chainId, referralStorageAddress, "codeOwners", localStorageCode]
      : null,
    { fetcher: contractFetcher(library, ReferralStorage) }
  );

  const { attachedOnChain, userReferralCode, userReferralCodeString } = useMemo(() => {
    if (onChainCode && !isHashZero(onChainCode)) {
      return {
        attachedOnChain: true,
        userReferralCode: onChainCode,
        userReferralCodeString: decodeReferralCode(onChainCode),
      };
    } else if (localStorageCodeOwner && !isAddressZero(localStorageCodeOwner)) {
      return {
        attachedOnChain: false,
        userReferralCode: localStorageCode!,
        userReferralCodeString: decodeReferralCode(localStorageCode),
      };
    }
    return {
      attachedOnChain: false,
    };
  }, [localStorageCode, localStorageCodeOwner, onChainCode]);

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
  };
}

export function useAffiliateTier(library, chainId, account) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: affiliateTier, mutate: mutateReferrerTier } = useSWR<BigNumber>(
    account && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", account],
    {
      fetcher: contractFetcher(library, ReferralStorage),
    }
  );
  return {
    affiliateTier,
    mutateReferrerTier,
  };
}

export function useTiers(library: Web3Provider | undefined, chainId: number, tierLevel?: BigNumberish) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: [totalRebate, discountShare] = [] } = useSWR<BigNumber[]>(
    tierLevel ? [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "tiers", tierLevel] : null,
    {
      fetcher: contractFetcher(library, ReferralStorage),
    }
  );
  return {
    totalRebate,
    discountShare,
  };
}

export function useCodeOwner(library, chainId, account, code) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: codeOwner, mutate: mutateCodeOwner } = useSWR<string>(
    account && code && [`ReferralStorage:codeOwners`, chainId, referralStorageAddress, "codeOwners", code],
    {
      fetcher: contractFetcher(library, ReferralStorage),
    }
  );
  return {
    codeOwner,
    mutateCodeOwner,
  };
}

export async function validateReferralCodeExists(referralCode, chainId) {
  const referralCodeBytes32 = encodeReferralCode(referralCode);
  const referralCodeOwner = await getReferralCodeOwner(chainId, referralCodeBytes32);
  return !isAddressZero(referralCodeOwner);
}

export function useAffiliateCodes(chainId, account) {
  const [affiliateCodes, setAffiliateCodes] = useState({ code: null, success: false });
  const query = gql`
    query userReferralCodes($account: String!) {
      affiliateStats: affiliateStats(
        first: 1000
        orderBy: volume
        orderDirection: desc
        where: { period: total, affiliate: $account }
      ) {
        referralCode
      }
    }
  `;
  useEffect(() => {
    if (!chainId) return;
    getGraphClient(chainId)
      .query({ query, variables: { account: account?.toLowerCase() } })
      .then((res) => {
        const parsedAffiliateCodes = res?.data?.affiliateStats.map((c) => decodeReferralCode(c?.referralCode));
        setAffiliateCodes({ code: parsedAffiliateCodes[0], success: true });
      });
    return () => {
      setAffiliateCodes({ code: null, success: false });
    };
  }, [chainId, query, account]);
  return affiliateCodes;
}
