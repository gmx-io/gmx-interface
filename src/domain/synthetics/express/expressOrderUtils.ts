import { AbstractSigner, Provider, Signer } from "ethers";
import {
  Address,
  encodeFunctionData,
  recoverTypedDataAddress,
} from "viem";

import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { isSourceChain } from "config/multichain";
import { createProviderRpc } from "lib/rpc/createProviderRpc";
import type { BridgeOutParams } from "domain/multichain/types";
import {
  ExpressParamsEstimationMethod,
  ExpressTransactionBuilder,
  ExpressTransactionEstimatorParams,
  ExpressTxnParams,
  getGelatoRelayRouterDomain,
  GlobalExpressParams,
  hashRelayParams,
  RawRelayParamsPayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import {
  getSubaccountValidations,
  Subaccount,
} from "domain/synthetics/subaccount";
import { hashSubaccountApproval } from "sdk/utils/subaccount";
import { TokenData, TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { ISigner } from "lib/transactions/iSigner";
import {
  type ExpressTxnData,
  estimateExpressParams as sdkEstimateExpressParams,
} from "sdk/utils/express";
import type { IRpc, StateOverrideEntry } from "sdk/utils/rpc";
import { WalletSigner } from "lib/wallets";
import { SignatureDomain, signTypedData, SignTypedDataParams } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { AnyChainId, ContractsChainId, SettlementChainId, SourceChainId } from "sdk/configs/chains";
import { ContractName } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getBatchTypedData, buildBatchOrderCalldata } from "sdk/utils/express";
import {
  BatchOrderTxnParams,
  getBatchExternalCalls,
  getBatchExternalSwapGasLimit,
  getBatchRequiredActions,
  getBatchTotalExecutionFee,
  getBatchTotalPayCollateralAmount,
  getIsEmptyBatch,
} from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import { estimateBatchGasLimit, GasLimitsConfig } from "../fees";

export async function estimateBatchExpressParams({
  signer,
  provider,
  chainId,
  batchParams,
  isGmxAccount,
  globalExpressParams,
  requireValidations,
  estimationMethod = "approximate",
  subaccount,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  signer: WalletSigner;
  provider: Provider;
  batchParams: BatchOrderTxnParams;
  globalExpressParams: GlobalExpressParams | undefined;
  estimationMethod: ExpressParamsEstimationMethod;
  requireValidations: boolean;
  subaccount: Subaccount | undefined;
}): Promise<ExpressTxnParams | undefined> {
  if (!globalExpressParams) {
    return undefined;
  }

  const transactionParams = getBatchExpressEstimatorParams({
    signer,
    batchParams,
    gasLimits: globalExpressParams.gasLimits,
    gasPaymentToken: globalExpressParams.gasPaymentToken,
    chainId,
    tokensData: globalExpressParams.tokensData,
    isGmxAccount,
    estimationMethod,
  });

  if (!transactionParams) {
    return undefined;
  }

  const expressParams = await estimateExpressParams({
    chainId,
    rpc: createProviderRpc(provider),
    transactionParams,
    globalExpressParams,
    estimationMethod,
    requireValidations,
    isGmxAccount,
    subaccount,
  });

  return expressParams;
}

function getBatchExpressEstimatorParams({
  signer,
  batchParams,
  gasLimits,
  gasPaymentToken,
  chainId,
  tokensData,
  isGmxAccount,
  estimationMethod,
}: {
  signer: WalletSigner;
  batchParams: BatchOrderTxnParams;
  gasLimits: GasLimitsConfig;
  gasPaymentToken: TokenData;
  isGmxAccount: boolean;
  chainId: ContractsChainId;
  tokensData: TokensData;
  estimationMethod?: ExpressParamsEstimationMethod;
}): ExpressTransactionEstimatorParams | undefined {
  const payAmounts = getBatchTotalPayCollateralAmount(batchParams);
  const gasPaymentTokenAsCollateralAmount = getByKey(payAmounts, gasPaymentToken.address) ?? 0n;
  const executionFeeAmount = getBatchTotalExecutionFee({
    batchParams,
    chainId,
    tokensData,
    allowEmptyBatch: estimationMethod === "approximate",
  });
  const transactionExternalCalls = getBatchExternalCalls(batchParams);
  const subaccountActions = getBatchRequiredActions(batchParams);
  const transactionPayloadGasLimit = estimateBatchGasLimit({
    gasLimits,
    createOrdersCount: batchParams.createOrderParams.length,
    updateOrdersCount: batchParams.updateOrderParams.length,
    cancelOrdersCount: batchParams.cancelOrderParams.length,
    externalCallsGasLimit: getBatchExternalSwapGasLimit(batchParams),
    isGmxAccount,
  });

  if (!executionFeeAmount) {
    return undefined;
  }

  const expressTransactionBuilder: ExpressTransactionBuilder = async ({
    relayParams,
    gasPaymentParams,
    subaccount,
  }) => {
    return {
      txnData: await buildAndSignExpressBatchOrderTxn({
        chainId,
        batchParams,
        relayParamsPayload: relayParams,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        subaccount,
        signer,
        emptySignature: true,
        isGmxAccount,
      }),
    };
  };

  return {
    account: signer.address,
    gasPaymentTokenAsCollateralAmount,
    executionFeeAmount: executionFeeAmount.feeTokenAmount,
    executionGasLimit: executionFeeAmount.gasLimit,
    transactionPayloadGasLimit,
    transactionExternalCalls,
    subaccountActions,
    isValid: !getIsEmptyBatch(batchParams),
    expressTransactionBuilder,
  };
}

export { ExpressEstimationError, ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

export async function estimateExpressParams({
  chainId,
  isGmxAccount,
  transactionParams,
  globalExpressParams,
  estimationMethod = "approximate",
  requireValidations = true,
  subaccount,
  throwOnInvalid = false,
  rpc,
  stateOverride,
  overrideGasLimit,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  globalExpressParams: GlobalExpressParams;
  transactionParams: ExpressTransactionEstimatorParams;
  overrideGasLimit?: bigint;
  estimationMethod: ExpressParamsEstimationMethod;
  requireValidations: boolean;
  subaccount: Subaccount | undefined;
  throwOnInvalid?: boolean;
  rpc?: IRpc;
  stateOverride?: StateOverrideEntry[];
}): Promise<ExpressTxnParams | undefined> {
  return sdkEstimateExpressParams({
    chainId,
    isGmxAccount,
    transactionParams,
    globalExpressParams,
    estimationMethod,
    requireValidations,
    subaccount,
    throwOnInvalid,
    overrideGasLimit,
    rpc,
    simulationOrigin: GMX_SIMULATION_ORIGIN,
    stateOverride,
    gasPaymentAllowanceData: globalExpressParams.gasPaymentAllowanceData,
    getSubaccountValidations,
    metrics,
  });
}



export { getGasPaymentValidations, getIsValidExpressParams } from "sdk/utils/express";

export async function buildAndSignExpressBatchOrderTxn({
  chainId,
  batchParams,
  relayParamsPayload,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  subaccount,
  signer,
  isGmxAccount,
  emptySignature = false,
}: {
  signer: WalletSigner;
  chainId: ContractsChainId;
  batchParams: BatchOrderTxnParams;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  relayParamsPayload: RawRelayParamsPayload;
  isGmxAccount: boolean;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const messageSigner = subaccount ? subaccount!.signer : signer;
  const srcChainId = isGmxAccount ? await getMultichainInfoFromSigner(signer, chainId) : undefined;
  const relayRouterAddress = getOrderRelayRouterAddress(chainId, subaccount !== undefined, isGmxAccount);

  const relayPayload: RelayParamsPayload = {
    ...(relayParamsPayload as RelayParamsPayload),
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    userNonce: BigInt(nowInSeconds()),
  };

  let signature: string;
  if (emptySignature) {
    signature = "0x";
  } else {
    const typedData = getBatchTypedData({
      chainId,
      signingChainId: srcChainId ?? chainId,
      batchParams,
      relayParams: relayPayload,
      account: signer.address,
      subaccountApprovalHash: subaccount?.signedApproval
        ? hashSubaccountApproval(subaccount.signedApproval)
        : undefined,
      relayRouterAddress,
    });

    const signatureParams: SignTypedDataParams = {
      signer: messageSigner,
      types: typedData.types,
      typedData: typedData.message,
      domain: typedData.domain,
      shouldUseSignerMethod: subaccount !== undefined,
    };

    signature = await signTypedData(signatureParams);

    validateSignature({
      signatureParams,
      signature,
      expectedAccount: messageSigner.address,
      errorSource: "expressOrders.batch.signatureValidation",
      silent: true,
    });
  }

  const result = buildBatchOrderCalldata({
    chainId,
    batchParams,
    relayParamsPayload: relayPayload,
    signature,
    account: signer.address,
    srcChainId: srcChainId ?? undefined,
    subaccountApproval: subaccount?.signedApproval,
    isGmxAccount,
    deadline: relayPayload.deadline,
  });

  return {
    callData: result.callData,
    to: result.to,
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}


export async function getMultichainInfoFromSigner(
  signer: Signer,
  chainId: ContractsChainId
): Promise<SourceChainId | undefined> {
  const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as AnyChainId);

  if (!isSourceChain(srcChainId, chainId)) {
    return undefined;
  }

  const isMultichain = srcChainId !== (chainId as SourceChainId);

  if (!isMultichain) {
    return undefined;
  }

  return srcChainId;
}

export function getOrderRelayRouterAddress(
  chainId: ContractsChainId,
  isSubaccount: boolean,
  isMultichain: boolean
): string {
  let contractName: ContractName;
  if (isMultichain) {
    if (isSubaccount) {
      contractName = "MultichainSubaccountRouter";
    } else {
      contractName = "MultichainOrderRouter";
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

// TODO MLTCH: move to bridge out utils
export async function buildAndSignBridgeOutTxn({
  chainId,
  srcChainId,
  relayParamsPayload,
  params,
  signer,
  account,
  emptySignature = false,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  relayParamsPayload: RawRelayParamsPayload;
  params: BridgeOutParams;
  signer: WalletSigner | ISigner | undefined;
  account: string;
  emptySignature?: boolean;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
}): Promise<ExpressTxnData> {
  let signature: string;

  const relayParams: RelayParamsPayload = {
    ...relayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  if (emptySignature) {
    signature = "0x";
  } else {
    if (!signer) {
      throw new Error("Signer is required");
    }

    signature = await signBridgeOutPayload({
      relayParams,
      params,
      signer,
      chainId,
      srcChainId,
    });
  }

  const bridgeOutCallData = encodeFunctionData({
    abi: abis.MultichainTransferRouter,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      BigInt(srcChainId),
      params,
    ],
  });

  return {
    callData: bridgeOutCallData,
    to: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: WalletSigner | ISigner;
  relayParams: RelayParamsPayload;
  params: BridgeOutParams;
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
}): Promise<string> {
  const types = {
    BridgeOut: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "provider", type: "address" },
      { name: "data", type: "bytes" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const typedData = {
    token: params.token,
    amount: params.amount,
    minAmountOut: params.minAmountOut,
    provider: params.provider,
    data: params.data,
    relayParams: hashRelayParams(relayParams),
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainTransferRouter"));

  return signTypedData({ signer, domain, types, typedData });
}

export async function signSetTraderReferralCode({
  signer,
  relayParams,
  referralCode,
  chainId,
  srcChainId,
  shouldUseSignerMethod,
}: {
  signer: AbstractSigner | ISigner;
  relayParams: RelayParamsPayload;
  referralCode: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  shouldUseSignerMethod?: boolean;
}) {
  const types = {
    SetTraderReferralCode: [
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    referralCode: referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData, shouldUseSignerMethod });
}

export async function signRegisterCode({
  signer,
  relayParams,
  referralCode,
  chainId,
  srcChainId,
  shouldUseSignerMethod,
}: {
  signer: AbstractSigner | ISigner;
  relayParams: RelayParamsPayload;
  referralCode: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  shouldUseSignerMethod?: boolean;
}) {
  const types = {
    RegisterCode: [
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    referralCode: referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData, shouldUseSignerMethod });
}

async function validateSignature({
  signatureParams,
  signature,
  expectedAccount,
  silent = false,
  errorSource = "validateSignature",
}: {
  signatureParams: {
    domain: SignatureDomain;
    types: Record<string, any>;
    typedData: Record<string, any>;
  };
  signature: string;
  expectedAccount: string;
  silent?: boolean;
  errorSource?: string;
}) {
  try {
    // Validate the signature
    const recoveredAddress = await recoverTypedDataAddress({
      domain: {
        ...signatureParams.domain,
        verifyingContract: signatureParams.domain.verifyingContract as Address,
      },
      types: signatureParams.types,
      primaryType: "Batch",
      message: signatureParams.typedData,
      signature: signature as `0x${string}`,
    });

    const isValid = recoveredAddress.toLowerCase() === expectedAccount.toLowerCase();

    if (!isValid) {
      throw extendError(new Error("Signature validation failed"), {
        data: {
          recoveredAddress,
          expectedAccount,
          signature,
        },
      });
    }
  } catch (error) {
    metrics.pushError(error, errorSource);

    if (silent) {
      return;
    }

    throw extendError(error, {
      data: {
        signature,
        expectedAccount,
      },
    });
  }
}
