import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKey } from "react-use";
import { Address } from "viem";

import { usePositionsConstants, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorCollateralInputValue,
  usePositionEditorPosition,
  usePositionEditorPositionState,
  usePositionEditorSelectedCollateralAddress,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectPositionEditorCollateralInputAmountAndUsd } from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatLiquidationPrice, getIsPositionInfoLoaded } from "domain/synthetics/positions";
import { adaptToV1InfoTokens, convertToTokenAmount } from "domain/synthetics/tokens";
import { getMinCollateralUsdForLeverage, getTradeFlagsForCollateralEdit } from "domain/synthetics/trade";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { absDiffBps, formatAmountFree, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { NATIVE_TOKEN_ADDRESS, getToken, getTokenVisualMultiplier } from "sdk/configs/tokens";

import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { usePositionEditorButtonState } from "./usePositionEditorButtonState";

import { PositionEditorAdvancedRows } from "./PositionEditorAdvancedRows";
import { OPERATION_LABELS, Operation } from "./types";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

import "./PositionEditor.scss";

export function PositionEditor() {
  const { chainId } = useChainId();
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const tokensData = useTokensData();
  const { minCollateralUsd } = usePositionsConstants();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const infoTokens = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }
    return adaptToV1InfoTokens(tokensData);
  }, [tokensData]);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = usePositionEditorSelectedCollateralAddress();

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const availableSwapTokens = useMemo(() => {
    return position?.collateralToken.isWrapped
      ? [getToken(chainId, position.collateralTokenAddress), getToken(chainId, NATIVE_TOKEN_ADDRESS)]
      : undefined;
  }, [chainId, position?.collateralToken.isWrapped, position?.collateralTokenAddress]);

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

  const collateralPrice = collateralToken?.prices.minPrice;

  const [collateralInputValue, setCollateralInputValue] = usePositionEditorCollateralInputValue();
  const { collateralDeltaAmount, collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position?.market.indexTokenAddress));

  const maxWithdrawAmount = useMemo(() => {
    if (!getIsPositionInfoLoaded(position)) return 0n;

    const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position, 0n);
    let _minCollateralUsd = minCollateralUsdForLeverage;

    if (minCollateralUsd !== undefined && minCollateralUsd > _minCollateralUsd) {
      _minCollateralUsd = minCollateralUsd;
    }

    _minCollateralUsd =
      _minCollateralUsd + (position?.pendingBorrowingFeesUsd ?? 0n) + (position?.pendingFundingFeesUsd ?? 0n);

    if (position.collateralUsd < _minCollateralUsd) {
      return 0n;
    }

    const maxWithdrawUsd = position.collateralUsd - _minCollateralUsd;
    const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, collateralToken?.decimals, collateralPrice);

    return maxWithdrawAmount;
  }, [collateralPrice, collateralToken?.decimals, minCollateralUsd, position]);

  const { fees, executionFee } = usePositionEditorFees({
    operation,
  });

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    tradeFlags: getTradeFlagsForCollateralEdit(position?.isLong, isDeposit),
  });

  const { nextLiqPrice, receiveUsd, receiveAmount } = usePositionEditorData({
    operation,
  });

  const { text, tooltipContent, onSubmit, disabled } = usePositionEditorButtonState(operation);

  useKey(
    "Enter",
    () => {
      if (isVisible && !disabled) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onSubmit();
      }
    },
    {},
    [isVisible, disabled]
  );

  useEffect(
    function initCollateral() {
      if (!position) {
        return;
      }

      if (
        !selectedCollateralAddress ||
        !availableSwapTokens?.find((token) => token.address === selectedCollateralAddress)
      ) {
        setSelectedCollateralAddress(position.collateralTokenAddress as Address);
      }
    },
    [availableSwapTokens, position, selectedCollateralAddress, setSelectedCollateralAddress]
  );

  useEffect(
    function resetForm() {
      if (isVisible !== prevIsVisible) {
        setCollateralInputValue("");
      }
    },
    [isVisible, prevIsVisible, setCollateralInputValue]
  );

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={onSubmit}
      disabled={disabled}
      buttonRef={submitButtonRef}
      qa="confirm-button"
    >
      {text}
    </Button>
  );
  const button = tooltipContent ? (
    <TooltipWithPortal
      className="w-full"
      content={tooltipContent}
      isHandlerDisabled
      handle={buttonContent}
      handleClassName="w-full"
      position="top"
    />
  ) : (
    buttonContent
  );

  const maxDepositDetails = useMaxAvailableAmount({
    fromToken: collateralToken,
    nativeToken,
    fromTokenAmount: collateralDeltaAmount ?? 0n,
    fromTokenInputValue: collateralInputValue,
  });

  const showMaxButton = isDeposit
    ? maxDepositDetails.showClickMax
    : maxWithdrawAmount !== undefined &&
      (collateralDeltaAmount === undefined
        ? true
        : absDiffBps(collateralDeltaAmount, maxWithdrawAmount) > 50n); /* 0.5% */

  const handleMaxButtonClick = useCallback(() => {
    if (isDeposit) {
      setCollateralInputValue(maxDepositDetails.formattedMaxAvailableAmount);
    } else {
      setCollateralInputValue(formatAmountFree(maxWithdrawAmount!, position?.collateralToken?.decimals || 0));
    }
  }, [
    isDeposit,
    maxDepositDetails.formattedMaxAvailableAmount,
    position?.collateralToken?.decimals,
    setCollateralInputValue,
    maxWithdrawAmount,
  ]);

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={!!position}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`}{" "}
            {position?.indexToken && getTokenVisualMultiplier(position.indexToken)}
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
              type="inline"
              className="PositionEditor-tabs"
              size="l"
              qa="operation-tabs"
            />
            <BuyInputSection
              topLeftLabel={localizedOperationLabels[operation]}
              bottomLeftValue={formatUsd(collateralDeltaUsd)}
              topRightLabel={t`Max`}
              topRightValue={
                isDeposit
                  ? formatTokenAmount(collateralToken?.balance, collateralToken?.decimals, "", {
                      useCommas: true,
                    })
                  : formatTokenAmount(maxWithdrawAmount, position?.collateralToken?.decimals, "", {
                      useCommas: true,
                    })
              }
              inputValue={collateralInputValue}
              onInputValueChange={(e) => setCollateralInputValue(e.target.value)}
              showPercentSelector={!isDeposit}
              onPercentChange={(percent) => {
                if (!isDeposit) {
                  setCollateralInputValue(
                    formatAmountFree(
                      (maxWithdrawAmount! * BigInt(percent)) / 100n,
                      position?.collateralToken?.decimals || 0
                    )
                  );
                }
              }}
              onClickMax={showMaxButton ? handleMaxButtonClick : undefined}
              qa="amount-input"
            >
              {availableSwapTokens ? (
                <TokenSelector
                  label={localizedOperationLabels[operation]}
                  chainId={chainId}
                  tokenAddress={selectedCollateralAddress!}
                  onSelectToken={(token) => setSelectedCollateralAddress(token.address as Address)}
                  tokens={availableSwapTokens}
                  infoTokens={infoTokens}
                  className="Edit-collateral-token-selector"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                  showBalances={false}
                />
              ) : (
                collateralToken?.symbol
              )}
            </BuyInputSection>
            <div className="flex flex-col gap-14 pt-14">
              <HighPriceImpactOrFeesWarningCard
                priceImpactWarningState={priceImpactWarningState}
                collateralImpact={fees?.positionCollateralPriceImpact}
                positionImpact={fees?.positionPriceImpact}
                swapPriceImpact={fees?.swapPriceImpact}
                swapProfitFee={fees?.swapProfitFee}
                executionFeeUsd={executionFee?.feeUsd}
              />

              <div className="">{button}</div>

              {!isDeposit && (
                <SyntheticsInfoRow
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

              <SyntheticsInfoRow
                label={t`Liq. Price`}
                value={
                  <ValueTransition
                    from={formatLiquidationPrice(position.liquidationPrice, {
                      displayDecimals: marketDecimals,
                      visualMultiplier: position.indexToken?.visualMultiplier,
                    })}
                    to={
                      collateralDeltaAmount !== undefined && collateralDeltaAmount > 0
                        ? formatLiquidationPrice(nextLiqPrice, {
                            displayDecimals: marketDecimals,
                            visualMultiplier: position.indexToken?.visualMultiplier,
                          })
                        : undefined
                    }
                  />
                }
              />

              <PositionEditorAdvancedRows operation={operation} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
