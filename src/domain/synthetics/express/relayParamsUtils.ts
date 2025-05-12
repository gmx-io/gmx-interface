import { Contract, ethers, Provider, Signer } from "ethers";
import { Address, Client, encodeAbiParameters, keccak256 } from "viem";
import { readContract } from "viem/actions";

import { getIsInternalSwapBetter } from "domain/synthetics/externalSwaps/utils";
import { getNeedTokenApprove, TokensAllowanceData, TokensData } from "domain/synthetics/tokens";
import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { UiContractsChain, UiSourceChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { getRelayerFeeToken } from "sdk/configs/express";
import { ExternalSwapOutput, SwapAmounts } from "sdk/types/trade";
import { getByKey } from "sdk/utils/objects";
import { ExternalCallsPayload, getExternalCallsPayload } from "sdk/utils/orderTransactions";

import { MultichainRelayParamsPayload, RelayerFeeParams, RelayFeePayload, RelayParamsPayload } from "./types";

export function getExpressContractAddress(chainId: number, { isSubaccount }: { isSubaccount: boolean }) {
  return getContract(chainId, isSubaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter");
}

export function getExpressContractInstance(chainId: number, provider: Provider, isSubaccount: boolean) {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount });

  const abi = isSubaccount ? abis.SubaccountGelatoRelayRouter : abis.GelatoRelayRouter;

  const contract = new Contract(contractAddress, abi, provider);

  return contract;
}

export function getGelatoRelayRouterDomain(
  chainId: UiContractsChain,
  relayRouterAddress: Address,
  isSubaccount: boolean,
  srcChainId?: UiSourceChain
): {
  name: string;
  chainId: number;
  verifyingContract: Address;
  version: string;
} {
  let name: string;
  if (isSubaccount) {
    name = "GmxBaseSubaccountGelatoRelayRouter";
  } else {
    name = "GmxBaseGelatoRelayRouter";
  }

  let domainChainId: number;
  if (srcChainId) {
    domainChainId = srcChainId;
  } else {
    domainChainId = chainId;
  }

  return {
    name,
    version: "1",
    chainId: domainChainId,
    verifyingContract: relayRouterAddress,
  };
}

export function getNeedGasPaymentTokenApproval(
  chainId: number,
  relayFeeParams: RelayerFeeParams,
  expressContractAllowance: TokensAllowanceData
) {
  return getNeedTokenApprove(
    expressContractAllowance,
    relayFeeParams.gasPaymentTokenAddress,
    relayFeeParams.gasPaymentTokenAmount
  );
}

export function getRelayerFeeParams({
  chainId,
  srcChainId,
  account,
  relayerFeeTokenAmount,
  relayerFeeTokenAddress,
  gasPaymentTokenAddress,
  totalNetworkFeeAmount,
  internalSwapAmounts,
  externalSwapQuote,
  tokensData,
  gasPaymentAllowanceData,
  forceExternalSwaps,
}: {
  chainId: UiContractsChain;
  srcChainId: UiSourceChain | undefined;
  account: string;
  relayerFeeTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  relayerFeeTokenAddress: string;
  gasPaymentTokenAddress: string;
  internalSwapAmounts: SwapAmounts | undefined;
  externalSwapQuote: ExternalSwapOutput | undefined;
  tokensData: TokensData;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  forceExternalSwaps: boolean | undefined;
}): RelayerFeeParams | undefined {
  if (!srcChainId && !gasPaymentAllowanceData) {
    throw new Error("Allowance data is required for non-multichain");
  }

  let feeParams: RelayFeePayload;
  let externalCalls: ExternalCallsPayload;
  let gasPaymentTokenAmount: bigint;
  let externalSwapGasLimit = 0n;

  if (gasPaymentTokenAddress === relayerFeeTokenAddress) {
    externalCalls = {
      externalCallTargets: [],
      externalCallDataList: [],
      refundReceivers: [],
      refundTokens: [],
      sendTokens: [],
      sendAmounts: [],
    } as ExternalCallsPayload;
    feeParams = {
      feeToken: relayerFeeTokenAddress,
      feeAmount: totalNetworkFeeAmount,
      // feeAmount: relayerFeeTokenAmount,
      feeSwapPath: [],
    };
    gasPaymentTokenAmount = totalNetworkFeeAmount;
  } else if (
    getIsInternalSwapBetter({ internalSwapAmounts, externalSwapQuote, forceExternalSwaps }) &&
    internalSwapAmounts?.swapPathStats
  ) {
    feeParams = {
      feeToken: internalSwapAmounts.swapPathStats.tokenInAddress,
      feeAmount: internalSwapAmounts.amountIn,
      feeSwapPath: internalSwapAmounts.swapPathStats.swapPath,
    };
    externalCalls = {
      externalCallTargets: [],
      externalCallDataList: [],
      refundReceivers: [],
      refundTokens: [],
      sendTokens: [],
      sendAmounts: [],
    } as ExternalCallsPayload;
    totalNetworkFeeAmount = internalSwapAmounts.amountOut;
    gasPaymentTokenAmount = internalSwapAmounts.amountIn;
    gasPaymentTokenAddress = internalSwapAmounts.swapPathStats.tokenInAddress;
  } else if (externalSwapQuote) {
    externalCalls = getExternalCallsPayload({
      chainId,
      account,
      quote: externalSwapQuote,
    });
    feeParams = {
      feeToken: externalSwapQuote.outTokenAddress, // final token
      feeAmount: 0n, // fee already sent in external calls
      feeSwapPath: [],
    };
    externalSwapGasLimit = externalSwapQuote.txnData.estimatedGas;
    gasPaymentTokenAmount = externalSwapQuote.amountIn;
    totalNetworkFeeAmount = externalSwapQuote.amountOut;
  } else {
    if (
      getIsInternalSwapBetter({ internalSwapAmounts, externalSwapQuote, forceExternalSwaps }) &&
      !internalSwapAmounts?.swapPathStats
    ) {
      console.warn("No swap stats for internal swap");
    }
    return undefined;
  }

  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

  const needGasPaymentTokenApproval = srcChainId
    ? false
    : getNeedTokenApprove(gasPaymentAllowanceData, gasPaymentTokenAddress, gasPaymentTokenAmount);

  return {
    feeParams,
    externalCalls,
    relayerTokenAddress: getRelayerFeeToken(chainId).address,
    relayerTokenAmount: relayerFeeTokenAmount,
    totalNetworkFeeAmount,
    gasPaymentTokenAmount,
    isOutGasTokenBalance,
    needGasPaymentTokenApproval,
    gasPaymentTokenAddress,
    externalSwapGasLimit,
  };
}

export function hashRelayParams(relayParams: RelayParamsPayload) {
  const encoded = encodeAbiParameters(RelayParamsAbi.abi, [
    [relayParams.oracleParams.tokens, relayParams.oracleParams.providers, relayParams.oracleParams.data],
    [
      relayParams.externalCalls.sendTokens,
      relayParams.externalCalls.sendAmounts,
      relayParams.externalCalls.externalCallTargets,
      relayParams.externalCalls.externalCallDataList,
      relayParams.externalCalls.refundTokens,
      relayParams.externalCalls.refundReceivers,
    ],
    relayParams.tokenPermits,
    [relayParams.fee.feeToken, relayParams.fee.feeAmount, relayParams.fee.feeSwapPath],
    relayParams.userNonce,
    relayParams.deadline,
  ]);

  const hash = keccak256(encoded);

  return hash;
}

export function hashRelayParamsMultichain(relayParams: MultichainRelayParamsPayload) {
  const encoded = encodeAbiParameters(abis.RelayParamsArbitrumSepolia, [
    [relayParams.oracleParams.tokens, relayParams.oracleParams.providers, relayParams.oracleParams.data],
    [
      relayParams.externalCalls.sendTokens,
      relayParams.externalCalls.sendAmounts,
      relayParams.externalCalls.externalCallTargets,
      relayParams.externalCalls.externalCallDataList,
      relayParams.externalCalls.refundTokens,
      relayParams.externalCalls.refundReceivers,
    ],
    relayParams.tokenPermits,
    [relayParams.fee.feeToken, relayParams.fee.feeAmount, relayParams.fee.feeSwapPath],
    relayParams.userNonce,
    relayParams.deadline,
    relayParams.desChainId,
  ]);

  const hash = keccak256(encoded);

  return hash;
}

export async function getRelayRouterNonceForSigner(chainId: number, signer: Signer, isSubaccount: boolean) {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount });
  const contract = new ethers.Contract(contractAddress, abis.GelatoRelayRouter, signer);

  return contract.userNonces(await signer.getAddress());
}

const abiWithUserNonces = [
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userNonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function getRelayRouterNonceForMultichain(
  settlementChainClient: Client,
  account: Address,
  relayRouterAddress: Address
) {
  // const contractAddress = relayRouterAddress;

  if (!settlementChainClient) {
    throw new Error("settlementChainClient is required");
  }

  const result: bigint = await readContract(settlementChainClient, {
    address: relayRouterAddress,
    abi: abiWithUserNonces,
    functionName: "userNonces",
    args: [account],
  });

  return result;
}
