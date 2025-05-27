import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Trans, t } from "@lingui/macro";
import { Contract } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import { Address, Hex, decodeErrorResult, encodeFunctionData, toHex, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { UiContractsChain, UiSettlementChain, UiSourceChain, UiSupportedChain, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT,
  getLayerZeroEndpointId,
  getMappedTokenId,
  isSettlementChain,
  isSourceChain,
} from "context/GmxAccountContext/config";
import {
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelector,
} from "context/GmxAccountContext/hooks";
import { selectGmxAccountDepositViewTokenInputAmount } from "context/GmxAccountContext/selectors";
import { IStargateAbi, StargateErrorsAbi } from "context/GmxAccountContext/stargatePools";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLeadingDebounce } from "lib/debounce/useLeadingDebounde";
import { helperToast } from "lib/helperToast";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  formatAmountFree,
  formatBalanceAmount,
  formatPercentage,
  formatUsd,
} from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { TxnCallback, TxnEventName, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import {
  IStargate,
  MessagingFeeStruct,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
  SendParamStruct,
} from "typechain-types-stargate/interfaces/IStargate";
import { multichainTransferRouterAbi } from "wagmi-generated";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { getTxnErrorToast } from "components/Errors/errorToasts";
import NumberInput from "components/NumberInput/NumberInput";
import { CodecUiHelper } from "components/Synthetics/GmxAccountModal/OFTComposeMsgCodec";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useAvailableToTradeAssetMultichain, useMultichainTokensRequest } from "./hooks";
import { OftCmd, SEND_MODE_TAXI } from "./OftCmd";
import { useMultichainDepositNetworkComposeGas } from "./useMultichainDepositNetworkComposeGas";
import { useMultichainQuoteFeeUsd } from "./useMultichainQuoteFeeUsd";

export const SLIPPAGE_BPS = 50n;

export const DepositView = () => {
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const { address: account, chainId: walletChainId } = useAccount();
  const signer = useEthersSigner({ chainId: srcChainId });

  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const [depositViewTokenAddress, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [inputValue, setInputValue] = useGmxAccountDepositViewTokenInputValue();
  const { tokenChainDataArray: multichainTokens, isPriceDataLoading } = useMultichainTokensRequest();
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setMultichainSubmittedDeposit } = useSyntheticsEvents();

  const selectedToken =
    depositViewTokenAddress !== undefined ? getToken(settlementChainId, depositViewTokenAddress) : undefined;

  const selectedTokenSourceChainTokenId =
    depositViewTokenAddress !== undefined
      ? getMappedTokenId(settlementChainId as UiSettlementChain, depositViewTokenAddress, srcChainId as UiSourceChain)
      : undefined;

  const unwrappedSelectedTokenAddress =
    depositViewTokenAddress !== undefined
      ? convertTokenAddress(settlementChainId, depositViewTokenAddress, "native")
      : undefined;

  const selectedTokenChainData = useMemo(() => {
    if (selectedToken === undefined) return undefined;
    return multichainTokens.find(
      (token) => token.address === selectedToken.address && token.sourceChainId === srcChainId
    );
  }, [selectedToken, multichainTokens, srcChainId]);

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

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedTokenSourceChainBalance === undefined) {
      return;
    }
    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [selectedToken, selectedTokenSourceChainBalance, setInputValue]);

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
    (srcChainId as UiSupportedChain) === settlementChainId
      ? getContract(settlementChainId, "SyntheticsRouter")
      : selectedTokenSourceChainTokenId?.stargate;

  const tokensAllowanceResult = useTokensAllowanceData(srcChainId, {
    spenderAddress,
    tokenAddresses: selectedTokenSourceChainTokenId ? [selectedTokenSourceChainTokenId.address] : [],
    skip: srcChainId === undefined,
  });
  const tokensAllowanceData = srcChainId !== undefined ? tokensAllowanceResult.tokensAllowanceData : undefined;

  const needTokenApprove = getNeedTokenApprove(
    tokensAllowanceData,
    depositViewTokenAddress === zeroAddress ? zeroAddress : selectedTokenSourceChainTokenId?.address,
    inputAmount,
    EMPTY_ARRAY
  );

  const handleApprove = useCallback(async () => {
    if (!srcChainId || !depositViewTokenAddress || inputAmount === undefined || !spenderAddress) {
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
      chainId: srcChainId,
      tokenAddress: selectedTokenSourceChainTokenId.address,
      signer: signer,
      spender: spenderAddress,
      setIsApproving,
      permitParams: undefined,
      approveAmount: undefined,
    });
  }, [srcChainId, depositViewTokenAddress, inputAmount, selectedTokenSourceChainTokenId, signer, spenderAddress]);

  const isInputEmpty = inputAmount === undefined || inputAmount <= 0n;

  const { composeGas } = useMultichainDepositNetworkComposeGas();

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (
      !account ||
      inputAmount === undefined ||
      inputAmount <= 0n ||
      srcChainId === undefined ||
      composeGas === undefined
    ) {
      return;
    }

    return getSendParamsWithoutSlippage({
      account,
      inputAmount,
      srcChainId,
      composeGas,
      dstChainId: settlementChainId,
      isDeposit: true,
    });
  }, [account, inputAmount, srcChainId, composeGas, settlementChainId]);

  const quoteOftCondition =
    sendParamsWithoutSlippage !== undefined &&
    depositViewTokenAddress !== undefined &&
    selectedTokenSourceChainTokenId !== undefined &&
    (srcChainId as UiSettlementChain) !== settlementChainId;
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
          signer
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

    const minAmountLD = applySlippageBps(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

    const newSendParams: SendParamStruct = {
      ...sendParamsWithoutSlippage,
      minAmountLD,
    };

    return newSendParams;
  }, [sendParamsWithoutSlippage, quoteOft]);

  const quoteSendCondition =
    depositViewTokenAddress !== undefined &&
    srcChainId !== undefined &&
    sendParamsWithSlippage !== undefined &&
    selectedTokenSourceChainTokenId !== undefined &&
    (srcChainId as UiSettlementChain) !== settlementChainId;
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
          signer
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
  });

  const handleDeposit = useCallback(async () => {
    if (DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT && (walletChainId as UiSettlementChain) === settlementChainId) {
      // #region DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
      if (!account || !depositViewTokenAddress || inputAmount === undefined) {
        return;
      }

      const multichainVaultAddress = getContract(settlementChainId, "MultichainVault");

      const contract = new Contract(
        getContract(settlementChainId, "MultichainTransferRouter")!,
        abis.MultichainTransferRouterArbitrumSepolia,
        signer
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
          chainId: walletChainId as UiContractsChain,
          signer: signer!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              encodeFunctionData({
                abi: multichainTransferRouterAbi,
                functionName: "sendWnt",
                args: [multichainVaultAddress, inputAmount],
              }),
              encodeFunctionData({
                abi: multichainTransferRouterAbi,
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
          chainId: walletChainId as UiContractsChain,
          signer: signer!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              encodeFunctionData({
                abi: multichainTransferRouterAbi,
                functionName: "sendTokens",
                args: [depositViewTokenAddress as Address, multichainVaultAddress, inputAmount],
              }),

              encodeFunctionData({
                abi: multichainTransferRouterAbi,
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
        srcChainId === undefined ||
        quoteSend === undefined ||
        sendParamsWithSlippage === undefined ||
        selectedTokenSourceChainTokenId === undefined
      ) {
        helperToast.error("Deposit failed");
        return;
      }

      setIsSubmitting(true);

      // const metricData = initMultichainDepositMetricData({
      //   assetAddress: depositViewTokenAddress,
      //   assetSymbol: selectedToken!.symbol,
      //   sizeInUsd: inputAmountUsd!,
      //   isFirstDeposit: false,
      //   settlementChain: settlementChainId,
      //   sourceChain: depositViewChain,
      // });

      const sourceChainTokenAddress = selectedTokenSourceChainTokenId.address;

      const sourceChainStargateAddress = selectedTokenSourceChainTokenId.stargate;

      const isNative = sourceChainTokenAddress === zeroAddress;
      const value = isNative ? inputAmount : 0n;

      await sendWalletTransaction({
        chainId: srcChainId,
        to: sourceChainStargateAddress,
        signer: signer!,
        callData: encodeFunctionData({
          abi: IStargateAbi,
          functionName: "sendToken",
          args: [sendParamsWithSlippage, { nativeFee: quoteSend.nativeFee, lzTokenFee: quoteSend.lzTokenFee }, account],
        }),
        value: (quoteSend.nativeFee as bigint) + value,
        callback: (txnEvent) => {
          if (txnEvent.event === TxnEventName.Error) {
            setIsSubmitting(false);
            const data = txnEvent.data.error.info?.error?.data as Hex | undefined;
            if (data) {
              const error = decodeErrorResult({
                abi: StargateErrorsAbi,
                data,
              });

              const toastParams = getTxnErrorToast(
                srcChainId,
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
              const toastParams = getTxnErrorToast(srcChainId, txnEvent.data.error, {
                defaultMessage: t`Deposit failed`,
              });

              helperToast.error(toastParams.errorContent, {
                autoClose: toastParams.autoCloseToast,
                toastId: "gmx-account-deposit",
              });
            }
          } else if (txnEvent.event === TxnEventName.Sent) {
            setIsVisibleOrView("main");
            setIsSubmitting(false);

            if (txnEvent.data.type === "wallet") {
              setMultichainSubmittedDeposit({
                amount: sendParamsWithSlippage.amountLD as bigint,
                settlementChainId,
                sourceChainId: srcChainId,
                tokenAddress: depositViewTokenAddress,
                sentTxn: txnEvent.data.transactionHash,
              });
            }
          }
        },
      });
    }
  }, [
    walletChainId,
    settlementChainId,
    account,
    depositViewTokenAddress,
    inputAmount,
    signer,
    setIsVisibleOrView,
    selectedToken?.wrappedAddress,
    srcChainId,
    quoteSend,
    sendParamsWithSlippage,
    selectedTokenSourceChainTokenId,
    setMultichainSubmittedDeposit,
  ]);

  useEffect(
    function fallbackTokenOnSourceChain() {
      if (
        depositViewTokenAddress === undefined &&
        srcChainId !== undefined &&
        multichainTokens.length > 0 &&
        !isPriceDataLoading
      ) {
        const preferredToken = multichainTokens.find(
          (sourceChainToken) =>
            sourceChainToken.sourceChainId === srcChainId &&
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
          if (token.sourceChainId !== srcChainId) {
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
      srcChainId,
    ]
  );

  const buttonState: {
    text: string;
    disabled?: boolean;
    onClick?: () => void;
  } = useMemo(() => {
    if (isApproving) {
      return { text: t`Approving`, disabled: true };
    }
    if (needTokenApprove) {
      return { text: t`Allow ${selectedToken?.symbol} to be spent`, onClick: handleApprove };
    }

    if (isInputEmpty) {
      return { text: t`Enter deposit amount`, disabled: true };
    }

    if (isSubmitting) {
      return { text: t`Depositing...`, disabled: true };
    }

    return { text: t`Deposit`, onClick: handleDeposit };
  }, [isApproving, needTokenApprove, isInputEmpty, isSubmitting, handleDeposit, selectedToken?.symbol, handleApprove]);

  let placeholder = "";
  if (inputValue === "" && selectedToken?.symbol) {
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
              ) : srcChainId !== undefined ? (
                <>
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                </>
              ) : (
                <span className="text-slate-100">
                  <Trans>Pick a token and switch network</Trans>
                </span>
              )}
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
        </div>
        {srcChainId !== undefined && (
          <div className="flex flex-col gap-4">
            <div className="text-body-small text-slate-100">
              <Trans>From Network</Trans>
            </div>
            <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
              <img src={getChainIcon(srcChainId)} alt={getChainName(srcChainId)} className="size-20" />
              <span className="text-body-large text-slate-100">{getChainName(srcChainId)}</span>
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
                {inputValue === "" ? "" : " "}
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
      <div className="h-32 shrink-0" />

      <div className="mb-16 flex flex-col gap-8">
        <SyntheticsInfoRow label="Allowed slippage" value={formatPercentage(SLIPPAGE_BPS, { bps: true })} />
        <SyntheticsInfoRow
          label="Min receive"
          value={
            amountReceivedLD !== undefined && selectedTokenChainData !== undefined
              ? formatBalanceAmount(amountReceivedLD, selectedTokenChainData.sourceChainDecimals)
              : "..."
          }
        />

        <SyntheticsInfoRow label="Network Fee" value={networkFeeUsd !== undefined ? formatUsd(networkFeeUsd) : "..."} />
        <SyntheticsInfoRow
          label="Deposit Fee"
          value={protocolFeeUsd !== undefined ? formatUsd(protocolFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label={t`GMX Balance`}
          value={<ValueTransition from={formatUsd(gmxAccountUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />}
        />
        <SyntheticsInfoRow
          label={t`Asset Balance`}
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

export function applySlippageBps(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS_DIVISOR_BIGINT - slippageBps)) / BASIS_POINTS_DIVISOR_BIGINT;
}

export function getSendParamsWithoutSlippage({
  dstChainId,
  account,
  srcChainId,
  inputAmount,
  composeGas,
  isDeposit,
}: {
  dstChainId: UiSupportedChain;
  account: Address;
  srcChainId?: UiSupportedChain;
  inputAmount: bigint;
  composeGas?: bigint;
  isDeposit: boolean;
}) {
  const oftCmd: OftCmd = new OftCmd(SEND_MODE_TAXI, []);

  const dstEid = getLayerZeroEndpointId(dstChainId);

  if (dstEid === undefined) {
    return;
  }

  if (isDeposit && (!isSettlementChain(dstChainId) || composeGas === undefined)) {
    throw new Error("LayerZero provider is not supported on this chain");
  }

  let to: string;

  if (isDeposit) {
    to = toHex(addressToBytes32(getContract(dstChainId as UiContractsChain, "LayerZeroProvider")));
  } else {
    to = toHex(addressToBytes32(account));
  }

  let composeMsg = "0x";
  let extraOptions = "0x";

  if (isDeposit) {
    if (srcChainId === undefined) {
      throw new Error("Source chain is not supported");
    }
    if (!isSourceChain(srcChainId)) {
      throw new Error("Source chain is not supported");
    }
    composeMsg = CodecUiHelper.encodeDepositMessage(account, srcChainId);
    const builder = Options.newOptions();
    extraOptions = builder.addExecutorComposeOption(0, composeGas!, 0).toHex();
  } else {
    const builder = Options.newOptions();
    extraOptions = builder.toHex();
  }

  const sendParams: SendParamStruct = {
    dstEid,
    to,
    amountLD: inputAmount,
    minAmountLD: 0n,
    extraOptions,
    composeMsg,
    oftCmd: oftCmd.toBytes(),
  };

  return sendParams;
}
