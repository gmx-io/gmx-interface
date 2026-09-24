import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGtGlobalDetailsReferralDiscountFactor } from '../gt/gtGlobalDetailsSelectors';
import { BN } from '@coral-xyz/anchor';
import { selectGtUserDetailsRank } from '../gt/gtUserDetailsSelectors';
import { selectGtGlobalDetailsOrderFeeDiscountFactors } from '../gt/gtGlobalDetailsSelectors';
import { selectReferrer } from './baseSelectors';
import { BN_ZERO, ONE_USD } from '@/config/constants';

interface UserOrderFeeDiscountFactors {
  userOrderFeeVipDiscountFactor: BN;
  userOrderFeeReferralDiscountFactor: BN;
  userOrderFeeDiscountFactor: BN;
}

/**
 * Selects the order fee discount factors for a user, including:
 * - VIP discount based on user's rank
 * - Referral discount (10% if user has referrer)
 * - Total combined discount
 *
 * The total discount is calculated using the formula: 1 - (1 - A) * (1 - B)
 * where:
 * - A is the VIP discount based on user's rank
 * - B is the referral discount (10% if user has referrer, 0% otherwise)
 *
 * @returns Object containing all three discount factors
 */
export const selectUserOrderFeeDiscountFactor = createAppStoreSelector(
  [
    selectGtUserDetailsRank,
    selectGtGlobalDetailsOrderFeeDiscountFactors,
    selectReferrer,
    selectGtGlobalDetailsReferralDiscountFactor,
  ],
  (
    userRank,
    orderFeeDiscountFactors,
    referrer,
    referralDiscountFactor
  ): UserOrderFeeDiscountFactors => {
    // Get VIP discount factor based on user's rank
    const userOrderFeeVipDiscountFactor =
      orderFeeDiscountFactors?.[userRank ?? 0] ?? BN_ZERO;

    // Get referral discount factor (10% if user has referrer)
    const userOrderFeeReferralDiscountFactor = referrer
      ? referralDiscountFactor
      : BN_ZERO;

    // Calculate total discount factor using the formula:
    // 1 - (1 - A) * (1 - B)
    // where A is VIP discount and B is referral discount
    const userOrderFeeDiscountFactor = ONE_USD.sub(
      ONE_USD.sub(userOrderFeeVipDiscountFactor)
        .mul(ONE_USD.sub(userOrderFeeReferralDiscountFactor))
        .div(ONE_USD)
    );

    return {
      userOrderFeeVipDiscountFactor,
      userOrderFeeReferralDiscountFactor,
      userOrderFeeDiscountFactor,
    };
  }
);
