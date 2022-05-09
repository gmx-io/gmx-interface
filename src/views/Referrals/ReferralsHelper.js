import {
  formatAmount,
  USD_DECIMALS,
  bigNumberify,
  MAX_REFERRAL_CODE_LENGTH,
  ARBITRUM,
  AVALANCHE,
  isAddressZero,
} from "../../Helpers";
import { encodeReferralCode, getReferralCodeOwner } from "../../Api/referrals";

export const CODE_REGEX = /^\w+$/; // only number, string and underscore is allowed

export function isRecentReferralCodeNotExpired(referralCodeInfo) {
  const REFERRAL_DATA_MAX_TIME = 60000 * 5; // 5 minutes
  if (referralCodeInfo.time) {
    return referralCodeInfo.time + REFERRAL_DATA_MAX_TIME > Date.now();
  }
}

export async function getReferralCodeTakenStatus(account, referralCode, chainId) {
  const referralCodeBytes32 = encodeReferralCode(referralCode);
  const [ownerArbitrum, ownerAvax] = await Promise.all([
    getReferralCodeOwner(ARBITRUM, referralCodeBytes32),
    getReferralCodeOwner(AVALANCHE, referralCodeBytes32),
  ]);

  const takenOnArb =
    !isAddressZero(ownerArbitrum) && (ownerArbitrum !== account || (ownerArbitrum === account && chainId === ARBITRUM));
  const takenOnAvax =
    !isAddressZero(ownerAvax) && (ownerAvax !== account || (ownerAvax === account && chainId === AVALANCHE));

  const referralCodeTakenInfo = {
    [ARBITRUM]: takenOnArb,
    [AVALANCHE]: takenOnAvax,
    both: takenOnArb && takenOnAvax,
    ownerArbitrum,
    ownerAvax,
  };

  if (referralCodeTakenInfo.both) {
    return { status: "all", info: referralCodeTakenInfo };
  }
  if (referralCodeTakenInfo[chainId]) {
    return { status: "current", info: referralCodeTakenInfo };
  }
  if (chainId === AVALANCHE ? referralCodeTakenInfo[ARBITRUM] : referralCodeTakenInfo[AVALANCHE]) {
    return { status: "other", info: referralCodeTakenInfo };
  }
  return { status: "none", info: referralCodeTakenInfo };
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

export const getSampleReferrarStat = (code, ownerOnOtherNetwork, account) => {
  return {
    discountUsd: bigNumberify(0),
    referralCode: code,
    totalRebateUsd: bigNumberify(0),
    tradedReferralsCount: 0,
    registeredReferralsCount: 0,
    trades: 0,
    volume: bigNumberify(0),
    time: Date.now(),
    ownerOnOtherChain: {
      code: encodeReferralCode(code),
      codeString: code,
      owner: undefined,
      isTaken: !isAddressZero(ownerOnOtherNetwork),
      isTakenByCurrentUser:
        !isAddressZero(ownerOnOtherNetwork) && ownerOnOtherNetwork.toLowerCase() === account.toLowerCase(),
    },
  };
};

export function getUSDValue(value) {
  return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
}

export function getCodeError(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (trimmedValue.length > MAX_REFERRAL_CODE_LENGTH) {
    return `The referral code can't be more than ${MAX_REFERRAL_CODE_LENGTH} characters.`;
  }

  if (!CODE_REGEX.test(trimmedValue)) {
    return "Only letters, numbers and underscores are allowed.";
  }
  return "";
}
