import { getSourceChainDecimalsMapped } from "config/multichain";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { absDiffBps, formatAmountFree, formatBalanceAmount } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getResidualGasUsd, RESIDUAL_GAS_AMOUNT_MULTIPLIER } from "sdk/configs/fees";
import { bigMath } from "sdk/utils/bigmath";

import { getLowGasPaymentTokenBalanceWarning } from "components/Errors/LowGasPaymentTokenBalanceWarning";

export function applyMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 13n, 10n);
}

export function applyValidMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 14n, 10n);
}

export function getMaxAvailableTokenAmount({
  chainId,
  fromTokenAddress,
  fromTokenBalance,
  gasPaymentToken,
  gasPaymentTokenBalance,
  gasPaymentTokenAmount = 0n,
  fallbackGasPaymentTokenAmount = 0n,
  ignoreGasPaymentToken = false,
  useMinimalBuffer = false,
}: {
  chainId: ContractsChainId;
  fromTokenAddress: string | undefined;
  fromTokenBalance: bigint | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenBalance: bigint | undefined;
  gasPaymentTokenAmount?: bigint;
  fallbackGasPaymentTokenAmount?: bigint;
  ignoreGasPaymentToken?: boolean;
  useMinimalBuffer?: boolean;
}): {
  maxAvailableAmount: bigint;
  bufferType?: "safe" | "minimal";
} {
  if (fromTokenBalance === undefined || (!ignoreGasPaymentToken && gasPaymentToken === undefined)) {
    return {
      maxAvailableAmount: 0n,
      bufferType: undefined,
    };
  }

  if (ignoreGasPaymentToken || (gasPaymentToken !== undefined && fromTokenAddress !== gasPaymentToken.address)) {
    return {
      maxAvailableAmount: fromTokenBalance,
      bufferType: "safe",
    };
  }

  if (gasPaymentToken === undefined || gasPaymentTokenBalance === undefined) {
    return {
      maxAvailableAmount: 0n,
      bufferType: undefined,
    };
  }

  const effectiveGasPaymentTokenAmount =
    gasPaymentTokenAmount > 0n ? gasPaymentTokenAmount : fallbackGasPaymentTokenAmount;

  if (!useMinimalBuffer) {
    const { min: minResidualUsd, max: maxResidualUsd } = getResidualGasUsd(chainId);

    const minResidualAmount = convertToTokenAmount(
      minResidualUsd,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.minPrice
    )!;

    const maxResidualAmount = convertToTokenAmount(
      maxResidualUsd,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.maxPrice
    )!;

    let safeBuffer = bigMath.clamp(
      effectiveGasPaymentTokenAmount * RESIDUAL_GAS_AMOUNT_MULTIPLIER,
      minResidualAmount,
      maxResidualAmount
    );

    if (safeBuffer + effectiveGasPaymentTokenAmount <= gasPaymentTokenBalance) {
      return {
        maxAvailableAmount: gasPaymentTokenBalance - safeBuffer - effectiveGasPaymentTokenAmount,
        bufferType: "safe",
      };
    }
  }

  if (effectiveGasPaymentTokenAmount > 0n) {
    const minimalBuffer = applyValidMinimalBuffer(effectiveGasPaymentTokenAmount);
    if (gasPaymentTokenBalance >= minimalBuffer) {
      return {
        maxAvailableAmount: gasPaymentTokenBalance - minimalBuffer,
        bufferType: "minimal",
      };
    }
  }

  return { maxAvailableAmount: 0n, bufferType: undefined };
}

export function useMaxAvailableAmount({
  fromToken,
  fromTokenBalance,
  fromTokenAmount = 0n,
  fromTokenInputValue,
  isLoading = false,
  srcChainId,
  gasPaymentToken,
  gasPaymentTokenBalance,
  gasPaymentTokenAmount,
  fallbackGasPaymentTokenAmount,
  ignoreGasPaymentToken = false,
  useMinimalBuffer = false,
  isGmxAccount = false,
}: {
  fromToken: TokenData | undefined;
  fromTokenBalance: bigint | undefined;
  fromTokenAmount: bigint | undefined;
  fromTokenInputValue: string;
  isLoading?: boolean;
  /**
   * Only pass when tokens are on different chains, this will get the correct decimals
   */
  srcChainId?: SourceChainId;
  gasPaymentToken?: TokenData;
  gasPaymentTokenBalance?: bigint;
  gasPaymentTokenAmount?: bigint;
  /**
   * Conservative lower bound on the order's executionFee, used when the real fee
   * can't be computed yet (e.g., no swap path and no external quote).
   */
  fallbackGasPaymentTokenAmount?: bigint;
  /**
   * For cases when pay token is guaranteed to be different from from token
   */
  ignoreGasPaymentToken?: boolean;
  /**
   * For cases when user swaps from one gas payment token to another gas payment token
   */
  useMinimalBuffer?: boolean;
  isGmxAccount?: boolean;
}): {
  formattedBalance: string;
  formattedMaxAvailableAmount: string;
  maxAvailableAmount: bigint;
  showClickMax: boolean;
  gasPaymentTokenWarningContent: string | undefined;
} {
  const { chainId } = useChainId();
  const isMetamaskMobile = useIsMetamaskMobile();

  const { maxAvailableAmount, bufferType } = getMaxAvailableTokenAmount({
    chainId,
    fromTokenAddress: fromToken?.address,
    fromTokenBalance,
    gasPaymentToken,
    gasPaymentTokenBalance,
    gasPaymentTokenAmount,
    fallbackGasPaymentTokenAmount,
    ignoreGasPaymentToken,
    useMinimalBuffer,
  });

  if (fromToken === undefined || fromTokenBalance === undefined) {
    return {
      formattedBalance: "",
      formattedMaxAvailableAmount: "",
      maxAvailableAmount: 0n,
      showClickMax: false,
      gasPaymentTokenWarningContent: undefined,
    };
  }

  const decimals = srcChainId
    ? getSourceChainDecimalsMapped(chainId, srcChainId, fromToken.address) ?? fromToken.decimals
    : fromToken.decimals;

  const formattedBalance = formatBalanceAmount(fromTokenBalance, decimals, undefined, {
    isStable: fromToken.isStable,
  });

  const needsGasBuffer =
    !ignoreGasPaymentToken && gasPaymentToken !== undefined && fromToken.address === gasPaymentToken.address;

  if (isLoading && needsGasBuffer) {
    return {
      formattedBalance,
      formattedMaxAvailableAmount: "",
      maxAvailableAmount,
      showClickMax: false,
      gasPaymentTokenWarningContent: undefined,
    };
  }

  let gasPaymentTokenWarningContent: string | undefined;
  if (
    gasPaymentToken !== undefined &&
    gasPaymentTokenAmount !== undefined &&
    gasPaymentToken.address === fromToken.address &&
    maxAvailableAmount > 0n &&
    fromTokenAmount !== undefined &&
    fromTokenAmount > 0n
  ) {
    const isDifferentEnough = fromTokenAmount > maxAvailableAmount;
    const aboveBalance = fromTokenAmount > fromTokenBalance;

    if (!aboveBalance && (bufferType === "minimal" || isDifferentEnough)) {
      gasPaymentTokenWarningContent = getLowGasPaymentTokenBalanceWarning({
        chainId,
        isGmxAccount,
        symbol: gasPaymentToken.symbol,
      });
    }
  }

  const formattedMaxAvailableAmount = formatAmountFree(
    maxAvailableAmount,
    decimals,
    isMetamaskMobile ? MAX_METAMASK_MOBILE_DECIMALS : undefined
  );

  const isFromTokenInputValueNearMax = absDiffBps(fromTokenAmount, maxAvailableAmount) < 100n; /* 1% */

  const showClickMax = fromToken.isNative
    ? !isFromTokenInputValueNearMax
    : fromTokenInputValue !== formattedMaxAvailableAmount && maxAvailableAmount > 0n;

  return {
    formattedBalance,
    formattedMaxAvailableAmount,
    maxAvailableAmount,
    showClickMax,
    gasPaymentTokenWarningContent,
  };
}
