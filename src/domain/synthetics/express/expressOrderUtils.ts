import { Provider, Wallet } from "ethers";
import { encodeFunctionData, size, zeroAddress, zeroHash } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import {
  ExpressParamsEstimationMethod,
  ExpressTxnParams,
  GasPaymentValidations,
  getGelatoRelayRouterDomain,
  getOracleParamsPayload,
  getOraclePriceParamsForRelayFee,
  getRelayerFeeParams,
  getRelayRouterNonceForSigner,
  GlobalExpressParams,
  hashRelayParams,
  RelayerFeeParams,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import {
  getSubaccountValidations,
  hashSubaccountApproval,
  SignedSubbacountApproval,
  Subaccount,
  SubaccountValidations,
} from "domain/synthetics/subaccount";
import { SignedTokenPermit, TokensAllowanceData, TokensData } from "domain/tokens";
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

import { approximateExpressBatchOrderRelayGasLimit, estimateBatchMinGasPaymentTokenAmount } from "../fees";
import { getNeedTokenApprove } from "../tokens";
import { getSwapAmountsByToValue } from "../trade";

export async function estimateExpressParams({
  signer,
  provider,
  chainId,
  batchParams,
  globalExpressParams,
  requireValidations,
  estimationMethod = "approximate",
}: {
  chainId: number;
  batchParams: BatchOrderTxnParams;
  signer: WalletSigner;
  provider: Provider | undefined;
  globalExpressParams: GlobalExpressParams | undefined;
  requireValidations: boolean;
  estimationMethod: ExpressParamsEstimationMethod;
}): Promise<ExpressTxnParams | undefined> {
  if (!globalExpressParams) {
    return undefined;
  }

  const {
    tokensData,
    marketsInfoData,
    subaccount: rawSubaccount,
    tokenPermits,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
    findSwapPath,
    gasPaymentAllowanceData,
    gasPrice,
    gasLimits,
    l1Reference,
    bufferBps,
    isSponsoredCall,
    noncesData,
  } = globalExpressParams;

  const account = signer.address;
  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const relayerFeeToken = getByKey(tokensData, relayerFeeTokenAddress);
  const batchExternalCalls = getBatchExternalCalls(batchParams);
  const totalBatchExternalSwapGasLimit = getBatchExternalSwapGasLimit(batchParams);

  const requiredActions = getBatchRequiredActions(batchParams);

  const subaccountValidations = rawSubaccount
    ? getSubaccountValidations({
        requiredActions,
        subaccount: rawSubaccount,
      })
    : undefined;

  const subaccount = subaccountValidations?.isValid ? rawSubaccount : undefined;

  if (!gasPaymentToken || !relayerFeeToken) {
    return undefined;
  }

  const batchExecutionFee = getBatchTotalExecutionFee({ batchParams, chainId, tokensData });
  const batchExecutionFeeAmount = batchExecutionFee?.feeTokenAmount ?? 0n;

  const baseRelayerFeeAmount = estimateBatchMinGasPaymentTokenAmount({
    chainId,
    gasPaymentToken: relayerFeeToken,
    relayFeeToken: relayerFeeToken,
    gasPrice,
    gasLimits,
    l1Reference,
    tokensData,
    executionFeeAmount: batchExecutionFeeAmount,
    createOrdersCount: batchParams.createOrderParams.length,
    updateOrdersCount: batchParams.updateOrderParams.length,
    cancelOrdersCount: batchParams.cancelOrderParams.length,
  });

  const baseNetworkFee = baseRelayerFeeAmount + batchExecutionFeeAmount;

  const swapAmounts = getSwapAmountsByToValue({
    tokenIn: gasPaymentToken,
    tokenOut: relayerFeeToken,
    amountOut: baseNetworkFee,
    isLimit: false,
    findSwapPath,
    uiFeeFactor: 0n,
  });

  const baseRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    relayerFeeTokenAmount: baseRelayerFeeAmount,
    totalNetworkFeeAmount: baseNetworkFee,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentTokenAddress: gasPaymentToken.address,
    internalSwapAmounts: swapAmounts,
    batchExternalCalls,
    feeExternalSwapQuote: undefined,
    relayerGasLimit: 0n,
    l1GasLimit: 0n,
    tokensData,
    gasPrice,
    gasPaymentAllowanceData,
    forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    tokenPermits,
  });

  if (!baseRelayFeeParams) {
    return undefined;
  }

  const baseExpressParams = await getBatchOrderExpressParams({
    chainId,
    batchParams,
    signer,
    subaccount,
    tokenPermits,
    tokensData,
    marketsInfoData,
    relayFeeParams: baseRelayFeeParams,
    noncesData,
    emptySignature: true,
  });

  const hasL1Gas = chainId === ARBITRUM;

  if (!baseRelayFeeParams || (hasL1Gas && !l1Reference)) {
    return undefined;
  }

  let gasLimit: bigint;
  let l1GasLimit = 0n;

  if (estimationMethod === "estimateGas" && provider) {
    const baseGasPaymentValidations = getGasPaymentValidations({
      batchParams,
      tokenPermits,
      tokensData,
      relayFeeParams: baseRelayFeeParams,
      gasPaymentAllowanceData,
    });
    // In this cases simulation will fail
    if (
      baseGasPaymentValidations.isOutGasTokenBalance ||
      baseGasPaymentValidations.needGasPaymentTokenApproval ||
      baseRelayFeeParams.noFeeSwap ||
      getIsEmptyBatch(batchParams)
    ) {
      return undefined;
    }

    try {
      gasLimit = await estimateGasLimit(provider, {
        from: GMX_SIMULATION_ORIGIN,
        to: baseExpressParams.txnData.to,
        data: baseExpressParams.txnData.callData,
        value: 0n,
      });
    } catch (error) {
      const extendedError = extendError(error, {
        data: {
          estimationMethod,
        },
      });

      metrics.pushError(extendedError, "expressOrders.estimateGas");

      // eslint-disable-next-line no-console
      console.error(extendedError);

      return undefined;
    }
  } else {
    const approximationResult = approximateExpressBatchOrderRelayGasLimit({
      gasLimits,
      createOrdersCount: batchParams.createOrderParams.length,
      updateOrdersCount: batchParams.updateOrderParams.length,
      cancelOrdersCount: batchParams.cancelOrderParams.length,
      feeSwapsCount: baseRelayFeeParams.feeParams.feeSwapPath.length,
      externalSwapGasLimit: totalBatchExternalSwapGasLimit,
      tokenPermitsCount: tokenPermits.length,
      oraclePriceCount: baseExpressParams.oracleParamsPayload.tokens.length,
      sizeOfData: BigInt(size(baseExpressParams.txnData.callData as `0x${string}`)),
      l1Reference,
    });

    gasLimit = approximationResult.gasLimit;
    l1GasLimit = approximationResult.l1GasLimit;
  }

  let feeAmount: bigint;
  if (isSponsoredCall) {
    feeAmount = applyFactor(gasLimit * gasPrice, gasLimits.gelatoRelayFeeMultiplierFactor);
  } else {
    feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, gasLimit, false);
  }

  const buffer = bigMath.mulDiv(feeAmount, BigInt(bufferBps), BASIS_POINTS_DIVISOR_BIGINT);
  feeAmount += buffer;

  const totalNetworkFeeAmount = feeAmount + batchExecutionFeeAmount;

  const finalSwapAmounts = getSwapAmountsByToValue({
    tokenIn: gasPaymentToken,
    tokenOut: relayerFeeToken,
    amountOut: totalNetworkFeeAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor: 0n,
  });

  const finalRelayFeeParams = getRelayerFeeParams({
    chainId,
    account,
    relayerFeeTokenAmount: feeAmount,
    relayerGasLimit: gasLimit,
    l1GasLimit,
    gasPrice,
    totalNetworkFeeAmount: totalNetworkFeeAmount,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentTokenAddress: gasPaymentToken.address,
    internalSwapAmounts: finalSwapAmounts,
    batchExternalCalls: getBatchExternalCalls(batchParams),
    feeExternalSwapQuote: undefined,
    tokensData,
    gasPaymentAllowanceData,
    forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    tokenPermits,
  });

  if (!finalRelayFeeParams) {
    return undefined;
  }

  const { relayParamsPayload } = await getBatchOrderExpressParams({
    chainId,
    batchParams,
    signer,
    subaccount,
    tokenPermits,
    tokensData,
    marketsInfoData,
    relayFeeParams: finalRelayFeeParams,
    noncesData,
    emptySignature: true,
  });

  const gasPaymentValidations = getGasPaymentValidations({
    batchParams,
    relayFeeParams: finalRelayFeeParams,
    tokenPermits,
    gasPaymentAllowanceData,
    tokensData,
  });

  if (requireValidations && !getIsValidExpressParams({ gasPaymentValidations, subaccountValidations })) {
    return undefined;
  }

  return {
    subaccount,
    relayParamsPayload,
    relayFeeParams: finalRelayFeeParams,
    isSponsoredCall,
    estimationMethod,
    gasPaymentValidations,
    subaccountValidations,
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
  tokensData,
  batchParams,
  gasPaymentAllowanceData,
  relayFeeParams,
  tokenPermits,
}: {
  tokensData: TokensData;
  gasPaymentAllowanceData: TokensAllowanceData;
  relayFeeParams: RelayerFeeParams;
  batchParams: BatchOrderTxnParams;
  tokenPermits: SignedTokenPermit[];
}): GasPaymentValidations {
  const gasPaymentToken = getByKey(tokensData, relayFeeParams.gasPaymentTokenAddress);
  const gasPaymentTokenAmount = relayFeeParams.gasPaymentTokenAmount;

  const totalPayAmounts = getBatchTotalPayCollateralAmount(batchParams);
  const gasPaymentTokenCollateralAmount = getByKey(totalPayAmounts, gasPaymentToken?.address) ?? 0n;

  const totalGasPaymentTokenAmount = gasPaymentTokenCollateralAmount + gasPaymentTokenAmount;

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

export async function getBatchOrderExpressParams({
  chainId,
  relayFeeParams,
  batchParams,
  signer,
  subaccount,
  tokenPermits,
  tokensData,
  marketsInfoData,
  noncesData,
  emptySignature = false,
}: {
  chainId: number;
  signer: WalletSigner;
  relayFeeParams: RelayerFeeParams;
  batchParams: BatchOrderTxnParams;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[];
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  emptySignature?: boolean;
}) {
  const oracleParamsPayload = getOracleParamsPayload([
    ...getOraclePriceParamsForRelayFee({
      chainId,
      relayFeeParams,
      tokensData,
      marketsInfoData,
    }),
  ]);

  const relayParamsPayload: RelayParamsPayload = {
    oracleParams: oracleParamsPayload,
    tokenPermits,
    externalCalls: relayFeeParams.externalCalls,
    fee: relayFeeParams.feeParams,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    userNonce: 0n,
  };

  const txnData = await buildAndSignExpressBatchOrderTxn({
    signer,
    chainId,
    relayFeeParams,
    relayParamsPayload,
    batchParams: batchParams,
    subaccount,
    emptySignature,
    noncesData,
  });

  return {
    txnData,
    oracleParamsPayload,
    relayParamsPayload,
  };
}

export async function buildAndSignExpressBatchOrderTxn({
  chainId,
  relayFeeParams,
  relayParamsPayload,
  batchParams,
  subaccount,
  signer,
  noncesData,
  emptySignature = false,
}: {
  signer: WalletSigner;
  chainId: number;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayerFeeParams;
  relayParamsPayload: RelayParamsPayload;
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
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
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
