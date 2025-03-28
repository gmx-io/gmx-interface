import { Trans, t } from "@lingui/macro";
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
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxMaxLeverage,
  selectTradeboxSelectedPosition,
  selectTradeboxState,
  selectTradeboxSwapAmounts,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxTradeTypeError } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { getNameByOrderType, substractMaxLeverageSlippage } from "domain/synthetics/positions/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { useTokensAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import { getNeedTokenApprove } from "domain/synthetics/tokens/utils";
import {
  getIncreasePositionAmounts,
  getNextPositionValuesForIncreaseTrade,
} from "domain/synthetics/trade/utils/increase";
import { getCommonError, getIsMaxLeverageExceeded } from "domain/synthetics/trade/utils/validation";
import { approveTokens } from "domain/tokens/approveTokens";
import { numericBinarySearch } from "lib/binarySearch";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { isAddressZero } from "lib/legacy";
import { formatAmountFree } from "lib/numbers";
import { sleep } from "lib/sleep";
import { mustNeverExist } from "lib/types";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { sendUserAnalyticsConnectWalletClickEvent, userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { getTokenVisualMultiplier, getWrappedToken } from "sdk/configs/tokens";

import { tradeTypeLabels } from "../tradeboxConstants";
import { useRequiredActions } from "./useRequiredActions";
import { useTradeboxTransactions } from "./useTradeboxTransactions";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { BridgingInfo } from "components/Synthetics/BridgingInfo/BridgingInfo";
import { selectExternalSwapQuote } from "context/SyntheticsStateContext/selectors/externalSwapSelectors";
import { makeSelectSubaccountForActions } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectAddTokenPermit } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";

interface TradeboxButtonStateOptions {
  account?: string;
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
}

const selectTradeboxPayAmount = createSelector((q) => {
  const { isSwap, isIncrease } = q(selectTradeboxTradeFlags);
  const isWrapOrUnwrap = q(selectTradeboxIsWrapOrUnwrap);

  if (isSwap && !isWrapOrUnwrap) {
    const swapAmounts = q(selectTradeboxSwapAmounts);
    return swapAmounts?.amountIn;
  }

  if (isIncrease) {
    const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
    return increaseAmounts?.initialCollateralAmount;
  }

  return undefined;
});

export function useTradeboxButtonState({ account, setToTokenInputValue }: TradeboxButtonStateOptions): {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => Promise<void>;
} {
  const chainId = useSelector(selectChainId);
  const { signer } = useWallet();

  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isIncrease, isLimit, isMarket } = tradeFlags;
  const { stopLoss, takeProfit } = useSidecarOrders();
  const sidecarEntries = useSidecarEntries();
  const hasOutdatedUi = useHasOutdatedUi();
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const { stage, collateralToken, tradeType, setStage } = useSelector(selectTradeboxState);
  const { isLeverageSliderEnabled } = useSettings();

  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const payAmount = useSelector(selectTradeboxPayAmount);

  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);

  const {
    tokensAllowanceData,

    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
  });
  const needPayTokenApproval = getNeedTokenApprove(tokensAllowanceData, fromToken?.address, payAmount);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!needPayTokenApproval && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needPayTokenApproval]);

  const detectAndSetAvailableMaxLeverage = useDetectAndSetAvailableMaxLeverage({ setToTokenInputValue });

  const tradeError = useSelector(selectTradeboxTradeTypeError);

  const { buttonErrorText, tooltipContent } = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const buttonErrorText = commonError[0] || tradeError[0];
    const tooltipName = commonError[1] || tradeError[1];

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

  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const { requiredActions } = useRequiredActions();

  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const addTokenPermit = useSelector(selectAddTokenPermit);

  const { onSubmitWrapOrUnwrap, onSubmitSwap, onSubmitIncreaseOrder, onSubmitDecreaseOrder } = useTradeboxTransactions({
    setPendingTxns,
  });

  const onSubmit = useCallback(async () => {
    if (!account) {
      sendUserAnalyticsConnectWalletClickEvent("ActionButton");
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && needPayTokenApproval && fromToken) {
      if (!chainId || isApproving) return;

      const wrappedToken = getWrappedToken(chainId);
      const tokenAddress = isAddressZero(fromToken.address) ? wrappedToken.address : fromToken.address;

      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: {
          action: "ApproveClick",
        },
      });

      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: tokenAddress,
        spender: getContract(chainId, "SyntheticsRouter"),
        pendingTxns: [],
        setPendingTxns: () => null,
        infoTokens: {},
        chainId,
        addTokenPermit,
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
    needPayTokenApproval,
    fromToken,
    setStage,
    isWrapOrUnwrap,
    isSwap,
    isIncrease,
    subaccount,
    openConnectModal,
    chainId,
    isApproving,
    signer,
    onSubmitWrapOrUnwrap,
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
  ]);

  return useMemo(() => {
    if (!account && buttonErrorText) {
      return {
        text: buttonErrorText,
        tooltipContent,
        disabled: false,
        onSubmit,
      };
    }

    if (buttonErrorText) {
      return {
        text: buttonErrorText,
        tooltipContent,
        disabled: true,
        onSubmit,
      };
    }

    if (stopLoss.error?.percentage || takeProfit.error?.percentage) {
      return {
        text: t`TP/SL orders exceed the position`,
        tooltipContent,
        disabled: true,
        onSubmit,
      };
    }

    if (isApproving) {
      return {
        text: (
          <>
            {t`Allow ${fromToken?.assetSymbol ?? fromToken?.symbol} to be spent`}{" "}
            <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        tooltipContent,
        disabled: true,
        onSubmit,
      };
    }

    if (isAllowanceLoaded && needPayTokenApproval && fromToken) {
      return {
        text: t`Allow ${fromToken?.assetSymbol ?? fromToken?.symbol} to be spent`,
        tooltipContent,
        disabled: false,
        onSubmit,
      };
    }

    if (stage === "processing") {
      return {
        text: t`Creating Order...`,
        tooltipContent,
        disabled: true,
        onSubmit,
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
        submitButtonText = t`Create ${getNameByOrderType(increaseAmounts?.limitOrderType)} order`;
      } else {
        submitButtonText = t`Create ${getNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`;
      }
    }

    if (isIncrease && sidecarEntries.length > 0) {
      const isError = sidecarEntries.some((e) => {
        if (e.txnType === "cancel") return false;

        return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
      });

      return {
        text: submitButtonText,
        tooltipContent,
        disabled: isError,
        onSubmit,
      };
    }

    return {
      text: submitButtonText,
      tooltipContent,
      disabled: false,
      onSubmit,
    };
  }, [
    account,
    buttonErrorText,
    stopLoss.error?.percentage,
    takeProfit.error?.percentage,
    isApproving,
    isAllowanceLoaded,
    needPayTokenApproval,
    fromToken,
    stage,
    isIncrease,
    sidecarEntries,
    tooltipContent,
    onSubmit,
    isMarket,
    isLimit,
    isSwap,
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
