import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { getBridgingOptionsForToken } from "config/bridging";
import { AVALANCHE, BOTANIX, MEGAETH, SettlementChainId } from "config/chains";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getExternalAggregatorSwapUrlFromAddresses } from "config/links";
import { MULTI_CHAIN_DEPOSIT_TRADE_TOKENS } from "config/multichain";
import {
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
} from "context/GmxAccountContext/hooks";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectGasPaymentTokenAllowance,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import {
  selectExternalSwapQuote,
  selectTradeboxFindSwapPath,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxIsStakeOrUnstake,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxMaxLeverage,
  selectTradeboxPayAmount,
  selectTradeboxSelectedPosition,
  selectTradeboxState,
  selectTradeboxTokensAllowance,
  selectTradeboxToToken,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxTradeTypeError } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import { selectExternalSwapQuoteParams } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGmxAccountShowDepositButton } from "domain/multichain/useGmxAccountShowDepositButton";
import { ExpressTxnParams } from "domain/synthetics/express";
import { substractMaxLeverageSlippage } from "domain/synthetics/positions/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { getApprovalRequirements } from "domain/synthetics/tokens/utils";
import { getIncreasePositionAmounts } from "domain/synthetics/trade/utils/increase";
import {
  getCommonError,
  getExpressError,
  getIsMaxLeverageExceeded,
  getNativeGasError,
  takeValidationResult,
  ValidationButtonTooltipName,
  ValidationResult,
} from "domain/synthetics/trade/utils/validation";
import { useApproveToken } from "domain/tokens/useApproveTokens";
import { numericBinarySearch } from "lib/binarySearch";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { formatAmountFree } from "lib/numbers";
import { getByKey } from "lib/objects";
import { sleep } from "lib/sleep";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { getToken, getTokenBySymbol } from "sdk/configs/tokens";
import { ExecutionFee } from "sdk/utils/fees/types";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, TradeType } from "sdk/utils/trade";
import { getNextPositionValuesForIncreaseTrade } from "sdk/utils/trade/increase";
import { mustNeverExist } from "sdk/utils/types";

import { BridgingInfo } from "components/BridgingInfo/BridgingInfo";
import { ValidationBannerErrorContent } from "components/Errors/gasErrors";
import ExternalLink from "components/ExternalLink/ExternalLink";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { tradeModeLabels, tradeTypeLabels } from "../tradeboxConstants";
import { useTradeboxTransactions } from "./useTradeboxTransactions";

interface TradeboxButtonStateOptions {
  account?: string;
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
}

type TradeboxButtonState = {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  bannerErrorContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => Promise<void>;
  slippageInputId: string;
  expressParams?: ExpressTxnParams;
  isExpressLoading: boolean;
  batchParams?: BatchOrderTxnParams;
  totalExecutionFee?: ExecutionFee;
};

export function useTradeboxButtonState({
  account,
  setToTokenInputValue,
}: TradeboxButtonStateOptions): TradeboxButtonState {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();

  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isIncrease } = tradeFlags;
  const { stopLoss, takeProfit } = useSidecarOrders();
  const sidecarEntries = useSidecarEntries();
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);
  const hasOutdatedUi = useHasOutdatedUi();
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const localizedTradeModeLabels = useLocalizedMap(tradeModeLabels);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const { stage, collateralToken, tradeType, setStage } = useSelector(selectTradeboxState);
  const { isLeverageSliderEnabled } = useSettings();
  const { shouldShowDepositButton } = useGmxAccountShowDepositButton();
  const [, setGmxAccountDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setGmxAccountDepositViewTokenInputValue] = useGmxAccountDepositViewTokenInputValue();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const tokensData = useSelector(selectTokensData);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const isStakeOrUnstake = useSelector(selectTradeboxIsStakeOrUnstake);
  const payAmount = useSelector(selectTradeboxPayAmount);
  const payTokenAllowance = useSelector(selectTradeboxTokensAllowance);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);

  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();

  const { approveToken } = useApproveToken();

  const {
    onSubmitWrapOrUnwrap,
    onSubmitStakeOrUnstake,
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
    slippageInputId,
    expressParams,
    batchParams,
    isExpressLoading,
    totalExecutionFee,
  } = useTradeboxTransactions({
    setPendingTxns,
  });

  // TODO move this to a separate hook
  const { tokensToApprove, isAllowanceLoaded } = useMemo(() => {
    if (isFromTokenGmxAccount) {
      return { tokensToApprove: [], isAllowanceLoaded: true };
    }

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
      gasPaymentTokenParams: expressParams?.gasPaymentParams
        ? {
            tokenAddress: gasPaymentToken.address,
            amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
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
    isFromTokenGmxAccount,
    payAmount,
    payTokenAllowance.isLoaded,
    payTokenAllowance.spenderAddress,
    payTokenAllowance.tokensAllowanceData,
    tokenPermits,
  ]);

  const [isApproving, setIsApproving] = useState(false);

  const detectAndSetAvailableMaxLeverage = useDetectAndSetAvailableMaxLeverage({ setToTokenInputValue });

  const tradeError = useSelector(selectTradeboxTradeTypeError);

  const nativeGasError = useMemo((): ValidationResult => {
    if (gasPaymentToken && expressParams?.gasPaymentParams?.gasPaymentTokenAmount !== undefined) {
      return {};
    }

    return getNativeGasError({
      networkFee: totalExecutionFee?.feeTokenAmount,
      nativeBalance: getByKey(tokensData, zeroAddress)?.walletBalance,
    });
  }, [
    expressParams?.gasPaymentParams?.gasPaymentTokenAmount,
    gasPaymentToken,
    tokensData,
    totalExecutionFee?.feeTokenAmount,
  ]);

  const { buttonErrorText, tooltipContent, bannerErrorContent } = useMemo((): {
    buttonErrorText: string | undefined;
    tooltipContent: ReactNode | null;
    bannerErrorContent: ReactNode | null;
  } => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const expressError = getExpressError({
      expressParams,
      tokensData,
    });

    const validationResult = takeValidationResult(commonError, tradeError, expressError, nativeGasError);

    let tooltipContent: ReactNode = null;
    if (validationResult.buttonTooltipName) {
      switch (validationResult.buttonTooltipName) {
        case ValidationButtonTooltipName.maxLeverage: {
          tooltipContent = (
            <>
              {isLeverageSliderEnabled ? (
                <Trans>Decrease leverage to match the max allowed leverage.</Trans>
              ) : (
                <Trans>Decrease size to match the max allowed leverage.</Trans>
              )}{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/#max-leverage">
                <Trans>Read more</Trans>
              </ExternalLink>
              .
              <br />
              <br />
              <span onClick={detectAndSetAvailableMaxLeverage} className="Tradebox-handle">
                <Trans>Set max leverage</Trans>
              </span>
            </>
          );

          break;
        }
        case ValidationButtonTooltipName.liqPriceGtMarkPrice: {
          tooltipContent = (
            <Trans>Position would be immediately liquidated upon execution. Try reducing the size.</Trans>
          );
          break;
        }
        case ValidationButtonTooltipName.noSwapPath: {
          tooltipContent = (
            <NoSwapPathTooltipContent
              collateralToken={collateralToken}
              fromToken={fromToken}
              chainId={chainId}
              toToken={toToken}
            />
          );
          break;
        }

        default:
          mustNeverExist(validationResult.buttonTooltipName);
      }
    }

    const bannerErrorContent = validationResult.bannerErrorName ? (
      <ValidationBannerErrorContent validationBannerErrorName={validationResult.bannerErrorName} chainId={chainId} />
    ) : null;

    return {
      buttonErrorText: validationResult.buttonErrorMessage,
      tooltipContent,
      bannerErrorContent,
    };
  }, [
    chainId,
    account,
    hasOutdatedUi,
    expressParams,
    tokensData,
    tradeError,
    nativeGasError,
    collateralToken,
    fromToken,
    toToken,
    isLeverageSliderEnabled,
    detectAndSetAvailableMaxLeverage,
  ]);

  const onSubmit = useCallback(async () => {
    if (!account || !signer) {
      sendUserAnalyticsConnectWalletClickEvent("ActionButton");
      openConnectModal?.();
      return;
    }

    if (!signer) {
      return;
    }

    if (shouldShowDepositButton) {
      if (fromToken) {
        const isSupportedToDeposit = MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[chainId as SettlementChainId].includes(
          fromToken.address
        );

        if (isSupportedToDeposit) {
          setGmxAccountDepositViewTokenAddress(fromToken.address);
          if (payAmount !== undefined) {
            setGmxAccountDepositViewTokenInputValue(formatAmountFree(payAmount, fromToken.decimals));
          }
        }
      }

      setGmxAccountModalOpen("deposit");

      return;
    }

    if (!isFromTokenGmxAccount && isAllowanceLoaded && tokensToApprove.length) {
      const tokenToApprove = tokensToApprove[0];

      if (!chainId || isApproving || !tokenToApprove) return;

      approveToken({
        tokenAddress: tokenToApprove.tokenAddress,
        chainId,
        signer,
        allowPermit: Boolean(expressParams),
        setIsApproving,
      });

      return;
    }

    setStage("processing");

    let txnPromise: Promise<any>;

    if (isStakeOrUnstake) {
      txnPromise = onSubmitStakeOrUnstake();
    } else if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = Promise.resolve(onSubmitIncreaseOrder());
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    if (expressParams?.subaccount) {
      /**
       * Wait 2 seconds to prevent double click on button
       * waiting for txnPromise may not be enough because it's sometimes resolves very fast
       */
      await sleep(2000);
      setStage("trade");

      return;
    }

    return txnPromise.finally(() => {
      setStage("trade");
    });
  }, [
    account,
    approveToken,
    chainId,
    expressParams,
    fromToken,
    isAllowanceLoaded,
    isApproving,
    isFromTokenGmxAccount,
    isIncrease,
    isStakeOrUnstake,
    isSwap,
    isWrapOrUnwrap,
    onSubmitDecreaseOrder,
    onSubmitIncreaseOrder,
    onSubmitStakeOrUnstake,
    onSubmitSwap,
    onSubmitWrapOrUnwrap,
    openConnectModal,
    payAmount,
    setGmxAccountDepositViewTokenAddress,
    setGmxAccountDepositViewTokenInputValue,
    setGmxAccountModalOpen,
    setStage,
    shouldShowDepositButton,
    signer,
    tokensToApprove,
  ]);

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove]);

  return useMemo((): TradeboxButtonState => {
    const commonState = {
      tooltipContent,
      bannerErrorContent,
      onSubmit,
      slippageInputId,
      expressParams,
      batchParams,
      totalExecutionFee,
      isExpressLoading,
    };

    if (!account && buttonErrorText) {
      return {
        ...commonState,
        text: buttonErrorText,
        disabled: false,
      };
    }

    const isAvalancheGmxAccountWarning = isFromTokenGmxAccount && chainId === AVALANCHE;

    if (isAvalancheGmxAccountWarning) {
      return {
        ...commonState,
        text: t`Not supported`,
        disabled: true,
      };
    }

    if (shouldShowDepositButton) {
      return {
        ...commonState,
        text: t`Deposit`,
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

    if (isTpSlEnabled && (stopLoss.error?.percentage || takeProfit.error?.percentage)) {
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
            {t`Loading Express Trading...`}
            <SpinnerIcon className="ml-4 animate-spin" />
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
            <SpinnerIcon className="ml-4 animate-spin" />
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
        text: t`Creating order...`,
        disabled: true,
      };
    }

    let submitButtonText = "";
    {
      if (buttonErrorText) {
        submitButtonText = buttonErrorText;
      } else {
        const modeLabel = localizedTradeModeLabels[tradeMode];

        if (isSwap) {
          submitButtonText = `${modeLabel}: ${t`Swap`} ${fromToken?.symbol}`;
        } else {
          const actionLabel = isIncrease ? t`increase` : t`decrease`;
          submitButtonText = `${modeLabel}: ${localizedTradeTypeLabels[tradeType!]} ${actionLabel}`;
        }
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
    bannerErrorContent,
    onSubmit,
    slippageInputId,
    expressParams,
    batchParams,
    totalExecutionFee,
    isExpressLoading,
    account,
    buttonErrorText,
    shouldShowDepositButton,
    stopLoss.error?.percentage,
    takeProfit.error?.percentage,
    isApproving,
    tokensToApprove,
    isAllowanceLoaded,
    stage,
    isIncrease,
    sidecarEntries,
    isTpSlEnabled,
    chainId,
    isSwap,
    fromToken?.symbol,
    localizedTradeTypeLabels,
    localizedTradeModeLabels,
    tradeMode,
    tradeType,
    isFromTokenGmxAccount,
  ]);
}

function useDetectAndSetAvailableMaxLeverage({
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

  const { isLeverageSliderEnabled, isSetAcceptablePriceImpactEnabled } = useSettings();

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
  const externalSwapQuoteParams = useSelector(selectExternalSwapQuoteParams);
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);

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
          marketsInfoData,
          chainId,
          externalSwapQuoteParams,
          isSetAcceptablePriceImpactEnabled,
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
          positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
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
    externalSwapQuoteParams,
    chainId,
    marketsInfoData,
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
    isSetAcceptablePriceImpactEnabled,
  ]);
}

function NoSwapPathTooltipContent({
  collateralToken,
  fromToken,
  chainId,
  toToken,
}: {
  collateralToken: TokenData | undefined;
  fromToken: TokenData | undefined;
  chainId: number;
  toToken: TokenData | undefined;
}) {
  const isMegaEth = MEGAETH === chainId;
  const { setFromTokenAddress, setToTokenAddress, setTradeType, setTradeMode } = useSelector(selectTradeboxState);

  const makeHandleSwapClick = useCallback(
    (fromTokenSymbol: string, toTokenSymbol: string) => () => {
      setTradeType(TradeType.Swap);
      setTradeMode(TradeMode.Market);
      setFromTokenAddress(getTokenBySymbol(chainId, fromTokenSymbol)?.address);
      setToTokenAddress(getTokenBySymbol(chainId, toTokenSymbol)?.address);
    },
    [chainId, setFromTokenAddress, setToTokenAddress, setTradeMode, setTradeType]
  );

  if (!fromToken) {
    return <Trans>No swap path available</Trans>;
  }

  if (chainId === BOTANIX) {
    if (collateralToken) {
      return (
        <Trans>
          No swap path available.{" "}
          <span onClick={makeHandleSwapClick(fromToken.symbol, "STBTC")} className="Tradebox-handle">
            Swap {fromToken.symbol} to STBTC
          </span>{" "}
          to use {collateralToken.symbol} as collateral.
        </Trans>
      );
    }

    const swapToTokenSymbol = fromToken.symbol === "STBTC" ? "PBTC" : "STBTC";
    return (
      <Trans>
        No swap path available.{" "}
        <span onClick={makeHandleSwapClick(fromToken.symbol, swapToTokenSymbol)} className="Tradebox-handle">
          Swap {fromToken.symbol} to {swapToTokenSymbol}
        </span>
        , then to {toToken?.symbol}.
      </Trans>
    );
  }

  return (
    <>
      <Trans>
        {collateralToken?.assetSymbol ?? collateralToken?.symbol} is required for collateral.
        <br />
        <br />
        No swap path found for {fromToken?.assetSymbol ?? fromToken?.symbol} to{" "}
        {collateralToken?.assetSymbol ?? collateralToken?.symbol} within GMX.
        <br />
        <br />
        <ExternalLink
          href={getExternalAggregatorSwapUrlFromAddresses(chainId, fromToken?.address, collateralToken?.address)}
        >
          Buy {collateralToken?.assetSymbol ?? collateralToken?.symbol} on {isMegaEth ? "Jumper" : "1inch"}
        </ExternalLink>
        .
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
}
