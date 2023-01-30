import { useWeb3React } from "@web3-react/core";
import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useMarketsData } from "../markets";
import {
  ContractEventsContextType,
  DepositStatuses,
  EventTxnParams,
  KeyValueEventData,
  OrderStatuses,
  PositionUpdate,
  PositionsUpdates,
  WithdrawalStatuses,
} from "./types";
import { getToTokenFromSwapPath, orderTypeLabels } from "../orders";
import { getPositionKey } from "../positions";

export const ContractEventsContext = createContext({});

export function setByKey<T>(state: { [key: string]: T }, key: string, data: T) {
  return { ...state, [key]: data };
}

export function updateByKey<T>(state: { [key: string]: T }, key: string, data: Partial<T>) {
  if (!state[key]) return state;

  return { ...state, [key]: { ...state[key], ...data } };
}

export function getKeyValueEventData(eventData): KeyValueEventData {
  const ret: any = {};
  for (const typeKey of [
    "addressItems",
    "uintItems",
    "intItems",
    "boolItems",
    "bytes32Items",
    "bytesItems",
    "stringItems",
  ]) {
    ret[typeKey] = {};
    for (const listKey of ["items", "arrayItems"]) {
      ret[typeKey][listKey] = {};

      for (const item of eventData[typeKey][listKey]) {
        ret[typeKey][listKey][item.key] = item.value;
      }
    }
  }
  return ret as KeyValueEventData;
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
      PositionIncrease: (eventData, txnParams: EventTxnParams) => {
        const data = {
          account: eventData.addressItems.items.account,
          marketAddress: eventData.addressItems.items.market,
          collateralTokenAddress: eventData.addressItems.items.collateralToken,
          sizeInUsd: eventData.uintItems.items.sizeInUsd,
          sizeInTokens: eventData.uintItems.items.sizeInTokens,
          collateralAmount: eventData.uintItems.items.collateralAmount,
          borrowingFactor: eventData.uintItems.items.borrowingFactor,
          executionPrice: eventData.uintItems.items.executionPrice,
          sizeDeltaUsd: eventData.uintItems.items.sizeDeltaUsd,
          sizeDeltaInTokens: eventData.uintItems.items.sizeDeltaInTokens,
          orderType: eventData.uintItems.items.orderType,
          longTokenFundingAmountPerSize: eventData.intItems.items.longTokenFundingAmountPerSize,
          shortTokenFundingAmountPerSize: eventData.intItems.items.shortTokenFundingAmountPerSize,
          collateralDeltaAmount: eventData.intItems.items.collateralDeltaAmount,
          isLong: eventData.boolItems.items.isLong,
          contractPositionKey: eventData.bytes32Items.items.positionKey,
        };

        if (data.account !== currentAccount) return;
        const positionKey = getPositionKey(data.account, data.marketAddress, data.collateralTokenAddress, data.isLong);
        if (positionKey) {
          setPositionsUpdates((old) =>
            setByKey(old, positionKey, {
              positionKey,
              isIncrease: true,
              sizeDeltaInTokens: data.sizeInTokens,
              sizeDeltaUsd: data.sizeInUsd,
              collateralDeltaAmount: data.collateralDeltaAmount,
              updatedAtBlock: txnParams.blockNumber,
              updatedAt: Date.now(),
            })
          );
        }
      },
      PositionDecrease: (eventData, txnParams: EventTxnParams) => {
        const data = {
          account: eventData.addressItems.items.account,
          marketAddress: eventData.addressItems.items.market,
          collateralTokenAddress: eventData.addressItems.items.collateralToken,
          sizeInUsd: eventData.uintItems.items.sizeInUsd,
          sizeInTokens: eventData.uintItems.items.sizeInTokens,
          collateralAmount: eventData.uintItems.items.collateralAmount,
          borrowingFactor: eventData.uintItems.items.borrowingFactor,
          longTokenFundingAmountPerSize: eventData.intItems.items.longTokenFundingAmountPerSize,
          shortTokenFundingAmountPerSize: eventData.intItems.items.shortTokenFundingAmountPerSize,
          pnlUsd: eventData.intItems.items.pnlUsd,
          isLong: eventData.boolItems.items.isLong,
          contractPositionKey: eventData.bytes32Items.items.positionKey,
        };

        if (data.account !== currentAccount) return;

        const positionKey = getPositionKey(data.account, data.marketAddress, data.collateralTokenAddress, data.isLong);

        if (positionKey) {
          setPositionsUpdates((old) =>
            setByKey(old, positionKey, {
              isIncrease: false,
              sizeDeltaUsd: data.sizeInUsd,
              sizeDeltaInTokens: data.sizeInTokens,
              collateralDeltaAmount: data.collateralAmount,
              updatedAt: Date.now(),
              updatedAtBlock: txnParams.blockNumber,
              positionKey,
            })
          );
        }
      },
      OrderCreated: (eventData, txnParams: EventTxnParams) => {
        const data = {
          account: eventData.addressItems.items.account,
          receiver: eventData.addressItems.items.receiver,
          callbackContract: eventData.addressItems.items.callbackContract,
          marketAddress: eventData.addressItems.items.market,
          initialCollateralTokenAddress: eventData.addressItems.items.initialCollateralToken,
          swapPath: eventData.addressItems.arrayItems.swapPath,
          sizeDeltaUsd: eventData.uintItems.items.sizeDeltaUsd,
          initialCollateralDeltaAmount: eventData.uintItems.items.initialCollateralDeltaAmount,
          contractTriggerPrice: eventData.uintItems.items.triggerPrice,
          contractAcceptablePrice: eventData.uintItems.items.acceptablePrice,
          executionFee: eventData.uintItems.items.executionFee,
          callbackGasLimit: eventData.uintItems.items.callbackGasLimit,
          minOutputAmount: eventData.uintItems.items.minOutputAmount,
          updatedAtBlock: eventData.uintItems.items.updatedAtBlock,
          orderType: eventData.uintItems.items.orderType,
          isLong: eventData.boolItems.items.isLong,
          shouldUnwrapNativeToken: eventData.boolItems.items.shouldUnwrapNativeToken,
          isFrozen: eventData.boolItems.items.isFrozen,
          key: eventData.bytes32Items.items.key,
        };

        if (data.account !== currentAccount) return;

        setOrderStatuses((old) =>
          setByKey(old, data.key, { key: data.key, data, createdTxnHash: txnParams.transactionHash })
        );
      },

      OrderExecuted: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;

        setOrderStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

        const order = orderStatuses[key]?.data;
        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];
          const targetCollateral = getToTokenFromSwapPath(marketsData, order.initialCollateralToken, order.swapPath);

          const positionKey = getPositionKey(order.account, order.market, targetCollateral, order.isLong);

          if (positionKey) {
            setPendingPositionsUpdates((pendingPositions) => setByKey(pendingPositions, positionKey, undefined));
          }
          pushSuccessNotification(chainId, `${orderLabel} order executed`, txnParams);
        }
      },

      OrderCancelled: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;

        setOrderStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
        const order = orderStatuses[key]?.data;

        if (order) {
          const orderLabel = orderTypeLabels[order.flags.orderType];
          const targetCollateral = getToTokenFromSwapPath(marketsData, order.initialCollateralToken, order.swapPath);
          const positionKey = getPositionKey(order.account, order.market, targetCollateral, order.flags.isLong);
          if (positionKey) {
            setPendingPositionsUpdates((pendingPositions) => setByKey(pendingPositions, positionKey, undefined));
          }
          pushErrorNotification(chainId, `${orderLabel} order cancelled`, txnParams);
        }
      },

      DepositCreated: (eventData, txnParams: EventTxnParams) => {
        const depositData = {
          account: eventData.addressItems.items.account,
          receiver: eventData.addressItems.items.receiver,
          callbackContract: eventData.addressItems.items.callbackContract,
          market: eventData.addressItems.items.market,
          initialLongToken: eventData.addressItems.items.initialLongToken,
          initialShortToken: eventData.addressItems.items.initialShortToken,
          longTokenSwapPath: eventData.addressItems.arrayItems.longTokenSwapPath,
          shortTokenSwapPath: eventData.addressItems.arrayItems.shortTokenSwapPath,
          initialLongTokenAmount: eventData.uintItems.items.initialLongTokenAmount,
          initialShortTokenAmount: eventData.uintItems.items.initialShortTokenAmount,
          minMarketTokens: eventData.uintItems.items.minMarketTokens,
          updatedAtBlock: eventData.uintItems.items.updatedAtBlock,
          executionFee: eventData.uintItems.items.executionFee,
          callbackGasLimit: eventData.uintItems.items.callbackGasLimit,
          shouldUnwrapNativeToken: eventData.boolItems.shouldUnwrapNativeToken,
          key: eventData.bytes32Items.items.key,
        };

        console.log("brarasr", eventData, depositData);

        if (depositData.account !== currentAccount) return;

        setDepositStatuses((old) =>
          setByKey(old, depositData.key, {
            key: depositData.key,
            data: depositData,
            createdTxnHash: txnParams.transactionHash,
          })
        );
      },

      DepositExecuted: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;
        setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
        pushSuccessNotification(chainId, "Deposit executed", txnParams);
      },

      DepositCancelled: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;
        setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
        pushErrorNotification(chainId, "Deposit cancelled", txnParams);
      },

      WithdrawalCreated: (eventData, txnParams: EventTxnParams) => {
        const data = {
          account: eventData.addressItems.items.account,
          receiver: eventData.addressItems.items.receiver,
          callbackContract: eventData.addressItems.items.callbackContract,
          market: eventData.addressItems.items.market,
          marketTokenAmount: eventData.uintItems.items.marketTokenAmount,
          minLongTokenAmount: eventData.uintItems.items.minLongTokenAmount,
          minShortTokenAmount: eventData.uintItems.items.minShortTokenAmount,
          updatedAtBlock: eventData.uintItems.items.updatedAtBlock,
          executionFee: eventData.uintItems.items.executionFee,
          callbackGasLimit: eventData.uintItems.items.callbackGasLimit,
          shouldUnwrapNativeToken: eventData.boolItems.shouldUnwrapNativeToken,
          key: eventData.bytes32Items.items.key,
        };

        if (data.account !== currentAccount) return;

        setWithdrawalStatuses((old) =>
          setByKey(old, data.key, { key: data.key, data, createdTxnHash: txnParams.transactionHash })
        );
      },
      WithdrawalExecuted: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;
        setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
        pushSuccessNotification(chainId, "Withdrawal executed", txnParams);
      },
      WithdrawalCancelled: (eventData, txnParams: EventTxnParams) => {
        const key = eventData.bytes32Items.items.key;
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

      // Object.keys(contracts).forEach((contractName) => {
      //   Object.keys(handlers.current[contractName] || []).forEach((eventName) => {
      //     const handler = createHandler(contractName, eventName);

      //     _handlers[contractName] = _handlers[contractName] || {};
      //     _handlers[contractName][eventName] = handler;

      //     contracts[contractName].on(eventName, handler);
      //   });
      // });

      console.log(handlers.current["EventEmitter"]);

      function handleEventLog1(sender, eventNameHash, eventName, topic1, eventData, txnOpts) {
        console.log("handleEventLog1", sender, eventNameHash, eventName, topic1, eventData, txnOpts);
        handlers.current["EventEmitter"]?.[eventName]?.(getKeyValueEventData(eventData), txnOpts);
      }

      function handleEventLog(sender, eventNameHash, eventName, eventData, txnOpts) {
        console.log("handleEventLog1", sender, eventNameHash, eventName, eventData, txnOpts);
        handlers.current["EventEmitter"]?.[eventName]?.(getKeyValueEventData(eventData), txnOpts);
      }

      contracts.EventEmitter.on("EventLog", handleEventLog);
      contracts.EventEmitter.on("EventLog1", handleEventLog1);

      return () => {
        contracts.EventEmitter.off("EventLog1", handleEventLog1);
      };
    },
    [active, chainId]
  );

  const contextState: ContractEventsContextType = useMemo(() => {
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
