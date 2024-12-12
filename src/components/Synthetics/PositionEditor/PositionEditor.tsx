import { Trans, msg, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { getSyntheticsCollateralEditAddressKey } from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS, getToken, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useHasOutdatedUi } from "domain/legacy";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
} from "domain/synthetics/orders";
import {
  formatLiquidationPrice,
  getIsPositionInfoLoaded,
  substractMaxLeverageSlippage,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import {
  adaptToV1InfoTokens,
  convertToTokenAmount,
  convertToUsd,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import { getMarkPrice, getMinCollateralUsdForLeverage } from "domain/synthetics/trade";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { getMinResidualAmount } from "domain/tokens";
import { ethers } from "ethers";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  expandDecimals,
  formatAmountFree,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionEditorMinCollateralFactor,
  usePositionEditorPosition,
  usePositionEditorPositionState,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { useLocalizedMap } from "lib/i18n";
import { useKey } from "react-use";

import { PositionEditorAdvancedRows } from "./PositionEditorAdvancedRows";
import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";

import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import {
  makeTxnErrorMetricsHandler,
  initEditCollateralMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { makeTxnSentMetricsHandler } from "lib/metrics/utils";
import "./PositionEditor.scss";

export type Props = {
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Deposit`,
  [Operation.Withdraw]: msg`Withdraw`,
};

export function PositionEditor(p: Props) {
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const { setPendingTxns, allowedSlippage } = p;
  const { chainId } = useChainId();
  const { shouldDisableValidationForTesting } = useSettings();
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { openConnectModal } = useConnectModal();
  const isMetamaskMobile = useIsMetamaskMobile();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices?.maxPrice);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const infoTokens = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }
    return adaptToV1InfoTokens(tokensData);
  }, [tokensData]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: position ? [position.collateralTokenAddress] : [],
  });
  const tokenAllowance = position ? tokensAllowanceData?.[position.collateralTokenAddress] : undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey(
    getSyntheticsCollateralEditAddressKey(chainId, position?.collateralTokenAddress),
    position?.collateralTokenAddress
  );

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

  const markPrice = position
    ? getMarkPrice({
        prices: position.indexToken.prices,
        isLong: position.isLong,
        isIncrease: isDeposit,
      })
    : undefined;

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position?.market.indexTokenAddress));

  const needCollateralApproval =
    isDeposit &&
    tokenAllowance !== undefined &&
    collateralDeltaAmount !== undefined &&
    selectedCollateralAddress !== ethers.ZeroAddress &&
    collateralDeltaAmount > tokenAllowance;

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
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const { nextLeverage, nextLiqPrice, receiveUsd, receiveAmount } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  const minCollateralFactor = usePositionEditorMinCollateralFactor();

  const [error, tooltipName] = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextLeverage,
      nextLiqPrice,
      isDeposit,
      position,
      depositToken: collateralToken,
      depositAmount: collateralDeltaAmount,
      minCollateralFactor,
    });

    const error = commonError[0] || editCollateralError[0];
    const tooltipName = commonError[1] || editCollateralError[1];

    if (error) {
      return [error, tooltipName];
    }

    if (needCollateralApproval) {
      return [t`Pending ${collateralToken?.assetSymbol ?? collateralToken?.symbol} approval`];
    }

    if (isHighFeeConsentError) {
      return [t`High Network Fee not yet acknowledged`];
    }

    if (isSubmitting) {
      return [t`Creating Order...`];
    }

    return [];
  }, [
    chainId,
    account,
    hasOutdatedUi,
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    collateralToken,
    minCollateralFactor,
    needCollateralApproval,
    isHighFeeConsentError,
    isSubmitting,
  ]);

  const detectAndSetMaxSize = useCallback(() => {
    if (maxWithdrawAmount === undefined) return;
    if (!collateralToken) return;
    if (!position) return;
    if (minCollateralFactor === undefined) return;

    const { result: safeMaxWithdrawal } = bigNumberBinarySearch(
      BigInt(1),
      maxWithdrawAmount,
      expandDecimals(1, Math.ceil(collateralToken.decimals / 3)),
      (x) => {
        const isValid = willPositionCollateralBeSufficientForPosition(position, x, 0n, minCollateralFactor, 0n);
        return { isValid, returnValue: null };
      }
    );
    setCollateralInputValue(
      formatAmountFree(substractMaxLeverageSlippage(safeMaxWithdrawal), collateralToken.decimals)
    );
  }, [collateralToken, maxWithdrawAmount, minCollateralFactor, position]);

  const errorTooltipContent = useMemo(() => {
    if (tooltipName !== "maxLeverage") return null;

    return (
      <Trans>
        Decrease the withdraw size to match the max.{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
        <br />
        <br />
        <span onClick={detectAndSetMaxSize} className="Tradebox-handle">
          <Trans>Set max withdrawal</Trans>
        </span>
      </Trans>
    );
  }, [detectAndSetMaxSize, tooltipName]);

  const subaccount = useSubaccount(executionFee?.feeTokenAmount ?? null);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    const orderType = isDeposit ? OrderType.MarketIncrease : OrderType.MarketDecrease;

    const metricData = initEditCollateralMetricData({
      collateralToken,
      executionFee,
      selectedCollateralAddress,
      marketInfo: position?.marketInfo,
      collateralDeltaAmount,
      subaccount,
      orderType,
      isLong: position?.isLong,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (
      executionFee?.feeTokenAmount === undefined ||
      !tokensData ||
      markPrice === undefined ||
      !position?.indexToken ||
      collateralDeltaAmount === undefined ||
      !selectedCollateralAddress ||
      !signer
    ) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    let txnPromise: Promise<void>;

    if (isDeposit) {
      setIsSubmitting(true);

      txnPromise = createIncreaseOrderTxn({
        chainId,
        signer,
        subaccount,
        metricId: metricData.metricId,
        createIncreaseOrderParams: {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: selectedCollateralAddress,
          initialCollateralAmount: collateralDeltaAmount,
          targetCollateralAddress: position.collateralTokenAddress,
          collateralDeltaAmount,
          swapPath: [],
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: markPrice,
          triggerPrice: undefined,
          orderType: OrderType.MarketIncrease,
          isLong: position.isLong,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: shouldDisableValidationForTesting,
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
      });
    } else {
      if (receiveUsd === undefined) {
        return;
      }

      setIsSubmitting(true);

      txnPromise = createDecreaseOrderTxn(
        chainId,
        signer,
        subaccount,
        {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: position.collateralTokenAddress,
          initialCollateralDeltaAmount: collateralDeltaAmount,
          receiveTokenAddress: selectedCollateralAddress,
          swapPath: [],
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: markPrice,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          isLong: position.isLong,
          minOutputUsd: receiveUsd,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: shouldDisableValidationForTesting,
          autoCancel: false,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        metricData.metricId
      );
    }

    if (subaccount) {
      onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise = txnPromise
      .then(makeTxnSentMetricsHandler(metricData.metricId))
      .catch(makeTxnErrorMetricsHandler(metricData.metricId));

    txnPromise.then(onClose).finally(() => {
      setIsSubmitting(false);
    });
  }

  useKey(
    "Enter",
    () => {
      if (isVisible && !error) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
        !availableSwapTokens?.find((token) => token.address === selectedCollateralAddress)
      ) {
        setSelectedCollateralAddress(position.collateralTokenAddress);
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
    [isVisible, prevIsVisible]
  );

  const showMaxOnDeposit = collateralToken?.isNative
    ? minResidualAmount !== undefined &&
      collateralToken?.balance !== undefined &&
      collateralToken.balance > minResidualAmount
    : true;

  const renderErrorTooltipContent = useCallback(() => errorTooltipContent, [errorTooltipContent]);

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
  const button = errorTooltipContent ? (
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
              className="PositionEditor-tabs SwapBox-option-tabs"
              qa="operation-tabs"
            />
            <BuyInputSection
              topLeftLabel={localizedOperationLabels[operation]}
              topLeftValue={formatUsd(collateralDeltaUsd)}
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
              showMaxButton={
                (isDeposit
                  ? collateralToken?.balance &&
                    showMaxOnDeposit &&
                    (collateralDeltaAmount === undefined ||
                      collateralDeltaAmount != collateralToken?.balance ||
                      collateralDeltaAmount === undefined)
                  : maxWithdrawAmount !== undefined &&
                    (collateralDeltaAmount === undefined ? true : collateralDeltaAmount !== maxWithdrawAmount)) || false
              }
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
              onClickMax={() => {
                let maxDepositAmount = collateralToken?.isNative
                  ? collateralToken!.balance! - BigInt(minResidualAmount ?? 0)
                  : collateralToken!.balance!;

                if (maxDepositAmount < 0) {
                  maxDepositAmount = 0n;
                }

                const formattedMaxDepositAmount = formatAmountFree(maxDepositAmount!, collateralToken!.decimals);
                const finalDepositAmount = isMetamaskMobile
                  ? limitDecimals(formattedMaxDepositAmount, MAX_METAMASK_MOBILE_DECIMALS)
                  : formattedMaxDepositAmount;

                if (isDeposit) {
                  setCollateralInputValue(finalDepositAmount);
                } else {
                  setCollateralInputValue(
                    formatAmountFree(maxWithdrawAmount!, position?.collateralToken?.decimals || 0)
                  );
                }
              }}
              qa="amount-input"
            >
              {availableSwapTokens ? (
                <TokenSelector
                  label={localizedOperationLabels[operation]}
                  chainId={chainId}
                  tokenAddress={selectedCollateralAddress!}
                  onSelectToken={(token) => setSelectedCollateralAddress(token.address)}
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

            <ExchangeInfo className="PositionEditor-info-box" dividerClassName="my-15 -mx-15 h-1 bg-slate-700">
              <ExchangeInfo.Group>
                <ExchangeInfoRow
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
              </ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <PositionEditorAdvancedRows
                  operation={operation}
                  selectedCollateralAddress={selectedCollateralAddress}
                  collateralInputValue={collateralInputValue}
                />
              </ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <TradeFeesRow {...fees} feesType="edit" shouldShowRebate={false} />
                <NetworkFeeRow executionFee={executionFee} />
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
                {needCollateralApproval && collateralToken && (
                  <ApproveTokenButton
                    tokenAddress={collateralToken.address}
                    tokenSymbol={collateralToken.assetSymbol ?? collateralToken.symbol}
                    spenderAddress={routerAddress}
                  />
                )}
                {highExecutionFeeAcknowledgement}
              </ExchangeInfo.Group>
            </ExchangeInfo>

            <div className="Exchange-swap-button-container Confirmation-box-row">{button}</div>
          </>
        )}
      </Modal>
    </div>
  );
}
