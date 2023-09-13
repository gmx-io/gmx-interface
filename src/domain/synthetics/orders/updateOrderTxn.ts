import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { convertToContractPrice } from "../tokens";
import { Token } from "domain/tokens";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: BigNumber;
  triggerPrice: BigNumber;
  acceptablePrice: BigNumber;
  minOutputAmount: BigNumber;
  // used to top up execution fee for frozen orders
  executionFee?: BigNumber;
  setPendingTxns: (txns: any) => void;
};

export function updateOrderTxn(chainId: number, signer: Signer, p: UpdateOrderParams) {
  const {
    orderKey,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    executionFee,
    setPendingTxns,
    indexToken,
  } = p;

  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall: { method: string; params: any[] }[] = [];
  if (p.executionFee?.gt(0)) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, executionFee] });
  }
  multicall.push({
    method: "updateOrder",
    params: [
      orderKey,
      sizeDeltaUsd,
      convertToContractPrice(acceptablePrice, indexToken?.decimals || 0),
      convertToContractPrice(triggerPrice, indexToken?.decimals || 0),
      minOutputAmount,
    ],
  });

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  return callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: p.executionFee?.gt(0) ? p.executionFee : undefined,
    sentMsg: t`Updating order`,
    successMsg: t`Update order executed`,
    failMsg: t`Failed to update order`,
    setPendingTxns,
  });
}
