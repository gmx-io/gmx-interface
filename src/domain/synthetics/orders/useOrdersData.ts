import { getContract } from "config/contracts";
import OrderStore from "abis/OrderStore.json";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { OrdersData } from "./types";
import { useWeb3React } from "@web3-react/core";
import { orderTypeLabels } from "config/synthetics";
import { bigNumberify } from "lib/numbers";

export function useOrdersData(chainId: number): OrdersData {
  const { account } = useWeb3React();

  const { data: orderKeys = [] } = useMulticall(chainId, "useOrdersData-keys", {
    key: account ? [account] : null,
    request: {
      orderStore: {
        contractAddress: getContract(chainId, "OrderStore"),
        abi: OrderStore.abi,
        calls: {
          keys: {
            methodName: "getAccountOrderKeys",
            // TODO: pagination
            params: [account, 0, 100],
          },
        },
      },
    },
    parseResponse: (res) => res.orderStore.keys.returnValues as string[],
  });

  const { data: ordersMap } = useMulticall(chainId, "useOrdersData-orders", {
    key: account && orderKeys.length ? [account, orderKeys.join("-")] : null,
    request: () => ({
      orderStore: {
        contractAddress: getContract(chainId, "OrderStore"),
        abi: OrderStore.abi,
        calls: orderKeys.reduce((calls, key) => {
          calls[key] = {
            methodName: "get",
            params: [key],
          };

          return calls;
        }, {}),
      },
    }),
    parseResponse: (res) =>
      Object.keys(res.orderStore).reduce((ordersMap: OrdersData, key: string) => {
        const order = res.orderStore[key].returnValues;

        if (!order) return ordersMap;

        const [addresses, numbers, flags, data] = order;
        const [account, receiver, callbackContract, market, initialCollateralToken, swapPath] = addresses;
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

        ordersMap[key] = {
          key,
          account,
          receiver,
          callbackContract,
          market,
          initialCollateralToken,
          swapPath,
          sizeDeltaUsd,
          initialCollateralDeltaAmount,
          triggerPrice,
          acceptablePrice,
          executionFee,
          callbackGasLimit,
          minOutputAmount,
          updatedAtBlock,
          typeLabel: orderTypeLabels[orderType],
          type: orderType,
          isLong,
          shouldUnwrapNativeToken,
          isFrozen,
          data,
        };

        return ordersMap;
      }, {} as OrdersData),
  });

  return useMemo(() => {
    return ordersMap || {};
  }, [ordersMap]);
}
