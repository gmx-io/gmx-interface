import { Provider, Signer, Wallet } from "ethers";
import { encodeFunctionData, size, zeroAddress, zeroHash } from "viem";

import { BOTANIX } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { isSourceChain } from "config/multichain";
import type { BridgeOutParams } from "domain/multichain/types";
import {
  ExpressParamsEstimationMethod,
  ExpressTransactionBuilder,
  ExpressTransactionEstimatorParams,
  ExpressTxnParams,
  GasPaymentValidations,
  getGelatoRelayRouterDomain,
  getRawRelayerParams,
  getRelayerFeeParams,
  GlobalExpressParams,
  hashRelayParams,
  RawRelayParamsPayload,
  RelayParamsPayload,
  RelayParamsPayloadWithSignature,
} from "domain/synthetics/express";
import {
  getSubaccountValidations,
  hashSubaccountApproval,
  SignedSubacсountApproval,
  Subaccount,
  SubaccountValidations,
} from "domain/synthetics/subaccount";
import { convertToTokenAmount, SignedTokenPermit, TokenData, TokensAllowanceData, TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { applyFactor, expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { ExpressTxnData } from "lib/transactions/sendExpressTransaction";
import { WalletSigner } from "lib/wallets";
import { signTypedData, SignTypedDataParams } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { AnyChainId, ContractsChainId, SettlementChainId, SourceChainId } from "sdk/configs/chains";
import { ContractName } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import {
  BatchOrderTxnParams,
  CreateOrderPayload,
  getBatchExternalCalls,
  getBatchExternalSwapGasLimit,
  getBatchRequiredActions,
  getBatchTotalExecutionFee,
  getBatchTotalPayCollateralAmount,
  getIsEmptyBatch,
} from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { setUiFeeReceiverIsExpress } from "sdk/utils/twap/uiFeeReceiver";
import { GelatoRelayRouter, MultichainSubaccountRouter, SubaccountGelatoRelayRouter } from "typechain-types";
import { MultichainOrderRouter } from "typechain-types/MultichainOrderRouter";

import { approximateL1GasBuffer, estimateBatchGasLimit, estimateRelayerGasLimit, GasLimitsConfig } from "../fees";
import { getNeedTokenApprove } from "../tokens";

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
  });

  if (!transactionParams) {
    return undefined;
  }

  const expressParams = await estimateExpressParams({
    chainId,
    provider,
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
}: {
  signer: WalletSigner;
  batchParams: BatchOrderTxnParams;
  gasLimits: GasLimitsConfig;
  gasPaymentToken: TokenData;
  isGmxAccount: boolean;
  chainId: ContractsChainId;
  tokensData: TokensData;
}): ExpressTransactionEstimatorParams | undefined {
  const payAmounts = getBatchTotalPayCollateralAmount(batchParams);
  const gasPaymentTokenAsCollateralAmount = getByKey(payAmounts, gasPaymentToken.address) ?? 0n;
  const executionFeeAmount = getBatchTotalExecutionFee({ batchParams, chainId, tokensData });
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
    transactionPayloadGasLimit,
    transactionExternalCalls,
    subaccountActions,
    isValid: !getIsEmptyBatch(batchParams),
    expressTransactionBuilder,
  };
}

export async function estimateExpressParams({
  chainId,
  isGmxAccount,
  provider,
  transactionParams,
  globalExpressParams,
  estimationMethod = "approximate",
  requireValidations = true,
  subaccount: rawSubaccount,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  provider: Provider;
  globalExpressParams: GlobalExpressParams;
  transactionParams: ExpressTransactionEstimatorParams;
  estimationMethod: "approximate" | "estimateGas";
  requireValidations: boolean;
  subaccount: Subaccount | undefined;
}): Promise<ExpressTxnParams | undefined> {
  if (requireValidations && !transactionParams.isValid) {
    return undefined;
  }

  const {
    findFeeSwapPath,
    gasLimits,
    gasPaymentToken,
    relayerFeeToken,
    l1Reference,
    tokenPermits,
    gasPrice,
    isSponsoredCall,
    bufferBps,
    marketsInfoData,
    gasPaymentAllowanceData,
  } = globalExpressParams;

  const {
    expressTransactionBuilder,
    gasPaymentTokenAsCollateralAmount,
    executionFeeAmount,
    transactionPayloadGasLimit,
    transactionExternalCalls,
    subaccountActions,
    account,
  } = transactionParams;

  const subaccountValidations = rawSubaccount
    ? getSubaccountValidations({
        requiredActions: subaccountActions,
        subaccount: rawSubaccount,
        subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, isGmxAccount),
      })
    : undefined;

  const subaccount = subaccountValidations?.isValid ? rawSubaccount : undefined;

  const baseRelayerGasLimit = estimateRelayerGasLimit({
    gasLimits,
    tokenPermitsCount: tokenPermits.length,
    feeSwapsCount: 1,
    feeExternalCallsGasLimit: 0n,
    oraclePriceCount: 2,
    l1GasLimit: l1Reference?.gasLimit ?? 0n,
    transactionPayloadGasLimit,
  });

  const baseRelayerFeeAmount = baseRelayerGasLimit * gasPrice;

  const baseTotalRelayerFeeTokenAmount = baseRelayerFeeAmount + executionFeeAmount;

  const baseRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount: baseRelayerFeeAmount,
    totalRelayerFeeTokenAmount: baseTotalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    transactionExternalCalls,
    feeExternalSwapQuote: undefined,
    findFeeSwapPath,
  });

  if (!baseRelayFeeParams) {
    return undefined;
  }

  const baseRelayParams = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    feeParams: baseRelayFeeParams.feeParams,
    externalCalls: baseRelayFeeParams.externalCalls,
    tokenPermits,
    marketsInfoData,
  });

  const baseTxn = await expressTransactionBuilder({
    relayParams: baseRelayParams,
    gasPaymentParams: baseRelayFeeParams.gasPaymentParams,
    subaccount,
  });

  const l1GasLimit = l1Reference
    ? approximateL1GasBuffer({
        l1Reference,
        sizeOfData: BigInt(size(baseTxn.txnData.callData as `0x${string}`)),
      })
    : 0n;

  let gasLimit: bigint;
  if (estimationMethod === "estimateGas" && provider) {
    const baseGasPaymentValidations = getGasPaymentValidations({
      gasPaymentToken,
      gasPaymentTokenAsCollateralAmount,
      gasPaymentTokenAmount: baseRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
      gasPaymentAllowanceData,
      isGmxAccount,
      tokenPermits,
    });

    if (
      baseGasPaymentValidations.isOutGasTokenBalance ||
      baseGasPaymentValidations.needGasPaymentTokenApproval ||
      !transactionParams.isValid
    ) {
      // In this cases simulation will fail
      return undefined;
    }

    try {
      gasLimit = await estimateGasLimit(provider, {
        from: GMX_SIMULATION_ORIGIN,
        to: baseTxn.txnData.to,
        data: baseTxn.txnData.callData,
        value: 0n,
      });
    } catch (error) {
      const extendedError = extendError(error, {
        data: {
          estimationMethod,
        },
      });

      metrics.pushError(extendedError, "expressOrders.estimateGas");

      return undefined;
    }
  } else {
    gasLimit = estimateRelayerGasLimit({
      gasLimits,
      tokenPermitsCount: tokenPermits.length,
      feeSwapsCount: baseRelayFeeParams.feeParams.feeSwapPath.length,
      feeExternalCallsGasLimit: baseRelayFeeParams.feeExternalSwapGasLimit,
      oraclePriceCount: baseRelayParams.oracleParams.tokens.length,
      l1GasLimit,
      transactionPayloadGasLimit,
    });
  }

  let relayerFeeAmount: bigint;
  if (isSponsoredCall) {
    relayerFeeAmount = applyFactor(gasLimit * gasPrice, gasLimits.gelatoRelayFeeMultiplierFactor);
  } else {
    relayerFeeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, gasLimit, false);
  }

  const buffer = bigMath.mulDiv(relayerFeeAmount, BigInt(bufferBps), BASIS_POINTS_DIVISOR_BIGINT);
  relayerFeeAmount += buffer;

  const totalRelayerFeeTokenAmount = relayerFeeAmount + executionFeeAmount;

  const finalRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount,
    totalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    transactionExternalCalls,
    feeExternalSwapQuote: undefined,
    findFeeSwapPath,
  });

  if (!finalRelayFeeParams) {
    return undefined;
  }

  const finalRelayParams = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    feeParams: finalRelayFeeParams.feeParams,
    externalCalls: finalRelayFeeParams.externalCalls,
    tokenPermits,
    marketsInfoData,
  });

  const gasPaymentValidations = getGasPaymentValidations({
    gasPaymentToken,
    gasPaymentTokenAmount: finalRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
    gasPaymentTokenAsCollateralAmount,
    gasPaymentAllowanceData,
    isGmxAccount,
    tokenPermits,
  });

  if (
    requireValidations &&
    !getIsValidExpressParams({ chainId, gasPaymentValidations, subaccountValidations, isSponsoredCall })
  ) {
    return undefined;
  }

  return {
    chainId,
    subaccount,
    relayParamsPayload: finalRelayParams,
    isSponsoredCall,
    gasPaymentParams: finalRelayFeeParams.gasPaymentParams,
    estimationMethod,
    gasLimit,
    l1GasLimit,
    gasPrice,
    subaccountValidations,
    gasPaymentValidations,
  };
}

export function getIsValidExpressParams({
  chainId,
  gasPaymentValidations,
  subaccountValidations,
  isSponsoredCall,
}: {
  chainId: number;
  isSponsoredCall: boolean;
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations | undefined;
}): boolean {
  if (chainId === BOTANIX && !isSponsoredCall) {
    return false;
  }

  return gasPaymentValidations.isValid && (!subaccountValidations || subaccountValidations.isValid);
}

export function getGasPaymentValidations({
  gasPaymentToken,
  gasPaymentTokenAmount,
  gasPaymentTokenAsCollateralAmount,
  gasPaymentAllowanceData,
  tokenPermits,
  isGmxAccount,
}: {
  gasPaymentToken: TokenData;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAsCollateralAmount: bigint;
  gasPaymentAllowanceData: TokensAllowanceData;
  tokenPermits: SignedTokenPermit[];
  isGmxAccount: boolean;
}): GasPaymentValidations {
  // Add buffer to onchain avoid out of balance errors in case quick of network fee increase
  const gasTokenAmountWithBuffer = (gasPaymentTokenAmount * 13n) / 10n;
  const totalGasPaymentTokenAmount = gasPaymentTokenAsCollateralAmount + gasTokenAmountWithBuffer;

  const tokenBalance = isGmxAccount ? gasPaymentToken.gmxAccountBalance : gasPaymentToken.walletBalance;
  const isOutGasTokenBalance = tokenBalance === undefined || totalGasPaymentTokenAmount > tokenBalance;

  const needGasPaymentTokenApproval = isGmxAccount
    ? false
    : getNeedTokenApprove(gasPaymentAllowanceData, gasPaymentToken?.address, totalGasPaymentTokenAmount, tokenPermits);

  return {
    isOutGasTokenBalance,
    needGasPaymentTokenApproval,
    isValid: !isOutGasTokenBalance && !needGasPaymentTokenApproval,
  };
}

export function getMinResidualGasPaymentTokenAmount({
  payTokenAddress,
  expressParams,
}: {
  payTokenAddress: string | undefined;
  expressParams: ExpressTxnParams | undefined;
}): bigint {
  if (!expressParams || !payTokenAddress) {
    return 0n;
  }

  if (payTokenAddress !== expressParams.gasPaymentParams.gasPaymentTokenAddress) {
    return 0n;
  }

  const { gasPaymentToken, gasPaymentTokenAmount } = expressParams.gasPaymentParams;

  const defaultMinResidualAmount = convertToTokenAmount(
    expandDecimals(5, USD_DECIMALS),
    gasPaymentToken.decimals,
    gasPaymentToken.prices.minPrice
  )!;

  const minResidualAmount = gasPaymentTokenAmount * 2n;

  if (minResidualAmount > defaultMinResidualAmount) {
    return minResidualAmount;
  }

  return defaultMinResidualAmount;
}

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

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, subaccount !== undefined, isGmxAccount);

  const params = {
    account: signer.address,
    messageSigner,
    chainId,
    relayPayload: {
      ...(relayParamsPayload as RelayParamsPayload),
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      userNonce: nowInSeconds(),
    } satisfies RelayParamsPayload,
    subaccountApproval: subaccount?.signedApproval,
    paramsLists: getBatchParamsLists(batchParams),
  };

  let signature: string;
  if (emptySignature) {
    signature = "0x";
  } else {
    const signatureParams = await getBatchSignatureParams({
      signer: params.messageSigner,
      relayParams: params.relayPayload,
      batchParams,
      chainId,
      account: params.account,
      subaccountApproval: params.subaccountApproval,
      relayRouterAddress,
    });

    signature = await signTypedData(signatureParams);
  }

  let batchCalldata: string;
  if (isGmxAccount) {
    const srcChainId = (await getMultichainInfoFromSigner(signer, chainId)) ?? chainId;

    if (!srcChainId) {
      throw new Error("No srcChainId");
    }

    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: abis.MultichainSubaccountRouter,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          } satisfies RelayParamsPayloadWithSignature,
          subaccount.signedApproval,
          params.account,
          BigInt(srcChainId),
          subaccount.signedApproval?.subaccount,
          params.paramsLists,
        ] satisfies Parameters<MultichainSubaccountRouter["batch"]>,
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: abis.MultichainOrderRouter,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          },
          params.account,
          BigInt(srcChainId),
          params.paramsLists,
        ] satisfies Parameters<MultichainOrderRouter["batch"]>,
      });
    }
  } else {
    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: abis.SubaccountGelatoRelayRouter,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          },
          subaccount.signedApproval,
          params.account,
          subaccount.signedApproval?.subaccount,
          params.paramsLists,
        ] satisfies Parameters<SubaccountGelatoRelayRouter["batch"]>,
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: abis.GelatoRelayRouter,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          },
          params.account,
          params.paramsLists,
        ] satisfies Parameters<GelatoRelayRouter["batch"]>,
      });
    }
  }

  return {
    callData: batchCalldata,
    to: relayRouterAddress,
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export async function getBatchSignatureParams({
  signer,
  relayParams,
  batchParams,
  chainId,
  account,
  subaccountApproval,
  relayRouterAddress,
}: {
  account: string;
  subaccountApproval: SignedSubacсountApproval | undefined;
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayload | RelayParamsPayload;
  batchParams: BatchOrderTxnParams;
  chainId: ContractsChainId;
  relayRouterAddress: string;
}): Promise<SignTypedDataParams> {
  const types = {
    Batch: [
      { name: "account", type: "address" },
      { name: "createOrderParamsList", type: "CreateOrderParams[]" },
      { name: "updateOrderParamsList", type: "UpdateOrderParams[]" },
      { name: "cancelOrderKeys", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
      { name: "subaccountApproval", type: "bytes32" },
    ],
    CreateOrderParams: [
      { name: "addresses", type: "CreateOrderAddresses" },
      { name: "numbers", type: "CreateOrderNumbers" },
      { name: "orderType", type: "uint256" },
      { name: "decreasePositionSwapType", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "autoCancel", type: "bool" },
      { name: "referralCode", type: "bytes32" },
      { name: "dataList", type: "bytes32[]" },
    ],
    CreateOrderAddresses: [
      { name: "receiver", type: "address" },
      { name: "cancellationReceiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "initialCollateralToken", type: "address" },
      { name: "swapPath", type: "address[]" },
    ],
    CreateOrderNumbers: [
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "initialCollateralDeltaAmount", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
    ],
    UpdateOrderParams: [
      { name: "key", type: "bytes32" },
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
      { name: "autoCancel", type: "bool" },
      { name: "executionFeeIncrease", type: "uint256" },
    ],
  };

  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, relayRouterAddress);

  const paramsLists = getBatchParamsLists(batchParams);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: hashRelayParams(relayParams as RelayParamsPayload),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : zeroHash,
  };

  return {
    signer,
    types,
    typedData,
    domain,
  };
}

function getBatchParamsLists(batchParams: BatchOrderTxnParams) {
  return {
    createOrderParamsList: batchParams.createOrderParams.map((p) => ({
      addresses: updateExpressOrdersAddresses(p.orderPayload.addresses),
      numbers: p.orderPayload.numbers,
      orderType: p.orderPayload.orderType,
      decreasePositionSwapType: p.orderPayload.decreasePositionSwapType,
      isLong: p.orderPayload.isLong,
      shouldUnwrapNativeToken: p.orderPayload.shouldUnwrapNativeToken,
      autoCancel: p.orderPayload.autoCancel,
      referralCode: p.orderPayload.referralCode,
      dataList: p.orderPayload.dataList,
    })),
    updateOrderParamsList: batchParams.updateOrderParams.map((p) => ({
      key: p.updatePayload.orderKey,
      sizeDeltaUsd: p.updatePayload.sizeDeltaUsd,
      acceptablePrice: p.updatePayload.acceptablePrice,
      triggerPrice: p.updatePayload.triggerPrice,
      minOutputAmount: p.updatePayload.minOutputAmount,
      validFromTime: p.updatePayload.validFromTime,
      autoCancel: p.updatePayload.autoCancel,
      executionFeeIncrease: p.updatePayload.executionFeeTopUp,
    })),
    cancelOrderKeys: batchParams.cancelOrderParams.map((p) => p.orderKey),
  };
}

export async function getMultichainInfoFromSigner(
  signer: Signer,
  chainId: ContractsChainId
): Promise<SourceChainId | undefined> {
  const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as AnyChainId);

  if (!isSourceChain(srcChainId)) {
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
  signer: WalletSigner | undefined;
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
  signer: WalletSigner;
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

export async function buildAndSignSetTraderReferralCodeTxn({
  chainId,
  relayParamsPayload,
  params,
  signer,
  emptySignature = false,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: {
  chainId: SettlementChainId;
  relayParamsPayload: RelayParamsPayload;
  params: BridgeOutParams;
  signer: WalletSigner;
  emptySignature?: boolean;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  if (!srcChainId) {
    throw new Error("No srcChainId");
  }

  const address = signer.address;

  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signBridgeOutPayload({
      relayParams: relayParamsPayload,
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
        ...relayParamsPayload,
        signature,
      },
      address,
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

export async function signSetTraderReferralCode({
  signer,
  relayParams,
  referralCode,
  chainId,
  srcChainId,
}: {
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayload;
  referralCode: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
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

  return signTypedData({ signer, domain, types, typedData });
}

function updateExpressOrdersAddresses(addressess: CreateOrderPayload["addresses"]): CreateOrderPayload["addresses"] {
  return {
    ...addressess,
    uiFeeReceiver: setUiFeeReceiverIsExpress(addressess.uiFeeReceiver, true),
  };
}
