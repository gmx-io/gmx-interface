import { BN_ZERO } from '@/config/constants';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import {
  useTriggerCreateCollateralDepositToPosition,
  useTriggerCreateCollateralWithdrawlFromPosition,
} from '@/hooks/triggerHooks';
import { selectPositionEditorSelectedCollateralAddress } from '@/selectors/positionEditor/baseSelectors';
import { selectPositionEditorCollateralDeltaAmount } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaAmount';
import { selectPositionEditorCollateralToken } from '@/selectors/positionEditor/selectPositionEditorCollateralToken';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { useAppStore } from '@/zustand/useAppStore';
import { useCallback } from 'react';

export function useHandleSubmitOrder(onClose: () => void, isDeposit: boolean) {
  const skipPreflight = useAppStore(selectSkipPreflight);
  const collateralDeltaAmount = useAppStore(
    selectPositionEditorCollateralDeltaAmount
  );
  const position = useAppStore(selectPositionEditorEditingPosition);
  const nativeToken = useAppStore(selectNativeToken);
  const receiveTokenAddressRaw = useAppStore(
    selectPositionEditorSelectedCollateralAddress
  );

  const receiveTokenAddress = isWrappedNativeToken(receiveTokenAddressRaw)
    ? NATIVE_TOKEN_ADDRESS.toBase58()
    : receiveTokenAddressRaw;
  const collateralToken = useAppStore(selectPositionEditorCollateralToken);
  const initialCollateralTokenAddress = collateralToken?.isWrappedNative
    ? nativeToken?.address
    : position?.collateralTokenAddress;

  const {
    trigger: createCollateralDepositToPosition,
    isSending: isCreatingCollateralDepositToPosition,
  } = useTriggerCreateCollateralDepositToPosition();
  const {
    trigger: createCollateralWithdrawlFromPosition,
    isSending: isCreatingCollateralWithdrawlFromPosition,
  } = useTriggerCreateCollateralWithdrawlFromPosition();
  const isSending =
    isCreatingCollateralDepositToPosition ||
    isCreatingCollateralWithdrawlFromPosition;

  const handleSubmitCreateCollateralDepositToPosition = useCallback(() => {
    void createCollateralDepositToPosition({
      isMarket: true,
      isLong: position?.isLong ?? false,
      isIncrease: true,
      skipPreflight,
      marketTokenAddress: position?.marketTokenAddress,
      collateralTokenAddress: position?.collateralTokenAddress,
      initialCollateralTokenAddress: initialCollateralTokenAddress,
      increaseAmountsInitialCollateralAmount: collateralDeltaAmount,
      increaseAmountsSizeDeltaUsd: BN_ZERO,
      increaseOrderSwapPath: [],
      indexTokenDecimals: position?.indexToken?.decimals,
      increaseAmountsAcceptablePrice: undefined,
    }).then(() => {
      onClose();
    });
  }, [
    createCollateralDepositToPosition,
    skipPreflight,
    position?.isLong,
    position?.marketTokenAddress,
    position?.collateralTokenAddress,
    initialCollateralTokenAddress,
    collateralDeltaAmount,
    onClose,
    position?.indexToken?.decimals,
  ]);

  const handleSubmitCreateCollateralWithdrawlFromPosition = useCallback(() => {
    void createCollateralWithdrawlFromPosition({
      isPosition: true,
      isMarket: true,
      isIncrease: false,
      skipPreflight,
      positionAddress: position?.address,
      decreaseAmountsSizeDeltaUsd: BN_ZERO,
      decreaseAmountsInitialCollateralAmount: collateralDeltaAmount,
      indexTokenDecimals: position?.indexToken?.decimals,
      decreaseAmountsAcceptablePrice: undefined,
      receiveTokenAddress,
      decreaseOrderSwapPath: [],
    }).then(() => {
      onClose();
    });
  }, [
    createCollateralWithdrawlFromPosition,
    skipPreflight,
    position?.address,
    collateralDeltaAmount,
    onClose,
    position?.indexToken?.decimals,
    receiveTokenAddress,
  ]);

  return [
    useCallback(() => {
      if (isDeposit) handleSubmitCreateCollateralDepositToPosition();
      else handleSubmitCreateCollateralWithdrawlFromPosition();
    }, [
      isDeposit,
      handleSubmitCreateCollateralDepositToPosition,
      handleSubmitCreateCollateralWithdrawlFromPosition,
    ]),
    isSending,
  ] as const;
}
