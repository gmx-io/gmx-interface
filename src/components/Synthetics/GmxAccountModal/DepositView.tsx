import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Trans, t } from "@lingui/macro";
import { abi as IStargateAbi } from "@stargatefinance/stg-evm-sdk-v2/artifacts/src/interfaces/IStargate.sol/IStargate.json";
import { Contract, solidityPacked } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import { Address, parseEther, toHex, zeroAddress } from "viem";
import { estimateTotalGas } from "viem/op-stack";
import { useAccount, usePublicClient } from "wagmi";

import { UiSettlementChain, UiSourceChain, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import { getMappedTokenId, getStargateEndpointId, isSourceChain } from "context/GmxAccountContext/config";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountDepositViewTokenInputValue,
  useGmxAccountModalOpen,
  useGmxAccountSelector,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { selectGmxAccountDepositViewTokenInputAmount } from "context/GmxAccountContext/selectors";
import { getNeedTokenApprove, useTokenRecentPricesRequest, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  formatAmountFree,
  formatBalanceAmount,
  formatPercentage,
  formatUsd,
} from "lib/numbers";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { CodecUiHelper } from "pages/DebugStargate/OFTComposeMsgCodec";
import { abis } from "sdk/abis";
import { getToken } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";
import {
  MessagingFeeStruct,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
  SendParamStruct,
} from "typechain-types-stargate/interfaces/IStargate";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useGmxAccountTokensData, useMultichainTokens } from "./hooks";
import { useMultichainDepositNetworkComposeGas } from "./useMultichainDepositNetworkComposeGas";

const SLIPPAGE_BPS = 50n;

export const DepositView = () => {
  const { address: account, chainId: walletChainId } = useAccount();
  const signer = useEthersSigner({ chainId: walletChainId });
  // const { data: connectorClient } = useWalletClient();
  // connectorClient?.sendTransaction()

  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  // const [depositViewChain, setDepositViewChain] = useGmxAccountDepositViewChain();
  const depositViewChain = walletChainId;
  const sourceChainPublicClient = usePublicClient({ chainId: depositViewChain });

  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
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

  const inputAmount = useGmxAccountSelector(selectGmxAccountDepositViewTokenInputAmount);

  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedTokenChainData?.sourceChainPrices?.maxPrice)
    : undefined;

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedTokenSourceChainBalance === undefined) {
      return;
    }
    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [selectedToken, selectedTokenSourceChainBalance, setInputValue]);

  // useEffect(() => {
  //   console.log("useEffect", {
  //     depositViewChain,
  //     walletChainId,
  //     isSourceChain: walletChainId ? isSourceChain(walletChainId) : undefined,
  //   });
  //   if (depositViewChain === undefined && walletChainId !== undefined && isSourceChain(walletChainId)) {
  //     setDepositViewChain(walletChainId);
  //   }
  // }, [depositViewChain, setDepositViewChain, walletChainId]);

  const gmxAccountTokensData = useGmxAccountTokensData();
  const gmxAccountToken = getByKey(gmxAccountTokensData, depositViewTokenAddress);
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

  useEffect(() => {
    console.log({
      depositViewChain,
      tokensAllowanceData,
      needTokenApprove,
      spenderAddress,
      selectedTokenSourceChainTokenId,
      depositViewTokenAddress,
    });
  }, [
    depositViewChain,
    tokensAllowanceData,
    needTokenApprove,
    spenderAddress,
    selectedTokenSourceChainTokenId,
    depositViewTokenAddress,
  ]);

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

    // if (isNative) {
    //   console.log(`native balance: ${formatEther(await sourceChainProvider.getBalance(address))}`);
    // } else {
    //   // const tokenContract = (await hre.ethers.getContractAt("ERC20Token", tokenAddress)) as ERC20Token;
    //   const tokenContract = new Contract(tokenAddress, abis.ERC20, sourceChainProvider);
    //   decimals = await tokenContract.decimals();
    //   const balance: bigint = await tokenContract.balanceOf(address);
    //   console.log(
    //     `token: ${tokenAddress} balance: ${formatUnits(balance, decimals)} eth: ${formatEther(
    //       await sourceChainProvider.getBalance(address)
    //     )}`
    //   );
    //   const allowance: bigint = await tokenContract.allowance(address, await connectedPool.getAddress());
    //   console.log(`allowance of ${await connectedPool.getAddress()}: ${formatUnits(allowance, decimals)}`);
    //   if (allowance < balance) {
    //     await (
    //       await tokenContract
    //         .connect(signer)
    //         // @ts-ignore
    //         .approve(await connectedPool.getAddress(), MaxUint256)
    //     ).wait();
    //   }
    // }

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
    });
  }, [depositViewChain, depositViewTokenAddress, inputAmount, selectedTokenSourceChainTokenId, signer, spenderAddress]);

  const { composeGas } = useMultichainDepositNetworkComposeGas();

  const { nativeFeeUsd, amountReceivedLD } = useMultichainQuoteFeeUsd(composeGas);

  const handleDeposit = useCallback(async () => {
    console.log("handleDeposit", {
      depositViewChain,
      settlementChainId,
    });
    if (depositViewChain === settlementChainId) {
      // #region DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
      if (!account || !depositViewTokenAddress || inputAmount === undefined || !walletChainId || !depositViewChain) {
        return;
      }

      const multichainVaultAddress = getContract(settlementChainId, "MultichainVault");

      let response: any;
      const contract = new Contract(
        getContract(walletChainId, "MultichainTransferRouter")!,
        abis.MultichainTransferRouterArbitrumSepolia,
        signer
      );

      if (depositViewTokenAddress === zeroAddress) {
        response = await callContract(
          walletChainId,
          contract,
          "multicall",
          [
            [
              contract.interface.encodeFunctionData("sendWnt", [multichainVaultAddress, inputAmount]),
              contract.interface.encodeFunctionData("bridgeIn", [
                account,
                depositViewTokenAddress,
                BigInt(depositViewChain),
              ]),
            ],
          ],
          {
            value: inputAmount,
          }
        );
      } else {
        response = await callContract(
          walletChainId,
          contract,
          "multicall",
          [
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
          ],
          {}
        );
      }

      if (response.success) {
        setIsVisibleOrView("main");
        helperToast.success("Deposit successful");
      } else {
        helperToast.error("Deposit failed");
      }
      // #endregion DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT
    } else {
      if (
        !depositViewTokenAddress ||
        !account ||
        inputAmount === undefined ||
        inputAmount <= 0n ||
        depositViewChain === undefined ||
        composeGas === undefined ||
        sourceChainPublicClient === undefined
      ) {
        helperToast.error("Deposit failed");
        return;
      }

      const sourceChainTokenId = getMappedTokenId(
        settlementChainId as UiSettlementChain,
        depositViewTokenAddress,
        depositViewChain as UiSourceChain
      );

      if (!sourceChainTokenId) {
        return;
      }

      const sourceChainTokenAddress = sourceChainTokenId.address;

      const sourceChainStargateAddress = sourceChainTokenId.stargate;

      const tokenAddress = sourceChainTokenAddress;
      const isNative = tokenAddress === zeroAddress;
      let adjustedAmount = inputAmount;
      const value = isNative ? inputAmount : 0n;

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
        amountLD: adjustedAmount,
        minAmountLD: 0n,
        extraOptions: extraOptions,
        composeMsg: composeMsg ?? "",
        oftCmd: oftCmd.toBytes(),
      };

      const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
        (await sourceChainPublicClient.readContract({
          address: sourceChainStargateAddress as Address,
          abi: IStargateAbi,
          functionName: "quoteOFT",
          args: [sendParams],
        })) as any;

      const minAmountLD = applySlippageBps(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

      const newSendParams: SendParamStruct = {
        ...sendParams,
        minAmountLD,
      };

      const result: MessagingFeeStruct = (await sourceChainPublicClient.readContract({
        address: sourceChainStargateAddress as Address,
        abi: IStargateAbi,
        functionName: "quoteSend",
        args: [newSendParams, false],
      })) as any;

      await callContract(
        depositViewChain,
        new Contract(sourceChainStargateAddress, IStargateAbi, signer),
        "sendToken",
        [newSendParams, { nativeFee: result.nativeFee, lzTokenFee: result.lzTokenFee }, account],
        {
          value: (result.nativeFee as bigint) + value,
          sentMsg: "Deposit sent",
          successMsg: "Deposit sent successfully",
        }
      );
    }
  }, [
    account,
    composeGas,
    depositViewChain,
    depositViewTokenAddress,
    inputAmount,
    setIsVisibleOrView,
    settlementChainId,
    signer,
    sourceChainPublicClient,
    walletChainId,
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

      <div className="h-20" />

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

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        {/* SLIPPAGE_BPS */}
        <SyntheticsInfoRow label="Allowed slippage" value={formatPercentage(SLIPPAGE_BPS, { bps: true })} />
        <SyntheticsInfoRow
          label="Min receive"
          value={
            amountReceivedLD !== undefined && selectedTokenChainData !== undefined
              ? formatBalanceAmount(amountReceivedLD, selectedTokenChainData.sourceChainDecimals)
              : "..."
          }
        />

        <SyntheticsInfoRow label="Network Fee" value={nativeFeeUsd !== undefined ? formatUsd(nativeFeeUsd) : "..."} />
        {/* <SyntheticsInfoRow label="Deposit Fee" value="$0.22" /> */}
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

const SEND_MODE_TAXI = 0;

class OftCmd {
  constructor(
    public sendMode: number,
    public passengers: string[]
  ) {}

  toBytes(): string {
    if (this.sendMode === SEND_MODE_TAXI) {
      return "0x";
    } else {
      return solidityPacked(["uint8"], [this.sendMode]);
    }
  }
}

function useMultichainQuoteFeeUsd(composeGas: bigint | undefined): {
  nativeFee: bigint | undefined;
  nativeFeeUsd: bigint | undefined;
  amountReceivedLD: bigint | undefined;
} {
  const { address: account } = useAccount();
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [depositViewChain] = useGmxAccountDepositViewChain();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  const sourceChainPublicClient = usePublicClient({ chainId: depositViewChain });

  const amount = useGmxAccountSelector(selectGmxAccountDepositViewTokenInputAmount);

  const queryCondition =
    depositViewTokenAddress !== undefined &&
    depositViewChain !== undefined &&
    amount !== undefined &&
    amount > 0n &&
    account !== undefined &&
    sourceChainPublicClient !== undefined &&
    composeGas !== undefined &&
    composeGas > 0n;

  const quoteQuery = useSWR<{ nativeFee: bigint; amountReceivedLD: bigint } | undefined>(
    queryCondition ? ["quoteFee", account, depositViewChain, depositViewTokenAddress, amount, composeGas] : null,
    {
      fetcher: async () => {
        if (!queryCondition) {
          return;
        }

        const sourceChainTokenId = getMappedTokenId(
          settlementChainId as UiSettlementChain,
          depositViewTokenAddress,
          depositViewChain as UiSourceChain
        );

        if (!sourceChainTokenId) {
          return;
        }

        const sourceChainTokenAddress = sourceChainTokenId.address;

        const sourceChainStargateAddress = sourceChainTokenId.stargate;

        const tokenAddress = sourceChainTokenAddress;
        const isNative = tokenAddress === zeroAddress;
        let adjustedAmount = amount;
        const value = isNative ? amount : 0n;

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
          amountLD: adjustedAmount,
          minAmountLD: 0n,
          extraOptions: extraOptions,
          composeMsg: composeMsg ?? "",
          oftCmd: oftCmd.toBytes(),
        };

        const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
          (await sourceChainPublicClient.readContract({
            address: sourceChainStargateAddress as Address,
            abi: IStargateAbi,
            functionName: "quoteOFT",
            args: [sendParams],
          })) as any;

        const minAmountLD = applySlippageBps(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

        const newSendParams: SendParamStruct = {
          ...sendParams,
          minAmountLD,
        };

        const result: MessagingFeeStruct = (await sourceChainPublicClient.readContract({
          address: sourceChainStargateAddress as Address,
          abi: IStargateAbi,
          functionName: "quoteSend",
          args: [newSendParams, false],
        })) as any;

        return {
          nativeFee: result.nativeFee as bigint,
          amountReceivedLD: minAmountLD,
        };
      },
    }
  );
  const nativeFee = quoteQuery.data?.nativeFee;
  const amountReceivedLD = quoteQuery.data?.amountReceivedLD;

  // ETH is the same as the source chain
  // TODO: check if this is correct
  const { pricesData: settlementChainTokenPricesData } = useTokenRecentPricesRequest(settlementChainId);

  const nativeTokenPrices = settlementChainTokenPricesData?.[zeroAddress];
  const sourceChainNativeTokenDecimals = getToken(settlementChainId, zeroAddress)?.decimals ?? 18;

  const nativeFeeUsd = convertToUsd(nativeFee, sourceChainNativeTokenDecimals, nativeTokenPrices?.maxPrice);

  return {
    nativeFee,
    nativeFeeUsd,
    amountReceivedLD,
  };

  // return { nativeFee, lzTokenFee };

  // const receipt = await(
  //   await connectedPool.sendToken(sendParams, { nativeFee, lzTokenFee }, address, {
  //     value: nativeFee + value,
  //     // gasPrice,
  //   })
  // ).wait();

  // if (!receipt) {
  //   throw new Error("No receipt");
  // }
}

// function useGmxAccountDepositViewMinReceiveAmount() {
//   const inputAmount = useGmxAccountSelector(selectGmxAccountDepositViewTokenInputAmount);

//   if (inputAmount === undefined) {
//     return undefined;
//   }

//   const minAmount = applySlippage(inputAmount, SLIPPAGE_BPS);

//   return minAmount;
// }

export function applySlippageBps(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS_DIVISOR_BIGINT - slippageBps)) / BASIS_POINTS_DIVISOR_BIGINT;
}
