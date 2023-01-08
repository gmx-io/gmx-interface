import { useWeb3React } from "@web3-react/core";
import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { OrderEvents } from "./types";

export type ContractEventsContextType = {
  getPendingOrders: () => OrderEvents[];
  getOrderEvents: (key?: string) => OrderEvents | undefined;
  setIsOrderViewed: (key: string) => void;
};

const ContractEventsContext = createContext({});

export function useContractEventsContext() {
  return useContext(ContractEventsContext) as ContractEventsContextType;
}

export function ContractEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { active, account } = useWeb3React();

  const [orderEvents, setOrderEvents] = useState<{ [key: string]: OrderEvents }>({});

  useEffect(
    function subscribe() {
      const wsProvider = getWsProvider(active, chainId);

      if (!wsProvider) return;

      let wsEventEmitter: ethers.Contract | undefined;

      try {
        wsEventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), EventEmitter.abi, wsProvider);
      } catch (e) {
        // ...ignore
      }

      // TODO: refs?
      function onOrderCreated(key, orderParams, txnParams) {
        if (orderParams.addresses.account !== account) return;

        setOrderEvents((orderEvents) => {
          return {
            ...orderEvents,
            [key]: {
              key,
              orderParams,
              createdTxnHash: txnParams.transactionHash,
            },
          };
        });
      }

      function onOrderCancelled(key, data, txnParams) {
        setOrderEvents((orderEvents) => {
          if (!orderEvents[key]) return orderEvents;

          return {
            ...orderEvents,
            [key]: {
              ...orderEvents[key],
              cancelledTxnHash: txnParams.transactionHash,
            },
          };
        });

        pushErrorNotification(chainId, "Order cancelled", txnParams);
      }

      function onOrderExecuted(key, txnParams) {
        setOrderEvents((orderEvents) => {
          if (!orderEvents[key]) return orderEvents;

          return {
            ...orderEvents,
            [key]: {
              ...orderEvents[key],
              executedTxnHash: txnParams.transactionHash,
            },
          };
        });

        pushSuccessNotification(chainId, "Order executed", txnParams);
      }

      wsEventEmitter?.on("OrderCreated", onOrderCreated);
      wsEventEmitter?.on("OrderCancelled", onOrderCancelled);
      wsEventEmitter?.on("OrderExecuted", onOrderExecuted);

      wsEventEmitter?.on("DepositCreated", onOrderCreated);
      wsEventEmitter?.on("DepositCancelled", onOrderCancelled);
      wsEventEmitter?.on("DepositExecuted", onOrderExecuted);

      wsEventEmitter?.on("WithdrawalCreated", onOrderCreated);
      wsEventEmitter?.on("WithdrawalCancelled", onOrderCancelled);
      wsEventEmitter?.on("WithdrawalExecuted", onOrderExecuted);

      return () => {
        wsEventEmitter?.off("OrderCreated", onOrderCreated);
        wsEventEmitter?.off("OrderCancelled", onOrderCancelled);
        wsEventEmitter?.off("OrderExecuted", onOrderExecuted);

        wsEventEmitter?.off("DepositCreated", onOrderCreated);
        wsEventEmitter?.off("DepositCancelled", onOrderCancelled);
        wsEventEmitter?.off("DepositExecuted", onOrderExecuted);

        wsEventEmitter?.off("WithdrawalCreated", onOrderCreated);
        wsEventEmitter?.off("WithdrawalCancelled", onOrderCancelled);
        wsEventEmitter?.off("WithdrawalExecuted", onOrderExecuted);
      };
    },
    [account, active, chainId]
  );

  // eslint-disable-next-line no-console
  console.debug("orderEvents", orderEvents);

  const state = useMemo(() => {
    function getPendingOrders() {
      return Object.values(orderEvents).filter(
        (orderEvent) => !orderEvent.cancelledTxnHash && !orderEvent.executedTxnHash && !orderEvent.isViewed
      );
    }

    function getOrderEvents(key?: string) {
      if (!key) return undefined;
      return orderEvents[key];
    }

    function setIsOrderViewed(key: string) {
      setOrderEvents((orderEvents) => ({
        ...orderEvents,
        [key]: {
          ...orderEvents[key],
          isViewed: true,
        },
      }));
    }

    return {
      getPendingOrders,
      getOrderEvents,
      setIsOrderViewed,
    };
  }, [orderEvents]);

  return <ContractEventsContext.Provider value={state}>{children}</ContractEventsContext.Provider>;
}
