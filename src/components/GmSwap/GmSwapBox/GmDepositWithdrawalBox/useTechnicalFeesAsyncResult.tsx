import {
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
import { calculateTechnicalFees } from "domain/synthetics/markets/technicalFees/calculateTechnicalFees";
import type {
  CalculateTechnicalFeesParams,
  TechnicalGmFees,
} from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { useChainId } from "lib/chains";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { absDiffBps } from "sdk/utils/numbers";

export type TechnicalFeesResult = {
  data: TechnicalGmFees | undefined;
  error: Error | undefined;
};

export function useTechnicalFees(): TechnicalFeesResult {
  const { chainId, srcChainId } = useChainId();

  const operation = useSelector(selectPoolsDetailsOperation);
  const { isPair } = useSelector(selectPoolsDetailsFlags);
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
            firstTokenAmount,
            longTokenAmount: amounts?.longTokenAmount ?? 0n,
            shortTokenAmount: amounts?.shortTokenAmount ?? 0n,
            marketTokenAmount: marketOrGlvTokenAmount,
            operation,
            amounts,
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
