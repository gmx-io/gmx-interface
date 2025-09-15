import { Trans, t } from "@lingui/macro";
import pickBy from "lodash/pickBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKey } from "react-use";
import { Address } from "viem";

import { isSettlementChain } from "config/multichain";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorCollateralInputValue,
  usePositionEditorIsCollateralTokenFromGmxAccount,
  usePositionEditorPosition,
  usePositionEditorPositionState,
  usePositionEditorSelectedCollateralAddress,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorSelectedCollateralToken,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { toastEnableExpress } from "domain/multichain/toastEnableExpress";
import { getMinResidualGasPaymentTokenAmount } from "domain/synthetics/express/expressOrderUtils";
import { formatLiquidationPrice, getIsPositionInfoLoaded } from "domain/synthetics/positions";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { getMinCollateralUsdForLeverage, getTradeFlagsForCollateralEdit } from "domain/synthetics/trade";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { absDiffBps, formatAmountFree, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import {
  NATIVE_TOKEN_ADDRESS,
  convertTokenAddress,
  getTokenVisualMultiplier,
  getWrappedToken,
} from "sdk/configs/tokens";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { PositionEditorCollateralSelector } from "../CollateralSelector/PositionEditorCollateralSelector";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { ExpressTradingWarningCard } from "../TradeBox/ExpressTradingWarningCard";
import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { PositionEditorAdvancedRows } from "./PositionEditorAdvancedRows";
import { OPERATION_LABELS, Operation } from "./types";
import { usePositionEditorButtonState } from "./usePositionEditorButtonState";

import "./PositionEditor.scss";

export function PositionEditor() {
  const { chainId, srcChainId } = useChainId();
  const { expressOrdersEnabled, setExpressOrdersEnabled, setIsSettingsVisible } = useSettings();
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const tokensData = useTokensData();
  const { minCollateralUsd } = usePositionsConstants();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = usePositionEditorSelectedCollateralAddress();
  const [isCollateralTokenFromGmxAccount, setIsCollateralTokenFromGmxAccount] =
    usePositionEditorIsCollateralTokenFromGmxAccount();

  const handleSetCollateralAddress = useCallback(
    (tokenAddress: string, isGmxAccount?: boolean) => {
      if (isGmxAccount && !expressOrdersEnabled) {
        setExpressOrdersEnabled(true);
        toastEnableExpress(() => setIsSettingsVisible(true));
      }

      setSelectedCollateralAddress(tokenAddress as Address);
      if (isGmxAccount !== undefined) {
        setIsCollateralTokenFromGmxAccount(isGmxAccount);
      }
    },
    [
      expressOrdersEnabled,
      setSelectedCollateralAddress,
      setExpressOrdersEnabled,
      setIsSettingsVisible,
      setIsCollateralTokenFromGmxAccount,
    ]
  );

  const collateralToken = useSelector(selectPositionEditorSelectedCollateralToken);

  const filteredTokensData = useMemo(() => {
    return pickBy(
      tokensData,
      (token) =>
        token.address === selectedCollateralAddress ||
        token.wrappedAddress === selectedCollateralAddress ||
        convertTokenAddress(chainId, token.address, "native") === selectedCollateralAddress
    );
  }, [chainId, selectedCollateralAddress, tokensData]);

  const options = useMemo(() => {
    return Object.values(filteredTokensData)
      .flatMap((tokenData) => {
        if (tokenData.isNative) {
          return [
            {
              ...tokenData,
              isGmxAccount: false,
              balance: tokenData.walletBalance,
            },
          ];
        }

        return [
          {
            ...tokenData,
            isGmxAccount: true,
            balance: tokenData.gmxAccountBalance,
          },
          {
            ...tokenData,
            isGmxAccount: false,
            balance: tokenData.balance,
          },
        ];
      })
      .sort((a, b) => {
        if (a.balance !== undefined && b.balance === undefined) {
          return -1;
        }

        if (a.balance === undefined && b.balance !== undefined) {
          return 1;
        }

        if (a.balance !== undefined && b.balance !== undefined) {
          return b.balance - a.balance > 0n ? 1 : -1;
        }

        return 0;
      });
  }, [filteredTokensData]);

  const hasMultipleTokens = useMemo(() => {
    if (srcChainId === undefined) {
      if (selectedCollateralAddress === getWrappedToken(chainId)?.address) {
        return true;
      }

      return isSettlementChain(chainId);
    }

    return false;
  }, [chainId, selectedCollateralAddress, srcChainId]);

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
    collateralNetPriceImpact: fees?.collateralNetPriceImpact,
    positionNetPriceImpact: fees?.positionNetPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    tradeFlags: getTradeFlagsForCollateralEdit(position?.isLong, isDeposit),
    payUsd: collateralDeltaUsd,
  });

  const { nextLiqPrice, receiveUsd, receiveAmount } = usePositionEditorData({
    operation,
  });

  const { text, tooltipContent, onSubmit, disabled, expressParams, isExpressLoading } =
    usePositionEditorButtonState(operation);

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

      if (!selectedCollateralAddress || !filteredTokensData[selectedCollateralAddress]) {
        handleSetCollateralAddress(position.collateralTokenAddress as Address);
      }
    },
    [filteredTokensData, handleSetCollateralAddress, position, selectedCollateralAddress, setSelectedCollateralAddress]
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
    minResidualAmount: getMinResidualGasPaymentTokenAmount({
      expressParams,
      payTokenAddress: collateralToken?.address,
    }),
    isLoading: isExpressLoading,
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

  const tabsOptions = useMemo(() => {
    return Object.values(Operation).map((option) => ({
      value: option,
      label: localizedOperationLabels[option],
    }));
  }, [localizedOperationLabels]);

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
          <div className="flex flex-col gap-12">
            <Tabs
              onChange={setOperation}
              selectedValue={operation}
              options={tabsOptions}
              type="inline"
              className="PositionEditor-tabs"
              size="l"
              qa="operation-tabs"
            />
            <BuyInputSection
              topLeftLabel={localizedOperationLabels[operation]}
              bottomLeftValue={formatUsd(collateralDeltaUsd)}
              bottomRightLabel={t`Max`}
              bottomRightValue={
                isDeposit
                  ? formatTokenAmount(collateralToken?.balance, collateralToken?.decimals, "", {
                      useCommas: true,
                      isStable: collateralToken?.isStable,
                    })
                  : formatTokenAmount(maxWithdrawAmount, position?.collateralToken?.decimals, "", {
                      useCommas: true,
                      isStable: position?.collateralToken?.isStable,
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
              {hasMultipleTokens ? (
                <PositionEditorCollateralSelector
                  chainId={chainId}
                  selectedTokenSymbol={collateralToken?.symbol}
                  isCollateralTokenFromGmxAccount={isCollateralTokenFromGmxAccount}
                  options={options}
                  onSelect={handleSetCollateralAddress}
                  variant={isDeposit ? "balance" : "destination"}
                />
              ) : (
                collateralToken?.symbol
              )}
            </BuyInputSection>
            <div className="flex flex-col gap-14">
              <HighPriceImpactOrFeesWarningCard
                priceImpactWarningState={priceImpactWarningState}
                collateralImpact={fees?.collateralNetPriceImpact}
                swapPriceImpact={fees?.swapPriceImpact}
                swapProfitFee={fees?.swapProfitFee}
                executionFeeUsd={executionFee?.feeUsd}
              />

              <div>{button}</div>

              <ExpressTradingWarningCard
                expressParams={expressParams}
                payTokenAddress={undefined}
                isWrapOrUnwrap={false}
                isGmxAccount={isCollateralTokenFromGmxAccount}
              />

              {!isDeposit && (
                <SyntheticsInfoRow
                  label={t`Receive`}
                  value={formatTokenAmountWithUsd(
                    receiveAmount,
                    receiveUsd,
                    collateralToken?.symbol,
                    collateralToken?.decimals,
                    { fallbackToZero: true, isStable: collateralToken?.isStable }
                  )}
                />
              )}

              <SyntheticsInfoRow
                label={t`Liquidation Price`}
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

              <PositionEditorAdvancedRows operation={operation} gasPaymentParams={expressParams?.gasPaymentParams} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
