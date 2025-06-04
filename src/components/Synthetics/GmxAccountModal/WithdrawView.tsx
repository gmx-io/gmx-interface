import { t, Trans } from "@lingui/macro";
import { Contract, type Provider } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import { Address, BaseError, decodeErrorResult, encodeAbiParameters, Hex, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { getChainName, UiSettlementChain } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getLayerZeroEndpointId,
  getMultichainTokenId,
  getStargatePoolAddress,
  isSettlementChain,
  MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS,
} from "context/GmxAccountContext/config";
import {
  useGmxAccountModalOpen,
  useGmxAccountWithdrawViewTokenAddress,
  useGmxAccountWithdrawViewTokenInputValue,
} from "context/GmxAccountContext/hooks";
import { IStargateAbi } from "context/GmxAccountContext/stargatePools";
import { TokenChainData } from "context/GmxAccountContext/types";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectExpressGlobalParams,
  selectGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { BridgeOutParams, buildAndSignBridgeOutTxn } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTransactionBuilder, RawMultichainRelayParamsPayload } from "domain/synthetics/express/types";
import { callRelayTransaction } from "domain/synthetics/gassless/txns/expressOrderDebug";
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
import {
  bigintToNumber,
  formatAmountFree,
  formatBalanceAmount,
  formatUsd,
  parseValue,
  USD_DECIMALS,
} from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { switchNetwork, WalletSigner } from "lib/wallets";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { extendError, OrderErrorContext } from "sdk/utils/errors";
import { convertToTokenAmount, getMidPrice } from "sdk/utils/tokens";
import {
  IStargate,
  MessagingFeeStruct,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
  SendParamStruct,
} from "typechain-types-stargate/interfaces/IStargate";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import {
  useAvailableToTradeAssetMultichain,
  useGmxAccountTokensDataObject,
  useGmxAccountWithdrawNetworks,
  useMultichainTokensRequest,
} from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useArbitraryRelayParamsAndPayload } from "./arbitraryRelayParams";
import { getSendParamsWithoutSlippage } from "./getSendParams";
import { ModalShrinkingContent } from "./ModalShrinkingContent";
import { Selector } from "./Selector";
import { applySlippageBps, SLIPPAGE_BPS } from "./slippage";
import { toastCustomOrStargateError } from "./toastCustomOrStargateError";
import { useGmxAccountFundingHistory } from "./useGmxAccountFundingHistory";
import { useMultichainQuoteFeeUsd } from "./useMultichainQuoteFeeUsd";

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

export const WithdrawView = () => {
  const { chainId, srcChainId } = useChainId();
  const { address: account, isConnected } = useAccount();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [inputValue, setInputValue] = useGmxAccountWithdrawViewTokenInputValue();
  const [selectedTokenAddress, setSelectedTokenAddress] = useGmxAccountWithdrawViewTokenAddress();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFirstWithdrawal = useIsFirstWithdrawal();
  const { setMultichainSubmittedWithdrawal, setMultichainWithdrawalSentTxnHash, setMultichainWithdrawalSentError } =
    useSyntheticsEvents();

  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const networks = useGmxAccountWithdrawNetworks();
  const { tokenChainDataArray: multichainTokens } = useMultichainTokensRequest();
  const expressGlobalParams = useSelector(selectExpressGlobalParams);
  const relayerFeeToken = getByKey(gmxAccountTokensData, expressGlobalParams?.relayerFeeTokenAddress);

  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);

  const selectedToken = useMemo(() => {
    return getByKey(gmxAccountTokensData, selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountTokensData]);

  const selectedTokenSettlementChainTokenId =
    selectedTokenAddress && chainId !== undefined ? getMultichainTokenId(chainId, selectedTokenAddress) : undefined;

  const realInputAmount =
    selectedToken && inputValue !== undefined ? parseValue(inputValue, selectedToken.decimals) : undefined;
  const inputAmount = useLeadingDebounce(realInputAmount);
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedToken.prices.maxPrice)
    : undefined;

  const options = useMemo(() => {
    if (!isSettlementChain(chainId)) {
      return EMPTY_ARRAY;
    }

    return MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[chainId as UiSettlementChain]
      ?.map((tokenAddress) => gmxAccountTokensData[tokenAddress])
      .filter((token) => token.address !== zeroAddress)
      .sort((a, b) => {
        const aFloat = bigintToNumber(a.balance ?? 0n, a.decimals);
        const bFloat = bigintToNumber(b.balance ?? 0n, b.decimals);

        return bFloat - aFloat;
      });
  }, [gmxAccountTokensData, chainId]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const unwrappedSelectedTokenAddress =
    selectedToken !== undefined ? convertTokenAddress(chainId, selectedToken.address, "native") : undefined;

  const sourceChainSelectedUnwrappedToken = useMemo((): TokenChainData | undefined => {
    if (srcChainId === undefined || selectedToken === undefined) {
      return undefined;
    }

    const sourceChainToken = multichainTokens.find(
      (token) => token.address === unwrappedSelectedTokenAddress && token.sourceChainId === srcChainId
    );

    return sourceChainToken;
  }, [multichainTokens, selectedToken, srcChainId, unwrappedSelectedTokenAddress]);

  const sourceChainTokenBalanceUsd = useMemo(() => {
    if (sourceChainSelectedUnwrappedToken === undefined) {
      return 0n;
    }

    return convertToUsd(
      sourceChainSelectedUnwrappedToken.sourceChainBalance,
      sourceChainSelectedUnwrappedToken.sourceChainDecimals,
      sourceChainSelectedUnwrappedToken.sourceChainPrices?.maxPrice
    );
  }, [sourceChainSelectedUnwrappedToken]);

  const { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || inputAmount === undefined || inputAmountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined, nextSourceChainBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountUsd ?? 0n) - inputAmountUsd;
    const nextSourceChainBalanceUsd = (sourceChainTokenBalanceUsd ?? 0n) + inputAmountUsd;

    return { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd };
  }, [selectedToken, inputAmount, inputAmountUsd, gmxAccountUsd, sourceChainTokenBalanceUsd]);

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (!account || inputAmount === undefined || inputAmount <= 0n || srcChainId === undefined) {
      return;
    }

    return getSendParamsWithoutSlippage({
      dstChainId: srcChainId,
      account,
      inputAmount,
      isDeposit: false,
    });
  }, [account, inputAmount, srcChainId]);

  const quoteOftCondition =
    sendParamsWithoutSlippage !== undefined &&
    selectedTokenSettlementChainTokenId !== undefined &&
    provider !== undefined &&
    selectedTokenAddress !== undefined;
  const quoteOftQuery = useSWR<
    | {
        limit: OFTLimitStruct;
        oftFeeDetails: OFTFeeDetailStruct[];
        receipt: OFTReceiptStruct;
      }
    | undefined
  >(
    quoteOftCondition
      ? [
          "quoteOft",
          sendParamsWithoutSlippage.dstEid,
          sendParamsWithoutSlippage.to,
          sendParamsWithoutSlippage.amountLD,
          selectedTokenSettlementChainTokenId?.stargate,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteOftCondition) {
          return;
        }

        const settlementChainStargateAddress = selectedTokenSettlementChainTokenId!.stargate;

        const stargateInstance = new Contract(
          settlementChainStargateAddress,
          IStargateAbi,
          provider
        ) as unknown as IStargate;

        const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
          await stargateInstance.quoteOFT(sendParamsWithoutSlippage);

        return {
          limit,
          oftFeeDetails,
          receipt,
        };
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  const quoteOft = quoteOftQuery.data;

  const lastMinAmountLD = useRef<bigint | undefined>(undefined);
  const lastMaxAmountLD = useRef<bigint | undefined>(undefined);
  if (quoteOft && quoteOft.limit.maxAmountLD && quoteOft.limit.minAmountLD) {
    lastMaxAmountLD.current = quoteOft.limit.maxAmountLD as bigint;
    lastMinAmountLD.current = quoteOft.limit.minAmountLD as bigint;
  }
  const isBelowLimit =
    lastMinAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount < lastMinAmountLD.current
      : false;
  const lowerLimitFormatted =
    isBelowLimit && selectedTokenSettlementChainTokenId && lastMinAmountLD.current !== undefined
      ? formatBalanceAmount(lastMinAmountLD.current, selectedTokenSettlementChainTokenId?.decimals)
      : undefined;
  const isAboveLimit =
    lastMaxAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount > lastMaxAmountLD.current
      : false;
  const upperLimitFormatted =
    isAboveLimit && selectedTokenSettlementChainTokenId && lastMaxAmountLD.current !== undefined
      ? formatBalanceAmount(lastMaxAmountLD.current, selectedTokenSettlementChainTokenId?.decimals)
      : undefined;

  const sendParamsWithSlippage: SendParamStruct | undefined = useMemo(() => {
    if (!quoteOft || !sendParamsWithoutSlippage) {
      return undefined;
    }

    const { receipt } = quoteOft;

    const minAmountLD = applySlippageBps(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

    const newSendParams: SendParamStruct = {
      ...sendParamsWithoutSlippage,
      minAmountLD,
    };

    return newSendParams;
  }, [sendParamsWithoutSlippage, quoteOft]);

  const quoteSendCondition =
    selectedTokenAddress !== undefined &&
    srcChainId !== undefined &&
    sendParamsWithSlippage !== undefined &&
    selectedTokenSettlementChainTokenId !== undefined &&
    provider !== undefined;
  const quoteSendQuery = useSWR<MessagingFeeStruct | undefined>(
    quoteSendCondition
      ? [
          "quoteSend",
          sendParamsWithSlippage.dstEid,
          sendParamsWithSlippage.to,
          sendParamsWithSlippage.amountLD,
          selectedTokenSettlementChainTokenId?.stargate,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        const sourceChainStargateAddress = selectedTokenSettlementChainTokenId.stargate;

        const iStargateInstance = new Contract(
          sourceChainStargateAddress,
          IStargateAbi,
          provider
        ) as unknown as IStargate;

        const result = await iStargateInstance.quoteSend(sendParamsWithSlippage, false);

        return result;
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  const quoteSend = quoteSendQuery.data;

  const {
    networkFeeUsd: bridgeNetworkFeeUsd,
    protocolFeeUsd,
    networkFee: bridgeNetworkFee,
  } = useMultichainQuoteFeeUsd({
    quoteSend,
    quoteOft,
    unwrappedTokenAddress: unwrappedSelectedTokenAddress,
  });

  const bridgeOutParams: BridgeOutParams | undefined = useMemo(() => {
    if (
      srcChainId === undefined ||
      selectedTokenAddress === undefined ||
      inputAmount === undefined ||
      inputAmount <= 0n
    ) {
      return;
    }

    const dstEid = getLayerZeroEndpointId(srcChainId);
    const stargateAddress = getStargatePoolAddress(chainId, selectedTokenAddress);

    if (dstEid === undefined || stargateAddress === undefined) {
      return;
    }

    return {
      token: selectedTokenAddress as Address,
      amount: inputAmount,
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
  }, [srcChainId, selectedTokenAddress, chainId, inputAmount]);

  const expressTransactionBuilder: ExpressTransactionBuilder | undefined = useMemo(() => {
    if (signer === undefined || bridgeOutParams === undefined || provider === undefined) {
      return;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({
      gasPaymentParams,
      noncesData,
      relayParams,
    }) => ({
      txnData: await buildAndSignBridgeOutTxn({
        chainId: chainId as UiSettlementChain,
        signer: signer,
        relayParamsPayload: relayParams as RawMultichainRelayParamsPayload,
        params: bridgeOutParams,
        emptySignature: true,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        noncesData,
        provider,
      }),
    });

    return expressTransactionBuilder;
  }, [bridgeOutParams, chainId, provider, signer]);

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload("multichain-withdraw", {
    additionalNetworkFee: bridgeNetworkFee,
    expressTransactionBuilder,
  });

  const relayFeeAmount = expressTxnParamsAsyncResult?.data?.gasPaymentParams.relayerFeeAmount;
  const gasPaymentParams = expressTxnParamsAsyncResult?.data?.gasPaymentParams;

  const networkFeeUsd = useMemo(() => {
    if (relayFeeAmount === undefined || relayerFeeToken === undefined) {
      return;
    }

    const relayFeeUsd = convertToUsd(relayFeeAmount, relayerFeeToken.decimals, getMidPrice(relayerFeeToken.prices));

    if (relayFeeUsd === undefined || bridgeNetworkFeeUsd === undefined) {
      return;
    }

    return relayFeeUsd + bridgeNetworkFeeUsd;
  }, [bridgeNetworkFeeUsd, relayFeeAmount, relayerFeeToken]);

  const handleWithdraw = async () => {
    if (srcChainId === undefined || selectedToken === undefined) {
      return;
    }

    const metricData = initMultichainWithdrawalMetricData({
      settlementChain: chainId,
      sourceChain: srcChainId,
      assetSymbol: selectedToken.symbol,
      sizeInUsd: inputAmountUsd!,
      isFirstWithdrawal,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (
      gasPaymentParams === undefined ||
      bridgeOutParams === undefined ||
      signer === undefined ||
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

      await simulateWithdraw({
        chainId: chainId as UiSettlementChain,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayParamsPayload: relayParamsPayload as RawMultichainRelayParamsPayload,
        params: bridgeOutParams,
        signer,
        provider,
      });

      sendOrderSimulatedMetric(metricData.metricId);

      const signedTxnData: ExpressTxnData = await buildAndSignBridgeOutTxn({
        chainId: chainId as UiSettlementChain,
        signer: signer,
        relayParamsPayload: relayParamsPayload as RawMultichainRelayParamsPayload,
        params: bridgeOutParams,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        noncesData: undefined,
        provider,
      });

      const mockWithdrawalId = setMultichainSubmittedWithdrawal({
        amount: bridgeOutParams.amount,
        settlementChainId: chainId,
        sourceChainId: srcChainId,
        tokenAddress: selectedToken.address,
      });

      const receipt = await sendExpressTransaction({
        chainId: chainId as UiSettlementChain,
        txnData: signedTxnData,
        // TODO
        isSponsoredCall: false,
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
      selectedToken.balance === undefined ||
      selectedToken.balance === 0n ||
      srcChainId === undefined ||
      account === undefined
    ) {
      return;
    }

    const canSelectedTokenBeUsedAsGasPaymentToken = getGasPaymentTokens(chainId).includes(selectedToken.address);

    if (!canSelectedTokenBeUsedAsGasPaymentToken) {
      setInputValue(formatAmountFree(selectedToken.balance, selectedToken.decimals));
      return;
    }

    if (gasPaymentToken?.address !== selectedToken.address) {
      setInputValue(formatAmountFree(selectedToken.balance, selectedToken.decimals));
      return;
    }

    const buffer = convertToTokenAmount(
      10n * 10n ** BigInt(USD_DECIMALS),
      gasPaymentToken.decimals,
      getMidPrice(gasPaymentToken.prices)
    )!;

    const maxAmount = bigMath.max(selectedToken.balance - buffer, 0n);

    if (maxAmount === 0n) {
      helperToast.error(
        t`It is suggested to keep at least 10 USD in the gas payment token to be able to perform transactions.`
      );
      return;
    }

    setInputValue(formatAmountFree(maxAmount, gasPaymentToken.decimals));
  }, [
    account,
    chainId,
    gasPaymentToken?.address,
    gasPaymentToken?.decimals,
    gasPaymentToken?.prices,
    selectedToken,
    setInputValue,
    srcChainId,
  ]);

  const isInputEmpty = inputAmount === undefined || inputAmount <= 0n;

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
          <ImSpinner2 className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (isInputEmpty) {
    buttonState = {
      text: t`Enter withdrawal amount`,
      disabled: true,
    };
  } else if (selectedToken?.balance !== undefined && inputAmount > selectedToken.balance) {
    buttonState = {
      text: t`Insufficient balance`,
      disabled: true,
    };
  } else if (expressTxnParamsAsyncResult.data?.gasPaymentValidations?.isOutGasTokenBalance) {
    buttonState = {
      text: t`Insufficient ${gasPaymentParams?.relayFeeToken.symbol} balance to pay for gas`,
      disabled: true,
    };
  } else if (expressTxnParamsAsyncResult.error) {
    buttonState = {
      text: expressTxnParamsAsyncResult.error.name.slice(0, 32) ?? t`Error simulating withdrawal`,
      disabled: true,
    };
  } else if (expressTxnParamsAsyncResult.data === undefined) {
    buttonState = {
      text: (
        <>
          <Trans>Loading...</Trans>
          <ImSpinner2 className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  }

  const hasSelectedToken = selectedTokenAddress !== undefined;
  useEffect(
    function fallbackWithdrawTokens() {
      if (hasSelectedToken || !srcChainId || !isSettlementChain(chainId)) {
        return;
      }

      const settlementChainWrappedTokenAddresses = MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[chainId];
      if (!settlementChainWrappedTokenAddresses) {
        return;
      }

      const preferredToken = settlementChainWrappedTokenAddresses.find((tokenAddress) => {
        const tokenData = gmxAccountTokensData[tokenAddress];
        return (
          tokenData?.address === CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId] &&
          tokenData?.balance !== undefined &&
          tokenData.balance > 0n
        );
      });

      if (preferredToken) {
        setSelectedTokenAddress(preferredToken);
        return;
      }

      let maxGmxAccountBalanceUsd = 0n;
      let maxBalanceSettlementChainTokenAddress: string | undefined = undefined;

      for (const tokenAddress of settlementChainWrappedTokenAddresses) {
        const tokenData = gmxAccountTokensData[tokenAddress];
        if (tokenData === undefined) {
          continue;
        }

        const prices = tokenData.prices;
        const balance = tokenData.balance;
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
    [chainId, gmxAccountTokensData, hasSelectedToken, setSelectedTokenAddress, srcChainId]
  );

  return (
    <ModalShrinkingContent className="overflow-y-auto p-16">
      <div className="flex flex-col gap-20">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <Selector
            value={selectedTokenAddress}
            onChange={setSelectedTokenAddress}
            placeholder={t`Select token`}
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={options}
            item={WithdrawAssetItem}
            itemKey={withdrawAssetItemKey}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">
            <Trans>To Network</Trans>
          </div>
          <Selector
            value={srcChainId}
            onChange={(value) => {
              switchNetwork(Number(value), isConnected);
            }}
            placeholder={t`Select network`}
            button={
              <div className="flex items-center gap-8">
                {srcChainId !== undefined ? (
                  <>
                    <img
                      src={CHAIN_ID_TO_NETWORK_ICON[srcChainId]}
                      alt={getChainName(srcChainId)}
                      className="size-20"
                    />
                    <span className="text-body-large">{getChainName(srcChainId)}</span>
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
            options={networks}
            item={NetworkItem}
            itemKey={networkItemKey}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-body-small flex items-center justify-between text-slate-100">
            <Trans>Withdraw</Trans>
            {selectedToken !== undefined && selectedToken.balance !== undefined && selectedToken !== undefined && (
              <div>
                <Trans>Available:</Trans>{" "}
                {formatBalanceAmount(selectedToken.balance, selectedToken.decimals, selectedToken.symbol)}
              </div>
            )}
          </div>
          <div className="text-body-large relative">
            <NumberInput
              value={inputValue}
              onValueChange={(e) => setInputValue(e.target.value)}
              className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72"
              placeholder={`0.0 ${selectedToken?.symbol || ""}`}
            />
            {inputValue !== "" && inputValue !== undefined && (
              <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
                <div className="invisible whitespace-pre font-[RelativeNumber]">{inputValue} </div>
                <div className="text-slate-100">{selectedToken?.symbol || ""}</div>
              </div>
            )}
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
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to withdraw exceeds the limit. Please try an amount smaller than{" "}
            {upperLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      {isBelowLimit && (
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to withdraw is below the limit. Please try an amount larger than{" "}
            {lowerLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}

      <div className="h-32 shrink-0 grow" />

      <div className="mb-16 flex flex-col gap-8">
        <SyntheticsInfoRow
          label={<Trans>Network Fee</Trans>}
          value={networkFeeUsd !== undefined ? formatUsd(networkFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label={<Trans>Withdraw Fee</Trans>}
          value={protocolFeeUsd !== undefined ? formatUsd(protocolFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label={<Trans>GMX Balance</Trans>}
          value={<ValueTransition from={formatUsd(gmxAccountUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />}
        />
        <SyntheticsInfoRow
          label={<Trans>Asset Balance</Trans>}
          value={
            <ValueTransition from={formatUsd(sourceChainTokenBalanceUsd)} to={formatUsd(nextSourceChainBalanceUsd)} />
          }
        />
      </div>

      <Button variant="primary" className="w-full" onClick={buttonState.onClick} disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </ModalShrinkingContent>
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
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex gap-8">
        <TokenIcon symbol={option.symbol} displaySize={20} importSize={40} />
        <span>
          {option.symbol} <span className="text-slate-100">{option.name}</span>
        </span>
      </div>
      <div className="text-slate-100">
        {option.balance !== undefined ? formatBalanceAmount(option.balance, option.decimals) : "-"}
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
  relayParamsPayload,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  params,
}: {
  provider: Provider;
  signer: WalletSigner;
  chainId: UiSettlementChain;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  relayParamsPayload: RawMultichainRelayParamsPayload;
  params: BridgeOutParams;
}): Promise<void> {
  if (!provider) {
    throw new Error("Provider is required");
  }

  const { callData, feeAmount, feeToken, to } = await buildAndSignBridgeOutTxn({
    signer,
    chainId,
    relayParamsPayload,
    params,
    emptySignature: true,
    relayerFeeTokenAddress,
    relayerFeeAmount: relayerFeeAmount,
    provider,
    noncesData: undefined,
  });

  await fallbackCustomError(async () => {
    await callRelayTransaction({
      calldata: callData,
      provider,
      gelatoRelayFeeAmount: feeAmount,
      gelatoRelayFeeToken: feeToken,
      relayRouterAddress: to as Address,
    });
  }, "simulation");
}

async function fallbackCustomError<T = void>(f: () => Promise<T>, errorContext: OrderErrorContext) {
  try {
    return await f();
  } catch (error) {
    if ("walk" in error && typeof error.walk === "function") {
      const errorWithData = (error as BaseError).walk((e) => "data" in (e as any)) as (Error & { data: string }) | null;

      if (errorWithData && errorWithData.data) {
        const data = errorWithData.data;

        const decodedError = decodeErrorResult({
          abi: abis.CustomErrorsArbitrumSepolia,
          data: data as Hex,
        });

        const customError = new Error();

        customError.name = decodedError.errorName;
        customError.message = JSON.stringify(decodedError, null, 2);

        throw extendError(customError, {
          errorContext,
        });
      }
    }

    throw extendError(error, {
      errorContext,
    });
  }
}
