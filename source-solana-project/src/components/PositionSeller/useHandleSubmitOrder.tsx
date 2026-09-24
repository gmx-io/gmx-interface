import {
  useTriggerCreateDecreaseLimitOrder,
  useTriggerCreateDecreaseMarketOrder,
  useTriggerCreateDecreaseStopLossOrder,
} from '@/hooks/triggerHooks';
import {
  selectPositionSellerAddress,
  selectPositionSellerReceiveTokenAddress,
} from '@/selectors/positionSeller/baseSelectors';
import { selectPositionSellerAcceptablePrice } from '@/selectors/positionSeller/selectPositionSellerAcceptablePrice';
import { selectPositionSellerCloseSizeUsd } from '@/selectors/positionSeller/selectPositionSellerCloseSizeUsd';
import { selectPositionSellerClosingPosition } from '@/selectors/positionSeller/selectPositionSellerClosingPosition';
import { selectPositionSellerDecreaseAmountsFinal } from '@/selectors/positionSeller/selectPositionSellerDecreaseAmountsFinal';
import { selectPositionSellerDecreaseOrderSwapPath } from '@/selectors/positionSeller/selectPositionSellerDecreaseOrderSwapPath';
import { selectPositionSellerIsStopLoss } from '@/selectors/positionSeller/selectPositionSellerIsStopLoss';
import { selectPositionSellerIsTrigger } from '@/selectors/positionSeller/selectPositionSellerIsTrigger';
import { selectPositionSellerTriggerPrice } from '@/selectors/positionSeller/selectPositionSellerTriggerPrice';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { PublicKey } from '@solana/web3.js';
import { useCallback } from 'react';

export function useHandleSubmitOrder(
  handleClose?: () => void,
  options?: {
    isAddCompetition?: boolean;
    competitionId?: PublicKey;
  }
) {
  const { isAddCompetition = false, competitionId = undefined } = options || {};

  const skipPreflight = useAppStore(selectSkipPreflight);
  const position = useAppStore(selectPositionSellerClosingPosition);
  const positionAddress = useAppStore(selectPositionSellerAddress);
  const closeSizeUsd = useAppStore(selectPositionSellerCloseSizeUsd);
  const isTrigger = useAppStore(selectPositionSellerIsTrigger);
  const isStopLoss = useAppStore(selectPositionSellerIsStopLoss);
  const triggerPrice = useAppStore(selectPositionSellerTriggerPrice);
  const acceptablePrice = useAppStore(selectPositionSellerAcceptablePrice);
  const decreaseAmountsFinal = useAppStore(
    selectPositionSellerDecreaseAmountsFinal
  );
  const receiveTokenAddress = useAppStore(
    selectPositionSellerReceiveTokenAddress
  );
  const decreaseOrderSwapPath = useAppStore(
    selectPositionSellerDecreaseOrderSwapPath
  );

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
    isCreatingDecreaseMarketOrder ||
    isCreatingDecreaseLimitOrder ||
    isCreatingDecreaseStopLossOrder;

  const handleSubmitCreateDecreaseMarketOrder = useCallback(() => {
    void createDecreaseMarketOrder({
      isPosition: true,
      isMarket: true,
      isIncrease: false,
      skipPreflight,
      positionAddress,
      decreaseAmountsSizeDeltaUsd: closeSizeUsd,
      decreaseAmountsInitialCollateralAmount:
        decreaseAmountsFinal?.collateralDeltaAmount,
      decreaseAmountsAcceptablePrice: acceptablePrice,
      indexTokenDecimals: position?.indexToken?.decimals,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then(handleClose);
  }, [
    createDecreaseMarketOrder,
    skipPreflight,
    positionAddress,
    closeSizeUsd,
    handleClose,
    position?.indexToken?.decimals,
    acceptablePrice,
    receiveTokenAddress,
    decreaseOrderSwapPath,
    decreaseAmountsFinal?.collateralDeltaAmount,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateDecreaseLimitOrder = useCallback(() => {
    void createDecreaseLimitOrder({
      isPosition: true,
      isLimit: true,
      isIncrease: false,
      skipPreflight,
      positionAddress,
      indexTokenDecimals: position?.indexToken?.decimals,
      decreaseAmountsTriggerPrice: triggerPrice,
      decreaseAmountsAcceptablePrice: acceptablePrice,
      decreaseAmountsSizeDeltaUsd: closeSizeUsd,
      decreaseAmountsCollateralDeltaAmount:
        decreaseAmountsFinal?.collateralDeltaAmount,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then(handleClose);
  }, [
    createDecreaseLimitOrder,
    skipPreflight,
    positionAddress,
    position?.indexToken?.decimals,
    closeSizeUsd,
    triggerPrice,
    decreaseOrderSwapPath,
    handleClose,
    acceptablePrice,
    receiveTokenAddress,
    decreaseAmountsFinal?.collateralDeltaAmount,
    isAddCompetition,
    competitionId,
  ]);

  const handleSubmitCreateDecreaseStopLossOrder = useCallback(() => {
    void createDecreaseStopLossOrder({
      isPosition: true,
      isMarket: false,
      isLimit: false,
      isIncrease: false,
      isStopLoss,
      skipPreflight,
      positionAddress,
      indexTokenDecimals: position?.indexToken?.decimals,
      decreaseAmountsTriggerPrice: triggerPrice,
      decreaseAmountsAcceptablePrice: acceptablePrice,
      decreaseAmountsSizeDeltaUsd: closeSizeUsd,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }).then(handleClose);
  }, [
    createDecreaseStopLossOrder,
    skipPreflight,
    isStopLoss,
    positionAddress,
    closeSizeUsd,
    triggerPrice,
    handleClose,
    position?.indexToken?.decimals,
    acceptablePrice,
    receiveTokenAddress,
    decreaseOrderSwapPath,
    isAddCompetition,
    competitionId,
  ]);

  return [
    useCallback(() => {
      if (isSending) return;
      else if (!isTrigger) handleSubmitCreateDecreaseMarketOrder();
      else if (isTrigger && !isStopLoss) handleSubmitCreateDecreaseLimitOrder();
      else if (isTrigger && isStopLoss)
        handleSubmitCreateDecreaseStopLossOrder();
    }, [
      isSending,
      isTrigger,
      isStopLoss,
      handleSubmitCreateDecreaseMarketOrder,
      handleSubmitCreateDecreaseLimitOrder,
      handleSubmitCreateDecreaseStopLossOrder,
    ]),
    isSending,
  ] as const;
}
