import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { accountOrderListKey } from "config/dataStore";
import { OrdersData } from "./types";

type OrdersResult = {
  ordersData?: OrdersData;
};

const DEFAULT_COUNT = 100;

export function useOrders(chainId: number): OrdersResult {
  const { account } = useWeb3React();

  const [ordersData, setOrdersData] = useState<OrdersData>({});
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(DEFAULT_COUNT);

  const { data } = useMulticall(chainId, "useOrdersData", {
    key: account ? [account, startIndex, endIndex] : null,
    request: () => ({
      orderStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          count: {
            methodName: "getBytes32Count",
            params: [accountOrderListKey(account!)],
          },
          keys: {
            methodName: "getBytes32ValuesAt",
            params: [accountOrderListKey(account!), startIndex, endIndex],
          },
        },
      },
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          orders: {
            methodName: "getAccountOrders",
            params: [getContract(chainId, "DataStore"), account, startIndex, endIndex],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const count = Number(res.orderStore.count.returnValues[0]);
      const orderKeys = res.orderStore.keys.returnValues;
      const orders = res.reader.orders.returnValues;

      return {
        count,
        ordersData: orders.reduce((acc: OrdersData, order, i) => {
          const key = orderKeys[i];
          const [addresses, numbers, flags, data] = order;
          const [account, receiver, callbackContract, marketAddress, initialCollateralToken, swapPath] = addresses;
          const [orderType, decreasePositionSwapType, ...restNumbers] = numbers;
          const [
            sizeDeltaUsd,
            initialCollateralDeltaAmount,
            triggerPrice,
            acceptablePrice,
            executionFee,
            callbackGasLimit,
            minOutputAmount,
            updatedAtBlock,
          ] = restNumbers.map(bigNumberify);

          const [isLong, shouldUnwrapNativeToken, isFrozen] = flags;

          acc[key] = {
            key,
            account,
            decreasePositionSwapType,
            receiver,
            callbackContract,
            marketAddress,
            initialCollateralTokenAddress: initialCollateralToken,
            swapPath,
            sizeDeltaUsd,
            initialCollateralDeltaAmount,
            contractTriggerPrice: triggerPrice,
            contractAcceptablePrice: acceptablePrice,
            executionFee,
            callbackGasLimit,
            minOutputAmount,
            updatedAtBlock,
            isLong,
            shouldUnwrapNativeToken,
            isFrozen,
            orderType,
            data,
          };

          return acc;
        }, {} as OrdersData),
      };
    },
  });

  useEffect(() => {
    if (!account) {
      setOrdersData({});
      setStartIndex(0);
      setEndIndex(DEFAULT_COUNT);
      return;
    }

    if (data?.count && data.count > endIndex) {
      setStartIndex(endIndex);
      setEndIndex(data.count);
    }

    if (data?.ordersData) {
      setOrdersData((old) => ({
        ...old,
        ...data.ordersData,
      }));
    }
  }, [account, data?.count, data?.ordersData, endIndex]);

  return {
    ordersData,
  };
}
