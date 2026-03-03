import { getSourceChainDecimalsMapped } from "config/multichain";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { absDiffBps, formatAmountFree, formatBalanceAmount } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { SourceChainId } from "sdk/configs/chains";
import {
  DEFAULT_MAX_RESIDUAL_GAS_USD,
  DEFAULT_MIN_RESIDUAL_GAS_USD,
  RESIDUAL_GAS_AMOUNT_MULTIPLIER,
} from "sdk/configs/fees";
import { bigMath } from "sdk/utils/bigmath";

import { getLowGasPaymentTokenBalanceWarning } from "components/Errors/LowGasPaymentTokenBalanceWarning";

export function applyMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 13n, 10n);
}

export function applyValidMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 14n, 10n);
}

export function getMaxAvailableTokenAmount({
  fromTokenAddress,
  fromTokenBalance,
  gasPaymentToken,
  gasPaymentTokenBalance,
  gasPaymentTokenAmount,
  ignoreGasPaymentToken = false,
  useMinimalBuffer = false,
}: {
  fromTokenAddress: string | undefined;
  fromTokenBalance: bigint | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenBalance: bigint | undefined;
  gasPaymentTokenAmount: bigint | undefined;
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

  if (gasPaymentToken === undefined || gasPaymentTokenBalance === undefined || gasPaymentTokenAmount === undefined) {
    return {
      maxAvailableAmount: 0n,
      bufferType: undefined,
    };
  }

  if (!useMinimalBuffer) {
    const minResidualAmount = convertToTokenAmount(
      DEFAULT_MIN_RESIDUAL_GAS_USD,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.minPrice
    )!;

    const maxResidualAmount = convertToTokenAmount(
      DEFAULT_MAX_RESIDUAL_GAS_USD,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.maxPrice
    )!;

    let safeBuffer = bigMath.clamp(
      gasPaymentTokenAmount * RESIDUAL_GAS_AMOUNT_MULTIPLIER,
      minResidualAmount,
      maxResidualAmount
    );

    if (safeBuffer + gasPaymentTokenAmount <= gasPaymentTokenBalance) {
      return {
        maxAvailableAmount: gasPaymentTokenBalance - safeBuffer - gasPaymentTokenAmount,
        bufferType: "safe",
      };
    }
  }

  const minimalBuffer = applyValidMinimalBuffer(gasPaymentTokenAmount);
  if (gasPaymentTokenBalance >= minimalBuffer) {
    return {
      maxAvailableAmount: gasPaymentTokenBalance - minimalBuffer,
      bufferType: "minimal",
    };
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
  ignoreGasPaymentToken = false,
  useMinimalBuffer = false,
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
   * For cases when pay token is guaranteed to be different from from token
   */
  ignoreGasPaymentToken?: boolean;
  /**
   * For cases when user swaps from one gas payment token to another gas payment token
   */
  useMinimalBuffer?: boolean;
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
    fromTokenAddress: fromToken?.address,
    fromTokenBalance,
    gasPaymentToken,
    gasPaymentTokenBalance,
    gasPaymentTokenAmount,
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

  if (isLoading) {
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
