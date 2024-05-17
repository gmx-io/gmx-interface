import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { OrdersData } from "./types";

type OrdersResult = {
  ordersData?: OrdersData;
};

const DEFAULT_COUNT = 1000;

export function useOrders(chainId: number, p: { account?: string | null }): OrdersResult {
  const { account } = p;

  const { data } = useMulticall(chainId, "useOrdersData", {
    key: account ? [account] : null,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          count: {
            methodName: "getBytes32Count",
            params: [accountOrderListKey(account!)],
          },
          keys: {
            methodName: "getBytes32ValuesAt",
            params: [accountOrderListKey(account!), 0, DEFAULT_COUNT],
          },
        },
      },
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          orders: {
            methodName: "getAccountOrders",
            params: [getContract(chainId, "DataStore"), account, 0, DEFAULT_COUNT],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const count = Number(res.data.dataStore.count.returnValues[0]);
      const orderKeys = res.data.dataStore.keys.returnValues;
      const orders = res.data.reader.orders.returnValues;

      return {
        count,
        ordersData: orders.reduce((acc: OrdersData, order, i) => {
          const key = orderKeys[i];
          const { data } = order;

          acc[key] = {
            key,
            account: order.addresses.account,
            receiver: order.addresses.receiver,
            callbackContract: order.addresses.callbackContract,
            marketAddress: order.addresses.market,
            initialCollateralTokenAddress: order.addresses.initialCollateralToken,
            swapPath: order.addresses.swapPath,
            sizeDeltaUsd: BigInt(order.numbers.sizeDeltaUsd),
            initialCollateralDeltaAmount: BigInt(order.numbers.initialCollateralDeltaAmount),
            contractTriggerPrice: BigInt(order.numbers.triggerPrice),
            contractAcceptablePrice: BigInt(order.numbers.acceptablePrice),
            executionFee: BigInt(order.numbers.executionFee),
            callbackGasLimit: BigInt(order.numbers.callbackGasLimit),
            minOutputAmount: BigInt(order.numbers.minOutputAmount),
            updatedAtBlock: BigInt(order.numbers.updatedAtBlock),
            isLong: order.flags.isLong,
            shouldUnwrapNativeToken: order.flags.shouldUnwrapNativeToken,
            isFrozen: order.flags.isFrozen,
            orderType: order.numbers.orderType,
            decreasePositionSwapType: order.numbers.decreasePositionSwapType,
            data,
          };

          return acc;
        }, {} as OrdersData),
      };
    },
  });

  return {
    ordersData: data?.ordersData,
  };
}
