import { useWeb3React } from "@web3-react/core";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import { BigNumber } from "ethers";
import { useMulticall } from "lib/multicall";
import { OrdersData } from "./types";

type OrdersResult = {
  ordersData?: OrdersData;
};

const DEFAULT_COUNT = 1000;

export function useOrders(chainId: number): OrdersResult {
  const { account } = useWeb3React();

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
          const { addresses, numbers, flags, data } = order;
          const {
            account,
            receiver,
            callbackContract,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            uiFeeReceiver,
            market: marketAddress,
            initialCollateralToken: initialCollateralTokenAddress,
            swapPath,
          } = addresses;
          const { orderType, decreasePositionSwapType, ...restNumbers } = numbers;
          const [
            sizeDeltaUsd,
            initialCollateralDeltaAmount,
            contractTriggerPrice,
            contractAcceptablePrice,
            executionFee,
            callbackGasLimit,
            minOutputAmount,
            updatedAtBlock,
          ] = Object.values(restNumbers).map(BigNumber.from);

          const { isLong, shouldUnwrapNativeToken, isFrozen } = flags;

          acc[key] = {
            key,
            account,
            decreasePositionSwapType,
            receiver,
            callbackContract,
            marketAddress,
            initialCollateralTokenAddress,
            swapPath,
            sizeDeltaUsd,
            initialCollateralDeltaAmount,
            contractTriggerPrice,
            contractAcceptablePrice,
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

  return {
    ordersData: data?.ordersData,
  };
}
