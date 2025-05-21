import { Provider, Wallet } from "ethers";
import { encodeFunctionData, size, zeroAddress, zeroHash } from "viem";

import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import {
  EstimatedExpressTransactionParams,
  ExpressParamsEstimationMethod,
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentValidations,
  getGelatoRelayRouterDomain,
  getRawRelayerParams,
  getRelayerFeeParams,
  getRelayRouterNonceForSigner,
  GlobalExpressParams,
  hashRelayParams,
  RawRelayParamsPayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import {
  getSubaccountValidations,
  hashSubaccountApproval,
  SignedSubbacountApproval,
  Subaccount,
  SubaccountValidations,
} from "domain/synthetics/subaccount";
import { SignedTokenPermit, TokenData, TokensAllowanceData, TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { applyFactor } from "lib/numbers";
import { getByKey } from "lib/objects";
import { ExpressTxnData } from "lib/transactions/sendExpressTransaction";
import { WalletSigner } from "lib/wallets";
import { signTypedData, SignTypedDataParams } from "lib/wallets/signing";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
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

import { approximateL1GasBuffer, estimateBatchGasLimit, estimateRelayerGasLimit, GasLimitsConfig } from "../fees";
import { getNeedTokenApprove } from "../tokens";

export async function estimateBatchExpressParams({
  signer,
  provider,
  chainId,
  batchParams,
  globalExpressParams,
  requireValidations,
  estimationMethod = "approximate",
}: {
  chainId: number;
  signer: WalletSigner;
  provider: Provider | undefined;
  batchParams: BatchOrderTxnParams;
  globalExpressParams: GlobalExpressParams | undefined;
  estimationMethod: ExpressParamsEstimationMethod;
  requireValidations: boolean;
}): Promise<ExpressTxnParams | undefined> {
  if (!globalExpressParams) {
    return undefined;
  }

  const transactionParams = getBatchExpressEstimatedParams({
    signer,
    batchParams,
    gasLimits: globalExpressParams.gasLimits,
    gasPaymentToken: globalExpressParams.gasPaymentToken,
    chainId,
    tokensData: globalExpressParams.tokensData,
  });

  if (!transactionParams) {
    return undefined;
  }

  const expressParams = await approximateRelayerFee({
    chainId,
    provider,
    transactionParams,
    globalExpressParams,
    estimationMethod,
    requireValidations,
  });

  return expressParams;
}

export function getBatchExpressEstimatedParams({
  signer,
  batchParams,
  gasLimits,
  gasPaymentToken,
  chainId,
  tokensData,
}: {
  signer: WalletSigner;
  batchParams: BatchOrderTxnParams;
  gasLimits: GasLimitsConfig;
  gasPaymentToken: TokenData;
  chainId: number;
  tokensData: TokensData;
}): EstimatedExpressTransactionParams | undefined {
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
  });

  if (!executionFeeAmount) {
    return undefined;
  }

  const expressTransactionBuilder: ExpressTransactionBuilder = async ({
    relayParams,
    gasPaymentParams,
    subaccount,
    noncesData,
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
        noncesData,
        emptySignature: true,
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

export async function approximateRelayerFee({
  chainId,
  provider,
  transactionParams,
  globalExpressParams,
  estimationMethod = "approximate",
  requireValidations = true,
}: {
  chainId: number;
  provider: Provider | undefined;
  globalExpressParams: GlobalExpressParams;
  transactionParams: EstimatedExpressTransactionParams;
  estimationMethod: "approximate" | "estimateGas";
  requireValidations: boolean;
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
    noncesData,
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

  const subaccountValidations = globalExpressParams.subaccount
    ? getSubaccountValidations({
        requiredActions: subaccountActions,
        subaccount: globalExpressParams.subaccount,
      })
    : undefined;

  const subaccount = subaccountValidations?.isValid ? globalExpressParams.subaccount : undefined;

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
    noncesData,
  });

  const l1GasLimit = l1Reference
    ? approximateL1GasBuffer({
        l1Reference,
        sizeOfData: BigInt(size(baseTxn.txnData.callData as `0x${string}`)),
        gasPrice,
      })
    : 0n;

  let gasLimit: bigint;
  if (estimationMethod === "estimateGas" && provider) {
    const baseGasPaymentValidations = getGasPaymentValidations({
      gasPaymentToken,
      gasPaymentTokenAsCollateralAmount,
      gasPaymentTokenAmount: baseRelayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
      gasPaymentAllowanceData,
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
    tokenPermits,
  });

  if (requireValidations && !getIsValidExpressParams({ gasPaymentValidations, subaccountValidations })) {
    return undefined;
  }

  return {
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
  gasPaymentValidations,
  subaccountValidations,
}: {
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations | undefined;
}): boolean {
  return gasPaymentValidations.isValid && (!subaccountValidations || subaccountValidations.isValid);
}

export function getGasPaymentValidations({
  gasPaymentToken,
  gasPaymentTokenAmount,
  gasPaymentTokenAsCollateralAmount,
  gasPaymentAllowanceData,
  tokenPermits,
}: {
  gasPaymentToken: TokenData;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAsCollateralAmount: bigint;
  gasPaymentAllowanceData: TokensAllowanceData;
  tokenPermits: SignedTokenPermit[];
}): GasPaymentValidations {
  const totalGasPaymentTokenAmount = gasPaymentTokenAsCollateralAmount + gasPaymentTokenAmount;

  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || totalGasPaymentTokenAmount > gasPaymentToken.balance;

  const needGasPaymentTokenApproval = getNeedTokenApprove(
    gasPaymentAllowanceData,
    gasPaymentToken?.address,
    totalGasPaymentTokenAmount,
    tokenPermits
  );

  return {
    isOutGasTokenBalance,
    needGasPaymentTokenApproval,
    isValid: !isOutGasTokenBalance && !needGasPaymentTokenApproval,
  };
}

export async function buildAndSignExpressBatchOrderTxn({
  chainId,
  batchParams,
  relayParamsPayload,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  subaccount,
  signer,
  noncesData,
  emptySignature = false,
}: {
  signer: WalletSigner;
  chainId: number;
  batchParams: BatchOrderTxnParams;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  relayParamsPayload: RawRelayParamsPayload;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const messageSigner = subaccount ? subaccount!.signer : signer;

  const cachedNonce = subaccount ? noncesData?.subaccountRelayRouter?.nonce : noncesData?.relayRouter?.nonce;

  let userNonce: bigint;
  if (cachedNonce === undefined) {
    userNonce = await getRelayRouterNonceForSigner(chainId, messageSigner, subaccount?.signedApproval !== undefined);
  } else {
    userNonce = cachedNonce;
  }

  const params = {
    account: signer.address,
    messageSigner,
    chainId,
    relayPayload: {
      ...relayParamsPayload,
      userNonce,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    },
    paramsLists: getBatchParamsLists(batchParams),
    subaccountApproval: subaccount?.signedApproval,
  };

  const signature = emptySignature
    ? "0x"
    : await signTypedData(
        getBatchSignatureParams({
          signer: params.messageSigner,
          relayParams: params.relayPayload,
          batchParams,
          chainId,
          account: params.account,
          subaccountApproval: params.subaccountApproval,
        })
      );

  const batchCalldata =
    params.subaccountApproval !== undefined
      ? encodeFunctionData({
          abi: SubaccountGelatoRelayRouterAbi.abi,
          functionName: "batch",
          args: [
            { ...params.relayPayload, signature },
            params.subaccountApproval,
            params.account,
            params.subaccountApproval.subaccount,
            params.paramsLists,
          ],
        })
      : encodeFunctionData({
          abi: GelatoRelayRouterAbi.abi,
          functionName: "batch",
          args: [{ ...params.relayPayload, signature }, params.account, params.paramsLists],
        });

  const relayRouterAddress = getContract(
    chainId,
    params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

  return {
    callData: batchCalldata,
    to: relayRouterAddress,
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export function getBatchSignatureParams({
  signer,
  relayParams,
  batchParams,
  chainId,
  account,
  subaccountApproval,
}: {
  account: string;
  subaccountApproval: SignedSubbacountApproval | undefined;
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayload;
  batchParams: BatchOrderTxnParams;
  chainId: number;
}): SignTypedDataParams {
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

  const domain = getGelatoRelayRouterDomain(chainId, subaccountApproval !== undefined);

  const paramsLists = getBatchParamsLists(batchParams);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: hashRelayParams(relayParams),
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
      addresses: p.orderPayload.addresses,
      numbers: p.orderPayload.numbers,
      orderType: p.orderPayload.orderType,
      decreasePositionSwapType: p.orderPayload.decreasePositionSwapType,
      isLong: p.orderPayload.isLong,
      shouldUnwrapNativeToken: p.orderPayload.shouldUnwrapNativeToken,
      autoCancel: p.orderPayload.autoCancel,
      referralCode: p.orderPayload.referralCode,
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
