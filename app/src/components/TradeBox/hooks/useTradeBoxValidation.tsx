import { useAnchor } from '@/contexts/anchor';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { selectPositionConstants } from '@/selectors/position/baseSelectors';
import {
  selectTradeboxIsLeverageEnabled,
  selectTradeboxStage,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxCloseSize } from '@/selectors/tradebox/selectTradeboxCloseSize';
import { selectTradeboxCollateralSpreadInfo } from '@/selectors/tradebox/selectTradeboxCollateralSpreadInfo';
import { selectTradeboxCollateralToken } from '@/selectors/tradebox/selectTradeboxCollateralToken';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxFromTokenInputAmount } from '@/selectors/tradebox/selectTradeboxFromTokenInputAmount';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxLiquidity } from '@/selectors/tradebox/selectTradeboxLiquidity';
import { selectTradeboxMarketInfo } from '@/selectors/tradebox/selectTradeboxMarketInfo';
import { selectTradeboxMarkPrice } from '@/selectors/tradebox/selectTradeboxMarkPrice';
import { selectTradeboxMaxLiquidityPath } from '@/selectors/tradebox/selectTradeboxMaxLiquidityPath';
import { selectTradeboxNextLeverageWithoutPnlInLeverage } from '@/selectors/tradebox/selectTradeboxNextLeverageWithoutPnlInLeverage';
import { selectTradeboxNextPositionValues } from '@/selectors/tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxToTokenInputAmount } from '@/selectors/tradebox/selectTradeboxToTokenInputAmount';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxTradeRatios } from '@/selectors/tradebox/selectTradeboxTradeRatios';
import { selectTradeboxTriggerPrice } from '@/selectors/tradebox/selectTradeboxTriggerPrice';
import { mustNeverExist } from '@/utils/lib/assertions';
import { getCommonError } from '@/utils/validation/getCommonError';
import { getDecreaseError } from '@/utils/validation/getDecreaseError';
import { getIncreaseError } from '@/utils/validation/getIncreaseError';
import { getSwapError } from '@/utils/validation/getSwapError';
import { ValidationResult } from '@/utils/validation/types';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { ReactNode, useMemo } from 'react';

interface TradeBoxValidationResult {
  buttonErrorText?: string;
  tooltipContent?: ReactNode;
}

type UseTradeBoxValidationProps = {
  priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>;
};

export function useTradeBoxValidation({
  priceImpactWarningState,
}: UseTradeBoxValidationProps): TradeBoxValidationResult {
  const owner = useAnchor();
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const { isSwap, isIncrease, isTrigger, isLimit, isLong } = tradeFlags;
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);

  const fromToken = useAppStore(selectTradeboxFromToken);
  const toToken = useAppStore(selectTradeboxToToken);
  const fromTokenAmount = useAppStore(selectTradeboxFromTokenInputAmount);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const toTokenAmount = useAppStore(selectTradeboxToTokenInputAmount);
  const { maxLiquidity: swapOutLiquidity } = useAppStore(
    selectTradeboxMaxLiquidityPath
  );
  const { markRatio, triggerRatio } = useAppStore(selectTradeboxTradeRatios);
  const fees = useAppStore(selectTradeboxTradeFees);

  const marketInfo = useAppStore(selectTradeboxMarketInfo);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const collateralToken = useAppStore(selectTradeboxCollateralToken);
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const { minCollateralUsd } = useAppStore(selectPositionConstants);
  const { longLiquidity, shortLiquidity } = useAppStore(
    selectTradeboxLiquidity
  );
  const markPrice = useAppStore(selectTradeboxMarkPrice);
  const triggerPrice = useAppStore(selectTradeboxTriggerPrice);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);
  const nextLeverageWithoutPnl = useAppStore(
    selectTradeboxNextLeverageWithoutPnlInLeverage
  );
  const closeSizeUsd = useAppStore(selectTradeboxCloseSize);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const stage = useAppStore(selectTradeboxStage);
  const isLeverageEnabled = useAppStore(selectTradeboxIsLeverageEnabled);
  const collateralSpreadInfo = useAppStore(selectTradeboxCollateralSpreadInfo);

  return useMemo(() => {
    const commonError = getCommonError({
      isConnected: Boolean(owner),
    });

    if (collateralSpreadInfo?.isHigherThanSavedAllowedSlippage) {
      return {
        buttonErrorText: t`Collateral spread exceeds allowed slippage`,
        tooltipContent: (
          <Trans>
            The collateral spread is higher than the saved allowed slippage.
            Please increase your allowed slippage or wait for more favorable
            market conditions.
          </Trans>
        ),
      };
    }

    let tradeError: ValidationResult = [undefined];

    if (!priceImpactWarningState) {
      return {
        buttonErrorText: t`Invalid price impact state`,
        tooltipContent: null,
      };
    }

    if (isSwap) {
      tradeError = getSwapError({
        fromToken,
        toToken,
        fromTokenAmount,
        fromUsd: swapAmounts?.usdIn,
        toTokenAmount,
        toUsd: swapAmounts?.usdOut,
        swapPathStats: swapAmounts?.swapPathStats,
        swapLiquidity: swapOutLiquidity,
        priceImpactWarning: priceImpactWarningState,
        isLimit,
        isWrapOrUnwrap,
        triggerRatio,
        markRatio,
        fees,
      });
    } else if (isIncrease) {
      tradeError = getIncreaseError({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        initialCollateralAmount: fromTokenAmount,
        initialCollateralUsd: increaseAmounts?.initialCollateralUsd,
        targetCollateralToken: collateralToken,
        collateralUsd: increaseAmounts?.collateralDeltaUsd,
        sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
        existingPosition: selectedPosition,
        fees,
        swapPathStats: increaseAmounts?.swapPathStats,
        collateralLiquidity: swapOutLiquidity,
        minCollateralUsd,
        longLiquidity,
        shortLiquidity,
        isLong,
        markPrice,
        triggerPrice,
        priceImpactWarning: priceImpactWarningState,
        isLimit,
        nextPositionValues,
        nextLeverageWithoutPnl,
      });
    } else if (isTrigger) {
      tradeError = getDecreaseError({
        marketInfo,
        inputSizeUsd: closeSizeUsd,
        sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
        triggerPrice,
        markPrice,
        existingPosition: selectedPosition,
        nextPositionValues: nextPositionValues,
        isLong,
        isTrigger: true,
        minCollateralUsd,
        priceImpactWarning: priceImpactWarningState,
        isNotEnoughReceiveTokenLiquidity: false,
        triggerThresholdType:
          stage !== 'trade' ? decreaseAmounts?.triggerThresholdType : undefined,
      });
    }

    const buttonErrorText = commonError[0] || tradeError[0];
    const tooltipName = commonError[1] || tradeError[1];

    let tooltipContent: ReactNode = null;
    if (tooltipName) {
      switch (tooltipName) {
        case 'maxLeverage': {
          tooltipContent = (
            <>
              {isLeverageEnabled ? (
                <Trans>
                  Decrease the leverage to match the max. allowed leverage.
                </Trans>
              ) : (
                <Trans>
                  Decrease the size to match the max. allowed leverage:
                </Trans>
              )}{' '}
              .
            </>
          );
          break;
        }

        case 'liqPrice > markPrice':
          tooltipContent = (
            <Trans>
              The position would be immediately liquidated upon order execution.
              Try reducing the size.
            </Trans>
          );
          break;

        case 'noSwapPath':
          tooltipContent = (
            <>
              <Trans>
                {collateralToken?.symbol} is required for collateral.
                <br />
                There is no swap path found for {fromToken?.symbol} to{' '}
                {collateralToken?.symbol} within GMX.
              </Trans>
            </>
          );
          break;

        default:
          mustNeverExist(tooltipName);
      }
    }

    return { buttonErrorText, tooltipContent };
  }, [
    owner,
    collateralSpreadInfo,
    isSwap,
    isIncrease,
    isTrigger,
    fromToken,
    toToken,
    fromTokenAmount,
    swapAmounts,
    toTokenAmount,
    swapOutLiquidity,
    priceImpactWarningState,
    isLimit,
    isWrapOrUnwrap,
    triggerRatio,
    markRatio,
    fees,
    marketInfo,
    increaseAmounts,
    collateralToken,
    selectedPosition,
    minCollateralUsd,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    nextPositionValues,
    nextLeverageWithoutPnl,
    closeSizeUsd,
    decreaseAmounts,
    stage,
    isLeverageEnabled,
  ]);
}
