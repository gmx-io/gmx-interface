import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type Provider } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useHistory } from "react-router-dom";
import { Address, encodeAbiParameters, encodeEventTopics, toHex, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import {
  ContractsChainId,
  getChainName,
  isContractsChain,
  isTestnetChain,
  SettlementChainId,
  SourceChainId,
} from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getLayerZeroEndpointId,
  getMappedTokenId,
  getMultichainTokenId,
  getStargatePoolAddress,
  isSettlementChain,
  MULTI_CHAIN_TOKEN_MAPPING,
  MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS,
  MULTICHAIN_FUNDING_SLIPPAGE_BPS,
} from "config/multichain";
import {
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSettlementChainId,
  useGmxAccountWithdrawalViewChain,
  useGmxAccountWithdrawalViewTokenAddress,
  useGmxAccountWithdrawalViewTokenInputValue,
} from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectExpressGlobalParams,
  selectGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryError, useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { fallbackCustomError } from "domain/multichain/fallbackCustomError";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { isStringEqualInsensitive, matchLogRequest } from "domain/multichain/progress/LongCrossChainTask";
import {
  estimateSameChainWithdrawalGas,
  sendSameChainWithdrawalTxn,
} from "domain/multichain/sendSameChainWithdrawalTxn";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { BridgeOutParams, SendParam } from "domain/multichain/types";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useQuoteOft } from "domain/multichain/useQuoteOft";
import { useQuoteOftLimits } from "domain/multichain/useQuoteOftLimits";
import { useQuoteSendNativeFee } from "domain/multichain/useQuoteSend";
import { callRelayTransaction } from "domain/synthetics/express/callRelayTransaction";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder, ExpressTxnParams, RawRelayParamsPayload } from "domain/synthetics/express/types";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
import { TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
import { convertToUsd, sortTokenDataByBalance, TokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLeadingDebounce } from "lib/debounce/useLeadingDebounde";
import { helperToast } from "lib/helperToast";
import {
  initMultichainWithdrawalMetricData,
  sendOrderSimulatedMetric,
  sendOrderSubmittedMetric,
  sendOrderTxnSubmittedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { expandDecimals, formatAmountFree, formatUsd, parseValue, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { TxnEventName } from "lib/transactions";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress, getToken, isValidTokenSafe } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import { calculateNetworkFeeDetails } from "components/GmxAccountModal/calculateNetworkFeeDetails";
import { useAvailableToTradeAssetMultichain, useGmxAccountWithdrawNetworks } from "components/GmxAccountModal/hooks";
import NumberInput from "components/NumberInput/NumberInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { InsufficientWntBanner } from "./InsufficientWntBanner";
import { wrapChainAction } from "./wrapChainAction";

const USD_GAS_TOKEN_BUFFER_MAINNET = expandDecimals(4, USD_DECIMALS);
const USD_GAS_TOKEN_WARNING_THRESHOLD_MAINNET = expandDecimals(3, USD_DECIMALS);
const USD_GAS_TOKEN_BUFFER_TESTNET = expandDecimals(10, USD_DECIMALS);
const USD_GAS_TOKEN_WARNING_THRESHOLD_TESTNET = expandDecimals(9, USD_DECIMALS);

function useUsdGasTokenBuffer(): {
  gasTokenBuffer: bigint;
  gasTokenBufferWarningThreshold: bigint;
} {
  const { chainId } = useChainId();
  const isMainnet = isContractsChain(chainId, false);

  if (!isMainnet) {
    return {
      gasTokenBuffer: USD_GAS_TOKEN_BUFFER_TESTNET,
      gasTokenBufferWarningThreshold: USD_GAS_TOKEN_WARNING_THRESHOLD_TESTNET,
    };
  }

  return {
    gasTokenBuffer: USD_GAS_TOKEN_BUFFER_MAINNET,
    gasTokenBufferWarningThreshold: USD_GAS_TOKEN_WARNING_THRESHOLD_MAINNET,
  };
}

const useIsFirstWithdrawal = () => {
  const [enabled, setEnabled] = useState(true);
  const [isFirstWithdrawal, setIsFirstWithdrawal] = useState(false);
  const { fundingHistory, isLoading } = useGmxAccountFundingHistory({ enabled });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (fundingHistory === undefined || fundingHistory.length !== 0) {
      return;
    }

    setEnabled(false);
    const hasWithdrawal = fundingHistory.some((funding) => funding.operation === "withdrawal");
    if (!hasWithdrawal) {
      setIsFirstWithdrawal(true);
    }
  }, [fundingHistory, isLoading]);

  return isFirstWithdrawal;
};

function getFilteredNetworks({
  networks,
  unwrappedSelectedTokenAddress,
  chainId,
}: {
  networks: { id: number; name: string }[];
  unwrappedSelectedTokenAddress: string | undefined;
  chainId: number;
}): { id: number; name: string; disabled?: boolean }[] {
  if (!unwrappedSelectedTokenAddress) {
    return networks;
  }

  return networks
    .map((network): { id: number; name: string; disabled?: boolean } => {
      if (network.id === chainId) {
        return network;
      }

      const mappedTokenId = getMappedTokenId(
        chainId as SettlementChainId,
        unwrappedSelectedTokenAddress,
        network.id as SourceChainId
      );
      const isTransferable = mappedTokenId !== undefined;
      return {
        ...network,
        disabled: !isTransferable,
      };
    })
    .sort((a, b) => {
      return a.disabled ? 1 : b.disabled ? -1 : 0;
    });
}

function getMultichainWithdrawalTokens({
  chainId,
  tokensData,
}: {
  chainId: ContractsChainId;
  tokensData: TokensData;
}): TokenData[] {
  return (
    MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[chainId as SettlementChainId]
      ?.map((tokenAddress) => tokensData[tokenAddress] as TokenData | undefined)
      .filter((token): token is TokenData => {
        return token !== undefined && token.address !== zeroAddress;
      })
      .sort(sortTokenDataByBalance) || EMPTY_ARRAY
  );
}

function getSameChainWithdrawalTokens({
  chainId,
  tokensData,
}: {
  chainId: ContractsChainId;
  tokensData: TokensData;
}): TokenData[] {
  return Object.values(tokensData)
    .filter((token): token is TokenData => {
      return (
        token !== undefined &&
        token.address !== zeroAddress &&
        token.gmxAccountBalance !== undefined &&
        token.gmxAccountBalance > 0n &&
        !MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[chainId]?.includes(token.address)
      );
    })
    .sort(sortTokenDataByBalance);
}

function getWithdrawalTokenOptions({
  chainId,
  tokensData,
}: {
  chainId: ContractsChainId;
  tokensData: TokensData | undefined;
}): TokenData[] {
  if (!isSettlementChain(chainId) || !tokensData) {
    return EMPTY_ARRAY;
  }

  const multichainTokens = getMultichainWithdrawalTokens({ chainId, tokensData });
  const sameChainTokens = getSameChainWithdrawalTokens({ chainId, tokensData });

  return multichainTokens.concat(sameChainTokens);
}

function useWithdrawViewTransactions({
  selectedToken,
  inputAmountUsd,
  bridgeOutParams,
  expressTxnParamsAsyncResult,
}: {
  selectedToken: TokenData | undefined;
  inputAmountUsd: bigint | undefined;
  bridgeOutParams: BridgeOutParams | undefined;
  expressTxnParamsAsyncResult: AsyncResult<ExpressTxnParams>;
}) {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const [withdrawalViewChain] = useGmxAccountWithdrawalViewChain();
  const [selectedTokenAddress] = useGmxAccountWithdrawalViewTokenAddress();
  const isSameChain = withdrawalViewChain === chainId;
  const { provider } = useJsonRpcProvider(chainId);
  const isFirstWithdrawal = useIsFirstWithdrawal();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const {
    setMultichainSubmittedWithdrawal,
    setMultichainWithdrawalSentTxnHash,
    setMultichainWithdrawalSentError,
    setMultichainFundingPendingId,
  } = useSyntheticsEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gasPaymentParams = expressTxnParamsAsyncResult?.data?.gasPaymentParams;
  const unwrappedSelectedTokenAddress =
    selectedTokenAddress !== undefined ? convertTokenAddress(chainId, selectedTokenAddress, "native") : undefined;
  const unwrappedSelectedTokenSymbol = unwrappedSelectedTokenAddress
    ? getToken(chainId, unwrappedSelectedTokenAddress).symbol
    : undefined;

  const handleSameChainWithdraw = useCallback(async () => {
    if (withdrawalViewChain === undefined || selectedToken === undefined || account === undefined) {
      return;
    }

    if (!bridgeOutParams) {
      helperToast.error(t`Missing required parameters`);
      return;
    }

    setIsSubmitting(true);

    await wrapChainAction(chainId, setSettlementChainId, async (signer) => {
      try {
        await sendSameChainWithdrawalTxn({
          chainId: chainId as SettlementChainId,
          signer,
          bridgeOutParams,
          callback: (txnEvent) => {
            if (txnEvent.event === TxnEventName.Sent) {
              helperToast.success("Withdrawal sent", { toastId: "same-chain-gmx-account-withdrawal" });
              setIsVisibleOrView("main");
              setIsSubmitting(false);

              if (txnEvent.data.type === "wallet") {
                const txnHash = txnEvent.data.transactionHash;
                const mockId = setMultichainSubmittedWithdrawal({
                  amount: bridgeOutParams.amount,
                  settlementChainId: chainId,
                  sourceChainId: 0,
                  tokenAddress: selectedToken.address,
                  sentTxn: txnHash,
                });

                if (!mockId) {
                  return;
                }

                getPublicClientWithRpc(chainId)
                  .waitForTransactionReceipt({
                    hash: txnHash,
                  })
                  .then((receipt) => {
                    const bridgeOutEvent = receipt.logs.find(
                      (log) =>
                        isStringEqualInsensitive(log.address, getContract(chainId, "EventEmitter")) &&
                        matchLogRequest(
                          encodeEventTopics({
                            abi: abis.EventEmitter,
                            eventName: "EventLog1",
                            args: {
                              eventNameHash: "MultichainBridgeOut",
                              topic1: toHex(addressToBytes32(account)),
                            },
                          }),
                          log.topics
                        )
                    );
                    const bridgeOutEventIndex = bridgeOutEvent?.logIndex;
                    if (bridgeOutEventIndex === undefined) {
                      return;
                    }

                    const id = `${txnHash.toLowerCase()}:${bridgeOutEventIndex}`;
                    setMultichainFundingPendingId(mockId, id);
                  });
              }
            } else if (txnEvent.event === TxnEventName.Error) {
              helperToast.error(t`Withdrawal failed`, { toastId: "same-chain-gmx-account-withdrawal" });
              setIsSubmitting(false);
            }
          },
        });
      } catch (error) {
        helperToast.error(t`Withdrawal failed`, { toastId: "same-chain-gmx-account-withdrawal" });
      } finally {
        setIsSubmitting(false);
      }
    });
  }, [
    account,
    bridgeOutParams,
    chainId,
    selectedToken,
    setIsVisibleOrView,
    setMultichainFundingPendingId,
    setMultichainSubmittedWithdrawal,
    setSettlementChainId,
    withdrawalViewChain,
  ]);

  const handleMultichainWithdraw = useCallback(async () => {
    if (withdrawalViewChain === undefined || selectedToken === undefined || account === undefined) {
      return;
    }

    const metricData = initMultichainWithdrawalMetricData({
      settlementChain: chainId,
      sourceChain: withdrawalViewChain,
      assetSymbol: unwrappedSelectedTokenSymbol ?? selectedToken.symbol,
      sizeInUsd: inputAmountUsd!,
      isFirstWithdrawal,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (
      gasPaymentParams === undefined ||
      bridgeOutParams === undefined ||
      expressTxnParamsAsyncResult.promise === undefined ||
      provider === undefined
    ) {
      helperToast.error(t`Missing required parameters`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    const expressTxnParams = await expressTxnParamsAsyncResult.promise;

    if (expressTxnParams === undefined || !expressTxnParams.gasPaymentValidations.isValid) {
      helperToast.error(t`Missing required parameters`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    setIsSubmitting(true);
    try {
      const relayParamsPayload = expressTxnParams.relayParamsPayload;

      await wrapChainAction(withdrawalViewChain, setSettlementChainId, async (signer) => {
        await simulateWithdraw({
          chainId: chainId as SettlementChainId,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayParamsPayload: relayParamsPayload,
          params: bridgeOutParams,
          signer,
          provider,
          srcChainId: withdrawalViewChain,
        });

        sendOrderSimulatedMetric(metricData.metricId);

        const signedTxnData: ExpressTxnData = await buildAndSignBridgeOutTxn({
          chainId: chainId as SettlementChainId,
          signer,
          account,
          relayParamsPayload: relayParamsPayload as RawRelayParamsPayload,
          params: bridgeOutParams,
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          srcChainId: withdrawalViewChain,
        });

        const mockWithdrawalId = setMultichainSubmittedWithdrawal({
          amount: bridgeOutParams.amount,
          settlementChainId: chainId,
          sourceChainId: withdrawalViewChain,
          tokenAddress: unwrappedSelectedTokenAddress ?? selectedToken.address,
        });

        const receipt = await sendExpressTransaction({
          chainId,
          txnData: signedTxnData,
          isSponsoredCall: expressTxnParams.isSponsoredCall,
        });

        sendOrderTxnSubmittedMetric(metricData.metricId);

        setIsVisibleOrView("main");

        const txResult = await receipt.wait();

        if (txResult.status === "success") {
          sendTxnSentMetric(metricData.metricId);
          if (txResult.transactionHash && mockWithdrawalId) {
            setMultichainWithdrawalSentTxnHash(mockWithdrawalId, txResult.transactionHash);
          }
        } else if (txResult.status === "failed" && mockWithdrawalId) {
          setMultichainWithdrawalSentError(mockWithdrawalId);
        }
      });
    } catch (error) {
      const prettyError = toastCustomOrStargateError(chainId, error);
      sendTxnErrorMetric(metricData.metricId, prettyError, "unknown");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    bridgeOutParams,
    chainId,
    expressTxnParamsAsyncResult.promise,
    gasPaymentParams,
    inputAmountUsd,
    isFirstWithdrawal,
    provider,
    selectedToken,
    setIsVisibleOrView,
    setMultichainSubmittedWithdrawal,
    setMultichainWithdrawalSentError,
    setMultichainWithdrawalSentTxnHash,
    setSettlementChainId,
    unwrappedSelectedTokenAddress,
    unwrappedSelectedTokenSymbol,
    withdrawalViewChain,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (isSameChain) {
      await handleSameChainWithdraw();
    } else {
      await handleMultichainWithdraw();
    }
  }, [isSameChain, handleSameChainWithdraw, handleMultichainWithdraw]);

  return { handleWithdraw, isSubmitting };
}

export const WithdrawalView = () => {
  const history = useHistory();
  const { chainId } = useChainId();
  const [withdrawalViewChain, setWithdrawalViewChain] = useGmxAccountWithdrawalViewChain();
  const isSameChain = withdrawalViewChain === chainId;
  const { address: account } = useAccount();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setDepositViewTokenInputValue] = useGmxAccountDepositViewTokenInputValue();
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [inputValue, setInputValue] = useGmxAccountWithdrawalViewTokenInputValue();
  const [selectedTokenAddress, setSelectedTokenAddress] = useGmxAccountWithdrawalViewTokenAddress();

  const hasOutdatedUi = useHasOutdatedUi();

  const { tokensData } = useTokensDataRequest(chainId, withdrawalViewChain);
  const networks = useGmxAccountWithdrawNetworks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const relayerFeeToken = getByKey(tokensData, globalExpressParams?.relayerFeeTokenAddress);
  const { gasTokenBuffer, gasTokenBufferWarningThreshold } = useUsdGasTokenBuffer();
  const gasPaymentToken = useSelector(selectGasPaymentToken);

  const { provider } = useJsonRpcProvider(chainId);

  const selectedToken = useMemo(() => {
    return getByKey(tokensData, selectedTokenAddress);
  }, [selectedTokenAddress, tokensData]);

  const unwrappedSelectedTokenAddress =
    selectedTokenAddress !== undefined ? convertTokenAddress(chainId, selectedTokenAddress, "native") : undefined;
  const wrappedNativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const wrappedNativeToken = getByKey(tokensData, wrappedNativeTokenAddress);

  const selectedTokenSettlementChainTokenId = unwrappedSelectedTokenAddress
    ? getMultichainTokenId(chainId, unwrappedSelectedTokenAddress)
    : undefined;

  const realInputAmount =
    selectedToken && inputValue !== undefined ? parseValue(inputValue, selectedToken.decimals) : undefined;
  const inputAmount = useLeadingDebounce(realInputAmount);
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedToken.prices.maxPrice)
    : undefined;

  const filteredNetworks = useMemo(
    () =>
      getFilteredNetworks({
        networks,
        unwrappedSelectedTokenAddress,
        chainId,
      }),
    [unwrappedSelectedTokenAddress, networks, chainId]
  );

  const tokenOptions = useMemo(() => getWithdrawalTokenOptions({ chainId, tokensData }), [chainId, tokensData]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const { nextGmxAccountBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || inputAmount === undefined || inputAmountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountUsd ?? 0n) - inputAmountUsd;

    return { nextGmxAccountBalanceUsd };
  }, [selectedToken, inputAmount, inputAmountUsd, gmxAccountUsd]);

  const sendParamsWithoutSlippage: SendParam | undefined = useMemo(() => {
    if (
      isSameChain ||
      !account ||
      inputAmount === undefined ||
      inputAmount <= 0n ||
      withdrawalViewChain === undefined
    ) {
      return;
    }

    return getMultichainTransferSendParams({
      dstChainId: withdrawalViewChain,
      account,
      amountLD: inputAmount,
      isToGmx: false,
    });
  }, [isSameChain, account, inputAmount, withdrawalViewChain]);

  const quoteOft = useQuoteOft({
    sendParams: sendParamsWithoutSlippage,
    fromStargateAddress: selectedTokenSettlementChainTokenId?.stargate,
    fromChainProvider: provider,
    fromChainId: chainId,
    toChainId: withdrawalViewChain,
  });

  const { isBelowLimit, lowerLimitFormatted, isAboveLimit, upperLimitFormatted } = useQuoteOftLimits({
    quoteOft,
    amountLD: inputAmount,
    isStable: selectedToken?.isStable,
    decimals: selectedTokenSettlementChainTokenId?.decimals,
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

  const nativeFee = useQuoteSendNativeFee({
    sendParams: sendParamsWithSlippage,
    fromStargateAddress: selectedTokenSettlementChainTokenId?.stargate,
    fromChainId: chainId,
    toChainId: withdrawalViewChain,
  });

  const baseSendParams = useMemo(() => {
    if (isSameChain || !withdrawalViewChain || !account) {
      return;
    }

    const prices = getByKey(tokensData, unwrappedSelectedTokenAddress)?.prices;
    const decimals = selectedTokenSettlementChainTokenId?.decimals;

    if (!prices || decimals === undefined) {
      return;
    }

    const fakeInputAmount = convertToTokenAmount(expandDecimals(1, USD_DECIMALS), decimals, getMidPrice(prices));

    if (fakeInputAmount === undefined) {
      return;
    }

    return getMultichainTransferSendParams({
      dstChainId: withdrawalViewChain,
      account,
      amountLD: fakeInputAmount,
      isToGmx: false,
      srcChainId: chainId,
    });
  }, [
    account,
    chainId,
    isSameChain,
    selectedTokenSettlementChainTokenId?.decimals,
    tokensData,
    unwrappedSelectedTokenAddress,
    withdrawalViewChain,
  ]);

  const isMaxButtonDisabled = useMemo(() => {
    if (isSameChain) {
      return false;
    }

    if (!baseSendParams) {
      return true;
    }

    return false;
  }, [baseSendParams, isSameChain]);

  const baseNativeFee = useQuoteSendNativeFee({
    sendParams: baseSendParams,
    fromStargateAddress: selectedTokenSettlementChainTokenId?.stargate,
    fromChainId: chainId,
    toChainId: withdrawalViewChain,
  });

  const {
    networkFeeUsd: bridgeNetworkFeeUsd,
    protocolFeeUsd,
    protocolFeeAmount,
    networkFee: bridgeNetworkFee,
  } = useMultichainQuoteFeeUsd({
    quoteSendNativeFee: nativeFee,
    quoteOft,
    unwrappedTokenAddress: unwrappedSelectedTokenAddress,
    sourceChainId: chainId,
    targetChainId: withdrawalViewChain,
  });

  const bridgeOutParams: BridgeOutParams | undefined = useMemo(() => {
    if (
      withdrawalViewChain === undefined ||
      selectedTokenAddress === undefined ||
      unwrappedSelectedTokenAddress === undefined ||
      inputAmount === undefined ||
      inputAmount <= 0n
    ) {
      return;
    }

    if (isSameChain) {
      return {
        token: selectedTokenAddress as Address,
        amount: inputAmount,
        minAmountOut: inputAmount, // Not actually used in smart contracts
        data: "0x",
        provider: zeroAddress,
      };
    }

    const dstEid = getLayerZeroEndpointId(withdrawalViewChain);
    const stargateAddress = getStargatePoolAddress(chainId, unwrappedSelectedTokenAddress);

    if (dstEid === undefined || stargateAddress === undefined) {
      return;
    }

    return {
      token: selectedTokenAddress as Address,
      amount: inputAmount,
      minAmountOut: inputAmount,
      data: encodeAbiParameters(
        [
          {
            type: "uint32",
            name: "dstEid",
          },
        ],
        [dstEid]
      ),
      provider: stargateAddress,
    };
  }, [withdrawalViewChain, selectedTokenAddress, unwrappedSelectedTokenAddress, inputAmount, isSameChain, chainId]);

  const gasPrice = useGasPrice(chainId);

  const sameChainNetworkFeeAsyncResult = useThrottledAsync(
    async ({ params }) => {
      const client = getPublicClientWithRpc(params.chainId);

      return estimateSameChainWithdrawalGas({
        chainId: params.chainId as SettlementChainId,
        client,
        bridgeOutParams: params.bridgeOutParams,
        account: params.account,
      });
    },
    {
      params:
        isSameChain && account && bridgeOutParams && chainId
          ? {
              account,
              bridgeOutParams,
              chainId,
            }
          : undefined,
    }
  );

  const sameChainNetworkFeeDetails = useMemo(
    () =>
      calculateNetworkFeeDetails({
        gasLimit: sameChainNetworkFeeAsyncResult.data,
        gasPrice,
        tokensData,
      }),
    [sameChainNetworkFeeAsyncResult.data, gasPrice, tokensData]
  );

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (account === undefined || bridgeOutParams === undefined || withdrawalViewChain === undefined || isSameChain) {
      return;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({ gasPaymentParams, relayParams }) => ({
      txnData: await buildAndSignBridgeOutTxn({
        chainId: chainId as SettlementChainId,
        signer: undefined,
        account,
        relayParamsPayload: relayParams,
        params: bridgeOutParams,
        emptySignature: true,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        srcChainId: withdrawalViewChain,
      }),
    });

    return expressTransactionBuilder;
  }, [account, bridgeOutParams, chainId, isSameChain, withdrawalViewChain]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: true,
    requireValidations: false,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);

  const isOutOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors?.isOutOfTokenError?.tokenAddress);
    }
  }, [errors, tokensData]);

  const relayFeeAmount = expressTxnParamsAsyncResult?.data?.gasPaymentParams.relayerFeeAmount;
  const gasPaymentTokenAmount = expressTxnParamsAsyncResult?.data?.gasPaymentParams.gasPaymentTokenAmount;

  const { networkFeeUsd, wntFee, wntFeeUsd, networkFeeInGasPaymentToken } = useMemo(() => {
    if (
      gasPaymentTokenAmount === undefined ||
      gasPaymentToken === undefined ||
      relayFeeAmount === undefined ||
      relayerFeeToken === undefined
    ) {
      return {
        networkFeeUsd: undefined,
        wntFee: undefined,
        wntFeeUsd: undefined,
        networkFeeInGasPaymentToken: undefined,
      };
    }

    const relayFeeUsd = convertToUsd(relayFeeAmount, relayerFeeToken.decimals, getMidPrice(relayerFeeToken.prices));

    const gasPaymentTokenUsd = convertToUsd(
      gasPaymentTokenAmount,
      gasPaymentToken?.decimals,
      getMidPrice(gasPaymentToken.prices)
    );

    if (
      relayFeeUsd === undefined ||
      gasPaymentTokenUsd === undefined ||
      bridgeNetworkFeeUsd === undefined ||
      bridgeNetworkFee === undefined
    ) {
      return {
        networkFeeUsd: undefined,
        wntFee: undefined,
        wntFeeUsd: undefined,
        networkFeeInGasPaymentToken: undefined,
      };
    }

    const bridgeNetworkFeeInGasPaymentToken = convertToTokenAmount(
      bridgeNetworkFeeUsd,
      gasPaymentToken.decimals,
      getMidPrice(gasPaymentToken.prices)
    )!;

    const wntFee = bridgeNetworkFee + (gasPaymentToken.isWrapped ? relayFeeAmount : 0n);
    const wntFeeUsd = bridgeNetworkFeeUsd + (gasPaymentToken.isWrapped ? relayFeeUsd : 0n);

    return {
      networkFeeUsd: gasPaymentTokenUsd + bridgeNetworkFeeUsd,
      wntFee,
      wntFeeUsd,
      networkFeeInGasPaymentToken: gasPaymentTokenAmount + bridgeNetworkFeeInGasPaymentToken,
    };
  }, [bridgeNetworkFee, bridgeNetworkFeeUsd, gasPaymentToken, gasPaymentTokenAmount, relayFeeAmount, relayerFeeToken]);

  const [showWntWarning, setShowWntWarning] = useState(false);
  const [lastValidNetworkFees, setLastValidNetworkFees] = useState({
    wntFee,
    networkFeeUsd,
    networkFeeInGasPaymentToken,
    wntFeeUsd,
  });

  useEffect(() => {
    if (
      wntFee !== undefined &&
      networkFeeUsd !== undefined &&
      wntFeeUsd !== undefined &&
      networkFeeInGasPaymentToken !== undefined
    ) {
      setLastValidNetworkFees({
        wntFee,
        networkFeeUsd,
        networkFeeInGasPaymentToken,
        wntFeeUsd,
      });
    }
  }, [wntFee, networkFeeUsd, networkFeeInGasPaymentToken, wntFeeUsd]);

  useEffect(() => {
    if (wrappedNativeTokenAddress === zeroAddress) {
      setShowWntWarning(false);
      return;
    }

    if (!wrappedNativeToken || wrappedNativeToken.gmxAccountBalance === undefined) {
      return;
    }

    if (wrappedNativeToken.gmxAccountBalance === 0n) {
      setShowWntWarning(true);
      return;
    }

    const someWntFee = wntFee ?? lastValidNetworkFees.wntFee;

    if (someWntFee === undefined) {
      return;
    }

    const value = (unwrappedSelectedTokenAddress === zeroAddress ? inputAmount : 0n) ?? 0n;

    setShowWntWarning(wrappedNativeToken.gmxAccountBalance - value < someWntFee);
  }, [
    wrappedNativeToken,
    wntFee,
    unwrappedSelectedTokenAddress,
    inputAmount,
    lastValidNetworkFees.wntFee,
    wrappedNativeTokenAddress,
  ]);

  const handlePickToken = useCallback(
    (tokenAddress: string) => {
      setSelectedTokenAddress(tokenAddress);

      if (withdrawalViewChain !== undefined && !isSameChain) {
        const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
        const tokenId = getMappedTokenId(chainId as SettlementChainId, unwrappedTokenAddress, withdrawalViewChain);
        if (tokenId === undefined) {
          const sourceChainIds = Object.keys(MULTI_CHAIN_TOKEN_MAPPING[chainId]).map(Number) as SourceChainId[];
          for (const someSourceChainId of sourceChainIds) {
            if (someSourceChainId === withdrawalViewChain) {
              continue;
            }

            const mappedTokenId = getMappedTokenId(
              chainId as SettlementChainId,
              unwrappedTokenAddress,
              someSourceChainId
            );
            if (mappedTokenId) {
              setWithdrawalViewChain(someSourceChainId);
              return;
            }
          }

          setWithdrawalViewChain(undefined);
        }
      }
    },
    [chainId, isSameChain, setSelectedTokenAddress, setWithdrawalViewChain, withdrawalViewChain]
  );

  const { handleWithdraw, isSubmitting } = useWithdrawViewTransactions({
    selectedToken,
    inputAmountUsd,
    bridgeOutParams,
    expressTxnParamsAsyncResult,
  });

  const handleMaxButtonClick = useCallback(async () => {
    if (
      selectedToken === undefined ||
      selectedToken.gmxAccountBalance === undefined ||
      selectedToken.gmxAccountBalance === 0n ||
      withdrawalViewChain === undefined ||
      account === undefined
    ) {
      return;
    }

    const canSelectedTokenBeUsedAsGasPaymentToken = getGasPaymentTokens(chainId).includes(selectedToken.address);

    let amount = selectedToken.gmxAccountBalance;

    if (!canSelectedTokenBeUsedAsGasPaymentToken || gasPaymentToken?.address !== selectedToken.address) {
      amount = selectedToken.gmxAccountBalance;
    } else {
      const buffer = convertToTokenAmount(
        gasTokenBuffer,
        gasPaymentToken.decimals,
        getMidPrice(gasPaymentToken.prices)
      )!;

      if (selectedToken.gmxAccountBalance > buffer) {
        const maxAmount = bigMath.max(selectedToken.gmxAccountBalance - buffer, 0n);
        amount = maxAmount;
      }
    }

    const nativeFee = wntFee ?? lastValidNetworkFees.wntFee ?? bridgeNetworkFee ?? baseNativeFee;

    if (unwrappedSelectedTokenAddress === zeroAddress && nativeFee !== undefined) {
      amount = amount - (nativeFee * 11n) / 10n;
    }

    amount = bigMath.max(amount, 0n);

    setInputValue(formatAmountFree(amount, selectedToken.decimals));
  }, [
    account,
    baseNativeFee,
    bridgeNetworkFee,
    chainId,
    gasPaymentToken?.address,
    gasPaymentToken?.decimals,
    gasPaymentToken?.prices,
    gasTokenBuffer,
    lastValidNetworkFees.wntFee,
    selectedToken,
    setInputValue,
    unwrappedSelectedTokenAddress,
    withdrawalViewChain,
    wntFee,
  ]);

  const shouldShowMinRecommendedAmount = useMemo(() => {
    if (
      selectedToken === undefined ||
      selectedToken.gmxAccountBalance === undefined ||
      selectedToken.gmxAccountBalance === 0n ||
      withdrawalViewChain === undefined ||
      account === undefined ||
      inputAmount === undefined ||
      inputAmount <= 0n
    ) {
      return false;
    }

    const canSelectedTokenBeUsedAsGasPaymentToken = getGasPaymentTokens(chainId).includes(selectedToken.address);

    if (!canSelectedTokenBeUsedAsGasPaymentToken) {
      return false;
    }

    if (gasPaymentToken?.address !== selectedToken.address) {
      return false;
    }

    const buffer = convertToTokenAmount(
      gasTokenBufferWarningThreshold,
      gasPaymentToken.decimals,
      getMidPrice(gasPaymentToken.prices)
    )!;

    const maxAmount = bigMath.max(selectedToken.gmxAccountBalance - inputAmount - buffer, 0n);

    return maxAmount === 0n;
  }, [
    account,
    chainId,
    gasPaymentToken?.address,
    gasPaymentToken?.decimals,
    gasPaymentToken?.prices,
    gasTokenBufferWarningThreshold,
    inputAmount,
    selectedToken,
    withdrawalViewChain,
  ]);

  const isInputEmpty = inputAmount === undefined || inputAmount <= 0n;
  const isInsufficientBalance =
    selectedToken?.gmxAccountBalance !== undefined &&
    inputAmount !== undefined &&
    inputAmount > selectedToken.gmxAccountBalance;

  let buttonState: {
    text: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  } = {
    text: t`Withdraw`,
    onClick: handleWithdraw,
  };

  if (hasOutdatedUi) {
    buttonState = {
      text: t`Page outdated, please refresh`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: (
        <>
          <Trans>Withdrawing...</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (isInputEmpty) {
    buttonState = {
      text: t`Enter withdrawal amount`,
      disabled: true,
    };
  } else if (selectedToken?.gmxAccountBalance !== undefined && inputAmount > selectedToken.gmxAccountBalance) {
    buttonState = {
      text: t`Insufficient balance`,
      disabled: true,
    };
  } else if ((withdrawalViewChain as SourceChainId | ContractsChainId | undefined) !== chainId) {
    if (
      (expressTxnParamsAsyncResult.data?.gasPaymentValidations.isOutGasTokenBalance ||
        errors?.isOutOfTokenError?.isGasPaymentToken) &&
      !expressTxnParamsAsyncResult.isLoading
    ) {
      buttonState = {
        text: t`Insufficient gas balance`,
        disabled: true,
      };
    } else if (errors?.isOutOfTokenError && !expressTxnParamsAsyncResult.isLoading) {
      buttonState = {
        text: t`Insufficient ${isOutOfTokenErrorToken?.symbol} balance`,
        disabled: true,
      };
    } else if (showWntWarning && !expressTxnParamsAsyncResult.isLoading) {
      buttonState = {
        text: t`Insufficient gas balance`,
        disabled: true,
      };
    } else if (expressTxnParamsAsyncResult.error && !expressTxnParamsAsyncResult.isLoading) {
      buttonState = {
        text: expressTxnParamsAsyncResult.error.name.slice(0, 32) ?? t`Error simulating withdrawal`,
        disabled: true,
      };
    } else if (
      // We do not show loading state if we have valid params
      // But show loading periodically if the params are not valid to show the user some action
      !expressTxnParamsAsyncResult.data ||
      (expressTxnParamsAsyncResult.isLoading &&
        (!expressTxnParamsAsyncResult.data.gasPaymentValidations.isValid ||
          showWntWarning ||
          errors?.isOutOfTokenError ||
          expressTxnParamsAsyncResult.error))
    ) {
      buttonState = {
        text: (
          <>
            <Trans>Loading...</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }
  }

  useEffect(
    function fallbackWithdrawTokens() {
      const hasSelectedTokenAddress = selectedTokenAddress !== undefined;
      if (!hasSelectedTokenAddress) {
        return;
      }

      const isValidSameChainToken = isSameChain && isValidTokenSafe(chainId, selectedTokenAddress);

      const isValidMultichainToken =
        !isSameChain && MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[chainId]?.includes(selectedTokenAddress);

      if (isValidSameChainToken || isValidMultichainToken) {
        return;
      }

      if (!withdrawalViewChain || !isSettlementChain(chainId) || isVisibleOrView === false) {
        return;
      }

      const settlementChainWrappedTokenAddresses = MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[chainId];
      if (!settlementChainWrappedTokenAddresses) {
        return;
      }

      const preferredToken = settlementChainWrappedTokenAddresses.find((tokenAddress) => {
        const tokenData = tokensData?.[tokenAddress];
        return (
          tokenData?.address === CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId] &&
          tokenData?.gmxAccountBalance !== undefined &&
          tokenData.gmxAccountBalance > 0n
        );
      });

      if (preferredToken) {
        setSelectedTokenAddress(preferredToken);
        return;
      }

      let maxGmxAccountBalanceUsd = 0n;
      let maxBalanceSettlementChainTokenAddress: string | undefined = undefined;

      for (const tokenAddress of settlementChainWrappedTokenAddresses) {
        const tokenData = tokensData?.[tokenAddress];
        if (tokenData === undefined) {
          continue;
        }

        const prices = tokenData.prices;
        const balance = tokenData.gmxAccountBalance;
        if (prices === undefined || balance === undefined) {
          continue;
        }

        const price = getMidPrice(prices);
        const balanceUsd = convertToUsd(balance, tokenData.decimals, price)!;
        if (balanceUsd > maxGmxAccountBalanceUsd) {
          maxGmxAccountBalanceUsd = balanceUsd;
          maxBalanceSettlementChainTokenAddress = tokenAddress;
        }
      }

      if (maxBalanceSettlementChainTokenAddress) {
        setSelectedTokenAddress(maxBalanceSettlementChainTokenAddress);
      }
    },
    [
      chainId,
      isSameChain,
      isVisibleOrView,
      selectedTokenAddress,
      setSelectedTokenAddress,
      tokensData,
      withdrawalViewChain,
    ]
  );

  const isTestnet = isTestnetChain(chainId);

  const estimatedTimeValue = useMemo(() => {
    if (isSameChain) {
      return <Trans>Instant</Trans>;
    }

    if (inputAmount === undefined || inputAmount === 0n) {
      return "...";
    }

    return isTestnet ? <Trans>1m 40s</Trans> : <Trans>20s</Trans>;
  }, [isSameChain, inputAmount, isTestnet]);

  const networkFeeValue = useMemo(() => {
    if (isSameChain) {
      if (!sameChainNetworkFeeDetails) {
        return "...";
      }

      return (
        <AmountWithUsdBalance
          className="leading-1"
          amount={sameChainNetworkFeeDetails.amount}
          decimals={sameChainNetworkFeeDetails.decimals}
          usd={sameChainNetworkFeeDetails.usd}
          symbol={sameChainNetworkFeeDetails.symbol}
        />
      );
    }

    if (networkFeeUsd === undefined || gasPaymentToken === undefined) {
      return "...";
    }

    return (
      <AmountWithUsdBalance
        className="leading-1"
        amount={networkFeeInGasPaymentToken}
        decimals={gasPaymentToken.decimals}
        usd={networkFeeUsd}
        symbol={gasPaymentToken.symbol}
      />
    );
  }, [gasPaymentToken, isSameChain, networkFeeInGasPaymentToken, networkFeeUsd, sameChainNetworkFeeDetails]);

  const withdrawFeeValue = useMemo(() => {
    if (isSameChain) {
      return <Trans>No fee</Trans>;
    }

    if (protocolFeeUsd === undefined || selectedTokenSettlementChainTokenId === undefined) {
      return "...";
    }

    return (
      <AmountWithUsdBalance
        className="leading-1"
        amount={protocolFeeAmount}
        decimals={selectedTokenSettlementChainTokenId.decimals}
        usd={protocolFeeUsd}
        symbol={selectedToken?.symbol}
      />
    );
  }, [isSameChain, protocolFeeUsd, selectedTokenSettlementChainTokenId, protocolFeeAmount, selectedToken?.symbol]);

  const networkItemDisabledMessage = useCallback(
    (option: { id: number; name: string; disabled?: boolean | string }) => {
      return t`Withdrawing ${selectedToken?.symbol} to ${option.name} is not currently supported`;
    },
    [selectedToken?.symbol]
  );

  return (
    <div className="flex grow flex-col overflow-y-auto p-adaptive">
      <div className="flex flex-col gap-[--padding-adaptive]">
        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Asset</Trans>
          </div>
          <DropdownSelector
            value={selectedTokenAddress}
            onChange={handlePickToken}
            placeholder={t`Select token`}
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={tokenOptions}
            item={WithdrawAssetItem}
            itemKey={withdrawAssetItemKey}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>To Network</Trans>
          </div>
          <DropdownSelector
            value={withdrawalViewChain}
            onChange={(value) => {
              setWithdrawalViewChain(Number(value) as SourceChainId);
            }}
            placeholder={t`Select network`}
            button={
              <div className="flex items-center gap-8">
                {withdrawalViewChain !== undefined ? (
                  <>
                    <img
                      src={CHAIN_ID_TO_NETWORK_ICON[withdrawalViewChain]}
                      alt={getChainName(withdrawalViewChain)}
                      className="size-20"
                    />
                    <span className="text-16 leading-base">{getChainName(withdrawalViewChain)}</span>
                  </>
                ) : (
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
                )}
              </div>
            }
            options={filteredNetworks}
            item={NetworkItem}
            itemKey={networkItemKey}
            itemDisabled={networkItemDisabled}
            itemDisabledMessage={networkItemDisabledMessage}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium flex items-center justify-between text-typography-secondary">
            <Trans>Withdraw</Trans>
            {selectedToken !== undefined &&
              selectedToken.gmxAccountBalance !== undefined &&
              selectedToken !== undefined && (
                <div>
                  <Trans>Available:</Trans>{" "}
                  <Amount
                    className="text-typography-primary"
                    amount={selectedToken.gmxAccountBalance}
                    decimals={selectedToken.decimals}
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
              className="w-full rounded-8 border border-slate-800 bg-slate-800 py-13 pl-14 pr-96 text-16 leading-base
                         focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
              placeholder="0.00"
            />
            <div className="pointer-events-none absolute right-14 top-1/2 flex -translate-y-1/2 items-center gap-8">
              <span className="text-typography-secondary">{selectedToken?.symbol}</span>
              <button
                className="text-body-small pointer-events-auto rounded-full bg-slate-600 px-8 py-2 font-medium disabled:opacity-50
                         hover:not-disabled:bg-slate-500 focus-visible:not-disabled:bg-slate-500 active:not-disabled:bg-slate-500/70"
                disabled={isMaxButtonDisabled}
                onClick={handleMaxButtonClick}
              >
                <Trans>Max</Trans>
              </button>
            </div>
          </div>
          <div className="text-body-medium text-typography-secondary numbers">{formatUsd(inputAmountUsd ?? 0n)}</div>
        </div>
      </div>

      {!isInsufficientBalance && (
        <>
          {isAboveLimit && (
            <AlertInfoCard type="warning" className="my-4">
              <div>
                <Trans>
                  The amount you are trying to withdraw exceeds the limit. Please try an amount smaller than{" "}
                  <span className="numbers">{upperLimitFormatted}</span>.
                </Trans>
              </div>
            </AlertInfoCard>
          )}
          {isBelowLimit && (
            <AlertInfoCard type="warning" className="my-4">
              <div>
                <Trans>
                  The amount you are trying to withdraw is below the limit. Please try an amount larger than{" "}
                  <span className="numbers">{lowerLimitFormatted}</span>.
                </Trans>
              </div>
            </AlertInfoCard>
          )}

          {shouldShowMinRecommendedAmount && (
            <AlertInfoCard type="info" className="my-4">
              <div>
                {isSameChain ? (
                  <Trans>
                    You're withdrawing {selectedToken?.symbol}, your gas token. Gas is required for express trading, so
                    please keep at least{" "}
                    <span className="numbers">{formatUsd(gasTokenBuffer, { displayDecimals: 0 })}</span> in{" "}
                    {selectedToken?.symbol} or switch your gas token in{" "}
                    <WarningSettingsButton>settings</WarningSettingsButton>.
                  </Trans>
                ) : (
                  <Trans>
                    You're withdrawing {selectedToken?.symbol}, your gas token. Gas is required for this withdrawal, so
                    please keep at least{" "}
                    <span className="numbers">{formatUsd(gasTokenBuffer, { displayDecimals: 0 })}</span> in{" "}
                    {selectedToken?.symbol} or switch your gas token in{" "}
                    <WarningSettingsButton>settings</WarningSettingsButton>.
                  </Trans>
                )}
              </div>
            </AlertInfoCard>
          )}

          {errors?.isOutOfTokenError &&
            !errors.isOutOfTokenError.isGasPaymentToken &&
            isOutOfTokenErrorToken !== undefined && (
              <AlertInfoCard type="info" className="my-4">
                <div>
                  <Trans>
                    Withdrawing requires{" "}
                    <Amount
                      amount={errors.isOutOfTokenError.requiredAmount ?? 0n}
                      decimals={isOutOfTokenErrorToken.decimals}
                      isStable={isOutOfTokenErrorToken.isStable}
                      symbol={isOutOfTokenErrorToken.symbol}
                    />{" "}
                    while you have{" "}
                    <Amount
                      amount={isOutOfTokenErrorToken.gmxAccountBalance ?? 0n}
                      decimals={isOutOfTokenErrorToken.decimals}
                      isStable={isOutOfTokenErrorToken.isStable}
                      symbol={isOutOfTokenErrorToken.symbol}
                    />
                    . Please{" "}
                    <span
                      className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
                      onClick={() => {
                        setIsVisibleOrView(false);
                        history.push(`/trade/swap?to=${isOutOfTokenErrorToken.symbol}`);
                      }}
                    >
                      swap
                    </span>{" "}
                    or{" "}
                    <span
                      className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
                      onClick={() => {
                        setDepositViewTokenAddress(
                          convertTokenAddress(chainId, isOutOfTokenErrorToken.address, "native")
                        );
                        if (errors?.isOutOfTokenError?.requiredAmount !== undefined) {
                          setDepositViewTokenInputValue(
                            formatAmountFree(errors.isOutOfTokenError.requiredAmount, isOutOfTokenErrorToken.decimals)
                          );
                        }
                        setIsVisibleOrView("deposit");
                      }}
                    >
                      deposit
                    </span>{" "}
                    more {isOutOfTokenErrorToken?.symbol} to your GMX account.
                  </Trans>
                </div>
              </AlertInfoCard>
            )}

          {showWntWarning && !(errors?.isOutOfTokenError?.tokenAddress === wrappedNativeTokenAddress) && (
            <InsufficientWntBanner
              neededAmount={wntFee ?? lastValidNetworkFees.wntFee}
              neededAmountUsd={wntFeeUsd ?? lastValidNetworkFees.wntFeeUsd}
            />
          )}
        </>
      )}

      <div className="h-32 shrink-0 grow" />

      {selectedTokenAddress && (
        <div className="mb-16 flex flex-col gap-10">
          <SyntheticsInfoRow
            label={<Trans>Estimated Time</Trans>}
            valueClassName="numbers"
            value={estimatedTimeValue}
          />
          <SyntheticsInfoRow label={<Trans>Network Fee</Trans>} value={networkFeeValue} />
          <SyntheticsInfoRow label={<Trans>Withdraw Fee</Trans>} value={withdrawFeeValue} />
          <SyntheticsInfoRow
            label={<Trans>GMX Balance</Trans>}
            value={<ValueTransition from={formatUsd(gmxAccountUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />}
          />
        </div>
      )}

      <Button
        variant="primary-action"
        className="w-full shrink-0"
        onClick={buttonState.onClick}
        disabled={buttonState.disabled}
      >
        {buttonState.text}
      </Button>
    </div>
  );
};

function networkItemKey(option: { id: number; name: string }) {
  return option.id;
}

function networkItemDisabled(option: { id: number; name: string; disabled?: boolean | string }): boolean {
  return !!option.disabled;
}

function NetworkItem({ option }: { option: { id: number; name: string; disabled?: boolean } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
    </div>
  );
}

function WithdrawAssetItem({ option }: { option: TokenData }) {
  const isZero = option.gmxAccountBalance === 0n || option.gmxAccountBalance === undefined;
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex gap-8">
        <TokenIcon symbol={option.symbol} displaySize={20} />
        <span>
          {option.symbol} <span className="text-body-small text-typography-secondary">{option.name}</span>
        </span>
      </div>
      <div className={cx(isZero ? "text-typography-secondary" : "text-typography-primary")}>
        <Amount
          className="text-typography-primary"
          amount={option.gmxAccountBalance}
          decimals={option.decimals}
          isStable={option.isStable}
          showZero
          emptyValue="-"
        />
      </div>
    </div>
  );
}

function withdrawAssetItemKey(option: TokenData) {
  return option.address;
}

async function simulateWithdraw({
  provider,
  signer,
  chainId,
  srcChainId,
  relayParamsPayload,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  params,
}: {
  provider: Provider;
  signer: WalletSigner;
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  relayParamsPayload: RawRelayParamsPayload;
  params: BridgeOutParams;
}): Promise<void> {
  if (!provider) {
    throw new Error("Provider is required");
  }

  const { callData, feeAmount, feeToken, to } = await buildAndSignBridgeOutTxn({
    signer,
    account: signer.address,
    chainId,
    srcChainId,
    relayParamsPayload,
    params,
    emptySignature: true,
    relayerFeeTokenAddress,
    relayerFeeAmount: relayerFeeAmount,
  });

  await fallbackCustomError(async () => {
    await callRelayTransaction({
      chainId: chainId as ContractsChainId,
      calldata: callData,
      provider,
      gelatoRelayFeeAmount: feeAmount,
      gelatoRelayFeeToken: feeToken,
      relayRouterAddress: to as Address,
    });
  }, "simulation");
}

function WarningSettingsButton({ children }: { children: React.ReactNode }) {
  const { setIsSettingsVisible } = useSettings();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  return (
    <span
      className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
      onClick={() => {
        setIsSettingsVisible(true);
        setTimeout(() => {
          setIsVisibleOrView(false);
        }, 200);
      }}
    >
      {children}
    </span>
  );
}
