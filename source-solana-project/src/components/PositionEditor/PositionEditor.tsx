import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import Modal from '@/components/Common/Modal/Modal';
import { PositionEditorSubmitButton } from '@/components/PositionEditor/components/PositionEditorSubmitButton';
import { useHandleSubmitOrder } from '@/components/PositionEditor/hooks/useHandleSubmitOrder';
import { usePositionEditorData } from '@/components/PositionEditor/hooks/usePositionEditorData';
import { usePositionEditorFees } from '@/components/PositionEditor/hooks/usePositionEditorFees';
import { PositionEditorAdvancedRows } from '@/components/PositionEditor/PositionEditorAdvancedRows';
import { Operation } from '@/selectors/positionEditor/types';
import Tab from '@/components/Common/Tab/Tab';
import { TradeFeesRow } from '@/components/TradeBox/TradeBoxRows/TradeFeesRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { BN_100, BN_ZERO } from '@/config/constants';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import {
  selectPositionEditorCollateralInputValue,
  selectPositionEditorOperation,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSetCollateralInputValue,
  selectPositionEditorSetOperation,
  selectPositionEditorSetPositionAddress,
  selectPositionEditorSetSelectedCollateralAddress,
} from '@/selectors/positionEditor/baseSelectors';
import { selectPositionEditorCollateralDeltaAmount } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaAmount';
import { selectPositionEditorCollateralDeltaUsd } from '@/selectors/positionEditor/selectPositionEditorCollateralDeltaUsd';
import { selectPositionEditorCollateralToken } from '@/selectors/positionEditor/selectPositionEditorCollateralToken';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectPositionEditorMaxWithdrawAmount } from '@/selectors/positionEditor/selectPositionEditorMaxWithdrawAmount';
import { makeSelectMarketPriceDecimals } from '@/selectors/stats/makeSelectMarketPriceDecimals';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';
import {
  formatAmountFree,
  formatLiquidationPrice,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
} from '@/utils/legacy/format';
import { useLocalizedMap } from '@/utils/lib/i18n';
import { getMinResidualAmount } from '@/utils/token/getTokenMinResidualAmount';
import { getTradeFlagsForCollateralEdit } from '@/utils/tradebox/getTradeFlagsForCollateralEdit';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { msg, t, Trans } from '@lingui/macro';
import { useCallback, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { useKey, usePrevious } from 'react-use';

import { HighPriceImpactWarning } from '../HighPriceImpactWarning/HighPriceImpactWarning';
import { usePositionEditorError } from './hooks/usePositionEditorError';

const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Deposit`,
  [Operation.Withdraw]: msg`Withdraw`,
};

export function PositionEditor() {
  const operation = useAppStore(selectPositionEditorOperation);
  const setOperation = useAppStore(selectPositionEditorSetOperation);
  const isDeposit = operation === Operation.Deposit;
  const setPositionAddress = useAppStore(
    selectPositionEditorSetPositionAddress
  );
  const nativeToken = useAppStore(selectNativeToken);
  const position = useAppStore(selectPositionEditorEditingPosition);
  const collateralTokenRaw = useAppStore(selectPositionEditorCollateralToken);
  const collateralToken = collateralTokenRaw?.isWrappedNative
    ? nativeToken
    : collateralTokenRaw;
  const collateralInputValue = useAppStore(
    selectPositionEditorCollateralInputValue
  );
  const setCollateralInputValue = useAppStore(
    selectPositionEditorSetCollateralInputValue
  );
  const collateralDeltaAmount = useAppStore(
    selectPositionEditorCollateralDeltaAmount
  );
  const collateralDeltaUsd = useAppStore(
    selectPositionEditorCollateralDeltaUsd
  );
  const maxWithdrawAmount = useAppStore(selectPositionEditorMaxWithdrawAmount);
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const selectedCollateralAddress = useAppStore(
    selectPositionEditorSelectedCollateralAddress
  );
  const setSelectedCollateralAddress = useAppStore(
    selectPositionEditorSetSelectedCollateralAddress
  );
  const marketDecimals = useAppStore(
    makeSelectMarketPriceDecimals(position?.indexToken.address.toBase58())
  );

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const availableSwapTokens = useMemo(() => {
    return collateralToken?.isWrappedNative ? [nativeToken] : undefined;
  }, [collateralToken, nativeToken]);

  const onClose = useCallback(() => {
    setPositionAddress(undefined);
  }, [setPositionAddress]);

  const [onSubmit, isSending] = useHandleSubmitOrder(onClose, isDeposit);

  const { fees } = usePositionEditorFees({
    selectedCollateralAddress,
    collateralInputValue: collateralInputValue ?? '',
    operation,
  });

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    tradeFlags: getTradeFlagsForCollateralEdit(position?.isLong, isDeposit),
  });

  const { nextLiqPrice, receiveUsd, receiveAmount } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue: collateralInputValue ?? '',
    operation,
  });

  const [error] = usePositionEditorError({
    isSending,
    priceImpactWarningState,
  });

  useKey(
    'Enter',
    () => {
      if (isVisible && !error) {
        submitButtonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        onSubmit();
      }
    },
    {},
    [isVisible, error]
  );

  useEffect(
    function initCollateral() {
      if (!position) {
        return;
      }

      if (
        !selectedCollateralAddress ||
        !availableSwapTokens?.find(
          (token) => token?.address.toBase58() === selectedCollateralAddress
        )
      ) {
        setSelectedCollateralAddress(
          position.collateralTokenAddress.toBase58()
        );
      }
    },
    [
      availableSwapTokens,
      position,
      selectedCollateralAddress,
      setSelectedCollateralAddress,
    ]
  );

  useEffect(
    function resetForm() {
      if (isVisible !== prevIsVisible) {
        setCollateralInputValue('');
      }
    },
    [isVisible, prevIsVisible, setCollateralInputValue]
  );

  const showMaxOnDeposit = collateralToken?.isNative
    ? minResidualAmount !== undefined &&
      collateralToken?.balance?.gt(minResidualAmount)
    : true;

  const button = <PositionEditorSubmitButton onClose={onClose} />;

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={!!position}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`}{' '}
            {position?.indexToken?.symbol}
          </Trans>
        }
        qa="position-edit-modal"
      >
        {position && (
          <>
            <Tab
              onChange={setOperation}
              option={operation}
              options={Object.values(Operation)}
              optionLabels={localizedOperationLabels}
              className="mb-10"
              qa="operation-tabs"
            />
            <BuyInputSection
              topLeftLabel={localizedOperationLabels[operation]}
              topLeftValue={formatUsd(collateralDeltaUsd)}
              topRightLabel={t`Max`}
              topRightValue={
                isDeposit
                  ? formatTokenAmount(
                      collateralToken?.balance,
                      collateralToken?.decimals,
                      '',
                      {
                        useCommas: true,
                      }
                    )
                  : formatTokenAmount(
                      maxWithdrawAmount,
                      position?.collateralToken?.decimals,
                      '',
                      {
                        useCommas: true,
                      }
                    )
              }
              inputValue={collateralInputValue}
              onInputValueChange={(e) =>
                setCollateralInputValue(e.target.value)
              }
              showMaxButton={
                (isDeposit
                  ? collateralToken?.balance &&
                    showMaxOnDeposit &&
                    (collateralDeltaAmount === undefined ||
                      !collateralDeltaAmount.eq(collateralToken?.balance) ||
                      collateralDeltaAmount === undefined)
                  : maxWithdrawAmount !== undefined &&
                    (collateralDeltaAmount === undefined
                      ? true
                      : !collateralDeltaAmount.eq(maxWithdrawAmount))) || false
              }
              showPercentSelector={!isDeposit}
              onPercentChange={(percent) => {
                if (!isDeposit) {
                  setCollateralInputValue(
                    formatAmountFree(
                      maxWithdrawAmount
                        ?.mul(new BN(percent ?? BN_ZERO))
                        .div(BN_100) ?? BN_ZERO,
                      position?.collateralToken?.decimals || 0
                    )
                  );
                }
              }}
              onClickMax={() => {
                let maxDepositAmount = collateralToken?.isNative
                  ? collateralToken?.balance?.sub(minResidualAmount ?? BN_ZERO)
                  : collateralToken?.balance;

                if (maxDepositAmount?.lt(BN_ZERO)) {
                  maxDepositAmount = BN_ZERO;
                }

                const formattedMaxDepositAmount = formatAmountFree(
                  maxDepositAmount ?? BN_ZERO,
                  collateralToken?.decimals ?? 0
                );
                const finalDepositAmount = formattedMaxDepositAmount;

                if (isDeposit) {
                  setCollateralInputValue(finalDepositAmount);
                } else {
                  setCollateralInputValue(
                    formatAmountFree(
                      maxWithdrawAmount ?? BN_ZERO,
                      position?.collateralToken?.decimals || 0
                    )
                  );
                }
              }}
              data-qa="amount-input"
            >
              {collateralToken?.symbol}
            </BuyInputSection>

            <ExchangeInfo
              className="PositionEditor-info-box"
              dividerClassName="my-15 -mx-15 h-1 bg-slate-700"
            >
              <ExchangeInfo.Group>
                <ExchangeInfoRow
                  label={t`Liquidation Price`}
                  value={
                    <ValueTransition
                      from={formatLiquidationPrice(position.liquidationPrice, {
                        displayDecimals: marketDecimals,
                      })}
                      to={
                        collateralDeltaAmount !== undefined &&
                        collateralDeltaAmount.gt(BN_ZERO)
                          ? formatLiquidationPrice(nextLiqPrice, {
                              displayDecimals: marketDecimals,
                            })
                          : undefined
                      }
                    />
                  }
                />
              </ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <PositionEditorAdvancedRows
                  operation={operation}
                  selectedCollateralAddress={selectedCollateralAddress}
                  collateralInputValue={collateralInputValue ?? ''}
                />
              </ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <TradeFeesRow
                  {...fees}
                  feesType="edit"
                  shouldShowRebate={false}
                />
                {/* <NetworkFeeRow executionFee={executionFee} /> */}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {!isDeposit && (
                  <ExchangeInfoRow
                    label={t`Receive`}
                    value={formatTokenAmountWithUsd(
                      receiveAmount,
                      receiveUsd,
                      collateralToken?.symbol,
                      collateralToken?.decimals,
                      { fallbackToZero: true }
                    )}
                  />
                )}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <HighPriceImpactWarning
                  priceImpactWarningState={priceImpactWarningState}
                />
              </ExchangeInfo.Group>
            </ExchangeInfo>

            <div className="Exchange-swap-button-container Confirmation-box-row">
              {button}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
