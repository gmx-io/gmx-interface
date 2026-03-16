import { t } from "@lingui/macro";
import identity from "lodash/identity";

import { CONTRACTS_CHAIN_IDS, ContractsChainId } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getReferralCodeOwner } from "domain/referrals";
import { isAddressZero, MAX_REFERRAL_CODE_LENGTH, REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { formatAmount, removeTrailingZeros } from "lib/numbers";
import { getRootUrl } from "lib/url";
import { bigMath } from "sdk/utils/bigmath";
import { encodeReferralCode } from "sdk/utils/referrals";

import { REFERRAL_CODE_REGEX } from "./referralCode";

export const CREATE_REFERRAL_CODE_QUERY_PARAM = "createReferralCode";

export type ReferralCodeTakenStatus = "all" | "current" | "other" | "none";

export async function getReferralCodeTakenStatus(
  account: string | undefined,
  referralCode: string,
  chainId: ContractsChainId
): Promise<{ takenStatus: ReferralCodeTakenStatus; failedChains: ContractsChainId[] }> {
  const referralCodeBytes32 = encodeReferralCode(referralCode);

  const ownerMap: Partial<Record<ContractsChainId, string>> = {};
  const failedChains: ContractsChainId[] = [];

  await Promise.all(
    CONTRACTS_CHAIN_IDS.map(async (otherChainId) => {
      try {
        const res = await getReferralCodeOwner(otherChainId as ContractsChainId, referralCodeBytes32);
        ownerMap[otherChainId] = res;
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

    const owner = ownerMap[otherChainId];
    const takenOnOtherChain =
      !isAddressZero(owner) && (owner !== account || (owner === account && chainId === otherChainId));

    takenMap[otherChainId] = takenOnOtherChain;
  }

  const checkedChains = CONTRACTS_CHAIN_IDS.filter(
    (id) => !failedChains.includes(id as ContractsChainId)
  ) as ContractsChainId[];
  const allTaken = checkedChains.length > 0 && checkedChains.every((id) => takenMap[id]);
  const someTaken = Object.values(takenMap).some(identity);

  if (allTaken) {
    return { takenStatus: "all", failedChains };
  }
  if (takenMap[chainId]) {
    return { takenStatus: "current", failedChains };
  }
  if (!takenMap[chainId] && someTaken) {
    return { takenStatus: "other", failedChains };
  }

  return { takenStatus: "none", failedChains };
}

export function getTierIdDisplay(tierId: number | bigint | string): number {
  return Number(tierId) + 1;
}

const tierRebateInfo = {
  0: 5,
  1: 10,
  2: 15,
};

const tierDiscountInfo = {
  0: 5,
  1: 10,
  2: 10,
};

export function getSharePercentage(
  tierId: number | undefined,
  discountShare: bigint | undefined,
  totalRebate: bigint | undefined,
  isRebate?: boolean
): string | number | undefined {
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

export function getCodeError(value: string): string {
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

export function getReferralCodeTradeUrl(referralCode: string): string {
  return `${getRootUrl()}/#/trade/?${REFERRAL_CODE_QUERY_PARAM}=${referralCode}`;
}
