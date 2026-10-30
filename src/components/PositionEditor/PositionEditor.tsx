import { t, Trans } from "@lingui/macro";
import pickBy from "lodash/pickBy";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useHistory } from "react-router-dom";
import { useKey } from "react-use";
import { Address } from "viem";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getNetworkFeatures } from "config/features";
import { isSettlementChain } from "config/multichain";
import { getUsdgConversionTokenAddress } from "config/usdgPools";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorAtPriceOpenRequest,
  usePositionEditorCollateralInputValue,
  usePositionEditorDepositMode,
  usePositionEditorIsCollateralTokenFromGmxAccount,
  usePositionEditorOperation,
  usePositionEditorPosition,
  usePositionEditorPositionState,
  usePositionEditorReplacingOrder,
  usePositionEditorSelectedCollateralAddress,
  usePositionEditorTriggerPrice,
  usePositionEditorTriggerPriceInputValue,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectGmxAccountGasPaymentToken,
  selectSettlementChainGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorDepositConversionTokenAddress,
  selectPositionEditorDepositMaxInstantAmount,
  selectPositionEditorDepositRestInstantAmountOut,
  selectPositionEditorIsDepositSwapUnfillable,
  selectPositionEditorMaxWithdrawAmount,
  selectPositionEditorOpenDepositNow,
  selectPositionEditorSelectedCollateralToken,
  selectPositionEditorSetAddMarginReturnPositionKey,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTradeboxSetIsFromTokenGmxAccount } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { toastEnableExpress } from "domain/multichain/toastEnableExpress";
import { getNetworkFeeGasPaymentParams } from "domain/synthetics/express/validateMultichainExpressSubmit";
import { getNetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { useIsSwapTabPaxosOffered } from "domain/synthetics/paxosTransit/useIsSwapTabPaxosOffered";
import { formatLiquidationPriceParts } from "domain/synthetics/positions";
import {
  convertToTokenAmount,
  convertToUsd,
  getBalanceByBalanceType,
  getMidPrice,
  TokenBalanceType,
  type TokenData,
} from "domain/synthetics/tokens";
import { getMarkPrice, getTradeFlagsForCollateralEdit } from "domain/synthetics/trade";
import { Operation } from "domain/synthetics/trade/usePositionEditorState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getConditionalDepositWarning } from "domain/synthetics/trade/utils/validation";
import {
  formatMaxInstantAmount,
  getIsCloseToLiquidation,
  getShouldDefaultToUsdc,
} from "domain/synthetics/usdgPools/usdcConversion";
import { DEFAULT_MAX_ACTIONS_STATE, MaxActionsState, useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatAmountFree, formatBalanceAmount, formatTokenAmountWithUsdParts } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import {
  convertTokenAddress,
  getTokenVisualMultiplier,
  getWrappedToken,
  NATIVE_TOKEN_ADDRESS,
} from "sdk/configs/tokens";
import { getMaxNegativeImpactBps } from "sdk/utils/fees/priceImpact";

import { useActiveForm } from "components/ActiveFormScope/ActiveFormScope";
import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import { ValidationBannerErrorContent } from "components/Errors/gasErrors";
import { MaxActions } from "components/MaxActions/MaxActions";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdPriceValue } from "components/NumericValue/UsdPriceValue";
import { UsdValue } from "components/NumericValue/UsdValue";
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
import { DEPOSIT_MODE_LABELS, DEPOSIT_MODES, OPERATION_LABELS } from "./types";
import { usePositionEditorButtonState } from "./usePositionEditorButtonState";

import "./PositionEditor.scss";

export function PositionEditor() {
  const { chainId, srcChainId, networkId } = useChainId();
  const features = getNetworkFeatures(networkId);
  const { expressOrdersEnabled, setExpressOrdersEnabled, setIsSettingsVisible } = useSettings();
  const [editingPositionKey, setEditingPositionKey] = usePositionEditorPositionState();
  const tokensData = useTokensData();
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const localizedDepositModeLabels = useLocalizedMap(DEPOSIT_MODE_LABELS);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const isVisible = Boolean(position);
  const prevEditingPositionKey = usePrevious(editingPositionKey);
  const prevIsVisible = usePrevious(isVisible);
  const lastVisibleIncreasedAtTimeRef = useRef<bigint | undefined>(undefined);

  const [operation, setOperation] = usePositionEditorOperation();
  const canDeposit = features.collateralDeposit;
  const canWithdraw = features.collateralWithdrawal;

  useEffect(() => {
    if (position && !canDeposit && !canWithdraw) {
      setEditingPositionKey(undefined);
    }
  }, [canDeposit, canWithdraw, position, setEditingPositionKey]);

  useEffect(() => {
    if (operation === Operation.Deposit && !canDeposit && canWithdraw) {
      setOperation(Operation.Withdraw);
    } else if (operation === Operation.Withdraw && !canWithdraw && canDeposit) {
      setOperation(Operation.Deposit);
    }
  }, [canDeposit, canWithdraw, operation, setOperation]);

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
  const depositConversionTokenAddress = useSelector(selectPositionEditorDepositConversionTokenAddress);
  const isDepositSwapUnfillable = useSelector(selectPositionEditorIsDepositSwapUnfillable);
  const depositMaxInstantAmount = useSelector(selectPositionEditorDepositMaxInstantAmount);
  const setAddMarginReturnPositionKey = useSelector(selectPositionEditorSetAddMarginReturnPositionKey);
  const setTradeboxIsFromTokenGmxAccount = useSelector(selectTradeboxSetIsFromTokenGmxAccount);
  const history = useHistory();

  // a selected conversion token isn't the position collateral, so collateral options are keyed off the position
  const collateralOptionsAddress =
    depositConversionTokenAddress !== undefined ? position?.collateralTokenAddress : selectedCollateralAddress;

  const filteredTokensData = useMemo(() => {
    return pickBy(
      tokensData,
      (token) =>
        token.address === collateralOptionsAddress ||
        token.wrappedAddress === collateralOptionsAddress ||
        convertTokenAddress(chainId, token.address, "native") === collateralOptionsAddress
    );
  }, [chainId, collateralOptionsAddress, tokensData]);

  const options = useMemo(
    () => getCollateralOptions(Object.values(filteredTokensData), srcChainId, features.gmxAccount),
    [features.gmxAccount, filteredTokensData, srcChainId]
  );

  const depositConversionToken = getByKey(tokensData, depositConversionTokenAddress);
  const conversionOptions = useMemo(
    () =>
      depositConversionToken
        ? getCollateralOptions([depositConversionToken], srcChainId, features.gmxAccount)
        : undefined,
    [depositConversionToken, features.gmxAccount, srcChainId]
  );

  const hasMultipleTokens = useMemo(() => {
    if (depositConversionTokenAddress !== undefined) {
      return true;
    }

    if (srcChainId === undefined) {
      if (selectedCollateralAddress === getWrappedToken(chainId)?.address) {
        return true;
      }

      return isSettlementChain(chainId);
    }

    return false;
  }, [chainId, depositConversionTokenAddress, selectedCollateralAddress, srcChainId]);

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

  const [collateralInputValue, setCollateralInputValue] = usePositionEditorCollateralInputValue();
  const { collateralDeltaAmount, collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position?.market.indexTokenAddress));

  const markPrice = useMemo(() => {
    if (!position) {
      return undefined;
    }

    return getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: true });
  }, [position]);

  const maxWithdrawAmount = useSelector(selectPositionEditorMaxWithdrawAmount);

  const { fees, executionFee } = usePositionEditorFees({
    operation,
  });

  const { formId, isActiveForm } = useActiveForm();
  const submitButtonState = usePositionEditorButtonState(operation, isActiveForm);
  const gasPaymentToken = submitButtonState.expressParams?.gasPaymentParams.gasPaymentToken;

  const settlementChainGasPaymentToken = useSelector(selectSettlementChainGasPaymentToken);
  const gmxAccountGasPaymentToken = useSelector(selectGmxAccountGasPaymentToken);
  const reserveTokenForMax = isCollateralTokenFromGmxAccount
    ? gmxAccountGasPaymentToken
    : expressOrdersEnabled
      ? settlementChainGasPaymentToken
      : undefined;

  const expressEnabledForMax = expressOrdersEnabled && !collateralToken?.isNative;
  const expressGasPaymentParams = submitButtonState.expressParams?.gasPaymentParams;
  const gasPaymentTokenForMax = expressEnabledForMax
    ? expressGasPaymentParams?.gasPaymentToken ?? reserveTokenForMax
    : nativeToken;
  const gasPaymentTokenAmountForMax = expressEnabledForMax
    ? expressGasPaymentParams?.gasPaymentTokenAmount
    : executionFee?.feeTokenAmount;
  const fallbackGasPaymentTokenAmountForMax =
    expressEnabledForMax && executionFee && gasPaymentTokenForMax
      ? convertToTokenAmount(executionFee.feeUsd, gasPaymentTokenForMax.decimals, gasPaymentTokenForMax.prices.minPrice)
      : undefined;
  const isMaxAmountLoading = expressEnabledForMax && submitButtonState.isExpressLoading;

  const depositBalanceType = isCollateralTokenFromGmxAccount ? TokenBalanceType.GmxAccount : TokenBalanceType.Wallet;
  const collateralTokenBalance = getBalanceByBalanceType(collateralToken, depositBalanceType);

  const depositMaxDetails = useMaxAvailableAmount({
    fromToken: collateralToken,
    fromTokenBalance: collateralTokenBalance,
    fromTokenAmount: collateralDeltaAmount,
    isLoading: isMaxAmountLoading,
    feeToken: isDeposit ? gasPaymentTokenForMax : undefined,
    feeTokenAmount: isDeposit ? gasPaymentTokenAmountForMax : undefined,
    fallbackFeeTokenAmount: isDeposit ? fallbackGasPaymentTokenAmountForMax : undefined,
    reserveToken: isDeposit ? reserveTokenForMax : undefined,
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

  const withdrawMaxActionsState = useMemo(
    (): MaxActionsState => ({
      ...DEFAULT_MAX_ACTIONS_STATE,
      selected: collateralDeltaAmount === maxWithdrawAmount ? "max" : undefined,
    }),
    [collateralDeltaAmount, maxWithdrawAmount]
  );

  const handleKeepGasClick = useCallback(() => {
    if (depositMaxDetails.formattedKeepGasAmount !== undefined) {
      setCollateralInputValue(depositMaxDetails.formattedKeepGasAmount);
    }
  }, [depositMaxDetails.formattedKeepGasAmount, setCollateralInputValue]);

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

  const usdcPayTokenAddressForAtPrice =
    isAtPriceDeposit && position ? getUsdgConversionTokenAddress(chainId, position.collateralTokenAddress) : undefined;
  const shouldSuggestNowForUsdc =
    usdcPayTokenAddressForAtPrice !== undefined &&
    getShouldDefaultToUsdc({
      usdgBalance: collateralTokenBalance,
      usdcBalance: getBalanceByBalanceType(getByKey(tokensData, usdcPayTokenAddressForAtPrice), depositBalanceType),
    });

  const positionCollateralSymbol = position?.collateralToken.symbol;
  // an amount over the balance keeps its "Insufficient balance" button instead of the conversion choices
  const isConversionTooLarge =
    isDepositSwapUnfillable &&
    depositMaxInstantAmount !== undefined &&
    collateralDeltaAmount !== undefined &&
    collateralTokenBalance !== undefined &&
    collateralDeltaAmount <= collateralTokenBalance;
  const restAmount =
    collateralDeltaAmount !== undefined && depositMaxInstantAmount !== undefined
      ? collateralDeltaAmount - depositMaxInstantAmount
      : undefined;
  const restUsd =
    collateralToken && restAmount !== undefined
      ? convertToUsd(restAmount, collateralToken.decimals, getMidPrice(collateralToken.prices))
      : undefined;
  const restInstantAmountOut = useSelector(selectPositionEditorDepositRestInstantAmountOut);
  const {
    isOffered: isPaxosOfferedForRest,
    minimumText: paxosMinimumText,
    isWalletOnly: isPaxosWalletOnly,
  } = useIsSwapTabPaxosOffered({
    amount: restAmount,
    amountUsd: restUsd,
    instantAmountOut: restInstantAmountOut,
    isGmxAccount: isCollateralTokenFromGmxAccount,
    enabled: isConversionTooLarge,
  });
  const settlementChainName = getChainName(chainId);
  const maxInstantAmountText =
    depositMaxInstantAmount !== undefined && collateralToken
      ? formatMaxInstantAmount(collateralToken, depositMaxInstantAmount)
      : undefined;
  const isCloseToLiquidation = getIsCloseToLiquidation({
    markPrice: position?.markPrice,
    liquidationPrice: position?.liquidationPrice,
  });

  const handleDepositMaxInstant = useCallback(() => {
    if (depositMaxInstantAmount === undefined || !collateralToken) return;

    setCollateralInputValue(formatAmountFree(depositMaxInstantAmount, collateralToken.decimals));
  }, [collateralToken, depositMaxInstantAmount, setCollateralInputValue]);

  const handleConvertRestWithPaxos = useCallback(() => {
    if (
      !position ||
      !collateralToken ||
      depositMaxInstantAmount === undefined ||
      collateralDeltaAmount === undefined ||
      collateralDeltaAmount <= depositMaxInstantAmount
    ) {
      return;
    }

    const restAmount = formatAmountFree(collateralDeltaAmount - depositMaxInstantAmount, collateralToken.decimals);

    setAddMarginReturnPositionKey(position.key);
    // the Swap tab runs Paxos only from the wallet, and a stored GMX Account pay source would hide it
    setTradeboxIsFromTokenGmxAccount(false);
    setEditingPositionKey(undefined);
    history.push(
      `/trade/swap?mode=market&from=${collateralToken.symbol}&to=${position.collateralToken.symbol}&amount=${restAmount}`
    );
  }, [
    collateralDeltaAmount,
    collateralToken,
    depositMaxInstantAmount,
    history,
    position,
    setAddMarginReturnPositionKey,
    setEditingPositionKey,
    setTradeboxIsFromTokenGmxAccount,
  ]);

  const hasNextValues =
    !isDepositSwapUnfillable &&
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

      if (
        !selectedCollateralAddress ||
        (!filteredTokensData[selectedCollateralAddress] && selectedCollateralAddress !== depositConversionTokenAddress)
      ) {
        handleSetCollateralAddress(position.collateralTokenAddress as Address);
      }
    },
    [
      depositConversionTokenAddress,
      filteredTokensData,
      handleSetCollateralAddress,
      position,
      selectedCollateralAddress,
      setSelectedCollateralAddress,
    ]
  );

  const openDepositNow = useSelector(selectPositionEditorOpenDepositNow);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const { transitRouteProgress, dismissTransitRouteProgress } = useSyntheticsEvents();

  useEffect(
    function applyAddMarginContinueRequest() {
      const positionKey = transitRouteProgress?.addMarginPositionKey;

      if (
        !transitRouteProgress?.isContinueRequested ||
        transitRouteProgress.isDismissed ||
        positionKey === undefined ||
        !positionsInfoData
      ) {
        return;
      }

      // the conversion has done its job once the trader is back at the position;
      // dismissing replaces the progress object, so without the isDismissed check this would loop
      dismissTransitRouteProgress(transitRouteProgress.id);
      setAddMarginReturnPositionKey(undefined);

      if (positionsInfoData[positionKey]) {
        openDepositNow(positionKey);
      }
    },
    [
      openDepositNow,
      positionsInfoData,
      dismissTransitRouteProgress,
      setAddMarginReturnPositionKey,
      transitRouteProgress,
    ]
  );

  useEffect(
    function resetFormAndApplyOpenRequest() {
      // A data gap brings the same position back, but a position closed under the open editor and reopened
      // later keeps its key with a new increase time.
      const increasedAtTime = position?.increasedAtTime;
      const isReopenedPosition =
        isVisible && !prevIsVisible && increasedAtTime !== lastVisibleIncreasedAtTimeRef.current;
      if (increasedAtTime !== undefined) {
        lastVisibleIncreasedAtTimeRef.current = increasedAtTime;
      }

      if (editingPositionKey !== prevEditingPositionKey || isReopenedPosition || atPriceOpenRequest) {
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

      // keep the request until the replaced order loads
      if (!prefill) {
        return;
      }

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
      editingPositionKey,
      isVisible,
      position?.collateralToken?.decimals,
      position?.increasedAtTime,
      position?.indexToken?.visualMultiplier,
      prevEditingPositionKey,
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
      isHandlerDisabled={submitButtonState.disabled}
      handle={buttonContent}
      handleClassName="w-full"
      position="top"
      variant="none"
    />
  ) : (
    buttonContent
  );

  const tabsOptions = useMemo(() => {
    return Object.values(Operation)
      .filter((option) => {
        if (option === Operation.Deposit) return features.collateralDeposit;
        if (option === Operation.Withdraw) return features.collateralWithdrawal;
        return true;
      })
      .map((option) => ({
        value: option,
        label: localizedOperationLabels[option],
      }));
  }, [features.collateralDeposit, features.collateralWithdrawal, localizedOperationLabels]);

  const depositModeTabsOptions = useMemo(() => {
    return DEPOSIT_MODES.map((mode) => ({
      value: mode,
      label: localizedDepositModeLabels[mode],
    }));
  }, [localizedDepositModeLabels]);

  return (
    <div className="PositionEditor">
      <Modal
        activeFormId={formId}
        className="PositionEditor-modal"
        isVisible={Boolean(position) && (canDeposit || canWithdraw)}
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
                    <UsdPriceValue
                      price={markPrice}
                      visualMultiplier={position.indexToken?.visualMultiplier}
                      className="numbers"
                    />
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
                      ≈<UsdValue usd={collateralDeltaUsd} />
                    </span>
                  )}
                </>
              }
              rightHeadline={
                isDeposit ? (
                  <div className="flex items-center gap-6">
                    {collateralTokenBalance !== undefined && collateralTokenBalance > 0n && (
                      <MaxActions
                        qa="amount-input"
                        state={depositMaxDetails.maxActions}
                        onMax={() => handleCollateralPercentageChange(100)}
                        onKeepGas={handleKeepGasClick}
                      />
                    )}
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
                  </div>
                ) : (
                  <span className="flex items-center gap-6 text-typography-secondary">
                    {maxWithdrawAmount > 0n && (
                      <MaxActions
                        qa="amount-input"
                        state={withdrawMaxActionsState}
                        onMax={() => handleCollateralPercentageChange(100)}
                      />
                    )}
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
                      conversionOptions={conversionOptions}
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

              {shouldSuggestNowForUsdc && (
                <AlertInfoCard type="info" hideClose>
                  <Trans>
                    "At price" margin deposits use {positionCollateralSymbol} only. To pay with USDC,{" "}
                    <EmbeddedActionButton onClick={() => setDepositMode("now")}>use Now</EmbeddedActionButton>.
                  </Trans>
                </AlertInfoCard>
              )}

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

              {isConversionTooLarge ? (
                <>
                  <AlertInfoCard type="warning" hideClose>
                    <div className="font-medium">
                      <Trans>Too large to convert instantly</Trans>
                    </div>
                    {depositMaxInstantAmount !== undefined && depositMaxInstantAmount > 0n ? (
                      <Trans>Up to {maxInstantAmountText} can be converted now.</Trans>
                    ) : (
                      <Trans>Nothing can be converted instantly right now.</Trans>
                    )}
                  </AlertInfoCard>
                  {depositMaxInstantAmount !== undefined && depositMaxInstantAmount > 0n && (
                    <Button
                      className="w-full flex-col !items-start"
                      variant="primary-action"
                      onClick={handleDepositMaxInstant}
                      qa="deposit-max-instant"
                    >
                      <Trans>Deposit {maxInstantAmountText} now</Trans>
                      <span className="text-13 font-normal opacity-80">
                        <Trans>Instant</Trans>
                      </span>
                    </Button>
                  )}
                  {isPaxosOfferedForRest ? (
                    <Button
                      className="w-full flex-col !items-start"
                      variant="secondary"
                      showExternalLinkArrow={false}
                      onClick={handleConvertRestWithPaxos}
                      qa="convert-rest-with-paxos"
                    >
                      <Trans>Convert the rest with Paxos</Trans>
                      <span className="text-12 font-normal text-typography-secondary">
                        <Trans>In the Swap tab · arrives separately</Trans>
                      </span>
                    </Button>
                  ) : isPaxosWalletOnly ? (
                    <div className="text-12 text-typography-secondary">
                      <Trans>Paxos converts USDC from your wallet on {settlementChainName}.</Trans>
                    </div>
                  ) : (
                    paxosMinimumText && (
                      <div className="text-12 text-typography-secondary">
                        <Trans>Paxos converts amounts from {paxosMinimumText}.</Trans>
                      </div>
                    )
                  )}
                  {isCloseToLiquidation && (
                    <AlertInfoCard type="warning" hideClose>
                      <Trans>Close to liquidation? Deposit the instant amount first. Paxos can take a while.</Trans>
                    </AlertInfoCard>
                  )}
                </>
              ) : (
                <div>{button}</div>
              )}

              {!isDeposit && (
                <SyntheticsInfoRow
                  label={t`Receive`}
                  value={
                    <NumericValue
                      parts={formatTokenAmountWithUsdParts(
                        receiveAmount,
                        receiveUsd,
                        collateralToken?.symbol,
                        collateralToken?.decimals,
                        { fallbackToZero: true, isStable: collateralToken?.isStable }
                      )}
                    />
                  }
                />
              )}

              <SyntheticsInfoRow
                label={t`Liquidation price`}
                value={
                  <ValueTransition
                    from={formatLiquidationPriceParts(position.liquidationPrice, {
                      displayDecimals: marketDecimals,
                      visualMultiplier: position.indexToken?.visualMultiplier,
                    })}
                    to={
                      hasNextValues
                        ? formatLiquidationPriceParts(nextLiqPrice, {
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
                gasPaymentParams={getNetworkFeeGasPaymentParams({
                  expressParams: submitButtonState.expressParams,
                  tokensData,
                })}
                feeSource={getNetworkFeeSource({ isGmxAccount: isCollateralTokenFromGmxAccount })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function getCollateralOptions(tokens: TokenData[], srcChainId: number | undefined, isGmxAccountEnabled: boolean) {
  return tokens
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

      const walletRow = {
        ...tokenData,
        isGmxAccount: false,
        balance: tokenData.walletBalance,
        balanceType: TokenBalanceType.Wallet,
      };

      if (!isGmxAccountEnabled) {
        return [walletRow];
      }

      return [
        {
          ...tokenData,
          isGmxAccount: true,
          balance: tokenData.gmxAccountBalance,
          balanceType: TokenBalanceType.GmxAccount,
        },
        walletRow,
      ];
    })
    .filter((option) => srcChainId === undefined || option.isGmxAccount)
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
}
