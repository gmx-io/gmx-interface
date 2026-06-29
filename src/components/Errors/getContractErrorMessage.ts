import { t } from "@lingui/macro";

import { ErrorData, getBigIntContractErrorArg, getStringContractErrorArg, tryDecodeCustomError } from "lib/errors";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { TOKENS_MAP } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { CustomErrorName } from "sdk/utils/errors/transactionsErrors";

export function getContractErrorMessage({
  chainId,
  errorData,
  decodeDepth = 0,
}: {
  chainId?: number;
  errorData: Pick<ErrorData, "contractError" | "contractErrorArgs">;
  decodeDepth?: number;
}): string | undefined {
  if (!errorData.contractError) {
    return undefined;
  }

  const args = errorData.contractErrorArgs;

  switch (errorData.contractError) {
    case CustomErrorName.InsufficientCollateralAmount:
      return t`Insufficient margin. Fees are deducted from the deposited collateral before it improves the position's margin, deposit more to cover them`;

    case CustomErrorName.InsufficientCollateralUsd: {
      const remainingCollateralUsd = getBigIntContractErrorArg(args, 0, "remainingCollateralUsd");
      const missingCollateralUsd =
        remainingCollateralUsd !== undefined ? bigMath.abs(remainingCollateralUsd) : undefined;
      const missingCollateralUsdText = formatUsd(missingCollateralUsd);

      return missingCollateralUsdText
        ? t`Insufficient margin. Add ${missingCollateralUsdText} more margin`
        : t`Insufficient margin. Add more margin`;
    }

    case CustomErrorName.LiquidatablePosition: {
      const remainingCollateralUsd = getBigIntContractErrorArg(args, 1, "remainingCollateralUsd");
      const minCollateralUsd = getBigIntContractErrorArg(args, 2, "minCollateralUsd");

      const remainingCollateralUsdText = formatUsd(remainingCollateralUsd);
      const minCollateralUsdText = formatUsd(minCollateralUsd);

      return remainingCollateralUsdText && minCollateralUsdText
        ? t`Position would be liquidatable. Current: ${remainingCollateralUsdText}, required: ${minCollateralUsdText}`
        : t`Position would be liquidatable`;
    }

    case CustomErrorName.UnableToWithdrawCollateral: {
      const estimatedRemainingCollateralUsd = getBigIntContractErrorArg(args, 0, "estimatedRemainingCollateralUsd");
      const estimatedRemainingCollateralUsdText = formatUsd(estimatedRemainingCollateralUsd);

      return estimatedRemainingCollateralUsdText
        ? t`Can't withdraw collateral. Remaining would be ${estimatedRemainingCollateralUsdText}, below minimum`
        : t`Can't withdraw collateral. Remaining collateral would be below minimum`;
    }

    case CustomErrorName.MaxOpenInterestExceeded: {
      const openInterest = getBigIntContractErrorArg(args, 0, "openInterest");
      const maxOpenInterest = getBigIntContractErrorArg(args, 1, "maxOpenInterest");

      const openInterestText = formatUsd(openInterest);
      const maxOpenInterestText = formatUsd(maxOpenInterest);

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
        availableLiquidity !== undefined ? formatUsd(availableLiquidity > 0n ? availableLiquidity : 0n) : undefined;

      return availableLiquidityText
        ? t`Insufficient liquidity. Available: ${availableLiquidityText}`
        : t`Insufficient liquidity`;
    }

    case CustomErrorName.InsufficientReserve:
      return t`Insufficient pool liquidity`;

    case CustomErrorName.MaxPoolAmountExceeded: {
      const poolAmount = getBigIntContractErrorArg(args, 0, "poolAmount");
      const maxPoolAmount = getBigIntContractErrorArg(args, 1, "maxPoolAmount");

      const poolAmountText = poolAmount !== undefined ? formatAmount(poolAmount, 0, 0, true) : undefined;
      const maxPoolAmountText = maxPoolAmount !== undefined ? formatAmount(maxPoolAmount, 0, 0, true) : undefined;

      return poolAmountText && maxPoolAmountText
        ? t`Max pool capacity reached. Current: ${poolAmountText}, max: ${maxPoolAmountText}`
        : t`Max pool capacity reached`;
    }

    case CustomErrorName.MaxPoolUsdForDepositExceeded: {
      const maxPoolUsd = getBigIntContractErrorArg(args, 1, "maxPoolUsdForDeposit");
      const maxPoolUsdText = formatUsd(maxPoolUsd);

      return maxPoolUsdText ? t`Max deposit limit reached: ${maxPoolUsdText}` : t`Max deposit limit reached`;
    }

    case CustomErrorName.InsufficientPoolAmount: {
      const availableAmount = getBigIntContractErrorArg(args, 0, "poolAmount");
      const availableAmountText = availableAmount !== undefined ? formatAmount(availableAmount, 0, 0, true) : undefined;

      return availableAmountText
        ? t`Insufficient pool liquidity. Available: ${availableAmountText}`
        : t`Insufficient pool liquidity`;
    }

    case CustomErrorName.MinPositionSize: {
      const positionSizeInUsd = getBigIntContractErrorArg(args, 0, "positionSizeInUsd");
      const minPositionSizeUsd = getBigIntContractErrorArg(args, 1, "minPositionSizeUsd");

      const minPositionSizeUsdText = formatUsd(minPositionSizeUsd);
      const positionSizeInUsdText = formatUsd(positionSizeInUsd);

      return minPositionSizeUsdText && positionSizeInUsdText
        ? t`Position size too small. Min: ${minPositionSizeUsdText}, current: ${positionSizeInUsdText}`
        : t`Position size too small`;
    }

    case CustomErrorName.InvalidDecreaseOrderSize: {
      const sizeDeltaUsd = getBigIntContractErrorArg(args, 0, "sizeDeltaUsd");
      const positionSizeInUsd = getBigIntContractErrorArg(args, 1, "positionSizeInUsd");
      const sizeDeltaUsdText = formatUsd(sizeDeltaUsd);
      const positionSizeInUsdText = formatUsd(positionSizeInUsd);

      return sizeDeltaUsdText && positionSizeInUsdText
        ? t`Invalid decrease size. Size delta (${sizeDeltaUsdText}) exceeds position size (${positionSizeInUsdText})`
        : t`Invalid decrease size`;
    }

    case CustomErrorName.PnlFactorExceededForLongs:
    case CustomErrorName.PnlFactorExceededForShorts: {
      const pnlToPoolFactor = getBigIntContractErrorArg(args, 0, "pnlToPoolFactor");
      const maxPnlFactor = getBigIntContractErrorArg(args, 1, "maxPnlFactor");

      const pnlToPoolFactorText = formatPercentage(pnlToPoolFactor, { bps: false });
      const maxPnlFactorText = formatPercentage(maxPnlFactor, { bps: false });

      return pnlToPoolFactorText && maxPnlFactorText
        ? t`Max profit limit reached. Current: ${pnlToPoolFactorText}, max: ${maxPnlFactorText}`
        : t`Max profit limit reached`;
    }

    case CustomErrorName.InsufficientOutputAmount: {
      const outputAmount = getBigIntContractErrorArg(args, 0, "outputAmount");
      const minOutputAmount = getBigIntContractErrorArg(args, 1, "minOutputAmount");
      const minOutputAmountText = minOutputAmount !== undefined ? formatAmount(minOutputAmount, 0, 0, true) : undefined;
      const outputAmountText = outputAmount !== undefined ? formatAmount(outputAmount, 0, 0, true) : undefined;

      return minOutputAmountText && outputAmountText
        ? t`Slippage exceeded. Expected min: ${minOutputAmountText}, actual: ${outputAmountText}`
        : t`Slippage exceeded`;
    }

    case CustomErrorName.OrderNotFound:
      return t`Order not found. May have been canceled or already executed`;
    case CustomErrorName.OrderNotUpdatable:
      return t`Order can't be updated. Type doesn't support modifications`;
    case CustomErrorName.OrderTypeCannotBeCreated:
      return t`Order type unavailable for creation`;

    case CustomErrorName.InsufficientExecutionGas: {
      const startingGas = getBigIntContractErrorArg(args, 0, "startingGas");
      const estimatedGasLimit = getBigIntContractErrorArg(args, 1, "estimatedGasLimit");
      const estimatedGasLimitText =
        estimatedGasLimit !== undefined ? formatAmount(estimatedGasLimit, 0, 0, true) : undefined;
      const startingGasText = startingGas !== undefined ? formatAmount(startingGas, 0, 0, true) : undefined;

      return estimatedGasLimitText && startingGasText
        ? t`Insufficient gas for execution. Estimated: ${estimatedGasLimitText}, starting: ${startingGasText}`
        : t`Insufficient gas for execution`;
    }

    case CustomErrorName.DisabledMarket:
      return t`Market temporarily disabled`;

    case CustomErrorName.InvalidCollateralTokenForMarket: {
      const tokenAddress = getStringContractErrorArg(args, 1, "token");
      const tokenSymbol =
        chainId !== undefined && tokenAddress ? TOKENS_MAP[chainId]?.[tokenAddress]?.symbol : undefined;
      return tokenSymbol
        ? t`Invalid collateral token. ${tokenSymbol} isn't supported as collateral`
        : t`Invalid collateral token for this market`;
    }

    case CustomErrorName.MarketNotFound:
      return t`Market not found. May have been removed`;

    case CustomErrorName.MaxPriceAgeExceeded:
      return t`Oracle price is stale`;

    case CustomErrorName.InvalidOraclePrice: {
      const tokenAddress = getStringContractErrorArg(args, 0, "token");
      const tokenSymbol =
        chainId !== undefined && tokenAddress ? TOKENS_MAP[chainId]?.[tokenAddress]?.symbol : undefined;
      return tokenSymbol ? t`Invalid oracle price for ${tokenSymbol}` : t`Invalid oracle price`;
    }

    case CustomErrorName.EndOfOracleSimulation:
      return t`Order simulation failed`;

    case CustomErrorName.SwapPriceImpactExceedsAmountIn: {
      const amountAfterFees = getBigIntContractErrorArg(args, 0, "amountAfterFees");
      const negativeImpactAmount = getBigIntContractErrorArg(args, 1, "negativeImpactAmount");
      const negativeImpactAmountText = formatUsd(
        negativeImpactAmount !== undefined ? bigMath.abs(negativeImpactAmount) : undefined
      );
      const amountAfterFeesText = formatUsd(amountAfterFees);

      return negativeImpactAmountText && amountAfterFeesText
        ? t`Price impact too high. Impact: ${negativeImpactAmountText}, input: ${amountAfterFeesText}`
        : t`Price impact too high`;
    }

    case CustomErrorName.PriceImpactLargerThanOrderSize: {
      const priceImpactUsd = getBigIntContractErrorArg(args, 0, "priceImpactUsd");
      const sizeDeltaUsd = getBigIntContractErrorArg(args, 1, "sizeDeltaUsd");
      const priceImpactUsdText = formatUsd(priceImpactUsd !== undefined ? bigMath.abs(priceImpactUsd) : undefined);
      const sizeDeltaUsdText = formatUsd(sizeDeltaUsd);

      return priceImpactUsdText && sizeDeltaUsdText
        ? t`Price impact exceeds order size. Impact: ${priceImpactUsdText}, order: ${sizeDeltaUsdText}`
        : t`Price impact exceeds order size`;
    }

    case CustomErrorName.ExternalCallFailed: {
      if (decodeDepth < 1) {
        const nestedErrorData = getStringContractErrorArg(args, 0, "data");
        if (nestedErrorData) {
          const decodedExternalCallError = tryDecodeCustomError(nestedErrorData);

          if (decodedExternalCallError) {
            const nestedContractErrorMessage = getContractErrorMessage({
              chainId,
              errorData: {
                contractError: decodedExternalCallError.name,
                contractErrorArgs: decodedExternalCallError.args,
              },
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
      const remainingCostUsdText = formatUsd(remainingCostUsd);

      return remainingCostUsdText
        ? t`Insufficient funds for order costs. Remaining: ${remainingCostUsdText}`
        : t`Insufficient funds for order costs`;
    }

    case CustomErrorName.NegativeExecutionPrice:
      return t`Execution price is negative`;

    case CustomErrorName.UsdDeltaExceedsLongOpenInterest: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const openInterest = getBigIntContractErrorArg(args, 1, "longOpenInterest");
      const usdDeltaText = formatUsd(usdDelta !== undefined ? bigMath.abs(usdDelta) : undefined);
      const openInterestText = formatUsd(openInterest);

      return usdDeltaText && openInterestText
        ? t`Position size exceeds available open interest. Delta: ${usdDeltaText}, max OI: ${openInterestText}`
        : t`Position size exceeds available open interest`;
    }

    case CustomErrorName.UsdDeltaExceedsShortOpenInterest: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const openInterest = getBigIntContractErrorArg(args, 1, "shortOpenInterest");
      const usdDeltaText = formatUsd(usdDelta !== undefined ? bigMath.abs(usdDelta) : undefined);
      const openInterestText = formatUsd(openInterest);

      return usdDeltaText && openInterestText
        ? t`Position size exceeds available open interest. Delta: ${usdDeltaText}, max OI: ${openInterestText}`
        : t`Position size exceeds available open interest`;
    }

    case CustomErrorName.UsdDeltaExceedsPoolValue: {
      const usdDelta = getBigIntContractErrorArg(args, 0, "usdDelta");
      const poolUsd = getBigIntContractErrorArg(args, 1, "poolUsd");
      const usdDeltaText = formatUsd(usdDelta !== undefined ? bigMath.abs(usdDelta) : undefined);
      const poolUsdText = formatUsd(poolUsd);

      return usdDeltaText && poolUsdText
        ? t`Position size exceeds pool value. Delta: ${usdDeltaText}, pool: ${poolUsdText}`
        : t`Position size exceeds pool value`;
    }

    default:
      return undefined;
  }
}
