import { Provider, Signer, Wallet } from "ethers";
import { Address, encodeFunctionData, Hex, PublicClient, size, zeroAddress, zeroHash } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import {
  ExpressParamsEstimationMethod,
  ExpressTxnParams,
  getGelatoRelayRouterDomain,
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
  getRelayerFeeParams,
  getRelayRouterNonceForMultichain,
  getRelayRouterNonceForSigner,
  GlobalExpressParams,
  hashRelayParams,
  hashRelayParamsMultichain,
  MultichainRelayParamsPayload,
  RelayerFeeParams,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import {
  getIsInvalidSubaccount,
  hashSubaccountApproval,
  SignedSubbacountApproval,
  Subaccount,
} from "domain/synthetics/subaccount";
import { SignedTokenPermit, TokensData } from "domain/tokens";
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
import { UiContractsChain, UiSettlementChain, UiSourceChain, UiSupportedChain } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import {
  BatchOrderTxnParams,
  getBatchExternalCalls,
  getBatchExternalSwapGasLimit,
  getBatchIsNativePayment,
  getBatchRequiredActions,
  getBatchTotalExecutionFee,
  getIsEmptyBatch,
} from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { IRelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
import { multichainOrderRouterAbi, multichainSubaccountRouterAbi, multichainTransferRouterAbi } from "wagmi-generated";

import { approximateExpressBatchOrderGasLimit, estimateMinGasPaymentTokenBalance } from "../fees";
import { getSwapAmountsByToValue } from "../trade";

export async function estimateExpressParams({
  signer,
  settlementChainClient,
  provider,
  chainId,
  batchParams,
  totalExecutionFee,
  globalExpressParams,
  requireGasPaymentTokenApproval,
  estimationMethod = "approximate",
}: {
  chainId: UiContractsChain;
  settlementChainClient: PublicClient | undefined;
  batchParams: BatchOrderTxnParams;
  // TODO try to avoid this
  totalExecutionFee?: bigint;
  signer: WalletSigner;
  provider: Provider | undefined;
  globalExpressParams: GlobalExpressParams;
  requireGasPaymentTokenApproval: boolean;
  estimationMethod: ExpressParamsEstimationMethod;
}): Promise<ExpressTxnParams | undefined> {
  try {
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

    const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

    const account = signer.address;
    const isNativePayment = getBatchIsNativePayment(batchParams);
    const isEmptyBatch = getIsEmptyBatch(batchParams);
    const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
    const relayerFeeToken = getByKey(tokensData, relayerFeeTokenAddress);
    const batchExternalCalls = getBatchExternalCalls(batchParams);
    const totalBatchExternalSwapGasLimit = getBatchExternalSwapGasLimit(batchParams);

    const requiredActions = getBatchRequiredActions(batchParams);

    const subaccount =
      rawSubaccount && !getIsInvalidSubaccount(rawSubaccount, requiredActions) ? rawSubaccount : undefined;

    if (!gasPaymentToken || !relayerFeeToken || isNativePayment || isEmptyBatch) {
      return undefined;
    }

    if (totalExecutionFee === undefined) {
      totalExecutionFee = getBatchTotalExecutionFee({ batchParams, chainId, tokensData })?.feeTokenAmount;
    }

    if (totalExecutionFee === undefined) {
      return undefined;
    }

    const baseRelayerFeeAmount = estimateMinGasPaymentTokenBalance({
      chainId,
      gasPaymentToken: relayerFeeToken,
      relayFeeToken: relayerFeeToken,
      gasPrice,
      gasLimits,
      l1Reference,
      tokensData,
    });

    let totalNetworkFeeAmount = baseRelayerFeeAmount + totalExecutionFee;

    const swapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: totalNetworkFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const baseRelayFeeParams = getRelayerFeeParams({
      chainId,
      account,
      relayerFeeTokenAmount: baseRelayerFeeAmount,
      totalNetworkFeeAmount: totalNetworkFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: swapAmounts,
      batchExternalCalls,
      feeExternalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
      tokenPermits,
      srcChainId,
    });

    if (baseRelayFeeParams.noFeeSwap) {
      return undefined;
    }

    const baseExpressParams = await getBatchOrderExpressParams({
      chainId,
      batchParams,
      signer,
      settlementChainClient,
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
    if (estimationMethod === "estimateGas" && provider) {
      // In this cases simulation will fail
      if (baseRelayFeeParams.isOutGasTokenBalance || baseRelayFeeParams.needGasPaymentTokenApproval) {
        return undefined;
      }

      gasLimit = await estimateGasLimit(provider, {
        from: GMX_SIMULATION_ORIGIN,
        to: baseExpressParams.txnData.to,
        data: baseExpressParams.txnData.callData,
        value: 0n,
      });
    } else {
      gasLimit = approximateExpressBatchOrderGasLimit({
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
    }

    let feeAmount: bigint;
    if (isSponsoredCall) {
      feeAmount = applyFactor(gasLimit * gasPrice, gasLimits.gelatoRelayFeeMultiplierFactor);
    } else {
      feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, gasLimit, false);
    }

    const buffer = bigMath.mulDiv(feeAmount, BigInt(bufferBps), BASIS_POINTS_DIVISOR_BIGINT);
    feeAmount += buffer;

    totalNetworkFeeAmount = feeAmount + totalExecutionFee;

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
      srcChainId,
    });

    if (!finalRelayFeeParams) {
      return undefined;
    }

    const { relayParamsPayload } = await getBatchOrderExpressParams({
      chainId,
      batchParams,
      signer,
      settlementChainClient,
      subaccount,
      tokenPermits,
      tokensData,
      marketsInfoData,
      relayFeeParams: finalRelayFeeParams,
      noncesData,
      emptySignature: true,
    });

    if (requireGasPaymentTokenApproval && finalRelayFeeParams.needGasPaymentTokenApproval) {
      return undefined;
    }

    return {
      subaccount,
      relayParamsPayload,
      relayFeeParams: finalRelayFeeParams,
      isSponsoredCall,
      estimationMethod,
    };
  } catch (error) {
    const extendedError = extendError(error, {
      data: {
        estimationMethod,
      },
    });

    metrics.pushError(extendedError, "expressOrders.estimateExpressParams");
    // eslint-disable-next-line no-console
    console.error(extendedError);

    return undefined;
  }
}

// export async function validateExpressBatchOrderParams({
//   relayFeeParams,
//   batchParams,
//   tokenPermits,
// }: {
//   relayFeeParams: RelayerFeeParams;
//   batchParams: BatchOrderTxnParams;
//   tokenPermits: SignedTokenPermit[];
// }) {

// }

export async function getBatchOrderExpressParams({
  chainId,
  settlementChainClient,
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
  chainId: UiContractsChain;
  signer: WalletSigner;
  settlementChainClient: PublicClient | undefined;
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
    ...getOraclePriceParamsForOrders({
      chainId,
      createOrderParams: batchParams.createOrderParams,
      marketsInfoData,
      tokensData,
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
    settlementChainClient,
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
  settlementChainClient,
}: {
  signer: WalletSigner;
  chainId: UiContractsChain;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayerFeeParams;
  relayParamsPayload: RelayParamsPayload;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
  settlementChainClient: PublicClient | undefined;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const signerAddress = (await signer.getAddress()) as Address;
  const messageSigner = subaccount ? subaccount!.signer : signer;

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, subaccount !== undefined, srcChainId !== undefined);

  const cachedNonce = subaccount ? noncesData?.subaccountRelayRouter?.nonce : noncesData?.relayRouter?.nonce;

  let userNonce: bigint;
  if (cachedNonce === undefined) {
    if (srcChainId) {
      userNonce = await getRelayRouterNonceForMultichain(settlementChainClient!, signerAddress, relayRouterAddress);
    } else {
      userNonce = await getRelayRouterNonceForSigner(chainId, messageSigner, subaccount?.signedApproval !== undefined);
    }
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
    paramsLists: getBatchParamsLists(batchParams, srcChainId !== undefined),
    subaccountApproval: subaccount?.signedApproval,
  };

  let signature: Hex;
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

  let batchCalldata: Hex;
  if (srcChainId) {
    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: multichainSubaccountRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            desChainId: BigInt(chainId),
            signature,
          },
          { ...subaccount.signedApproval, integrationId: "0x" },
          params.account as Address,
          BigInt(srcChainId),
          subaccount.signedApproval?.subaccount,
          params.paramsLists,
        ],
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: multichainOrderRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            desChainId: BigInt(chainId),
            signature,
          },
          params.account,
          BigInt(srcChainId),
          params.paramsLists,
        ],
      });
    }
  } else {
    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: SubaccountGelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [
          { ...params.relayPayload, signature },
          subaccount.signedApproval,
          params.account,
          subaccount.signedApproval?.subaccount,
          params.paramsLists,
        ],
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: GelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [{ ...params.relayPayload, signature }, params.account, params.paramsLists],
      });
    }
  }

  return {
    callData: batchCalldata,
    to: relayRouterAddress,
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
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
  subaccountApproval: SignedSubbacountApproval | undefined;
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayload;
  batchParams: BatchOrderTxnParams;
  chainId: UiContractsChain;
  relayRouterAddress: Address;
}): Promise<SignTypedDataParams> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

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
      srcChainId ? { name: "dataList", type: "bytes32[]" } : undefined,
    ].filter<{ name: string; type: string }>(Boolean as any),
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

  const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, subaccountApproval !== undefined, srcChainId);

  const paramsLists = getBatchParamsLists(batchParams, srcChainId !== undefined);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: srcChainId
      ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
      : hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : zeroHash,
  };

  return {
    signer,
    types,
    typedData,
    domain,
  };
}

function getBatchParamsLists(batchParams: BatchOrderTxnParams, isMultichain: boolean) {
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
      // TODO add only in multichain
      dataList: isMultichain ? p.orderPayload.dataList : undefined,
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
  chainId: UiContractsChain
): Promise<UiSourceChain | undefined> {
  const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSupportedChain);
  const isMultichain = srcChainId !== chainId;

  return isMultichain ? (srcChainId as UiSourceChain) : undefined;
}

export function getOrderRelayRouterAddress(
  chainId: UiContractsChain,
  isSubaccount: boolean,
  isMultichain: boolean
): Address {
  let contractName: string;
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
  relayParamsPayload,
  params,
  signer,
  emptySignature = false,
}: {
  chainId: UiSettlementChain;
  relayParamsPayload: MultichainRelayParamsPayload;
  params: IRelayUtils.BridgeOutParamsStruct;
  signer: Signer;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const [address, srcChainId] = await Promise.all([
    signer.getAddress(),
    signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSourceChain),
  ]);

  let signature: Hex;

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
    abi: multichainTransferRouterAbi,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParamsPayload,
        signature,
        desChainId: BigInt(chainId),
      } satisfies IRelayUtils.RelayParamsStruct,
      address as Address,
      BigInt(srcChainId),
      params,
    ],
  });

  return {
    callData: bridgeOutCallData,
    to: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: Signer;
  relayParams: MultichainRelayParamsPayload;
  params: IRelayUtils.BridgeOutParamsStruct;
  chainId: UiSettlementChain;
  srcChainId: UiSourceChain;
}): Promise<Hex> {
  if (relayParams.userNonce === undefined) {
    throw new Error("userNonce is required");
  }

  const types = {
    BridgeOut: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "provider", type: "address" },
      { name: "data", type: "bytes" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const typedData = {
    token: params.token,
    amount: params.amount,
    provider: params.provider,
    data: params.data,
    relayParams: hashRelayParamsMultichain(relayParams),
  };

  const domain = getGelatoRelayRouterDomain(
    chainId,
    getContract(chainId, "MultichainTransferRouter"),
    false,
    srcChainId
  );

  return signTypedData({ signer, domain, types, typedData });
}
