import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { bigNumberify, expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { SECONDS_PER_YEAR } from "sdk/utils/time";

export function getBalanceAndSupplyData(balances: bigint[] | undefined): {
  balanceData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>>;
  supplyData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>>;
} {
  if (!balances || balances.length === 0) {
    return { balanceData: {}, supplyData: {} };
  }

  const keys = ["gmx", "esGmx", "glp", "stakedGmxTracker"];
  const balanceData = {};
  const supplyData = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    balanceData[key] = balances[i * propsLength];
    supplyData[key] = balances[i * propsLength + 1];
  }

  return { balanceData, supplyData };
}

export function getDepositBalanceData(
  depositBalances: bigint[] | undefined
):
  | Record<
      | "gmxInStakedGmx"
      | "esGmxInStakedGmx"
      | "stakedGmxInBonusGmx"
      | "bonusGmxInFeeGmx"
      | "bnGmxInFeeGmx"
      | "glpInStakedGlp",
      bigint
    >
  | undefined {
  if (!depositBalances || depositBalances.length === 0) {
    return;
  }

  const keys = [
    "gmxInStakedGmx",
    "esGmxInStakedGmx",
    "stakedGmxInBonusGmx",
    "bonusGmxInFeeGmx",
    "bnGmxInFeeGmx",
    "glpInStakedGlp",
  ];
  const data = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = depositBalances[i];
  }

  return data as any;
}

export type RawVestingData = {
  gmxVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  gmxVesterPairAmount: bigint;
  gmxVesterVestedAmount: bigint;
  gmxVesterEscrowedBalance: bigint;
  gmxVesterClaimSum: bigint;
  gmxVesterClaimable: bigint;
  gmxVesterMaxVestableAmount: bigint;
  gmxVesterAverageStakedAmount: bigint;
  glpVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  glpVesterPairAmount: bigint;
  glpVesterVestedAmount: bigint;
  glpVesterEscrowedBalance: bigint;
  glpVesterClaimSum: bigint;
  glpVesterClaimable: bigint;
  glpVesterMaxVestableAmount: bigint;
  glpVesterAverageStakedAmount: bigint;
  affiliateVester: {
    pairAmount: bigint;
    vestedAmount: bigint;
    escrowedBalance: bigint;
    claimedAmounts: bigint;
    claimable: bigint;
    maxVestableAmount: bigint;
    averageStakedAmount: bigint;
  };
  affiliateVesterPairAmount: bigint;
  affiliateVesterVestedAmount: bigint;
  affiliateVesterEscrowedBalance: bigint;
  affiliateVesterClaimSum: bigint;
  affiliateVesterClaimable: bigint;
  affiliateVesterMaxVestableAmount: bigint;
  affiliateVesterAverageStakedAmount: bigint;
};

export function getVestingData(vestingInfo: bigint[]): RawVestingData | undefined {
  if (!vestingInfo || vestingInfo.length === 0) {
    return undefined;
  }
  const propsLength = 7;
  const data: Partial<RawVestingData> = {};

  const keys = ["gmxVester", "glpVester", "affiliateVester"] as const;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as (typeof keys)[number];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      averageStakedAmount: vestingInfo[i * propsLength + 6],
    };

    data[key + "PairAmount"] = data[key]!.pairAmount;
    data[key + "VestedAmount"] = data[key]!.vestedAmount;
    data[key + "EscrowedBalance"] = data[key]!.escrowedBalance;
    data[key + "ClaimSum"] = data[key]!.claimedAmounts + data[key]!.claimable;
    data[key + "Claimable"] = data[key]!.claimable;
    data[key + "MaxVestableAmount"] = data[key]!.maxVestableAmount;
    data[key + "AverageStakedAmount"] = data[key]!.averageStakedAmount;
  }

  return data as RawVestingData;
}

export function getStakingData(stakingInfo: bigint[] | undefined):
  | undefined
  | Record<
      | "stakedGmxTracker"
      | "bonusGmxTracker"
      | "feeGmxTracker"
      | "stakedGlpTracker"
      | "feeGlpTracker"
      | "extendedGmxTracker",
      {
        claimable: bigint;
        tokensPerInterval: bigint;
        averageStakedAmounts: bigint;
        cumulativeRewards: bigint;
        totalSupply: bigint;
      }
    > {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = [
    "stakedGmxTracker",
    "bonusGmxTracker",
    "feeGmxTracker",
    "stakedGlpTracker",
    "feeGlpTracker",
    "extendedGmxTracker",
  ];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data as any;
}

export type StakingProcessedData = Partial<{
  gmxBalance: bigint;
  gmxBalanceUsd: bigint;
  gmxSupply: bigint;
  gmxSupplyUsd: bigint;
  stakedGmxSupply: bigint;
  stakedGmxSupplyUsd: bigint;
  gmxInStakedGmx: bigint;
  gmxInStakedGmxUsd: bigint;
  esGmxBalance: bigint;
  esGmxBalanceUsd: bigint;
  stakedGmxTrackerSupply: bigint;
  stakedGmxTrackerSupplyUsd: bigint;
  stakedEsGmxSupply: bigint;
  stakedEsGmxSupplyUsd: bigint;
  esGmxInStakedGmx: bigint;
  esGmxInStakedGmxUsd: bigint;
  bonusGmxInFeeGmx: bigint;
  feeGmxSupply: bigint;
  feeGmxSupplyUsd: bigint;
  stakedGmxTrackerRewards: bigint;
  stakedGmxTrackerRewardsUsd: bigint;
  extendedGmxTrackerRewards: bigint;
  extendedGmxTrackerRewardsUsd: bigint;
  feeGmxTrackerRewards: bigint;
  feeGmxTrackerRewardsUsd: bigint;
  stakedGmxTrackerAnnualRewardsUsd: bigint;
  extendedGmxTrackerAnnualRewardsUsd: bigint;
  feeGmxTrackerAnnualRewardsUsd: bigint;
  gmxAprTotal: bigint;
  totalStakingRewardsUsd: bigint;
  glpSupply: bigint;
  glpPrice: bigint;
  glpSupplyUsd: bigint;
  glpBalance: bigint;
  glpBalanceUsd: bigint;
  stakedGlpTrackerRewards: bigint;
  stakedGlpTrackerRewardsUsd: bigint;
  feeGlpTrackerRewards: bigint;
  feeGlpTrackerRewardsUsd: bigint;
  stakedGlpTrackerAnnualRewardsUsd: bigint;
  glpAprForEsGmx: bigint;
  feeGlpTrackerAnnualRewardsUsd: bigint;
  glpAprForNativeToken: bigint;
  gmxAprForGmx: bigint;
  glpAprTotal: bigint;
  totalGlpRewardsUsd: bigint;
  totalEsGmxRewards: bigint;
  totalEsGmxRewardsUsd: bigint;
  totalGmxRewards: bigint;
  totalGmxRewardsUsd: bigint;
  gmxVesterRewards: bigint;
  glpVesterRewards: bigint;
  totalVesterRewards: bigint;
  totalVesterRewardsUsd: bigint;
  totalNativeTokenRewards: bigint;
  totalNativeTokenRewardsUsd: bigint;
  totalRewardsUsd: bigint;
  cumulativeTotalRewardsUsd: bigint;
  cumulativeEsGmxRewards: bigint;
  cumulativeEsGmxRewardsUsd: bigint;
  cumulativeGmxRewards: bigint;
  cumulativeGmxRewardsUsd: bigint;
  cumulativeNativeTokenRewards: bigint;
  cumulativeNativeTokenRewardsUsd: bigint;
}> & {
  gmxAprForEsGmx: bigint;
  gmxAprForNativeToken: bigint;
};

export function getStakingProcessedData(
  balanceData: Partial<Record<"glp" | "gmx" | "esGmx" | "stakedGmxTracker", bigint>> | undefined,
  supplyData: Partial<Record<"gmx" | "esGmx" | "glp" | "stakedGmxTracker", bigint>> | undefined,
  depositBalanceData:
    | Record<
        | "gmxInStakedGmx"
        | "esGmxInStakedGmx"
        | "stakedGmxInBonusGmx"
        | "bonusGmxInFeeGmx"
        | "bnGmxInFeeGmx"
        | "glpInStakedGlp",
        bigint
      >
    | undefined,
  stakingData:
    | Record<
        | "stakedGmxTracker"
        | "bonusGmxTracker"
        | "feeGmxTracker"
        | "stakedGlpTracker"
        | "feeGlpTracker"
        | "extendedGmxTracker",
        {
          claimable: bigint;
          tokensPerInterval: bigint;
          averageStakedAmounts: bigint;
          cumulativeRewards: bigint;
          totalSupply: bigint;
        }
      >
    | undefined,
  vestingData: RawVestingData | undefined,
  aum: bigint | undefined,
  nativeTokenPrice: bigint | undefined,
  stakedGmxSupply: bigint | undefined,
  gmxPrice: bigint | undefined,
  gmxSupply: string | undefined
): StakingProcessedData | undefined {
  if (
    !balanceData ||
    !supplyData ||
    !depositBalanceData ||
    !stakingData ||
    !vestingData ||
    aum === undefined ||
    nativeTokenPrice === undefined ||
    stakedGmxSupply === undefined ||
    gmxPrice === undefined ||
    !gmxSupply
  ) {
    return undefined;
  }
  const data: any = {};

  data.gmxBalance = balanceData.gmx;
  data.gmxBalanceUsd = mulDiv(balanceData.gmx, gmxPrice, expandDecimals(1, 18));

  data.gmxSupply = bigNumberify(gmxSupply);

  data.gmxSupplyUsd = mulDiv(data.gmxSupply, gmxPrice, expandDecimals(1, 18));
  data.stakedGmxSupply = stakedGmxSupply;
  data.stakedGmxSupplyUsd = mulDiv(stakedGmxSupply, gmxPrice, expandDecimals(1, 18));
  data.gmxInStakedGmx = depositBalanceData.gmxInStakedGmx;
  data.gmxInStakedGmxUsd = mulDiv(depositBalanceData.gmxInStakedGmx, gmxPrice, expandDecimals(1, 18));

  data.esGmxBalance = balanceData.esGmx;
  data.esGmxBalanceUsd = mulDiv(balanceData.esGmx, gmxPrice, expandDecimals(1, 18));

  data.stakedGmxTrackerSupply = supplyData.stakedGmxTracker;
  data.stakedGmxTrackerSupplyUsd = mulDiv(supplyData.stakedGmxTracker, gmxPrice, expandDecimals(1, 18));
  data.stakedEsGmxSupply = data.stakedGmxTrackerSupply - data.stakedGmxSupply;
  data.stakedEsGmxSupplyUsd = mulDiv(data.stakedEsGmxSupply, gmxPrice, expandDecimals(1, 18));

  data.esGmxInStakedGmx = depositBalanceData.esGmxInStakedGmx;
  data.esGmxInStakedGmxUsd = mulDiv(depositBalanceData.esGmxInStakedGmx, gmxPrice, expandDecimals(1, 18));

  data.bonusGmxInFeeGmx = depositBalanceData.bonusGmxInFeeGmx;
  data.feeGmxSupply = stakingData.feeGmxTracker.totalSupply;
  data.feeGmxSupplyUsd = mulDiv(data.feeGmxSupply, gmxPrice, expandDecimals(1, 18));

  data.stakedGmxTrackerRewards = stakingData.stakedGmxTracker.claimable;
  data.stakedGmxTrackerRewardsUsd = mulDiv(stakingData.stakedGmxTracker.claimable, gmxPrice, expandDecimals(1, 18));

  data.feeGmxTrackerRewards = stakingData.feeGmxTracker.claimable;
  data.feeGmxTrackerRewardsUsd = mulDiv(stakingData.feeGmxTracker.claimable, nativeTokenPrice, expandDecimals(1, 18));

  data.extendedGmxTrackerRewards = stakingData.extendedGmxTracker.claimable;
  data.extendedGmxTrackerSupply = stakingData.extendedGmxTracker.totalSupply;
  data.extendedGmxTrackerSupplyUsd = mulDiv(data.extendedGmxTrackerSupply, gmxPrice, expandDecimals(1, 18));
  data.extendedGmxTrackerRewardsUsd = mulDiv(stakingData.extendedGmxTracker.claimable, gmxPrice, expandDecimals(1, 18));
  data.extendedGmxTrackerAnnualRewardsUsd =
    (stakingData.extendedGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * gmxPrice) / expandDecimals(1, 18);

  data.stakedGmxTrackerAnnualRewardsUsd =
    (stakingData.stakedGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * gmxPrice) / expandDecimals(1, 18);
  data.gmxAprForEsGmx =
    data.stakedGmxTrackerSupplyUsd && data.stakedGmxTrackerSupplyUsd > 0
      ? mulDiv(data.stakedGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.stakedGmxTrackerSupplyUsd)
      : 0n;
  data.feeGmxTrackerAnnualRewardsUsd =
    (stakingData.feeGmxTracker.tokensPerInterval * SECONDS_PER_YEAR * nativeTokenPrice) / expandDecimals(1, 18);

  data.gmxAprForNativeToken =
    data.feeGmxSupplyUsd && data.feeGmxSupplyUsd > 0
      ? mulDiv(data.feeGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.feeGmxSupplyUsd)
      : 0n;

  data.gmxAprForGmx =
    data.feeGmxSupplyUsd && data.feeGmxSupplyUsd > 0
      ? mulDiv(data.extendedGmxTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.feeGmxSupplyUsd)
      : 0n;

  data.gmxAprTotal = data.gmxAprForNativeToken + data.gmxAprForGmx;

  data.totalStakingRewardsUsd =
    data.stakedGmxTrackerRewardsUsd + data.feeGmxTrackerRewardsUsd + data.extendedGmxTrackerRewardsUsd;

  data.glpSupply = supplyData.glp;
  data.glpPrice = data.glpSupply && data.glpSupply > 0 ? mulDiv(aum, expandDecimals(1, 18), data.glpSupply) : 0n;

  data.glpSupplyUsd = mulDiv(supplyData.glp, data.glpPrice, expandDecimals(1, 18));

  data.glpBalance = depositBalanceData.glpInStakedGlp;
  data.glpBalanceUsd = mulDiv(depositBalanceData.glpInStakedGlp, data.glpPrice, expandDecimals(1, 18));

  data.stakedGlpTrackerRewards = stakingData.stakedGlpTracker.claimable;
  data.stakedGlpTrackerRewardsUsd = mulDiv(stakingData.stakedGlpTracker.claimable, gmxPrice, expandDecimals(1, 18));

  data.feeGlpTrackerRewards = stakingData.feeGlpTracker.claimable;
  data.feeGlpTrackerRewardsUsd = mulDiv(stakingData.feeGlpTracker.claimable, nativeTokenPrice, expandDecimals(1, 18));

  data.stakedGlpTrackerAnnualRewardsUsd = mulDiv(
    stakingData.stakedGlpTracker.tokensPerInterval * SECONDS_PER_YEAR,
    gmxPrice,
    expandDecimals(1, 18)
  );
  data.glpAprForEsGmx =
    data.glpSupplyUsd && data.glpSupplyUsd > 0
      ? mulDiv(data.stakedGlpTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.glpSupplyUsd)
      : 0n;
  data.feeGlpTrackerAnnualRewardsUsd = mulDiv(
    stakingData.feeGlpTracker.tokensPerInterval * SECONDS_PER_YEAR,
    nativeTokenPrice,
    expandDecimals(1, 18)
  );
  data.glpAprForNativeToken =
    data.glpSupplyUsd && data.glpSupplyUsd > 0
      ? mulDiv(data.feeGlpTrackerAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.glpSupplyUsd)
      : 0n;
  data.glpAprTotal = data.glpAprForNativeToken + data.glpAprForEsGmx;

  data.totalGlpRewardsUsd = data.stakedGlpTrackerRewardsUsd + data.feeGlpTrackerRewardsUsd;

  data.totalEsGmxRewards = data.stakedGmxTrackerRewards + data.stakedGlpTrackerRewards;
  data.totalEsGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd + data.stakedGlpTrackerRewardsUsd;

  data.gmxVesterRewards = vestingData.gmxVester.claimable;
  data.glpVesterRewards = vestingData.glpVester.claimable;
  data.totalVesterRewards = data.gmxVesterRewards + data.glpVesterRewards;
  data.totalVesterRewardsUsd = mulDiv(data.totalVesterRewards, gmxPrice, expandDecimals(1, 18));

  data.totalGmxRewards = data.totalVesterRewards + data.extendedGmxTrackerRewards;
  data.totalGmxRewardsUsd = data.totalVesterRewardsUsd + data.extendedGmxTrackerRewardsUsd;

  data.totalNativeTokenRewards = data.feeGmxTrackerRewards + data.feeGlpTrackerRewards;
  data.totalNativeTokenRewardsUsd = data.feeGmxTrackerRewardsUsd + data.feeGlpTrackerRewardsUsd;

  const cumulativeEsGmxRewards =
    stakingData.stakedGmxTracker.cumulativeRewards + stakingData.stakedGlpTracker.cumulativeRewards;
  const cumulativeEsGmxRewardsUsd = mulDiv(cumulativeEsGmxRewards, gmxPrice, expandDecimals(1, 18)) ?? 0n;

  const cumulativeGmxRewards =
    stakingData.extendedGmxTracker.cumulativeRewards + vestingData.gmxVesterClaimSum + vestingData.glpVesterClaimSum;
  const cumulativeGmxRewardsUsd = mulDiv(cumulativeGmxRewards, gmxPrice, expandDecimals(1, 18)) ?? 0n;

  const cumulativeNativeTokenRewards =
    stakingData.feeGmxTracker.cumulativeRewards + stakingData.feeGlpTracker.cumulativeRewards;
  const cumulativeNativeTokenRewardsUsd =
    mulDiv(cumulativeNativeTokenRewards, nativeTokenPrice, expandDecimals(1, 18)) ?? 0n;

  data.cumulativeEsGmxRewards = cumulativeEsGmxRewards;
  data.cumulativeEsGmxRewardsUsd = cumulativeEsGmxRewardsUsd;
  data.cumulativeGmxRewards = cumulativeGmxRewards;
  data.cumulativeGmxRewardsUsd = cumulativeGmxRewardsUsd;
  data.cumulativeNativeTokenRewards = cumulativeNativeTokenRewards;
  data.cumulativeNativeTokenRewardsUsd = cumulativeNativeTokenRewardsUsd;

  data.cumulativeTotalRewardsUsd =
    cumulativeEsGmxRewardsUsd + cumulativeGmxRewardsUsd + cumulativeNativeTokenRewardsUsd;

  data.totalRewardsUsd = data.totalEsGmxRewardsUsd + data.totalNativeTokenRewardsUsd + data.totalGmxRewardsUsd;

  data.avgGMXAprTotal = data.gmxAprTotal ? data.gmxAprTotal + (data.avgBoostAprForNativeToken ?? 0n) : undefined;

  return data;
}

function mulDiv(a: bigint | number | undefined, b: bigint | number, c: bigint | number) {
  if (a === undefined) return undefined;
  return bigMath.mulDiv(BigInt(a), BigInt(b), BigInt(c));
}
