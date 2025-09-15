import { t } from "@lingui/macro";
import identity from "lodash/identity";
import { zeroAddress } from "viem";

import { CONTRACTS_CHAIN_IDS, ContractsChainId } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { CodeOwnershipInfo, getReferralCodeOwner, ReferralCodeStats } from "domain/referrals";
import { getTwitterIntentURL, isAddressZero, MAX_REFERRAL_CODE_LENGTH, REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { deserializeBigIntsInObject, formatAmount, removeTrailingZeros } from "lib/numbers";
import { getRootUrl } from "lib/url";
import { bigMath } from "sdk/utils/bigmath";
import { encodeReferralCode } from "sdk/utils/referrals";

export const REFERRAL_CODE_REGEX = /^\w+$/; // only number, string and underscore is allowed
export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/;

export function isRecentReferralCodeNotExpired(referralCodeInfo) {
  const REFERRAL_DATA_MAX_TIME = 60000 * 5; // 5 minutes
  if (referralCodeInfo.time) {
    return referralCodeInfo.time + REFERRAL_DATA_MAX_TIME > Date.now();
  }
}

type TakenStatus = "all" | "current" | "other" | "none";
type TakenInfo = Partial<
  Record<
    ContractsChainId,
    {
      taken: boolean;
      owner: string;
    }
  >
> & {
  all: boolean;
};

export async function getReferralCodeTakenStatus(
  account: string | undefined,
  referralCode: string,
  chainId: ContractsChainId
): Promise<{
  takenStatus: TakenStatus;
  info: TakenInfo;
}> {
  const referralCodeBytes32 = encodeReferralCode(referralCode);

  const ownerMap: Partial<Record<ContractsChainId, string>> = {};

  await Promise.all(
    CONTRACTS_CHAIN_IDS.map(async (otherChainId) => {
      const res = await getReferralCodeOwner(otherChainId, referralCodeBytes32);
      ownerMap[otherChainId] = res;
    })
  );

  const takenMap: Partial<Record<ContractsChainId, boolean>> = {};

  for (const otherChainId of CONTRACTS_CHAIN_IDS) {
    // const takenOnArb =
    //   !isAddressZero(ownerArbitrum) && (ownerArbitrum !== account || (ownerArbitrum === account && chainId === ARBITRUM));
    const owner = ownerMap[otherChainId];
    const takenOnOtherChain =
      !isAddressZero(owner) && (owner !== account || (owner === account && chainId === otherChainId));

    takenMap[otherChainId] = takenOnOtherChain;
  }

  const allTaken = Object.values(takenMap).every(identity);
  const someTaken = Object.values(takenMap).some(identity);

  const referralCodeTakenInfo: TakenInfo = {
    all: allTaken,
  };

  for (const otherChainId of CONTRACTS_CHAIN_IDS) {
    referralCodeTakenInfo[otherChainId] = {
      taken: takenMap[otherChainId] ?? false,
      owner: ownerMap[otherChainId] ?? zeroAddress,
    };
  }

  if (referralCodeTakenInfo.all) {
    return { takenStatus: "all", info: referralCodeTakenInfo };
  }
  if (referralCodeTakenInfo[chainId]?.taken) {
    return { takenStatus: "current", info: referralCodeTakenInfo };
  }

  if (!referralCodeTakenInfo[chainId]?.taken && someTaken) {
    return { takenStatus: "other", info: referralCodeTakenInfo };
  }

  return { takenStatus: "none", info: referralCodeTakenInfo };
}

export function getTierIdDisplay(tierId) {
  return Number(tierId) + 1;
}

export const tierRebateInfo = {
  0: 5,
  1: 10,
  2: 15,
};

export const tierDiscountInfo = {
  0: 5,
  1: 10,
  2: 10,
};

export function getSharePercentage(
  tierId: number | undefined,
  discountShare: bigint | undefined,
  totalRebate: bigint,
  isRebate?: boolean
) {
  if (tierId === undefined || totalRebate === undefined) return;
  if (discountShare === undefined || discountShare === 0n)
    return isRebate ? tierRebateInfo[tierId] : tierDiscountInfo[tierId];
  const decimals = 4;

  const discount = bigMath.mulDiv(
    totalRebate * (isRebate ? BASIS_POINTS_DIVISOR_BIGINT - discountShare : discountShare),
    BigInt(Math.pow(10, decimals)),
    BASIS_POINTS_DIVISOR_BIGINT
  );

  const discountPercentage = discount / 100n;
  return removeTrailingZeros(formatAmount(discountPercentage, decimals, 3, true));
}

function areObjectsWithSameKeys(obj1, obj2) {
  return Object.keys(obj1).every((key) => key in obj2);
}

export function deserializeSampleStats(input) {
  const parsedData = JSON.parse(input);
  if (!Array.isArray(parsedData)) return [];
  return parsedData
    .map((data) => {
      if (!areObjectsWithSameKeys(getSampleReferrarStat(), data)) return null;
      return deserializeBigIntsInObject(data);
    })
    .filter(Boolean);
}

export const getSampleReferrarStat = ({
  code = "",
  account = "",
  takenInfo,
}: {
  code?: string;
  takenInfo?: TakenInfo;
  account?: string;
} = {}): ReferralCodeStats => {
  return {
    discountUsd: 0n,
    referralCode: code,
    totalRebateUsd: 0n,
    tradedReferralsCount: 0,
    registeredReferralsCount: 0,
    trades: 0,
    volume: 0n,
    v1Data: {
      volume: 0n,
      totalRebateUsd: 0n,
      discountUsd: 0n,
      affiliateRebateUsd: 0n,
    },
    v2Data: {
      volume: 0n,
      totalRebateUsd: 0n,
      discountUsd: 0n,
      affiliateRebateUsd: 0n,
    },
    affiliateRebateUsd: 0n,
    allOwnersOnOtherChains: takenInfo
      ? Object.fromEntries(
          CONTRACTS_CHAIN_IDS.map((chainId): [ContractsChainId, CodeOwnershipInfo] | undefined => {
            const taken = takenInfo[chainId];
            if (!taken) return undefined;

            return [
              chainId,
              {
                code: encodeReferralCode(code),
                codeString: code,
                owner: taken.owner,
                isTaken: taken.taken,
                isTakenByCurrentUser: taken.owner.toLowerCase() === account.toLowerCase(),
              },
            ];
          }).filter(Boolean) as [ContractsChainId, CodeOwnershipInfo][]
        )
      : undefined,
  };
};

export function getUsdValue(value: bigint | undefined, decimals = 2) {
  return formatAmount(value, USD_DECIMALS, decimals, true, "0.00");
}

export function getCodeError(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (trimmedValue.length > MAX_REFERRAL_CODE_LENGTH) {
    return t`The referral code can't be more than ${MAX_REFERRAL_CODE_LENGTH} characters.`;
  }

  if (!REFERRAL_CODE_REGEX.test(trimmedValue)) {
    return t`Only letters, numbers and underscores are allowed.`;
  }
  return "";
}

export function getReferralCodeTradeUrl(referralCode) {
  return `${getRootUrl()}/#/trade/?${REFERRAL_CODE_QUERY_PARAM}=${referralCode}`;
}

export function getTwitterShareUrl(referralCode) {
  const message = ["Trying out trading on @GMX_IO, up to 100x leverage on $BTC, $ETH 📈", "For fee discounts use:"];
  const shareURL = getReferralCodeTradeUrl(referralCode);

  return getTwitterIntentURL(message, shareURL);
}
