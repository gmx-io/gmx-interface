import { TaskState } from "@gelatonetwork/relay-sdk";
import { t } from "@lingui/macro";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { useTokensBalancesUpdates } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import {
  subscribeToApprovalEvents,
  subscribeToTransferEvents,
  subscribeToV2Events,
} from "context/WebsocketContext/subscribeToEvents";
import { useWebsocketProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLiquidationOrderType,
  isMarketOrderType,
  isSwapOrderType,
  OrderTxnType,
} from "domain/synthetics/orders";
import { getPositionKey } from "domain/synthetics/positions";
import { getIsEmptySubaccountApproval } from "domain/synthetics/subaccount";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { pushErrorNotification, pushSuccessNotification } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import {
  getGLVSwapMetricId,
  getGMSwapMetricId,
  getPositionOrderMetricId,
  getShiftGMMetricId,
  getSwapOrderMetricId,
  sendOrderCancelledMetric,
  sendOrderCreatedMetric,
  sendOrderExecutedMetric,
} from "lib/metrics/utils";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { deleteByKey, getByKey, setByKey, updateByKey } from "lib/objects";
import { getProvider } from "lib/rpc";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { sendUserAnalyticsOrderResultEvent, userAnalytics } from "lib/userAnalytics";
import { TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { gelatoRelay } from "sdk/utils/gelatoRelay";

import { FeesSettlementStatusNotification } from "components/Synthetics/StatusNotification/FeesSettlementStatusNotification";
import { GmStatusNotification } from "components/Synthetics/StatusNotification/GmStatusNotification";
import { OrdersStatusNotificiation } from "components/Synthetics/StatusNotification/OrderStatusNotification";

import {
  ApprovalStatuses,
  DepositCreatedEventData,
  DepositStatuses,
  EventLogData,
  EventTxnParams,
  GLVDepositCreatedEventData,
  OrderCreatedEventData,
  OrderStatuses,
  PendingDepositData,
  PendingExpressTxnParams,
  PendingFundingFeeSettlementData,
  PendingOrderData,
  PendingOrdersUpdates,
  PendingPositionsUpdates,
  PendingPositionUpdate,
  PendingShiftData,
  PendingWithdrawalData,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  ShiftCreatedEventData,
  ShiftStatuses,
  SyntheticsEventsContextType,
  WithdrawalCreatedEventData,
  WithdrawalStatuses,
} from "./types";
import { getTenderlyConfig } from "lib/tenderly";
import { isDevelopment } from "config/env";

export const SyntheticsEventsContext = createContext({});

export function useSyntheticsEvents(): SyntheticsEventsContextType {
  return useContext(SyntheticsEventsContext) as SyntheticsEventsContextType;
}

export function SyntheticsEventsProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { account: currentAccount } = useWallet();
  const provider = getProvider(undefined, chainId);
  const { wsProvider } = useWebsocketProvider();
  const { hasV2LostFocus, hasPageLostFocus } = useHasLostFocus();

  const { resetTokenPermits } = useTokenPermitsContext();
  const { refreshSubaccountData, resetSubaccountApproval } = useSubaccountContext();
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const { glvData } = useGlvMarketsInfo(isGlvEnabled(chainId), {
    marketsInfoData,
    tokensData,
    chainId,
    account: currentAccount,
  });

  const { glvAndGmMarketsData, marketTokensAddressesString } = useMemo(() => {
    const glvAndGmMarketsData = {
      ...marketsInfoData,
      ...glvData,
    };

    const marketTokensAddressesString = Object.keys(glvAndGmMarketsData).join("-");

    return {
      glvAndGmMarketsData,
      marketTokensAddressesString,
    };
  }, [marketsInfoData, glvData]);

  const [orderStatuses, setOrderStatuses] = useState<OrderStatuses>({});
  const [depositStatuses, setDepositStatuses] = useState<DepositStatuses>({});
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<WithdrawalStatuses>({});
  const [shiftStatuses, setShiftStatuses] = useState<ShiftStatuses>({});

  const { tokensBalancesUpdates, setTokensBalancesUpdates } = useTokensBalancesUpdates();
  const [approvalStatuses, setApprovalStatuses] = useState<ApprovalStatuses>({});

  const [pendingOrdersUpdates, setPendingOrdersUpdates] = useState<PendingOrdersUpdates>({});
  const [pendingPositionsUpdates, setPendingPositionsUpdates] = useState<PendingPositionsUpdates>({});
  const [positionIncreaseEvents, setPositionIncreaseEvents] = useState<PositionIncreaseEvent[]>([]);
  const [positionDecreaseEvents, setPositionDecreaseEvents] = useState<PositionDecreaseEvent[]>([]);

  const [pendingExpressTxnParams, setPendingExpressTxnParams] = useState<{ [taskId: string]: PendingExpressTxnParams }>(
    {}
  );

  const eventLogHandlers = useRef({});

  const updateNativeTokenBalance = useCallback(() => {
    if (!currentAccount) {
      return;
    }

    provider.getBalance(currentAccount, "pending").then((balance) => {
      setTokensBalancesUpdates((old) =>
        setByKey(old, NATIVE_TOKEN_ADDRESS, {
          balance,
        })
      );
    });
  }, [currentAccount, provider, setTokensBalancesUpdates]);

  // use ref to avoid re-subscribing on state changes
  eventLogHandlers.current = {
    OrderCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

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
        externalSwapQuote: undefined,
        key: eventData.bytes32Items.items.key,
      };

      if (data.account !== currentAccount) {
        return;
      }

      const metricId = isSwapOrderType(data.orderType) ? getSwapOrderMetricId(data) : getPositionOrderMetricId(data);
      sendOrderCreatedMetric(metricId);

      if (!isMarketOrderType(data.orderType)) {
        sendUserAnalyticsOrderResultEvent(chainId, metricId, true);
      }

      setOrderStatuses((old) =>
        setByKey(old, data.key, {
          key: data.key,
          data,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );

      setPendingOrdersUpdates((old) => deleteByKey(old, data.key));
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

      setPendingOrdersUpdates((old) => deleteByKey(old, key));
    },

    OrderExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      const order = orderStatuses[key]?.data;

      if (order) {
        const metricId = isSwapOrderType(order.orderType)
          ? getSwapOrderMetricId(order)
          : getPositionOrderMetricId(order);

        sendOrderExecutedMetric(metricId);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, true);
      }

      setOrderStatuses((old) => {
        if (!old[key]) return old;

        return updateByKey(old, key, { executedTxnHash: txnParams.transactionHash });
      });
    },

    OrderCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

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

      if (order) {
        const metricId = isSwapOrderType(order.orderType)
          ? getSwapOrderMetricId(order)
          : getPositionOrderMetricId(order);

        sendOrderCancelledMetric(metricId, eventData);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, false);
      }

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

    GlvDepositCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const depositData: GLVDepositCreatedEventData = {
        account: eventData.addressItems.items.account,
        receiver: eventData.addressItems.items.receiver,
        callbackContract: eventData.addressItems.items.callbackContract,
        glvAddress: eventData.addressItems.items.glv,
        marketAddress: eventData.addressItems.items.market,
        initialLongTokenAddress: eventData.addressItems.items.initialLongToken,
        initialShortTokenAddress: eventData.addressItems.items.initialShortToken,
        longTokenSwapPath: eventData.addressItems.arrayItems.longTokenSwapPath,
        shortTokenSwapPath: eventData.addressItems.arrayItems.shortTokenSwapPath,
        initialLongTokenAmount: eventData.uintItems.items.initialLongTokenAmount,
        initialShortTokenAmount: eventData.uintItems.items.initialShortTokenAmount,
        initialMarketTokenAmount: eventData.uintItems.items.marketTokenAmount,
        minMarketTokens: eventData.uintItems.items.minGlvTokens,
        updatedAtBlock: eventData.uintItems.items.updatedAtBlock,
        executionFee: eventData.uintItems.items.executionFee,
        callbackGasLimit: eventData.uintItems.items.callbackGasLimit,
        shouldUnwrapNativeToken: eventData.boolItems.items.shouldUnwrapNativeToken,
        key: eventData.bytes32Items.items.key,
        isGlvDeposit: true,
      };

      if (depositData.account !== currentAccount) {
        return;
      }

      const metricId = getGLVSwapMetricId(depositData);

      sendOrderCreatedMetric(metricId);

      setDepositStatuses((old) =>
        setByKey(old, depositData.key, {
          key: depositData.key,
          data: depositData,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    DepositCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

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
        isGlvDeposit: false,
      };

      if (depositData.account !== currentAccount) {
        return;
      }

      const metricId = getGMSwapMetricId(depositData);

      sendOrderCreatedMetric(metricId);

      setDepositStatuses((old) =>
        setByKey(old, depositData.key, {
          key: depositData.key,
          data: depositData,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    GlvDepositExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;
      if (depositStatuses[key]?.data) {
        const metricId = getGLVSwapMetricId(depositStatuses[key].data! as GLVDepositCreatedEventData);

        sendOrderExecutedMetric(metricId);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, true);

        setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    DepositExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (depositStatuses[key]?.data) {
        const metricId = getGMSwapMetricId(depositStatuses[key].data!);

        sendOrderExecutedMetric(metricId);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, true);
        setDepositStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    DepositCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (depositStatuses[key]?.data) {
        const metricId = getGMSwapMetricId(depositStatuses[key].data!);

        sendOrderCancelledMetric(metricId, eventData);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, false);
        setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

    GlvDepositCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (depositStatuses[key]?.data) {
        const metricId = getGLVSwapMetricId(depositStatuses[key].data! as GLVDepositCreatedEventData);

        sendOrderCancelledMetric(metricId, eventData);
        sendUserAnalyticsOrderResultEvent(chainId, metricId, false);

        setDepositStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

    WithdrawalCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

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

      const metricId = getGMSwapMetricId({
        marketAddress: data.marketAddress,
        executionFee: data.executionFee,
      });

      sendOrderCreatedMetric(metricId);

      setWithdrawalStatuses((old) =>
        setByKey(old, data.key, {
          key: data.key,
          data,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    GlvWithdrawalCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const data: WithdrawalCreatedEventData = {
        account: eventData.addressItems.items.account,
        receiver: eventData.addressItems.items.receiver,
        callbackContract: eventData.addressItems.items.callbackContract,
        marketAddress: eventData.addressItems.items.glv,
        marketTokenAmount: eventData.uintItems.items.glvTokenAmount,
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

      const metricId = getGLVSwapMetricId({
        glvAddress: data.marketAddress,
        executionFee: data.executionFee,
      });

      sendOrderCreatedMetric(metricId);

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
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (withdrawalStatuses[key]?.data) {
        const metricId = getGMSwapMetricId({
          marketAddress: withdrawalStatuses[key].data!.marketAddress,
          executionFee: withdrawalStatuses[key].data!.executionFee,
        });
        sendOrderExecutedMetric(metricId);

        setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    GlvWithdrawalExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;
      if (withdrawalStatuses[key]?.data) {
        const metricId = getGLVSwapMetricId({
          glvAddress: withdrawalStatuses[key].data!.marketAddress,
          executionFee: withdrawalStatuses[key].data!.executionFee,
        });
        sendOrderExecutedMetric(metricId);

        setWithdrawalStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    WithdrawalCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (withdrawalStatuses[key]?.data) {
        const metricId = getGLVSwapMetricId({
          glvAddress: withdrawalStatuses[key].data!.marketAddress,
          executionFee: withdrawalStatuses[key].data!.executionFee,
        });
        sendOrderCancelledMetric(metricId, eventData);

        setWithdrawalStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

    GlvWithdrawalCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (withdrawalStatuses[key]?.data) {
        const metricId = getGMSwapMetricId({
          marketAddress: withdrawalStatuses[key].data!.marketAddress,
          executionFee: withdrawalStatuses[key].data!.executionFee,
        });
        sendOrderCancelledMetric(metricId, eventData);

        setWithdrawalStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
      }
    },

    ShiftCreated: (eventData: EventLogData, txnParams: EventTxnParams) => {
      const data: ShiftCreatedEventData = {
        key: eventData.bytes32Items.items.key,
        account: eventData.addressItems.items.account,
        receiver: eventData.addressItems.items.receiver,
        callbackContract: eventData.addressItems.items.callbackContract,
        fromMarket: eventData.addressItems.items.fromMarket,
        toMarket: eventData.addressItems.items.toMarket,
        marketTokenAmount: eventData.uintItems.items.marketTokenAmount,
        minMarketTokens: eventData.uintItems.items.minMarketTokens,
        updatedAtTime: eventData.uintItems.items.updatedAtTime,
        executionFee: eventData.uintItems.items.executionFee,
      };

      if (data.account !== currentAccount) {
        return;
      }

      const metricId = getShiftGMMetricId({
        fromMarketAddress: data.fromMarket,
        toMarketAddress: data.toMarket,
        executionFee: data.executionFee,
      });

      sendOrderCreatedMetric(metricId);

      setShiftStatuses((old) =>
        setByKey(old, data.key, {
          key: data.key,
          data,
          createdTxnHash: txnParams.transactionHash,
          createdAt: Date.now(),
        })
      );
    },

    ShiftExecuted: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (shiftStatuses[key]?.data) {
        const metricId = getShiftGMMetricId({
          fromMarketAddress: shiftStatuses[key].data!.fromMarket,
          toMarketAddress: shiftStatuses[key].data!.toMarket,
          executionFee: shiftStatuses[key].data!.executionFee,
        });

        sendOrderExecutedMetric(metricId);

        setShiftStatuses((old) => updateByKey(old, key, { executedTxnHash: txnParams.transactionHash }));
      }
    },

    ShiftCancelled: (eventData: EventLogData, txnParams: EventTxnParams) => {
      updateNativeTokenBalance();

      const key = eventData.bytes32Items.items.key;

      if (shiftStatuses[key].data) {
        const metricId = getShiftGMMetricId({
          fromMarketAddress: shiftStatuses[key].data!.fromMarket,
          toMarketAddress: shiftStatuses[key].data!.toMarket,
          executionFee: shiftStatuses[key].data!.executionFee,
        });

        sendOrderCancelledMetric(metricId, eventData);

        setShiftStatuses((old) => updateByKey(old, key, { cancelledTxnHash: txnParams.transactionHash }));
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
        increasedAtTime: eventData.uintItems.items.increasedAtTime,
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
        decreasedAtTime: eventData.uintItems.items.decreasedAtTime,
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

  useEffect(
    function subscribeTokenTransferEvents() {
      if (hasPageLostFocus || !wsProvider || !currentAccount || !marketTokensAddressesString) {
        return;
      }

      const unsubscribeFromTokenEvents = subscribeToTransferEvents(
        chainId,
        wsProvider,
        currentAccount,
        marketTokensAddressesString.split("-"),
        (tokenAddress, amount) => {
          setTokensBalancesUpdates((old) => {
            const oldDiff = old[tokenAddress]?.diff || 0n;

            return setByKey(old, tokenAddress, {
              diff: oldDiff + amount,
            });
          });
        }
      );

      return function cleanup() {
        unsubscribeFromTokenEvents();
      };
    },

    [chainId, currentAccount, hasPageLostFocus, marketTokensAddressesString, setTokensBalancesUpdates, wsProvider]
  );

  useEffect(
    function subscribeApproval() {
      if (!wsProvider || !currentAccount) {
        return;
      }

      const unsubscribeApproval = subscribeToApprovalEvents(
        chainId,
        wsProvider,
        currentAccount,
        (tokenAddress, spender, value) => {
          setApprovalStatuses((old) => ({
            ...old,
            [tokenAddress]: {
              ...old[tokenAddress],
              [spender]: { value, createdAt: Date.now() },
            },
          }));
          userAnalytics.pushEvent<TokenApproveResultEvent>({
            event: "TokenApproveAction",
            data: {
              action: "ApproveSuccess",
            },
          });
        }
      );

      return function cleanup() {
        unsubscribeApproval();
      };
    },
    [chainId, currentAccount, wsProvider]
  );

  const contextState: SyntheticsEventsContextType = useMemo(() => {
    return {
      orderStatuses,
      depositStatuses,
      withdrawalStatuses,
      shiftStatuses,
      tokensBalancesUpdates,
      approvalStatuses,
      pendingOrdersUpdates,
      pendingPositionsUpdates,
      positionIncreaseEvents,
      positionDecreaseEvents,
      pendingExpressTxns: pendingExpressTxnParams,
      setPendingExpressTxn: (params: PendingExpressTxnParams) => {
        setPendingExpressTxnParams((old) => setByKey(old, params.taskId!, params));
      },
      setPendingOrder: (data: PendingOrderData | PendingOrderData[]) => {
        const toastId = Date.now();

        helperToast.success(
          <OrdersStatusNotificiation
            pendingOrderData={data}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            toastTimestamp={toastId}
          />,
          {
            autoClose: false,
            toastId,
            className: "OrdersStatusNotificiation",
          }
        );

        const arrayData = Array.isArray(data) ? data : [data];
        const objData: Record<string, OrderTxnType> = arrayData.reduce(
          (acc, order) => (!order.orderKey ? acc : setByKey(acc, order.orderKey, order.txnType)),
          {}
        );

        setPendingOrdersUpdates((old) => ({ ...old, ...objData }));
      },
      setPendingOrderUpdate: (data: PendingOrderData, remove?: "remove") => {
        setPendingOrdersUpdates((old) => {
          if (!data.orderKey) {
            return old;
          }

          return remove ? deleteByKey(old, data.orderKey) : setByKey(old, data.orderKey, "update");
        });
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
            marketsInfoData={glvAndGmMarketsData}
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
            marketsInfoData={glvAndGmMarketsData}
            tokensData={tokensData}
            toastTimestamp={toastId}
          />,
          {
            autoClose: false,
            toastId,
          }
        );
      },
      setPendingShift: (data: PendingShiftData) => {
        const toastId = Date.now();

        helperToast.success(
          <GmStatusNotification
            pendingShiftData={data}
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

      setShiftStatusViewed(key: string) {
        setShiftStatuses((old) => updateByKey(old, key, { isViewed: true }));
      },
    };
  }, [
    orderStatuses,
    depositStatuses,
    withdrawalStatuses,
    shiftStatuses,
    tokensBalancesUpdates,
    approvalStatuses,
    pendingOrdersUpdates,
    pendingPositionsUpdates,
    positionIncreaseEvents,
    positionDecreaseEvents,
    pendingExpressTxnParams,
    marketsInfoData,
    tokensData,
    glvAndGmMarketsData,
  ]);

  useEffect(
    function subscribeGelatoRelayEvents() {
      async function handleTaskStatusUpdate(taskStatus) {
        const pendingExpressParams = getByKey(pendingExpressTxnParams, taskStatus.taskId);

        switch (taskStatus.taskState) {
          case TaskState.ExecSuccess:
            {
              if (
                pendingExpressParams?.subaccountApproval &&
                !getIsEmptySubaccountApproval(pendingExpressParams.subaccountApproval)
              ) {
                resetSubaccountApproval();
              }

              if (pendingExpressParams?.tokenPermits?.length) {
                resetTokenPermits();
              }

              setByKey(pendingExpressTxnParams, taskStatus.taskId, undefined);

              refreshSubaccountData();

              if (pendingExpressParams?.successMessage) {
                helperToast.success(pendingExpressParams.successMessage);
              }
            }
            break;
          case TaskState.ExecReverted:
          case TaskState.Cancelled: {
            pendingExpressParams?.pendingOrdersKeys?.forEach((key) => {
              setOrderStatuses((old) => {
                if (old[key]) {
                  return updateByKey(old, key, {
                    gelatoTaskId: taskStatus.taskId,
                    isGelatoTaskFailed: true,
                    isViewed: false,
                  });
                } else {
                  return setByKey(old, key, {
                    key,
                    createdAt: Date.now(),
                    gelatoTaskId: taskStatus.taskId,
                    isGelatoTaskFailed: true,
                    isViewed: false,
                  });
                }
              });

              if (pendingExpressParams?.errorMessage) {
                helperToast.error(pendingExpressParams.errorMessage);
              }
            });

            pendingExpressParams?.pendingPositionsKeys?.forEach((key) => {
              setByKey(pendingPositionsUpdates, key, undefined);
            });

            setByKey(pendingExpressTxnParams, taskStatus.taskId, undefined);

            break;
          }
          default:
            break;
        }

        const config = getTenderlyConfig();

        const accountParams = config
          ? `&tenderlyUsername=${config.accountSlug}&tenderlyProjectName=${config.projectSlug}`
          : "";

        const debugRes = await fetch(
          `https://api.gelato.digital/tasks/status/${taskStatus.taskId}/debug${accountParams}`,
          {
            method: "GET",
          }
        );

        const debugData = await debugRes.json();

        if (isDevelopment()) {
          // eslint-disable-next-line no-console
          console.log("gelatoDebugData", taskStatus.taskState, pendingExpressParams, debugData);
        }
      }

      gelatoRelay.onTaskStatusUpdate(handleTaskStatusUpdate);

      return () => {
        gelatoRelay.offTaskStatusUpdate(handleTaskStatusUpdate);
      };
    },
    [
      pendingExpressTxnParams,
      pendingPositionsUpdates,
      refreshSubaccountData,
      resetSubaccountApproval,
      resetTokenPermits,
    ]
  );

  return <SyntheticsEventsContext.Provider value={contextState}>{children}</SyntheticsEventsContext.Provider>;
}
