export type StakingPowerResponse = {
  cumulativePower: bigint;
  totalNetworkPower: bigint;
  userSharePercent: number;
  historicalMaxStaked: bigint | null;
  currentStaked: bigint;
  loyaltyRatio: number | null;
  lastPowerResetAt: number | null;
  powerResetCount: number;
  projectedRewardShare: bigint | null;
  treasuryGmxBalance: bigint | null;
  powerAccrualStart: number;
  loyaltyTrackingStart: number;
};
