import { gql } from "@apollo/client";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { Web3Provider } from "@ethersproject/providers";
import ReferralStorage from "abis/ReferralStorage.json";
import Timelock from "abis/Timelock.json";
import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";
import { ARBITRUM, AVALANCHE, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getContract } from "config/contracts";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { isAddress } from "ethers/lib/utils";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { isAddressZero, isHashZero } from "lib/legacy";
import { basisPointsToFloat } from "lib/numbers";
import { getProvider } from "lib/rpc";

import { getReferralsGraphClient } from "lib/subgraph";
import { UserReferralInfo } from "../types";
import { decodeReferralCode, encodeReferralCode } from "../utils";

export * from "./useReferralsData";

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
  return getReferralsGraphClient(network)
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

export function useUserReferralInfo(
  library: Web3Provider | undefined,
  chainId: number,
  account?: string | null
): UserReferralInfo | undefined {
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = useUserReferralCode(
    library,
    chainId,
    account
  );

  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { affiliateTier: tierId } = useAffiliateTier(library, chainId, codeOwner);
  const { totalRebate, discountShare } = useTiers(library, chainId, tierId);
  const { discountShare: customDiscountShare } = useReferrerDiscountShare(library, chainId, codeOwner);
  const finalDiscountShare = customDiscountShare?.gt(0) ? customDiscountShare : discountShare;
  if (
    !userReferralCode ||
    !userReferralCodeString ||
    !codeOwner ||
    !tierId ||
    !totalRebate ||
    !finalDiscountShare ||
    !referralCodeForTxn
  ) {
    return undefined;
  }

  return {
    userReferralCode,
    userReferralCodeString,
    referralCodeForTxn,
    attachedOnChain,
    affiliate: codeOwner,
    tierId,
    totalRebate,
    totalRebateFactor: basisPointsToFloat(totalRebate),
    discountShare: finalDiscountShare,
    discountFactor: basisPointsToFloat(finalDiscountShare),
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
        SUPPORTED_CHAIN_IDS.map(async (chainId) => {
          try {
            const client = getReferralsGraphClient(chainId);
            const { data } = await client.query({ query, variables: { account: (account || "").toLowerCase() } });
            return data.referralCodes.map((c) => c.code);
          } catch (ex) {
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
  const { data: onChainCode } = useSWR<string>(
    account && ["ReferralStorage", chainId, referralStorageAddress, "traderReferralCodes", account],
    { fetcher: contractFetcher(library, ReferralStorage) }
  );

  const { data: localStorageCodeOwner } = useSWR<string>(
    localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
      ? ["ReferralStorage", chainId, referralStorageAddress, "codeOwners", localStorageCode]
      : null,
    { fetcher: contractFetcher(library, ReferralStorage) }
  );

  const { attachedOnChain, userReferralCode, userReferralCodeString, referralCodeForTxn } = useMemo(() => {
    let attachedOnChain = false;
    let userReferralCode: string | undefined = undefined;
    let userReferralCodeString: string | undefined = undefined;
    let referralCodeForTxn = ethers.constants.HashZero;

    if (onChainCode && !isHashZero(onChainCode)) {
      attachedOnChain = true;
      userReferralCode = onChainCode;
      userReferralCodeString = decodeReferralCode(onChainCode);
    } else if (localStorageCodeOwner && !isAddressZero(localStorageCodeOwner)) {
      attachedOnChain = false;
      userReferralCode = localStorageCode!;
      userReferralCodeString = decodeReferralCode(localStorageCode!);
      referralCodeForTxn = localStorageCode!;
    }

    return {
      attachedOnChain,
      userReferralCode,
      userReferralCodeString,
      referralCodeForTxn,
    };
  }, [localStorageCode, localStorageCodeOwner, onChainCode]);

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn,
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

export function useReferrerDiscountShare(library, chainId, owner) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: discountShare, mutate: mutateDiscountShare } = useSWR<BigNumber | undefined>(
    owner && [
      `ReferralStorage:referrerDiscountShares`,
      chainId,
      referralStorageAddress,
      "referrerDiscountShares",
      owner.toLowerCase(),
    ],
    {
      fetcher: contractFetcher(library, ReferralStorage),
    }
  );
  return {
    discountShare,
    mutateDiscountShare,
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
    getReferralsGraphClient(chainId)
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
