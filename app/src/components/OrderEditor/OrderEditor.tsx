import './OrderEditor.scss';

import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import Modal from '@/components/Common/Modal/Modal';
import { OrderEditorSubmitButton } from '@/components/OrderEditor/components/OrderEditorSubmitButton';
import { useHandleSubmitOrder } from '@/components/OrderEditor/hooks/useHandleSubmitOrder';
import { useOrderEditorError } from '@/components/OrderEditor/hooks/useOrderEditorError';
import { AcceptablePriceImpactInputRow } from '@/components/TradeBox/TradeBoxRows/AcceptablePriceImpactInputRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
} from '@/selectors/order/types';
import {
  selectOrderEditorAcceptablePriceImpactBps,
  selectOrderEditorInitialAcceptablePriceImpactBps,
  selectOrderEditorSizeInputValue,
  selectOrderEditorTriggerPriceInputValue,
  selectOrderEditorTriggerRatioInputValue,
  selectSetOrderEditorAcceptablePriceImpactBps,
  selectSetOrderEditorSizeInputValue,
  selectSetOrderEditorTriggerPriceInputValue,
  selectSetOrderEditorTriggerRatioInputValue,
} from '@/selectors/orderEditor/baseSelectors';
import { selectOrderEditorAcceptablePrice } from '@/selectors/orderEditor/selectOrderEditorAcceptablePrice';
import { selectOrderEditorExistingPosition } from '@/selectors/orderEditor/selectOrderEditorExistingPosition';
import { selectOrderEditorIndexTokenDecimals } from '@/selectors/orderEditor/selectOrderEditorIndexTokenDecimals';
import { selectOrderEditorMarkPrice } from '@/selectors/orderEditor/selectOrderEditorMarkPrice';
import { selectOrderEditorMarkRatio } from '@/selectors/orderEditor/selectOrderEditorMarkRatio';
import { selectOrderEditorMinOutputAmount } from '@/selectors/orderEditor/selectOrderEditorMinOutputAmount';
import { selectOrderEditorNextPositionValuesForIncrease } from '@/selectors/orderEditor/selectOrderEditorNextPositionValuesForIncrease';
import { selectOrderEditorPriceImpactFeeBps } from '@/selectors/orderEditor/selectOrderEditorPriceImpactFeeBps';
import { selectOrderEditorRecommendedAcceptablePriceImpactBps } from '@/selectors/orderEditor/selectOrderEditorRecommendedAcceptablePriceImpactBps';
import { selectOrderEditorTriggerRatio } from '@/selectors/orderEditor/selectOrderEditorTriggerRatio';
import { makeSelectMarketPriceDecimals } from '@/selectors/stats/makeSelectMarketPriceDecimals';
import {
  formatAmount,
  formatAmountFree,
  formatLeverage,
  formatLiquidationPrice,
  formatPriceUsd,
  formatTokenAmount,
} from '@/utils/legacy/format';
import { getOrderTypeLabel } from '@/utils/order/getOrderTypeLabel';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import {
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from '@/utils/order/isOrderType';
import { useAppStore } from '@/zustand/useAppStore';
import { getMarketPriceInputDecimalsFromPrices } from '@/utils/priceInput/getMarketPriceInputDecimals';
import { t, Trans } from '@lingui/macro';
import { useEffect, useMemo, useState } from 'react';
import { useKey } from 'react-use';

type Props = {
  onClose: () => void;
  order: OrderInfo;
};

export function OrderEditor(p: Props) {
  const [isInited, setIsInited] = useState(false);

  const sizeInputValue = useAppStore(selectOrderEditorSizeInputValue);
  const triggerPriceInputValue = useAppStore(
    selectOrderEditorTriggerPriceInputValue
  );
  const triggerRatioInputValue = useAppStore(
    selectOrderEditorTriggerRatioInputValue
  );
  const setSizeInputValue = useAppStore(selectSetOrderEditorSizeInputValue);
  const setTriggerPriceInputValue = useAppStore(
    selectSetOrderEditorTriggerPriceInputValue
  );
  const setTriggerRatioInputValue = useAppStore(
    selectSetOrderEditorTriggerRatioInputValue
  );
  const markRatio = useAppStore(selectOrderEditorMarkRatio);
  const triggerRatio = useAppStore(selectOrderEditorTriggerRatio);
  const minOutputAmount = useAppStore(selectOrderEditorMinOutputAmount);
  const indexPriceDecimals = useAppStore(selectOrderEditorIndexTokenDecimals);
  const markPrice = useAppStore(selectOrderEditorMarkPrice);
  const existingPosition = useAppStore(selectOrderEditorExistingPosition);
  const isLimitIncreaseOrder = p.order.orderType === OrderType.LimitIncrease;
  const nextPositionValuesForIncrease = useAppStore(
    selectOrderEditorNextPositionValuesForIncrease
  );
  const acceptablePriceImpactBps = useAppStore(
    selectOrderEditorAcceptablePriceImpactBps
  );
  const acceptablePrice = useAppStore(selectOrderEditorAcceptablePrice);
  const initialAcceptablePriceImpactBps = useAppStore(
    selectOrderEditorInitialAcceptablePriceImpactBps
  );
  const setAcceptablePriceImpactBps = useAppStore(
    selectSetOrderEditorAcceptablePriceImpactBps
  );
  const recommendedAcceptablePriceImpactBps = useAppStore(
    selectOrderEditorRecommendedAcceptablePriceImpactBps
  );
  const priceImpactFeeBps = useAppStore(selectOrderEditorPriceImpactFeeBps);
  const isGmw402Enabled = getGmw402Enabled();
  const positionOrder = !isSwapOrderType(p.order.orderType)
    ? (p.order as PositionOrderInfo)
    : undefined;
  const priceInputDecimals = isGmw402Enabled
    ? getMarketPriceInputDecimalsFromPrices(
      positionOrder?.indexToken.prices,
      positionOrder?.indexToken.address.toBase58()
    )
    : undefined;
  const useGmw402PriceDecimals = priceInputDecimals !== undefined;

  const [onSubmit, isCreatingUpdateOrder] = useHandleSubmitOrder(
    p.onClose,
    p.order
  );

  const { error, isMaxLeverageError } = useOrderEditorError(
    p.order,
    isCreatingUpdateOrder
  );

  useKey(
    'Enter',
    () => {
      if (!error && !isMaxLeverageError) {
        onSubmit();
      }
    },
    {},
    [error, isMaxLeverageError]
  );

  const initialValues = useMemo(() => {
    if (isSwapOrderType(p.order.orderType)) {
      const ratio = (p.order as SwapOrderInfo).triggerRatio;

      if (ratio) {
        return {
          triggerRatioValue: formatAmount(
            ratio.ratio,
            USD_DECIMALS,
            10,
            false,
            true
          ),
          sizeValue: undefined,
          triggerPriceValue: undefined,
        };
      }
    } else {
      const positionOrder = p.order as PositionOrderInfo;

      return {
        triggerRatioValue: undefined,
        sizeValue: formatAmountFree(
          positionOrder.sizeDeltaUsd ?? BN_ZERO,
          USD_DECIMALS
        ),
        triggerPriceValue: formatAmount(
          positionOrder.triggerPrice ?? BN_ZERO,
          USD_DECIMALS,
          useGmw402PriceDecimals
            ? priceInputDecimals
            : indexPriceDecimals || USD_DECIMALS,
          false,
          !useGmw402PriceDecimals
        ),
      };
    }

    return {
      triggerRatioValue: undefined,
      sizeValue: undefined,
      triggerPriceValue: undefined,
    };
  }, [
    p.order,
    indexPriceDecimals,
    priceInputDecimals,
    useGmw402PriceDecimals,
  ]);

  useEffect(() => {
    if (isInited) return;

    if (initialValues.triggerRatioValue) {
      setTriggerRatioInputValue(initialValues.triggerRatioValue);
    }
    if (initialValues.sizeValue) {
      setSizeInputValue(initialValues.sizeValue);
    }
    if (initialValues.triggerPriceValue) {
      setTriggerPriceInputValue(initialValues.triggerPriceValue);
    }

    setIsInited(true);
  }, [
    isInited,
    initialValues,
    setTriggerRatioInputValue,
    setSizeInputValue,
    setTriggerPriceInputValue,
  ]);

  const button = (
    <OrderEditorSubmitButton onClose={p.onClose} order={p.order} />
  );

  const marketPriceDecimals = useAppStore(
    makeSelectMarketPriceDecimals(
      p.order.targetCollateralToken.address.toBase58()
    )
  );

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={<Trans>Edit {getOrderTypeLabel(p.order.orderType)}</Trans>}
      >
        {!isSwapOrderType(p.order.orderType) && (
          <>
            <BuyInputSection
              topLeftLabel={
                isTriggerDecreaseOrderType(p.order.orderType)
                  ? t`Close`
                  : t`Size`
              }
              inputValue={sizeInputValue}
              onInputValueChange={(e) => setSizeInputValue(e.target.value)}
            >
              USD
            </BuyInputSection>

            <BuyInputSection
              topLeftLabel={t`Trigger Price`}
              topRightLabel={t`Mark Price`}
              topRightValue={formatPriceUsd(markPrice, {
                displayDecimals: useGmw402PriceDecimals
                  ? priceInputDecimals
                  : indexPriceDecimals,
              })}
              onClickTopRightLabel={() =>
                setTriggerPriceInputValue(
                  formatAmount(
                    markPrice,
                    USD_DECIMALS,
                    useGmw402PriceDecimals
                      ? priceInputDecimals
                      : indexPriceDecimals || USD_DECIMALS,
                    false,
                    !useGmw402PriceDecimals
                  )
                )
              }
              inputValue={triggerPriceInputValue}
              onInputValueChange={(e) =>
                setTriggerPriceInputValue(e.target.value)
              }
              decimalPlaces={isGmw402Enabled ? priceInputDecimals : undefined}
            >
              USD
            </BuyInputSection>
          </>
        )}

        {isSwapOrderType(p.order.orderType) && (
          <>
            {triggerRatio && (
              <BuyInputSection
                topLeftLabel={t`Trigger Ratio`}
                topRightValue={formatAmount(
                  markRatio?.ratio,
                  USD_DECIMALS,
                  4,
                  false,
                  true
                )}
                onClickTopRightLabel={() => {
                  setTriggerRatioInputValue(
                    formatAmount(
                      markRatio?.ratio,
                      USD_DECIMALS,
                      10,
                      false,
                      true
                    )
                  );
                }}
                inputValue={triggerRatioInputValue}
                onInputValueChange={(e) => {
                  setTriggerRatioInputValue(e.target.value);
                }}
              >
                {`${triggerRatio.smallestToken.symbol} per ${triggerRatio.largestToken.symbol}`}
              </BuyInputSection>
            )}
          </>
        )}

        <ExchangeInfo className="PositionEditor-info-box">
          <ExchangeInfo.Group>
            {isLimitIncreaseOrder && (
              <ExchangeInfoRow
                label={t`Leverage`}
                value={
                  <ValueTransition
                    from={formatLeverage(existingPosition?.leverage)}
                    to={
                      formatLeverage(
                        nextPositionValuesForIncrease?.nextLeverage
                      ) ?? '-'
                    }
                  />
                }
              />
            )}
          </ExchangeInfo.Group>
          <ExchangeInfo.Group>
            {!isSwapOrderType(p.order.orderType) && (
              <>
                {p.order.orderType !== OrderType.StopLossDecrease && (
                  <>
                    <AcceptablePriceImpactInputRow
                      acceptablePriceImpactBps={acceptablePriceImpactBps}
                      initialPriceImpactFeeBps={initialAcceptablePriceImpactBps}
                      recommendedAcceptablePriceImpactBps={
                        recommendedAcceptablePriceImpactBps
                      }
                      setAcceptablePriceImpactBps={setAcceptablePriceImpactBps}
                      priceImpactFeeBps={priceImpactFeeBps}
                    />

                    <div className="line-divider" />
                  </>
                )}

                <ExchangeInfoRow
                  label={t`Acceptable Price`}
                  value={formatAcceptablePriceDisplay({
                    orderType: p.order.orderType,
                    isLong: p.order.isLong,
                    acceptablePrice: acceptablePrice,
                    triggerPrice:
                      'triggerPrice' in p.order
                        ? p.order.triggerPrice
                        : undefined,
                    indexTokenDecimals: indexPriceDecimals,
                    displayDecimals: isGmw402Enabled
                      ? priceInputDecimals
                      : marketPriceDecimals,
                  })}
                />

                {existingPosition && (
                  <ExchangeInfoRow
                    label={t`Liquidation Price`}
                    value={formatLiquidationPrice(
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                      existingPosition.liquidationPrice,
                      {
                        displayDecimals: isGmw402Enabled
                          ? priceInputDecimals
                          : marketPriceDecimals,
                      }
                    )}
                  />
                )}
              </>
            )}
          </ExchangeInfo.Group>
          <ExchangeInfo.Group>
            {isSwapOrderType(p.order.orderType) && (
              <>
                <ExchangeInfoRow
                  label={t`Min. Receive`}
                  value={formatTokenAmount(
                    minOutputAmount,
                    p.order.targetCollateralToken.decimals,
                    p.order.targetCollateralToken.symbol
                  )}
                />
              </>
            )}
          </ExchangeInfo.Group>
        </ExchangeInfo>

        <div className="Exchange-swap-button-container">{button}</div>
      </Modal>
    </div>
  );
}
