import { size } from "viem";

import type { ContractsChainId } from "configs/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { bigMath } from "utils/bigmath";
import { approximateL1GasBuffer, estimateRelayerGasLimit } from "utils/fees/executionFee";
import { type ErrorLike, extendError, isIgnoredEstimateGasError } from "utils/errors";
import type { IRpc, StateOverrideEntry } from "utils/rpc";
import type { IMetrics } from "utils/metrics";
import { noopMetrics } from "utils/metrics";
import { applyFactor } from "utils/numbers";
import type { SignedTokenPermit, TokenData, TokensAllowanceData } from "utils/tokens/types";
import { nowInSeconds } from "utils/time";

import type { BuiltGlobalExpressParams } from "./globalExpressParams";
import { getExpressContractAddress, getRawRelayerParams, getRelayerFeeParams } from "./relayParamsUtils";
import {
  ExpressEstimationError,
  ExpressEstimationInsufficientGasPaymentTokenBalanceError,
  getIsValidExpressParams,
} from "./expressParamsUtils";
import type {
  ExpressParamsEstimationMethod,
  ExpressTransactionEstimatorParams,
  ExpressTxnParams,
  GasPaymentValidations,
  Subaccount,
  SubaccountValidations,
} from "../types";

export function getNeedTokenApprove(
  tokenAllowanceData: TokensAllowanceData | undefined,
  tokenAddress: string | undefined,
  amountToSpend: bigint | undefined,
  permits: SignedTokenPermit[]
): boolean {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS || amountToSpend === undefined || amountToSpend <= 0n) {
    return false;
  }

  if (!tokenAllowanceData || !tokenAddress || tokenAllowanceData[tokenAddress] === undefined) {
    return true;
  }

  const shouldApprove = amountToSpend > tokenAllowanceData[tokenAddress];
  const signedPermit = permits.find(
    (permit) =>
      permit.token === tokenAddress && BigInt(permit.value) >= amountToSpend && Number(permit.deadline) > nowInSeconds()
  );

  return shouldApprove && !signedPermit;
}

export function getGasPaymentValidations({
  gasPaymentToken,
  gasPaymentTokenAmount,
  gasPaymentTokenAsCollateralAmount,
  gasPaymentAllowanceData,
  tokenPermits,
  isGmxAccount,
}: {
  gasPaymentToken: TokenData;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAsCollateralAmount: bigint;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  tokenPermits: SignedTokenPermit[];
  isGmxAccount: boolean;
}): GasPaymentValidations {
  const gasTokenAmountWithBuffer = bigMath.mulDiv(gasPaymentTokenAmount, 13n, 10n);
  const totalGasPaymentTokenAmount = gasPaymentTokenAsCollateralAmount + gasTokenAmountWithBuffer;

  const tokenBalance = isGmxAccount ? gasPaymentToken.gmxAccountBalance : gasPaymentToken.walletBalance;
  const isOutGasTokenBalance = tokenBalance === undefined || totalGasPaymentTokenAmount > tokenBalance;

  const needGasPaymentTokenApproval = isGmxAccount
    ? false
    : getNeedTokenApprove(gasPaymentAllowanceData, gasPaymentToken.address, totalGasPaymentTokenAmount, tokenPermits);

  return {
    isOutGasTokenBalance,
    needGasPaymentTokenApproval,
    isValid: !isOutGasTokenBalance && !needGasPaymentTokenApproval,
  };
}

export type EstimateExpressParamsInput = {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  globalExpressParams: BuiltGlobalExpressParams;
  transactionParams: ExpressTransactionEstimatorParams;
  estimationMethod?: ExpressParamsEstimationMethod;
  requireValidations?: boolean;
  subaccount?: Subaccount;
  throwOnInvalid?: boolean;
  overrideGasLimit?: bigint;
  // For estimateGas mode
  rpc?: IRpc;
  simulationOrigin?: string;
  stateOverride?: StateOverrideEntry[];
  // Optional deps
  metrics?: IMetrics;
  gasPaymentAllowanceData?: TokensAllowanceData;
  getSubaccountValidations?: (params: {
    requiredActions: number;
    subaccount: Subaccount;
    subaccountRouterAddress: string;
  }) => SubaccountValidations;
};

export async function estimateExpressParams({
  chainId,
  isGmxAccount,
  transactionParams,
  globalExpressParams,
  estimationMethod = "approximate",
  requireValidations = true,
  subaccount: rawSubaccount,
  throwOnInvalid = false,
  overrideGasLimit,
  rpc,
  simulationOrigin,
  stateOverride,
  metrics = noopMetrics,
  gasPaymentAllowanceData,
  getSubaccountValidations,
}: EstimateExpressParamsInput): Promise<ExpressTxnParams | undefined> {
  if (requireValidations && !transactionParams.isValid) {
    if (throwOnInvalid) {
      throw new ExpressEstimationError("transactionParams is invalid");
    }
    return undefined;
  }

  const {
    findFeeSwapPath,
    gasLimits,
    gasPaymentToken,
    relayerFeeToken,
    l1Reference,
    tokenPermits: rawTokenPermits,
    gasPrice,
    bufferBps,
  } = globalExpressParams;

  const {
    expressTransactionBuilder,
    gasPaymentTokenAsCollateralAmount,
    executionFeeAmount,
    executionGasLimit,
    transactionPayloadGasLimit,
    transactionExternalCalls,
    subaccountActions,
    account,
  } = transactionParams;

  const subaccountRouterAddress = rawSubaccount
    ? getExpressContractAddress(chainId, {
        isSubaccount: true,
        isMultichain: isGmxAccount,
        scope: "subaccount",
      })
    : undefined;

  const subaccountValidations =
    rawSubaccount && getSubaccountValidations && subaccountRouterAddress
      ? getSubaccountValidations({
          requiredActions: subaccountActions,
          subaccount: rawSubaccount,
          subaccountRouterAddress,
        })
      : undefined;

  const subaccount = subaccountValidations?.isValid ? rawSubaccount : undefined;

  const tokenPermits = isGmxAccount ? [] : rawTokenPermits;

  // --- Pass 1: base estimate with assumed feeSwapsCount=1, oraclePriceCount=2 ---
  const baseRelayerGasLimit =
    overrideGasLimit ??
    estimateRelayerGasLimit({
      gasLimits,
      tokenPermitsCount: tokenPermits.length,
      feeSwapsCount: 1,
      feeExternalCallsGasLimit: 0n,
      oraclePriceCount: 2,
      l1GasLimit: l1Reference?.gasLimit ?? 0n,
      transactionPayloadGasLimit,
    });

  const baseRelayerFeeAmount = baseRelayerGasLimit * gasPrice;
  const baseTotalRelayerFeeTokenAmount = baseRelayerFeeAmount + executionFeeAmount;

  const baseRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount: baseRelayerFeeAmount,
    totalRelayerFeeTokenAmount: baseTotalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    transactionExternalCalls,
    feeExternalSwapQuote: undefined,
    findFeeSwapPath,
  });

  if (!baseRelayFeeParams) {
    if (throwOnInvalid) {
      throw new ExpressEstimationError("baseRelayFeeParams is undefined");
    }
    return undefined;
  }

  const baseRelayParams = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    feeParams: baseRelayFeeParams.feeParams,
    externalCalls: baseRelayFeeParams.externalCalls,
    tokenPermits,
  });

  // Build txn to measure calldata size for L1 gas buffer
  const baseTxn = await expressTransactionBuilder({
    relayParams: baseRelayParams,
    gasPaymentParams: baseRelayFeeParams.gasPaymentParams,
    subaccount,
  });

  const l1GasLimit = l1Reference
    ? approximateL1GasBuffer({
        l1Reference,
        sizeOfData: BigInt(size(baseTxn.txnData.callData as `0x${string}`)),
      })
    : 0n;

  // --- Determine gas limit ---
  let gasLimit: bigint;

  if (overrideGasLimit !== undefined) {
    gasLimit = overrideGasLimit;
  } else if (estimationMethod === "estimateGas") {
    if (!rpc || !simulationOrigin) {
      throw new ExpressEstimationError("rpc and simulationOrigin are required for estimateGas mode");
    }

    const baseGasPaymentValidations = getGasPaymentValidations({
      gasPaymentToken,
      gasPaymentTokenAsCollateralAmount,
      gasPaymentTokenAmount: baseRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
      gasPaymentAllowanceData,
      isGmxAccount,
      tokenPermits,
    });

    if (
      baseGasPaymentValidations.isOutGasTokenBalance ||
      baseGasPaymentValidations.needGasPaymentTokenApproval ||
      !transactionParams.isValid
    ) {
      if (throwOnInvalid) {
        throw new ExpressEstimationInsufficientGasPaymentTokenBalanceError({
          balance: isGmxAccount ? gasPaymentToken.gmxAccountBalance : gasPaymentToken.walletBalance,
          requiredAmount: baseRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
        });
      }
      return undefined;
    }

    try {
      const estimated = await rpc.estimateGas({
        from: simulationOrigin,
        to: baseTxn.txnData.to,
        data: baseTxn.txnData.callData,
        value: 0n,
        stateOverride,
      });
      gasLimit = estimated < 22000n ? 22000n : estimated;
      gasLimit = (gasLimit * 11n) / 10n;
    } catch (error) {
      if (!isIgnoredEstimateGasError(error as ErrorLike)) {
        metrics.pushError(extendError(error as ErrorLike, { data: { estimationMethod } }), "expressOrders.estimateGas");
      }

      if (throwOnInvalid) {
        throw new ExpressEstimationError("gas limit estimation failed");
      }
      return undefined;
    }
  } else {
    // approximate mode
    gasLimit = estimateRelayerGasLimit({
      gasLimits,
      tokenPermitsCount: tokenPermits.length,
      feeSwapsCount: baseRelayFeeParams.feeParams.feeSwapPath.length,
      feeExternalCallsGasLimit: baseRelayFeeParams.feeExternalSwapGasLimit,
      oraclePriceCount: baseRelayParams.oracleParams.tokens.length,
      l1GasLimit,
      transactionPayloadGasLimit,
    });
  }

  // --- Pass 2: final fee calculation with actual gas limit ---
  let relayerFeeAmount = applyFactor(gasLimit * gasPrice, gasLimits.gelatoRelayFeeMultiplierFactor);

  const buffer = bigMath.mulDiv(relayerFeeAmount, BigInt(bufferBps), BASIS_POINTS_DIVISOR_BIGINT);
  relayerFeeAmount += buffer;

  const totalRelayerFeeTokenAmount = relayerFeeAmount + executionFeeAmount;

  const finalRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount,
    totalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    transactionExternalCalls,
    feeExternalSwapQuote: undefined,
    findFeeSwapPath,
  });

  if (!finalRelayFeeParams) {
    if (throwOnInvalid) {
      throw new ExpressEstimationError("finalRelayFeeParams is undefined");
    }
    return undefined;
  }

  const finalRelayParams = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    feeParams: finalRelayFeeParams.feeParams,
    externalCalls: finalRelayFeeParams.externalCalls,
    tokenPermits,
  });

  // --- Validations ---
  const gasPaymentValidations = getGasPaymentValidations({
    gasPaymentToken,
    gasPaymentTokenAmount: finalRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    gasPaymentAllowanceData,
    isGmxAccount,
    tokenPermits,
  });

  if (requireValidations && !getIsValidExpressParams({ chainId, gasPaymentValidations })) {
    if (throwOnInvalid) {
      throw new ExpressEstimationInsufficientGasPaymentTokenBalanceError({
        balance: isGmxAccount ? gasPaymentToken.gmxAccountBalance : gasPaymentToken.walletBalance,
        requiredAmount: finalRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
      });
    }
    return undefined;
  }

  return {
    chainId,
    subaccount,
    relayParamsPayload: finalRelayParams,
    gasPaymentParams: finalRelayFeeParams.gasPaymentParams,
    executionFeeAmount,
    executionGasLimit,
    estimationMethod: estimationMethod ?? "approximate",
    gasLimit,
    l1GasLimit,
    gasPrice,
    subaccountValidations,
    gasPaymentValidations,
    isGmxAccount,
  };
}
