import { Contract, ethers, Provider, Wallet } from "ethers";
import { Address, encodeAbiParameters, keccak256 } from "viem";

import { getIsInternalSwapBetter } from "domain/synthetics/externalSwaps/utils";
import { getNeedTokenApprove, TokensAllowanceData, TokensData } from "domain/synthetics/tokens";
import { SignedTokenPermit } from "domain/tokens";
import { WalletSigner } from "lib/wallets";
import type { SignatureDomain } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { UiContractsChain, UiSourceChain } from "sdk/configs/chains";
import { ContractName, getContract } from "sdk/configs/contracts";
import { getRelayerFeeToken } from "sdk/configs/express";
import { ExternalSwapOutput, SwapAmounts } from "sdk/types/trade";
import { getByKey } from "sdk/utils/objects";
import { combineExternalCalls, ExternalCallsPayload, getExternalCallsPayload } from "sdk/utils/orderTransactions";
import type { GelatoRelayRouter, SubaccountGelatoRelayRouter } from "typechain-types";
import type {
  MultichainClaimsRouter,
  MultichainGlvRouter,
  MultichainGmRouter,
  MultichainOrderRouter,
  MultichainTransferRouter,
} from "typechain-types-arbitrum-sepolia";

import { MultichainRelayParamsPayload, RelayerFeeParams, RelayFeePayload, RelayParamsPayload } from "./types";

export function getExpressContractAddress(
  chainId: UiContractsChain,
  {
    isSubaccount,
    isMultichain,
    scope,
  }: {
    isSubaccount: boolean;
    isMultichain: boolean;
    scope: "glv" | "gm" | "transfer" | "claims" | "order" | "subaccount";
  }
) {
  let contractName: ContractName;
  if (isMultichain) {
    switch (scope) {
      case "claims":
        contractName = "MultichainClaimsRouter";
        break;
      case "order":
        contractName = "MultichainOrderRouter";
        break;
      case "subaccount":
        contractName = "MultichainSubaccountRouter";
        break;
      case "glv":
        contractName = "MultichainGlvRouter";
        break;
      case "gm":
        contractName = "MultichainGmRouter";
        break;
      case "transfer":
        contractName = "MultichainTransferRouter";
        break;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
  } else {
    if (isSubaccount) {
      contractName = "SubaccountGelatoRelayRouter";
    } else {
      contractName = "GelatoRelayRouter";
    }
  }

  return getContract(chainId, contractName);
}

// TODO: deal with isSubaccount
export function getGelatoRelayRouterDomain(
  chainId: UiContractsChain,
  relayRouterAddress: Address,
  isSubaccount: boolean,
  srcChainId?: UiSourceChain
): SignatureDomain {
  const name = "GmxBaseGelatoRelayRouter";

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
    relayFeeParams.gasPaymentTokenAmount,
    []
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
  batchExternalCalls,
  feeExternalSwapQuote,
  tokensData,
  gasPaymentAllowanceData,
  forceExternalSwaps,
  tokenPermits,
}: {
  chainId: UiContractsChain;
  srcChainId: UiSourceChain | undefined;
  account: string;
  relayerFeeTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  relayerFeeTokenAddress: string;
  gasPaymentTokenAddress: string;
  internalSwapAmounts: SwapAmounts | undefined;
  batchExternalCalls: ExternalCallsPayload;
  feeExternalSwapQuote: ExternalSwapOutput | undefined;
  tokensData: TokensData;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  forceExternalSwaps: boolean | undefined;
  tokenPermits: SignedTokenPermit[];
}): RelayerFeeParams {
  if (!srcChainId && !gasPaymentAllowanceData) {
    throw new Error("Allowance data is required for non-multichain");
  }

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
      // feeAmount: relayerFeeTokenAmount,
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
    gasPaymentTokenAddress = internalSwapAmounts.swapPathStats.tokenInAddress;
    gasPaymentTokenAmount = internalSwapAmounts.amountIn;
    totalNetworkFeeAmount = internalSwapAmounts.amountOut;
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
    gasPaymentTokenAmount = 0n;
    noFeeSwap = true;
  }

  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

  const needGasPaymentTokenApproval = srcChainId
    ? false
    : getNeedTokenApprove(gasPaymentAllowanceData, gasPaymentTokenAddress, gasPaymentTokenAmount, tokenPermits);

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

export async function getRelayRouterNonceForSigner({
  chainId,
  signer,
  isSubaccount,
  isMultichain,
  scope,
}: {
  chainId: UiContractsChain;
  signer: WalletSigner | Wallet;
  isSubaccount: boolean;
  isMultichain: boolean;
  scope: "glv" | "gm" | "transfer" | "claims" | "order" | "subaccount";
}): Promise<bigint> {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount, isMultichain, scope });
  const contract = new ethers.Contract(contractAddress, abis.AbstractUserNonceable, signer);

  return contract.userNonces(signer.address);
}

export async function getRelayRouterNonceForMultichain(
  provider: Provider,
  account: Address,
  relayRouterAddress: Address
) {
  if (!provider) {
    throw new Error("provider is required");
  }

  const abstractNonceable = new Contract(relayRouterAddress, abis.AbstractUserNonceable, provider) as unknown as
    | GelatoRelayRouter
    | SubaccountGelatoRelayRouter
    | MultichainGmRouter
    | MultichainGlvRouter
    | MultichainOrderRouter
    | MultichainClaimsRouter
    | MultichainTransferRouter;

  return await abstractNonceable.userNonces(account);
}
