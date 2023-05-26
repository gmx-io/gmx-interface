import { BigNumber, ethers } from "ethers";
import { gql } from "@apollo/client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";

import ReferralStorage from "abis/ReferralStorage.json";
import Timelock from "abis/Timelock.json";
import { MAX_REFERRAL_CODE_LENGTH, isAddressZero, isHashZero } from "lib/legacy";
import { getContract } from "config/contracts";
import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { arbitrumReferralsGraphClient, avalancheReferralsGraphClient } from "lib/subgraph/clients";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { getProvider } from "lib/rpc";
import { isAddress } from "ethers/lib/utils";

export function getGraphClient(chainId) {
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
        [ARBITRUM, AVALANCHE].map(async (chainId) => {
          try {
            const client = getGraphClient(chainId);
            const { data } = await client.query({ query, variables: { account: (account || "").toLowerCase() } });
            return data.referralCodes.map((c) => c.code);
          } catch (ex) {
            // eslint-disable-next-line no-console
            console.warn("Failed to fetch referral codes on chain %s", chainId, ex);
            return [];
          }
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

export async function setAffiliateTier(chainId: number, affiliate: string, tierId: number, library, opts) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const timelockAddress = getContract(chainId, "Timelock");
  const contract = new ethers.Contract(timelockAddress, Timelock.abi, library.getSigner());
  return callContract(chainId, contract, "setReferrerTier", [referralStorageAddress, affiliate, tierId], opts);
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

export function useUserReferralCode(library, chainId, account) {
  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: onChainCode } = useSWR(
    account && ["ReferralStorage", chainId, referralStorageAddress, "traderReferralCodes", account],
    { fetcher: contractFetcher(library, ReferralStorage) }
  );

  const { data: localStorageCodeOwner } = useSWR(
    localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
      ? ["ReferralStorage", chainId, referralStorageAddress, "codeOwners", localStorageCode]
      : null,
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
  const validAccount = useMemo(() => (isAddress(account) ? account : null), [account]);
  const { data: referrerTier, mutate: mutateReferrerTier } = useSWR<BigNumber>(
    validAccount && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", validAccount],
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
      affiliateCodes: affiliateStats(
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
        const parsedAffiliateCodes = res?.data?.affiliateCodes.map((c) => decodeReferralCode(c?.referralCode));
        setAffiliateCodes({ code: parsedAffiliateCodes[0], success: true });
      });
    return () => {
      setAffiliateCodes({ code: null, success: false });
    };
  }, [chainId, query, account]);
  return affiliateCodes;
}
