import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useLatest } from "react-use";
import { Hex, decodeErrorResult, encodeEventTopics, toHex, zeroAddress } from "viem";
import { useAccount, useChains } from "wagmi";

import {
  AnyChainId,
  AVALANCHE,
  SettlementChainId,
  SourceChainId,
  getChainName,
  getViemChain,
  isTestnetChain,
} from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  MULTICHAIN_FUNDING_SLIPPAGE_BPS,
  MULTI_CHAIN_DEPOSIT_TRADE_TOKENS,
  StargateErrorsAbi,
  getMappedTokenId,
} from "config/multichain";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransferGuid,
  useGmxAccountSelector,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { selectGmxAccountDepositViewTokenInputAmount } from "context/GmxAccountContext/selectors";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMultichainApprovalsActiveListener } from "context/SyntheticsEvents/useMultichainEvents";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { isStringEqualInsensitive, matchLogRequest } from "domain/multichain/progress/LongCrossChainTask";
import { sendCrossChainDepositTxn } from "domain/multichain/sendCrossChainDepositTxn";
import { estimateSameChainDepositGas, sendSameChainDepositTxn } from "domain/multichain/sendSameChainDepositTxn";
import type { SendParam } from "domain/multichain/types";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useNativeTokenBalance } from "domain/multichain/useNativeTokenBalance";
import { useQuoteOft } from "domain/multichain/useQuoteOft";
import { useQuoteOftLimits } from "domain/multichain/useQuoteOftLimits";
import { useQuoteSendNativeFee } from "domain/multichain/useQuoteSend";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
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
import { USD_DECIMALS, adjustForDecimals, formatAmountFree, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT, getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { TxnCallback, TxnEventName, WalletTxnCtx } from "lib/transactions";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { useIsGeminiWallet } from "lib/wallets/useIsGeminiWallet";
import { abis } from "sdk/abis";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { calculateNetworkFeeDetails } from "./calculateNetworkFeeDetails";
import { useAvailableToTradeAssetMultichain, useMultichainTradeTokensRequest } from "./hooks";
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

  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const [depositViewChain, setDepositViewChain] = useGmxAccountDepositViewChain();
  const { provider: sourceChainProvider } = useJsonRpcProvider(depositViewChain);

  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const [depositViewTokenAddress, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [inputValue, setInputValue] = useGmxAccountDepositViewTokenInputValue();
  const {
    tokenChainDataArray: multichainTokens,
    isPriceDataLoading,
    isBalanceDataLoading,
  } = useMultichainTradeTokensRequest(settlementChainId, account);
  const { tokensData: settlementChainTokensData } = useTokensDataRequest(settlementChainId, depositViewChain);
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldSendCrossChainDepositWhenLoaded, setShouldSendCrossChainDepositWhenLoaded] = useState(false);

  const { setMultichainSubmittedDeposit, setMultichainFundingPendingId } = useSyntheticsEvents();

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
    if (selectedToken === undefined) {
      return undefined;
    }

    if (depositViewChain === settlementChainId) {
      const settlementChainTokenData = getByKey(settlementChainTokensData, selectedToken.address);
      if (!settlementChainTokenData) {
        return undefined;
      }
      return {
        ...settlementChainTokenData,
        sourceChainId: depositViewChain,
        sourceChainDecimals: settlementChainTokenData?.decimals,
        sourceChainPrices: settlementChainTokenData?.prices,
        sourceChainBalance: settlementChainTokenData?.walletBalance,
      };
    }

    return multichainTokens.find(
      (token) => token.address === selectedToken.address && token.sourceChainId === depositViewChain
    );
  }, [selectedToken, depositViewChain, settlementChainId, multichainTokens, settlementChainTokensData]);

  const selectedTokenSourceChainBalance = selectedTokenChainData?.sourceChainBalance;
  const selectedTokenSourceChainDecimals = selectedTokenChainData?.sourceChainDecimals;

  const viemChains = useChains();
  const depositViewViemChain = useMemo(
    () =>
      depositViewChain !== undefined && viemChains.length > 0
        ? viemChains.find((chain) => chain.id === depositViewChain)
        : undefined,
    [viemChains, depositViewChain]
  );

  const nativeTokenSourceChainBalance = useNativeTokenBalance(depositViewChain, account);

  const realInputAmount = useGmxAccountSelector(selectGmxAccountDepositViewTokenInputAmount);

  /**
   * Debounced
   */
  const inputAmount = useLeadingDebounce(realInputAmount);
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedTokenChainData?.sourceChainPrices?.maxPrice)
    : undefined;
  const latestInputAmountUsd = useLatest(inputAmountUsd);

  const amountLD =
    inputAmount !== undefined && selectedTokenSourceChainDecimals !== undefined && selectedToken?.decimals !== undefined
      ? (inputAmount * 10n ** BigInt(selectedTokenSourceChainDecimals)) / 10n ** BigInt(selectedToken?.decimals)
      : undefined;

  const handleMaxButtonClick = useCallback(() => {
    if (
      selectedToken === undefined ||
      selectedTokenSourceChainBalance === undefined ||
      selectedTokenSourceChainDecimals === undefined
    ) {
      return;
    }

    const isNative = unwrappedSelectedTokenAddress === zeroAddress;
    if (isNative) {
      const buffer = convertToTokenAmount(
        10n * 10n ** BigInt(USD_DECIMALS),
        selectedToken.decimals,
        getMidPrice(selectedTokenChainData?.sourceChainPrices ?? { minPrice: 0n, maxPrice: 0n })
      )!;

      let amount = selectedTokenSourceChainBalance;

      if (selectedTokenSourceChainBalance > buffer) {
        const maxAmount = bigMath.max(selectedTokenSourceChainBalance - buffer, 0n);
        amount = maxAmount;
      }

      setInputValue(formatAmountFree(amount, selectedToken.decimals));
      return;
    }

    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedTokenSourceChainDecimals));
  }, [
    selectedToken,
    selectedTokenChainData?.sourceChainPrices,
    selectedTokenSourceChainBalance,
    selectedTokenSourceChainDecimals,
    setInputValue,
    unwrappedSelectedTokenAddress,
  ]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const { nextGmxAccountBalanceUsd } = useMemo((): {
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

  const sourceChainTokenToApproveAddress: string | undefined = useMemo(() => {
    if (depositViewChain === settlementChainId) {
      return depositViewTokenAddress;
    }
    return selectedTokenSourceChainTokenId?.address;
  }, [depositViewChain, depositViewTokenAddress, selectedTokenSourceChainTokenId?.address, settlementChainId]);

  const tokensAllowanceResult = useTokensAllowanceData(depositViewChain, {
    spenderAddress,
    tokenAddresses: sourceChainTokenToApproveAddress ? [sourceChainTokenToApproveAddress] : [],
    skip: depositViewChain === undefined,
  });
  const tokensAllowanceData = depositViewChain !== undefined ? tokensAllowanceResult.tokensAllowanceData : undefined;

  const needTokenApprove = getNeedTokenApprove(
    tokensAllowanceData,
    sourceChainTokenToApproveAddress,
    amountLD,
    EMPTY_ARRAY
  );

  const handleApprove = useCallback(async () => {
    if (!depositViewTokenAddress || amountLD === undefined || !spenderAddress || !depositViewChain) {
      helperToast.error(t`Approval failed`);
      return;
    }

    const isNative = depositViewTokenAddress === zeroAddress;

    if (isNative) {
      helperToast.error(t`Native token cannot be approved`);
      return;
    }

    if (!sourceChainTokenToApproveAddress) {
      helperToast.error(t`Approval failed`);
      return;
    }

    await wrapChainAction(depositViewChain, setSettlementChainId, async (signer) => {
      await approveTokens({
        chainId: depositViewChain,
        tokenAddress: sourceChainTokenToApproveAddress,
        signer: signer,
        spender: spenderAddress,
        onApproveSubmitted: () => setIsApproving(true),
        setIsApproving: noop,
        permitParams: undefined,
        approveAmount: amountLD,
      });
    });
  }, [
    depositViewTokenAddress,
    amountLD,
    spenderAddress,
    depositViewChain,
    sourceChainTokenToApproveAddress,
    setSettlementChainId,
  ]);

  useEffect(() => {
    if (!needTokenApprove && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needTokenApprove]);

  const isInputEmpty = inputAmount === undefined || inputAmount <= 0n || amountLD === undefined || amountLD <= 0n;

  const { composeGas } = useMultichainDepositNetworkComposeGas({
    tokenAddress: depositViewTokenAddress,
  });

  const sendParamsWithoutSlippage: SendParam | undefined = useMemo(() => {
    if (
      !account ||
      amountLD === undefined ||
      amountLD <= 0n ||
      depositViewChain === undefined ||
      composeGas === undefined
    ) {
      return;
    }

    return getMultichainTransferSendParams({
      account,
      amountLD,
      srcChainId: depositViewChain,
      composeGas,
      dstChainId: settlementChainId,
      isToGmx: true,
    });
  }, [account, amountLD, depositViewChain, composeGas, settlementChainId]);

  const quoteOft = useQuoteOft({
    sendParams: sendParamsWithoutSlippage,
    fromStargateAddress: selectedTokenSourceChainTokenId?.stargate,
    fromChainProvider: sourceChainProvider,
    fromChainId: depositViewChain,
    toChainId: settlementChainId,
  });

  const { isBelowLimit, lowerLimitFormatted, isAboveLimit, upperLimitFormatted } = useQuoteOftLimits({
    quoteOft,
    amountLD,
    isStable: selectedToken?.isStable,
    decimals: selectedTokenSourceChainTokenId?.decimals,
  });

  const sendParamsWithSlippage: SendParam | undefined = useMemo(() => {
    if (!quoteOft || !sendParamsWithoutSlippage) {
      return undefined;
    }

    const { receipt } = quoteOft;

    const minAmountLD = applySlippageToMinOut(MULTICHAIN_FUNDING_SLIPPAGE_BPS, receipt.amountReceivedLD as bigint);

    const newSendParams: SendParam = {
      ...sendParamsWithoutSlippage,
      minAmountLD,
    };

    return newSendParams;
  }, [sendParamsWithoutSlippage, quoteOft]);

  const quoteSendNativeFee = useQuoteSendNativeFee({
    sendParams: sendParamsWithSlippage,
    fromStargateAddress: selectedTokenSourceChainTokenId?.stargate,
    fromChainId: depositViewChain,
    toChainId: settlementChainId,
    composeGas,
  });

  const { networkFee, networkFeeUsd, protocolFeeAmount, protocolFeeUsd } = useMultichainQuoteFeeUsd({
    quoteSendNativeFee,
    quoteOft,
    unwrappedTokenAddress: unwrappedSelectedTokenAddress,
    sourceChainId: depositViewChain,
    targetChainId: settlementChainId,
  });

  const gasPrice = useGasPrice(settlementChainId);

  const sameChainNetworkFeeAsyncResult = useThrottledAsync(
    async ({ params }) => {
      const client = getPublicClientWithRpc(params.settlementChainId);

      return estimateSameChainDepositGas({
        chainId: params.settlementChainId as SettlementChainId,
        client,
        tokenAddress: params.depositViewTokenAddress,
        amount: params.inputAmount,
        account: params.account,
      });
    },
    {
      params:
        account && depositViewTokenAddress && inputAmount !== undefined && settlementChainId
          ? {
              account,
              depositViewTokenAddress,
              inputAmount,
              settlementChainId,
            }
          : undefined,
    }
  );

  const sameChainNetworkFeeDetails = useMemo(
    () =>
      calculateNetworkFeeDetails({
        gasLimit: sameChainNetworkFeeAsyncResult.data,
        gasPrice,
        tokensData: settlementChainTokensData,
      }),
    [sameChainNetworkFeeAsyncResult.data, gasPrice, settlementChainTokensData]
  );

  const isFirstDeposit = useIsFirstDeposit();
  const latestIsFirstDeposit = useLatest(isFirstDeposit);

  const subaccountState = useSubaccountContext();

  const isGeminiWallet = useIsGeminiWallet();
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();
  const isExpressTradingDisabled = isNonEoaAccountOnAnyChain || isGeminiWallet;
  const hasOutdatedUi = useHasOutdatedUi();

  const sameChainCallback: TxnCallback<WalletTxnCtx> = useCallback(
    (txnEvent) => {
      if (!account) {
        return;
      }

      if (txnEvent.event === TxnEventName.Sent) {
        helperToast.success("Deposit sent", { toastId: "same-chain-gmx-account-deposit" });
        setIsVisibleOrView("main");
        setIsSubmitting(false);
        if (txnEvent.data.type === "wallet" && depositViewTokenAddress && inputAmount !== undefined) {
          const txnHash = txnEvent.data.transactionHash;
          const mockId = setMultichainSubmittedDeposit({
            amount: inputAmount,
            settlementChainId,
            sourceChainId: 0,
            tokenAddress: convertTokenAddress(settlementChainId, depositViewTokenAddress, "wrapped"),
            sentTxn: txnHash,
          });

          if (!mockId) {
            return;
          }

          getPublicClientWithRpc(settlementChainId)
            .waitForTransactionReceipt({
              hash: txnHash,
            })
            .then((receipt) => {
              const bridgeInEvent = receipt.logs.find(
                (log) =>
                  isStringEqualInsensitive(log.address, getContract(settlementChainId, "EventEmitter")) &&
                  matchLogRequest(
                    encodeEventTopics({
                      abi: abis.EventEmitter,
                      eventName: "EventLog1",
                      args: { eventNameHash: "MultichainBridgeIn", topic1: toHex(addressToBytes32(account)) },
                    }),
                    log.topics
                  )
              );
              const bridgeInEventIndex = bridgeInEvent?.logIndex;
              if (bridgeInEventIndex === undefined) {
                return;
              }

              const id = `${txnHash.toLowerCase()}:${bridgeInEventIndex}`;
              setMultichainFundingPendingId(mockId, id);
            });
        }
      } else if (txnEvent.event === TxnEventName.Error) {
        helperToast.error(t`Deposit failed`, { toastId: "same-chain-gmx-account-deposit" });
        setIsSubmitting(false);
      }
    },
    [
      account,
      depositViewTokenAddress,
      inputAmount,
      setIsVisibleOrView,
      setMultichainFundingPendingId,
      setMultichainSubmittedDeposit,
      settlementChainId,
    ]
  );

  const handleSameChainDeposit = useCallback(async () => {
    if (!account || !depositViewTokenAddress || inputAmount === undefined) {
      return;
    }

    setIsSubmitting(true);

    await wrapChainAction(settlementChainId, setSettlementChainId, async (signer) => {
      await sendSameChainDepositTxn({
        chainId: settlementChainId as SettlementChainId,
        signer,
        tokenAddress: depositViewTokenAddress,
        amount: inputAmount,
        account,
        callback: sameChainCallback,
      });
    });
  }, [account, depositViewTokenAddress, inputAmount, sameChainCallback, settlementChainId, setSettlementChainId]);

  const makeCrossChainCallback = useCallback(
    (params: {
      depositViewChain: SourceChainId;
      metricId: OrderMetricId;
      sendParams: SendParam;
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
          setIsSubmitting(false);

          sendTxnSentMetric(params.metricId);

          let submittedDepositGuid: string | undefined;

          if (txnEvent.data.type === "wallet") {
            const settlementChainDecimals = getToken(settlementChainId, params.tokenAddress)?.decimals;
            const sourceChainDecimals = getMappedTokenId(
              settlementChainId as SettlementChainId,
              params.tokenAddress,
              params.depositViewChain
            )?.decimals;

            if (settlementChainDecimals !== undefined && sourceChainDecimals !== undefined) {
              const amount = adjustForDecimals(
                params.sendParams.amountLD as bigint,
                sourceChainDecimals,
                settlementChainDecimals
              );

              submittedDepositGuid = setMultichainSubmittedDeposit({
                amount,
                settlementChainId,
                sourceChainId: params.depositViewChain,
                tokenAddress: params.tokenAddress,
                sentTxn: txnEvent.data.transactionHash,
              });
            }
          }

          if (submittedDepositGuid) {
            setSelectedTransferGuid(submittedDepositGuid);
            if (!subaccountState.subaccount && !isExpressTradingDisabled) {
              setIsVisibleOrView("depositStatus");
            } else {
              setIsVisibleOrView("main");
            }
          }
        } else if (txnEvent.event === TxnEventName.Simulated) {
          sendOrderSimulatedMetric(params.metricId);
        } else if (txnEvent.event === TxnEventName.Sending) {
          sendOrderTxnSubmittedMetric(params.metricId);
        }
      },
    [
      setIsVisibleOrView,
      setMultichainSubmittedDeposit,
      setSelectedTransferGuid,
      settlementChainId,
      subaccountState.subaccount,
      isExpressTradingDisabled,
    ]
  );

  const canSendCrossChainDeposit =
    depositViewTokenAddress &&
    account &&
    amountLD !== undefined &&
    amountLD > 0n &&
    depositViewChain &&
    quoteSendNativeFee !== undefined &&
    sendParamsWithSlippage &&
    selectedTokenSourceChainTokenId;

  const handleCrossChainDeposit = useCallback(async (): Promise<boolean> => {
    if (!canSendCrossChainDeposit) {
      helperToast.error(t`Deposit failed`);
      return false;
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
    await wrapChainAction(depositViewChain, setSettlementChainId, async (signer) => {
      await sendCrossChainDepositTxn({
        chainId: depositViewChain,
        signer,
        tokenAddress: selectedTokenSourceChainTokenId.address,
        stargateAddress: selectedTokenSourceChainTokenId.stargate,
        amount: amountLD,
        quoteSendNativeFee,
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

    return true;
  }, [
    account,
    amountLD,
    canSendCrossChainDeposit,
    depositViewChain,
    depositViewTokenAddress,
    latestInputAmountUsd,
    latestIsFirstDeposit,
    makeCrossChainCallback,
    quoteSendNativeFee,
    selectedToken,
    selectedTokenSourceChainTokenId?.address,
    selectedTokenSourceChainTokenId?.stargate,
    sendParamsWithSlippage,
    setSettlementChainId,
    settlementChainId,
  ]);

  const handleDeposit = useCallback(async () => {
    if (depositViewChain === settlementChainId) {
      await handleSameChainDeposit();
    } else {
      setIsSubmitting(true);
      setShouldSendCrossChainDepositWhenLoaded(true);
    }
  }, [depositViewChain, settlementChainId, handleSameChainDeposit]);

  const isCrossChainDepositLoading = useRef(false);
  useEffect(() => {
    if (!shouldSendCrossChainDepositWhenLoaded || isCrossChainDepositLoading.current) {
      return;
    }

    if (!canSendCrossChainDeposit) {
      return;
    }

    setShouldSendCrossChainDepositWhenLoaded(false);
    isCrossChainDepositLoading.current = true;
    handleCrossChainDeposit().finally(() => {
      isCrossChainDepositLoading.current = false;
    });
  }, [canSendCrossChainDeposit, handleCrossChainDeposit, shouldSendCrossChainDepositWhenLoaded]);

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
        !MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[settlementChainId as SettlementChainId].includes(
          depositViewTokenAddress as NativeTokenSupportedAddress
        );

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

  const isAvalancheSettlement = settlementChainId === AVALANCHE;

  let buttonState: {
    text: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  } = {
    text: t`Deposit`,
    onClick: handleDeposit,
  };

  if (isAvalancheSettlement) {
    buttonState = {
      text: t`Not supported`,
      disabled: true,
    };
  } else if (hasOutdatedUi) {
    buttonState = {
      text: t`Page outdated, please refresh`,
      disabled: true,
    };
  } else if (isApproving) {
    buttonState = {
      text: (
        <>
          <Trans>Approving...</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (tokenSelectorDisabled) {
    buttonState = {
      text:
        depositViewChain !== undefined
          ? t`No eligible tokens available on ${getChainName(depositViewChain)} for deposit`
          : t`No eligible tokens available for deposit`,
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
          <Trans>Depositing...</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (isInputEmpty) {
    buttonState = {
      text: t`Enter deposit amount`,
      disabled: true,
    };
  } else if (selectedTokenSourceChainBalance !== undefined && amountLD > selectedTokenSourceChainBalance) {
    buttonState = {
      text: t`Insufficient balance`,
      disabled: true,
    };
  } else if (nativeTokenSourceChainBalance !== undefined && quoteSendNativeFee !== undefined) {
    const isNative = unwrappedSelectedTokenAddress === zeroAddress;
    const value = isNative ? amountLD : 0n;

    if (depositViewChain !== undefined && quoteSendNativeFee + value > nativeTokenSourceChainBalance) {
      const nativeTokenSymbol = getViemChain(depositViewChain).nativeCurrency.symbol;

      buttonState = {
        text: t`Insufficient ${nativeTokenSymbol} balance`,
        disabled: true,
      };
    }
  }

  const onClick = buttonState.onClick;
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onClick?.();
    },
    [onClick]
  );

  const isTestnet = isTestnetChain(settlementChainId);

  const estimatedTimeValue = useMemo(() => {
    if (depositViewChain === settlementChainId) {
      return <Trans>Instant</Trans>;
    }

    if (inputAmount === undefined || inputAmount === 0n) {
      return "...";
    }

    return isTestnet ? <Trans>1m 40s</Trans> : <Trans>30s</Trans>;
  }, [depositViewChain, inputAmount, isTestnet, settlementChainId]);

  const depositFeeValue = useMemo(() => {
    if (depositViewChain === settlementChainId) {
      return <Trans>No fee</Trans>;
    }

    if (protocolFeeAmount === undefined || selectedTokenSourceChainDecimals === undefined) {
      return "...";
    }

    return (
      <AmountWithUsdBalance
        className="leading-1"
        amount={protocolFeeAmount}
        decimals={selectedTokenSourceChainDecimals}
        usd={protocolFeeUsd}
        symbol={selectedToken?.symbol}
      />
    );
  }, [
    depositViewChain,
    settlementChainId,
    protocolFeeAmount,
    selectedTokenSourceChainDecimals,
    protocolFeeUsd,
    selectedToken?.symbol,
  ]);

  const networkFeeValue = useMemo(() => {
    if (depositViewViemChain === undefined) {
      return "...";
    }

    if (depositViewChain === settlementChainId) {
      if (!sameChainNetworkFeeDetails) {
        return "...";
      }

      return (
        <AmountWithUsdBalance
          className="leading-1"
          amount={sameChainNetworkFeeDetails.amount}
          decimals={sameChainNetworkFeeDetails.decimals}
          usd={sameChainNetworkFeeDetails?.usd}
          symbol={sameChainNetworkFeeDetails?.symbol}
        />
      );
    }

    if (networkFee === undefined) {
      return "...";
    }

    return (
      <AmountWithUsdBalance
        className="leading-1"
        amount={networkFee}
        decimals={depositViewViemChain.nativeCurrency.decimals}
        usd={networkFeeUsd}
        symbol={depositViewViemChain.nativeCurrency.symbol}
      />
    );
  }, [
    networkFee,
    depositViewViemChain,
    depositViewChain,
    settlementChainId,
    networkFeeUsd,
    sameChainNetworkFeeDetails,
  ]);

  return (
    <form className="flex grow flex-col overflow-y-auto px-adaptive pb-adaptive pt-adaptive" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-[--padding-adaptive]">
        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Asset</Trans>
          </div>
          {!tokenSelectorDisabled ? (
            <div
              tabIndex={0}
              role="button"
              onClick={() => {
                setIsVisibleOrView("selectAssetToDeposit");
              }}
              className="flex items-center justify-between rounded-8 border border-slate-800 bg-slate-800 px-14 py-13 gmx-hover:bg-fill-surfaceElevatedHover"
            >
              <div className="flex items-center gap-8">
                {selectedToken ? (
                  <>
                    <TokenIcon symbol={selectedToken.symbol} displaySize={20} />
                    <span className="text-16 leading-base">{selectedToken.symbol}</span>
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
                  <span className="text-typography-secondary">
                    <Trans>Pick an asset to deposit</Trans>
                  </span>
                )}
              </div>
              <ChevronRightIcon className="size-14 text-typography-secondary" />
            </div>
          ) : (
            <div className="rounded-8 border border-slate-800 bg-slate-800 px-14 py-13 text-typography-secondary">
              <span className="flex min-h-20 items-center">
                {depositViewChain !== undefined ? (
                  <Trans>No eligible tokens available on {getChainName(depositViewChain)} for deposit</Trans>
                ) : (
                  <Trans>No eligible tokens available for deposit</Trans>
                )}
              </span>
            </div>
          )}
        </div>
        {depositViewChain !== undefined && (
          <div className="flex flex-col gap-6">
            <div className="text-body-medium text-typography-secondary">
              <Trans>From Network</Trans>
            </div>
            <div className="flex items-center gap-8 rounded-8 border border-slate-600 px-14 py-13">
              <img src={getChainIcon(depositViewChain)} alt={getChainName(depositViewChain)} className="size-20" />
              <span className="text-16 leading-base text-typography-secondary">{getChainName(depositViewChain)}</span>
            </div>
          </div>
        )}

        <div className={cx("flex flex-col gap-6", { invisible: depositViewTokenAddress === undefined })}>
          <div className="text-body-medium flex items-center justify-between gap-6 text-typography-secondary">
            <Trans>Deposit</Trans>
            {selectedTokenSourceChainBalance !== undefined &&
              selectedToken !== undefined &&
              selectedTokenSourceChainDecimals !== undefined && (
                <div>
                  <Trans>Available:</Trans>{" "}
                  <Amount
                    className="text-typography-primary"
                    amount={selectedTokenSourceChainBalance}
                    decimals={selectedTokenSourceChainDecimals}
                    isStable={selectedToken.isStable}
                    symbol={selectedToken.symbol}
                  />
                </div>
              )}
          </div>
          <div className="relative text-16 leading-base">
            <NumberInput
              value={inputValue}
              onValueChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-8 border border-slate-800 bg-slate-800 py-13 pl-12 pr-96 text-16 leading-base
                         focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
              placeholder="0.00"
            />
            <div className="pointer-events-none absolute right-14 top-1/2 flex -translate-y-1/2 items-center gap-8">
              <span className="text-typography-secondary">{selectedToken?.symbol}</span>
              <button
                className="text-body-small pointer-events-auto rounded-full bg-slate-600 px-8 py-2 font-medium
                           hover:bg-slate-500 focus-visible:bg-slate-500 active:bg-slate-500/70"
                type="button"
                onClick={handleMaxButtonClick}
              >
                <Trans>Max</Trans>
              </button>
            </div>
          </div>
          <div className="text-body-medium text-typography-secondary numbers">{formatUsd(inputAmountUsd ?? 0n)}</div>
        </div>
      </div>

      {isAvalancheSettlement && (
        <AlertInfoCard type="error" className="mt-8" hideClose>
          <div>
            <Trans>Depositing is not supported on Avalanche anymore.</Trans>
          </div>
        </AlertInfoCard>
      )}
      {isAboveLimit && (
        <AlertInfoCard type="warning" className="mt-8">
          <div>
            <Trans>
              The amount you are trying to deposit exceeds the limit. Please try an amount smaller than{" "}
              <span className="numbers">{upperLimitFormatted}</span>.
            </Trans>
          </div>
        </AlertInfoCard>
      )}
      {isBelowLimit && (
        <AlertInfoCard type="warning" className="mt-8">
          <div>
            <Trans>
              The amount you are trying to deposit is below the limit. Please try an amount larger than{" "}
              <span className="numbers">{lowerLimitFormatted}</span>.
            </Trans>
          </div>
        </AlertInfoCard>
      )}
      <div className="h-32 shrink-0 grow" />

      {depositViewTokenAddress && (
        <div className="mb-16 flex flex-col gap-10">
          <SyntheticsInfoRow label={<Trans>Estimated Time</Trans>} value={estimatedTimeValue} />
          <SyntheticsInfoRow label={<Trans>Network Fee</Trans>} value={networkFeeValue} />
          <SyntheticsInfoRow label={<Trans>Deposit Fee</Trans>} value={depositFeeValue} />
          <SyntheticsInfoRow
            label={<Trans>GMX Balance</Trans>}
            value={<ValueTransition from={formatUsd(gmxAccountUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />}
          />
        </div>
      )}

      <Button variant="primary-action" className="w-full shrink-0" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
};
