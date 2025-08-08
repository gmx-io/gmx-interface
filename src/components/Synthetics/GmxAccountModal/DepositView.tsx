import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import { ImSpinner2 } from "react-icons/im";
import Skeleton from "react-loading-skeleton";
import { useLatest } from "react-use";
import { Hex, decodeErrorResult, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { AnyChainId, SettlementChainId, SourceChainId, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT,
  MULTICHAIN_FUNDING_SLIPPAGE_BPS,
  MULTI_CHAIN_TRANSFER_SUPPORTED_TOKENS,
  StargateErrorsAbi,
  getMappedTokenId,
} from "config/multichain";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelector,
} from "context/GmxAccountContext/hooks";
import { selectGmxAccountDepositViewTokenInputAmount } from "context/GmxAccountContext/selectors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMultichainApprovalsActiveListener } from "context/SyntheticsEvents/useMultichainEvents";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendCrossChainDepositTxn } from "domain/multichain/sendCrossChainDepositTxn";
import { sendSameChainDepositTxn } from "domain/multichain/sendSameChainDepositTxn";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useQuoteOft } from "domain/multichain/useQuoteOft";
import { useQuoteOftLimits } from "domain/multichain/useQuoteOftLimits";
import { useQuoteSend } from "domain/multichain/useQuoteSend";
import { getNeedTokenApprove, useTokensAllowanceData, useTokensDataRequest } from "domain/synthetics/tokens";
import { NativeTokenSupportedAddress, approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLeadingDebounce } from "lib/debounce/useLeadingDebounde";
import { helperToast } from "lib/helperToast";
import {
  OrderMetricId,
  initMultichainDepositMetricData,
  sendOrderSimulatedMetric,
  sendOrderSubmittedMetric,
  sendOrderTxnSubmittedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
} from "lib/metrics";
import { USD_DECIMALS, formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT, getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { TxnCallback, TxnEventName, WalletTxnCtx } from "lib/transactions";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { convertTokenAddress, getNativeToken, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";
import { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { useAvailableToTradeAssetMultichain, useMultichainTokensRequest } from "./hooks";
import { wrapChainAction } from "./wrapChainAction";

const useIsFirstDeposit = () => {
  const [enabled, setEnabled] = useState(true);
  const [isFirstDeposit, setIsFirstDeposit] = useState(false);
  const { fundingHistory, isLoading } = useGmxAccountFundingHistory({ enabled });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (fundingHistory === undefined || fundingHistory.length !== 0) {
      return;
    }

    setEnabled(false);
    const hasDeposit = fundingHistory.some((funding) => funding.operation === "deposit");
    if (!hasDeposit) {
      setIsFirstDeposit(true);
    }
  }, [fundingHistory, isLoading]);

  return isFirstDeposit;
};

export const DepositView = () => {
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const { address: account, chainId: walletChainId } = useAccount();
  const [depositViewChain, setDepositViewChain] = useGmxAccountDepositViewChain();
  const walletSigner = useEthersSigner({ chainId: srcChainId });
  const { provider: sourceChainProvider } = useJsonRpcProvider(depositViewChain);

  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();

  const [depositViewTokenAddress, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [inputValue, setInputValue] = useGmxAccountDepositViewTokenInputValue();
  const {
    tokenChainDataArray: multichainTokens,
    isPriceDataLoading,
    isBalanceDataLoading,
  } = useMultichainTokensRequest();
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMultichainSubmittedDeposit } = useSyntheticsEvents();

  const selectedToken =
    depositViewTokenAddress !== undefined ? getToken(settlementChainId, depositViewTokenAddress) : undefined;

  const { tokensData } = useTokensDataRequest(settlementChainId, depositViewChain);
  const selectedTokenData = getByKey(tokensData, depositViewTokenAddress);

  const selectedTokenSourceChainTokenId =
    depositViewTokenAddress !== undefined && depositViewChain !== undefined
      ? getMappedTokenId(settlementChainId as SettlementChainId, depositViewTokenAddress, depositViewChain)
      : undefined;

  const unwrappedSelectedTokenAddress =
    depositViewTokenAddress !== undefined
      ? convertTokenAddress(settlementChainId, depositViewTokenAddress, "native")
      : undefined;

  const selectedTokenChainData = useMemo(() => {
    if (selectedToken === undefined) return undefined;
    return multichainTokens.find(
      (token) => token.address === selectedToken.address && token.sourceChainId === depositViewChain
    );
  }, [selectedToken, multichainTokens, depositViewChain]);

  const selectedTokenSourceChainBalance = selectedTokenChainData?.sourceChainBalance;
  const nativeTokenSourceChainBalance = useMemo(() => {
    if (multichainTokens === undefined) return undefined;
    return multichainTokens.find((token) => token.address === zeroAddress)?.sourceChainBalance;
  }, [multichainTokens]);

  const realInputAmount = useGmxAccountSelector(selectGmxAccountDepositViewTokenInputAmount);

  /**
   * Debounced
   */
  const inputAmount = useLeadingDebounce(realInputAmount);
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedTokenChainData?.sourceChainPrices?.maxPrice)
    : undefined;
  const latestInputAmountUsd = useLatest(inputAmountUsd);

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedTokenSourceChainBalance === undefined) {
      return;
    }

    const isNative = unwrappedSelectedTokenAddress === zeroAddress;
    if (isNative) {
      const buffer = convertToTokenAmount(
        10n * 10n ** BigInt(USD_DECIMALS),
        selectedToken.decimals,
        getMidPrice(selectedTokenChainData?.sourceChainPrices ?? { minPrice: 0n, maxPrice: 0n })
      )!;

      const maxAmount = bigMath.max(selectedTokenSourceChainBalance - buffer, 0n);

      setInputValue(formatAmountFree(maxAmount, selectedToken.decimals));
      return;
    }

    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [
    selectedToken,
    selectedTokenChainData?.sourceChainPrices,
    selectedTokenSourceChainBalance,
    setInputValue,
    unwrappedSelectedTokenAddress,
  ]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const { nextGmxAccountBalanceUsd, nextTokenGmxAccountBalance } = useMemo((): {
    nextGmxAccountBalanceUsd?: bigint;
    nextTokenGmxAccountBalance?: bigint;
  } => {
    if (inputAmount === undefined || inputAmountUsd === undefined) {
      return EMPTY_OBJECT;
    }

    const nextGmxAccountBalanceUsd = (gmxAccountUsd ?? 0n) + inputAmountUsd;
    const nextTokenGmxAccountBalance = (selectedTokenData?.gmxAccountBalance ?? 0n) + inputAmount;

    return {
      nextGmxAccountBalanceUsd,
      nextTokenGmxAccountBalance,
    };
  }, [gmxAccountUsd, inputAmount, inputAmountUsd, selectedTokenData?.gmxAccountBalance]);

  const spenderAddress =
    // Only when DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
    (depositViewChain as AnyChainId) === settlementChainId
      ? getContract(settlementChainId, "SyntheticsRouter")
      : selectedTokenSourceChainTokenId?.stargate;

  useMultichainApprovalsActiveListener(depositViewChain, "multichain-deposit-view");

  const tokensAllowanceResult = useTokensAllowanceData(depositViewChain, {
    spenderAddress,
    tokenAddresses: selectedTokenSourceChainTokenId ? [selectedTokenSourceChainTokenId.address] : [],
    skip: depositViewChain === undefined,
  });
  const tokensAllowanceData = depositViewChain !== undefined ? tokensAllowanceResult.tokensAllowanceData : undefined;

  const needTokenApprove = getNeedTokenApprove(
    tokensAllowanceData,
    depositViewTokenAddress === zeroAddress ? zeroAddress : selectedTokenSourceChainTokenId?.address,
    inputAmount,
    EMPTY_ARRAY
  );

  const handleApprove = useCallback(async () => {
    if (!depositViewTokenAddress || inputAmount === undefined || !spenderAddress || !depositViewChain) {
      helperToast.error("Approve failed");
      return;
    }

    const isNative = depositViewTokenAddress === zeroAddress;

    if (isNative) {
      helperToast.error("Native token cannot be approved");
      return;
    }

    if (!selectedTokenSourceChainTokenId) {
      helperToast.error("Approve failed");
      return;
    }

    await wrapChainAction(depositViewChain, async (signer) => {
      await approveTokens({
        chainId: depositViewChain,
        tokenAddress: selectedTokenSourceChainTokenId.address,
        signer: signer,
        spender: spenderAddress,
        onApproveSubmitted: () => setIsApproving(true),
        setIsApproving: noop,
        permitParams: undefined,
        approveAmount: undefined,
      });
    });
  }, [depositViewTokenAddress, inputAmount, spenderAddress, selectedTokenSourceChainTokenId, depositViewChain]);

  useEffect(() => {
    if (!needTokenApprove && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needTokenApprove]);

  const isInputEmpty = inputAmount === undefined || inputAmount <= 0n;

  const { composeGas } = useMultichainDepositNetworkComposeGas({
    tokenAddress: depositViewTokenAddress,
  });

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (
      !account ||
      inputAmount === undefined ||
      inputAmount <= 0n ||
      depositViewChain === undefined ||
      composeGas === undefined
    ) {
      return;
    }

    return getMultichainTransferSendParams({
      account,
      amount: inputAmount,
      srcChainId: depositViewChain,
      composeGas,
      dstChainId: settlementChainId,
      isDeposit: true,
    });
  }, [account, inputAmount, depositViewChain, composeGas, settlementChainId]);

  const quoteOft = useQuoteOft({
    sendParams: sendParamsWithoutSlippage,
    fromStargateAddress: selectedTokenSourceChainTokenId?.stargate,
    fromChainProvider: sourceChainProvider,
    fromChainId: depositViewChain,
    toChainId: settlementChainId,
  });

  const { isBelowLimit, lowerLimitFormatted, isAboveLimit, upperLimitFormatted } = useQuoteOftLimits({
    quoteOft,
    inputAmount,
    isStable: selectedToken?.isStable,
    decimals: selectedTokenSourceChainTokenId?.decimals,
  });

  const sendParamsWithSlippage: SendParamStruct | undefined = useMemo(() => {
    if (!quoteOft || !sendParamsWithoutSlippage) {
      return undefined;
    }

    const { receipt } = quoteOft;

    const minAmountLD = applySlippageToMinOut(MULTICHAIN_FUNDING_SLIPPAGE_BPS, receipt.amountReceivedLD as bigint);

    const newSendParams: SendParamStruct = {
      ...sendParamsWithoutSlippage,
      minAmountLD,
    };

    return newSendParams;
  }, [sendParamsWithoutSlippage, quoteOft]);

  const quoteSend = useQuoteSend({
    sendParams: sendParamsWithSlippage,
    fromStargateAddress: selectedTokenSourceChainTokenId?.stargate,
    fromChainProvider: sourceChainProvider,
    fromChainId: depositViewChain,
    toChainId: settlementChainId,
    composeGas,
  });

  const { networkFeeUsd, protocolFeeUsd } = useMultichainQuoteFeeUsd({
    quoteSend,
    quoteOft,
    unwrappedTokenAddress: unwrappedSelectedTokenAddress,
    srcChainId: depositViewChain,
  });

  const isFirstDeposit = useIsFirstDeposit();
  const latestIsFirstDeposit = useLatest(isFirstDeposit);

  const sameChainCallback: TxnCallback<WalletTxnCtx> = useCallback(
    (txnEvent) => {
      if (txnEvent.event === TxnEventName.Sent) {
        helperToast.success("Deposit sent", { toastId: "same-chain-gmx-account-deposit" });
        setIsVisibleOrView("main");
      } else if (txnEvent.event === TxnEventName.Error) {
        helperToast.error("Deposit failed", { toastId: "same-chain-gmx-account-deposit" });
      }
    },
    [setIsVisibleOrView]
  );

  const handleSameChainDeposit = useCallback(async () => {
    if (!account || !depositViewTokenAddress || inputAmount === undefined || !walletSigner) {
      return;
    }

    await sendSameChainDepositTxn({
      chainId: settlementChainId as SettlementChainId,
      signer: walletSigner,
      tokenAddress: depositViewTokenAddress,
      amount: inputAmount,
      account,
      callback: sameChainCallback,
    });
  }, [account, depositViewTokenAddress, inputAmount, sameChainCallback, settlementChainId, walletSigner]);

  const makeCrossChainCallback = useCallback(
    (params: {
      depositViewChain: SourceChainId;
      metricId: OrderMetricId;
      sendParams: SendParamStruct;
      tokenAddress: string;
    }): TxnCallback<WalletTxnCtx> =>
      (txnEvent) => {
        if (txnEvent.event === TxnEventName.Error) {
          setIsSubmitting(false);
          let prettyError = txnEvent.data.error;
          const data = txnEvent.data.error.info?.error?.data as Hex | undefined;

          if (data) {
            const error = decodeErrorResult({
              abi: StargateErrorsAbi,
              data,
            });

            prettyError = new Error(JSON.stringify(error, null, 2));
            prettyError.name = error.errorName;

            const toastParams = getTxnErrorToast(
              params.depositViewChain,
              {
                errorMessage: JSON.stringify(error, null, 2),
              },
              { defaultMessage: t`Deposit failed` }
            );

            helperToast.error(toastParams.errorContent, {
              autoClose: toastParams.autoCloseToast,
              toastId: "gmx-account-deposit",
            });
          } else {
            const toastParams = getTxnErrorToast(params.depositViewChain, txnEvent.data.error, {
              defaultMessage: t`Deposit failed`,
            });

            helperToast.error(toastParams.errorContent, {
              autoClose: toastParams.autoCloseToast,
              toastId: "gmx-account-deposit",
            });
          }

          sendTxnErrorMetric(params.metricId, prettyError, "unknown");
        } else if (txnEvent.event === TxnEventName.Sent) {
          setIsVisibleOrView("main");
          setIsSubmitting(false);

          sendTxnSentMetric(params.metricId);

          if (txnEvent.data.type === "wallet") {
            setMultichainSubmittedDeposit({
              amount: params.sendParams.amountLD as bigint,
              settlementChainId,
              sourceChainId: params.depositViewChain,
              tokenAddress: params.tokenAddress,
              sentTxn: txnEvent.data.transactionHash,
            });
          }
        } else if (txnEvent.event === TxnEventName.Simulated) {
          sendOrderSimulatedMetric(params.metricId);
        } else if (txnEvent.event === TxnEventName.Sending) {
          sendOrderTxnSubmittedMetric(params.metricId);
        }
      },
    [setIsVisibleOrView, setMultichainSubmittedDeposit, settlementChainId]
  );

  const handleCrossChainDeposit = useCallback(async () => {
    if (
      !depositViewTokenAddress ||
      !account ||
      inputAmount === undefined ||
      inputAmount <= 0n ||
      depositViewChain === undefined ||
      quoteSend === undefined ||
      sendParamsWithSlippage === undefined ||
      selectedTokenSourceChainTokenId === undefined
    ) {
      helperToast.error(t`Deposit failed`);
      return;
    }

    setIsSubmitting(true);

    const metricData = initMultichainDepositMetricData({
      assetSymbol: selectedToken!.symbol,
      sizeInUsd: latestInputAmountUsd.current!,
      isFirstDeposit: latestIsFirstDeposit.current,
      settlementChain: settlementChainId,
      sourceChain: depositViewChain,
    });

    sendOrderSubmittedMetric(metricData.metricId);
    await wrapChainAction(depositViewChain, async (signer) => {
      await sendCrossChainDepositTxn({
        chainId: depositViewChain,
        signer,
        tokenAddress: selectedTokenSourceChainTokenId.address,
        stargateAddress: selectedTokenSourceChainTokenId.stargate,
        amount: inputAmount,
        quoteSend,
        sendParams: sendParamsWithSlippage,
        account,
        callback: makeCrossChainCallback({
          depositViewChain,
          metricId: metricData.metricId,
          sendParams: sendParamsWithSlippage,
          tokenAddress: depositViewTokenAddress,
        }),
      });
    });
  }, [
    account,
    depositViewChain,
    depositViewTokenAddress,
    inputAmount,
    latestInputAmountUsd,
    latestIsFirstDeposit,
    makeCrossChainCallback,
    quoteSend,
    selectedToken,
    selectedTokenSourceChainTokenId,
    sendParamsWithSlippage,
    settlementChainId,
  ]);

  const handleDeposit = useCallback(async () => {
    if (DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT && (walletChainId as SettlementChainId) === settlementChainId) {
      await handleSameChainDeposit();
    } else {
      await handleCrossChainDeposit();
    }
  }, [walletChainId, settlementChainId, handleSameChainDeposit, handleCrossChainDeposit]);

  useEffect(
    function fallbackDepositViewChain() {
      if (depositViewChain !== undefined || isVisibleOrView === false) {
        return;
      }

      if (srcChainId !== undefined) {
        setDepositViewChain(srcChainId);
      }
    },
    [depositViewChain, isVisibleOrView, setDepositViewChain, srcChainId, walletChainId]
  );

  useEffect(
    function fallbackTokenOnSourceChain() {
      if (isVisibleOrView === false) {
        return;
      }

      const isInvalidTokenAddress =
        depositViewTokenAddress === undefined ||
        !MULTI_CHAIN_TRANSFER_SUPPORTED_TOKENS[settlementChainId as SettlementChainId]
          .map((token) => convertTokenAddress(settlementChainId, token, "native"))
          .includes(depositViewTokenAddress as NativeTokenSupportedAddress);

      if (
        !isPriceDataLoading &&
        multichainTokens.length > 0 &&
        depositViewChain !== undefined &&
        isInvalidTokenAddress
      ) {
        const preferredToken = multichainTokens.find(
          (sourceChainToken) =>
            sourceChainToken.sourceChainId === depositViewChain &&
            sourceChainToken.address === CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[settlementChainId]
        );

        if (
          preferredToken &&
          preferredToken.sourceChainBalance !== undefined &&
          preferredToken.sourceChainBalance >= 0n
        ) {
          setDepositViewTokenAddress(preferredToken.address);
          return;
        }

        let maxBalanceTokenAddress: string | undefined = undefined;
        let maxSourceChainBalanceUsd: bigint | undefined = undefined;

        for (const token of multichainTokens) {
          if (token.sourceChainId !== depositViewChain) {
            continue;
          }

          const balanceUsd = token.sourceChainPrices
            ? convertToUsd(token.sourceChainBalance, token.sourceChainDecimals, getMidPrice(token.sourceChainPrices))
            : 0n;
          if (
            maxBalanceTokenAddress === undefined ||
            maxSourceChainBalanceUsd === undefined ||
            (balanceUsd !== undefined && balanceUsd > maxSourceChainBalanceUsd)
          ) {
            maxBalanceTokenAddress = token.address;
            maxSourceChainBalanceUsd = balanceUsd;
          }
        }

        if (maxBalanceTokenAddress !== undefined) {
          setDepositViewTokenAddress(maxBalanceTokenAddress);
          return;
        }

        if (preferredToken) {
          setDepositViewTokenAddress(preferredToken.address);
        }
      }
    },
    [
      depositViewTokenAddress,
      isPriceDataLoading,
      multichainTokens,
      setDepositViewTokenAddress,
      settlementChainId,
      depositViewChain,
      isVisibleOrView,
    ]
  );

  const tokenSelectorDisabled = !isBalanceDataLoading && multichainTokens.length === 0;

  let buttonState: {
    text: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  } = {
    text: t`Deposit`,
    onClick: handleDeposit,
  };

  if (isApproving) {
    buttonState = {
      text: (
        <>
          <Trans>Approving</Trans>
          <ImSpinner2 className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (tokenSelectorDisabled) {
    buttonState = {
      text:
        depositViewChain !== undefined
          ? t`No assets available for deposit on ${getChainName(depositViewChain)}`
          : t`No assets available for deposit`,
      disabled: true,
    };
  } else if (needTokenApprove) {
    buttonState = {
      text: t`Allow ${selectedToken?.symbol} to be spent`,
      onClick: handleApprove,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: (
        <>
          <Trans>Depositing</Trans>
          <ImSpinner2 className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (isInputEmpty) {
    buttonState = {
      text: t`Enter deposit amount`,
      disabled: true,
    };
  } else if (selectedTokenSourceChainBalance !== undefined && inputAmount > selectedTokenSourceChainBalance) {
    buttonState = {
      text: t`Insufficient balance`,
      disabled: true,
    };
  } else if (nativeTokenSourceChainBalance !== undefined && quoteSend !== undefined) {
    const isNative = unwrappedSelectedTokenAddress === zeroAddress;
    const value = isNative ? inputAmount : 0n;

    if (quoteSend.nativeFee + value > nativeTokenSourceChainBalance) {
      const nativeTokenSymbol = getNativeToken(settlementChainId)?.symbol;
      buttonState = {
        text: t`Insufficient ${nativeTokenSymbol} balance`,
        disabled: true,
      };
    }
  }

  let placeholder = "";
  if ((inputValue === undefined || inputValue === "") && selectedToken?.symbol) {
    placeholder = `0.0 ${selectedToken.symbol}`;
  } else if (selectedToken?.symbol) {
    placeholder = selectedToken.symbol;
  }

  return (
    <div className="flex grow flex-col overflow-y-auto p-16">
      <div className="flex flex-col gap-20">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">
            <Trans>Asset</Trans>
          </div>
          {!tokenSelectorDisabled ? (
            <div
              tabIndex={0}
              role="button"
              onClick={() => {
                setIsVisibleOrView("selectAssetToDeposit");
              }}
              className="flex items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700"
            >
              <div className="flex items-center gap-8">
                {selectedToken ? (
                  <>
                    <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                    <span className="text-body-large">{selectedToken.symbol}</span>
                  </>
                ) : depositViewChain !== undefined ? (
                  <>
                    <Skeleton
                      baseColor="#B4BBFF1A"
                      highlightColor="#B4BBFF1A"
                      width={20}
                      height={20}
                      borderRadius={10}
                    />
                    <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                  </>
                ) : (
                  <span className="text-slate-100">
                    <Trans>Pick an asset to deposit</Trans>
                  </span>
                )}
              </div>
              <BiChevronRight className="size-20 text-slate-100" />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12">
              <div className="flex items-center gap-8">
                <span className="text-slate-100">
                  {depositViewChain !== undefined ? (
                    <Trans>No assets available for deposit on {getChainName(depositViewChain)}</Trans>
                  ) : (
                    <Trans>No assets available for deposit</Trans>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
        {depositViewChain !== undefined && (
          <div className="flex flex-col gap-4">
            <div className="text-body-small text-slate-100">
              <Trans>From Network</Trans>
            </div>
            <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
              <img src={getChainIcon(depositViewChain)} alt={getChainName(depositViewChain)} className="size-20" />
              <span className="text-body-large text-slate-100">{getChainName(depositViewChain)}</span>
            </div>
          </div>
        )}

        <div className={cx("flex flex-col gap-4", { invisible: depositViewTokenAddress === undefined })}>
          <div className="text-body-small flex items-center justify-between gap-4 text-slate-100">
            <Trans>Deposit</Trans>
            {selectedTokenSourceChainBalance !== undefined && selectedToken !== undefined && (
              <div>
                <Trans>Available:</Trans>{" "}
                {formatBalanceAmount(selectedTokenSourceChainBalance, selectedToken.decimals, selectedToken.symbol, {
                  isStable: selectedToken.isStable,
                })}
              </div>
            )}
          </div>
          <div className="text-body-large relative">
            <NumberInput
              value={inputValue}
              onValueChange={(e) => setInputValue(e.target.value)}
              className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72"
            />
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">
                {inputValue}
                {inputValue === "" || inputValue === undefined ? "" : " "}
              </div>
              <div className="font-[RelativeNumber] text-slate-100">{placeholder}</div>
            </div>
            <button
              className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
              onClick={handleMaxButtonClick}
            >
              <Trans>MAX</Trans>
            </button>
          </div>
          <div className="text-body-small text-slate-100">{formatUsd(inputAmountUsd ?? 0n)}</div>
        </div>
      </div>

      {isAboveLimit && (
        <AlertInfoCard type="warning" className="mt-8">
          <Trans>
            The amount you are trying to deposit exceeds the limit. Please try an amount smaller than{" "}
            {upperLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      {isBelowLimit && (
        <AlertInfoCard type="warning" className="mt-8">
          <Trans>
            The amount you are trying to deposit is below the limit. Please try an amount larger than{" "}
            {lowerLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      <div className="h-32 shrink-0 grow" />

      <div className="mb-16 flex flex-col gap-14">
        <SyntheticsInfoRow
          label={<Trans>Network Fee</Trans>}
          value={networkFeeUsd !== undefined ? formatUsd(networkFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label={<Trans>Deposit Fee</Trans>}
          value={protocolFeeUsd !== undefined ? formatUsd(protocolFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label={<Trans>GMX Balance</Trans>}
          value={<ValueTransition from={formatUsd(gmxAccountUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />}
        />
        <SyntheticsInfoRow
          label={<Trans>Asset Balance</Trans>}
          value={
            <ValueTransition
              from={
                selectedTokenData !== undefined && selectedTokenData.gmxAccountBalance !== undefined
                  ? formatBalanceAmount(
                      selectedTokenData.gmxAccountBalance,
                      selectedTokenData.decimals,
                      selectedTokenData.symbol,
                      { isStable: selectedTokenData.isStable }
                    )
                  : undefined
              }
              to={
                nextTokenGmxAccountBalance !== undefined && selectedTokenData !== undefined
                  ? formatBalanceAmount(
                      nextTokenGmxAccountBalance,
                      selectedTokenData.decimals,
                      selectedTokenData.symbol,
                      { isStable: selectedTokenData.isStable }
                    )
                  : undefined
              }
            />
          }
        />
      </div>

      <Button variant="primary" className="w-full" onClick={buttonState.onClick} disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </div>
  );
};
