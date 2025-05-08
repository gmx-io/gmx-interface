import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ImSpinner2 } from "react-icons/im";

import { getBridgingOptionsForToken } from "config/bridging";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { get1InchSwapUrlFromAddresses } from "config/links";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  makeSelectSubaccountForActions,
  selectChainId,
  selectGasPaymentToken,
  selectGasPaymentTokenAllowance,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectAddTokenPermit,
  selectTokenPermits,
} from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import {
  selectExternalSwapQuote,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxMaxLeverage,
  selectTradeboxPayAmount,
  selectTradeboxSelectedPosition,
  selectTradeboxState,
  selectTradeboxTokensAllowance,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxTradeTypeError } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressParams } from "domain/synthetics/express";
import { getNameByOrderType, substractMaxLeverageSlippage } from "domain/synthetics/positions/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { getApprovalRequirements } from "domain/synthetics/tokens/utils";
import {
  getIncreasePositionAmounts,
  getNextPositionValuesForIncreaseTrade,
} from "domain/synthetics/trade/utils/increase";
import { getCommonError, getExpressError, getIsMaxLeverageExceeded } from "domain/synthetics/trade/utils/validation";
import { approveTokens } from "domain/tokens/approveTokens";
import { numericBinarySearch } from "lib/binarySearch";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { formatAmountFree } from "lib/numbers";
import { sleep } from "lib/sleep";
import { mustNeverExist } from "lib/types";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { sendUserAnalyticsConnectWalletClickEvent, userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { getToken, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { ExecutionFee } from "sdk/types/fees";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { BridgingInfo } from "components/Synthetics/BridgingInfo/BridgingInfo";

import { tradeTypeLabels } from "../tradeboxConstants";
import { useRequiredActions } from "./useRequiredActions";
import { useTradeboxTransactions } from "./useTradeboxTransactions";

interface TradeboxButtonStateOptions {
  account?: string;
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
}

type TradeboxButtonState = {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => Promise<void>;
  slippageInputId: string;
  expressParams?: ExpressParams;
  totalExecutionFee?: ExecutionFee;
};

export function useTradeboxButtonState({
  account,
  setToTokenInputValue,
}: TradeboxButtonStateOptions): TradeboxButtonState {
  const chainId = useSelector(selectChainId);
  const { signer } = useWallet();

  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isIncrease, isLimit, isMarket, isTwap } = tradeFlags;
  const { stopLoss, takeProfit } = useSidecarOrders();
  const sidecarEntries = useSidecarEntries();
  const hasOutdatedUi = useHasOutdatedUi();
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const { stage, collateralToken, tradeType, setStage } = useSelector(selectTradeboxState);
  const { isLeverageSliderEnabled } = useSettings();

  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const tokensData = useSelector(selectTokensData);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const payAmount = useSelector(selectTradeboxPayAmount);
  const payTokenAllowance = useSelector(selectTradeboxTokensAllowance);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);

  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const { requiredActions } = useRequiredActions();

  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const addTokenPermit = useSelector(selectAddTokenPermit);

  const {
    onSubmitWrapOrUnwrap,
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
    slippageInputId,
    expressParams,
    isExpressLoading,
    totalExecutionFee,
  } = useTradeboxTransactions({
    setPendingTxns,
  });

  const { tokensToApprove, isAllowanceLoaded } = useMemo(() => {
    if (
      !fromToken ||
      payAmount === undefined ||
      !payTokenAllowance.tokensAllowanceData ||
      !payTokenAllowance.spenderAddress ||
      !gasPaymentToken
    ) {
      return { tokensToApprove: [], isAllowanceLoaded: false };
    }

    const approvalRequirements = getApprovalRequirements({
      chainId,
      payTokenParamsList: [
        {
          tokenAddress: fromToken.address,
          amount: payAmount,
          allowanceData: payTokenAllowance.tokensAllowanceData,
          isAllowanceLoaded: payTokenAllowance.isLoaded,
        },
      ],
      gasPaymentTokenParams: expressParams?.relayFeeParams
        ? {
            tokenAddress: gasPaymentToken.address,
            amount: expressParams.relayFeeParams.gasPaymentTokenAmount,
            allowanceData: gasPaymentTokenAllowance?.tokensAllowanceData,
            isAllowanceLoaded: gasPaymentTokenAllowance?.isLoaded,
          }
        : undefined,
      permits: expressParams && tokenPermits ? tokenPermits : [],
    });

    return approvalRequirements;
  }, [
    chainId,
    expressParams,
    fromToken,
    gasPaymentToken,
    gasPaymentTokenAllowance?.isLoaded,
    gasPaymentTokenAllowance?.tokensAllowanceData,
    payAmount,
    payTokenAllowance.isLoaded,
    payTokenAllowance.spenderAddress,
    payTokenAllowance.tokensAllowanceData,
    tokenPermits,
  ]);

  const [isApproving, setIsApproving] = useState(false);

  const detectAndSetAvailableMaxLeverage = useDetectAndSetAvailableMaxLeverage({ setToTokenInputValue });

  const tradeError = useSelector(selectTradeboxTradeTypeError);

  const { buttonErrorText, tooltipContent } = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const expressError = getExpressError({
      chainId,
      expressParams,
      tokensData,
    });

    const buttonErrorText = commonError[0] || tradeError[0] || expressError[0];
    const tooltipName = commonError[1] || tradeError[1] || expressError[1];

    let tooltipContent: ReactNode = null;
    if (tooltipName) {
      switch (tooltipName) {
        case "maxLeverage": {
          tooltipContent = (
            <>
              {isLeverageSliderEnabled ? (
                <Trans>Decrease the leverage to match the max. allowed leverage.</Trans>
              ) : (
                <Trans>Decrease the size to match the max. allowed leverage:</Trans>
              )}{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
              <br />
              <br />
              <span onClick={detectAndSetAvailableMaxLeverage} className="Tradebox-handle">
                <Trans>Set Max Leverage</Trans>
              </span>
            </>
          );

          break;
        }

        case "liqPrice > markPrice":
          tooltipContent = (
            <Trans>The position would be immediately liquidated upon order execution. Try reducing the size.</Trans>
          );
          break;

        case "noSwapPath":
          tooltipContent = (
            <>
              <Trans>
                {collateralToken?.assetSymbol ?? collateralToken?.symbol} is required for collateral.
                <br />
                <br />
                There is no swap path found for {fromToken?.assetSymbol ?? fromToken?.symbol} to{" "}
                {collateralToken?.assetSymbol ?? collateralToken?.symbol} within GMX.
                <br />
                <br />
                <ExternalLink
                  href={get1InchSwapUrlFromAddresses(chainId, fromToken?.address, collateralToken?.address)}
                >
                  You can buy {collateralToken?.assetSymbol ?? collateralToken?.symbol} on 1inch.
                </ExternalLink>
              </Trans>
              {getBridgingOptionsForToken(collateralToken?.symbol) && (
                <>
                  <br />
                  <br />
                  <BridgingInfo chainId={chainId} tokenSymbol={collateralToken?.symbol} textOpaque />
                </>
              )}
            </>
          );
          break;

        default:
          mustNeverExist(tooltipName);
      }
    }

    return { buttonErrorText, tooltipContent };
  }, [
    chainId,
    account,
    hasOutdatedUi,
    expressParams,
    tokensData,
    tradeError,
    collateralToken?.assetSymbol,
    collateralToken?.symbol,
    collateralToken?.address,
    fromToken?.assetSymbol,
    fromToken?.symbol,
    fromToken?.address,
    isLeverageSliderEnabled,
    detectAndSetAvailableMaxLeverage,
  ]);

  const onSubmit = useCallback(async () => {
    if (!account) {
      sendUserAnalyticsConnectWalletClickEvent("ActionButton");
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      const tokenToApprove = tokensToApprove[0];

      if (!chainId || isApproving || !tokenToApprove) return;

      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: {
          action: "ApproveClick",
        },
      });

      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: tokenToApprove.tokenAddress,
        spender: getContract(chainId, "SyntheticsRouter"),
        pendingTxns: [],
        setPendingTxns,
        infoTokens: {},
        chainId,
        approveAmount: undefined,
        permitParams: expressParams
          ? {
              addTokenPermit,
            }
          : undefined,
        onApproveFail: () => {
          userAnalytics.pushEvent<TokenApproveResultEvent>({
            event: "TokenApproveAction",
            data: {
              action: "ApproveFail",
            },
          });
        },
      });

      return;
    }

    setStage("processing");

    let txnPromise: Promise<any>;

    if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = Promise.resolve(onSubmitIncreaseOrder());
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    if (subaccount) {
      /**
       * Wait 2 seconds to prevent double click on button
       * waiting for txnPromise may not be enough because it's sometimes resolves very fast
       */
      await sleep(2000);
      setStage("trade");

      return;
    }

    txnPromise.finally(() => {
      setStage("trade");
    });
  }, [
    account,
    isAllowanceLoaded,
    tokensToApprove,
    setStage,
    isWrapOrUnwrap,
    isSwap,
    isIncrease,
    subaccount,
    openConnectModal,
    chainId,
    isApproving,
    signer,
    setPendingTxns,
    expressParams,
    addTokenPermit,
    onSubmitWrapOrUnwrap,
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
  ]);

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove]);

  return useMemo(() => {
    const commonState = {
      tooltipContent,
      onSubmit,
      slippageInputId,
      expressParams,
      totalExecutionFee,
    };

    if (!account && buttonErrorText) {
      return {
        ...commonState,
        text: buttonErrorText,
        disabled: false,
      };
    }

    if (buttonErrorText) {
      return {
        ...commonState,
        text: buttonErrorText,
        disabled: true,
      };
    }

    if (stopLoss.error?.percentage || takeProfit.error?.percentage) {
      return {
        ...commonState,
        text: t`TP/SL orders exceed the position`,
        disabled: true,
      };
    }

    if (isExpressLoading) {
      return {
        ...commonState,
        text: (
          <>
            {t`Express params loading...`}
            <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isApproving && tokensToApprove.length) {
      return {
        ...commonState,
        text: (
          <>
            {t`Allow ${getToken(chainId, tokensToApprove[0].tokenAddress).symbol} to be spent`}{" "}
            <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      return {
        ...commonState,
        text: t`Allow ${getToken(chainId, tokensToApprove[0].tokenAddress).symbol} to be spent`,
        disabled: false,
      };
    }

    if (stage === "processing") {
      return {
        ...commonState,
        text: t`Creating Order...`,
        disabled: true,
      };
    }

    let submitButtonText = "";
    {
      if (buttonErrorText) {
        submitButtonText = buttonErrorText;
      }

      if (isMarket) {
        if (isSwap) {
          submitButtonText = t`Swap ${fromToken?.symbol}`;
        } else {
          if (!toToken?.symbol) {
            submitButtonText = `${localizedTradeTypeLabels[tradeType!]} ...`;
          }
          const prefix = toToken ? getTokenVisualMultiplier(toToken) : "";

          submitButtonText = `${localizedTradeTypeLabels[tradeType!]} ${prefix}${toToken?.symbol}`;
        }
      } else if (isLimit) {
        submitButtonText = t`Create ${getNameByOrderType(increaseAmounts?.limitOrderType, false)} order`;
      } else if (isTwap) {
        submitButtonText = t`Create TWAP ${isSwap ? "Swap" : "Increase"} order`;
      } else {
        submitButtonText = t`Create ${getNameByOrderType(decreaseAmounts?.triggerOrderType, false)} Order`;
      }
    }

    if (isIncrease && sidecarEntries.length > 0) {
      const isError = sidecarEntries.some((e) => {
        if (e.txnType === "cancel") return false;

        return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
      });

      return {
        ...commonState,
        text: submitButtonText,
        disabled: isError,
      };
    }

    return {
      ...commonState,
      text: submitButtonText,
      disabled: false,
    };
  }, [
    tooltipContent,
    onSubmit,
    slippageInputId,
    expressParams,
    totalExecutionFee,
    account,
    buttonErrorText,
    stopLoss.error?.percentage,
    takeProfit.error?.percentage,
    isExpressLoading,
    isApproving,
    tokensToApprove,
    isAllowanceLoaded,
    stage,
    isIncrease,
    sidecarEntries,
    chainId,
    isMarket,
    isLimit,
    isTwap,
    isSwap,
    fromToken?.symbol,
    toToken,
    localizedTradeTypeLabels,
    tradeType,
    increaseAmounts?.limitOrderType,
    decreaseAmounts?.triggerOrderType,
  ]);
}

export function useDetectAndSetAvailableMaxLeverage({
  setToTokenInputValue,
}: {
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
}) {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong } = tradeFlags;
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);

  const { minCollateralUsd } = usePositionsConstants();

  const { collateralToken, marketInfo, selectedTriggerAcceptablePriceImpactBps, setLeverageOption } =
    useSelector(selectTradeboxState);

  const { isLeverageSliderEnabled } = useSettings();

  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const toToken = useSelector(selectTradeboxToToken);
  const toTokenAmount = useSelector(selectTradeboxToTokenAmount);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);

  const maxLeverage = useSelector(selectTradeboxMaxLeverage);

  const maxAllowedLeverage = maxLeverage / 2;

  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const uiFeeFactor = useUiFeeFactor();
  const userReferralInfo = useUserReferralInfo();
  const acceptablePriceImpactBuffer = useSelector(selectSavedAcceptablePriceImpactBuffer);
  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  return useCallback(() => {
    if (!collateralToken || !toToken || !fromToken || !marketInfo || minCollateralUsd === undefined) return;

    const { result: maxLeverage, returnValue: sizeDeltaInTokens } = numericBinarySearch<bigint | undefined>(
      1,
      // "10 *" means we do 1..50 search but with 0.1x step
      (10 * maxAllowedLeverage) / BASIS_POINTS_DIVISOR,
      (lev) => {
        const leverage = BigInt((lev / 10) * BASIS_POINTS_DIVISOR);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath,
          indexToken: toToken,
          indexTokenAmount: toTokenAmount,
          initialCollateralAmount: fromTokenAmount,
          initialCollateralToken: fromToken,
          externalSwapQuote,
          isLong,
          marketInfo,
          position: selectedPosition,
          strategy: "leverageByCollateral",
          uiFeeFactor,
          userReferralInfo,
          acceptablePriceImpactBuffer,
          fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
          leverage,
          triggerPrice,
        });

        const nextPositionValues = getNextPositionValuesForIncreaseTrade({
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralToken,
          existingPosition: selectedPosition,
          indexPrice: increaseAmounts.indexPrice,
          isLong,
          marketInfo,
          minCollateralUsd,
          showPnlInLeverage: false,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          userReferralInfo,
        });

        if (nextPositionValues.nextLeverage !== undefined) {
          const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
            nextPositionValues.nextLeverage,
            marketInfo,
            isLong,
            increaseAmounts.sizeDeltaUsd
          );

          return {
            isValid: !isMaxLeverageExceeded,
            returnValue: increaseAmounts.sizeDeltaInTokens,
          };
        }

        return {
          isValid: false,
          returnValue: increaseAmounts.sizeDeltaInTokens,
        };
      }
    );

    if (sizeDeltaInTokens !== undefined) {
      if (isLeverageSliderEnabled) {
        // round to int if it's > 1x
        const resultLeverage = maxLeverage > 10 ? Math.floor(maxLeverage / 10) : Math.floor(maxLeverage) / 10;

        setLeverageOption(resultLeverage);
      } else {
        const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);

        setToTokenInputValue(
          formatAmountFree(substractMaxLeverageSlippage(sizeDeltaInTokens / visualMultiplier), toToken.decimals, 8),
          true
        );
      }
    } else {
      helperToast.error(t`No available leverage found`);
    }
  }, [
    acceptablePriceImpactBuffer,
    collateralToken,
    findSwapPath,
    fromToken,
    externalSwapQuote,
    fromTokenAmount,
    isLeverageSliderEnabled,
    isLong,
    marketInfo,
    maxAllowedLeverage,
    minCollateralUsd,
    selectedPosition,
    selectedTriggerAcceptablePriceImpactBps,
    setLeverageOption,
    setToTokenInputValue,
    toToken,
    toTokenAmount,
    triggerPrice,
    uiFeeFactor,
    userReferralInfo,
  ]);
}
