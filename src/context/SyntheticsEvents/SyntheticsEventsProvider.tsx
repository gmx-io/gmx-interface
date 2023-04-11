import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";
import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { useMarketsInfo } from "domain/synthetics/markets";
import { getOrderTypeLabel } from "domain/synthetics/orders";
import { getPositionKey } from "domain/synthetics/positions";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { setByKey, updateByKey } from "lib/objects";
import { getProvider, getWsProvider } from "lib/rpc";
import { ReactNode, createContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ContractEventsContextType,
  DepositCreatedEvent,
  DepositStatuses,
  EventLogData,
  EventTxnParams,
  OrderCreatedEvent,
  OrderStatuses,
  PendingPositionUpdate,
  PendingPositionsUpdates,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  WithdrawalCreatedEvent,
  WithdrawalStatuses,
} from "./types";
import { parseEventLogData } from "./utils";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { getWrappedToken } from "config/tokens";

export const SyntheticsEventsContext = createContext({});

export function SyntheticsEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { active, account: currentAccount } = useWeb3React();

  const { marketsInfoData } = useMarketsInfo(chainId);

  const [orderStatuses, setOrderStatuses] = useState<OrderStatuses>({});
  const [depositStatuses, setDepositStatuses] = useState<DepositStatuses>({});
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<WithdrawalStatuses>({});
  const [pendingPositionsUpdates, setPendingPositionsUpdates] = useState<PendingPositionsUpdates>({});
  const [positionIncreaseEvents, setPositionIncreaseEvents] = useState<PositionIncreaseEvent[]>([]);
  const [positionDecreaseEvents, setPositionDecreaseEvents] = useState<PositionDecreaseEvent[]>([]);

  const eventLogHandlers = useRef({});

  useImperativeHandle(eventLogHandlers, () => ({
    PositionIncrease: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: PositionIncreaseEvent = {
        positionKey: getPositionKey(
          eventData.addressItems.items.account,
          eventData.addressItems.items.market,
          eventData.addressItems.items.collateralToken,
          eventData.boolItems.items.isLong
        )!,
        contractPositionKey: eventData.bytes32Items.items.positionKey,
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
        orderType: Number(eventData.uintItems.items.orderType),
        longTokenFundingAmountPerSize: eventData.intItems.items.longTokenFundingAmountPerSize,
        shortTokenFundingAmountPerSize: eventData.intItems.items.shortTokenFundingAmountPerSize,
        collateralDeltaAmount: eventData.intItems.items.collateralDeltaAmount,
        isLong: eventData.boolItems.items.isLong,
        increasedAtBlock: BigNumber.from(txnParams.blockNumber),
      };

      if (data.account !== currentAccount) return;

      setPositionIncreaseEvents((old) => [...old, data]);
    },

    PositionDecrease: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: PositionDecreaseEvent = {
        positionKey: getPositionKey(
          eventData.addressItems.items.account,
          eventData.addressItems.items.market,
          eventData.addressItems.items.collateralToken,
          eventData.boolItems.items.isLong
        )!,
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
        decreasedAtBlock: BigNumber.from(txnParams.blockNumber),
      };

      if (data.account !== currentAccount) return;

      setPositionDecreaseEvents((old) => [...old, data]);
    },

    OrderCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: OrderCreatedEvent = {
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
        orderType: Number(eventData.uintItems.items.orderType),
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

    OrderExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;

      setOrderStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));

      const order = orderStatuses[key]?.data;
      if (order) {
        const orderLabel = getOrderTypeLabel(order.orderType);

        pushSuccessNotification(chainId, `${orderLabel} order executed`, txnParams);
      }
    },

    OrderCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      setOrderStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));

      const order = orderStatuses[key]?.data;

      if (order && marketsInfoData) {
        const wrappedToken = getWrappedToken(chainId);
        const orderLabel = getOrderTypeLabel(order.orderType);
        const { outTokenAddress } = getSwapPathOutputAddresses({
          marketsInfoData: marketsInfoData,
          initialCollateralAddress: order.initialCollateralTokenAddress,
          swapPath: order.swapPath,
          wrappedNativeTokenAddress: wrappedToken.address,
          shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
        });

        pushErrorNotification(chainId, `${orderLabel} order cancelled`, txnParams);

        const positionKey = getPositionKey(order.account, order.marketAddress, outTokenAddress, order.isLong);

        if (positionKey) {
          setPendingPositionsUpdates((old) => setByKey(old, positionKey, undefined));
        }
      }
    },

    DepositCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const depositData: DepositCreatedEvent = {
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
        shouldUnwrapNativeToken: eventData.boolItems.items.shouldUnwrapNativeToken,
        key: eventData.bytes32Items.items.key,
      };

      if (depositData.account !== currentAccount) return;

      setDepositStatuses((old) =>
        setByKey(old, depositData.key, {
          key: depositData.key,
          data: depositData,
          createdTxnHash: txnParams.transactionHash,
        })
      );
    },

    DepositExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      pushSuccessNotification(chainId, "Deposit executed", txnParams);
    },

    DepositCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      pushErrorNotification(chainId, "Deposit cancelled", txnParams);
    },

    WithdrawalCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: WithdrawalCreatedEvent = {
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
        shouldUnwrapNativeToken: eventData.boolItems.items.shouldUnwrapNativeToken,
        key: eventData.bytes32Items.items.key,
      };

      if (data.account !== currentAccount) return;

      setWithdrawalStatuses((old) =>
        setByKey(old, data.key, { key: data.key, data, createdTxnHash: txnParams.transactionHash })
      );
    },

    WithdrawalExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      pushSuccessNotification(chainId, "Withdrawal executed", txnParams);
    },

    WithdrawalCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      setWithdrawalStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      pushErrorNotification(chainId, "Withdrawal cancelled", txnParams);
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

      function handleEventLog(sender, eventName, eventNameHash, eventData, txnOpts) {
        if (isDevelopment()) {
          // eslint-disable-next-line no-console
          console.log("handleEventLog", sender, eventName, eventNameHash, eventData, txnOpts);
        }
        eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
      }

      function handleEventLog1(sender, eventName, eventNameHash, topic1, eventData, txnOpts) {
        if (isDevelopment()) {
          // eslint-disable-next-line no-console
          console.log("handleEventLog1", sender, eventName, eventNameHash, topic1, eventData, txnOpts);
        }

        eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
      }

      function handleEventLog2(msgSender, eventName, eventNameHash, topic1, topic2, eventData, txnOpts) {
        if (isDevelopment()) {
          // eslint-disable-next-line no-console
          console.log("handleEventLog2", msgSender, eventNameHash, eventName, topic1, topic2, eventData, txnOpts);
        }
        eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
      }

      contracts.EventEmitter.on("EventLog", handleEventLog);
      contracts.EventEmitter.on("EventLog1", handleEventLog1);
      contracts.EventEmitter.on("EventLog2", handleEventLog2);

      return () => {
        contracts.EventEmitter.off("EventLog", handleEventLog);
        contracts.EventEmitter.off("EventLog1", handleEventLog1);
        contracts.EventEmitter.off("EventLog2", handleEventLog2);
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
        increasePositionEvents: positionIncreaseEvents,
        decreasePositionEvents: positionDecreaseEvents,
        pendingPositionsUpdates,
      });
    }

    return {
      orderStatuses,
      depositStatuses,
      withdrawalStatuses,
      pendingPositionsUpdates,
      positionIncreaseEvents,
      positionDecreaseEvents,
      touchOrderStatus: (key: string) => {
        setOrderStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchDepositStatus: (key: string) => {
        setDepositStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      touchWithdrawalStatus: (key: string) => {
        setWithdrawalStatuses((old) => updateByKey(old, key, { isTouched: true }));
      },
      async setPendingPositionUpdate(update: Omit<PendingPositionUpdate, "updatedAt" | "updatedAtBlock">) {
        const provider = getProvider(undefined, chainId) as StaticJsonRpcProvider;

        const currentBlock = await provider.getBlockNumber();

        setPendingPositionsUpdates((old) =>
          setByKey(old, update.positionKey, {
            ...update,
            updatedAt: Date.now(),
            updatedAtBlock: BigNumber.from(currentBlock),
          })
        );
      },
    };
  }, [
    chainId,
    depositStatuses,
    orderStatuses,
    pendingPositionsUpdates,
    positionDecreaseEvents,
    positionIncreaseEvents,
    withdrawalStatuses,
  ]);

  return <SyntheticsEventsContext.Provider value={contextState}>{children}</SyntheticsEventsContext.Provider>;
}
