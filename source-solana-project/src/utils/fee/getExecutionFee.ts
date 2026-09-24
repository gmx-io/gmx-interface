import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { ExecutionFee, GasLimitsConfig } from '@/selectors/fee/types';
import { TokensData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { applyFactor } from '@/utils/legacy/factor';
import { getTokenData } from '@/utils/token/getTokenData';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export function getExecutionFee(
  gasLimits: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: BN,
  gasPrice: BN,
  oraclePriceCount: BN
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  if (!nativeToken) return undefined;

  // #region adjustGasLimitForEstimate. Copy from contract.
  let baseGasLimit = gasLimits.estimatedGasFeeBaseAmount;
  baseGasLimit = baseGasLimit.add(
    gasLimits.estimatedGasFeePerOraclePrice.mul(oraclePriceCount)
  );
  const multiplierFactor = gasLimits.estimatedFeeMultiplierFactor;
  const gasLimit = baseGasLimit.add(
    applyFactor(estimatedGasLimit, multiplierFactor)
  );
  // #endregion

  const feeTokenAmount = gasLimit.mul(gasPrice);

  const feeUsd = convertTokenAmountToUsd(
    feeTokenAmount,
    nativeToken.decimals,
    nativeToken.prices.minPrice
  );

  // const isFeeHigh = feeUsd.gt(expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS));
  // const isFeeVeryHigh = feeUsd.gt(expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS));
  const isFeeHigh = false;
  const isFeeVeryHigh = false;

  const chainName = 'Solana';
  const highWarning = t`The network fees are high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;
  const veryHighWarning = t`The network fees are very high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;

  const warning = isFeeVeryHigh
    ? veryHighWarning
    : isFeeHigh
      ? highWarning
      : undefined;

  return {
    feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
    warning,
  };
}
