import { Web3Provider } from "@ethersproject/providers";
import { plural, t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";

export type CancelOrderParams = {
  executionFee: BigNumber;
  orderKeys: string[];
};

export async function cancelOrdersTxn(chainId: number, library: Web3Provider, p: CancelOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const multicall = p.orderKeys.map((key) => exchangeRouter.interface.encodeFunctionData("cancelOrder", [key]));

  const count = p.orderKeys.length;

  const ordersText = plural(count, {
    one: "Order",
    other: "# Orders",
  });

  return callContract(chainId, exchangeRouter, "multicall", [multicall], {
    value: p.executionFee,
    sentMsg: t`Canceling ${ordersText}`,
    successMsg: t`${ordersText} canceled`,
    failMsg: t`Failed to cancel ${ordersText}`,
  });
}
