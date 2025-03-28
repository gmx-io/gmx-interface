import { Contract, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { getExternalCallsParams } from "domain/synthetics/externalSwaps/utils";
import { callContract } from "lib/contracts";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "sdk/configs/contracts";
import { OrderType } from "sdk/types/orders";

import { CollateralTransferParams, OrderCreatePayload } from "./createOrderBuilders";

export function encodeCreateOrderMulticallPayload(p: { chainId: number; createOrderPayload: OrderCreatePayload }) {
  const { createOrderPayload, chainId } = p;
  const { collateralTransferParams, orderPayload } = createOrderPayload;

  const {
    sendWntPayloads,
    sendTokenPayloads,
    value: totalWntAmount,
  } = buildTokenTransfers({
    chainId,
    collateralTransferParams,
    executionFee: orderPayload.numbers.executionFee,
    orderType: orderPayload.orderType,
  });

  const externalCalls = collateralTransferParams.externalSwapQuote?.txnData
    ? [
        {
          method: "makeExternalCalls",
          params: getExternalCallsParams(
            chainId,
            orderPayload.addresses.receiver,
            collateralTransferParams.externalSwapQuote
          ),
        },
      ]
    : [];

  const multicall = [
    ...sendWntPayloads.map((payload) => ({
      method: "sendWnt",
      params: [payload.destination, payload.amount],
    })),
    ...sendTokenPayloads.map((payload) => ({
      method: "sendTokens",
      params: [payload.tokenAddress, payload.destination, payload.amount],
    })),
    ...externalCalls,
    {
      method: "createOrder",
      params: [orderPayload],
    },
  ];

  const callData = multicall.map((call) =>
    encodeFunctionData({
      abi: ExchangeRouter.abi,
      functionName: call.method,
      args: call.params,
    })
  );

  return {
    multicall,
    callData,
    value: totalWntAmount,
  };
}

function buildTokenTransfers(p: {
  chainId: number;
  collateralTransferParams: CollateralTransferParams;
  executionFee: bigint;
  orderType: OrderType;
}) {
  const { isNativePayment, externalSwapQuote, tokenToSendAmount, tokenToSendAddress } = p.collateralTransferParams;
  const orderVaultAddress = getContract(p.chainId, "OrderVault");
  const externalHandlerAddress = getContract(p.chainId, "ExternalHandler");

  const collateralWntAmount = isNativePayment ? tokenToSendAmount : 0n;
  const totalWntAmount = collateralWntAmount + p.executionFee;

  const externalSwapWntAmount = isNativePayment && externalSwapQuote?.txnData ? externalSwapQuote.amountIn : 0n;
  const orderVaultWntAmount = totalWntAmount - externalSwapWntAmount;
  const sendTokensDestination = externalSwapQuote?.txnData ? externalHandlerAddress : orderVaultAddress;

  const sendTokensAmount = isNativePayment ? 0n : tokenToSendAmount;

  const sendWntPayloads: SendWntPayload[] = [];

  const value = orderVaultWntAmount + externalSwapWntAmount;

  if (orderVaultWntAmount > 0n) {
    sendWntPayloads.push({
      amount: orderVaultWntAmount,
      destination: orderVaultAddress,
    });
  }

  if (externalSwapWntAmount > 0n) {
    sendWntPayloads.push({
      amount: externalSwapWntAmount,
      destination: externalHandlerAddress,
    });
  }

  const sendTokenPayloads: SendTokenPayload[] = [];

  if (sendTokensAmount > 0n && tokenToSendAddress) {
    sendTokenPayloads.push({
      tokenAddress: tokenToSendAddress,
      amount: sendTokensAmount,
      destination: sendTokensDestination,
    });
  }

  return { sendWntPayloads, sendTokenPayloads, value };
}

export type SendWntPayload = {
  amount: bigint;
  destination: string;
};

export type SendTokenPayload = {
  tokenAddress: string;
  amount: bigint;
  destination: string;
};

type MulticallPayload = {
  callData: string[];
  value?: bigint;
};

export function combineMulticallPayloads(multicallPayloads: MulticallPayload[]) {
  const value = multicallPayloads.reduce((acc, p) => acc + (p.value ?? 0n), 0n);
  const callData = multicallPayloads.flatMap((p) => p.callData);

  return { value, callData };
}

export async function sendCreateOrderOrderTxn({
  chainId,
  signer,
  callData,
  value,
}: {
  chainId: number;
  signer: Signer;
  callData: string[];
  value: bigint;
}) {
  // TODO: prepare txn shit
  //   const simulationPromise = !p.skipSimulation
  //     ? simulateExecuteTxn(chainId, {
  //         account: p.orderPayload.addresses.receiver,
  //         tokensData: p.tokensData,
  //         primaryPriceOverrides: p.simulationParams.primaryPriceOverrides,
  //         createMulticallPayload: callData,
  //         value,
  //         errorTitle: t`Order error.`,
  //         additionalErrorContent: p.additionalErrorContent,
  //         metricId: undefined,
  //         blockTimestampData: undefined,
  //       })
  //     : undefined;

  //   const { gasLimit, gasPriceData } = await prepareOrderTxn(
  //     p.chainId,
  //     contract,
  //     method,
  //     multicall,
  //     value,
  //     simulationPromise,
  //     undefined,
  //     p.additionalErrorContent
  //   );

  const routerAddress = getContract(chainId, "ExchangeRouter");
  const contract = new Contract(routerAddress, ExchangeRouter.abi, signer);

  await callContract(chainId, contract, "multicall", [callData], {
    value,
    hideSentMsg: true,
    hideSuccessMsg: true,
    // gasLimit,
    // gasPriceData,
  });
}
