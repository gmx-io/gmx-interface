import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Trans, t } from "@lingui/macro";
import { abi as IStargateAbi } from "@stargatefinance/stg-evm-sdk-v2/artifacts/src/interfaces/IStargate.sol/IStargate.json";
import { Contract, solidityPacked } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import { Address, encodeFunctionData, maxUint256, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient, useConnectorClient, useWalletClient } from "wagmi";
// node_modules/@stargatefinance/stg-evm-sdk-v2/artifacts/src/{interfaces/IStargate.sol/IStargate.json,messaging/TokenMessaging.sol/TokenMessaging.json}

import { UiSettlementChain, UiSourceChain, getChainName } from "config/chains";
import { getContract, tryGetContract } from "config/contracts";
import { getChainIcon } from "config/icons";
import {
  getMultichainTokenId,
  getStargateEndpointId,
  getStargatePoolAddress,
  getMappedTokenId,
  isSourceChain,
} from "context/GmxAccountContext/config";
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
  parseValue,
} from "lib/numbers";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import { CodecUiHelper, OFTComposeMsgCodec } from "pages/DebugStargate/OFTComposeMsgCodec";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS, getToken } from "sdk/configs/tokens";
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

const SLIPPAGE_BPS = 50n;

export const DepositView = () => {
  const { address: account, chainId: walletChainId } = useAccount();
  const signer = useEthersSigner({ chainId: walletChainId });
  // const { data: connectorClient } = useWalletClient();
  // connectorClient?.sendTransaction()

  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const [depositViewChain, setDepositViewChain] = useGmxAccountDepositViewChain();
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

  useEffect(() => {
    if (depositViewChain === undefined && walletChainId && isSourceChain(walletChainId)) {
      setDepositViewChain(walletChainId);
    }
  }, [depositViewChain, walletChainId, setDepositViewChain]);

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

  const tokensAllowanceResult = useTokensAllowanceData(depositViewChain ?? settlementChainId, {
    spenderAddress: selectedTokenSourceChainTokenId?.stargate,
    tokenAddresses: selectedTokenSourceChainTokenId ? [selectedTokenSourceChainTokenId.address] : [],
  });
  const tokensAllowanceData = depositViewChain !== undefined ? tokensAllowanceResult.tokensAllowanceData : undefined;

  const needTokenApprove = getNeedTokenApprove(
    tokensAllowanceData,
    selectedTokenSourceChainTokenId?.address,
    inputAmount
  );

  const handleApprove = useCallback(async () => {
    if (!depositViewChain || !depositViewTokenAddress || inputAmount === undefined) {
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
      spender: selectedTokenSourceChainTokenId.stargate,
      setIsApproving,
    });
  }, [depositViewChain, depositViewTokenAddress, inputAmount, selectedTokenSourceChainTokenId, signer]);

  const { composeGas } = useMultichainNetworkComposeFeeUsd();

  const { nativeFeeUsd, amountReceivedLD } = useMultichainQuoteFeeUsd(composeGas);

  const handleDeposit = useCallback(async () => {
    // if (!account || !depositViewTokenAddress || inputAmount === undefined || !walletChainId || !depositViewChain) {
    //   return;
    // }

    // const multichainVaultAddress = getContract(settlementChainId, "MultichainVault");

    // let response: any;
    // const contract = new Contract(
    //   getContract(walletChainId, "MultichainTransferRouter")!,
    //   abis.MultichainTransferRouterArbitrumSepolia,
    //   signer
    // );

    // if (depositViewTokenAddress === zeroAddress) {
    //   response = await callContract(
    //     walletChainId,
    //     contract,
    //     "multicall",
    //     [
    //       [
    //         contract.interface.encodeFunctionData("sendWnt", [multichainVaultAddress, inputAmount]),
    //         contract.interface.encodeFunctionData("bridgeIn", [
    //           account,
    //           depositViewTokenAddress,
    //           BigInt(depositViewChain),
    //         ]),
    //       ],
    //     ],
    //     {
    //       value: inputAmount,
    //     }
    //   );
    // } else {
    //   response = await callContract(
    //     walletChainId,
    //     contract,
    //     "multicall",
    //     [
    //       [
    //         contract.interface.encodeFunctionData("sendTokens", [
    //           depositViewTokenAddress,
    //           multichainVaultAddress,
    //           inputAmount,
    //         ]),
    //         contract.interface.encodeFunctionData("bridgeIn", [
    //           account,
    //           depositViewTokenAddress,
    //           BigInt(depositViewChain),
    //         ]),
    //       ],
    //     ],
    //     {}
    //   );
    // }

    // if (response.success) {
    //   setIsVisibleOrView("main");
    //   helperToast.success("Deposit successful");
    // } else {
    //   helperToast.error("Deposit failed");
    // }

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

    const minAmountLD = applySlippage(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

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
  }, [
    account,
    composeGas,
    depositViewChain,
    depositViewTokenAddress,
    inputAmount,
    settlementChainId,
    signer,
    sourceChainPublicClient,
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

const FALLBACK_COMPOSE_GAS = 230_000n;

function useMultichainNetworkComposeFeeUsd(): {
  composeGas: bigint | undefined;
} {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [depositViewChain] = useGmxAccountDepositViewChain();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { address: account } = useAccount();

  const fakeInputAmount = 10n * 10n ** 18n;
  const settlementChainPublicClient = usePublicClient({ chainId: settlementChainId });
  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    depositViewChain &&
    depositViewTokenAddress &&
    getStargatePoolAddress(settlementChainId, depositViewTokenAddress) !== undefined &&
    tryGetContract(settlementChainId, "LayerZeroProvider") !== undefined;
  const composeGasQuery = useSWR<bigint>(composeGasQueryCondition ? ["composeGas", account, settlementChainId] : null, {
    fetcher: async () => {
      if (!composeGasQueryCondition) {
        return 0n;
      }

      const composeFromWithMsg = CodecUiHelper.composeMessage(settlementChainId, account, depositViewChain);
      const message = OFTComposeMsgCodec.encode(
        0,
        getStargateEndpointId(settlementChainId)!,
        fakeInputAmount,
        composeFromWithMsg
      );

      try {
        const gas = await settlementChainPublicClient.estimateContractGas({
          address: tryGetContract(settlementChainId, "LayerZeroProvider")!,
          abi: abis.LayerZeroProviderArbitrumSepolia,
          functionName: "lzCompose",
          args: [
            getStargatePoolAddress(settlementChainId, depositViewTokenAddress),
            toHex(0, { size: 32 }),
            message,
            zeroAddress,
            "0x",
          ],
          account: CodecUiHelper.getLzEndpoint(settlementChainId),
          stateOverride: [
            {
              address: depositViewTokenAddress as Address,
              code: "0x608060405234801561001057600080fd5b50600436106100835760003560e01c806306fdde0314610088578063095ea7b3146100a657806318160ddd146100c957806323b872dd146100db578063313ce567146100ee57806370a082311461010357806395d89b4114610128578063a9059cbb14610130578063dd62ed3e14610143575b600080fd5b61009061017a565b60405161009d919061034f565b60405180910390f35b6100b96100b43660046103b9565b61020c565b604051901515815260200161009d565b6000195b60405190815260200161009d565b6100b96100e93660046103e3565b61023a565b60045460405160ff909116815260200161009d565b6100cd61011136600461041f565b6001600160a01b0316600090815260205260001990565b6100906102f7565b6100b961013e3660046103b9565b610306565b6100cd610151366004610441565b6001600160a01b0391821660009081526001602090815260408220929093169052905260001990565b60606002805461018990610474565b80601f01602080910402602001604051908101604052809291908181526020018280546101b590610474565b80156102025780601f106101d757610100808354040283529160200191610202565b820191906000526020600020905b8154815290600101906020018083116101e557829003601f168201915b5050505050905090565b3360009081526001602081815260408084206001600160a01b03871685529091529091208290555b92915050565b6001600160a01b03831660009081526001602090815260408083203384529091528120546102699083906104c4565b6001600160a01b03851660008181526001602090815260408083203384528252808320949094559181529081905220546102a49083906104c4565b6001600160a01b0380861660009081526020819052604080822093909355908516815220546102d49083906104d7565b6001600160a01b0384166000908152602081905260409020555060019392505050565b60606003805461018990610474565b600060208190526001600160a01b03831681526040812054339061032b9084906104d7565b6001600160a01b038516600090815260208190526040902055506001905092915050565b600060208083528351808285015260005b8181101561037c57858101830151858201604001528201610360565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b03811681146103b457600080fd5b919050565b600080604083850312156103cc57600080fd5b6103d58361039d565b946020939093013593505050565b6000806000606084860312156103f857600080fd5b6104018461039d565b925061040f6020850161039d565b9150604084013590509250925092565b60006020828403121561043157600080fd5b61043a8261039d565b9392505050565b6000806040838503121561045457600080fd5b61045d8361039d565b915061046b6020840161039d565b90509250929050565b600181811c9082168061048857607f821691505b6020821081036104a857634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b81810381811115610234576102346104ae565b80820180821115610234576102346104ae56fea2646970667358221220b3aa0f9f4982812094e8abf809e4d68fed6a0d1fb96351a86367c6291b337dd664736f6c63430008140033",
            },
          ],
        });

        return gas;
      } catch (error) {
        return FALLBACK_COMPOSE_GAS;
      }
    },
    refreshInterval: 5000,
  });
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
  };
}

// i gave gas | was given                     | was spent
// 10m        | 27.2m                         | 208k
// 174k       | 3.2m (from estimated)         | 208k
// 1          | failed                        |
// 1k         | failed                        |
// 100k       | failed                        |
// 174k       | 3.2m (from estimated)         | 208k
// 157k       | 3.2m (from estimated - 10%)   | 208k
// 139k       | failed (from estimated - 20%) |
// 122k       | failed (from estimated - 30%) |

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

        const minAmountLD = applySlippage(receipt.amountReceivedLD as bigint, SLIPPAGE_BPS);

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

function applySlippage(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS_DIVISOR_BIGINT - slippageBps)) / BASIS_POINTS_DIVISOR_BIGINT;
}
