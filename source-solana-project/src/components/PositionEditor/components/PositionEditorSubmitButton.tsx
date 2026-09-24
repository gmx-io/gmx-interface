import Button from '@/components/Common/Button/Button';
import { useHandleSubmitOrder } from '@/components/PositionEditor/hooks/useHandleSubmitOrder';
import { usePositionEditorData } from '@/components/PositionEditor/hooks/usePositionEditorData';
import { Operation } from '@/selectors/positionEditor/types';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN_ONE, BN_ZERO } from '@/config/constants';
import { useHighExecutionFeeConsent } from '@/hooks/tradeboxHooks/useHighExecutionFeeConsent';
import { useAppStore } from '@/zustand/useAppStore';
import { msg, Trans } from '@lingui/macro';
import { useCallback, useMemo, useRef } from 'react';

import { usePositionEditorFees } from '../hooks/usePositionEditorFees';
import {
  selectPositionEditorCollateralInputValue,
  selectPositionEditorOperation,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSetCollateralInputValue,
} from '@/selectors/positionEditor/baseSelectors';
import { selectPositionEditorCollateralDeltaAmount } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaAmount';
import { selectPositionEditorMaxWithdrawAmount } from '@/selectors/positionEditor/selectPositionEditorMaxWithdrawAmount';
import { selectPositionEditorCollateralToken } from '@/selectors/positionEditor/selectPositionEditorCollateralToken';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectPositionEditorCollateralDeltaUsd } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaUsd';
import { selectPositionEditorMinCollateralFactor } from '@/selectors/positionEditor/selectPositionEditorMinCollateralFactor';
import { selectShouldDisableValidationForTesting } from '@/selectors/setting/baseSelectors';
import { useLocalizedMap } from '@/utils/lib/i18n';
import { getEditCollateralError } from '@/utils/validation/getEditCollateralError';
import { getCommonError } from '@/utils/validation/getCommonError';
import { formatAmountFree } from '@/utils/legacy/format';
import { bnBinarySearch } from '@/utils/lib/binarySearch';
import { expandDecimals } from '@/utils/legacy/decimals';
import { willPositionCollateralBeSufficientForPosition } from '@/utils/position/willPositionCollateralBeSufficientForPosition';
import { substractMaxLeverageSlippage } from '@/utils/tradebox/substractMaxLeverageSlippage';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';

const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Deposit`,
  [Operation.Withdraw]: msg`Withdraw`,
};

interface Props {
  onClose: () => void;
}

export function PositionEditorSubmitButton({ onClose }: Props) {
  const operation = useAppStore(selectPositionEditorOperation);
  const collateralDeltaAmount = useAppStore(
    selectPositionEditorCollateralDeltaAmount
  );
  const collateralDeltaUsd = useAppStore(
    selectPositionEditorCollateralDeltaUsd
  );
  const collateralToken = useAppStore(selectPositionEditorCollateralToken);
  const nativeToken = useAppStore(selectNativeToken);
  const depositToken = collateralToken?.isWrappedNative
    ? nativeToken
    : collateralToken;
  const depositAmount = collateralDeltaAmount;
  const minCollateralFactor = useAppStore(
    selectPositionEditorMinCollateralFactor
  );
  const position = useAppStore(selectPositionEditorEditingPosition);
  const shouldDisableValidationForTesting = useAppStore(
    selectShouldDisableValidationForTesting
  );
  const selectedCollateralAddress = useAppStore(
    selectPositionEditorSelectedCollateralAddress
  );
  const collateralInputValue = useAppStore(
    selectPositionEditorCollateralInputValue
  );
  const setCollateralInputValue = useAppStore(
    selectPositionEditorSetCollateralInputValue
  );
  const maxWithdrawAmount = useAppStore(selectPositionEditorMaxWithdrawAmount);

  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const isDeposit = operation === Operation.Deposit;

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const { executionFee } = usePositionEditorFees({
    selectedCollateralAddress,
    collateralInputValue: collateralInputValue ?? '',
    operation,
  });

  const { element: isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );
  const [onSubmit, isSending] = useHandleSubmitOrder(onClose, isDeposit);

  const { nextLeverage, nextLiqPrice } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue: collateralInputValue ?? '',
    operation,
  });

  const [error, tooltipName] = useMemo(() => {
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

    if (isHighFeeConsentError) {
      return ['High Network Fee not yet acknowledged'];
    }

    if (isSending) {
      return ['Creating Order...'];
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
    isHighFeeConsentError,
    isSending,
    depositToken,
    depositAmount,
  ]);

  const detectAndSetMaxSize = useCallback(() => {
    if (maxWithdrawAmount === undefined) return;
    if (!collateralToken) return;
    if (!position) return;
    if (minCollateralFactor === undefined) return;

    const { result: safeMaxWithdrawal } = bnBinarySearch(
      BN_ONE,
      maxWithdrawAmount,
      expandDecimals(BN_ONE, Math.ceil(collateralToken.decimals / 3)),
      (x) => {
        const isValid = willPositionCollateralBeSufficientForPosition(
          position,
          x,
          BN_ZERO,
          minCollateralFactor,
          BN_ZERO
        );
        return { isValid, returnValue: null };
      }
    );
    setCollateralInputValue(
      formatAmountFree(
        substractMaxLeverageSlippage(safeMaxWithdrawal),
        collateralToken.decimals
      )
    );
  }, [
    collateralToken,
    maxWithdrawAmount,
    minCollateralFactor,
    position,
    setCollateralInputValue,
  ]);

  const errorTooltipContent = useMemo(() => {
    if (tooltipName !== 'maxLeverage') return null;

    return (
      <Trans>
        Decrease the withdraw size to match the max. <br />
        <span onClick={detectAndSetMaxSize} className="Tradebox-handle">
          <Trans>Set max withdrawal</Trans>
        </span>
      </Trans>
    );
  }, [tooltipName, detectAndSetMaxSize]);

  const renderErrorTooltipContent = useCallback(
    () => errorTooltipContent,
    [errorTooltipContent]
  );

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={onSubmit}
      disabled={Boolean(error) && !shouldDisableValidationForTesting}
      buttonRef={submitButtonRef}
      qa="confirm-button"
    >
      {error || localizedOperationLabels[operation]}
    </Button>
  );

  return errorTooltipContent ? (
    <TooltipWithPortal
      className="w-full"
      renderContent={renderErrorTooltipContent}
      isHandlerDisabled
      handle={buttonContent}
      handleClassName="w-full"
      position="top"
    />
  ) : (
    buttonContent
  );
}
