import { t } from "@lingui/macro";

import { getSourceChainDecimalsMapped } from "config/multichain";
import {
  getInsufficientFeeAction,
  getNetworkFeeSource,
  getNetworkFeeSourceLabel,
  getSourceChainNetworkFeeSource,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getResidualGasUsd, RESIDUAL_GAS_AMOUNT_MULTIPLIER } from "sdk/configs/fees";
import { bigMath } from "sdk/utils/bigmath";

import { getLowGasPaymentTokenBalanceWarning } from "components/Errors/LowGasPaymentTokenBalanceWarning";

export type MaxActionSelection = "max" | "keepGas";

export type MaxActionsState = {
  selected: MaxActionSelection | undefined;
  isLoading: boolean;
  isInsufficientForFee: boolean;
  showKeepGas: boolean;
  maxTooltip: string | undefined;
  keepGasTooltip: string | undefined;
  hint: string | undefined;
};

export const DEFAULT_MAX_ACTIONS_STATE: MaxActionsState = {
  selected: undefined,
  isLoading: false,
  isInsufficientForFee: false,
  showKeepGas: false,
  maxTooltip: undefined,
  keepGasTooltip: undefined,
  hint: undefined,
};

export function applyMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 13n, 10n);
}

export function applyValidMinimalBuffer(value: bigint): bigint {
  return bigMath.mulDiv(value, 14n, 10n);
}

export type MaxAvailableTokenAmountDetails = {
  maxAvailableAmount: bigint;
  keepGasAmount: bigint | undefined;
  feeHoldbackAmount: bigint;
  reserveAmount: bigint | undefined;
  isFeeLoading: boolean;
  isInsufficientForFee: boolean;
};

const EMPTY_DETAILS: MaxAvailableTokenAmountDetails = {
  maxAvailableAmount: 0n,
  keepGasAmount: undefined,
  feeHoldbackAmount: 0n,
  reserveAmount: undefined,
  isFeeLoading: false,
  isInsufficientForFee: false,
};

export function getMaxAvailableTokenAmount({
  chainId,
  fromTokenAddress,
  fromTokenBalance,
  feeToken,
  feeTokenAmount,
  fallbackFeeTokenAmount,
  reserveToken,
}: {
  chainId: ContractsChainId;
  fromTokenAddress: string | undefined;
  fromTokenBalance: bigint | undefined;
  feeToken: TokenData | undefined;
  feeTokenAmount: bigint | undefined;
  fallbackFeeTokenAmount: bigint | undefined;
  reserveToken: TokenData | undefined;
}): MaxAvailableTokenAmountDetails {
  if (fromTokenBalance === undefined) {
    return EMPTY_DETAILS;
  }

  const sameSourceFee = feeToken !== undefined && feeToken.address === fromTokenAddress;
  const effectiveFee =
    feeTokenAmount !== undefined && feeTokenAmount > 0n ? feeTokenAmount : fallbackFeeTokenAmount ?? feeTokenAmount;

  if (sameSourceFee && effectiveFee === undefined) {
    return { ...EMPTY_DETAILS, isFeeLoading: true };
  }

  const feeHoldbackAmount = sameSourceFee ? applyValidMinimalBuffer(effectiveFee!) : 0n;
  const isInsufficientForFee = sameSourceFee && fromTokenBalance <= feeHoldbackAmount;
  const maxAvailableAmount = isInsufficientForFee ? 0n : fromTokenBalance - feeHoldbackAmount;

  const feeUsd =
    feeToken !== undefined && effectiveFee !== undefined
      ? convertToUsd(effectiveFee, feeToken.decimals, feeToken.prices.maxPrice)!
      : 0n;
  const { min, max } = getResidualGasUsd(chainId);
  const reserveUsd = bigMath.clamp(feeUsd * RESIDUAL_GAS_AMOUNT_MULTIPLIER, min, max);

  const reserveEligible = reserveToken !== undefined && reserveToken.address === fromTokenAddress;
  const reserveAmount = reserveEligible
    ? convertToTokenAmount(reserveUsd, reserveToken.decimals, reserveToken.prices.minPrice)!
    : undefined;

  const keepGasAmount =
    reserveAmount !== undefined && maxAvailableAmount - reserveAmount > 0n
      ? maxAvailableAmount - reserveAmount
      : undefined;

  return {
    maxAvailableAmount,
    keepGasAmount,
    feeHoldbackAmount,
    reserveAmount,
    isFeeLoading: false,
    isInsufficientForFee,
  };
}

export function getMaxActionSelection({
  fromTokenAmount,
  maxAvailableAmount,
  keepGasAmount,
}: {
  fromTokenAmount: bigint;
  maxAvailableAmount: bigint;
  keepGasAmount: bigint | undefined;
}): MaxActionSelection | undefined {
  if (maxAvailableAmount > 0n && fromTokenAmount === maxAvailableAmount) {
    return "max";
  }

  if (keepGasAmount !== undefined && fromTokenAmount === keepGasAmount) {
    return "keepGas";
  }

  return undefined;
}

export function shouldShowGasPaymentTokenWarning({
  fromTokenAmount,
  fromTokenBalance,
  maxAvailableAmount,
  keepGasAmount,
  reserveAmount,
  selected,
}: {
  fromTokenAmount: bigint;
  fromTokenBalance: bigint;
  maxAvailableAmount: bigint;
  keepGasAmount: bigint | undefined;
  reserveAmount: bigint | undefined;
  selected: MaxActionSelection | undefined;
}): boolean {
  return (
    reserveAmount !== undefined &&
    selected === undefined &&
    maxAvailableAmount > 0n &&
    fromTokenAmount > 0n &&
    fromTokenAmount <= fromTokenBalance &&
    fromTokenAmount > (keepGasAmount ?? 0n)
  );
}

export function getMaxActionsHint({
  selected,
  feeHoldbackAmount,
  reserveAmount,
  symbol,
  decimals,
  isStable,
  sourceLabel: source,
}: {
  selected: MaxActionSelection | undefined;
  feeHoldbackAmount: bigint;
  reserveAmount: bigint | undefined;
  symbol: string;
  decimals: number;
  isStable: boolean | undefined;
  sourceLabel: string;
}): string | undefined {
  if (selected === undefined) {
    return undefined;
  }

  const holdback = formatBalanceAmount(feeHoldbackAmount, decimals, undefined, { isStable });
  const reserve =
    reserveAmount !== undefined ? formatBalanceAmount(reserveAmount, decimals, undefined, { isStable }) : "";
  const hasHoldback = feeHoldbackAmount > 0n;
  const hasReserve = reserveAmount !== undefined;

  if (selected === "max") {
    if (hasHoldback && hasReserve) {
      return t`Reserves ~${holdback} ${symbol} for this transaction's fee. Leaves no ${symbol} in your ${source} for future Express fees.`;
    }
    if (hasHoldback) {
      return t`Reserves ~${holdback} ${symbol} for this transaction's fee.`;
    }
    if (hasReserve) {
      return t`Leaves no ${symbol} in your ${source} for future Express fees.`;
    }
    return undefined;
  }

  if (hasHoldback) {
    return t`Keeps ${reserve} ${symbol} in your ${source} for future Express fees and ~${holdback} ${symbol} for this transaction's fee.`;
  }

  return t`Keeps ${reserve} ${symbol} in your ${source} for future Express fees.`;
}

export function getKeepGasTooltip({
  reserveAmount,
  symbol,
  decimals,
  isStable,
  sourceLabel: source,
}: {
  reserveAmount: bigint;
  symbol: string;
  decimals: number;
  isStable: boolean | undefined;
  sourceLabel: string;
}): string {
  const reserve = formatBalanceAmount(reserveAmount, decimals, undefined, { isStable });

  return t`Fills Max minus ${reserve} ${symbol}, kept in your ${source} for future Express fees.`;
}

export function getInsufficientFeeTooltip({
  symbol,
  feeHoldbackAmount,
  decimals,
  isStable,
  feeSource,
}: {
  symbol: string;
  feeHoldbackAmount: bigint;
  decimals: number;
  isStable: boolean | undefined;
  feeSource: NetworkFeeSource;
}): string {
  const holdback = formatBalanceAmount(feeHoldbackAmount, decimals, undefined, { isStable });
  const source = getNetworkFeeSourceLabel(feeSource);

  return `${t`Not enough ${symbol} in your ${source} to cover this transaction's fee (~${holdback} ${symbol}).`} ${getInsufficientFeeAction({ tokenSymbol: symbol, feeSource })}`;
}

export function useMaxAvailableAmount({
  fromToken,
  fromTokenBalance,
  fromTokenAmount = 0n,
  isLoading = false,
  srcChainId,
  feeToken,
  feeTokenAmount,
  fallbackFeeTokenAmount,
  reserveToken,
  isGmxAccount = false,
}: {
  fromToken: TokenData | undefined;
  fromTokenBalance: bigint | undefined;
  fromTokenAmount: bigint | undefined;
  isLoading?: boolean;
  srcChainId?: SourceChainId;
  feeToken?: TokenData;
  feeTokenAmount?: bigint;
  fallbackFeeTokenAmount?: bigint;
  reserveToken?: TokenData;
  isGmxAccount?: boolean;
}): {
  formattedBalance: string;
  formattedMaxAvailableAmount: string;
  formattedKeepGasAmount: string | undefined;
  maxAvailableAmount: bigint;
  maxActions: MaxActionsState;
  gasPaymentTokenWarningContent: string | undefined;
} {
  const { chainId } = useChainId();

  const details = getMaxAvailableTokenAmount({
    chainId,
    fromTokenAddress: fromToken?.address,
    fromTokenBalance,
    feeToken,
    feeTokenAmount,
    fallbackFeeTokenAmount,
    reserveToken,
  });

  if (fromToken === undefined || fromTokenBalance === undefined) {
    return {
      formattedBalance: "",
      formattedMaxAvailableAmount: "",
      formattedKeepGasAmount: undefined,
      maxAvailableAmount: 0n,
      maxActions: DEFAULT_MAX_ACTIONS_STATE,
      gasPaymentTokenWarningContent: undefined,
    };
  }

  const decimals = srcChainId
    ? getSourceChainDecimalsMapped(chainId, srcChainId, fromToken.address) ?? fromToken.decimals
    : fromToken.decimals;

  const formattedBalance = formatBalanceAmount(fromTokenBalance, decimals, undefined, {
    isStable: fromToken.isStable,
  });

  const { maxAvailableAmount, keepGasAmount, feeHoldbackAmount, reserveAmount, isInsufficientForFee } = details;

  const sameSourceFee = feeToken !== undefined && feeToken.address === fromToken.address;
  const isSourceChain = srcChainId !== undefined && srcChainId !== chainId;
  const feeSource = isSourceChain ? getSourceChainNetworkFeeSource(srcChainId) : getNetworkFeeSource({ isGmxAccount });
  const sourceLabel = getNetworkFeeSourceLabel(feeSource);

  const isActionsLoading = details.isFeeLoading || (isLoading && sameSourceFee);
  const showKeepGas = keepGasAmount !== undefined;
  const selected = getMaxActionSelection({ fromTokenAmount, maxAvailableAmount, keepGasAmount });

  let maxTooltip: string | undefined;
  if (isActionsLoading) {
    maxTooltip = t`Loading fees...`;
  } else if (isInsufficientForFee) {
    maxTooltip = getInsufficientFeeTooltip({
      symbol: fromToken.symbol,
      feeHoldbackAmount,
      decimals,
      isStable: fromToken.isStable,
      feeSource,
    });
  }

  let keepGasTooltip: string | undefined;
  if (showKeepGas) {
    keepGasTooltip = isActionsLoading
      ? t`Loading fees...`
      : getKeepGasTooltip({
          reserveAmount: reserveAmount!,
          symbol: fromToken.symbol,
          decimals,
          isStable: fromToken.isStable,
          sourceLabel,
        });
  }

  const maxActions: MaxActionsState = {
    selected,
    isLoading: isActionsLoading,
    isInsufficientForFee,
    showKeepGas,
    maxTooltip,
    keepGasTooltip,
    hint: getMaxActionsHint({
      selected,
      feeHoldbackAmount,
      reserveAmount,
      symbol: fromToken.symbol,
      decimals,
      isStable: fromToken.isStable,
      sourceLabel,
    }),
  };

  const gasPaymentTokenWarningContent =
    !isActionsLoading &&
    shouldShowGasPaymentTokenWarning({
      fromTokenAmount,
      fromTokenBalance,
      maxAvailableAmount,
      keepGasAmount,
      reserveAmount,
      selected,
    })
      ? getLowGasPaymentTokenBalanceWarning({
          chainId: srcChainId ?? chainId,
          isGmxAccount,
          symbol: fromToken.symbol,
        })
      : undefined;

  return {
    formattedBalance,
    formattedMaxAvailableAmount: maxAvailableAmount > 0n ? formatAmountFree(maxAvailableAmount, decimals) : "",
    formattedKeepGasAmount: keepGasAmount !== undefined ? formatAmountFree(keepGasAmount, decimals) : undefined,
    maxAvailableAmount,
    maxActions,
    gasPaymentTokenWarningContent,
  };
}
