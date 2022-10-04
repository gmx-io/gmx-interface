import { ethers } from "ethers";
import { gql } from "@apollo/client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";

import ReferralStorage from "abis/ReferralStorage.json";
import { MAX_REFERRAL_CODE_LENGTH, isAddressZero, isHashZero } from "lib/legacy";
import { getContract } from "config/contracts";
import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { arbitrumReferralsGraphClient, avalancheReferralsGraphClient } from "lib/subgraph/clients";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { getProvider } from "lib/rpc";
import { bigNumberify } from "lib/numbers";

const ACTIVE_CHAINS = [ARBITRUM, AVALANCHE];
const DISTRIBUTION_TYPE_REBATES = "1";
const DISTRIBUTION_TYPE_DISCOUNT = "2";

function getGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
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
  const [data, setData] = useState(null);
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
        }, {}),
        [AVALANCHE]: codeOwnersOnArbitrum.reduce((acc, cv) => {
          acc[cv.code] = cv;
          return acc;
        }, {}),
      });
    }

    main();
  }, [account, query]);
  return data;
}

export function useReferralsData(chainId, account) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const ownerOnOtherChain = useUserCodesOnAllChain(account);
  useEffect(() => {
    if (!chainId || !account) {
      setLoading(false);
      return;
    }
    const startOfDayTimestamp = Math.floor(parseInt(Date.now() / 1000) / 86400) * 86400;
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

    getGraphClient(chainId)
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
        const rebateDistributions = [];
        const discountDistributions = [];
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

        function getCumulativeStats(data = []) {
          return data.reduce(
            (acc, cv) => {
              acc.totalRebateUsd = acc.totalRebateUsd.add(cv.totalRebateUsd);
              acc.volume = acc.volume.add(cv.volume);
              acc.discountUsd = acc.discountUsd.add(cv.discountUsd);
              acc.trades = acc.trades + cv.trades;
              acc.tradedReferralsCount = acc.tradedReferralsCount + cv.tradedReferralsCount;
              acc.registeredReferralsCount = acc.registeredReferralsCount + cv.registeredReferralsCount;
              return acc;
            },
            {
              totalRebateUsd: bigNumberify(0),
              volume: bigNumberify(0),
              discountUsd: bigNumberify(0),
              trades: 0,
              tradedReferralsCount: 0,
              registeredReferralsCount: 0,
            }
          );
        }

        let referrerTotalStats = res.data.referrerTotalStats.map(prepareStatsItem);
        setData({
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
        });
      })
      .catch(console.warn)
      .finally(() => {
        setLoading(false);
      });
  }, [setData, chainId, account, ownerOnOtherChain]);

  return {
    data: data || null,
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
  const provider = getProvider(null, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const codeOwner = await contract.codeOwners(referralCode);
  return codeOwner;
}

export function useUserReferralCode(library, chainId, account) {
  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: onChainCode } = useSWR(
    account && ["ReferralStorage", chainId, referralStorageAddress, "traderReferralCodes", account],
    { fetcher: contractFetcher(library, ReferralStorage) }
  );
  const { data: localStorageCodeOwner } = useSWR(
    localStorageCode &&
      REGEX_VERIFY_BYTES32.test(localStorageCode) && [
        "ReferralStorage",
        chainId,
        referralStorageAddress,
        "codeOwners",
        localStorageCode,
      ],
    { fetcher: contractFetcher(library, ReferralStorage) }
  );
  const [attachedOnChain, userReferralCode, userReferralCodeString] = useMemo(() => {
    if (onChainCode && !isHashZero(onChainCode)) {
      return [true, onChainCode, decodeReferralCode(onChainCode)];
    } else if (localStorageCodeOwner && !isAddressZero(localStorageCodeOwner)) {
      return [false, localStorageCode, decodeReferralCode(localStorageCode)];
    }
    return [false];
  }, [localStorageCode, localStorageCodeOwner, onChainCode]);

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
  };
}

export function useReferrerTier(library, chainId, account) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: referrerTier, mutate: mutateReferrerTier } = useSWR(
    account && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", account],
    {
      fetcher: contractFetcher(library, ReferralStorage),
    }
  );
  return {
    referrerTier,
    mutateReferrerTier,
  };
}

export function useCodeOwner(library, chainId, account, code) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: codeOwner, mutate: mutateCodeOwner } = useSWR(
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
      referrerTotalStats: referrerStats(
        first: 1000
        orderBy: volume
        orderDirection: desc
        where: { period: total, referrer: $account }
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
        const parsedAffiliateCodes = res?.data?.referrerTotalStats.map((c) => decodeReferralCode(c?.referralCode));
        setAffiliateCodes({ code: parsedAffiliateCodes[0], success: true });
      });
    return () => {
      setAffiliateCodes({ code: null, success: false });
    };
  }, [chainId, query, account]);
  return affiliateCodes;
}
