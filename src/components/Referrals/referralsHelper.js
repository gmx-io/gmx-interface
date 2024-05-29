import { t } from "@lingui/macro";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { encodeReferralCode, getReferralCodeOwner } from "domain/referrals";
import { bigMath } from "lib/bigmath";
import {
  MAX_REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_QUERY_PARAM,
  USD_DECIMALS,
  getTwitterIntentURL,
  isAddressZero,
} from "lib/legacy";
import { deserializeBigIntsInObject, formatAmount, removeTrailingZeros } from "lib/numbers";
import { getRootUrl } from "lib/url";

export const REFERRAL_CODE_REGEX = /^\w+$/; // only number, string and underscore is allowed
export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/;

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

export function getSharePercentage(tierId, discountShare, totalRebate, isRebate) {
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

export const getSampleReferrarStat = (code = "", ownerOnOtherNetwork = "", account = "") => {
  return {
    discountUsd: 0n,
    referralCode: code,
    totalRebateUsd: 0n,
    tradedReferralsCount: 0,
    registeredReferralsCount: 0,
    trades: 0,
    volume: 0n,
    time: Date.now(),
    v1Data: {
      volume: 0n,
      totalRebateUsd: 0n,
      discountUsd: 0n,
    },
    v2Data: {
      volume: 0n,
      totalRebateUsd: 0n,
      discountUsd: 0n,
    },
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

export function getUSDValue(value, decimals = 2) {
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
