import { useWeb3React } from "@web3-react/core";
import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { RawContractDeposit, RawContractWithdrawal, useMarketsData } from "../markets";
import { OrderType, RawContractOrder, getToTokenFromSwapPath, orderTypeLabels } from "../orders";
import {
  ContractEventsContextType,
  DepositStatuses,
  EventTxnParams,
  OrderStatuses,
  PositionUpdate,
  PositionsUpdates,
  WithdrawalStatuses,
} from "./types";
import { getPositionKey } from "../positions";

export const ContractEventsContext = createContext({});

export function setByKey<T>(state: { [key: string]: T }, key: string, data: T) {
  return { ...state, [key]: data };
}

export function updateByKey<T>(state: { [key: string]: T }, key: string, data: Partial<T>) {
  if (!state[key]) return state;

  return { ...state, [key]: { ...state[key], ...data } };
}

export function ContractEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { active, account: currentAccount } = useWeb3React();

  const { marketsData } = useMarketsData(chainId);

  const [orderStatuses, setOrderStatuses] = useState<OrderStatuses>({});
  const [depositStatuses, setDepositStatuses] = useState<DepositStatuses>({});
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<WithdrawalStatuses>({});

  const [pendingPositionsUpdates, setPendingPositionsUpdates] = useState<PositionsUpdates>({});
  const [positionsUpdates, setPositionsUpdates] = useState<PositionsUpdates>({});

  const handlers = useRef({});

  useImperativeHandle(handlers, () => ({
    EventEmitter: {
      PositionIncrease: (
        contractKey: string,
        account: string,
        market: string,
        collateralToken: string,
        isLong: boolean,
        executionPrice: BigNumber,
        sizeDeltaInUsd: BigNumber,
        sizeDeltaInTokens: BigNumber,
        collateralDeltaAmount: BigNumber,
        pnlAmountForPool: BigNumber,
        remainingCollateralAmount: BigNumber,
        outputAmount: BigNumber,
        orderType: OrderType,
        txnParams: EventTxnParams
      ) => {
        // eslint-disable-next-line no-console
        console.log("increased", txnParams);
        if (account !== currentAccount) return;

        const positionKey = getPositionKey(account, market, collateralToken, isLong);

        if (positionKey) {
          setPositionsUpdates((old) =>
            setByKey(old, positionKey, {
              positionKey,
              isIncrease: true,
              sizeDeltaUsd: sizeDeltaInUsd,
              collateralDeltaAmount,
              updatedAt: Date.now(),
            })
          );
        }
      },

      PositionDecrease: (
        contractKey: string,
        account: string,
        market: string,
        collateralToken: string,
        isLong: boolean,
        executionPrice: BigNumber,
        sizeDeltaInUsd: BigNumber,
        sizeDeltaInTokens: BigNumber,
        collateralDeltaAmount: BigNumber,
        pnlAmountForPool: BigNumber,
        remainingCollateralAmount: BigNumber,
        outputAmount: BigNumber,
        orderType: OrderType,
        txnParams: EventTxnParams
      ) => {
        // eslint-disable-next-line no-console
        console.log("decreased", txnParams);
        if (account !== currentAccount) return;

        const positionKey = getPositionKey(account, market, collateralToken, isLong);

        if (positionKey) {
          setPositionsUpdates((old) =>
            setByKey(old, positionKey, {
              isIncrease: false,
              sizeDeltaUsd: sizeDeltaInUsd,
              collateralDeltaAmount: collateralDeltaAmount,
              updatedAt: Date.now(),
              positionKey,
            })
          );
        }
      },

      OrderCreated: (key: string, data: RawContractOrder, txnParams: EventTxnParams) => {
        if (data.addresses.account !== currentAccount) return;

        setOrderStatuses((old) => setByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
      },

      OrderExecuted: (key: string, txnParams: EventTxnParams) => {
        setOrderStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

        const order = orderStatuses[key].data;

        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];

          const targetCollateral = getToTokenFromSwapPath(
            marketsData,
            order.addresses.initialCollateralToken,
            order.addresses.swapPath
          );

          const positionKey = getPositionKey(
            order.addresses.account,
            order.addresses.market,
            targetCollateral,
            order.flags.isLong
          );

          if (positionKey) {
            setPendingPositionsUpdates((pendingPositions) => setByKey(pendingPositions, positionKey, undefined));
          }

          pushSuccessNotification(chainId, `${orderLabel} order executed`, txnParams);
        }
      },

      OrderCancelled: (key: string, data, txnParams: EventTxnParams) => {
        setOrderStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));

        const order = orderStatuses[key].data;

        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];

          const targetCollateral = getToTokenFromSwapPath(
            marketsData,
            order.addresses.initialCollateralToken,
            order.addresses.swapPath
          );

          const positionKey = getPositionKey(
            order.addresses.account,
            order.addresses.market,
            targetCollateral,
            order.flags.isLong
          );

          if (positionKey) {
            setPendingPositionsUpdates((pendingPositions) => setByKey(pendingPositions, positionKey, undefined));
          }

          pushErrorNotification(chainId, `${orderLabel} order cancelled`, txnParams);
        }
      },

      DepositCreated: (key: string, data: RawContractDeposit, txnParams: EventTxnParams) => {
        if (data.addresses.account !== currentAccount) return;
        setDepositStatuses((old) => setByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
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
        if (data.addresses.account !== currentAccount) return;
        setWithdrawalStatuses((old) => setByKey(old, key, { key, data, createdTxnHash: txnParams.transactionHash }));
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
    [active, chainId]
  );

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("events", {
      orderStatuses,
      depositStatuses,
      withdrawalStatuses,
      positionsUpdates,
      pendingPositionsUpdates,
    });
  }

  const contextState: ContractEventsContextType = useMemo(() => {
    return {
      orderStatuses,
      depositStatuses,
      withdrawalStatuses,
      pendingPositionsUpdates,
      positionsUpdates,
      touchOrderStatus: (key: string) => {
        setOrderStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchDepositStatus: (key: string) => {
        setDepositStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchWithdrawalStatus: (key: string) => {
        setWithdrawalStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      setPendingPositionUpdate(update: PositionUpdate) {
        const updatedAt = update.updatedAt || Date.now();
        setPendingPositionsUpdates((old) => setByKey(old, update.positionKey, { ...update, updatedAt }));
      },
    };
  }, [depositStatuses, orderStatuses, pendingPositionsUpdates, positionsUpdates, withdrawalStatuses]);

  return <ContractEventsContext.Provider value={contextState}>{children}</ContractEventsContext.Provider>;
}
