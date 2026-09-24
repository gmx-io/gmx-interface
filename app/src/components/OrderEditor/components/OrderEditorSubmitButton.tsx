import Button from '@/components/Common/Button/Button';
import { useHandleSubmitOrder } from '@/components/OrderEditor/hooks/useHandleSubmitOrder';
import { useOrderEditorError } from '@/components/OrderEditor/hooks/useOrderEditorError';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  BASIS_POINTS_DIVISOR_BN,
  BN_10,
  BN_ONE,
  BN_ZERO,
  USD_DECIMALS,
} from '@/config/constants';
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
} from '@/selectors/order/types';
import {
  selectOrderEditorAcceptablePriceImpactBps,
  selectSetOrderEditorSizeInputValue,
} from '@/selectors/orderEditor/baseSelectors';
import { selectOrderEditorExistingPosition } from '@/selectors/orderEditor/selectOrderEditorExistingPosition';
import { selectOrderEditorFindSwapPath } from '@/selectors/orderEditor/selectOrderEditorFindSwapPath';
import { selectOrderEditorFromToken } from '@/selectors/orderEditor/selectOrderEditorFromToken';
import { selectOrderEditorMaxAllowedLeverage } from '@/selectors/orderEditor/selectOrderEditorMaxAllowedLeverage';
import { selectOrderEditorSizeDeltaUsd } from '@/selectors/orderEditor/selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorTriggerPrice } from '@/selectors/orderEditor/selectOrderEditorTriggerPrice';
import { selectPositionConstants } from '@/selectors/position/baseSelectors';
import { selectUserOrderFeeDiscountFactor } from '@/selectors/referral/selectUserOrderFeeDiscountFactor';
import { selectSavedAcceptablePriceImpactBuffer } from '@/selectors/setting/baseSelectors';
import { selectWrappedNativeToken } from '@/selectors/token/selectWrappedNativeToken';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { formatAmountFree } from '@/utils/legacy/format';
import { bnBinarySearch } from '@/utils/lib/binarySearch';
import { helperNotice } from '@/utils/lib/helperNotice';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { getNextPositionValuesForIncreaseTrade } from '@/utils/position/getNextPositionValuesForIncreaseTrade';
import { getIncreasePositionAmounts } from '@/utils/tradebox/getIncreasePositionAmounts';
import { substractMaxLeverageSlippage } from '@/utils/tradebox/substractMaxLeverageSlippage';
import { getIsMaxLeverageExceeded } from '@/utils/validation/getIsMaxLeverageExceeded';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { ReactNode, useMemo } from 'react';

interface Props {
  onClose: () => void;
  order: OrderInfo;
}

export function OrderEditorSubmitButton({ onClose, order }: Props) {
  const positionOrder = order as PositionOrderInfo | undefined;
  const positionIndexToken = positionOrder?.indexToken;
  const fromToken = useAppStore(selectOrderEditorFromToken);
  const { minCollateralUsd } = useAppStore(selectPositionConstants);
  const maxAllowedLeverage = useAppStore(selectOrderEditorMaxAllowedLeverage);
  const findSwapPath = useAppStore(selectOrderEditorFindSwapPath);
  const sizeDeltaUsd = useAppStore(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = useAppStore(selectOrderEditorTriggerPrice);
  const existingPosition = useAppStore(selectOrderEditorExistingPosition);
  const { userOrderFeeDiscountFactor } = useAppStore(
    selectUserOrderFeeDiscountFactor
  );
  const acceptablePriceImpactBps = useAppStore(
    selectOrderEditorAcceptablePriceImpactBps
  );
  const savedAcceptablePriceImpactBuffer = useAppStore(
    selectSavedAcceptablePriceImpactBuffer
  );
  const wrappedNativeToken = useAppStore(selectWrappedNativeToken);
  const setSizeInputValue = useAppStore(selectSetOrderEditorSizeInputValue);

  const indexTokenAmount = useMemo(
    () =>
      positionIndexToken
        ? convertUsdToTokenAmount(
            sizeDeltaUsd,
            positionIndexToken.decimals,
            triggerPrice
          ) ?? BN_ZERO
        : undefined,
    [positionIndexToken, sizeDeltaUsd, triggerPrice]
  );

  function detectAndSetAvailableMaxLeverage() {
    const positionOrder = order as PositionOrderInfo;
    const marketInfo = positionOrder.marketInfo;
    const collateralToken = positionOrder.targetCollateralToken;

    if (
      !positionIndexToken ||
      !fromToken ||
      minCollateralUsd === undefined ||
      !wrappedNativeToken
    )
      return;

    const { returnValue: newSizeDeltaUsd } = bnBinarySearch<BN | undefined>(
      BN_ONE,
      // "10 *" means we do 1..50 search but with 0.1x step
      BN_10.mul(maxAllowedLeverage).div(BASIS_POINTS_DIVISOR_BN),
      BN_ONE,
      (lev) => {
        const leverage = lev.div(BN_10).mul(BASIS_POINTS_DIVISOR_BN);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath: findSwapPath ?? (() => undefined),
          indexToken: positionIndexToken,
          indexTokenAmount,
          initialCollateralAmount: positionOrder.initialCollateralDeltaAmount,
          initialCollateralToken: fromToken,
          isLong: positionOrder.isLong,
          marketInfo: positionOrder.marketInfo,
          position: existingPosition,
          strategy: 'leverageByCollateral',
          acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
          fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
          leverage,
          triggerPrice,
          feeDiscountFactor: userOrderFeeDiscountFactor,
          wrappedNativeToken,
        });

        const nextPositionValues = getNextPositionValuesForIncreaseTrade({
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralToken,
          existingPosition,
          indexPrice: increaseAmounts.indexPrice,
          isLong: positionOrder.isLong,
          marketInfo,
          minCollateralUsd,
          showPnlInLeverage: false,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        });

        if (nextPositionValues.nextLeverage !== undefined) {
          const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
            nextPositionValues.nextLeverage,
            marketInfo,
            positionOrder.isLong,
            increaseAmounts.sizeDeltaUsd
          );

          return {
            isValid: !isMaxLeverageExceeded,
            returnValue: increaseAmounts.sizeDeltaUsd,
          };
        }

        return {
          isValid: false,
          returnValue: increaseAmounts.sizeDeltaUsd,
        };
      }
    );

    if (newSizeDeltaUsd !== undefined) {
      setSizeInputValue(
        formatAmountFree(
          substractMaxLeverageSlippage(newSizeDeltaUsd),
          USD_DECIMALS,
          2
        )
      );
    } else {
      helperNotice.error(t`No available leverage found`);
    }
  }

  const [onSubmit, isCreatingUpdateOrder] = useHandleSubmitOrder(
    onClose,
    order
  );

  const { error, isMaxLeverageError } = useOrderEditorError(
    order,
    isCreatingUpdateOrder
  );

  function getSubmitButtonState(): {
    error: string | undefined;
    isMaxLeverageError: boolean;
    text: ReactNode;
    disabled?: boolean;
    tooltip?: ReactNode;
    onClick?: () => void;
  } {
    if (isMaxLeverageError) {
      return {
        text: t`Max. Leverage Exceeded`,
        isMaxLeverageError: true,
        error: t`Max. Leverage Exceeded`,
        tooltip: (
          <>
            <Trans>Decrease the size to match the max. allowed leverage:</Trans>{' '}
            .
            <br />
            <br />
            <span
              onClick={detectAndSetAvailableMaxLeverage}
              className="Tradebox-handle"
            >
              <Trans>Set Max Leverage</Trans>
            </span>
          </>
        ),
        disabled: true,
      };
    }

    if (error) {
      return {
        error,
        isMaxLeverageError,
        text: error,
        disabled: true,
      };
    }

    const orderTypeName =
      order.orderType === OrderType.LimitIncrease
        ? t`Limit`
        : getTriggerNameByOrderType(order.orderType);

    return {
      error: undefined,
      isMaxLeverageError: false,
      text: `Update ${orderTypeName} Order`,
      disabled: false,
      onClick: onSubmit,
    };
  }

  const submitButtonState = getSubmitButtonState();

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={submitButtonState.onClick}
      disabled={submitButtonState.disabled}
    >
      {submitButtonState.text}
    </Button>
  );

  return submitButtonState.tooltip ? (
    <TooltipWithPortal
      position="top"
      handleClassName="w-full"
      className="PositionEditor-tooltip"
      handle={buttonContent}
      isHandlerDisabled
      renderContent={() => submitButtonState.tooltip}
    />
  ) : (
    buttonContent
  );
}
