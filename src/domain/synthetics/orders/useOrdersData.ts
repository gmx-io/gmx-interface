import { useWeb3React } from "@web3-react/core";
import OrderStore from "abis/OrderStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { OrdersData } from "./types";

type OrdersResult = {
  ordersData: OrdersData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

export function useOrdersData(chainId: number): OrdersResult {
  const { account } = useWeb3React();

  const [ordersData, setOrdersData] = useState<OrdersData>({});
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(DEFAULT_COUNT);

  const { data, isLoading } = useMulticall(chainId, "useOrdersData", {
    key: account ? [account, startIndex, endIndex] : null,
    request: () => ({
      orderStore: {
        contractAddress: getContract(chainId, "OrderStore"),
        abi: OrderStore.abi,
        calls: {
          count: {
            methodName: "getAccountOrderCount",
            params: [account],
          },
          keys: {
            methodName: "getAccountOrderKeys",
            params: [account, startIndex, endIndex],
          },
        },
      },
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          orders: {
            methodName: "getAccountOrders",
            params: [getContract(chainId, "OrderStore"), account, startIndex, endIndex],
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
          // TODO: parsing from abi?
          const key = orderKeys[i];
          const [addresses, numbers, flags, data] = order;
          const [account, receiver, callbackContract, marketAddress, initialCollateralToken, swapPath] = addresses;
          const [
            sizeDeltaUsd,
            initialCollateralDeltaAmount,
            triggerPrice,
            acceptablePrice,
            executionFee,
            callbackGasLimit,
            minOutputAmount,
            updatedAtBlock,
          ] = numbers.map(bigNumberify);

          const [orderType, isLong, shouldUnwrapNativeToken, isFrozen] = flags;

          acc[key] = {
            key,
            account,
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

  return useMemo(() => {
    return {
      ordersData,
      isLoading,
    };
  }, [isLoading, ordersData]);
}
