import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type Provider } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useHistory } from "react-router-dom";
import { Address, encodeAbiParameters, zeroAddress } from "viem";
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
  FAKE_INPUT_AMOUNT_MAP,
  getLayerZeroEndpointId,
  getMappedTokenId,
  getMultichainTokenId,
  getStargatePoolAddress,
  isSettlementChain,
  MULTICHAIN_FUNDING_SLIPPAGE_BPS,
  MULTICHAIN_TOKEN_MAPPING,
  MULTICHAIN_TRANSFER_SUPPORTED_TOKENS,
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
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectExpressGlobalParams,
  selectGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryError, useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { fallbackCustomError } from "domain/multichain/fallbackCustomError";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { BridgeOutParams } from "domain/multichain/types";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useQuoteOft } from "domain/multichain/useQuoteOft";
import { useQuoteOftLimits } from "domain/multichain/useQuoteOftLimits";
import { useQuoteSend } from "domain/multichain/useQuoteSend";
import { callRelayTransaction } from "domain/synthetics/express/callRelayTransaction";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder, RawRelayParamsPayload } from "domain/synthetics/express/types";
import { useSwitchGasPaymentTokenIfRequired } from "domain/synthetics/express/useSwitchGasPaymentTokenIfRequired";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { convertToUsd, TokenData } from "domain/tokens";
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
import { bigintToNumber, expandDecimals, formatAmountFree, formatUsd, parseValue, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { WalletSigner } from "lib/wallets";
import { getContract } from "sdk/configs/contracts";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";
import type { SendParamStruct } from "typechain-types-stargate/IStargate";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import { useAvailableToTradeAssetMultichain, useGmxAccountWithdrawNetworks } from "components/GmxAccountModal/hooks";
import NumberInput from "components/NumberInput/NumberInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { InsufficientWntBanner } from "./InsufficientWntBanner";
import { toastCustomOrStargateError } from "./toastCustomOrStargateError";
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

export const WithdrawalView = () => {
  const history = useHistory();
  const { chainId } = useChainId();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const [withdrawalViewChain, setWithdrawalViewChain] = useGmxAccountWithdrawalViewChain();
  const { address: account } = useAccount();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setDepositViewTokenInputValue] = useGmxAccountDepositViewTokenInputValue();
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [inputValue, setInputValue] = useGmxAccountWithdrawalViewTokenInputValue();
  const [selectedTokenAddress, setSelectedTokenAddress] = useGmxAccountWithdrawalViewTokenAddress();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFirstWithdrawal = useIsFirstWithdrawal();
  const { setMultichainSubmittedWithdrawal, setMultichainWithdrawalSentTxnHash, setMultichainWithdrawalSentError } =
    useSyntheticsEvents();

  const { tokensData } = useTokensDataRequest(chainId, withdrawalViewChain);
  const networks = useGmxAccountWithdrawNetworks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const relayerFeeToken = getByKey(tokensData, globalExpressParams?.relayerFeeTokenAddress);
  const { gasTokenBuffer, gasTokenBufferWarningThreshold } = useUsdGasTokenBuffer();

  const { provider } = useJsonRpcProvider(chainId);

  const selectedToken = useMemo(() => {
    return getByKey(tokensData, selectedTokenAddress);
  }, [selectedTokenAddress, tokensData]);

  const unwrappedSelectedTokenAddress =
    selectedTokenAddress !== undefined ? convertTokenAddress(chainId, selectedTokenAddress, "native") : undefined;
  const unwrappedSelectedTokenSymbol = unwrappedSelectedTokenAddress
    ? getToken(chainId, unwrappedSelectedTokenAddress).symbol
    : undefined;
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

  const filteredNetworks = useMemo(() => {
    if (!unwrappedSelectedTokenAddress) {
      return networks;
    }

    return networks.filter((network) => {
      const mappedTokenId = getMappedTokenId(
        chainId as SettlementChainId,
        unwrappedSelectedTokenAddress,
        network.id as SourceChainId
      );
      return mappedTokenId !== undefined;
    });
  }, [unwrappedSelectedTokenAddress, networks, chainId]);

  const options = useMemo((): TokenData[] => {
    if (!isSettlementChain(chainId) || !tokensData) {
      return EMPTY_ARRAY;
    }

    return (
      MULTICHAIN_TRANSFER_SUPPORTED_TOKENS[chainId]
        ?.map((tokenAddress) => tokensData[tokenAddress] as TokenData | undefined)
        .filter((token): token is TokenData => {
          return token !== undefined && token.address !== zeroAddress;
        })
        .sort((a, b) => {
          const aFloat = bigintToNumber(a.gmxAccountBalance ?? 0n, a.decimals);
          const bFloat = bigintToNumber(b.gmxAccountBalance ?? 0n, b.decimals);

          return bFloat - aFloat;
        }) ?? EMPTY_ARRAY
    );
  }, [chainId, tokensData]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const { nextGmxAccountBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || inputAmount === undefined || inputAmountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountUsd ?? 0n) - inputAmountUsd;

    return { nextGmxAccountBalanceUsd };
  }, [selectedToken, inputAmount, inputAmountUsd, gmxAccountUsd]);

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (!account || inputAmount === undefined || inputAmount <= 0n || withdrawalViewChain === undefined) {
      return;
    }

    return getMultichainTransferSendParams({
      dstChainId: withdrawalViewChain,
      account,
      amountLD: inputAmount,
      isDeposit: false,
    });
  }, [account, inputAmount, withdrawalViewChain]);

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
    fromStargateAddress: selectedTokenSettlementChainTokenId?.stargate,
    fromChainProvider: provider,
    fromChainId: chainId,
    toChainId: withdrawalViewChain,
  });

  const baseSendParams = useMemo(() => {
    if (!withdrawalViewChain || !account || !unwrappedSelectedTokenSymbol) {
      return;
    }

    const fakeInputAmount = FAKE_INPUT_AMOUNT_MAP[unwrappedSelectedTokenSymbol];

    if (fakeInputAmount === undefined) {
      return;
    }

    return getMultichainTransferSendParams({
      dstChainId: withdrawalViewChain,
      account,
      amountLD: fakeInputAmount,
      isDeposit: false,
      srcChainId: chainId,
    });
  }, [account, chainId, unwrappedSelectedTokenSymbol, withdrawalViewChain]);
  const isMaxButtonDisabled = useMemo(() => {
    if (!baseSendParams) {
      return true;
    }

    return false;
  }, [baseSendParams]);

  const baseQuoteSend = useQuoteSend({
    sendParams: baseSendParams,
    fromStargateAddress: selectedTokenSettlementChainTokenId?.stargate,
    fromChainProvider: provider,
    fromChainId: chainId,
    toChainId: withdrawalViewChain,
  });

  const {
    networkFeeUsd: bridgeNetworkFeeUsd,
    protocolFeeUsd,
    protocolFeeAmount,
    networkFee: bridgeNetworkFee,
  } = useMultichainQuoteFeeUsd({
    quoteSend,
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
  }, [withdrawalViewChain, selectedTokenAddress, unwrappedSelectedTokenAddress, inputAmount, chainId]);

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (
      account === undefined ||
      bridgeOutParams === undefined ||
      provider === undefined ||
      withdrawalViewChain === undefined
    ) {
      return;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({ gasPaymentParams, relayParams }) => ({
      txnData: await buildAndSignBridgeOutTxn({
        chainId: chainId as SettlementChainId,
        signer: undefined,
        account,
        relayParamsPayload: relayParams as RawRelayParamsPayload,
        params: bridgeOutParams,
        emptySignature: true,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        srcChainId: withdrawalViewChain,
      }),
    });

    return expressTransactionBuilder;
  }, [account, bridgeOutParams, chainId, provider, withdrawalViewChain]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    expressTransactionBuilder,
    isGmxAccount: true,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);

  const isOutOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors?.isOutOfTokenError?.tokenAddress);
    }
  }, [errors, tokensData]);

  useSwitchGasPaymentTokenIfRequired({
    gasPaymentToken: globalExpressParams?.gasPaymentToken,
    isOutGasTokenBalance: errors?.isOutOfTokenError?.isGasPaymentToken,
    totalGasPaymentTokenAmount: errors?.isOutOfTokenError
      ? errors.isOutOfTokenError.requiredAmount - errors.isOutOfTokenError.balance
      : undefined,
    isGmxAccount: true,
  });

  const relayFeeAmount = expressTxnParamsAsyncResult?.data?.gasPaymentParams.relayerFeeAmount;
  const gasPaymentParams = expressTxnParamsAsyncResult?.data?.gasPaymentParams;

  const { networkFeeUsd, networkFee } = useMemo(() => {
    if (relayFeeAmount === undefined || relayerFeeToken === undefined) {
      return { networkFeeUsd: undefined, networkFee: undefined };
    }

    const relayFeeUsd = convertToUsd(relayFeeAmount, relayerFeeToken.decimals, getMidPrice(relayerFeeToken.prices));

    if (relayFeeUsd === undefined || bridgeNetworkFeeUsd === undefined || bridgeNetworkFee === undefined) {
      return { networkFeeUsd: undefined, networkFee: undefined };
    }

    return {
      networkFeeUsd: relayFeeUsd + bridgeNetworkFeeUsd,
      networkFee:
        // We assume it is all in WNT
        relayFeeAmount + bridgeNetworkFee,
    };
  }, [bridgeNetworkFee, bridgeNetworkFeeUsd, relayFeeAmount, relayerFeeToken]);

  const [showWntWarning, setShowWntWarning] = useState(false);
  const [lastValidNetworkFees, setLastValidNetworkFees] = useState({
    networkFee: networkFee,
    networkFeeUsd: networkFeeUsd,
  });
  useEffect(() => {
    if (networkFee !== undefined && networkFeeUsd !== undefined) {
      setLastValidNetworkFees({
        networkFee,
        networkFeeUsd,
      });
    }
  }, [networkFee, networkFeeUsd]);
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

    const someNetworkFee = networkFee ?? lastValidNetworkFees.networkFee;
    if (someNetworkFee === undefined) {
      return;
    }

    const value = (unwrappedSelectedTokenAddress === zeroAddress ? inputAmount : 0n) ?? 0n;

    setShowWntWarning(wrappedNativeToken.gmxAccountBalance - value < someNetworkFee);
  }, [
    wrappedNativeToken,
    networkFee,
    unwrappedSelectedTokenAddress,
    inputAmount,
    lastValidNetworkFees.networkFee,
    wrappedNativeTokenAddress,
  ]);

  const handlePickToken = useCallback(
    (tokenAddress: string) => {
      setSelectedTokenAddress(tokenAddress);

      if (withdrawalViewChain !== undefined) {
        const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
        const tokenId = getMappedTokenId(chainId as SettlementChainId, unwrappedTokenAddress, withdrawalViewChain);
        if (tokenId === undefined) {
          for (const someSourceChainId of Object.keys(MULTICHAIN_TOKEN_MAPPING[chainId]).map(
            Number
          ) as SourceChainId[]) {
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
    [chainId, setSelectedTokenAddress, setWithdrawalViewChain, withdrawalViewChain]
  );

  const handleWithdraw = async () => {
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
      helperToast.error("Missing required parameters");
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    const expressTxnParams = await expressTxnParamsAsyncResult.promise;

    if (expressTxnParams === undefined) {
      helperToast.error("Missing required parameters");
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
          relayParamsPayload: relayParamsPayload as RawRelayParamsPayload,
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

        const txResult = await receipt.wait();

        if (txResult.status === "success") {
          sendTxnSentMetric(metricData.metricId);
          if (txResult.transactionHash && mockWithdrawalId) {
            setMultichainWithdrawalSentTxnHash(mockWithdrawalId, txResult.transactionHash);
          }
          setIsVisibleOrView("main");
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
  };

  const gasPaymentToken = useSelector(selectGasPaymentToken);

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

    const nativeFee = bridgeNetworkFee ?? baseQuoteSend?.nativeFee;

    if (unwrappedSelectedTokenAddress === zeroAddress && nativeFee !== undefined) {
      amount = amount - (nativeFee * 11n) / 10n;
    }

    amount = bigMath.max(amount, 0n);

    setInputValue(formatAmountFree(amount, selectedToken.decimals));
  }, [
    account,
    baseQuoteSend?.nativeFee,
    bridgeNetworkFee,
    chainId,
    gasPaymentToken?.address,
    gasPaymentToken?.decimals,
    gasPaymentToken?.prices,
    gasTokenBuffer,
    selectedToken,
    setInputValue,
    unwrappedSelectedTokenAddress,
    withdrawalViewChain,
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

  if (isSubmitting) {
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
  } else if (
    (expressTxnParamsAsyncResult.data?.gasPaymentValidations.isOutGasTokenBalance ||
      errors?.isOutOfTokenError?.isGasPaymentToken) &&
    !expressTxnParamsAsyncResult.isLoading
  ) {
    buttonState = {
      text: t`Insufficient ${gasPaymentParams?.relayFeeToken.symbol} balance to pay for gas`,
      disabled: true,
    };
  } else if (errors?.isOutOfTokenError && !expressTxnParamsAsyncResult.isLoading) {
    buttonState = {
      text: t`Insufficient ${isOutOfTokenErrorToken?.symbol} balance`,
      disabled: true,
    };
  } else if (showWntWarning) {
    buttonState = {
      text: t`Insufficient ${wrappedNativeToken?.symbol} balance`,
      disabled: true,
    };
  } else if (expressTxnParamsAsyncResult.error && !expressTxnParamsAsyncResult.isLoading) {
    buttonState = {
      text: expressTxnParamsAsyncResult.error.name.slice(0, 32) ?? t`Error simulating withdrawal`,
      disabled: true,
    };
  } else if (!expressTxnParamsAsyncResult.data) {
    buttonState = {
      text: (
        <>
          <Trans>Loading</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  }

  const hasSelectedToken = selectedTokenAddress !== undefined;
  useEffect(
    function fallbackWithdrawTokens() {
      if (hasSelectedToken || !withdrawalViewChain || !isSettlementChain(chainId) || isVisibleOrView === false) {
        return;
      }

      const settlementChainWrappedTokenAddresses = MULTICHAIN_TRANSFER_SUPPORTED_TOKENS[chainId];
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
    [chainId, hasSelectedToken, isVisibleOrView, setSelectedTokenAddress, tokensData, withdrawalViewChain]
  );

  const isTestnet = isTestnetChain(chainId);

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
            options={options}
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
              <Trans>
                The amount you are trying to withdraw exceeds the limit. Please try an amount smaller than{" "}
                <span className="numbers">{upperLimitFormatted}</span>.
              </Trans>
            </AlertInfoCard>
          )}
          {isBelowLimit && (
            <AlertInfoCard type="warning" className="my-4">
              <Trans>
                The amount you are trying to withdraw is below the limit. Please try an amount larger than{" "}
                <span className="numbers">{lowerLimitFormatted}</span>.
              </Trans>
            </AlertInfoCard>
          )}

          {shouldShowMinRecommendedAmount && (
            <AlertInfoCard type="info" className="my-4">
              <Trans>
                You're withdrawing {selectedToken?.symbol}, your gas token. Gas is required for this withdrawal, so
                please keep at least{" "}
                <span className="numbers">{formatUsd(gasTokenBuffer, { displayDecimals: 0 })}</span> in{" "}
                {selectedToken?.symbol} or switch your gas token in settings.
              </Trans>
            </AlertInfoCard>
          )}

          {errors?.isOutOfTokenError &&
            !errors.isOutOfTokenError.isGasPaymentToken &&
            isOutOfTokenErrorToken !== undefined && (
              <AlertInfoCard type="error" className="my-4">
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
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsVisibleOrView(false);
                      history.push(`/trade/swap?to=${isOutOfTokenErrorToken.symbol}`);
                    }}
                  >
                    swap
                  </Button>{" "}
                  or{" "}
                  <Button
                    variant="link"
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
                  </Button>{" "}
                  more {isOutOfTokenErrorToken?.symbol} to your GMX account.
                </Trans>
              </AlertInfoCard>
            )}

          {showWntWarning && !(errors?.isOutOfTokenError?.tokenAddress === wrappedNativeTokenAddress) && (
            <InsufficientWntBanner
              neededAmount={networkFee ?? lastValidNetworkFees.networkFee}
              neededAmountUsd={networkFeeUsd ?? lastValidNetworkFees.networkFeeUsd}
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
            value={
              inputAmount === undefined || inputAmount === 0n ? (
                "..."
              ) : isTestnet ? (
                <Trans>1m 40s</Trans>
              ) : (
                <Trans>20s</Trans>
              )
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Network Fee</Trans>}
            value={
              networkFeeUsd !== undefined && relayerFeeToken ? (
                <AmountWithUsdBalance
                  className="leading-1"
                  amount={networkFee}
                  decimals={relayerFeeToken.decimals}
                  usd={networkFeeUsd}
                  symbol={relayerFeeToken.symbol}
                />
              ) : (
                "..."
              )
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Withdraw Fee</Trans>}
            value={
              protocolFeeUsd !== undefined && selectedTokenSettlementChainTokenId ? (
                <AmountWithUsdBalance
                  className="leading-1"
                  amount={protocolFeeAmount}
                  decimals={selectedTokenSettlementChainTokenId.decimals}
                  usd={protocolFeeUsd}
                  symbol={selectedToken?.symbol}
                />
              ) : (
                "..."
              )
            }
          />
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

function NetworkItem({ option }: { option: { id: number; name: string } }) {
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
