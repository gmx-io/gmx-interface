import { getContract } from "sdk/configs/contracts";
import { getToken } from "sdk/configs/tokens";
import { convertToContractPrice } from "sdk/utils/tokens";
import { encodeFunctionData } from "viem";
import ExchangeRouterAbi from "sdk/abis/ExchangeRouter.json";

type UpdateOrderPayload = {
  orderKey: string;
  indexTokenAddress: string;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
  executionFee: bigint | undefined;
};

export function buildUpdateOrderMulticallPayload({
  chainId,
  updateOrderPayload,
}: {
  chainId: number;
  updateOrderPayload: UpdateOrderPayload;
}) {
  const {
    orderKey,
    indexTokenAddress,
    sizeDeltaUsd,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    autoCancel,
    executionFee,
  } = updateOrderPayload;
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const indexToken = getToken(chainId, indexTokenAddress);

  const multicall: { method: string; params: any[] }[] = [];
  if (executionFee != undefined && executionFee > 0) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, executionFee] });
  }

  multicall.push({
    method: "updateOrder",
    params: [
      orderKey,
      sizeDeltaUsd,
      convertToContractPrice(acceptablePrice, indexToken.decimals),
      convertToContractPrice(triggerPrice, indexToken.decimals),
      minOutputAmount,
      0n,
      autoCancel,
    ],
  });

  const callData = multicall.filter(Boolean).map((call) =>
    encodeFunctionData({
      abi: ExchangeRouterAbi.abi,
      functionName: call.method,
      args: call.params,
    })
  );

  return {
    multicall,
    callData,
    value: executionFee,
  };
}
