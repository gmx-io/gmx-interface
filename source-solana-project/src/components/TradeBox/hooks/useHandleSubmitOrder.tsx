import { BN_ZERO } from '@/config/constants';
import {
  useTriggerCreateDecreaseLimitOrder,
  useTriggerCreateDecreaseMarketOrder,
  useTriggerCreateDecreaseStopLossOrder,
  useTriggerCreateIncreaseLimitOrder,
  useTriggerCreateIncreaseMarketOrder,
  useTriggerCreateSwapLimitOrder,
  useTriggerCreateSwapMarketOrder,
} from '@/hooks/triggerHooks';
import {
  selectSavedAllowedSlippage,
  selectSkipPreflight,
} from '@/selectors/setting/baseSelectors';
import { selectTradeboxCollateralTokenAddress } from '@/selectors/tradebox/selectTradeboxCollateralTokenAddress';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
// import { selectTradeboxFindSwapPath } from '@/selectors/tradebox/selectTradeboxFindSwapPath';
import { selectTradeboxFromTokenAddress } from '@/selectors/tradebox/selectTradeboxFromTokenAddress';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxIndexToken } from '@/selectors/tradebox/selectTradeboxIndexToken';
import { selectTradeboxIsStopLoss } from '@/selectors/tradebox/selectTradeboxIsStopLoss';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { selectTradeboxReceiveTokenAddress } from '@/selectors/tradebox/selectTradeboxReceiveTokenAddress';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxSwapAmountsForReceiveToken } from '@/selectors/tradebox/selectTradeboxSwapAmountsForReceiveToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxTradeRatios } from '@/selectors/tradebox/selectTradeboxTradeRatios';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { useAppStore } from '@/zustand/useAppStore';
import { useCallback } from 'react';
import { selectTradeboxSwapToToken } from '@/selectors/tradebox/selectTradeboxSwapToToken';
import {
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxKeepLeverage,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxDecreasePositionAmountsWithKeepLeverage } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmountsWithKeepLeverage';
import { PublicKey } from '@solana/web3.js';

export function useHandleSubmitOrder(
  onSubmitted?: (res: string | undefined) => void,
  options?: {
    isAddCompetition?: boolean;
    competitionId?: PublicKey;
  }
) {
  const { isAddCompetition = false, competitionId = undefined } = options || {};

  const {
    isMarket,
    isLimit,
    isPosition,
    isIncrease,
    isSwap,
    isLong,
    isTrigger,
  } = useAppStore(selectTradeboxTradeFlags);
  const isStopLoss = useAppStore(selectTradeboxIsStopLoss);
  const skipPreflight = useAppStore(selectSkipPreflight);
  const savedAllowedSlippage = useAppStore(selectSavedAllowedSlippage);
  const selectedTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxSelectedTriggerAcceptablePriceImpactBps
  );
  const defaultTriggerAcceptablePriceImpactBps = useAppStore(
    selectTradeboxDefaultTriggerAcceptablePriceImpactBps
  );
  const marketTokenAddress = useAppStore(selectTradeboxMarketTokenAddress);
  const collateralTokenAddress = useAppStore(
    selectTradeboxCollateralTokenAddress
  );
  const initialCollateralTokenAddress = useAppStore(
    selectTradeboxFromTokenAddress
  );
  const indexToken = useAppStore(selectTradeboxIndexToken);
  const indexTokenDecimals = indexToken?.decimals;
  const existingPosition = useAppStore(selectTradeboxSelectedPosition);
  const positionAddress = existingPosition?.address;
  // Increase
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const increaseAmountsInitialCollateralAmount =
    increaseAmounts?.initialCollateralAmount;
  const increaseAmountsSizeDeltaUsd = increaseAmounts?.sizeDeltaUsd;
  const increaseAmountsTriggerPrice = increaseAmounts?.triggerPrice;
  const increaseAmountsAcceptablePriceRaw = increaseAmounts?.acceptablePrice;

  const increaseAmountsAcceptablePrice = increaseAmountsAcceptablePriceRaw
    ? applySlippageToPrice(
        isLimit || isTrigger
          ? (selectedTriggerAcceptablePriceImpactBps ??
              defaultTriggerAcceptablePriceImpactBps ??
              0)
          : savedAllowedSlippage,
        increaseAmountsAcceptablePriceRaw,
        isIncrease,
        isLong
      )
    : undefined;
  const increaseOrderSwapPath = increaseAmounts?.swapPathStats?.swapPath;
  // Decrease
  const keepLeverage = useAppStore(selectTradeboxKeepLeverage);
  const decreaseAmountsRaw = useAppStore(selectTradeboxDecreasePositionAmounts);
  const decreaseAmountsWithKeepLeverage = useAppStore(
    selectTradeboxDecreasePositionAmountsWithKeepLeverage
  );
  const decreaseAmounts = keepLeverage
    ? decreaseAmountsWithKeepLeverage
    : decreaseAmountsRaw;
  const decreaseAmountsSizeDeltaUsd = decreaseAmounts?.sizeDeltaUsd;
  const decreaseAmountsTriggerPrice = decreaseAmounts?.triggerPrice;
  const decreaseAmountsAcceptablePriceRaw = decreaseAmounts?.acceptablePrice;
  const decreaseAmountsAcceptablePrice = decreaseAmountsAcceptablePriceRaw
    ? applySlippageToPrice(
        isLimit || isTrigger
          ? (selectedTriggerAcceptablePriceImpactBps ??
              defaultTriggerAcceptablePriceImpactBps ??
              0)
          : savedAllowedSlippage,
        decreaseAmountsAcceptablePriceRaw,
        isIncrease,
        isLong
      )
    : undefined;
  const receiveTokenAddress = useAppStore(selectTradeboxReceiveTokenAddress);
  const swapAmountsForReceiveToken = useAppStore(
    selectTradeboxSwapAmountsForReceiveToken
  );
  // TODO: check if this is same as decreaseOrderSwapPath from decreaseAmounts
  const decreaseOrderSwapPath =
    swapAmountsForReceiveToken?.swapPathStats?.swapPath;
  // Swap
  const fromTokenAddress = useAppStore(selectTradeboxFromTokenAddress);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const swapToToken = useAppStore(selectTradeboxSwapToToken);
  const swapOutTokenAddress = swapToToken?.address;
  const amountIn = swapAmounts?.amountIn;
  const minOutputAmount = swapAmounts?.minOutputAmount;
  const swapOrderSwapPath = swapAmounts?.swapPathStats?.swapPath;
  const swapMarketTokenAddress = swapOrderSwapPath?.at(-1);
  const swapInitialCollateralTokenAddress = fromTokenAddress;
  const { triggerRatio } = useAppStore(selectTradeboxTradeRatios);
  const swapAmountsTriggerRatio = triggerRatio?.ratio;
  // Receive

  const {
    trigger: createSwapMarketOrder,
    isSending: isCreatingSwapMarketOrder,
  } = useTriggerCreateSwapMarketOrder();
  const { trigger: createSwapLimitOrder, isSending: isCreatingSwapLimitOrder } =
    useTriggerCreateSwapLimitOrder();
  const {
    trigger: createIncreaseMarketOrder,
    isSending: isCreatingIncreaseMarketOrder,
  } = useTriggerCreateIncreaseMarketOrder();
  const {
    trigger: createIncreaseLimitOrder,
    isSending: isCreatingIncreaseLimitOrder,
  } = useTriggerCreateIncreaseLimitOrder();
  const {
    trigger: createDecreaseMarketOrder,
    isSending: isCreatingDecreaseMarketOrder,
  } = useTriggerCreateDecreaseMarketOrder();
  const {
    trigger: createDecreaseLimitOrder,
    isSending: isCreatingDecreaseLimitOrder,
  } = useTriggerCreateDecreaseLimitOrder();
  const {
    trigger: createDecreaseStopLossOrder,
    isSending: isCreatingDecreaseStopLossOrder,
  } = useTriggerCreateDecreaseStopLossOrder();

  const isSending =
    isCreatingSwapMarketOrder ||
    isCreatingSwapLimitOrder ||
    isCreatingIncreaseMarketOrder ||
    isCreatingIncreaseLimitOrder ||
    isCreatingDecreaseMarketOrder ||
    isCreatingDecreaseLimitOrder ||
    isCreatingDecreaseStopLossOrder;

  const handleSubmitCreateSwapMarketOrder = useCallback(() => {
    {
      void createSwapMarketOrder({
        isMarket,
        isSwap,
        skipPreflight,
        swapMarketTokenAddress,
        swapInitialCollateralTokenAddress,
        swapOutTokenAddress,
        swapOrderSwapPath,
        amountIn,
      }).then((res: string | undefined) => {
        onSubmitted?.(res);
      });
    }
  }, [
    createSwapMarketOrder,
    isMarket,
    isSwap,
    skipPreflight,
    swapMarketTokenAddress,
    swapInitialCollateralTokenAddress,
    swapOutTokenAddress,
    swapOrderSwapPath,
    amountIn,
    onSubmitted,
  ]);

  const handleSubmitCreateSwapLimitOrder = useCallback(() => {
    {
      void createSwapLimitOrder({
        isLimit,
        isSwap,
        skipPreflight,
        indexTokenDecimals,
        swapMarketTokenAddress,
        swapInitialCollateralTokenAddress,
        swapOutTokenAddress,
        amountIn,
        minOutputAmount,
        swapAmountsTriggerRatio,
        swapOrderSwapPath,
      }).then((res: string | undefined) => {
        onSubmitted?.(res);
      });
    }
  }, [
    createSwapLimitOrder,
    isLimit,
    isSwap,
    skipPreflight,
    indexTokenDecimals,
    swapMarketTokenAddress,
    swapInitialCollateralTokenAddress,
    swapOutTokenAddress,
    amountIn,
    minOutputAmount,
    swapAmountsTriggerRatio,
    swapOrderSwapPath,
    onSubmitted,
  ]);

  const handleSubmitCreateIncreaseMarketOrder = useCallback(() => {
    void createIncreaseMarketOrder({
      isMarket,
      isLong,
      isIncrease,
      skipPreflight,
      marketTokenAddress,
      collateralTokenAddress,
      initialCollateralTokenAddress,
      increaseAmountsInitialCollateralAmount,
      increaseAmountsSizeDeltaUsd,
      increaseOrderSwapPath,
      increaseAmountsAcceptablePrice,
      indexTokenDecimals,
      isAddCompetition,
      competitionId,
    }).then((res: string | undefined) => {
      onSubmitted?.(res);
    });
  }, [
    createIncreaseMarketOrder,
    isMarket,
    isLong,
    isIncrease,
    skipPreflight,
    marketTokenAddress,
    collateralTokenAddress,
    initialCollateralTokenAddress,
    increaseAmountsInitialCollateralAmount,
    increaseAmountsSizeDeltaUsd,
    increaseOrderSwapPath,
    increaseAmountsAcceptablePrice,
    indexTokenDecimals,
    onSubmitted,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateIncreaseLimitOrder = useCallback(() => {
    void createIncreaseLimitOrder({
      isLimit,
      isLong,
      isIncrease,
      skipPreflight,
      marketTokenAddress,
      collateralTokenAddress,
      initialCollateralTokenAddress,
      increaseAmountsInitialCollateralAmount,
      increaseAmountsSizeDeltaUsd,
      indexTokenDecimals,
      increaseAmountsTriggerPrice,
      increaseAmountsAcceptablePrice,
      increaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then((res: string | undefined) => {
      onSubmitted?.(res);
    });
  }, [
    createIncreaseLimitOrder,
    isLimit,
    isLong,
    isIncrease,
    skipPreflight,
    marketTokenAddress,
    collateralTokenAddress,
    initialCollateralTokenAddress,
    increaseAmountsInitialCollateralAmount,
    increaseAmountsSizeDeltaUsd,
    indexTokenDecimals,
    increaseAmountsTriggerPrice,
    increaseAmountsAcceptablePrice,
    increaseOrderSwapPath,
    onSubmitted,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateDecreaseMarketOrder = useCallback(() => {
    void createDecreaseMarketOrder({
      isPosition,
      isMarket,
      isIncrease,
      skipPreflight,
      positionAddress,
      decreaseAmountsSizeDeltaUsd,
      decreaseAmountsInitialCollateralAmount: BN_ZERO,
      decreaseAmountsAcceptablePrice,
      indexTokenDecimals,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then((res: string | undefined) => {
      onSubmitted?.(res);
    });
  }, [
    createDecreaseMarketOrder,
    isPosition,
    isMarket,
    isIncrease,
    skipPreflight,
    positionAddress,
    decreaseAmountsSizeDeltaUsd,
    decreaseAmountsAcceptablePrice,
    indexTokenDecimals,
    receiveTokenAddress,
    decreaseOrderSwapPath,
    onSubmitted,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateDecreaseLimitOrder = useCallback(() => {
    void createDecreaseLimitOrder({
      isPosition,
      isLimit,
      isIncrease,
      skipPreflight,
      positionAddress,
      indexTokenDecimals,
      decreaseAmountsTriggerPrice,
      decreaseAmountsAcceptablePrice,
      decreaseAmountsSizeDeltaUsd,
      decreaseAmountsCollateralDeltaAmount:
        decreaseAmounts?.collateralDeltaAmount,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then((res: string | undefined) => {
      onSubmitted?.(res);
    });
  }, [
    createDecreaseLimitOrder,
    isPosition,
    isLimit,
    isIncrease,
    skipPreflight,
    positionAddress,
    indexTokenDecimals,
    decreaseAmountsTriggerPrice,
    decreaseAmountsAcceptablePrice,
    decreaseAmountsSizeDeltaUsd,
    receiveTokenAddress,
    decreaseAmounts?.collateralDeltaAmount,
    decreaseOrderSwapPath,
    onSubmitted,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateDecreaseStopLossOrder = useCallback(() => {
    void createDecreaseStopLossOrder({
      isPosition,
      isMarket,
      isLimit,
      isIncrease,
      isStopLoss,
      skipPreflight,
      positionAddress,
      decreaseAmountsSizeDeltaUsd,
      decreaseAmountsTriggerPrice,
      decreaseAmountsAcceptablePrice,
      indexTokenDecimals,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then((res: string | undefined) => {
      onSubmitted?.(res);
    });
  }, [
    createDecreaseStopLossOrder,
    isPosition,
    isMarket,
    isLimit,
    isIncrease,
    isStopLoss,
    skipPreflight,
    positionAddress,
    decreaseAmountsSizeDeltaUsd,
    decreaseAmountsTriggerPrice,
    decreaseAmountsAcceptablePrice,
    indexTokenDecimals,
    receiveTokenAddress,
    decreaseOrderSwapPath,
    onSubmitted,
    isAddCompetition,
    competitionId,
  ]);

  return [
    useCallback(() => {
      if (isSending) return;
      console.log('isSwap', {
        isSwap,
        isMarket,
        isIncrease,
        isLimit,
        isPosition,
      });
      if (isSwap && isMarket) handleSubmitCreateSwapMarketOrder();
      else if (isSwap && isLimit) handleSubmitCreateSwapLimitOrder();
      else if (isMarket && isIncrease) handleSubmitCreateIncreaseMarketOrder();
      else if (isLimit && isIncrease) handleSubmitCreateIncreaseLimitOrder();
      else if (isPosition && isMarket && !isIncrease)
        handleSubmitCreateDecreaseMarketOrder();
      else if (isPosition && !isMarket && isLimit && !isIncrease)
        handleSubmitCreateDecreaseLimitOrder();
      else if (isPosition && !isMarket && !isLimit && !isIncrease)
        handleSubmitCreateDecreaseStopLossOrder();
    }, [
      isSending,
      isSwap,
      isMarket,
      isLimit,
      isPosition,
      isIncrease,
      handleSubmitCreateSwapMarketOrder,
      handleSubmitCreateSwapLimitOrder,
      handleSubmitCreateIncreaseMarketOrder,
      handleSubmitCreateIncreaseLimitOrder,
      handleSubmitCreateDecreaseMarketOrder,
      handleSubmitCreateDecreaseLimitOrder,
      handleSubmitCreateDecreaseStopLossOrder,
    ]),
    isSending,
  ] as const;
}
