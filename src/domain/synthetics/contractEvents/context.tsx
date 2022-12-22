import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import EventEmitter from "abis/EventEmitter.json";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useState, useMemo, useContext } from "react";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { OrderEvents } from "./types";
import { ContractOrder } from "../orders";

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

      function onOrderCreated(key, orderParams: ContractOrder, txnParams) {
        if (orderParams.addresses.account !== account) return;

        setOrderEvents((orderEvents) => ({
          ...orderEvents,
          [key]: {
            key,
            orderParams,
            createdEvent: orderParams,
            createdTxnHash: txnParams.transactionHash,
          },
        }));
      }

      function onOrderCancelled(key, txnParams) {
        if (!orderEvents[key]) return;

        setOrderEvents((orderEvents) => ({
          ...orderEvents,
          [key]: {
            ...orderEvents[key],
            cancelledTxnHash: txnParams.transactionHash,
          },
        }));

        pushErrorNotification(chainId, "Order cancelled", txnParams);
      }

      function onOrderExecuted(key, txnParams) {
        if (!orderEvents[key]) return;

        setOrderEvents((orderEvents) => ({
          ...orderEvents,
          [key]: {
            ...orderEvents[key],
            executedEvent: txnParams.transactionHash,
          },
        }));

        pushSuccessNotification(chainId, "Order executed", txnParams);
      }

      wsEventEmitter?.on("OrderCreated", onOrderCreated);
      wsEventEmitter?.on("OrderCancelled", onOrderCancelled);
      wsEventEmitter?.on("OrderExecuted", onOrderExecuted);

      return () => {
        wsEventEmitter?.off("OrderCreated", onOrderCreated);
        wsEventEmitter?.off("OrderCancelled", onOrderCancelled);
        wsEventEmitter?.off("OrderExecuted", onOrderExecuted);
      };
    },
    [account, active, chainId, orderEvents]
  );

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
