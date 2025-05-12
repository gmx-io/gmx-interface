import { Contract, ethers, Provider, Wallet } from "ethers";
import { encodeAbiParameters, keccak256 } from "viem";

import { getIsInternalSwapBetter } from "domain/synthetics/externalSwaps/utils";
import { getNeedTokenApprove, TokensAllowanceData, TokensData } from "domain/synthetics/tokens";
import { SignedTokenPermit } from "domain/tokens";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { getContract } from "sdk/configs/contracts";
import { getRelayerFeeToken } from "sdk/configs/express";
import { ExternalSwapOutput, SwapAmounts } from "sdk/types/trade";
import { getByKey } from "sdk/utils/objects";
import { combineExternalCalls, ExternalCallsPayload, getExternalCallsPayload } from "sdk/utils/orderTransactions";

import { RelayerFeeParams, RelayFeePayload, RelayParamsPayload } from "./types";

export function getExpressContractAddress(chainId: number, { isSubaccount }: { isSubaccount: boolean }) {
  return getContract(chainId, isSubaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter");
}

export function getExpressContractInstance(chainId: number, provider: Provider, isSubaccount: boolean) {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount });

  const abi = isSubaccount ? abis.SubaccountGelatoRelayRouter : abis.GelatoRelayRouter;

  const contract = new Contract(contractAddress, abi, provider);

  return contract;
}

export function getGelatoRelayRouterDomain(chainId: number, isSubaccount: boolean) {
  return {
    name: "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId: chainId,
    verifyingContract: getExpressContractAddress(chainId, { isSubaccount }),
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
    relayFeeParams.gasPaymentTokenAmount,
    []
  );
}

export function getRelayerFeeParams({
  chainId,
  account,
  relayerFeeTokenAmount,
  relayerFeeTokenAddress,
  gasPaymentTokenAddress,
  totalNetworkFeeAmount,
  internalSwapAmounts,
  batchExternalCalls,
  feeExternalSwapQuote,
  tokensData,
  gasPaymentAllowanceData,
  forceExternalSwaps,
  tokenPermits,
}: {
  chainId: number;
  account: string;
  relayerFeeTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  relayerFeeTokenAddress: string;
  gasPaymentTokenAddress: string;
  internalSwapAmounts: SwapAmounts | undefined;
  batchExternalCalls: ExternalCallsPayload;
  feeExternalSwapQuote: ExternalSwapOutput | undefined;
  tokensData: TokensData;
  gasPaymentAllowanceData: TokensAllowanceData;
  forceExternalSwaps: boolean | undefined;
  tokenPermits: SignedTokenPermit[];
}): RelayerFeeParams {
  let feeParams: RelayFeePayload;
  let externalCalls: ExternalCallsPayload;
  let gasPaymentTokenAmount: bigint;
  let externalSwapGasLimit = 0n;
  let noFeeSwap = false;

  if (gasPaymentTokenAddress === relayerFeeTokenAddress) {
    externalCalls = batchExternalCalls;
    feeParams = {
      feeToken: relayerFeeTokenAddress,
      feeAmount: totalNetworkFeeAmount,
      feeSwapPath: [],
    };
    gasPaymentTokenAmount = totalNetworkFeeAmount;
  } else if (
    getIsInternalSwapBetter({ internalSwapAmounts, externalSwapQuote: feeExternalSwapQuote, forceExternalSwaps }) &&
    internalSwapAmounts?.swapPathStats
  ) {
    feeParams = {
      feeToken: internalSwapAmounts.swapPathStats.tokenInAddress,
      feeAmount: internalSwapAmounts.amountIn,
      feeSwapPath: internalSwapAmounts.swapPathStats.swapPath,
    };
    externalCalls = batchExternalCalls;
    totalNetworkFeeAmount = internalSwapAmounts.amountOut;
    gasPaymentTokenAmount = internalSwapAmounts.amountIn;
    gasPaymentTokenAddress = internalSwapAmounts.swapPathStats.tokenInAddress;
  } else if (feeExternalSwapQuote) {
    const feeExternalCalls = getExternalCallsPayload({
      chainId,
      account,
      quote: feeExternalSwapQuote,
    });
    externalCalls = combineExternalCalls([batchExternalCalls, feeExternalCalls]);
    feeParams = {
      feeToken: feeExternalSwapQuote.outTokenAddress, // final token
      feeAmount: 0n, // fee already sent in external calls
      feeSwapPath: [],
    };
    externalSwapGasLimit = feeExternalSwapQuote.txnData.estimatedGas;
    gasPaymentTokenAmount = feeExternalSwapQuote.amountIn;
    totalNetworkFeeAmount = feeExternalSwapQuote.amountOut;
  } else {
    externalCalls = batchExternalCalls;
    feeParams = {
      feeToken: relayerFeeTokenAddress,
      feeAmount: 0n,
      feeSwapPath: [],
    };
    gasPaymentTokenAmount = relayerFeeTokenAmount;
    noFeeSwap = true;
  }

  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

  const needGasPaymentTokenApproval = getNeedTokenApprove(
    gasPaymentAllowanceData,
    gasPaymentTokenAddress,
    gasPaymentTokenAmount,
    tokenPermits
  );

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
    noFeeSwap,
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

export async function getRelayRouterNonceForSigner(
  chainId: number,
  signer: WalletSigner | Wallet,
  isSubaccount: boolean
): Promise<bigint> {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount });
  const contract = new ethers.Contract(contractAddress, abis.GelatoRelayRouter, signer);

  return contract.userNonces(signer.address);
}
