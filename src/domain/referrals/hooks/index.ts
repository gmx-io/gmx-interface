import { gql } from "@apollo/client";
import { BigNumberish, Signer, ethers, isAddress } from "ethers";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Hash } from "viem";

import { getContract } from "config/contracts";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { isAddressZero, isHashZero } from "lib/legacy";
import { basisPointsToFloat } from "lib/numbers";
import { getProvider } from "lib/rpc";
import { getReferralsGraphClient } from "lib/subgraph";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { abis } from "sdk/abis";
import { UiContractsChain } from "sdk/configs/chains";
import { decodeReferralCode, encodeReferralCode } from "sdk/utils/referrals";

import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";

import { UserReferralInfo } from "../types";

export * from "./useReferralsData";
export * from "./useUserCodesOnAllChain";
export * from "./useReferralCodeFromUrl";

export function useUserReferralInfoRequest(
  signer: Signer | undefined,
  chainId: UiContractsChain,
  account?: string | null,
  skipLocalReferralCode = false
): UserReferralInfo | undefined {
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = useUserReferralCode(
    signer,
    chainId,
    account,
    skipLocalReferralCode
  );

  const { codeOwner, error: codeOwnerError } = useCodeOwner(signer, chainId, account, userReferralCode);
  const { affiliateTier: tierId, error: tierError } = useAffiliateTier(signer, chainId, codeOwner);
  const { totalRebate, discountShare, error: tiersError } = useTiers(signer, chainId, tierId);
  const { discountShare: customDiscountShare, error: discountShareError } = useReferrerDiscountShare(
    signer,
    chainId,
    codeOwner
  );
  const finalDiscountShare = (customDiscountShare ?? 0n) > 0 ? customDiscountShare : discountShare;

  const error = codeOwnerError || tierError || tiersError || discountShareError;

  return useMemo(() => {
    if (
      !userReferralCode ||
      !userReferralCodeString ||
      !codeOwner ||
      tierId === undefined ||
      totalRebate === undefined ||
      finalDiscountShare === undefined ||
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
      error,
    };
  }, [
    userReferralCode,
    userReferralCodeString,
    codeOwner,
    tierId,
    totalRebate,
    finalDiscountShare,
    referralCodeForTxn,
    attachedOnChain,
    error,
  ]);
}

export function useAffiliateTier(signer, chainId, account) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const {
    data: affiliateTier,
    mutate: mutateReferrerTier,
    error,
  } = useSWR<bigint>(
    account && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", account],
    {
      fetcher: contractFetcher(signer, "ReferralStorage") as any,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  return {
    affiliateTier: affiliateTier === undefined ? undefined : Number(affiliateTier),
    mutateReferrerTier,
    error,
  };
}

export function useTiers(signer: Signer | undefined, chainId: UiContractsChain, tierLevel?: BigNumberish) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");

  const { data: [totalRebate, discountShare] = [], error } = useSWR<bigint[]>(
    tierLevel !== undefined
      ? [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "tiers", tierLevel.toString()]
      : null,
    {
      fetcher: contractFetcher(signer, "ReferralStorage") as any,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return {
    totalRebate,
    discountShare,
    error,
  };
}

export async function setAffiliateTier(chainId: UiContractsChain, affiliate: string, tierId: number, signer, opts) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const timelockAddress = getContract(chainId, "Timelock");
  const contract = new ethers.Contract(timelockAddress, abis.Timelock, signer);
  return callContract(chainId, contract, "setReferrerTier", [referralStorageAddress, affiliate, tierId], opts);
}

export async function registerReferralCode(chainId, referralCode, signer, opts) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const referralCodeHex = encodeReferralCode(referralCode);
  const contract = new ethers.Contract(referralStorageAddress, abis.ReferralStorage, signer);

  return callContract(chainId, contract, "registerCode", [referralCodeHex], opts);
}

export async function setTraderReferralCodeByUser(chainId, referralCode, signer, opts) {
  const referralCodeHex = encodeReferralCode(referralCode);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const contract = new ethers.Contract(referralStorageAddress, abis.ReferralStorage, signer);
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
  const contract = new ethers.Contract(referralStorageAddress, abis.ReferralStorage, provider);
  const codeOwner = await contract.codeOwners(referralCode);
  return codeOwner;
}

export function useUserReferralCode(signer, chainId, account, skipLocalReferralCode = false) {
  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const { data: onChainCode, error: onChainCodeError } = useSWR<string>(
    account && ["ReferralStorage", chainId, referralStorageAddress, "traderReferralCodes", account],
    { fetcher: contractFetcher(signer, "ReferralStorage") as any, refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  const { data: localStorageCodeOwner, error: localStorageCodeOwnerError } = useSWR<string>(
    localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
      ? ["ReferralStorage", chainId, referralStorageAddress, "codeOwners", localStorageCode]
      : null,
    { fetcher: contractFetcher(signer, "ReferralStorage") as any, refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  const { attachedOnChain, userReferralCode, userReferralCodeString, referralCodeForTxn } = useMemo(() => {
    let attachedOnChain = false;
    let userReferralCode: string | undefined = undefined;
    let userReferralCodeString: string | undefined = undefined;
    let referralCodeForTxn = ethers.ZeroHash;

    if (skipLocalReferralCode || (onChainCode && !isHashZero(onChainCode))) {
      attachedOnChain = true;
      userReferralCode = onChainCode;
      userReferralCodeString = decodeReferralCode(onChainCode as Hash);
    } else if (localStorageCodeOwner && !isAddressZero(localStorageCodeOwner)) {
      attachedOnChain = false;
      userReferralCode = localStorageCode!;
      userReferralCodeString = decodeReferralCode(localStorageCode! as Hash);
      referralCodeForTxn = localStorageCode!;
    }

    return {
      attachedOnChain,
      userReferralCode,
      userReferralCodeString,
      referralCodeForTxn,
      error: onChainCodeError | localStorageCodeOwnerError,
    };
  }, [
    localStorageCode,
    localStorageCodeOwner,
    localStorageCodeOwnerError,
    onChainCode,
    onChainCodeError,
    skipLocalReferralCode,
  ]);

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn,
  };
}

export function useReferrerTier(signer, chainId, account) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const validAccount = useMemo(() => (isAddress(account) ? account : null), [account]);
  const { data: referrerTier, mutate: mutateReferrerTier } = useSWR<bigint>(
    validAccount && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, "referrerTiers", validAccount],
    {
      fetcher: contractFetcher(signer, "ReferralStorage") as any,
    }
  );
  return {
    referrerTier,
    mutateReferrerTier,
  };
}

export function useCodeOwner(signer, chainId, account, code) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const {
    data: codeOwner,
    mutate: mutateCodeOwner,
    error,
  } = useSWR<string>(
    account && code && [`ReferralStorage:codeOwners`, chainId, referralStorageAddress, "codeOwners", code],
    {
      fetcher: contractFetcher(signer, "ReferralStorage") as any,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  return {
    codeOwner,
    mutateCodeOwner,
    error,
  };
}

export function useReferrerDiscountShare(library, chainId, owner) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const {
    data: discountShare,
    mutate: mutateDiscountShare,
    error,
  } = useSWR<bigint | undefined>(
    owner && [
      `ReferralStorage:referrerDiscountShares`,
      chainId,
      referralStorageAddress,
      "referrerDiscountShares",
      owner.toLowerCase(),
    ],
    {
      fetcher: contractFetcher(library, "ReferralStorage") as any,
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  return {
    discountShare,
    mutateDiscountShare,
    error,
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
