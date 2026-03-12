import { t, Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { ErrorData, tryDecodeCustomError } from "lib/errors";
import { formatPercentage, formatUsd } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";
import { CustomErrorName } from "sdk/utils/errors/transactionsErrors";

export function getContractErrorToastContent({
  chainId,
  errorData,
  slippageInputId,
  decodeDepth = 0,
}: {
  chainId: number;
  errorData: Pick<ErrorData, "contractError" | "contractErrorArgs">;
  slippageInputId?: string;
  decodeDepth?: number;
}): ReactNode | undefined {
  if (!errorData.contractError) {
    return undefined;
  }

  const args = errorData.contractErrorArgs;

  switch (errorData.contractError) {
    case CustomErrorName.OrderNotFulfillableAtAcceptablePrice:
    case CustomErrorName.InsufficientSwapOutputAmount:
      return (
        <Trans>
          Order error. Prices are volatile for this market, try again by{" "}
          <span
            onClick={() => {
              if (slippageInputId) {
                document.getElementById(slippageInputId)?.focus();
              }
            }}
            className={slippageInputId ? "cursor-pointer underline" : undefined}
          >
            <Trans>increasing the allowed slippage</Trans>
          </span>
        </Trans>
      );

    case CustomErrorName.InsufficientCollateralAmount: {
      const collateralAmount = getBigIntContractErrorArg(args, 0, "collateralAmount");
      const collateralDeltaAmount = getBigIntContractErrorArg(args, 1, "collateralDeltaAmount");
      const missingCollateralAmount =
        collateralAmount !== undefined && collateralDeltaAmount !== undefined && collateralDeltaAmount < 0n
          ? absBigint(collateralDeltaAmount) - collateralAmount
          : undefined;
      const amountText =
        missingCollateralAmount !== undefined && missingCollateralAmount > 0n
          ? formatInteger(missingCollateralAmount)
          : undefined;

      return amountText
        ? t`Insufficient collateral. Need ${amountText} more collateral`
        : t`Insufficient collateral. Need more collateral`;
    }

    case CustomErrorName.InsufficientCollateralUsd: {
      const remainingCollateralUsd = getBigIntContractErrorArg(args, 0, "remainingCollateralUsd");
      const missingCollateralUsd = remainingCollateralUsd !== undefined ? absBigint(remainingCollateralUsd) : undefined;
      const missingCollateralUsdText = formatUsdValue(missingCollateralUsd);

      return missingCollateralUsdText
        ? t`Insufficient collateral. Need ${missingCollateralUsdText} more`
        : t`Insufficient collateral. Need more`;
    }

    case CustomErrorName.LiquidatablePosition: {
      const remainingCollateralUsd = getBigIntContractErrorArg(args, 1, "remainingCollateralUsd");
      const minCollateralUsd = getBigIntContractErrorArg(args, 2, "minCollateralUsd");

      const remainingCollateralUsdText = formatUsdValue(remainingCollateralUsd);
      const minCollateralUsdText = formatUsdValue(minCollateralUsd);

      return remainingCollateralUsdText && minCollateralUsdText
        ? t`Position would be liquidatable. Current: ${remainingCollateralUsdText}, required: ${minCollateralUsdText}`
        : t`Position would be liquidatable`;
    }

    case CustomErrorName.UnableToWithdrawCollateral: {
      const estimatedRemainingCollateralUsd = getBigIntContractErrorArg(args, 0, "estimatedRemainingCollateralUsd");
      const estimatedRemainingCollateralUsdText = formatUsdValue(estimatedRemainingCollateralUsd);

      return estimatedRemainingCollateralUsdText
        ? t`Can't withdraw collateral. Remaining would be ${estimatedRemainingCollateralUsdText}, below minimum`
        : t`Can't withdraw collateral. Remaining collateral would be below minimum`;
    }

    case CustomErrorName.MaxOpenInterestExceeded: {
      const openInterest = getBigIntContractErrorArg(args, 0, "openInterest");
      const maxOpenInterest = getBigIntContractErrorArg(args, 1, "maxOpenInterest");

      const openInterestText = formatUsdValue(openInterest);
      const maxOpenInterestText = formatUsdValue(maxOpenInterest);

      return openInterestText && maxOpenInterestText
        ? t`Max open interest exceeded. Current: ${openInterestText}, max: ${maxOpenInterestText}`
        : t`Max open interest exceeded`;
    }

    case CustomErrorName.InsufficientReserveForOpenInterest: {
      const reservedUsd = getBigIntContractErrorArg(args, 0, "reservedUsd");
      const maxReservedUsd = getBigIntContractErrorArg(args, 1, "maxReservedUsd");
      const availableLiquidity =
        reservedUsd !== undefined && maxReservedUsd !== undefined ? maxReservedUsd - reservedUsd : undefined;
      const availableLiquidityText =
        availableLiquidity !== undefined
          ? formatUsdValue(availableLiquidity > 0n ? availableLiquidity : 0n)
          : undefined;

      return availableLiquidityText
        ? t`Insufficient liquidity. Available: ${availableLiquidityText}`
        : t`Insufficient liquidity`;
    }

    case CustomErrorName.InsufficientReserve:
      return t`Insufficient liquidity available in pool`;

    case CustomErrorName.MaxPoolAmountExceeded: {
      const poolAmount = getBigIntContractErrorArg(args, 0, "poolAmount");
      const maxPoolAmount = getBigIntContractErrorArg(args, 1, "maxPoolAmount");

      const poolAmountText = formatInteger(poolAmount);
      const maxPoolAmountText = formatInteger(maxPoolAmount);

      return poolAmountText && maxPoolAmountText
        ? t`Max pool capacity reached. Current: ${poolAmountText}, max: ${maxPoolAmountText}`
        : t`Max pool capacity reached`;
    }

    case CustomErrorName.MaxPoolUsdForDepositExceeded: {
      const maxPoolUsd = getBigIntContractErrorArg(args, 1, "maxPoolUsdForDeposit");
      const maxPoolUsdText = formatUsdValue(maxPoolUsd);

      return maxPoolUsdText ? t`Max deposit limit reached: ${maxPoolUsdText}` : t`Max deposit limit reached`;
    }

    case CustomErrorName.InsufficientPoolAmount: {
      const availableAmount = getBigIntContractErrorArg(args, 0, "poolAmount");
      const availableAmountText = formatInteger(availableAmount);

      return availableAmountText
        ? t`Insufficient pool liquidity. Available amount: ${availableAmountText}`
        : t`Insufficient pool liquidity`;
    }

    case CustomErrorName.MinPositionSize: {
      const positionSizeInUsd = getBigIntContractErrorArg(args, 0, "positionSizeInUsd");
      const minPositionSizeUsd = getBigIntContractErrorArg(args, 1, "minPositionSizeUsd");

      const minPositionSizeUsdText = formatUsdValue(minPositionSizeUsd);
      const positionSizeInUsdText = formatUsdValue(positionSizeInUsd);

      return minPositionSizeUsdText && positionSizeInUsdText
        ? t`Position size too small. Min: ${minPositionSizeUsdText}, current: ${positionSizeInUsdText}`
        : t`Position size too small`;
    }

    case CustomErrorName.InvalidDecreaseOrderSize: {
      const sizeDeltaUsd = getBigIntContractErrorArg(args, 0, "sizeDeltaUsd");
      const positionSizeInUsd = getBigIntContractErrorArg(args, 1, "positionSizeInUsd");
      const sizeDeltaUsdText = formatUsdValue(sizeDeltaUsd);
      const positionSizeInUsdText = formatUsdValue(positionSizeInUsd);

      return sizeDeltaUsdText && positionSizeInUsdText
        ? t`Invalid decrease size. Size delta (${sizeDeltaUsdText}) exceeds position size (${positionSizeInUsdText})`
        : t`Invalid decrease size`;
    }

    case CustomErrorName.PnlFactorExceededForLongs:
    case CustomErrorName.PnlFactorExceededForShorts: {
      const pnlToPoolFactor = getBigIntContractErrorArg(args, 0, "pnlToPoolFactor");
      const maxPnlFactor = getBigIntContractErrorArg(args, 1, "maxPnlFactor");

      const pnlToPoolFactorText = formatPnlFactorPercent(pnlToPoolFactor);
      const maxPnlFactorText = formatPnlFactorPercent(maxPnlFactor);

      return pnlToPoolFactorText && maxPnlFactorText
        ? t`Max profit limit reached. Current: ${pnlToPoolFactorText}, max: ${maxPnlFactorText}`
        : t`Max profit limit reached`;
    }

    case CustomErrorName.InsufficientOutputAmount: {
      const outputAmount = getBigIntContractErrorArg(args, 0, "outputAmount");
      const minOutputAmount = getBigIntContractErrorArg(args, 1, "minOutputAmount");
      const minOutputAmountText = formatInteger(minOutputAmount);
      const outputAmountText = formatInteger(outputAmount);

      return minOutputAmountText && outputAmountText
        ? t`Slippage exceeded. Expected min: ${minOutputAmountText}, actual: ${outputAmountText}`
        : t`Slippage exceeded`;
    }

    case CustomErrorName.OrderNotFound:
      return t`Order not found. May have been canceled or already executed`;
    case CustomErrorName.OrderNotUpdatable:
      return t`Order can't be updated. Type doesn't support modifications`;
    case CustomErrorName.OrderTypeCannotBeCreated:
      return t`Order type not available for creation`;

    case CustomErrorName.InsufficientExecutionGas: {
      const startingGas = getBigIntContractErrorArg(args, 0, "startingGas");
      const estimatedGasLimit = getBigIntContractErrorArg(args, 1, "estimatedGasLimit");
      const estimatedGasLimitText = formatInteger(estimatedGasLimit);
      const startingGasText = formatInteger(startingGas);

      return estimatedGasLimitText && startingGasText
        ? t`Insufficient gas for execution. Estimated: ${estimatedGasLimitText}, starting: ${startingGasText}`
        : t`Insufficient gas for execution`;
    }

    case CustomErrorName.DisabledMarket:
      return t`Market temporarily disabled`;

    case CustomErrorName.InvalidCollateralTokenForMarket: {
      const tokenAddress = getAddressContractErrorArg(args, 1, "token");
      const tokenSymbol = getTokenSymbol(tokenAddress, chainId);
      return tokenSymbol
        ? t`Invalid collateral token. ${tokenSymbol} isn't supported as collateral`
        : t`Invalid collateral token for this market`;
    }

    case CustomErrorName.MarketNotFound:
      return t`Market not found. May have been removed`;

    case CustomErrorName.MaxPriceAgeExceeded:
      return t`Price data too old. Oracle price is stale`;

    case CustomErrorName.InvalidOraclePrice: {
      const tokenAddress = getAddressContractErrorArg(args, 0, "token");
      const tokenSymbol = getTokenSymbol(tokenAddress, chainId);
      return tokenSymbol ? t`Invalid oracle price for ${tokenSymbol}` : t`Invalid oracle price`;
    }

    case CustomErrorName.EndOfOracleSimulation:
      return t`Order simulation failed`;

    case CustomErrorName.SwapPriceImpactExceedsAmountIn: {
      const amountAfterFees = getBigIntContractErrorArg(args, 0, "amountAfterFees");
      const negativeImpactAmount = getBigIntContractErrorArg(args, 1, "negativeImpactAmount");
      const negativeImpactAmountText = formatUsdValue(absBigintOrUndefined(negativeImpactAmount));
      const amountAfterFeesText = formatUsdValue(amountAfterFees);

      return negativeImpactAmountText && amountAfterFeesText
        ? t`Price impact too high. Impact: ${negativeImpactAmountText}, input: ${amountAfterFeesText}`
        : t`Price impact too high`;
    }

    case CustomErrorName.PriceImpactLargerThanOrderSize: {
      const priceImpactUsd = getBigIntContractErrorArg(args, 0, "priceImpactUsd");
      const sizeDeltaUsd = getBigIntContractErrorArg(args, 1, "sizeDeltaUsd");
      const priceImpactUsdText = formatUsdValue(absBigintOrUndefined(priceImpactUsd));
      const sizeDeltaUsdText = formatUsdValue(sizeDeltaUsd);

      return priceImpactUsdText && sizeDeltaUsdText
        ? t`Price impact exceeds order size. Impact: ${priceImpactUsdText}, order: ${sizeDeltaUsdText}`
        : t`Price impact exceeds order size`;
    }

    case CustomErrorName.ExternalCallFailed: {
      if (decodeDepth < 1) {
        const nestedErrorData = getAddressContractErrorArg(args, 0, "data");
        if (nestedErrorData) {
          const decodedExternalCallError = tryDecodeCustomError(nestedErrorData);

          if (decodedExternalCallError) {
            const nestedContractErrorMessage = getContractErrorToastContent({
              chainId,
              errorData: {
                contractError: decodedExternalCallError.name,
                contractErrorArgs: decodedExternalCallError.args,
              },
              slippageInputId,
              decodeDepth: decodeDepth + 1,
            });

            if (nestedContractErrorMessage) {
              return nestedContractErrorMessage;
            }
          }
        }
      }

      return t`Order execution failed`;
    }

    case CustomErrorName.InsufficientFundsToPayForCosts: {
      const remainingCostUsd = getBigIntContractErrorArg(args, 0, "remainingCostUsd");
      const remainingCostUsdText = formatUsdValue(remainingCostUsd);

      return remainingCostUsdText
        ? t`Insufficient funds to pay for order costs. Remaining: ${remainingCostUsdText}`
        : t`Insufficient funds to pay for order costs`;
    }

    case CustomErrorName.NegativeExecutionPrice:
      return t`Invalid execution price. Calculated price is negative`;

    case CustomErrorName.UsdDeltaExceedsLongOpenInterest: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const openInterest = getBigIntContractErrorArg(args, 1, "longOpenInterest");
      const usdDeltaText = formatUsdValue(absBigintOrUndefined(usdDelta));
      const openInterestText = formatUsdValue(openInterest);

      return usdDeltaText && openInterestText
        ? t`Position size exceeds available open interest. Delta: ${usdDeltaText}, max OI: ${openInterestText}`
        : t`Position size exceeds available open interest`;
    }

    case CustomErrorName.UsdDeltaExceedsShortOpenInterest: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const openInterest = getBigIntContractErrorArg(args, 1, "shortOpenInterest");
      const usdDeltaText = formatUsdValue(absBigintOrUndefined(usdDelta));
      const openInterestText = formatUsdValue(openInterest);

      return usdDeltaText && openInterestText
        ? t`Position size exceeds available open interest. Delta: ${usdDeltaText}, max OI: ${openInterestText}`
        : t`Position size exceeds available open interest`;
    }

    case CustomErrorName.UsdDeltaExceedsPoolValue: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const poolUsd = getBigIntContractErrorArg(args, 1, "poolUsd");
      const usdDeltaText = formatUsdValue(absBigintOrUndefined(usdDelta));
      const poolUsdText = formatUsdValue(poolUsd);

      return usdDeltaText && poolUsdText
        ? t`Position size exceeds pool value. Delta: ${usdDeltaText}, pool: ${poolUsdText}`
        : t`Position size exceeds pool value`;
    }

    default:
      return undefined;
  }
}

function getContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  if (!contractErrorArgs) {
    return undefined;
  }

  if (Array.isArray(contractErrorArgs)) {
    return contractErrorArgs[index];
  }

  if (typeof contractErrorArgs === "object") {
    if (key && key in contractErrorArgs) {
      return contractErrorArgs[key];
    }

    return Object.values(contractErrorArgs)[index];
  }

  return undefined;
}

function getBigIntContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  const value = getContractErrorArg(contractErrorArgs, index, key);
  return typeof value === "bigint" ? value : undefined;
}

function getAddressContractErrorArg(contractErrorArgs: ErrorData["contractErrorArgs"], index: number, key?: string) {
  const value = getContractErrorArg(contractErrorArgs, index, key);
  return typeof value === "string" ? value : undefined;
}

function formatUsdValue(value: bigint | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return formatUsd(value);
}

function formatPnlFactorPercent(value: bigint | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return formatPercentage(value, { bps: false });
}

function formatInteger(value: bigint | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value.toLocaleString("en-US");
}

function absBigint(value: bigint) {
  return value < 0n ? -value : value;
}

function absBigintOrUndefined(value: bigint | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return absBigint(value);
}

function getTokenSymbol(tokenAddress: string | undefined, chainId: number) {
  if (!tokenAddress) {
    return undefined;
  }

  try {
    return getToken(chainId, tokenAddress).symbol;
  } catch {
    return undefined;
  }
}
