import { Trans, t } from "@lingui/macro";
import { getWalletClient } from "@wagmi/core";
import { Contract } from "ethers";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import { ImSpinner2 } from "react-icons/im";
import Skeleton from "react-loading-skeleton";
import { useLatest } from "react-use";
import useSWR from "swr";
import { Address, Hex, decodeErrorResult, encodeFunctionData, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { ContractsChainId, SettlementChainId, AnyChainId, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
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
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT,
  getMappedTokenId,
  isSourceChain,
} from "domain/multichain/config";
import { MULTICHAIN_FUNDING_SLIPPAGE_BPS } from "domain/multichain/constants";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { IStargateAbi, StargateErrorsAbi } from "domain/multichain/stargatePools";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { useMultichainQuoteFeeUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLeadingDebounce } from "lib/debounce/useLeadingDebounde";
import { helperToast } from "lib/helperToast";
import {
  initMultichainDepositMetricData,
  sendOrderSimulatedMetric,
  sendOrderSubmittedMetric,
  sendOrderTxnSubmittedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
} from "lib/metrics";
import { USD_DECIMALS, formatAmountFree, formatBalanceAmount, formatPercentage, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { TxnCallback, TxnEventName, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import { switchNetwork } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { clientToSigner, useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";
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
import { getTxnErrorToast } from "components/Errors/errorToasts";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { useAvailableToTradeAssetMultichain, useMultichainTokensRequest } from "./hooks";

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
  const { tokenChainDataArray: multichainTokens, isPriceDataLoading } = useMultichainTokensRequest();
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMultichainSubmittedDeposit } = useSyntheticsEvents();

  const selectedToken =
    depositViewTokenAddress !== undefined ? getToken(settlementChainId, depositViewTokenAddress) : undefined;

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

  const { selectedTokenSourceChainBalance, selectedTokenSourceChainBalanceUsd } = useMemo((): {
    selectedTokenSourceChainBalance?: bigint;
    selectedTokenSourceChainBalanceUsd?: bigint;
  } => {
    if (selectedToken === undefined) return EMPTY_OBJECT;

    if (selectedTokenChainData === undefined) return EMPTY_OBJECT;

    const balance = selectedTokenChainData.sourceChainBalance;
    const balanceUsd =
      convertToUsd(
        balance,
        selectedTokenChainData.sourceChainDecimals,
        selectedTokenChainData.sourceChainPrices?.maxPrice
      ) ?? 0n;
    return {
      selectedTokenSourceChainBalance: balance,
      selectedTokenSourceChainBalanceUsd: balanceUsd,
    };
  }, [selectedToken, selectedTokenChainData]);

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

    const isNative = depositViewTokenAddress === zeroAddress;
    if (isNative) {
      const buffer = convertToTokenAmount(
        10n * 10n ** BigInt(USD_DECIMALS),
        selectedToken.decimals,
        getMidPrice(selectedTokenChainData?.sourceChainPrices ?? { minPrice: 0n, maxPrice: 0n })
      )!;

      const maxAmount = bigMath.max(selectedTokenSourceChainBalance - buffer, 0n);

      if (maxAmount === 0n) {
        helperToast.error(
          t`It is suggested to keep at least 10 USD in the native token to be able to perform transactions.`
        );
        return;
      }

      setInputValue(formatAmountFree(maxAmount, selectedToken.decimals));
      return;
    }

    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [selectedToken, selectedTokenSourceChainBalance, depositViewTokenAddress, setInputValue, selectedTokenChainData]);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();

  const { nextGmxAccountBalanceUsd, nextSourceChainBalance } = useMemo((): {
    nextGmxAccountBalanceUsd?: bigint;
    nextSourceChainBalance?: bigint;
  } => {
    if (
      selectedToken === undefined ||
      selectedTokenSourceChainBalance === undefined ||
      selectedTokenSourceChainBalanceUsd === undefined ||
      inputAmount === undefined ||
      inputAmountUsd === undefined
    ) {
      return EMPTY_OBJECT;
    }

    const nextSourceChainBalance = selectedTokenSourceChainBalance - inputAmount;
    const nextGmxAccountBalanceUsd = (gmxAccountUsd ?? 0n) + inputAmountUsd;

    return {
      nextGmxAccountBalanceUsd,
      nextSourceChainBalance,
    };
  }, [
    gmxAccountUsd,
    inputAmount,
    inputAmountUsd,
    selectedToken,
    selectedTokenSourceChainBalance,
    selectedTokenSourceChainBalanceUsd,
  ]);

  const spenderAddress =
    // Only when DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
    (depositViewChain as AnyChainId) === settlementChainId
      ? getContract(settlementChainId, "SyntheticsRouter")
      : selectedTokenSourceChainTokenId?.stargate;

  useMultichainApprovalsActiveListener("multichain-deposit-view");

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
    if (!walletChainId || !depositViewTokenAddress || inputAmount === undefined || !spenderAddress) {
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

    await approveTokens({
      chainId: walletChainId,
      tokenAddress: selectedTokenSourceChainTokenId.address,
      signer: walletSigner,
      spender: spenderAddress,
      onApproveSubmitted: () => setIsApproving(true),
      setIsApproving: noop,
      permitParams: undefined,
      approveAmount: undefined,
    });
  }, [
    walletChainId,
    depositViewTokenAddress,
    inputAmount,
    spenderAddress,
    selectedTokenSourceChainTokenId,
    walletSigner,
  ]);

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
      inputAmount,
      srcChainId: depositViewChain,
      composeGas,
      dstChainId: settlementChainId,
      isDeposit: true,
    });
  }, [account, inputAmount, depositViewChain, composeGas, settlementChainId]);

  const quoteOftCondition =
    sendParamsWithoutSlippage !== undefined &&
    depositViewTokenAddress !== undefined &&
    selectedTokenSourceChainTokenId !== undefined &&
    (depositViewChain as SettlementChainId) !== settlementChainId &&
    sourceChainProvider !== undefined;
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
          selectedTokenSourceChainTokenId?.stargate,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteOftCondition) {
          return;
        }

        const sourceChainStargateAddress = selectedTokenSourceChainTokenId.stargate;

        const iStargateInstance = new Contract(
          sourceChainStargateAddress,
          IStargateAbi,
          sourceChainProvider
        ) as unknown as IStargate;

        const [limit, oftFeeDetails, receipt] = await iStargateInstance.quoteOFT(sendParamsWithoutSlippage);

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
    isBelowLimit && selectedTokenSourceChainTokenId && lastMinAmountLD.current !== undefined
      ? formatBalanceAmount(lastMinAmountLD.current, selectedTokenSourceChainTokenId?.decimals)
      : undefined;
  const isAboveLimit =
    lastMaxAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount > lastMaxAmountLD.current
      : false;
  const upperLimitFormatted =
    isAboveLimit && selectedTokenSourceChainTokenId && lastMaxAmountLD.current !== undefined
      ? formatBalanceAmount(lastMaxAmountLD.current, selectedTokenSourceChainTokenId?.decimals)
      : undefined;

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

  const quoteSendCondition =
    depositViewTokenAddress !== undefined &&
    depositViewChain !== undefined &&
    sendParamsWithSlippage !== undefined &&
    selectedTokenSourceChainTokenId !== undefined &&
    (depositViewChain as SettlementChainId) !== settlementChainId &&
    sourceChainProvider !== undefined;
  const quoteSendQuery = useSWR<MessagingFeeStruct | undefined>(
    quoteSendCondition
      ? [
          "quoteSend",
          sendParamsWithSlippage.dstEid,
          sendParamsWithSlippage.to,
          sendParamsWithSlippage.amountLD,
          selectedTokenSourceChainTokenId?.stargate,
          composeGas,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        const sourceChainStargateAddress = selectedTokenSourceChainTokenId.stargate;

        const iStargateInstance = new Contract(
          sourceChainStargateAddress,
          IStargateAbi,
          sourceChainProvider
        ) as unknown as IStargate;

        const result = await iStargateInstance.quoteSend(sendParamsWithSlippage, false);

        return result;
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  const quoteSend = quoteSendQuery.data;

  const { networkFeeUsd, protocolFeeUsd, amountReceivedLD } = useMultichainQuoteFeeUsd({
    quoteSend,
    quoteOft,
    unwrappedTokenAddress: unwrappedSelectedTokenAddress,
    srcChainId: depositViewChain,
  });

  const isFirstDeposit = useIsFirstDeposit();
  const latestIsFirstDeposit = useLatest(isFirstDeposit);

  const handleDeposit = useCallback(async () => {
    if (DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT && (walletChainId as SettlementChainId) === settlementChainId) {
      // #region DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
      if (!account || !depositViewTokenAddress || inputAmount === undefined) {
        return;
      }

      const multichainVaultAddress = getContract(settlementChainId, "MultichainVault");

      const contract = new Contract(
        getContract(settlementChainId, "MultichainTransferRouter")!,
        abis.MultichainTransferRouterArbitrumSepolia,
        walletSigner
      );

      const callback: TxnCallback<WalletTxnCtx> = (txnEvent) => {
        if (txnEvent.event === TxnEventName.Sent) {
          helperToast.success("Deposit sent", { toastId: "same-chain-gmx-account-deposit" });
          setIsVisibleOrView("main");
        } else if (txnEvent.event === TxnEventName.Error) {
          helperToast.error("Deposit failed", { toastId: "same-chain-gmx-account-deposit" });
        }
      };

      if (depositViewTokenAddress === zeroAddress) {
        if (!selectedToken?.wrappedAddress) {
          throw new Error("Wrapped address is not set");
        }

        await sendWalletTransaction({
          chainId: walletChainId as ContractsChainId,
          signer: walletSigner!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              encodeFunctionData({
                abi: abis.MultichainTransferRouterArbitrumSepolia,
                functionName: "sendWnt",
                args: [multichainVaultAddress, inputAmount],
              }),
              encodeFunctionData({
                abi: abis.MultichainTransferRouterArbitrumSepolia,
                functionName: "bridgeIn",
                args: [account, selectedToken.wrappedAddress as Address],
              }),
            ],
          ]),
          value: inputAmount,
          callback,
        });
      } else {
        await sendWalletTransaction({
          chainId: walletChainId as ContractsChainId,
          signer: walletSigner!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              encodeFunctionData({
                abi: abis.MultichainTransferRouterArbitrumSepolia,
                functionName: "sendTokens",
                args: [depositViewTokenAddress as Address, multichainVaultAddress, inputAmount],
              }),

              encodeFunctionData({
                abi: abis.MultichainTransferRouterArbitrumSepolia,
                functionName: "bridgeIn",
                args: [account, depositViewTokenAddress as Address],
              }),
            ],
          ]),
          callback,
        });
      }

      // #endregion DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
    } else {
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
        helperToast.error("Deposit failed");
        return;
      }

      const shouldSwitchNetwork = walletChainId !== depositViewChain;

      if (shouldSwitchNetwork && !walletSigner) {
        helperToast.error("Deposit failed");
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

      const sourceChainTokenAddress = selectedTokenSourceChainTokenId.address;

      const sourceChainStargateAddress = selectedTokenSourceChainTokenId.stargate;

      const isNative = sourceChainTokenAddress === zeroAddress;
      const value = isNative ? inputAmount : 0n;

      const initialChain = walletChainId && isSourceChain(walletChainId) ? walletChainId : settlementChainId;

      let sourceChainWalletSigner = walletSigner;
      if (shouldSwitchNetwork) {
        await switchNetwork(depositViewChain, true);
        const walletClient = await getWalletClient(getRainbowKitConfig());
        sourceChainWalletSigner = clientToSigner(walletClient, account);
      }

      await sendWalletTransaction({
        chainId: depositViewChain,
        to: sourceChainStargateAddress,
        signer: sourceChainWalletSigner!,
        callData: encodeFunctionData({
          abi: IStargateAbi,
          functionName: "sendToken",
          args: [sendParamsWithSlippage, { nativeFee: quoteSend.nativeFee, lzTokenFee: quoteSend.lzTokenFee }, account],
        }),
        value: (quoteSend.nativeFee as bigint) + value,
        callback: (txnEvent) => {
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
                depositViewChain,
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
              const toastParams = getTxnErrorToast(depositViewChain, txnEvent.data.error, {
                defaultMessage: t`Deposit failed`,
              });

              helperToast.error(toastParams.errorContent, {
                autoClose: toastParams.autoCloseToast,
                toastId: "gmx-account-deposit",
              });
            }

            sendTxnErrorMetric(metricData.metricId, prettyError, "unknown");
          } else if (txnEvent.event === TxnEventName.Sent) {
            setIsVisibleOrView("main");
            setIsSubmitting(false);

            sendTxnSentMetric(metricData.metricId);

            if (txnEvent.data.type === "wallet") {
              setMultichainSubmittedDeposit({
                amount: sendParamsWithSlippage.amountLD as bigint,
                settlementChainId,
                sourceChainId: depositViewChain,
                tokenAddress: depositViewTokenAddress,
                sentTxn: txnEvent.data.transactionHash,
              });
            }
          } else if (txnEvent.event === TxnEventName.Simulated) {
            sendOrderSimulatedMetric(metricData.metricId);
          } else if (txnEvent.event === TxnEventName.Sending) {
            sendOrderTxnSubmittedMetric(metricData.metricId);
          }
        },
      });

      if (shouldSwitchNetwork) {
        await switchNetwork(initialChain, true);
      }
    }
  }, [
    walletChainId,
    settlementChainId,
    account,
    depositViewTokenAddress,
    inputAmount,
    walletSigner,
    setIsVisibleOrView,
    selectedToken,
    depositViewChain,
    quoteSend,
    sendParamsWithSlippage,
    selectedTokenSourceChainTokenId,
    latestInputAmountUsd,
    latestIsFirstDeposit,
    setMultichainSubmittedDeposit,
  ]);

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

      if (
        depositViewTokenAddress === undefined &&
        depositViewChain !== undefined &&
        multichainTokens.length > 0 &&
        !isPriceDataLoading
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
          <div
            tabIndex={0}
            role="button"
            onClick={() => setIsVisibleOrView("selectAssetToDeposit")}
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
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                </>
              ) : (
                <span className="text-slate-100">
                  <Trans>Pick and asset to deposit</Trans>
                </span>
              )}
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
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

        <div className="flex flex-col gap-4">
          <div className="text-body-small flex items-center justify-between gap-4 text-slate-100">
            <Trans>Deposit</Trans>
            {selectedTokenSourceChainBalance !== undefined && selectedToken !== undefined && (
              <div>
                <Trans>Available:</Trans>{" "}
                {formatBalanceAmount(selectedTokenSourceChainBalance, selectedToken.decimals, selectedToken.symbol)}
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
          label={<Trans>Allowed slippage</Trans>}
          value={formatPercentage(BigInt(MULTICHAIN_FUNDING_SLIPPAGE_BPS), { bps: true })}
        />
        <SyntheticsInfoRow
          label={<Trans>Min receive</Trans>}
          value={
            amountReceivedLD !== undefined && selectedTokenChainData !== undefined
              ? formatBalanceAmount(amountReceivedLD, selectedTokenChainData.sourceChainDecimals)
              : "..."
          }
        />

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
                selectedTokenSourceChainBalance !== undefined && selectedTokenSourceChainTokenId !== undefined
                  ? formatBalanceAmount(
                      selectedTokenSourceChainBalance,
                      selectedTokenSourceChainTokenId.decimals,
                      selectedTokenSourceChainTokenId.symbol
                    )
                  : undefined
              }
              to={
                nextSourceChainBalance !== undefined && selectedTokenSourceChainTokenId !== undefined
                  ? formatBalanceAmount(
                      nextSourceChainBalance,
                      selectedTokenSourceChainTokenId.decimals,
                      selectedTokenSourceChainTokenId.symbol
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
