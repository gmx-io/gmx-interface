import { Operation } from '@/selectors/positionEditor/types';
import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import {
  selectPositionEditorCollateralInputValue,
  selectPositionEditorOperation,
  selectPositionEditorSelectedCollateralAddress,
} from '@/selectors/positionEditor/baseSelectors';
import { selectPositionEditorCollateralDeltaAmount } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaAmount';
import { selectPositionEditorCollateralDeltaUsd } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaUsd';
import { selectPositionEditorCollateralToken } from '@/selectors/positionEditor/selectPositionEditorCollateralToken';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectPositionEditorMinCollateralFactor } from '@/selectors/positionEditor/selectPositionEditorMinCollateralFactor';
import { getCommonError } from '@/utils/validation/getCommonError';
import { getEditCollateralError } from '@/utils/validation/getEditCollateralError';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useMemo } from 'react';

import { usePositionEditorData } from './usePositionEditorData';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';

interface Props {
  priceImpactWarningState: PriceImpactWarningState;
  isSending: boolean;
}

export function usePositionEditorError({
  priceImpactWarningState,
  isSending,
}: Props): [string?, string?] {
  const operation = useAppStore(selectPositionEditorOperation);
  const isDeposit = operation === Operation.Deposit;
  const position = useAppStore(selectPositionEditorEditingPosition);
  const nativeToken = useAppStore(selectNativeToken);
  const collateralToken = useAppStore(selectPositionEditorCollateralToken);
  const collateralDeltaAmount = useAppStore(
    selectPositionEditorCollateralDeltaAmount
  );
  const depositToken = collateralToken?.isWrappedNative
    ? nativeToken
    : collateralToken;

  const depositAmount = collateralDeltaAmount;
  const collateralDeltaUsd = useAppStore(
    selectPositionEditorCollateralDeltaUsd
  );
  const minCollateralFactor = useAppStore(
    selectPositionEditorMinCollateralFactor
  );
  const selectedCollateralAddress = useAppStore(
    selectPositionEditorSelectedCollateralAddress
  );
  const collateralInputValue = useAppStore(
    selectPositionEditorCollateralInputValue
  );

  const { nextLeverage, nextLiqPrice } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue: collateralInputValue ?? '',
    operation,
  });

  return useMemo(() => {
    if (!priceImpactWarningState) {
      return [t`Invalid price impact state`];
    }

    const commonError = getCommonError({
      isConnected: true,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextLeverage,
      nextLiqPrice,
      isDeposit,
      position,
      depositToken,
      depositAmount,
      minCollateralFactor,
    });

    const error = commonError[0] || editCollateralError[0];
    const tooltipName = commonError[1] || editCollateralError[1];

    if (error) {
      return [error, tooltipName];
    }

    if (priceImpactWarningState.validationError) {
      return [t`Acknowledgment Required`];
    }

    if (isSending) {
      return [t`Creating Order...`];
    }

    return [];
  }, [
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    minCollateralFactor,
    priceImpactWarningState,
    isSending,
    depositToken,
    depositAmount,
  ]);
}
