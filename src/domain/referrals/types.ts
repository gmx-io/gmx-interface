import { BigNumber } from "ethers";

export type UserReferralInfo = {
  userReferralCode: string;
  userReferralCodeString: string;
  attachedOnChain: boolean;
  affiliate: string;
  tierLevel: BigNumber;
  totalRebate: BigNumber;
  totalRebateFactor: BigNumber;
  discountShare: BigNumber;
  discountFactor: BigNumber;
};
