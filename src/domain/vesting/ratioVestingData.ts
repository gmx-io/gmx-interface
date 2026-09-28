import type { RatioVestingConfig } from "config/vesting";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";

import type { RewardsVestingData } from "./useRewardsVestingData";

export function buildRatioVestingRequest(account: string, config: RatioVestingConfig) {
  return {
    gmx: {
      contractAddress: config.claimableToken,
      abiId: "Token",
      calls: { balance: { methodName: "balanceOf", params: [account] } },
    },
    esGmx: {
      contractAddress: config.esToken,
      abiId: "Token",
      calls: {
        balance: { methodName: "balanceOf", params: [account] },
        allowance: { methodName: "allowance", params: [account, config.vester] },
      },
    },
    pairToken: {
      contractAddress: config.pairToken,
      abiId: "Token",
      calls: {
        balance: { methodName: "balanceOf", params: [account] },
        allowance: { methodName: "allowance", params: [account, config.vester] },
      },
    },
    vester: {
      contractAddress: config.vester,
      abiId: "RatioVester",
      calls: {
        isFrozen: { methodName: "isFrozen", params: [account] },
        isIssuerBindingConfirmed: { methodName: "isIssuerBindingConfirmed", params: [] },
      },
    },
    reader: {
      contractAddress: config.reader,
      abiId: "RatioVesterReader",
      calls: {
        vesting: { methodName: "getVestingInfo", params: [[config.vester], account] },
        issuer: { methodName: "getIssuerInfo", params: [config.issuer, account] },
        tranches: { methodName: "getTranches", params: [config.vester, account] },
      },
    },
  } satisfies MulticallRequestConfig<any>;
}

export function parseRatioVestingResponse(
  result: MulticallResult<MulticallRequestConfig<any>>
): Omit<RewardsVestingData, "gmxPrice"> {
  const walletGmxBalance = result.data.gmx?.balance?.returnValues?.[0];
  const walletEsGmxBalance = result.data.esGmx?.balance?.returnValues?.[0];
  const freePairAmount = result.data.pairToken?.balance?.returnValues?.[0];
  const isFrozen = result.data.vester?.isFrozen?.returnValues?.[0];
  const isIssuerBindingConfirmed = result.data.vester?.isIssuerBindingConfirmed?.returnValues?.[0];
  const esTokenAllowance = result.data.esGmx?.allowance?.returnValues?.[0];
  const pairTokenAllowance = result.data.pairToken?.allowance?.returnValues?.[0];
  const vesting = result.data.reader?.vesting?.returnValues;
  const issuer = result.data.reader?.issuer?.returnValues;
  const tranches = result.data.reader?.tranches?.returnValues;

  if (
    typeof walletGmxBalance !== "bigint" ||
    typeof walletEsGmxBalance !== "bigint" ||
    typeof freePairAmount !== "bigint" ||
    typeof isFrozen !== "boolean" ||
    typeof isIssuerBindingConfirmed !== "boolean" ||
    typeof esTokenAllowance !== "bigint" ||
    typeof pairTokenAllowance !== "bigint" ||
    !isBigIntArray(vesting, 12) ||
    !isBigIntArray(issuer, 5) ||
    !tranches ||
    !isBigIntArray(tranches[0]) ||
    !isBigIntArray(tranches[1], tranches[0].length) ||
    !isBigIntArray(tranches[2], tranches[0].length) ||
    BigInt(tranches[0].length) !== vesting[8]
  ) {
    throw new Error("Incomplete ratio vesting response");
  }

  const [
    balance,
    pairAmount,
    claimable,
    converted,
    claimed,
    unpaid,
    lifetimeConverted,
    cap,
    ,
    duration,
    deactivatedAt,
    ratio,
  ] = vesting;

  return {
    walletGmxBalance,
    walletEsGmxBalance,
    claimableEsGmxRewards: issuer[2],
    stakedGmxBalance: 0n,
    freePairAmount,
    vestingDuration: duration,
    vestingInfo: {
      pairAmount,
      vestedAmount: balance + converted,
      escrowedBalance: balance,
      claimedAmounts: claimed,
      claimable,
      maxVestableAmount: cap,
      averageStakedAmount: 0n,
    },
    ratioVesting: {
      pairRatioFactor: ratio,
      capUsedAmount: balance + lifetimeConverted,
      unpaidClaimAmount: unpaid,
      deactivatedAt,
      isFrozen,
      isIssuerBindingConfirmed,
      esTokenAllowance,
      pairTokenAllowance,
      tranches: tranches[0].map((startTime, index) => ({
        startTime,
        totalAmount: tranches[1][index],
        convertedAmount: tranches[2][index],
      })),
    },
  };
}

function isBigIntArray(value: unknown, length?: number): value is bigint[] {
  return (
    Array.isArray(value) &&
    (length === undefined || value.length === length) &&
    value.every((v) => typeof v === "bigint")
  );
}
