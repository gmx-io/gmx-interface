import { Contract, ethers, Provider, Wallet } from "ethers";
import { encodeAbiParameters, keccak256 } from "viem";

import { getBestSwapStrategy } from "domain/synthetics/externalSwaps/utils";
import { SignedTokenPermit, TokenData } from "domain/tokens";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { getContract } from "sdk/configs/contracts";
import { MarketsInfoData } from "sdk/types/markets";
import { ExternalSwapQuote, FindSwapPath, SwapAmounts } from "sdk/types/trade";
import {
  combineExternalCalls,
  ExternalCallsPayload,
  getEmptyExternalCallsPayload,
  getExternalCallsPayload,
} from "sdk/utils/orderTransactions";
import { getSwapAmountsByToValue } from "sdk/utils/swap";

import { getOracleParamsForRelayParams } from "./oracleParamsUtils";
import { GasPaymentParams, RawRelayParamsPayload, RelayFeePayload, RelayParamsPayload } from "./types";

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
  chainId: number;
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
}: {
  chainId: number;
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  tokenPermits: SignedTokenPermit[];
  marketsInfoData: MarketsInfoData;
}) {
  const oracleParams = getOracleParamsForRelayParams({
    chainId,
    externalCalls,
    feeSwapPath: feeParams.feeSwapPath,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
    marketsInfoData,
  });

  const relayParamsPayload: RawRelayParamsPayload = {
    oracleParams,
    tokenPermits,
    externalCalls,
    fee: feeParams,
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

export async function getRelayRouterNonceForSigner(
  chainId: number,
  signer: WalletSigner | Wallet,
  isSubaccount: boolean
): Promise<bigint> {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount });
  const contract = new ethers.Contract(contractAddress, abis.GelatoRelayRouter, signer);

  return contract.userNonces(signer.address);
}
