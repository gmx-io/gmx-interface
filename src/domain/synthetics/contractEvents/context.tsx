import { useWeb3React } from "@web3-react/core";
import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ContractEventsContextType,
  DepositStatusEvents,
  EventTxnParams,
  OrderStatusEvents,
  WithdrawalStatusEvents,
} from "./types";
import { isDevelopment } from "config/env";
import { RawContractOrder, orderTypeLabels } from "../orders";
import { RawContractDeposit, RawContractWithdrawal } from "../markets";

export const ContractEventsContext = createContext({});

export function addByKey<T>(state: { [key: string]: T }, key: string, data: T) {
  return { ...state, [key]: data };
}

export function updateByKey<T>(state: { [key: string]: T }, key: string, data: Partial<T>) {
  if (!state[key]) return state;

  return { ...state, [key]: { ...state[key], ...data } };
}

export function ContractEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { active, account } = useWeb3React();

  const [orderStatuses, setOrderStatuses] = useState<{ [key: string]: OrderStatusEvents }>({});
  const [depositStatuses, setDepositStatuses] = useState<{ [key: string]: DepositStatusEvents }>({});
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<{ [key: string]: WithdrawalStatusEvents }>({});

  const handlers = useRef({});

  useImperativeHandle(handlers, () => ({
    EventEmitter: {
      OrderCreated: (key: string, data: RawContractOrder, txnParams: EventTxnParams) => {
        if (data.addresses.account !== account) return;

        setOrderStatuses((old) => addByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
      },

      OrderExecuted: (key: string, txnParams: EventTxnParams) => {
        setOrderStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

        const order = orderStatuses[key].data;

        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];

          pushSuccessNotification(chainId, `${orderLabel} order executed`, txnParams);
        }
      },

      OrderCancelled: (key: string, data, txnParams: EventTxnParams) => {
        setOrderStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));

        const order = orderStatuses[key].data;

        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];

          pushErrorNotification(chainId, `${orderLabel} order cancelled`, txnParams);
        }
      },

      DepositCreated: (key: string, data: RawContractDeposit, txnParams: EventTxnParams) => {
        if (data.addresses.account !== account) return;
        setDepositStatuses((old) => addByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
      },

      DepositExecuted: (key: string, txnParams: EventTxnParams) => {
        setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

        pushSuccessNotification(chainId, "Deposit executed", txnParams);
      },

      DepositCancelled: (key: string, data, txnParams: EventTxnParams) => {
        setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));

        pushErrorNotification(chainId, "Deposit cancelled", txnParams);
      },

      WithdrawalCreated: (key: string, data: RawContractWithdrawal, txnParams: EventTxnParams) => {
        if (data.addresses.account !== account) return;
        setWithdrawalStatuses((old) => addByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
      },

      WithdrawalExecuted: (key: string, txnParams: EventTxnParams) => {
        setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

        pushSuccessNotification(chainId, "Withdrawal executed", txnParams);
      },

      WithdrawalCancelled: (key: string, data, txnParams: EventTxnParams) => {
        setWithdrawalStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));

        pushErrorNotification(chainId, "Withdrawal cancelled", txnParams);
      },
    },
  }));

  useEffect(
    function subscribe() {
      const wsProvider = getWsProvider(active, chainId);

      if (!wsProvider) return;

      const contracts: { [name: string]: ethers.Contract } = {};

      try {
        contracts.EventEmitter = new ethers.Contract(
          getContract(chainId, "EventEmitter"),
          EventEmitter.abi,
          wsProvider
        );
      } catch (e) {
        // ...ignore on unsupported chains
      }

      const createHandler =
        (contractName, eventName) =>
        (...args) => {
          handlers.current[contractName][eventName](...args);
        };

      const _handlers = {};

      Object.keys(contracts).forEach((contractName) => {
        Object.keys(handlers.current[contractName] || []).forEach((eventName) => {
          const handler = createHandler(contractName, eventName);

          _handlers[contractName] = _handlers[contractName] || {};
          _handlers[contractName][eventName] = handler;

          contracts[contractName].on(eventName, handler);
        });
      });

      return () => {
        Object.keys(contracts).forEach((contractName) => {
          Object.keys(_handlers[contractName] || []).forEach((eventName) => {
            contracts[contractName].off(eventName, _handlers[contractName][eventName]);
          });
        });
      };
    },
    [account, active, chainId]
  );

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("events", { orderStatuses, depositStatuses, withdrawalStatuses });
  }

  const contextState: ContractEventsContextType = useMemo(() => {
    return {
      orderStatuses,
      depositStatuses,
      withdrawalStatuses,
      touchOrderStatus: (key: string) => {
        setOrderStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchDepositStatus: (key: string) => {
        setDepositStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchWithdrawalStatus: (key: string) => {
        setWithdrawalStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
    };
  }, [depositStatuses, orderStatuses, withdrawalStatuses]);

  return <ContractEventsContext.Provider value={contextState}>{children}</ContractEventsContext.Provider>;
}
