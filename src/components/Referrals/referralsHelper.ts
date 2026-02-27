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

export const CREATE_REFERRAL_CODE_QUERY_PARAM = "createReferralCode";
export const REFERRAL_CODE_REGEX = /^\w+$/; // only number, string and underscore is allowed
export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/;

export function getReferralsPageUrlForCreateCode(referralCode: string) {
  const trimmedCode = referralCode.trim();
  const baseUrl = `${getRootUrl()}/#/referrals`;

  if (!trimmedCode) {
    return baseUrl;
  }

  const encodedCode = encodeURIComponent(trimmedCode);
  return `${baseUrl}?${CREATE_REFERRAL_CODE_QUERY_PARAM}=${encodedCode}`;
}

export function isRecentReferralCodeNotExpired(referralCodeInfo: { time?: number; [key: string]: any }) {
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

export type ReferralCodeTakenStatusResult = {
  takenStatus: TakenStatus;
  info: TakenInfo;
  failedChains: ContractsChainId[];
};

export async function getReferralCodeTakenStatus(
  account: string | undefined,
  referralCode: string,
  chainId: ContractsChainId
): Promise<ReferralCodeTakenStatusResult> {
  const referralCodeBytes32 = encodeReferralCode(referralCode);

  const ownerMap: Partial<Record<ContractsChainId, string>> = {};
  const failedChains: ContractsChainId[] = [];

  await Promise.all(
    CONTRACTS_CHAIN_IDS.map(async (otherChainId) => {
      try {
        const res = await getReferralCodeOwner(otherChainId as ContractsChainId, referralCodeBytes32);
        ownerMap[otherChainId as ContractsChainId] = res;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to check referral code owner on chain ${otherChainId}:`, error);
        failedChains.push(otherChainId as ContractsChainId);
      }
    })
  );

  const takenMap: Partial<Record<ContractsChainId, boolean>> = {};

  for (const otherChainId of CONTRACTS_CHAIN_IDS) {
    if (failedChains.includes(otherChainId as ContractsChainId)) {
      continue;
    }

    const owner = ownerMap[otherChainId as ContractsChainId];
    const takenOnOtherChain =
      !isAddressZero(owner!) && (owner !== account || (owner === account && chainId === otherChainId));

    takenMap[otherChainId as ContractsChainId] = takenOnOtherChain;
  }

  const checkedChains = CONTRACTS_CHAIN_IDS.filter(
    (id) => !failedChains.includes(id as ContractsChainId)
  ) as ContractsChainId[];
  const allTaken = checkedChains.length > 0 && checkedChains.every((id) => takenMap[id]);
  const someTaken = Object.values(takenMap).some(identity);

  const referralCodeTakenInfo: TakenInfo = {
    all: allTaken,
  };

  for (const otherChainId of CONTRACTS_CHAIN_IDS) {
    referralCodeTakenInfo[otherChainId as ContractsChainId] = {
      taken: takenMap[otherChainId as ContractsChainId] ?? false,
      owner: ownerMap[otherChainId as ContractsChainId] ?? zeroAddress,
    };
  }

  if (referralCodeTakenInfo.all) {
    return { takenStatus: "all", info: referralCodeTakenInfo, failedChains };
  }
  if (referralCodeTakenInfo[chainId]?.taken) {
    return { takenStatus: "current", info: referralCodeTakenInfo, failedChains };
  }

  if (!referralCodeTakenInfo[chainId]?.taken && someTaken) {
    return { takenStatus: "other", info: referralCodeTakenInfo, failedChains };
  }

  return { takenStatus: "none", info: referralCodeTakenInfo, failedChains };
}

export function getTierIdDisplay(tierId: bigint | number) {
  return Number(tierId) + 1;
}

const tierRebateInfo = {
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
    return isRebate
      ? tierRebateInfo[tierId as keyof typeof tierRebateInfo]
      : tierDiscountInfo[tierId as keyof typeof tierDiscountInfo];
  const decimals = 4;

  const discount = bigMath.mulDiv(
    totalRebate * (isRebate ? BASIS_POINTS_DIVISOR_BIGINT - discountShare : discountShare),
    BigInt(Math.pow(10, decimals)),
    BASIS_POINTS_DIVISOR_BIGINT
  );

  const discountPercentage = discount / 100n;
  return removeTrailingZeros(formatAmount(discountPercentage, decimals, 3, true));
}

function areObjectsWithSameKeys(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
  return Object.keys(obj1).every((key) => key in obj2);
}

export function deserializeSampleStats(input: string) {
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
            const taken = takenInfo[chainId as ContractsChainId];
            if (!taken) return undefined;

            return [
              chainId as ContractsChainId,
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

export function getCodeError(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (trimmedValue.length > MAX_REFERRAL_CODE_LENGTH) {
    return t`Max ${MAX_REFERRAL_CODE_LENGTH} characters`;
  }

  if (!REFERRAL_CODE_REGEX.test(trimmedValue)) {
    return t`Only letters, numbers, and underscores allowed`;
  }
  return "";
}

export function getReferralCodeTradeUrl(referralCode: string) {
  return `${getRootUrl()}/#/trade/?${REFERRAL_CODE_QUERY_PARAM}=${referralCode}`;
}

export function getTwitterShareUrl(referralCode: string) {
  const message = ["Trying out trading on @GMX_IO, up to 100x leverage on $BTC, $ETH 📈", "For fee discounts use:"];
  const shareURL = getReferralCodeTradeUrl(referralCode);

  return getTwitterIntentURL(message, shareURL);
}
