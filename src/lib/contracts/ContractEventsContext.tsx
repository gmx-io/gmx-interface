import { useWeb3React } from "@web3-react/core";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import EventEmitter from "abis/EventEmitter.json";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useState, useCallback, useMemo, useContext } from "react";

type SubscribedContract = "EventEmitter";

type ContractEventsContextType = {
  subscribe(contract: SubscribedContract, event: string, filter: any): void;
  unsubscribe(contract: SubscribedContract, event: string, filter: any): void;
};

const ContractEventsContext = createContext<ContractEventsContextType>({
  subscribe: () => [],
  unsubscribe: () => {},
});

type EventsSubscribers = {
  [contract: string]: {
    [event: string]: (() => void)[];
  };
};

const SUPPORTED_EVENTS = {
  EventEmitter: [
    "DepositCreated",
    "DepositExecuted",
    "DepositCancelled",
    "WithdrawalCreated",
    "WithdrawalExecuted",
    "WithdrawalCancelled",
    "OrderCreated",
    "OrderExecuted",
    "OrderCancelled",
  ],
};

export function useContractEvents() {
  return useContext(ContractEventsContext);
}

export function ContractEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { active } = useWeb3React();
  const [listenners, setListenners] = useState<EventsSubscribers>({});

  const subscribe = useCallback(
    (contract: SubscribedContract, event: string, filter: any) => {
      setListenners((listenners) => ({
        ...listenners,
        [contract]: {
          ...listenners[contract],
          [event]: [...(listenners[contract]?.[event] || []), filter],
        },
      }));
    },
    [setListenners]
  );

  const unsubscribe = useCallback(
    (contract: SubscribedContract, event: string, filter: any) => {
      setListenners((listenners) => ({
        ...listenners,
        [contract]: {
          ...listenners[contract],
          [event]: (listenners[contract]?.[event] || []).filter((f) => f !== filter),
        },
      }));
    },
    [setListenners]
  );

  useEffect(
    function init() {
      const wsProvider = getWsProvider(active, chainId);

      if (!wsProvider) return;

      let wsEventEmitter: ethers.Contract | undefined;

      try {
        wsEventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), EventEmitter.abi, wsProvider);
      } catch (e) {
        // ...ignore
      }

      if (!wsEventEmitter) return;

      SUPPORTED_EVENTS.EventEmitter.forEach((event) => {
        wsEventEmitter!.on(event, (...args) => {
          const handlers = listenners["EventEmitter"]?.[event] || [];

          // @ts-ignore
          handlers.forEach((handler) => handler(...args));
        });
      });

      return () => {
        wsEventEmitter!.removeAllListeners();
      };
    },
    [active, chainId, listenners]
  );

  const state = useMemo(() => ({ subscribe, unsubscribe }), [subscribe, unsubscribe]);

  return <ContractEventsContext.Provider value={state}>{children}</ContractEventsContext.Provider>;
}
