import Button from '@/components/Common/Button/Button';
import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { HighPriceImpactWarning } from '@/components/HighPriceImpactWarning/HighPriceImpactWarning';
import Modal from '@/components/Common/Modal/Modal';
import { PositionSellerAdvancedRows } from '@/components/PositionSeller/rows/PositionSellerAdvancedDisplayRows';
import { useHandleSubmitOrder } from '@/components/PositionSeller/useHandleSubmitOrder';
import Tab from '@/components/Common/Tab/Tab';
import { ExecutionPriceRow } from '@/components/TradeBox/TradeBoxRows/ExecutionPriceRow';
import { TradeFeesRow } from '@/components/TradeBox/TradeBoxRows/TradeFeesRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { OrderOption } from '@/selectors/order/types';
import { selectPositionConstants } from '@/selectors/position/baseSelectors';
import {
  selectPositionSellerCloseUsdInputValue,
  selectPositionSellerOrderOption,
  selectPositionSellerTriggerPriceInputValue,
  selectSetPositionSellerAddress,
  selectSetPositionSellerCloseUsdInputValue,
  selectSetPositionSellerDefaultReceiveTokenAddress,
  selectSetPositionSellerOrderOption,
  selectSetPositionSellerReceiveTokenAddress,
  selectSetPositionSellerTriggerPriceInputValue,
} from '@/selectors/positionSeller/baseSelectors';
import { selectPositionSellerAcceptablePrice } from '@/selectors/positionSeller/selectPositionSellerAcceptablePrice';
import { selectPositionSellerCloseSizeUsd } from '@/selectors/positionSeller/selectPositionSellerCloseSizeUsd';
import { selectPositionSellerClosingPosition } from '@/selectors/positionSeller/selectPositionSellerClosingPosition';
import { selectPositionSellerDecreaseAmounts } from '@/selectors/positionSeller/selectPositionSellerDecreaseAmounts';
import { selectPositionSellerFees } from '@/selectors/positionSeller/selectPositionSellerFees';
import { selectPositionSellerIsTrigger } from '@/selectors/positionSeller/selectPositionSellerIsTrigger';
import { selectPositionSellerMarkPrice } from '@/selectors/positionSeller/selectPositionSellerMarkPrice';
import { selectPositionSellerMaxLiquidityPath } from '@/selectors/positionSeller/selectPositionSellerMaxLiquidityPath';
import { selectPositionSellerNextPositionValuesForDecrease } from '@/selectors/positionSeller/selectPositionSellerNextPositionValuesForDecrease';
import { selectPositionSellerReceiveToken } from '@/selectors/positionSeller/selectPositionSellerReceiveToken';
import { selectPositionSellerShouldSwap } from '@/selectors/positionSeller/selectPositionSellerShouldSwap';
import { selectPositionSellerSwapAmounts } from '@/selectors/positionSeller/selectPositionSellerSwapAmounts';
import { selectPositionSellerTriggerPrice } from '@/selectors/positionSeller/selectPositionSellerTriggerPrice';
import { makeSelectMarketPriceDecimals } from '@/selectors/stats/makeSelectMarketPriceDecimals';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { getPriceDecimals } from '@/utils/legacy/common';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import {
  formatAmount,
  formatAmountFree,
  formatLiquidationPrice,
  formatTokenAmountWithUsd,
  formatUsd,
} from '@/utils/legacy/format';
import { useLocalizedMap } from '@/utils/lib/i18n';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { getCommonError } from '@/utils/validation/getCommonError';
import { getDecreaseError } from '@/utils/validation/getDecreaseError';
import { useAppStore } from '@/zustand/useAppStore';
import { msg, t, Trans } from '@lingui/macro';
import { useCallback, useMemo, useRef } from 'react';

import { GtRewardsRow } from '../TradeBox/TradeBoxRows/GtRewardsRow';
import { selectPositionSellerExecutionPrice } from '@/selectors/positionSeller/selectPositionSellerExecutionPrice';
import { SelectCompetition } from '@/components/TradeBox/components/Competition';
import { useState } from 'react';

const ORDER_OPTION_LABELS = {
  [OrderOption.Market]: msg`Market`,
  [OrderOption.Trigger]: msg`TP/SL`,
};

export function PositionSellerConfirmationBox() {
  const position = useAppStore(selectPositionSellerClosingPosition);
  const setPositionSellerClosingPositionAddress = useAppStore(
    selectSetPositionSellerAddress
  );
  const isVisible = Boolean(position);
  const closeUsdInputValue = useAppStore(
    selectPositionSellerCloseUsdInputValue
  );
  const setCloseUsdInputValue = useAppStore(
    selectSetPositionSellerCloseUsdInputValue
  );
  const orderOption = useAppStore(selectPositionSellerOrderOption);
  const setOrderOption = useAppStore(selectSetPositionSellerOrderOption);
  const triggerPriceInputValue = useAppStore(
    selectPositionSellerTriggerPriceInputValue
  );
  const triggerPrice = useAppStore(selectPositionSellerTriggerPrice);
  const acceptablePrice = useAppStore(selectPositionSellerAcceptablePrice);
  const setTriggerPriceInputValue = useAppStore(
    selectSetPositionSellerTriggerPriceInputValue
  );
  const markPrice = useAppStore(selectPositionSellerMarkPrice);
  const marketDecimals = useAppStore(
    makeSelectMarketPriceDecimals(
      position?.marketInfo.indexTokenAddress.toBase58()
    )
  );
  const isGmw402Enabled = getGmw402Enabled();
  const priceInputDecimals = isGmw402Enabled ? marketDecimals : undefined;
  const { minCollateralUsd } = useAppStore(selectPositionConstants);

  const positionSellerFees = useAppStore(selectPositionSellerFees);
  const fees = positionSellerFees?.fees;

  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const decreaseAmounts = useAppStore(selectPositionSellerDecreaseAmounts);
  const shouldSwap = useAppStore(selectPositionSellerShouldSwap);
  const swapAmounts = useAppStore(selectPositionSellerSwapAmounts);
  const receiveToken = useAppStore(selectPositionSellerReceiveToken);
  const executionPrice = useAppStore(selectPositionSellerExecutionPrice);

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount =
    swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const nextPositionValues = useAppStore(
    selectPositionSellerNextPositionValuesForDecrease
  );
  const { maxLiquidity: maxSwapLiquidity } = useAppStore(
    selectPositionSellerMaxLiquidityPath
  );

  const isTrigger = useAppStore(selectPositionSellerIsTrigger);
  const localizedOrderOptionLabels = useLocalizedMap(ORDER_OPTION_LABELS);

  const setReceiveTokenAddress = useAppStore(
    selectSetPositionSellerReceiveTokenAddress
  );
  const setDefaultReceiveTokenAddress = useAppStore(
    selectSetPositionSellerDefaultReceiveTokenAddress
  );

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] =
    useState(false);
  const [competitionId, setCompetitionId] = useState('');
  const onCompetitionSelect = useCallback((competitionId: string | null) => {
    console.log('competitionId', competitionId);
    setCompetitionId(competitionId || '');
    setIsTriggerWarningAccepted(!!competitionId);
  }, []);

  const resetInputs = useCallback(() => {
    setCloseUsdInputValue('');
    setPositionSellerClosingPositionAddress(undefined);
    setReceiveTokenAddress(undefined);
    setDefaultReceiveTokenAddress(undefined);
  }, [
    setCloseUsdInputValue,
    setPositionSellerClosingPositionAddress,
    setReceiveTokenAddress,
    setDefaultReceiveTokenAddress,
  ]);

  const setPositionSellerAddress = useAppStore(selectSetPositionSellerAddress);
  const onClose = useCallback(() => {
    setPositionSellerAddress(undefined);
    resetInputs();
  }, [setPositionSellerAddress, resetInputs]);

  const handleSetOrderOption = useCallback(
    (option: OrderOption) => {
      setOrderOption(option);
      setTriggerPriceInputValue('');
    },
    [setOrderOption, setTriggerPriceInputValue]
  );

  const maxCloseSize = position?.sizeInUsd ?? BN_ZERO;
  const closeSizeUsd = useAppStore(selectPositionSellerCloseSizeUsd);

  const [handleSubmit, isSending] = useHandleSubmitOrder(onClose, {
    isAddCompetition: isTriggerWarningAccepted,
    competitionId: isTriggerWarningAccepted ? competitionId : undefined,
  });

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    tradeFlags,
  });

  const isNotEnoughReceiveTokenLiquidity = shouldSwap
    ? maxSwapLiquidity.lt(receiveUsd ?? BN_ZERO)
    : false;

  const error = useMemo(() => {
    if (!position) {
      return undefined;
    }

    const commonError = getCommonError({
      isConnected: true,
    });

    const decreaseError = getDecreaseError({
      marketInfo: position.marketInfo,
      inputSizeUsd: closeSizeUsd,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      isTrigger,
      triggerPrice,
      triggerThresholdType: undefined,
      existingPosition: position,
      markPrice,
      nextPositionValues,
      isLong: position.isLong,
      minCollateralUsd,
      priceImpactWarning: priceImpactWarningState,
      isNotEnoughReceiveTokenLiquidity,
    });

    if (commonError[0] || decreaseError[0]) {
      return commonError[0] || decreaseError[0];
    }

    if (priceImpactWarningState.validationError) {
      return [t`Acknowledgment Required`];
    }

    if (isSending) {
      return t`Creating Order...`;
    }
  }, [
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    isNotEnoughReceiveTokenLiquidity,
    isSending,
    isTrigger,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    priceImpactWarningState,
    triggerPrice,
  ]);

  let formattedTriggerPrice = '-';

  if (
    decreaseAmounts &&
    decreaseAmounts.triggerPrice !== undefined &&
    !decreaseAmounts.triggerPrice.isZero()
  ) {
    formattedTriggerPrice = `${decreaseAmounts.triggerThresholdType || ''} ${formatUsd(
      decreaseAmounts.triggerPrice,
      {
        displayDecimals: marketDecimals ?? position?.indexToken?.priceDecimals,
      }
    )}`;
  }

  const executionPriceFlags = useMemo(
    () => ({
      isLimit: false,
      isMarket: orderOption === OrderOption.Market,
      isIncrease: false,
      isLong: !!position?.isLong,
      isShort: !position?.isLong,
      isSwap: false,
      isPosition: true,
      isTrigger: orderOption === OrderOption.Trigger,
    }),
    [position?.isLong, orderOption]
  );

  const triggerPriceRow = (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Trigger Price`}
      value={formattedTriggerPrice}
    />
  );

  const limitPriceRow = (
    <ExecutionPriceRow
      tradeFlags={executionPriceFlags}
      fees={fees}
      executionPrice={executionPrice ?? undefined}
      acceptablePrice={acceptablePrice}
      triggerOrderType={decreaseAmounts?.triggerOrderType}
      displayDecimals={marketDecimals}
    />
  );

  const liqPriceRow = position && (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Liquidation Price`}
      value={
        <ValueTransition
          from={formatLiquidationPrice(position.liquidationPrice, {
            displayDecimals: marketDecimals,
          })}
          to={
            decreaseAmounts?.isFullClose
              ? '-'
              : decreaseAmounts?.sizeDeltaUsd
                ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: marketDecimals,
                  })
                : undefined
          }
        />
      }
    />
  );

  const receiveTokenRow = (
    <ExchangeInfoRow
      label={t`Receive`}
      className="Exchange-info-row max-[350px]:flex max-[350px]:flex-col max-[350px]:items-start max-[350px]:gap-2"
      value={
        receiveToken && (
          <span className="max-[350px]:mt-2 max-[350px]:text-left">
            {formatTokenAmountWithUsd(
              receiveTokenAmount,
              receiveUsd,
              receiveToken?.symbol,
              receiveToken?.decimals,
              {
                fallbackToZero: true,
              }
            )}
          </span>
        )
      }
    />
  );

  return (
    <div className="PositionEditor">
      <Modal
        className="overflow-x-hidden"
        isVisible={isVisible}
        setIsVisible={onClose}
        label={
          <Trans>
            Close {position?.isLong ? t`Long` : t`Short`}{' '}
            {position?.marketInfo.indexToken?.symbol}
          </Trans>
        }
        qa="position-close-modal"
      >
        <Tab
          options={Object.values(OrderOption)}
          option={orderOption}
          optionLabels={localizedOrderOptionLabels}
          onChange={handleSetOrderOption}
          qa="operation-tabs"
          className="mb-10"
        />
        {position && (
          <>
            <div className="relative">
              <BuyInputSection
                topLeftLabel={t`Close`}
                topRightLabel={t`Max`}
                topRightValue={formatUsd(maxCloseSize)}
                inputValue={closeUsdInputValue}
                onInputValueChange={(e) =>
                  setCloseUsdInputValue(e.target.value)
                }
                showMaxButton={
                  maxCloseSize?.gt(BN_ZERO) && !closeSizeUsd?.eq(maxCloseSize)
                }
                onClickMax={() =>
                  setCloseUsdInputValue(
                    formatAmountFree(maxCloseSize, USD_DECIMALS)
                  )
                }
                showPercentSelector={true}
                onPercentChange={(percentage) => {
                  const formattedAmount = formatAmountFree(
                    maxCloseSize.muln(percentage).divn(100),
                    USD_DECIMALS,
                    2
                  );
                  setCloseUsdInputValue(formattedAmount);
                }}
                qa="amount-input"
              >
                USD
              </BuyInputSection>
            </div>
            {isTrigger && (
              <BuyInputSection
                topLeftLabel={t`Price`}
                topRightLabel={t`Mark`}
                topRightValue={formatUsd(markPrice, {
                  displayDecimals: priceInputDecimals ?? marketDecimals,
                })}
                onClickTopRightLabel={() => {
                  setTriggerPriceInputValue(
                    formatAmount(
                      markPrice,
                      USD_DECIMALS,
                      priceInputDecimals ?? getPriceDecimals(markPrice),
                      undefined,
                      !isGmw402Enabled
                    )
                  );
                }}
                inputValue={triggerPriceInputValue}
                onInputValueChange={(e) => {
                  setTriggerPriceInputValue(e.target.value);
                }}
                decimalPlaces={priceInputDecimals}
                qa="trigger-input"
              >
                USD
              </BuyInputSection>
            )}

            <ExchangeInfo
              className="overflow-x-hidden"
              dividerClassName="my-15 -mx-15 h-1 bg-slate-700"
            >
              <ExchangeInfo.Group>
                {isTrigger && triggerPriceRow}
                {limitPriceRow}
                {liqPriceRow}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <PositionSellerAdvancedRows />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <TradeFeesRow {...fees} feesType="decrease" />
                <GtRewardsRow {...fees} />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>{receiveTokenRow}</ExchangeInfo.Group>

              {priceImpactWarningState.shouldShowWarning && (
                <ExchangeInfo.Group>
                  <div className="mb-2 w-full overflow-hidden">
                    <HighPriceImpactWarning
                      priceImpactWarningState={priceImpactWarningState}
                    />
                  </div>
                </ExchangeInfo.Group>
              )}
            </ExchangeInfo>

            <div className="competition">
              <div className="App-card-divider"></div>
              <div>
                <SelectCompetition onCompetitionSelect={onCompetitionSelect} />
              </div>
            </div>

            <div className="Exchange-swap-button-container">
              <Button
                className="w-full"
                variant="primary-action"
                disabled={Boolean(error)}
                onClick={handleSubmit}
                buttonRef={submitButtonRef}
                qa="confirm-button"
              >
                {error ||
                  (isTrigger
                    ? t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`
                    : t`Close`)}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
