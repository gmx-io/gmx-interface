import { Contract, ethers, Provider, Wallet } from "ethers";
import { Address, encodeAbiParameters, keccak256 } from "viem";

import type { UiContractsChain, UiSourceChain } from "config/chains";
import { getBestSwapStrategy } from "domain/synthetics/externalSwaps/utils";
import type { SignedTokenPermit, TokenData } from "domain/tokens";
import type { WalletSigner } from "lib/wallets";
import type { SignatureDomain } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { ContractName, getContract } from "sdk/configs/contracts";
import { MarketsInfoData } from "sdk/types/markets";
import { ExternalSwapQuote, FindSwapPath, SwapAmounts } from "sdk/types/trade";
import {
  combineExternalCalls,
  ExternalCallsPayload,
  getEmptyExternalCallsPayload,
  getExternalCallsPayload,
} from "sdk/utils/orderTransactions";
import { getSwapAmountsByToValue } from "sdk/utils/swap";
import type { GelatoRelayRouter, SubaccountGelatoRelayRouter } from "typechain-types";
import type {
  MultichainClaimsRouter,
  MultichainGlvRouter,
  MultichainGmRouter,
  MultichainOrderRouter,
  MultichainTransferRouter,
} from "typechain-types-arbitrum-sepolia";

import { getOracleParamsForRelayParams } from "./oracleParamsUtils";
import type {
  GasPaymentParams,
  MultichainRelayParamsPayload,
  RawMultichainRelayParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
  RelayParamsPayload,
} from "./types";

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

export function getRelayerFeeParams({
  chainId,
  account,
  gasPaymentToken,
  relayerFeeToken,
  relayerFeeAmount,
  totalRelayerFeeTokenAmount,
  transactionExternalCalls,
  feeExternalSwapQuote,
  findFeeSwapPath,
}: {
  chainId: UiContractsChain;
  account: string;
  relayerFeeAmount: bigint;
  totalRelayerFeeTokenAmount: bigint;
  relayerFeeToken: TokenData;
  gasPaymentToken: TokenData;
  findFeeSwapPath: FindSwapPath | undefined;
  feeExternalSwapQuote: ExternalSwapQuote | undefined;
  /**
   * If transaction contains an external calls e.g. for collateral external swaps,
   * it should also be included in relayParams
   */
  transactionExternalCalls: ExternalCallsPayload | undefined;
}) {
  const gasPaymentParams: GasPaymentParams = {
    gasPaymentToken: gasPaymentToken,
    relayFeeToken: relayerFeeToken,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    relayerFeeAmount,
    totalRelayerFeeTokenAmount,
    gasPaymentTokenAmount: 0n,
  };

  let feeParams: RelayFeePayload;
  let externalCalls = transactionExternalCalls ?? getEmptyExternalCallsPayload();
  let feeExternalSwapGasLimit = 0n;

  if (relayerFeeToken.address === gasPaymentToken.address) {
    feeParams = {
      feeToken: relayerFeeToken.address,
      feeAmount: totalRelayerFeeTokenAmount,
      feeSwapPath: [],
    };
    gasPaymentParams.gasPaymentTokenAmount = totalRelayerFeeTokenAmount;
  } else {
    let feeSwapAmounts: SwapAmounts | undefined;

    if (findFeeSwapPath) {
      feeSwapAmounts = getSwapAmountsByToValue({
        tokenIn: gasPaymentToken,
        tokenOut: relayerFeeToken,
        amountOut: totalRelayerFeeTokenAmount,
        isLimit: false,
        findSwapPath: findFeeSwapPath,
        uiFeeFactor: 0n,
      });
    }

    const bestFeeSwapStrategy = getBestSwapStrategy({
      internalSwapAmounts: feeSwapAmounts,
      externalSwapQuote: feeExternalSwapQuote,
    });

    if (bestFeeSwapStrategy?.swapPath) {
      feeParams = {
        feeToken: gasPaymentToken.address,
        feeAmount: bestFeeSwapStrategy.amountIn,
        feeSwapPath: bestFeeSwapStrategy.swapPath,
      };
      gasPaymentParams.gasPaymentTokenAmount = bestFeeSwapStrategy.amountIn;
      gasPaymentParams.totalRelayerFeeTokenAmount = bestFeeSwapStrategy.amountOut;
    } else if (bestFeeSwapStrategy?.externalSwapQuote) {
      externalCalls = combineExternalCalls([
        externalCalls,
        getExternalCallsPayload({
          chainId,
          account,
          quote: bestFeeSwapStrategy.externalSwapQuote,
        }),
      ]);
      feeExternalSwapGasLimit = bestFeeSwapStrategy.externalSwapQuote.txnData.estimatedGas;
      feeParams = {
        feeToken: relayerFeeToken.address, // final token
        feeAmount: 0n, // fee already sent in external calls
        feeSwapPath: [],
      };
      gasPaymentParams.gasPaymentTokenAmount = bestFeeSwapStrategy.externalSwapQuote.amountIn;
      gasPaymentParams.totalRelayerFeeTokenAmount = bestFeeSwapStrategy.externalSwapQuote.amountOut;
    } else {
      return undefined;
    }
  }

  return {
    feeParams,
    externalCalls,
    feeExternalSwapGasLimit,
    gasPaymentParams,
  };
}

export function getRawRelayerParams({
  chainId,
  gasPaymentTokenAddress,
  relayerFeeTokenAddress,
  feeParams,
  externalCalls,
  tokenPermits,
  marketsInfoData,
  isMultichain,
}: {
  chainId: UiContractsChain;
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  tokenPermits: SignedTokenPermit[];
  marketsInfoData: MarketsInfoData;
  isMultichain: boolean;
}): RawRelayParamsPayload | RawMultichainRelayParamsPayload {
  const oracleParams = getOracleParamsForRelayParams({
    chainId,
    externalCalls,
    feeSwapPath: feeParams.feeSwapPath,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
    marketsInfoData,
  });

  const relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload = {
    oracleParams,
    tokenPermits,
    externalCalls,
    fee: feeParams,
    desChainId: isMultichain ? BigInt(chainId) : undefined,
  };

  return relayParamsPayload;
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
  account: string,
  relayRouterAddress: string
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
