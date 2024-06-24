import { t } from "@lingui/macro";
import { FeesSettlementStatusNotification } from "components/Synthetics/StatusNotification/FeesSettlementStatusNotification";
import { GmStatusNotification } from "components/Synthetics/StatusNotification/GmStatusNotification";
import { OrdersStatusNotificiation } from "components/Synthetics/StatusNotification/OrderStatusNotification";
import { isDevelopment } from "config/env";
import { getToken, getWrappedToken } from "config/tokens";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { subscribeToV2Events } from "context/WebsocketContext/subscribeToEvents";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLiquidationOrderType,
  isMarketOrderType,
} from "domain/synthetics/orders";
import { getPositionKey } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey, setByKey, updateByKey } from "lib/objects";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DepositCreatedEventData,
  DepositStatuses,
  EventLogData,
  EventTxnParams,
  OrderCreatedEventData,
  OrderStatuses,
  PendingDepositData,
  PendingFundingFeeSettlementData,
  PendingOrderData,
  PendingPositionUpdate,
  PendingPositionsUpdates,
  PendingWithdrawalData,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  SyntheticsEventsContextType,
  WithdrawalCreatedEventData,
  WithdrawalStatuses,
} from "./types";

export const SyntheticsEventsContext = createContext({});

export function useSyntheticsEvents(): SyntheticsEventsContextType {
  return useContext(SyntheticsEventsContext) as SyntheticsEventsContextType;
}

export function SyntheticsEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { account: currentAccount } = useWallet();
  const { wsProvider } = useWebsocketProvider();

  const { hasV2LostFocus } = useHasLostFocus();

  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const [orderStatuses, setOrderStatuses] = useState<OrderStatuses>({});
  const [depositStatuses, setDepositStatuses] = useState<DepositStatuses>({});
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<WithdrawalStatuses>({});

  const [pendingPositionsUpdates, setPendingPositionsUpdates] = useState<PendingPositionsUpdates>({});
  const [positionIncreaseEvents, setPositionIncreaseEvents] = useState<PositionIncreaseEvent[]>([]);
  const [positionDecreaseEvents, setPositionDecreaseEvents] = useState<PositionDecreaseEvent[]>([]);

  const eventLogHandlers = useRef({});

  const [, setPendingTxns] = usePendingTxns();

  // use ref to avoid re-subscribing on state changes
  eventLogHandlers.current = {
    OrderCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: OrderCreatedEventData = {
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

      if (data.account !== currentAccount) {
        return;
      }

      setOrderStatuses((old) =>
        setByKey(old, data.key, {
          key: data.key,
          data,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    OrderUpdated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      const account = eventData.addressItems.items.account;

      if (account !== currentAccount) {
        return;
      }

      setOrderStatuses((old) => {
        if (old[key]) {
          return updateByKey(old, key, {
            updatedTxnHash: txnParams.transactionHash,
            isViewed: false,
          });
        } else {
          return setByKey(old, key, {
            key,
            createdAt: Date.now(),
            updatedTxnHash: txnParams.transactionHash,
          });
        }
      });
    },

    OrderExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;

      setOrderStatuses((old) => {
        if (!old[key]) return old;

        return updateByKey(old, key, { executedTxnHash: txnParams.transactionHash });
      });
    },

    OrderCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      const account = eventData.addressItems.items.account;

      if (account !== currentAccount) {
        return;
      }

      setOrderStatuses((old) => {
        if (old[key]) {
          return updateByKey(old, key, {
            cancelledTxnHash: txnParams.transactionHash,
            isViewed: false,
          });
        } else {
          return setByKey(old, key, {
            key,
            createdAt: Date.now(),
            cancelledTxnHash: txnParams.transactionHash,
          });
        }
      });

      const order = orderStatuses[key]?.data;

      // If pending user order is cancelled, reset the pending position state
      if (order && marketsInfoData) {
        const wrappedToken = getWrappedToken(chainId);

        let pendingPositionKey: string | undefined;

        // For increase orders, we need to check the target collateral token
        if (isIncreaseOrderType(order.orderType)) {
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData: marketsInfoData,
            initialCollateralAddress: order.initialCollateralTokenAddress,
            swapPath: order.swapPath,
            wrappedNativeTokenAddress: wrappedToken.address,
            shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
            isIncrease: true,
          });

          if (outTokenAddress) {
            pendingPositionKey = getPositionKey(order.account, order.marketAddress, outTokenAddress, order.isLong);
          }
        } else if (isDecreaseOrderType(order.orderType)) {
          pendingPositionKey = getPositionKey(
            order.account,
            order.marketAddress,
            order.initialCollateralTokenAddress,
            order.isLong
          );
        }

        if (pendingPositionKey) {
          setPendingPositionsUpdates((old) => setByKey(old, pendingPositionKey!, undefined));
        }
      }
    },

    DepositCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const depositData: DepositCreatedEventData = {
        account: eventData.addressItems.items.account,
        receiver: eventData.addressItems.items.receiver,
        callbackContract: eventData.addressItems.items.callbackContract,
        marketAddress: eventData.addressItems.items.market,
        initialLongTokenAddress: eventData.addressItems.items.initialLongToken,
        initialShortTokenAddress: eventData.addressItems.items.initialShortToken,
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

      if (depositData.account !== currentAccount) {
        return;
      }

      setDepositStatuses((old) =>
        setByKey(old, depositData.key, {
          key: depositData.key,
          data: depositData,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    DepositExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;
      if (depositStatuses[key]) {
        setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    DepositCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;

      if (depositStatuses[key]) {
        setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

    WithdrawalCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: WithdrawalCreatedEventData = {
        account: eventData.addressItems.items.account,
        receiver: eventData.addressItems.items.receiver,
        callbackContract: eventData.addressItems.items.callbackContract,
        marketAddress: eventData.addressItems.items.market,
        marketTokenAmount: eventData.uintItems.items.marketTokenAmount,
        minLongTokenAmount: eventData.uintItems.items.minLongTokenAmount,
        minShortTokenAmount: eventData.uintItems.items.minShortTokenAmount,
        updatedAtBlock: eventData.uintItems.items.updatedAtBlock,
        executionFee: eventData.uintItems.items.executionFee,
        callbackGasLimit: eventData.uintItems.items.callbackGasLimit,
        shouldUnwrapNativeToken: eventData.boolItems.items.shouldUnwrapNativeToken,
        key: eventData.bytes32Items.items.key,
      };

      if (data.account !== currentAccount) {
        return;
      }

      setWithdrawalStatuses((old) =>
        setByKey(old, data.key, {
          key: data.key,
          data,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    WithdrawalExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;

      if (withdrawalStatuses[key]) {
        setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    WithdrawalCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const key = eventData.bytes32Items.items.key;

      if (withdrawalStatuses[key]) {
        setWithdrawalStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

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
        longTokenFundingAmountPerSize: eventData.intItems.items.longTokenFundingAmountPerSize,
        shortTokenFundingAmountPerSize: eventData.intItems.items.shortTokenFundingAmountPerSize,
        collateralDeltaAmount: eventData.intItems.items.collateralDeltaAmount,
        isLong: eventData.boolItems.items.isLong,
        increasedAtBlock: BigInt(txnParams.blockNumber),
        orderType: Number(eventData.uintItems.items.orderType),
        orderKey: eventData.bytes32Items.items.orderKey,
      };

      if (data.account !== currentAccount) {
        return;
      }

      setPositionIncreaseEvents((old) => [...old, data]);

      // If this is a limit order, or the order status is not received previosly, notify the user
      if (!isMarketOrderType(data.orderType) || !orderStatuses[data.orderKey]) {
        let text = "";

        const marketInfo = getByKey(marketsInfoData, data.marketAddress);
        const indexToken = marketInfo?.indexToken;
        const collateralToken = getToken(chainId, data.collateralTokenAddress);

        if (!marketInfo || !indexToken || !collateralToken) {
          return;
        }

        const longShortText = data.isLong ? t`Long` : t`Short`;
        const positionText = `${indexToken?.symbol} ${longShortText}`;

        if (data.sizeDeltaUsd == 0n) {
          text = t`Deposited ${formatTokenAmount(
            data.collateralDeltaAmount,
            collateralToken.decimals,
            collateralToken.symbol
          )} into ${positionText}`;
        } else {
          text = t`Increased ${positionText}, +${formatUsd(data.sizeDeltaUsd)}`;
        }

        pushSuccessNotification(chainId, text, { transactionHash: txnParams.transactionHash });
      }
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
        sizeDeltaUsd: eventData.uintItems.items.sizeDeltaUsd,
        sizeDeltaInTokens: eventData.uintItems.items.sizeDeltaInTokens,
        collateralAmount: eventData.uintItems.items.collateralAmount,
        collateralDeltaAmount: eventData.intItems.items.collateralDeltaAmount,
        borrowingFactor: eventData.uintItems.items.borrowingFactor,
        longTokenFundingAmountPerSize: eventData.intItems.items.longTokenFundingAmountPerSize,
        shortTokenFundingAmountPerSize: eventData.intItems.items.shortTokenFundingAmountPerSize,
        pnlUsd: eventData.intItems.items.pnlUsd,
        isLong: eventData.boolItems.items.isLong,
        contractPositionKey: eventData.bytes32Items.items.positionKey,
        decreasedAtBlock: BigInt(txnParams.blockNumber),
        orderType: Number(eventData.uintItems.items.orderType),
        orderKey: eventData.bytes32Items.items.orderKey,
      };

      if (data.account !== currentAccount) {
        return;
      }

      setPositionDecreaseEvents((old) => [...old, data]);

      // If this is a trigger or liquidation order, or the order status is not received previosly, notify the user
      if (!isMarketOrderType(data.orderType) || !orderStatuses[data.orderKey]) {
        let text = "";

        const marketInfo = getByKey(marketsInfoData, data.marketAddress);
        const indexToken = marketInfo?.indexToken;
        const collateralToken = getToken(chainId, data.collateralTokenAddress);

        if (!marketInfo || !indexToken || !collateralToken) {
          return;
        }

        const longShortText = data.isLong ? t`Long` : t`Short`;
        const positionText = `${indexToken?.symbol} ${longShortText}`;

        if (data.sizeDeltaUsd == 0n) {
          text = t`Withdrew ${formatTokenAmount(
            data.collateralDeltaAmount,
            collateralToken.decimals,
            collateralToken.symbol
          )} from ${positionText}`;
        } else {
          const orderTypeLabel = isLiquidationOrderType(data.orderType) ? t`Liquidated` : t`Decreased`;
          text = t`${orderTypeLabel} ${positionText}, -${formatUsd(data.sizeDeltaUsd)}`;
        }

        if (isLiquidationOrderType(data.orderType)) {
          pushErrorNotification(chainId, text, { transactionHash: txnParams.transactionHash });
        } else {
          pushSuccessNotification(chainId, text, { transactionHash: txnParams.transactionHash });
        }
      }
    },
  };

  useEffect(
    function subscribe() {
      if (hasV2LostFocus || !wsProvider || !currentAccount) {
        return;
      }

      const unsubscribe = subscribeToV2Events(chainId, wsProvider, currentAccount, eventLogHandlers);

      return function cleanup() {
        unsubscribe();
      };
    },
    [chainId, currentAccount, hasV2LostFocus, wsProvider]
  );

  const contextState: SyntheticsEventsContextType = useMemo(() => {
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
      setPendingOrder: (data: PendingOrderData | PendingOrderData[]) => {
        const toastId = Date.now();

        helperToast.success(
          <OrdersStatusNotificiation
            pendingOrderData={data}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            toastTimestamp={toastId}
            setPendingTxns={setPendingTxns}
          />,
          {
            autoClose: false,
            toastId,
            className: "OrdersStatusNotificiation",
          }
        );
      },
      setPendingFundingFeeSettlement: (data: PendingFundingFeeSettlementData) => {
        const toastId = Date.now();

        helperToast.success(
          <FeesSettlementStatusNotification
            orders={data.orders}
            toastTimestamp={toastId}
            marketsInfoData={marketsInfoData}
          />,
          {
            autoClose: false,
            toastId,
          }
        );
      },
      setPendingDeposit: (data: PendingDepositData) => {
        const toastId = Date.now();

        helperToast.success(
          <GmStatusNotification
            pendingDepositData={data}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            toastTimestamp={toastId}
          />,
          {
            autoClose: false,
            toastId,
          }
        );
      },
      setPendingWithdrawal: (data: PendingWithdrawalData) => {
        const toastId = Date.now();

        helperToast.success(
          <GmStatusNotification
            pendingWithdrawalData={data}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            toastTimestamp={toastId}
          />,
          {
            autoClose: false,
            toastId,
          }
        );
      },
      async setPendingPosition(update: PendingPositionUpdate) {
        setPendingPositionsUpdates((old) => setByKey(old, update.positionKey, update));
      },

      setOrderStatusViewed(key: string) {
        setOrderStatuses((old) => updateByKey(old, key, { isViewed: true }));
      },

      setDepositStatusViewed(key: string) {
        setDepositStatuses((old) => updateByKey(old, key, { isViewed: true }));
      },

      setWithdrawalStatusViewed(key: string) {
        setWithdrawalStatuses((old) => updateByKey(old, key, { isViewed: true }));
      },
    };
  }, [
    depositStatuses,
    marketsInfoData,
    orderStatuses,
    pendingPositionsUpdates,
    positionDecreaseEvents,
    positionIncreaseEvents,
    tokensData,
    withdrawalStatuses,
    setPendingTxns,
  ]);

  return <SyntheticsEventsContext.Provider value={contextState}>{children}</SyntheticsEventsContext.Provider>;
}
