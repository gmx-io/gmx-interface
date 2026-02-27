import {
  PLATFORM_TOKEN_DECIMALS,
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSelectedMarketAddressForGlv,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectGasLimits,
  selectGasPrice,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { RawCreateDepositParams, RawCreateGlvDepositParams } from "domain/synthetics/markets";
import { calculateTechnicalFees } from "domain/synthetics/markets/technicalFees/calculateTechnicalFees";
import type {
  CalculateTechnicalFeesParams,
  TechnicalGmFees,
} from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { WithdrawalAmounts } from "domain/synthetics/trade/utils";
import { convertToTokenAmount } from "domain/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { convertTokenAddress } from "sdk/configs/tokens";
import { absDiffBps } from "sdk/utils/numbers";

export type TechnicalFeesResult = {
  data: TechnicalGmFees | undefined;
  error: Error | undefined;
};

export function useTechnicalFees(): TechnicalFeesResult {
  const { chainId, srcChainId } = useChainId();

  const operation = useSelector(selectPoolsDetailsOperation);
  const { isPair, isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const paySource = useSelector(selectPoolsDetailsPaySource);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const prevPaySource = usePrevious(paySource);
  const prevOperation = usePrevious(operation);
  const prevIsPair = usePrevious(isPair);
  const prevFirstTokenAmount = usePrevious(firstTokenAmount);

  const isAmountChangedSignificantly =
    prevFirstTokenAmount !== undefined &&
    firstTokenAmount !== undefined &&
    absDiffBps(firstTokenAmount, prevFirstTokenAmount) > 100n;

  const forceRecalculate =
    prevPaySource !== paySource || prevOperation !== operation || prevIsPair !== isPair || isAmountChangedSignificantly;

  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const rawParams = useSelector(selectPoolsDetailsParams);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  let longTokenAmount = amounts?.longTokenAmount ?? 0n;
  let shortTokenAmount = amounts?.shortTokenAmount ?? 0n;
  let firstTokenAmountValue = firstTokenAmount;

  // Setting dummy amounts to be able to show fees when user has not entered amounts yet (deposit only)
  if (isDeposit && rawParams && globalExpressParams) {
    const depositParams = rawParams as RawCreateGlvDepositParams | RawCreateDepositParams;
    const { initialLongToken, initialShortToken } = depositParams.addresses;
    if (
      firstTokenAmountValue === 0n &&
      firstTokenAddress !== undefined &&
      isMarketTokenAddress(chainId, firstTokenAddress)
    ) {
      // Markets are around $0.3 to $2 so we can safely assume that x10 is a good amount to estimate fees
      firstTokenAmountValue = expandDecimals(10, PLATFORM_TOKEN_DECIMALS);
    }

    const isLongPrimary =
      firstTokenAddress &&
      convertTokenAddress(chainId, firstTokenAddress, "native") ===
        convertTokenAddress(chainId, initialLongToken, "native");

    if (longTokenAmount === 0n && (isLongPrimary || isPair)) {
      const longToken = getByKey(globalExpressParams.tokensData, initialLongToken);
      if (longToken) {
        longTokenAmount = convertToTokenAmount(
          expandDecimals(1, USD_DECIMALS),
          longToken.decimals,
          longToken.prices.maxPrice
        )!;
        if (isLongPrimary) {
          firstTokenAmountValue = longTokenAmount;
        }
      }
    }

    const isShortPrimary =
      firstTokenAddress &&
      convertTokenAddress(chainId, firstTokenAddress, "native") ===
        convertTokenAddress(chainId, initialShortToken, "native");

    if (shortTokenAmount === 0n && (isShortPrimary || isPair)) {
      const shortToken = getByKey(globalExpressParams.tokensData, initialShortToken);
      if (shortToken) {
        shortTokenAmount = convertToTokenAmount(
          expandDecimals(1, USD_DECIMALS),
          shortToken.decimals,
          shortToken.prices.maxPrice
        )!;
        if (isShortPrimary) {
          firstTokenAmountValue = shortTokenAmount;
        }
      }
    }
  }

  const outputLongTokenAddress =
    isWithdrawal && amounts ? (amounts as WithdrawalAmounts).longTokenSwapPathStats?.tokenOutAddress : undefined;
  const outputShortTokenAddress =
    isWithdrawal && amounts ? (amounts as WithdrawalAmounts).shortTokenSwapPathStats?.tokenOutAddress : undefined;

  const technicalFeesAsyncResult = useThrottledAsync(async (p) => calculateTechnicalFees(p.params), {
    params:
      rawParams && gasLimits && tokensData && gasPrice !== undefined
        ? ({
            chainId,
            globalExpressParams,
            rawParams,
            isGlv,
            glvInfo,
            paySource,
            srcChainId,
            firstTokenAddress,
            firstTokenAmount: firstTokenAmountValue,
            marketTokenAmount: marketOrGlvTokenAmount,
            operation,
            longTokenAmount,
            shortTokenAmount,
            outputLongTokenAddress,
            outputShortTokenAddress,
            gasLimits,
            tokensData,
            gasPrice,
          } satisfies CalculateTechnicalFeesParams)
        : undefined,
    withLoading: false,
    forceRecalculate,
    resetOnForceRecalculate: true,
  });

  return {
    data: technicalFeesAsyncResult.data,
    error: technicalFeesAsyncResult.error,
  };
}
