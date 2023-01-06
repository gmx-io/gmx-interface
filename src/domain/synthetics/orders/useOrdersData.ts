import { useWeb3React } from "@web3-react/core";
import OrderStore from "abis/OrderStore.json";
import { getContract } from "config/contracts";
import { getToken } from "config/tokens";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { parseContractPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useMulticall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useMemo } from "react";
import { orderTypeLabels } from "./constants";
import { OrdersData } from "./types";

type OrdersResult = {
  ordersData: OrdersData;
  isLoading: boolean;
};

export function useOrdersData(chainId: number): OrdersResult {
  const { account } = useWeb3React();

  const { marketsData } = useMarketsData(chainId);

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

  const marketsKeys = Object.keys(marketsData);

  const { data: ordersData, isLoading } = useMulticall(chainId, "useOrdersData-orders", {
    key:
      account && orderKeys.length && marketsKeys.length ? [account, orderKeys.join("-"), marketsKeys.join("-")] : null,
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

        const market = getMarket(marketsData, marketAddress);

        const indexToken = market ? getToken(chainId, market.indexTokenAddress) : undefined;

        ordersMap[key] = {
          key,
          account,
          receiver,
          callbackContract,
          market: marketAddress,
          initialCollateralToken,
          swapPath,
          sizeDeltaUsd,
          initialCollateralDeltaAmount,
          triggerPrice: indexToken ? parseContractPrice(triggerPrice, indexToken.decimals) : BigNumber.from(0),
          acceptablePrice: indexToken ? parseContractPrice(acceptablePrice, indexToken.decimals) : BigNumber.from(0),
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
    return {
      ordersData: ordersData || {},
      isLoading,
    };
  }, [isLoading, ordersData]);
}
