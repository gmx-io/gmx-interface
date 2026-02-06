import { t } from "@lingui/macro";
import mapKeys from "lodash/mapKeys";
import { zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useEnsName } from "wagmi";

import { SOURCE_ETHEREUM_MAINNET, getExplorerUrl } from "config/chains";
import { isLocal } from "config/env";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { PRODUCTION_HOST } from "config/links";

import { isValidTimestamp } from "./dates";
import { PRECISION, bigNumberify, calculateDisplayDecimals, expandDecimals, formatAmount } from "./numbers";

// use a random placeholder account instead of the zero address as the zero address might have tokens
export const PLACEHOLDER_ACCOUNT = privateKeyToAccount(generatePrivateKey()).address;

const SECONDS_PER_YEAR = 31536000n;
export const DUST_USD = expandDecimals(1, USD_DECIMALS);
export const GLP_DECIMALS = 18;
export const GMX_DECIMALS = 18;
export const GM_DECIMALS = 18;

export const MARGIN_FEE_BASIS_POINTS = 10;

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS);

export const REFERRAL_CODE_QUERY_PARAM = "ref";
export const MAX_REFERRAL_CODE_LENGTH = 20;

// Removed: TOKEN_IMG_DIR (unused)

export function isHomeSite() {
  return import.meta.env.VITE_APP_IS_HOME_SITE === "true";
}

export function getExchangeRate(tokenAInfo, tokenBInfo, inverted) {
  if (!tokenAInfo || !tokenAInfo.minPrice || !tokenBInfo || !tokenBInfo.maxPrice) {
    return;
  }
  if (inverted) {
    return (tokenAInfo.minPrice * PRECISION) / tokenBInfo.maxPrice;
  }
  return (tokenBInfo.maxPrice * PRECISION) / tokenAInfo.minPrice;
}

function shouldInvertTriggerRatio(tokenA, tokenB) {
  if (tokenA.isStable && tokenB.isStable) return false;
  if ((tokenB.isStable || tokenB.isUsdg) && !tokenA.isStable) return true;
  if (tokenB.maxPrice && tokenA.maxPrice && tokenB.maxPrice < tokenA.maxPrice) return true;
  return false;
}

export function getExchangeRateDisplay(rate, tokenA, tokenB, opts: { omitSymbols?: boolean } = {}) {
  if (!rate || rate == 0 || !tokenA || !tokenB) return "...";
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA];
    rate = (PRECISION * PRECISION) / rate;
  }
  const rateDecimals = calculateDisplayDecimals(rate);
  const rateValue = formatAmount(rate, USD_DECIMALS, rateDecimals, true);
  if (opts.omitSymbols) {
    return rateValue;
  }
  return `${rateValue} ${tokenA.symbol} per ${tokenB.symbol}`;
}

export function getPositionKey(
  account: string,
  collateralTokenAddress: string,
  indexTokenAddress: string,
  isLong: boolean,
  nativeTokenAddress?: string
) {
  const tokenAddress0 = collateralTokenAddress === zeroAddress ? nativeTokenAddress : collateralTokenAddress;
  const tokenAddress1 = indexTokenAddress === zeroAddress ? nativeTokenAddress : indexTokenAddress;
  return account + ":" + tokenAddress0 + ":" + tokenAddress1 + ":" + isLong;
}

export function shortenAddress(address, length, padStart = 1) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  if (length >= address.length) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + (padStart || 0);
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}

export function useENS(address) {
  const { data } = useEnsName({
    address,
    chainId: SOURCE_ETHEREUM_MAINNET,
  });
  const ensName = data || undefined;

  return { ensName };
}

// Removed: order parsing helpers (unused)
// Removed: order parsing helpers (unused)

// Removed: getOrderKey (unused)

// Removed: useAccountOrders and related order parsing helpers (unused)

export function getAccountUrl(chainId: number, account: string) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

// Removed: isMobileDevice (unused)

export const CHART_PERIODS = {
  "1m": 60,
  "5m": 60 * 5,
  "15m": 60 * 15,
  "1h": 60 * 60,
  "4h": 60 * 60 * 4,
  "1d": 60 * 60 * 24,
  "1y": 60 * 60 * 24 * 365,
};

export function getTotalVolumeSum(volumes) {
  if (!volumes || volumes.length === 0) {
    return;
  }

  let volume = 0n;

  for (let i = 0; i < volumes.length; i++) {
    volume = volume + BigInt(volumes[i].data.volume);
  }

  return volume;
}

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

type RawVestingData = {
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

export function getVestingData(vestingInfo): RawVestingData | undefined {
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
  data.glpPrice =
    data.glpSupply && data.glpSupply > 0 ? mulDiv(aum, expandDecimals(1, GLP_DECIMALS), data.glpSupply) : 0n;

  data.glpSupplyUsd = mulDiv(supplyData.glp, data.glpPrice, expandDecimals(1, 18));

  data.glpBalance = depositBalanceData.glpInStakedGlp;
  data.glpBalanceUsd = mulDiv(depositBalanceData.glpInStakedGlp, data.glpPrice, expandDecimals(1, GLP_DECIMALS));

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

export function getPageTitle(data) {
  const title = t`Decentralized Perpetual Exchange | GMX`;
  return `${data} | ${title}`;
}

export function isHashZero(value) {
  return value === zeroHash;
}
export function isAddressZero(value) {
  return value === zeroAddress;
}

export function getHomeUrl() {
  if (isLocal()) {
    return "http://localhost:3010";
  }

  return "https://gmx.io";
}

export function getAppBaseUrl() {
  if (isLocal()) {
    return "http://localhost:3011/#";
  }

  return PRODUCTION_HOST;
}

export function getTradePageUrl() {
  if (isLocal()) {
    return "http://localhost:3011/#/trade";
  }

  return PRODUCTION_HOST + "/#/trade";
}

export function getRootShareApiUrl() {
  if (isLocal()) {
    return "https://gmxs.vercel.app";
  }

  return "https://share.gmx.io";
}

// Resolves all images in the folder that match the pattern and store them as `fileName -> path` pairs
const imageStaticMap = mapKeys(
  import.meta.glob("img/**/*.*", {
    query: "?url",
    import: "default",
    eager: true,
  }),
  (_, key) => key.split("/").pop()
);

export function importImage(name) {
  const sizeSuffixRegex = /_(?:24|40)\.svg$/;
  const candidates = sizeSuffixRegex.test(name) ? [name.replace(sizeSuffixRegex, ".svg"), name] : [name];

  for (const candidate of candidates) {
    if (candidate in imageStaticMap) {
      return imageStaticMap[candidate] as string;
    }
  }

  for (const candidate of candidates) {
    const pngCandidate = candidate.replace(/\.svg$/, ".png");
    if (pngCandidate in imageStaticMap) {
      return imageStaticMap[pngCandidate] as string;
    }
  }

  throw new Error(`Image ${name} not found`);
}

export function getTwitterIntentURL(text, url = "", hashtag = "") {
  let finalURL = "https://twitter.com/intent/tweet?text=";
  if (text.length > 0) {
    finalURL += Array.isArray(text) ? text.map((t) => encodeURIComponent(t)).join("%0a%0a") : encodeURIComponent(text);
    if (hashtag.length > 0) {
      finalURL += "&hashtags=" + encodeURIComponent(hashtag.replace(/#/g, ""));
    }
    if (url.length > 0) {
      finalURL += "&url=" + encodeURIComponent(url);
    }
  }
  return finalURL;
}

export function shouldShowRedirectModal(timestamp?: number): boolean {
  if (!timestamp) {
    return true;
  }

  const thirtyDays = 1000 * 60 * 60 * 24 * 30;
  const expiryTime = timestamp + thirtyDays;
  return !isValidTimestamp(timestamp) || Date.now() > expiryTime;
}

function mulDiv(a: bigint | number | undefined, b: bigint | number, c: bigint | number) {
  if (a === undefined) return undefined;
  a = BigInt(a);
  b = BigInt(b);
  c = BigInt(c);
  return (a * b) / c;
}
