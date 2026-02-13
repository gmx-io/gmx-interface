import { gql } from "@apollo/client";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { Hash, isAddress, zeroAddress, zeroHash } from "viem";

import { getContract } from "config/contracts";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { getReferralsGraphClient } from "lib/indexers";
import { isAddressZero, isHashZero } from "lib/legacy";
import { useMulticall } from "lib/multicall/useMulticall";
import { basisPointsToFloat } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { ContractsChainId } from "sdk/configs/chains";
import { decodeReferralCode, encodeReferralCode } from "sdk/utils/referrals";

import { REGEX_VERIFY_BYTES32 } from "components/Referrals/referralsHelper";

import { UserReferralInfo } from "../types";

export * from "./useReferralsData";
export * from "./useUserCodesOnAllChain";

export function useUserReferralInfoRequest(
  chainId: ContractsChainId,
  account: string | undefined,
  skipLocalReferralCode = false
): UserReferralInfo | undefined {
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = useUserReferralCode(
    chainId,
    account,
    skipLocalReferralCode
  );

  const { codeOwner, error: codeOwnerError } = useCodeOwner(chainId, account, userReferralCode);
  const { affiliateTier: tierId, error: tierError } = useAffiliateTier(chainId, codeOwner);
  const { totalRebate, discountShare, error: tiersError } = useTiers(chainId, tierId);
  const { discountShare: customDiscountShare, error: discountShareError } = useReferrerDiscountShare(
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

export function useAffiliateTier(chainId: ContractsChainId, account: string | undefined) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const validAccount = useMemo(() => (account && isAddress(account) ? account : undefined), [account]);

  const result = useMulticall(chainId, "affiliate-tier", {
    key: validAccount && referralStorageAddress !== zeroAddress ? [validAccount] : null,
    request: {
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          referrerTiers: {
            methodName: "referrerTiers",
            params: [validAccount!],
          },
        },
      },
    },
    parseResponse: (res) => {
      const tier = res.data.referralStorage.referrerTiers.returnValues[0] as bigint;
      return tier === undefined ? undefined : Number(tier);
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return {
    affiliateTier: result.data,
    mutateReferrerTier: result.mutate,
    error: result.error,
  };
}

export function useTiers(chainId: ContractsChainId, tierLevel: number | undefined) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const tierLevelParam = tierLevel !== undefined ? String(tierLevel) : undefined;

  const result = useMulticall(chainId, "tiers", {
    key: tierLevelParam !== undefined && referralStorageAddress !== zeroAddress ? [tierLevelParam] : null,
    request: {
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          tiers: {
            methodName: "tiers",
            params: [tierLevelParam!],
          },
        },
      },
    },
    parseResponse: (res) => {
      const [totalRebate, discountShare] = res.data.referralStorage.tiers.returnValues as [bigint, bigint];
      return { totalRebate, discountShare };
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return {
    totalRebate: result.data?.totalRebate,
    discountShare: result.data?.discountShare,
    error: result.error,
  };
}

export async function setAffiliateTier(chainId: ContractsChainId, affiliate: string, tierId: number, signer, opts) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const referralStorageContract = new ethers.Contract(referralStorageAddress, abis.ReferralStorage, signer);
  const timelockAddress = await referralStorageContract.gov();
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

export async function getReferralCodeOwner(chainId: ContractsChainId, referralCode: string): Promise<string> {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  if (referralStorageAddress === zeroAddress) {
    return zeroAddress;
  }
  const publicClient = getPublicClientWithRpc(chainId);
  const codeOwner = await publicClient.readContract({
    address: referralStorageAddress,
    abi: abis.ReferralStorage,
    functionName: "codeOwners",
    args: [referralCode],
  });
  return codeOwner;
}

export function useUserReferralCode(
  chainId: ContractsChainId,
  account: string | undefined,
  skipLocalReferralCode = false
) {
  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const referralStorageAddress = getContract(chainId, "ReferralStorage");

  const referralCodeResult = useMulticall(chainId, "user-referral-code", {
    key: account && referralStorageAddress !== zeroAddress ? [account, localStorageCode] : null,
    request: () => {
      const localCodeCall =
        localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
          ? {
              codeOwners: {
                methodName: "codeOwners",
                params: [localStorageCode!],
              },
            }
          : undefined;

      return {
        referralStorage: {
          contractAddress: referralStorageAddress,
          abiId: "ReferralStorage",
          calls: {
            traderReferralCodes: {
              methodName: "traderReferralCodes",
              params: [account!],
            },
            ...localCodeCall,
          },
        },
      };
    },
    parseResponse: (result) => {
      return {
        onChainCode: result.data.referralStorage.traderReferralCodes.returnValues[0] as string,
        localStorageCodeOwner: result.data.referralStorage.codeOwners?.returnValues[0] as string | undefined,
      };
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });
  const onChainCode = referralCodeResult.data?.onChainCode;
  const localStorageCodeOwner = referralCodeResult.data?.localStorageCodeOwner;

  const { attachedOnChain, userReferralCode, userReferralCodeString, referralCodeForTxn } = useMemo(() => {
    let attachedOnChain = false;
    let userReferralCode: string | undefined = undefined;
    let userReferralCodeString: string | undefined = undefined;
    let referralCodeForTxn: string = zeroHash;

    if (skipLocalReferralCode || (onChainCode && !isHashZero(onChainCode))) {
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
      error: referralCodeResult.error,
    };
  }, [localStorageCode, localStorageCodeOwner, onChainCode, referralCodeResult.error, skipLocalReferralCode]);

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn,
  };
}

export function useLocalReferralCode() {
  const userReferralCode = window.localStorage.getItem(REFERRAL_CODE_KEY);

  return useMemo(() => {
    if (!userReferralCode) {
      return undefined;
    }

    const userReferralCodeString = decodeReferralCode(userReferralCode as Hash);

    return {
      userReferralCode,
      userReferralCodeString,
    };
  }, [userReferralCode]);
}

export function useReferrerTier(chainId: ContractsChainId, account: string) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const validAccount = useMemo(() => (isAddress(account) ? account : undefined), [account]);

  const referrerTierResult = useMulticall(chainId, "referrer-tier", {
    key: validAccount && referralStorageAddress !== zeroAddress ? [validAccount] : null,
    request: {
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          referrerTiers: {
            methodName: "referrerTiers",
            params: [validAccount!],
          },
        },
      },
    },
    parseResponse: (result) => {
      return result.data.referralStorage.referrerTiers.returnValues[0] as bigint;
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return {
    referrerTier: referrerTierResult.data,
    mutateReferrerTier: referrerTierResult.mutate,
  };
}

export function useCodeOwner(chainId: ContractsChainId, account: string | undefined, code: string | undefined) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");

  const codeOwnerResult = useMulticall(chainId, "code-owner", {
    key: account && code && referralStorageAddress !== zeroAddress ? [account, code] : null,
    request: {
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          codeOwner: {
            methodName: "codeOwners",
            params: [code],
          },
        },
      },
    },
    parseResponse: (result) => {
      return result.data.referralStorage.codeOwner.returnValues[0] as string;
    },
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return {
    codeOwner: codeOwnerResult.data,
    mutateCodeOwner: codeOwnerResult.mutate,
    error: codeOwnerResult.error,
  };
}

export function useReferrerDiscountShare(chainId: ContractsChainId, owner: string | undefined) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const validOwner = useMemo(() => (owner && isAddress(owner) ? owner.toLowerCase() : undefined), [owner]);

  const result = useMulticall(chainId, "referrer-discount-share", {
    key: validOwner && referralStorageAddress !== zeroAddress ? [validOwner] : null,
    request: {
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          referrerDiscountShares: {
            methodName: "referrerDiscountShares",
            params: [validOwner!],
          },
        },
      },
    },
    parseResponse: (res) => res.data.referralStorage.referrerDiscountShares.returnValues[0] as bigint,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return {
    discountShare: result.data,
    mutateDiscountShare: result.mutate,
    error: result.error,
  };
}

export async function validateReferralCodeExists(referralCode: string, chainId: ContractsChainId) {
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
      ?.query({ query, variables: { account: account?.toLowerCase() } })
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
