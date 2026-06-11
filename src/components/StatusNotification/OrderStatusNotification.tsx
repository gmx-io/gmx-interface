import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Address, isAddressEqual, zeroAddress } from "viem";

import { getExplorerUrl } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  OrderCreatedEventData,
  OrderStatus,
  PendingOrderData,
  getGelatoTaskUrl,
  getPendingOrderKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { MarketsInfoData } from "domain/synthetics/markets";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isLimitSwapOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { getNameByOrderType } from "domain/synthetics/positions";
import { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { useTradeHistory } from "domain/synthetics/tradeHistory/useTradeHistory";
import { isFullPositionCloseSizeDeltaUsd } from "domain/tpsl/utils";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import useWallet from "lib/wallets/useWallet";
import { getTokenVisualMultiplier, getWrappedToken } from "sdk/configs/tokens";
import type { TradeAction } from "sdk/utils/tradeHistory/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { useToastAutoClose } from "./useToastAutoClose";

// eslint-disable-next-line import/order
import { StatusCode } from "sdk/utils/gelatoRelay";
import "./StatusNotification.scss";

type Props = {
  toastTimestamp: number;
  pendingOrderData: PendingOrderData;
  fallbackOrderStatus?: OrderStatus;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  hideTxLink?: "creation" | "execution" | "none";
};

function OrderStatusNotification({
  pendingOrderData,
  fallbackOrderStatus,
  marketsInfoData,
  tokensData,
  toastTimestamp,
  hideTxLink = "none",
}: Props) {
  const { chainId } = useChainId();
  const wrappedNativeToken = getWrappedToken(chainId);
  const { orderStatuses, setOrderStatusViewed, pendingExpressTxns, gelatoTaskStatuses, updatePendingExpressTxn } =
    useSyntheticsEvents();
  const { tenderlyAccountSlug, tenderlyProjectSlug } = useSettings();

  const [orderStatusKey, setOrderStatusKey] = useState<string>();
  const [pendingExpressTxnKey, setPendingExpressTxnKey] = useState<string>();

  const contractOrderKey = pendingOrderData.orderKey;
  const pendingOrderKey = useMemo(() => getPendingOrderKey(pendingOrderData), [pendingOrderData]);
  const orderStatus = getByKey(orderStatuses, orderStatusKey) ?? fallbackOrderStatus;

  const pendingExpressTxn = getByKey(pendingExpressTxns, pendingExpressTxnKey);

  const isGelatoTaskFailed = useMemo(() => {
    if (pendingExpressTxn?.sendFailed) {
      return true;
    }

    const gelatoTaskStatus = getByKey(gelatoTaskStatuses, pendingExpressTxn?.taskId);

    return gelatoTaskStatus && [StatusCode.Rejected, StatusCode.Reverted].includes(gelatoTaskStatus.statusCode);
  }, [gelatoTaskStatuses, pendingExpressTxn?.taskId, pendingExpressTxn?.sendFailed]);

  const hasError =
    isGelatoTaskFailed || (Boolean(orderStatus?.cancelledTxnHash) && pendingOrderData.txnType !== "cancel");

  const orderData = useMemo(() => {
    if (!marketsInfoData || !orderStatuses || !tokensData || !wrappedNativeToken) {
      return undefined;
    }

    const marketInfo = getByKey(marketsInfoData, pendingOrderData.marketAddress);
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfoData,
      initialCollateralAddress: pendingOrderData.initialCollateralTokenAddress,
      swapPath: pendingOrderData.swapPath,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      shouldUnwrapNativeToken: pendingOrderData.shouldUnwrapNativeToken,
      isIncrease: isIncreaseOrderType(pendingOrderData.orderType),
    });
    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    const externalSwapFromToken = getByKey(tokensData, pendingOrderData.externalSwapQuote?.inTokenAddress);
    const externalSwapToToken = getByKey(tokensData, pendingOrderData.externalSwapQuote?.outTokenAddress);

    const initialCollateralToken =
      pendingOrderData.externalSwapQuote && externalSwapFromToken
        ? externalSwapFromToken
        : getByKey(tokensData, pendingOrderData.initialCollateralTokenAddress);
    const initialCollateralDeltaAmount = pendingOrderData.externalSwapQuote
      ? pendingOrderData.externalSwapQuote.amountIn
      : pendingOrderData.initialCollateralDeltaAmount;

    return {
      ...pendingOrderData,
      marketInfo,
      initialCollateralToken,
      initialCollateralDeltaAmount,
      targetCollateralToken,
      externalSwapFromToken,
      externalSwapToToken,
    };
  }, [marketsInfoData, orderStatuses, pendingOrderData, tokensData, wrappedNativeToken]);

  const title = useMemo(() => {
    if (!orderData) {
      return t`Unknown order`;
    }

    if (isSwapOrderType(orderData.orderType)) {
      const {
        initialCollateralToken,
        targetCollateralToken,
        initialCollateralDeltaAmount,
        minOutputAmount,
        expectedOutputAmount,
      } = orderData;

      let orderTypeText = isLimitSwapOrderType(orderData.orderType) ? t`Limit Swap` : t`Swap`;

      if (orderData.isTwap) {
        orderTypeText = t`TWAP Swap`;
      }

      const outputAmount =
        expectedOutputAmount !== undefined && expectedOutputAmount > 0n ? expectedOutputAmount : minOutputAmount;

      return t`${orderTypeText} ${formatTokenAmount(
        initialCollateralDeltaAmount,
        initialCollateralToken?.decimals,
        initialCollateralToken?.symbol,
        { isStable: initialCollateralToken?.isStable }
      )} for ${formatTokenAmount(outputAmount, targetCollateralToken?.decimals, targetCollateralToken?.symbol, {
        isStable: targetCollateralToken?.isStable,
      })}`;
    } else {
      const {
        txnType,
        marketInfo,
        sizeDeltaUsd,
        orderType,
        isLong,
        initialCollateralDeltaAmount,
        initialCollateralToken,
      } = orderData;

      const visualMultiplierPrefix = marketInfo?.indexToken ? getTokenVisualMultiplier(marketInfo.indexToken) : "";
      const indexTokenText = `${visualMultiplierPrefix}${marketInfo?.indexToken.symbol}`;

      if (sizeDeltaUsd == 0n) {
        const symbol = orderData.shouldUnwrapNativeToken
          ? initialCollateralToken?.baseSymbol
          : initialCollateralToken?.symbol;
        const amountText = formatTokenAmount(initialCollateralDeltaAmount, initialCollateralToken?.decimals, symbol, {
          isStable: initialCollateralToken?.isStable,
        });

        if (isIncreaseOrderType(orderType)) {
          return isLong
            ? t`Depositing ${amountText} to ${indexTokenText} Long...`
            : t`Depositing ${amountText} to ${indexTokenText} Short...`;
        } else {
          return isLong
            ? t`Withdrawing ${amountText} from ${indexTokenText} Long...`
            : t`Withdrawing ${amountText} from ${indexTokenText} Short...`;
        }
      } else {
        if (isMarketOrderType(orderType)) {
          const sizeDeltaUsdText = formatUsd(sizeDeltaUsd);

          if (isIncreaseOrderType(orderType)) {
            return isLong
              ? t`Increasing ${indexTokenText} Long: +${sizeDeltaUsdText}`
              : t`Increasing ${indexTokenText} Short: +${sizeDeltaUsdText}`;
          }

          return isLong
            ? t`Decreasing ${indexTokenText} Long: -${sizeDeltaUsdText}`
            : t`Decreasing ${indexTokenText} Short: -${sizeDeltaUsdText}`;
        } else {
          const longShortText = isLong ? t`Long` : t`Short`;
          const txnTypeText = {
            create: t`Create`,
            cancel: t`Cancel`,
            update: t`Update`,
          }[txnType];

          const orderTypeText = t`${txnTypeText} ${getNameByOrderType(orderType, orderData.isTwap, {
            abbr: true,
            lower: true,
          })} order for`;
          const sign = isIncreaseOrderType(orderType) ? "+" : "-";
          const sizeText =
            isTriggerDecreaseOrderType(orderType) && isFullPositionCloseSizeDeltaUsd(sizeDeltaUsd)
              ? t`Full position close`
              : `${sign}${formatUsd(sizeDeltaUsd)}`;

          return t`${orderTypeText} ${visualMultiplierPrefix}${marketInfo?.indexToken?.symbol} ${longShortText}: ${sizeText}`;
        }
      }
    }
  }, [orderData]);

  const externalSwapStatus = useMemo(() => {
    if (!orderData?.externalSwapQuote) {
      return null;
    }

    if (isSwapOrderType(orderData.orderType)) {
      return null;
    }

    let status: TransactionStatusType = "loading";
    let text = t`Swap ${formatTokenAmount(
      orderData.externalSwapQuote.amountIn,
      orderData.externalSwapFromToken?.decimals,
      orderData.externalSwapFromToken?.symbol,
      { isStable: orderData.externalSwapFromToken?.isStable }
    )} for ${formatTokenAmount(
      orderData.externalSwapQuote.amountOut,
      orderData.externalSwapToToken?.decimals,
      orderData.externalSwapToToken?.symbol,
      { isStable: orderData.externalSwapToToken?.isStable }
    )}`;

    if (orderStatus?.createdTxnHash) {
      status = "success";
    } else if (isGelatoTaskFailed) {
      status = "error";
    }

    return <TransactionStatus status={status} txnHash={undefined} text={text} />;
  }, [orderData, orderStatus?.createdTxnHash, isGelatoTaskFailed]);

  const sendingStatus = useMemo(() => {
    let text = t`Sending order request...`;
    let status: TransactionStatusType = "loading";
    let txnHash: string | undefined;
    let txnLink: string | undefined;
    let isCompleted = false;

    if (orderData?.txnType === "create") {
      isCompleted = Boolean(
        orderStatus?.createdTxnHash ?? orderStatus?.executedTxnHash ?? orderStatus?.cancelledTxnHash
      );
    } else if (orderData?.txnType === "update") {
      isCompleted = Boolean(orderStatus?.updatedTxnHash);
    } else if (orderData?.txnType === "cancel") {
      isCompleted = Boolean(orderStatus?.cancelledTxnHash);
    }

    if (isGelatoTaskFailed) {
      status = "error";
      text = t`Relayer request failed`;
      txnLink = pendingExpressTxn?.taskId
        ? getGelatoTaskUrl({
            taskId: pendingExpressTxn.taskId,
            isDebug: true,
            tenderlyAccountSlug,
            tenderlyProjectSlug,
          })
        : undefined;
    } else if (isCompleted) {
      status = "success";
      text = t`Order request sent`;
      txnHash = hideTxLink !== "creation" && orderData?.txnType === "create" ? orderStatus?.createdTxnHash : undefined;
    }

    return <TransactionStatus status={status} txnHash={txnHash} txnLink={txnLink} text={text} />;
  }, [
    orderData?.txnType,
    isGelatoTaskFailed,
    orderStatus?.createdTxnHash,
    orderStatus?.executedTxnHash,
    orderStatus?.updatedTxnHash,
    orderStatus?.cancelledTxnHash,
    tenderlyAccountSlug,
    tenderlyProjectSlug,
    pendingExpressTxn?.taskId,
    hideTxLink,
  ]);

  const executionStatus = useMemo(() => {
    if (!orderData || !isMarketOrderType(orderData?.orderType)) {
      return null;
    }

    let text = t`Fulfilling order request...`;
    let status: TransactionStatusType = "muted";
    let txnHash: string | undefined;

    if (orderStatus?.createdTxnHash) {
      status = "loading";
    }

    if (orderStatus?.executedTxnHash) {
      text = t`Order filled`;
      status = "success";
      txnHash = orderStatus?.executedTxnHash;
    }

    if (orderStatus?.cancelledTxnHash) {
      text = t`Order canceled`;
      txnHash = orderStatus?.cancelledTxnHash;

      if (orderData?.txnType !== "cancel") {
        status = "error";
      }
    }

    return <TransactionStatus status={status} txnHash={hideTxLink !== "execution" ? txnHash : undefined} text={text} />;
  }, [orderData, orderStatus?.cancelledTxnHash, orderStatus?.createdTxnHash, orderStatus?.executedTxnHash, hideTxLink]);

  useEffect(
    function getOrderStatusKey() {
      if (orderStatusKey) {
        return;
      }

      const matchedStatusKey = Object.values(orderStatuses).find((orderStatus) => {
        if (orderStatus.isViewed) return false;
        if (contractOrderKey && orderStatus.key === contractOrderKey) return true;
        if (orderStatus.data && getPendingOrderKey(orderStatus.data) === pendingOrderKey) return true;
        return orderStatus.key === pendingOrderKey;
      })?.key;

      if (matchedStatusKey) {
        setOrderStatusKey(matchedStatusKey);
        setOrderStatusViewed(matchedStatusKey);
      }
    },
    [
      orderStatus,
      contractOrderKey,
      orderStatusKey,
      orderStatuses,
      pendingOrderKey,
      setOrderStatusViewed,
      toastTimestamp,
    ]
  );

  useEffect(
    function getPendingExpressTxnKey() {
      if (pendingExpressTxnKey) {
        return;
      }

      const matchedPendingExpressTxnKey = Object.values(pendingExpressTxns).find((pendingExpressTxn) => {
        return (
          pendingExpressTxn.pendingOrdersKeys?.includes(pendingOrderKey) &&
          pendingExpressTxn.createdAt &&
          pendingExpressTxn.createdAt === pendingOrderData.createdAt &&
          pendingExpressTxn.taskId &&
          !pendingExpressTxn.isViewed
        );
      })?.key;

      if (matchedPendingExpressTxnKey) {
        setPendingExpressTxnKey(matchedPendingExpressTxnKey);
        updatePendingExpressTxn({ key: matchedPendingExpressTxnKey, isViewed: true });
      }
    },
    [pendingExpressTxns, pendingOrderKey, pendingExpressTxnKey, updatePendingExpressTxn, pendingOrderData.createdAt]
  );

  useEffect(() => {
    if (hasError) {
      toast.update(toastTimestamp, { type: "error" });
    }
  }, [hasError, toastTimestamp]);

  return (
    <div className={cx("StatusNotification")}>
      <div className="relative z-[1]">
        <div className={cx("StatusNotification-title")}>{title}</div>

        <div className="mt-10">
          {externalSwapStatus}
          {sendingStatus}
          {executionStatus}
        </div>
      </div>
    </div>
  );
}

export function OrdersStatusNotificiation({
  pendingOrderData,
  marketsInfoData,
  tokensData,
  toastTimestamp,
}: {
  pendingOrderData: PendingOrderData | PendingOrderData[];
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  toastTimestamp: number;
}) {
  const { setPendingTxns } = usePendingTxns();
  const [isCancelOrderProcessing, setIsCancelOrderProcessing] = useState(false);
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const { orderStatuses: allOrderStatuses, setOrderStatusViewed } = useSyntheticsEvents();
  const pendingOrders = useMemo(
    () => (Array.isArray(pendingOrderData) ? pendingOrderData : [pendingOrderData]),
    [pendingOrderData]
  );

  const [matchedOrderStatusKeys, setMatchedOrderStatusKeys] = useState<string[]>([]);

  const backfillParams = useMemo(() => getMarketOrderExecutionBackfillParams(pendingOrders), [pendingOrders]);
  const { tradeActions: executionBackfillActions } = useTradeHistory(chainId, {
    account: backfillParams?.account,
    pageSize: MARKET_ORDER_EXECUTION_BACKFILL_PAGE_SIZE,
    fromTxTimestamp: backfillParams?.fromTxTimestamp,
    orderEventCombinations: backfillParams?.orderEventCombinations,
    refreshInterval: backfillParams ? MARKET_ORDER_EXECUTION_BACKFILL_REFRESH_INTERVAL : undefined,
  });

  const backfilledOrderStatusesByPendingKey = useMemo(
    () => getBackfilledOrderStatusesByPendingKey(pendingOrders, executionBackfillActions),
    [executionBackfillActions, pendingOrders]
  );

  const matchedOrderStatuses = useMemo(() => {
    const statuses = matchedOrderStatusKeys.map((key) => allOrderStatuses[key]).filter(defined);
    const statusKeys = new Set(statuses.map((status) => status.key));

    backfilledOrderStatusesByPendingKey.forEach((status) => {
      if (!statusKeys.has(status.key)) {
        statuses.push(status);
      }
    });

    return statuses;
  }, [allOrderStatuses, backfilledOrderStatusesByPendingKey, matchedOrderStatusKeys]);

  const [ordersByPendingKey, ordersByContractKey] = useMemo(() => {
    const ordersByPendingKey = new Map<string, PendingOrderData>();
    const ordersByContractKey = new Map<string, PendingOrderData>();
    pendingOrders.forEach((order) => {
      if (order.orderKey) {
        ordersByContractKey.set(order.orderKey, order);
      }

      const key = getPendingOrderKey(order);
      ordersByPendingKey.set(key, order);
    });
    return [ordersByPendingKey, ordersByContractKey];
  }, [pendingOrders]);

  useEffect(() => {
    Object.values(allOrderStatuses).forEach((orderStatus) => {
      const isPendingOrderMatch = orderStatus.data && ordersByPendingKey.has(getPendingOrderKey(orderStatus.data));
      const isContractOrderMatch = ordersByContractKey.has(orderStatus.key);

      if (orderStatus.isViewed || (!isPendingOrderMatch && !isContractOrderMatch)) return;

      setMatchedOrderStatusKeys((prev) => [...prev, orderStatus.key]);
      setOrderStatusViewed(orderStatus.key);
    });
  }, [allOrderStatuses, ordersByPendingKey, ordersByContractKey, setOrderStatusViewed]);

  const isCompleted = useMemo(() => {
    return pendingOrders.every((pendingOrder) => {
      const orderStatus = matchedOrderStatuses.find((status) => {
        const isPendingOrderMatch = status.data && getPendingOrderKey(pendingOrder) === getPendingOrderKey(status.data);
        const isContractOrderMatch = pendingOrder.orderKey && pendingOrder.orderKey === status.key;

        return isPendingOrderMatch || isContractOrderMatch;
      });

      if (pendingOrder.txnType === "create") {
        return isMarketOrderType(pendingOrder.orderType)
          ? Boolean(orderStatus?.executedTxnHash)
          : Boolean(orderStatus?.createdTxnHash);
      }
      if (pendingOrder.txnType === "update") {
        return Boolean(orderStatus?.updatedTxnHash);
      }
      if (pendingOrder.txnType === "cancel") {
        return Boolean(orderStatus?.cancelledTxnHash);
      }

      mustNeverExist(pendingOrder.txnType);
    });
  }, [matchedOrderStatuses, pendingOrders]);

  const isMainOrderFailed = useMemo(() => {
    return pendingOrders.some((pendingOrder) => {
      if (isMarketOrderType(pendingOrder.orderType) || isLimitOrderType(pendingOrder.orderType)) {
        const orderStatus = findMatchedOrderStatus(matchedOrderStatuses, pendingOrder);

        return pendingOrder.txnType === "create" && orderStatus?.cancelledTxnHash !== undefined;
      }
      return false;
    });
  }, [matchedOrderStatuses, pendingOrders]);

  const newlyCreatedTriggerOrders = useMemo(() => {
    return pendingOrders.reduce((result, order) => {
      if (isTriggerDecreaseOrderType(order.orderType) && !order.isTwap && order.txnType === "create") {
        const orderStatus = findMatchedOrderStatus(matchedOrderStatuses, order);

        if (orderStatus?.createdTxnHash && orderStatus?.key) {
          result.push(order);
        }
      }
      return result;
    }, [] as PendingOrderData[]);
  }, [matchedOrderStatuses, pendingOrders]);

  const onCancelOrdersClick = useCallback(async () => {
    if (!signer || !newlyCreatedTriggerOrders.length || !setPendingTxns) return;

    setIsCancelOrderProcessing(true);
    cancelOrdersTxn(chainId, signer, {
      orders: newlyCreatedTriggerOrders
        .map((order) =>
          order.orderKey && !order.isTwap
            ? {
                key: order.orderKey,
                isTwap: order.isTwap,
                orderType: order.orderType,
                orders: [],
              }
            : undefined
        )
        .filter(defined),
      setPendingTxns,
    }).finally(() => setIsCancelOrderProcessing(false));
  }, [chainId, newlyCreatedTriggerOrders, setPendingTxns, signer]);

  const createdTxnHashList = useMemo(() => {
    const uniqueHashSet = pendingOrders.reduce((acc, order) => {
      const orderStatus = findMatchedOrderStatus(matchedOrderStatuses, order);

      if (orderStatus?.createdTxnHash && order.txnType === "create") {
        acc.add(orderStatus.createdTxnHash);
      }
      return acc;
    }, new Set<string>());

    const uniqueHashList = Array.from(uniqueHashSet);

    if (uniqueHashList.length > 0) {
      return uniqueHashList;
    }
  }, [matchedOrderStatuses, pendingOrders]);

  useToastAutoClose(isCompleted, toastTimestamp);

  return (
    <div className="StatusNotification-wrapper">
      <div className="StatusNotification-list">
        {pendingOrders.map((order, index) => {
          return (
            <OrderStatusNotification
              key={index}
              pendingOrderData={order}
              fallbackOrderStatus={backfilledOrderStatusesByPendingKey.get(getPendingOrderKey(order))}
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              toastTimestamp={toastTimestamp}
              hideTxLink={pendingOrders.length > 1 ? "creation" : "none"}
            />
          );
        })}
      </div>
      {pendingOrders.length > 1 &&
        ((isMainOrderFailed && newlyCreatedTriggerOrders.length > 0) ||
          (createdTxnHashList && createdTxnHashList.length > 0)) && (
          <div className="StatusNotification-actions">
            <div>
              {isMainOrderFailed && newlyCreatedTriggerOrders.length > 0 && (
                <button
                  disabled={isCancelOrderProcessing}
                  onClick={onCancelOrdersClick}
                  className="StatusNotification-cancel-all"
                >
                  {t`Cancel new orders`}
                </button>
              )}
            </div>
            <div className="inline-flex items-center">
              {createdTxnHashList?.map((txnHash) => (
                <ExternalLink
                  key={txnHash}
                  className="ml-10 !text-typography-primary"
                  href={`${getExplorerUrl(chainId)}tx/${txnHash}`}
                >
                  {t`View`}
                </ExternalLink>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function findMatchedOrderStatus(orderList: OrderStatus[], orderData: PendingOrderData) {
  const matchingOrderKey = getPendingOrderKey(orderData);

  return orderList.find((status) => {
    const isPendingOrderMatch = status.data && matchingOrderKey === getPendingOrderKey(status.data);
    const isContractOrderMatch = orderData.orderKey && orderData.orderKey === status.key;

    return isPendingOrderMatch || isContractOrderMatch;
  });
}

const MARKET_ORDER_EXECUTION_BACKFILL_LOOKBACK_SECONDS = 60;
const MARKET_ORDER_EXECUTION_BACKFILL_PAGE_SIZE = 30;
const MARKET_ORDER_EXECUTION_BACKFILL_REFRESH_INTERVAL = 5000;

export function getMarketOrderExecutionBackfillParams(pendingOrders: PendingOrderData[]) {
  const pendingMarketCreateOrders = pendingOrders.filter(
    (order) => order.txnType === "create" && isMarketOrderType(order.orderType)
  );

  if (pendingMarketCreateOrders.length === 0) {
    return undefined;
  }

  const account = pendingMarketCreateOrders[0].account;
  const createdAt = Math.min(...pendingMarketCreateOrders.map((order) => order.createdAt));
  const orderTypes = Array.from(new Set(pendingMarketCreateOrders.map((order) => order.orderType)));

  return {
    account,
    fromTxTimestamp: Math.max(0, Math.floor(createdAt / 1000) - MARKET_ORDER_EXECUTION_BACKFILL_LOOKBACK_SECONDS),
    orderEventCombinations: [
      {
        eventName: TradeActionType.OrderExecuted,
        orderType: orderTypes,
      },
    ],
  };
}

export function getBackfilledOrderStatusesByPendingKey(
  pendingOrders: PendingOrderData[],
  tradeActions: TradeAction[] | undefined
) {
  const statuses = new Map<string, OrderStatus>();

  if (!tradeActions) {
    return statuses;
  }

  pendingOrders.forEach((pendingOrder) => {
    if (pendingOrder.txnType !== "create" || !isMarketOrderType(pendingOrder.orderType)) {
      return;
    }

    const matchingAction = tradeActions.find((tradeAction) =>
      getIsTradeActionMatchingPendingOrder(tradeAction, pendingOrder)
    );

    if (!matchingAction) {
      return;
    }

    statuses.set(getPendingOrderKey(pendingOrder), {
      key: matchingAction.orderKey,
      data: getOrderCreatedDataFromPendingOrder(pendingOrder, matchingAction.orderKey),
      createdAt: pendingOrder.createdAt,
      executedTxnHash: matchingAction.transactionHash,
    });
  });

  return statuses;
}

function getIsTradeActionMatchingPendingOrder(tradeAction: TradeAction, pendingOrder: PendingOrderData) {
  const tradeActionMarketAddress = "marketAddress" in tradeAction ? tradeAction.marketAddress : zeroAddress;
  const tradeActionSizeDeltaUsd = "sizeDeltaUsd" in tradeAction ? tradeAction.sizeDeltaUsd : 0n;
  const tradeActionIsLong = "isLong" in tradeAction ? tradeAction.isLong : pendingOrder.isLong;

  return (
    tradeAction.eventName === TradeActionType.OrderExecuted &&
    tradeAction.orderType === pendingOrder.orderType &&
    tradeActionIsLong === pendingOrder.isLong &&
    tradeActionSizeDeltaUsd === pendingOrder.sizeDeltaUsd &&
    tradeAction.shouldUnwrapNativeToken === pendingOrder.shouldUnwrapNativeToken &&
    areAddressesEqual(tradeAction.account, pendingOrder.account) &&
    areAddressesEqual(tradeActionMarketAddress, pendingOrder.marketAddress) &&
    areAddressesEqual(tradeAction.initialCollateralTokenAddress, pendingOrder.initialCollateralTokenAddress) &&
    areAddressArraysEqual(tradeAction.swapPath, pendingOrder.swapPath)
  );
}

function getOrderCreatedDataFromPendingOrder(pendingOrder: PendingOrderData, orderKey: string): OrderCreatedEventData {
  return {
    key: orderKey,
    account: pendingOrder.account,
    receiver: pendingOrder.account,
    callbackContract: zeroAddress,
    marketAddress: pendingOrder.marketAddress,
    initialCollateralTokenAddress: pendingOrder.initialCollateralTokenAddress,
    swapPath: pendingOrder.swapPath,
    sizeDeltaUsd: pendingOrder.sizeDeltaUsd,
    initialCollateralDeltaAmount: pendingOrder.initialCollateralDeltaAmount,
    contractTriggerPrice: pendingOrder.triggerPrice,
    contractAcceptablePrice: pendingOrder.acceptablePrice,
    executionFee: 0n,
    callbackGasLimit: 0n,
    minOutputAmount: pendingOrder.minOutputAmount,
    updatedAtBlock: 0n,
    orderType: pendingOrder.orderType,
    isLong: pendingOrder.isLong,
    shouldUnwrapNativeToken: pendingOrder.shouldUnwrapNativeToken,
    isFrozen: false,
    uiFeeReceiver: zeroAddress,
    externalSwapQuote: undefined,
    isTwap: pendingOrder.isTwap,
  };
}

function areAddressArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((address, index) => areAddressesEqual(address, b[index]));
}

function areAddressesEqual(a: string, b: string | undefined) {
  return b !== undefined && isAddressEqual(a as Address, b as Address);
}
