import { t, Trans } from "@lingui/macro";
import pickBy from "lodash/pickBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKey } from "react-use";
import { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import { isSettlementChain } from "config/multichain";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorAtPriceOpenRequest,
  usePositionEditorCollateralInputValue,
  usePositionEditorDepositMode,
  usePositionEditorIsCollateralTokenFromGmxAccount,
  usePositionEditorPosition,
  usePositionEditorPositionState,
  usePositionEditorReplacingOrder,
  usePositionEditorSelectedCollateralAddress,
  usePositionEditorTriggerPrice,
  usePositionEditorTriggerPriceInputValue,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorSelectedCollateralToken,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { toastEnableExpress } from "domain/multichain/toastEnableExpress";
import { formatLiquidationPrice, getIsPositionInfoLoaded } from "domain/synthetics/positions";
import { getBalanceByBalanceType, TokenBalanceType } from "domain/synthetics/tokens";
import { getMarkPrice, getMaxWithdrawAmount, getTradeFlagsForCollateralEdit } from "domain/synthetics/trade";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getConditionalDepositWarning } from "domain/synthetics/trade/utils/validation";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import {
  formatAmountFree,
  formatBalanceAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  formatUsdPrice,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import {
  convertTokenAddress,
  getTokenVisualMultiplier,
  getWrappedToken,
  NATIVE_TOKEN_ADDRESS,
} from "sdk/configs/tokens";
import { getMaxNegativeImpactBps } from "sdk/utils/fees/priceImpact";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ValidationBannerErrorContent } from "components/Errors/gasErrors";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { MarginPercentageSlider } from "components/TradeboxMarginFields/MarginPercentageSlider";
import { TradeInputBox } from "components/TradeboxMarginFields/TradeInputBox";
import { TradeInputField } from "components/TradeboxMarginFields/TradeInputField";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import { PositionEditorCollateralSelector } from "../CollateralSelector/PositionEditorCollateralSelector";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { ExpressTradingWarningCard } from "../TradeBox/ExpressTradingWarningCard";
import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { formatMarginDepositPriceInput, getMarginDepositPrefill } from "./marginDepositPrefill";
import { PositionEditorAdvancedRows } from "./PositionEditorAdvancedRows";
import { DEPOSIT_MODE_LABELS, DEPOSIT_MODES, Operation, OPERATION_LABELS } from "./types";
import { usePositionEditorButtonState } from "./usePositionEditorButtonState";

import "./PositionEditor.scss";

export function PositionEditor() {
  const { chainId, srcChainId } = useChainId();
  const { expressOrdersEnabled, setExpressOrdersEnabled, setIsSettingsVisible } = useSettings();
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const tokensData = useTokensData();
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const localizedDepositModeLabels = useLocalizedMap(DEPOSIT_MODE_LABELS);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const [depositMode, setDepositMode] = usePositionEditorDepositMode();
  const [triggerPriceInputValue, setTriggerPriceInputValue] = usePositionEditorTriggerPriceInputValue();
  const triggerPrice = usePositionEditorTriggerPrice();
  const [atPriceOpenRequest, clearAtPriceOpenRequest] = usePositionEditorAtPriceOpenRequest();
  const replacingOrder = usePositionEditorReplacingOrder();
  const isAtPriceDeposit = isDeposit && depositMode === "atPrice";

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
              balanceType: TokenBalanceType.Wallet,
            },
          ];
        }

        return [
          {
            ...tokenData,
            isGmxAccount: true,
            balance: tokenData.gmxAccountBalance,
            balanceType: TokenBalanceType.GmxAccount,
          },
          {
            ...tokenData,
            isGmxAccount: false,
            balance: tokenData.walletBalance,
            balanceType: TokenBalanceType.Wallet,
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

  const markPrice = useMemo(() => {
    if (!position) {
      return undefined;
    }

    return getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: true });
  }, [position]);

  const maxWithdrawAmount = useMemo(() => {
    if (!getIsPositionInfoLoaded(position)) return 0n;

    return getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice,
      collateralDecimals: collateralToken?.decimals,
      userReferralInfo,
    });
  }, [collateralPrice, collateralToken?.decimals, minCollateralUsd, position, userReferralInfo]);

  const { fees, executionFee } = usePositionEditorFees({
    operation,
  });

  const submitButtonState = usePositionEditorButtonState(operation);
  const gasPaymentToken = submitButtonState.expressParams?.gasPaymentParams.gasPaymentToken;

  // express params cannot resolve until the order params are complete (e.g. no trigger price yet),
  // so fall back to the native-token estimate to keep the max amount and the slider available
  const expressGasPaymentParams = submitButtonState.expressParams?.gasPaymentParams;
  const gasPaymentTokenForMax =
    expressOrdersEnabled && !collateralToken?.isNative && expressGasPaymentParams !== undefined
      ? expressGasPaymentParams.gasPaymentToken
      : nativeToken;
  const gasPaymentTokenAmountForMax =
    expressOrdersEnabled && !collateralToken?.isNative && expressGasPaymentParams !== undefined
      ? expressGasPaymentParams.gasPaymentTokenAmount
      : executionFee?.feeTokenAmount;

  const expressEnabledForMax = expressOrdersEnabled && !collateralToken?.isNative;
  const isMaxAmountLoading = expressEnabledForMax && submitButtonState.isExpressLoading;

  const depositBalanceType = isCollateralTokenFromGmxAccount ? TokenBalanceType.GmxAccount : TokenBalanceType.Wallet;
  const collateralTokenBalance = getBalanceByBalanceType(collateralToken, depositBalanceType);
  const gasPaymentTokenBalanceForMax = getBalanceByBalanceType(gasPaymentTokenForMax, depositBalanceType);

  const depositMaxDetails = useMaxAvailableAmount({
    fromToken: collateralToken,
    fromTokenBalance: collateralTokenBalance,
    fromTokenAmount: collateralDeltaAmount,
    fromTokenInputValue: collateralInputValue,
    isLoading: isMaxAmountLoading,
    gasPaymentToken: isDeposit ? gasPaymentTokenForMax : undefined,
    gasPaymentTokenBalance: isDeposit ? gasPaymentTokenBalanceForMax : undefined,
    gasPaymentTokenAmount: isDeposit ? gasPaymentTokenAmountForMax : undefined,
    isGmxAccount: isCollateralTokenFromGmxAccount,
  });

  const maxAvailableAmount = isDeposit ? depositMaxDetails.maxAvailableAmount : maxWithdrawAmount;
  const lowGasPaymentTokenWarningContent = isDeposit ? depositMaxDetails.gasPaymentTokenWarningContent : undefined;

  const collateralPercentage = useMemo(() => {
    if (collateralDeltaAmount === undefined || collateralDeltaAmount === 0n) return 0;
    if (maxAvailableAmount === undefined || maxAvailableAmount === 0n) return 0;

    const percentage = Number((collateralDeltaAmount * 100n) / maxAvailableAmount);
    return Math.min(100, Math.max(0, percentage));
  }, [collateralDeltaAmount, maxAvailableAmount]);

  const handleCollateralPercentageChange = useCallback(
    (percentage: number) => {
      if (maxAvailableAmount === undefined || maxAvailableAmount === 0n) return;

      const decimals = isDeposit ? collateralToken?.decimals : position?.collateralToken?.decimals;
      setCollateralInputValue(formatAmountFree((maxAvailableAmount * BigInt(percentage)) / 100n, decimals || 0));
    },
    [
      maxAvailableAmount,
      isDeposit,
      collateralToken?.decimals,
      position?.collateralToken?.decimals,
      setCollateralInputValue,
    ]
  );

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralNetPriceImpact: fees?.collateralNetPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    tradeFlags: getTradeFlagsForCollateralEdit(position?.isLong, isDeposit),
    payUsd: collateralDeltaUsd,
  });

  const { nextLiqPrice, receiveUsd, receiveAmount } = usePositionEditorData({
    operation,
  });

  const conditionalDepositWarning = isAtPriceDeposit
    ? getConditionalDepositWarning({
        isLong: Boolean(position?.isLong),
        triggerPrice,
        currentLiqPrice: position?.liquidationPrice,
        nextLiqPrice,
      })
    : undefined;

  const hasNextValues =
    collateralDeltaAmount !== undefined &&
    collateralDeltaAmount > 0n &&
    (!isAtPriceDeposit || triggerPrice !== undefined);

  useKey(
    "Enter",
    () => {
      if (isVisible && !submitButtonState.disabled) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        submitButtonState.onSubmit();
      }
    },
    {},
    [isVisible, submitButtonState.disabled]
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
    function resetFormAndApplyOpenRequest() {
      // an "At price" request always starts from a clean amount, then applies its own prefill below
      if (isVisible !== prevIsVisible || atPriceOpenRequest) {
        setCollateralInputValue("");
      }

      if (!atPriceOpenRequest) {
        return;
      }

      const prefill = getMarginDepositPrefill({
        request: atPriceOpenRequest,
        order: replacingOrder,
        collateralTokenDecimals: position?.collateralToken?.decimals,
        visualMultiplier: position?.indexToken?.visualMultiplier,
      });

      // the replaced order is not loaded yet, keep the request pending
      if (!prefill) {
        return;
      }

      setOperation(Operation.Deposit);

      if (prefill.collateralInputValue !== undefined) {
        setCollateralInputValue(prefill.collateralInputValue);
      }

      if (prefill.triggerPriceInputValue !== undefined) {
        setTriggerPriceInputValue(prefill.triggerPriceInputValue);
      }

      clearAtPriceOpenRequest();
    },
    [
      atPriceOpenRequest,
      clearAtPriceOpenRequest,
      isVisible,
      position?.collateralToken?.decimals,
      position?.indexToken?.visualMultiplier,
      prevIsVisible,
      replacingOrder,
      setCollateralInputValue,
      setTriggerPriceInputValue,
    ]
  );

  const buttonContent = (
    <Button
      className="w-full gap-4"
      variant="primary-action"
      onClick={submitButtonState.onSubmit}
      disabled={submitButtonState.disabled}
      buttonRef={submitButtonRef}
      qa="confirm-button"
    >
      {submitButtonState.text}
      {submitButtonState.tooltipContent && <InfoIcon className="size-20" />}
    </Button>
  );

  const button = submitButtonState.tooltipContent ? (
    <TooltipWithPortal
      className="w-full"
      content={submitButtonState.tooltipContent}
      isHandlerDisabled
      handle={buttonContent}
      handleClassName="w-full"
      position="top"
      variant="none"
    />
  ) : (
    buttonContent
  );

  const tabsOptions = useMemo(() => {
    return Object.values(Operation).map((option) => ({
      value: option,
      label: localizedOperationLabels[option],
    }));
  }, [localizedOperationLabels]);

  const depositModeTabsOptions = useMemo(() => {
    return DEPOSIT_MODES.map((mode) => ({
      value: mode,
      label: localizedDepositModeLabels[mode],
    }));
  }, [localizedDepositModeLabels]);

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={!!position}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit margin: {position?.isLong ? t`Long` : t`Short`}{" "}
            {position?.indexToken && getTokenVisualMultiplier(position.indexToken)}
            {position?.indexToken?.symbol}/USD
          </Trans>
        }
        qa="position-edit-modal"
        contentPadding={false}
      >
        {position && (
          <div className="flex flex-col gap-12 px-20 py-16">
            <Tabs
              onChange={setOperation}
              selectedValue={operation}
              options={tabsOptions}
              type="inline"
              className="PositionEditor-tabs"
              qa="operation-tabs"
            />
            {isDeposit && (
              <Tabs
                onChange={setDepositMode}
                selectedValue={depositMode}
                options={depositModeTabsOptions}
                type="pill"
                qa="deposit-mode-tabs"
              />
            )}
            {isAtPriceDeposit && (
              <TradeInputField
                qa="trigger-price-input"
                label={t`Trigger price`}
                alternateValue={null}
                displayMode="usd"
                showDisplayModeToggle={false}
                unitLabel="USD"
                rightHeadline={
                  <button
                    type="button"
                    className="whitespace-nowrap text-typography-secondary hover:text-typography-primary"
                    onClick={() =>
                      setTriggerPriceInputValue(
                        formatMarginDepositPriceInput(markPrice, position.indexToken?.visualMultiplier)
                      )
                    }
                  >
                    {t`Mark:`}{" "}
                    <span className="numbers">
                      {formatUsdPrice(markPrice, { visualMultiplier: position.indexToken?.visualMultiplier })}
                    </span>
                  </button>
                }
                inputValue={triggerPriceInputValue}
                onInputValueChange={(e) => setTriggerPriceInputValue(e.target.value)}
                maxDecimals={USD_DECIMALS}
              />
            )}
            <TradeInputBox
              qa="amount-input"
              leftHeadline={localizedOperationLabels[operation]}
              leftContent={
                <>
                  <NumberInput
                    value={collateralInputValue}
                    className="text-body-large min-w-0 shrink overflow-hidden text-ellipsis p-0 outline-none"
                    onValueChange={(e) => setCollateralInputValue(e.target.value)}
                    placeholder="0.00"
                    qa="amount-input-input"
                    maxDecimals={collateralToken?.decimals ?? position?.collateralToken?.decimals ?? 0}
                  />
                  {collateralDeltaUsd !== undefined && collateralDeltaUsd > 0n && !collateralToken?.isStable && (
                    <span className="shrink-0 text-12 text-typography-secondary numbers">
                      ≈{formatUsd(collateralDeltaUsd)}
                    </span>
                  )}
                </>
              }
              rightHeadline={
                isDeposit ? (
                  <button
                    type="button"
                    className="flex items-center gap-4 text-typography-secondary hover:text-typography-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollateralPercentageChange(100);
                    }}
                  >
                    <WalletIcon className="size-14" />
                    <span className="numbers">
                      {formatBalanceAmount(collateralTokenBalance ?? 0n, collateralToken?.decimals ?? 0, undefined, {
                        isStable: collateralToken?.isStable,
                      })}
                    </span>
                  </button>
                ) : (
                  <span className="flex items-center gap-4 text-typography-secondary">
                    {t`Max:`}{" "}
                    <span className="numbers">
                      {formatBalanceAmount(
                        maxWithdrawAmount ?? 0n,
                        position?.collateralToken?.decimals ?? 0,
                        undefined,
                        {
                          isStable: position?.collateralToken?.isStable,
                        }
                      )}
                    </span>
                  </span>
                )
              }
              rightContent={
                <div data-token-selector>
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
                    <span className="text-14">{collateralToken?.symbol}</span>
                  )}
                </div>
              }
            />
            {maxAvailableAmount !== undefined && maxAvailableAmount > 0n && (
              <MarginPercentageSlider value={collateralPercentage} onChange={handleCollateralPercentageChange} />
            )}
            <div className="flex flex-col gap-14">
              <HighPriceImpactOrFeesWarningCard
                priceImpactWarningState={priceImpactWarningState}
                swapPriceImpact={fees?.swapPriceImpact}
                swapProfitFee={fees?.swapProfitFee}
                executionFeeUsd={executionFee?.feeUsd}
                maxNegativeImpactBps={position.marketInfo ? getMaxNegativeImpactBps(position.marketInfo) : undefined}
              />

              {submitButtonState.bannerErrorName && (
                <AlertInfoCard type="error" hideClose>
                  <ValidationBannerErrorContent
                    validationBannerErrorName={submitButtonState.bannerErrorName}
                    chainId={chainId}
                    gasPaymentTokenAddress={gasPaymentToken?.address}
                    srcChainId={srcChainId}
                  />
                </AlertInfoCard>
              )}
              {submitButtonState.errorBannerContent && (
                <AlertInfoCard type="error" hideClose>
                  {submitButtonState.errorBannerContent}
                </AlertInfoCard>
              )}
              {isAtPriceDeposit &&
                !submitButtonState.bannerErrorName &&
                !submitButtonState.errorBannerContent &&
                (conditionalDepositWarning !== undefined ? (
                  <AlertInfoCard type="warning" hideClose>
                    {conditionalDepositWarning}
                  </AlertInfoCard>
                ) : (
                  <p className="text-12 text-typography-secondary">
                    <Trans>Adds margin without increasing your position size when the trigger price is reached.</Trans>
                  </p>
                ))}

              {!submitButtonState.bannerErrorName &&
                !submitButtonState.errorBannerContent &&
                lowGasPaymentTokenWarningContent && (
                  <AlertInfoCard type="warning" hideClose>
                    {lowGasPaymentTokenWarningContent}
                  </AlertInfoCard>
                )}

              <ExpressTradingWarningCard
                expressParams={submitButtonState.expressParams}
                payTokenAddress={undefined}
                isWrapOrUnwrap={false}
                isGmxAccount={isCollateralTokenFromGmxAccount}
                onAfterAction={onClose}
              />

              <div>{button}</div>

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
                label={t`Liquidation price`}
                value={
                  <ValueTransition
                    from={formatLiquidationPrice(position.liquidationPrice, {
                      displayDecimals: marketDecimals,
                      visualMultiplier: position.indexToken?.visualMultiplier,
                    })}
                    to={
                      hasNextValues
                        ? formatLiquidationPrice(nextLiqPrice, {
                            displayDecimals: marketDecimals,
                            visualMultiplier: position.indexToken?.visualMultiplier,
                          })
                        : undefined
                    }
                  />
                }
              />

              <PositionEditorAdvancedRows
                operation={operation}
                gasPaymentParams={submitButtonState.expressParams?.gasPaymentParams}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
