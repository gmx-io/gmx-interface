import { Address, encodeAbiParameters, keccak256 } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getBestSwapStrategy } from "domain/synthetics/externalSwaps/utils";
import type { SignedTokenPermit, TokenData } from "domain/tokens";
import type { SignatureDomain } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { ContractName, getContract } from "sdk/configs/contracts";
import { ExternalSwapQuote, FindSwapPath, SwapAmounts } from "sdk/utils/trade/types";
import {
  combineExternalCalls,
  ExternalCallsPayload,
  getEmptyExternalCallsPayload,
  getExternalCallsPayload,
} from "sdk/utils/orderTransactions";
import { getSwapAmountsByToValue } from "sdk/utils/swap";
import { nowInSeconds } from "sdk/utils/time";

import { getOracleParamsForRelayParams } from "./oracleParamsUtils";
import type { GasPaymentParams, RawRelayParamsPayload, RelayFeePayload, RelayParamsPayload } from "./types";

export function getExpressContractAddress(
  chainId: ContractsChainId,
  {
    isSubaccount,
    isMultichain,
    scope,
  }: {
    isSubaccount?: boolean;
    isMultichain?: boolean;
    scope?: "glv" | "gm" | "transfer" | "claims" | "order" | "subaccount";
  }
): Address {
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

export function getGelatoRelayRouterDomain(
  chainId: SourceChainId | ContractsChainId,
  relayRouterAddress: string
): SignatureDomain {
  const name = "GmxBaseGelatoRelayRouter";

  return {
    name,
    version: "1",
    chainId,
    verifyingContract: relayRouterAddress as Address,
  };
}

export function getRelayerFeeParams({
  chainId,
  account,
  gasPaymentToken,
  relayerFeeToken,
  relayerFeeAmount,
  totalRelayerFeeTokenAmount,
  gasPaymentTokenAsCollateralAmount,
  transactionExternalCalls,
  feeExternalSwapQuote,
  findFeeSwapPath,
}: {
  chainId: ContractsChainId;
  account: string;
  relayerFeeAmount: bigint;
  totalRelayerFeeTokenAmount: bigint;
  relayerFeeToken: TokenData;
  gasPaymentToken: TokenData;
  gasPaymentTokenAsCollateralAmount: bigint;
  findFeeSwapPath: FindSwapPath | undefined;
  feeExternalSwapQuote: ExternalSwapQuote | undefined;
  /**
   * If transaction contains an external calls e.g. for collateral external swaps,
   * it should also be included in relayParams
   */
  transactionExternalCalls: ExternalCallsPayload | undefined;
}):
  | {
      feeParams: RelayFeePayload;
      externalCalls: ExternalCallsPayload;
      feeExternalSwapGasLimit: bigint;
      gasPaymentParams: GasPaymentParams;
    }
  | undefined {
  const gasPaymentParams: GasPaymentParams = {
    gasPaymentToken: gasPaymentToken,
    relayFeeToken: relayerFeeToken,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    relayerFeeAmount,
    totalRelayerFeeTokenAmount,
    gasPaymentTokenAmount: 0n,
    gasPaymentTokenAsCollateralAmount,
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
        swapOptimizationOrder: ["length"],
        uiFeeFactor: 0n,
        marketsInfoData: undefined,
        chainId,
        externalSwapQuoteParams: undefined,
        allowSameTokenSwap: false,
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
  // marketsInfoData,
}: {
  chainId: ContractsChainId;
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  tokenPermits: SignedTokenPermit[];
  // marketsInfoData: MarketsInfoData;
}): RawRelayParamsPayload {
  const oracleParams = getOracleParamsForRelayParams({
    chainId,
    externalCalls,
    feeSwapPath: feeParams.feeSwapPath,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
    // marketsInfoData,
  });

  const relayParamsPayload: RawRelayParamsPayload = {
    oracleParams,
    tokenPermits,
    externalCalls,
    fee: feeParams,
    desChainId: BigInt(chainId),
    userNonce: BigInt(nowInSeconds()),
  };

  return relayParamsPayload;
}

export function hashRelayParams(relayParams: RelayParamsPayload) {
  const encoded = encodeAbiParameters(abis.RelayParams, [
    {
      tokens: relayParams.oracleParams.tokens,
      providers: relayParams.oracleParams.providers,
      data: relayParams.oracleParams.data,
    },
    {
      sendTokens: relayParams.externalCalls.sendTokens,
      sendAmounts: relayParams.externalCalls.sendAmounts,
      externalCallTargets: relayParams.externalCalls.externalCallTargets,
      externalCallDataList: relayParams.externalCalls.externalCallDataList,
      refundTokens: relayParams.externalCalls.refundTokens,
      refundReceivers: relayParams.externalCalls.refundReceivers,
    },
    relayParams.tokenPermits,
    {
      feeToken: relayParams.fee.feeToken,
      feeAmount: relayParams.fee.feeAmount,
      feeSwapPath: relayParams.fee.feeSwapPath,
    },
    relayParams.userNonce,
    relayParams.deadline,
    relayParams.desChainId,
  ]);

  const hash = keccak256(encoded);

  return hash;
}
