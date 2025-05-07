import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Trans, t } from "@lingui/macro";
import { errors as StargateErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
import { Contract } from "ethers";
// eslint-disable-next-line no-restricted-imports
import type { DebouncedFuncLeading } from "lodash";
import debounce from "lodash/debounce";
import identity from "lodash/identity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import { Address, Hex, decodeErrorResult, encodeFunctionData, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { UiSettlementChain, UiSourceChain, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import {
  MULTI_CHAIN_SUPPORTED_TOKEN_MAP,
  getMappedTokenId,
  getStargateEndpointId,
} from "context/GmxAccountContext/config";
import {
  // useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelector,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { selectGmxAccountDepositViewTokenInputAmount } from "context/GmxAccountContext/selectors";
import { IStargateAbi } from "context/GmxAccountContext/stargatePools";
import { getNeedTokenApprove, useTokenRecentPricesRequest, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  formatAmountFree,
  formatBalanceAmount,
  formatPercentage,
  formatUsd,
} from "lib/numbers";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { TxnCallback, TxnEventName, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";
import {
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
import { CodecUiHelper } from "components/Synthetics/GmxAccountModal/OFTComposeMsgCodec";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useGmxAccountTokensDataObject, useMultichainTokens } from "./hooks";
import { OftCmd, SEND_MODE_TAXI } from "./OftCmd";
import { useMultichainDepositNetworkComposeGas } from "./useMultichainDepositNetworkComposeGas";

const SLIPPAGE_BPS = 50n;

const leadingDebounce: DebouncedFuncLeading<(value: bigint | undefined) => bigint | undefined> = debounce(
  identity,
  100,
  {
    leading: true,
    trailing: true,
    maxWait: 1000,
  }
);

export const DepositView = () => {
  const { address: account, chainId: walletChainId } = useAccount();
  const signer = useEthersSigner({ chainId: walletChainId });

  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const depositViewChain = walletChainId;
  const sourceChainPublicClient = usePublicClient({ chainId: depositViewChain });

  const [depositViewTokenAddress, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [inputValue, setInputValue] = useGmxAccountDepositViewTokenInputValue();
  const multichainTokens = useMultichainTokens();

  const selectedToken =
    depositViewTokenAddress !== undefined ? getToken(settlementChainId, depositViewTokenAddress) : undefined;

  const selectedTokenSourceChainTokenId =
    depositViewTokenAddress !== undefined
      ? getMappedTokenId(
          settlementChainId as UiSettlementChain,
          depositViewTokenAddress,
          depositViewChain as UiSourceChain
        )
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
  const inputAmount = leadingDebounce(realInputAmount);
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedTokenChainData?.sourceChainPrices?.maxPrice)
    : undefined;

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedTokenSourceChainBalance === undefined) {
      return;
    }
    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [selectedToken, selectedTokenSourceChainBalance, setInputValue]);

  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const gmxAccountToken = depositViewTokenAddress
    ? getByKey(gmxAccountTokensData, convertTokenAddress(settlementChainId, depositViewTokenAddress, "wrapped"))
    : undefined;
  const gmxAccountTokenBalance = gmxAccountToken?.balance;
  const gmxAccountTokenBalanceUsd = convertToUsd(
    gmxAccountTokenBalance,
    gmxAccountToken?.decimals,
    gmxAccountToken?.prices?.maxPrice
  );

  const { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd } = useMemo((): {
    nextGmxAccountBalanceUsd?: bigint;
    nextSourceChainBalanceUsd?: bigint;
  } => {
    if (selectedToken === undefined || selectedTokenSourceChainBalanceUsd === undefined || inputAmountUsd === undefined)
      return EMPTY_OBJECT;

    const nextSourceChainBalanceUsd = selectedTokenSourceChainBalanceUsd - inputAmountUsd;
    const nextGmxAccountBalanceUsd = (gmxAccountTokenBalanceUsd ?? 0n) + inputAmountUsd;

    return {
      nextSourceChainBalanceUsd,
      nextGmxAccountBalanceUsd,
    };
  }, [gmxAccountTokenBalanceUsd, inputAmountUsd, selectedToken, selectedTokenSourceChainBalanceUsd]);

  const [isApproving, setIsApproving] = useState(false);

  const spenderAddress =
    // Only when DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
    depositViewChain === settlementChainId
      ? getContract(settlementChainId, "SyntheticsRouter")
      : selectedTokenSourceChainTokenId?.stargate;

  const tokensAllowanceResult = useTokensAllowanceData(depositViewChain, {
    spenderAddress,
    tokenAddresses: selectedTokenSourceChainTokenId ? [selectedTokenSourceChainTokenId.address] : [],
  });
  const tokensAllowanceData = depositViewChain !== undefined ? tokensAllowanceResult.tokensAllowanceData : undefined;

  const needTokenApprove = getNeedTokenApprove(
    tokensAllowanceData,
    selectedTokenSourceChainTokenId?.address,
    inputAmount
  );

  const handleApprove = useCallback(async () => {
    if (!depositViewChain || !depositViewTokenAddress || inputAmount === undefined || !spenderAddress) {
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
      chainId: depositViewChain,
      tokenAddress: selectedTokenSourceChainTokenId.address,
      signer: signer,
      spender: spenderAddress,
      setIsApproving,
      permitParams: undefined,
    });
  }, [depositViewChain, depositViewTokenAddress, inputAmount, selectedTokenSourceChainTokenId, signer, spenderAddress]);

  const { composeGas } = useMultichainDepositNetworkComposeGas();

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (
      !account ||
      inputAmount === undefined ||
      inputAmount <= 0n ||
      depositViewChain === undefined ||
      composeGas === undefined ||
      sourceChainPublicClient === undefined
    ) {
      return;
    }

    const oftCmd: OftCmd = new OftCmd(SEND_MODE_TAXI, []);

    const dstEid = getStargateEndpointId(settlementChainId);

    if (dstEid === undefined) {
      return;
    }

    const to = toHex(addressToBytes32(getContract(settlementChainId, "LayerZeroProvider")));

    let composeMsg: string = CodecUiHelper.encodeDepositMessage(account, depositViewChain);

    const builder = Options.newOptions();
    const extraOptions = builder.addExecutorComposeOption(0, composeGas, 0).toHex();

    const sendParams: SendParamStruct = {
      dstEid,
      to,
      amountLD: inputAmount,
      minAmountLD: 0n,
      extraOptions: extraOptions,
      composeMsg: composeMsg ?? "",
      oftCmd: oftCmd.toBytes(),
    };

    return sendParams;
  }, [account, composeGas, depositViewChain, inputAmount, settlementChainId, sourceChainPublicClient]);

  const quoteOftCondition =
    sendParamsWithoutSlippage !== undefined &&
    sourceChainPublicClient !== undefined &&
    depositViewTokenAddress !== undefined &&
    selectedTokenSourceChainTokenId !== undefined;
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

        const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
          (await sourceChainPublicClient.readContract({
            address: sourceChainStargateAddress,
            abi: IStargateAbi,
            functionName: "quoteOFT",
            args: [sendParamsWithoutSlippage],
          })) as any;

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
    depositViewChain !== undefined &&
    sourceChainPublicClient !== undefined &&
    sendParamsWithSlippage !== undefined &&
    selectedTokenSourceChainTokenId !== undefined;
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

        const result: MessagingFeeStruct = (await sourceChainPublicClient.readContract({
          address: sourceChainStargateAddress as Address,
          abi: IStargateAbi,
          functionName: "quoteSend",
          args: [sendParamsWithSlippage, false],
        })) as any;

        return result;
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  const quoteSend = quoteSendQuery.data;

  const { networkFeeUsd, protocolFeeUsd, amountReceivedLD } = useMultichainQuoteFeeUsd({
    quoteSend,
    quoteOft,
  });

  const handleDeposit = useCallback(async () => {
    if (depositViewChain === settlementChainId) {
      // #region DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
      if (!account || !depositViewTokenAddress || inputAmount === undefined || !walletChainId || !depositViewChain) {
        return;
      }

      const multichainVaultAddress = getContract(settlementChainId, "MultichainVault");

      const contract = new Contract(
        getContract(walletChainId, "MultichainTransferRouter")!,
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
          chainId: walletChainId,
          signer: signer!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              contract.interface.encodeFunctionData("sendWnt", [multichainVaultAddress, inputAmount]),
              contract.interface.encodeFunctionData("bridgeIn", [
                account,
                selectedToken.wrappedAddress!,
                BigInt(depositViewChain),
              ]),
            ],
          ]),
          value: inputAmount,
          callback,
        });
      } else {
        await sendWalletTransaction({
          chainId: walletChainId,
          signer: signer!,
          to: await contract.getAddress(),
          callData: contract.interface.encodeFunctionData("multicall", [
            [
              contract.interface.encodeFunctionData("sendTokens", [
                depositViewTokenAddress,
                multichainVaultAddress,
                inputAmount,
              ]),
              contract.interface.encodeFunctionData("bridgeIn", [
                account,
                depositViewTokenAddress,
                BigInt(depositViewChain),
              ]),
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

      const sourceChainTokenAddress = selectedTokenSourceChainTokenId.address;

      const sourceChainStargateAddress = selectedTokenSourceChainTokenId.stargate;

      const tokenAddress = sourceChainTokenAddress;
      const isNative = tokenAddress === zeroAddress;
      const value = isNative ? inputAmount : 0n;

      await sendWalletTransaction({
        chainId: depositViewChain,
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
            const data = txnEvent.data.error.data as Hex | undefined;

            if (data) {
              const error = decodeErrorResult({
                abi: StargateErrorsAbi,
                data,
              });

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
          } else if (txnEvent.event === TxnEventName.Sent) {
            helperToast.success("Deposit sent", { toastId: "gmx-account-deposit" });
            setIsVisibleOrView("main");
          }
        },
      });
    }
  }, [
    account,
    depositViewChain,
    depositViewTokenAddress,
    inputAmount,
    quoteSend,
    selectedToken?.wrappedAddress,
    selectedTokenSourceChainTokenId,
    sendParamsWithSlippage,
    setIsVisibleOrView,
    settlementChainId,
    signer,
    walletChainId,
  ]);

  useEffect(() => {
    if (depositViewTokenAddress === undefined && depositViewChain !== undefined && multichainTokens.length > 0) {
      // pick the token
      const sourceChainTokenAddresses = MULTI_CHAIN_SUPPORTED_TOKEN_MAP[settlementChainId][depositViewChain];
      if (!sourceChainTokenAddresses || sourceChainTokenAddresses.length === 0) {
        return;
      }

      let maxBalanceTokenAddress = sourceChainTokenAddresses[0];
      let maxBalance =
        multichainTokens.find(
          (sourceChainToken) =>
            sourceChainToken.sourceChainId === depositViewChain && sourceChainToken.address === maxBalanceTokenAddress
        )?.sourceChainBalance ?? 0n;

      for (const sourceChainTokenAddress of sourceChainTokenAddresses) {
        const balance =
          multichainTokens.find(
            (sourceChainToken) =>
              sourceChainToken.sourceChainId === depositViewChain &&
              sourceChainToken.address === sourceChainTokenAddress
          )?.sourceChainBalance ?? 0n;
        if (balance > maxBalance) {
          maxBalance = balance;
          maxBalanceTokenAddress = sourceChainTokenAddress;
        }
      }

      const tokenId = getMappedTokenId(depositViewChain as UiSourceChain, maxBalanceTokenAddress, settlementChainId);

      if (!tokenId) {
        return;
      }

      setDepositViewTokenAddress(tokenId.address);
    }
  }, [
    depositViewChain,
    depositViewTokenAddress,
    multichainTokens,
    selectedToken?.address,
    setDepositViewTokenAddress,
    settlementChainId,
  ]);

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
    return { text: t`Deposit`, onClick: handleDeposit };
  }, [isApproving, needTokenApprove, handleDeposit, selectedToken?.symbol, handleApprove]);

  let placeholder = "";
  if (inputValue === "" && selectedToken?.symbol) {
    placeholder = `0.0 ${selectedToken.symbol}`;
  } else if (selectedToken?.symbol) {
    placeholder = selectedToken.symbol;
  }

  return (
    <div className="flex grow flex-col overflow-y-auto p-16">
      <div className="flex flex-col gap-8">
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
              ) : (
                <>
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                </>
              )}
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
          {depositViewChain !== undefined ? (
            <>
              <img src={getChainIcon(depositViewChain)} alt={getChainName(depositViewChain)} className="size-20" />
              <span className="text-body-large text-slate-100">{getChainName(depositViewChain)}</span>
            </>
          ) : (
            <>
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
            </>
          )}
        </div>
      </div>

      <div className="mt-20 flex flex-col gap-4">
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

      {isAboveLimit && (
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to deposit exceeds the limit. Please try an amount smaller than{" "}
            {upperLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      {isBelowLimit && (
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to deposit is below the limit. Please try an amount larger than{" "}
            {lowerLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      <div className="h-32 shrink-0" />

      <div className="mb-8 flex flex-col gap-8">
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
          value={
            <ValueTransition from={formatUsd(gmxAccountTokenBalanceUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />
          }
        />
        <SyntheticsInfoRow
          label={t`Asset Balance`}
          value={
            <ValueTransition
              from={formatUsd(selectedTokenSourceChainBalanceUsd)}
              to={formatUsd(nextSourceChainBalanceUsd)}
            />
          }
        />
      </div>

      <Button variant="primary" className="mt-auto w-full" onClick={buttonState.onClick}>
        {buttonState.text}
      </Button>
    </div>
  );
};

function useMultichainQuoteFeeUsd({
  quoteSend,
  quoteOft,
}: {
  quoteSend: MessagingFeeStruct | undefined;
  quoteOft:
    | {
        limit: OFTLimitStruct;
        oftFeeDetails: OFTFeeDetailStruct[];
        receipt: OFTReceiptStruct;
      }
    | undefined;
}): {
  networkFee: bigint | undefined;
  networkFeeUsd: bigint | undefined;
  protocolFeeAmount: bigint | undefined;
  protocolFeeUsd: bigint | undefined;
  amountReceivedLD: bigint | undefined;
} {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { chainId: walletChainId } = useAccount();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { pricesData: settlementChainTokenPricesData } = useTokenRecentPricesRequest(settlementChainId);

  if (!depositViewTokenAddress) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const sourceChainTokenId = getMappedTokenId(
    settlementChainId as UiSettlementChain,
    depositViewTokenAddress,
    walletChainId as UiSourceChain
  );

  if (!sourceChainTokenId) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const nativeFee = quoteSend?.nativeFee as bigint;
  const amountReceivedLD = quoteOft?.receipt.amountReceivedLD as bigint;

  // ETH is the same as the source chain
  // TODO: check if this is correct

  const nativeTokenPrices = settlementChainTokenPricesData?.[zeroAddress];
  const depositTokenPrices = settlementChainTokenPricesData?.[depositViewTokenAddress];
  const sourceChainNativeTokenDecimals = getToken(settlementChainId, zeroAddress)?.decimals ?? 18;

  const sourceChainDepositTokenDecimals = sourceChainTokenId?.decimals;

  const nativeFeeUsd =
    nativeFee !== undefined
      ? convertToUsd(nativeFee as bigint, sourceChainNativeTokenDecimals, nativeTokenPrices?.maxPrice)
      : undefined;

  let protocolFeeAmount: bigint | undefined = undefined;
  let protocolFeeUsd: bigint | undefined = undefined;
  if (quoteOft !== undefined) {
    protocolFeeAmount = 0n;
    for (const feeDetail of quoteOft.oftFeeDetails) {
      if (feeDetail.feeAmountLD) {
        protocolFeeAmount -= feeDetail.feeAmountLD as bigint;
      }
    }
    protocolFeeUsd = convertToUsd(protocolFeeAmount, sourceChainDepositTokenDecimals, depositTokenPrices?.maxPrice);
  }

  return {
    networkFee: nativeFee,
    networkFeeUsd: nativeFeeUsd,
    protocolFeeAmount,
    protocolFeeUsd,
    amountReceivedLD,
  };
}

export function applySlippageBps(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS_DIVISOR_BIGINT - slippageBps)) / BASIS_POINTS_DIVISOR_BIGINT;
}
