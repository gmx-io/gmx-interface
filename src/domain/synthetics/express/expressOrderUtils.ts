import { Provider, Signer, Wallet } from "ethers";
import { AbiItemArgs, Address, encodeFunctionData, Hex, size, zeroAddress, zeroHash } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import { isSourceChain } from "context/GmxAccountContext/config";
import {
  ExpressParamsEstimationMethod,
  ExpressTxnParams,
  GasPaymentValidations,
  getGelatoRelayRouterDomain,
  getOracleParamsPayload,
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
import { UiContractsChain, UiSettlementChain, UiSourceChain, UiSupportedChain } from "sdk/configs/chains";
import { ContractName } from "sdk/configs/contracts";
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
import { IRelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
import { multichainOrderRouterAbi, multichainSubaccountRouterAbi, multichainTransferRouterAbi } from "wagmi-generated";

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
  chainId: UiContractsChain;
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

  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

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
    srcChainId,
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
    provider,
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
    srcChainId,
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
    provider,
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
  provider,
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
  provider: Provider | undefined;
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
    provider,
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
  provider,
}: {
  signer: WalletSigner;
  chainId: UiContractsChain;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayerFeeParams;
  relayParamsPayload: RelayParamsPayload;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
  provider: Provider | undefined;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const messageSigner = subaccount ? subaccount!.signer : signer;

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, subaccount !== undefined, srcChainId !== undefined);

  const cachedNonce = subaccount ? noncesData?.subaccountRelayRouter?.nonce : noncesData?.relayRouter?.nonce;

  let userNonce: bigint;
  if (cachedNonce === undefined) {
    if (srcChainId) {
      userNonce = await getRelayRouterNonceForMultichain(
        provider!,
        messageSigner.address as Address,
        relayRouterAddress
      );
    } else {
      userNonce = await getRelayRouterNonceForSigner({
        chainId,
        signer: messageSigner,
        isSubaccount: subaccount?.signedApproval !== undefined,
        isMultichain: srcChainId !== undefined,
        scope: "order",
      });
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
      desChainId: srcChainId ? BigInt(chainId) : undefined,
    } as RelayParamsPayload | MultichainRelayParamsPayload,
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
    const paramsLists = getBatchParamsLists(batchParams, true);

    type MultichainBatchArgs = AbiItemArgs<typeof multichainSubaccountRouterAbi, "batch">;

    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: multichainSubaccountRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          },
          subaccount.signedApproval,
          params.account,
          BigInt(srcChainId),
          subaccount.signedApproval?.subaccount,
          paramsLists,
        ] as MultichainBatchArgs,
      });
    } else {
      type MultichainBatchArgs = AbiItemArgs<typeof multichainOrderRouterAbi, "batch">;
      batchCalldata = encodeFunctionData({
        abi: multichainOrderRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            signature,
          },
          params.account,
          BigInt(srcChainId),
          paramsLists,
        ] as MultichainBatchArgs,
      });
    }
  } else {
    const paramsLists = getBatchParamsLists(batchParams, false);
    if (subaccount) {
      batchCalldata = encodeFunctionData({
        abi: SubaccountGelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [
          { ...params.relayPayload, signature },
          subaccount.signedApproval,
          params.account,
          subaccount.signedApproval?.subaccount,
          paramsLists,
        ],
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: GelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [{ ...params.relayPayload, signature }, params.account, paramsLists],
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
  relayParams: RelayParamsPayload | MultichainRelayParamsPayload;
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
    relayParams:
      srcChainId !== undefined
        ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
        : hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval
      ? hashSubaccountApproval(subaccountApproval, srcChainId !== undefined)
      : zeroHash,
  };

  return {
    signer,
    types,
    typedData,
    domain,
  };
}

function getBatchParamsLists<T extends boolean = false>(batchParams: BatchOrderTxnParams, isMultichain: T) {
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
      dataList: (isMultichain ? p.orderPayload.dataList : undefined) as T extends true ? Hex[] : undefined,
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

export type BatchParamsListForSettlementChain = ReturnType<typeof getBatchParamsLists<false>>;
export type BatchParamsListForMultichain = ReturnType<typeof getBatchParamsLists<true>>;

export async function getMultichainInfoFromSigner(
  signer: Signer,
  chainId: UiContractsChain
): Promise<UiSourceChain | undefined> {
  const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSupportedChain);

  if (!isSourceChain(srcChainId)) {
    return undefined;
  }

  const isMultichain = srcChainId !== (chainId as UiSourceChain);

  return isMultichain ? srcChainId : undefined;
}

export function getOrderRelayRouterAddress(
  chainId: UiContractsChain,
  isSubaccount: boolean,
  isMultichain: boolean
): Address {
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

export type BridgeOutParams = AbiItemArgs<typeof multichainTransferRouterAbi, "bridgeOut">[3];

export async function buildAndSignBridgeOutTxn({
  chainId,
  relayParamsPayload,
  params,
  signer,
  emptySignature = false,
}: {
  chainId: UiSettlementChain;
  relayParamsPayload: MultichainRelayParamsPayload;
  params: BridgeOutParams;
  signer: WalletSigner;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  if (!srcChainId) {
    throw new Error("No srcChainId");
  }

  const address = signer.address;

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

  type MultichainBridgeOutArgs = AbiItemArgs<typeof multichainTransferRouterAbi, "bridgeOut">;

  const bridgeOutCallData = encodeFunctionData({
    abi: multichainTransferRouterAbi,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParamsPayload,
        signature,
        desChainId: BigInt(chainId),
      },
      address as Address,
      BigInt(srcChainId),
      params,
    ] as MultichainBridgeOutArgs,
  });

  return {
    callData: bridgeOutCallData,
    to: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayParamsPayload.fee.feeToken as Address,
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
  signer: WalletSigner;
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
