import { t } from "@lingui/macro";
import cx from "classnames";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import { getWrappedToken } from "config/tokens";
import { OrderStatus, PendingOrderData, getPendingOrderKey, useSyntheticsEvents } from "context/SyntheticsEvents";
import { MarketsInfoData } from "domain/synthetics/markets";
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isLimitSwapOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useEffect, useMemo, useState } from "react";
import "./StatusNotification.scss";
import { useToastAutoClose } from "./useToastAutoClose";
import { getTriggerNameByOrderType } from "domain/synthetics/positions";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import useWallet from "lib/wallets/useWallet";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { getExplorerUrl } from "config/chains";
import { SetPendingTransactions } from "domain/legacy";
import { mustNeverExist } from "lib/types";

type Props = {
  toastTimestamp: number;
  pendingOrderData: PendingOrderData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  hideTxLink?: "creation" | "execution" | "none";
};

export function OrderStatusNotification({
  pendingOrderData,
  marketsInfoData,
  tokensData,
  toastTimestamp,
  hideTxLink = "none",
}: Props) {
  const { chainId } = useChainId();
  const wrappedNativeToken = getWrappedToken(chainId);
  const { orderStatuses, setOrderStatusViewed } = useSyntheticsEvents();

  const [orderStatusKey, setOrderStatusKey] = useState<string>();

  const contractOrderKey = pendingOrderData.orderKey;
  const pendingOrderKey = useMemo(() => getPendingOrderKey(pendingOrderData), [pendingOrderData]);
  const orderStatus = getByKey(orderStatuses, orderStatusKey);

  const hasError = Boolean(orderStatus?.cancelledTxnHash) && pendingOrderData.txnType !== "cancel";

  const orderData = useMemo(() => {
    if (!marketsInfoData || !orderStatuses || !tokensData || !wrappedNativeToken) {
      return undefined;
    }

    const marketInfo = getByKey(marketsInfoData, pendingOrderData.marketAddress);
    const initialCollateralToken = getByKey(tokensData, pendingOrderData.initialCollateralTokenAddress);
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfoData,
      initialCollateralAddress: pendingOrderData.initialCollateralTokenAddress,
      swapPath: pendingOrderData.swapPath,
      wrappedNativeTokenAddress: wrappedNativeToken.address,
      shouldUnwrapNativeToken: pendingOrderData.shouldUnwrapNativeToken,
      isIncrease: isIncreaseOrderType(pendingOrderData.orderType),
    });
    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    return {
      ...pendingOrderData,
      marketInfo,
      initialCollateralToken,
      targetCollateralToken,
    };
  }, [marketsInfoData, orderStatuses, pendingOrderData, tokensData, wrappedNativeToken]);

  const title = useMemo(() => {
    if (!orderData) {
      return t`Unknown order`;
    }

    if (isSwapOrderType(orderData.orderType)) {
      const { initialCollateralToken, targetCollateralToken, initialCollateralDeltaAmount, minOutputAmount } =
        orderData;

      const orderTypeText = isLimitSwapOrderType(orderData.orderType) ? t`Limit Swap` : t`Swap`;

      return t`${orderTypeText} ${formatTokenAmount(
        initialCollateralDeltaAmount,
        initialCollateralToken?.decimals,
        initialCollateralToken?.symbol
      )} for ${formatTokenAmount(minOutputAmount, targetCollateralToken?.decimals, targetCollateralToken?.symbol)}`;
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

      const longShortText = isLong ? t`Long` : t`Short`;
      const positionText = `${marketInfo?.indexToken.symbol} ${longShortText}`;

      if (sizeDeltaUsd == 0n) {
        const symbol = orderData.shouldUnwrapNativeToken
          ? initialCollateralToken?.baseSymbol
          : initialCollateralToken?.symbol;

        if (isIncreaseOrderType(orderType)) {
          return t`Depositing ${formatTokenAmount(
            initialCollateralDeltaAmount,
            initialCollateralToken?.decimals,
            symbol
          )} to ${positionText}`;
        } else {
          return t`Withdrawing ${formatTokenAmount(
            initialCollateralDeltaAmount,
            initialCollateralToken?.decimals,
            symbol
          )} from ${positionText}`;
        }
      } else {
        let orderTypeText = "";

        if (isMarketOrderType(orderType)) {
          orderTypeText = isIncreaseOrderType(orderType) ? t`Increasing` : t`Decreasing`;
        } else {
          const txnTypeText = {
            create: t`Create`,
            cancel: t`Cancel`,
            update: t`Update`,
          }[txnType];

          if (isLimitOrderType(orderType)) {
            orderTypeText = t`${txnTypeText} limit order for`;
          } else if (isDecreaseOrderType(orderType)) {
            orderTypeText = t`${txnTypeText} ${getTriggerNameByOrderType(orderType, true)} order for`;
          }
        }

        const sign = isIncreaseOrderType(orderType) ? "+" : "-";

        return t`${orderTypeText} ${marketInfo?.indexToken?.symbol} ${longShortText}: ${sign}${formatUsd(
          sizeDeltaUsd
        )}`;
      }
    }
  }, [orderData]);

  const sendingStatus = useMemo(() => {
    let text = t`Sending order request`;
    let status: TransactionStatusType = "loading";

    let isCompleted = false;

    if (orderData?.txnType === "create") {
      isCompleted = Boolean(orderStatus?.createdTxnHash);
    } else if (orderData?.txnType === "update") {
      isCompleted = Boolean(orderStatus?.updatedTxnHash);
    } else if (orderData?.txnType === "cancel") {
      isCompleted = Boolean(orderStatus?.cancelledTxnHash);
    }

    if (isCompleted) {
      status = "success";
      text = t`Order request sent`;
    }

    return (
      <TransactionStatus
        status={status}
        txnHash={hideTxLink !== "creation" && orderData?.txnType === "create" ? orderStatus?.createdTxnHash : undefined}
        text={text}
      />
    );
  }, [orderData, orderStatus, hideTxLink]);

  const executionStatus = useMemo(() => {
    if (!orderData || !isMarketOrderType(orderData?.orderType)) {
      return null;
    }

    let text = t`Fulfilling order request`;
    let status: TransactionStatusType = "muted";
    let txnHash: string | undefined;

    if (orderStatus?.createdTxnHash) {
      status = "loading";
    }

    if (orderStatus?.executedTxnHash) {
      text = t`Order executed`;
      status = "success";
      txnHash = orderStatus?.executedTxnHash;
    }

    if (orderStatus?.cancelledTxnHash) {
      text = t`Order cancelled`;
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
        return orderStatus.data && getPendingOrderKey(orderStatus.data) === pendingOrderKey;
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

  return (
    <div className={cx("StatusNotification", { error: hasError })}>
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">{title}</div>

        <div className="StatusNotification-items">
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
  setPendingTxns,
}: {
  pendingOrderData: PendingOrderData | PendingOrderData[];
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  toastTimestamp: number;
  setPendingTxns: SetPendingTransactions;
}) {
  const [isCancelOrderProcessing, setIsCancelOrderProcessing] = useState(false);
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const { orderStatuses: allOrderStatuses, setOrderStatusViewed } = useSyntheticsEvents();
  const pendingOrders = useMemo(
    () => (Array.isArray(pendingOrderData) ? pendingOrderData : [pendingOrderData]),
    [pendingOrderData]
  );

  const [matchedOrderStatusKeys, setMatchedOrderStatusKeys] = useState<string[]>([]);

  const matchedOrderStatuses = useMemo(
    () => matchedOrderStatusKeys.map((key) => allOrderStatuses[key]),
    [allOrderStatuses, matchedOrderStatusKeys]
  );

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

  const newlyCreatedTriggerOrderKeys = useMemo(() => {
    return pendingOrders.reduce((result, order) => {
      if (isTriggerDecreaseOrderType(order.orderType) && order.txnType === "create") {
        const orderStatus = findMatchedOrderStatus(matchedOrderStatuses, order);

        if (orderStatus?.createdTxnHash && orderStatus?.key) {
          result.push(orderStatus.key);
        }
      }
      return result;
    }, [] as string[]);
  }, [matchedOrderStatuses, pendingOrders]);

  const subaccount = useSubaccount(null, newlyCreatedTriggerOrderKeys.length);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(
    undefined,
    newlyCreatedTriggerOrderKeys.length
  );

  function onCancelOrdersClick() {
    if (!signer || !newlyCreatedTriggerOrderKeys.length || !setPendingTxns) return;

    setIsCancelOrderProcessing(true);
    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: newlyCreatedTriggerOrderKeys,
      setPendingTxns,
      detailsMsg: cancelOrdersDetailsMessage,
    }).finally(() => setIsCancelOrderProcessing(false));
  }

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
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              toastTimestamp={toastTimestamp}
              hideTxLink={pendingOrders.length > 1 ? "creation" : "none"}
            />
          );
        })}
      </div>
      {pendingOrders.length > 1 && (
        <div className="StatusNotification-actions">
          <div>
            {isMainOrderFailed && newlyCreatedTriggerOrderKeys.length > 0 && (
              <button
                disabled={isCancelOrderProcessing}
                onClick={onCancelOrdersClick}
                className="StatusNotification-cancel-all"
              >
                {t`Cancel newly created orders`}
              </button>
            )}
          </div>
          <div className="inline-flex items-center">
            {createdTxnHashList?.map((txnHash) => (
              <ExternalLink key={txnHash} className="ml-10" href={`${getExplorerUrl(chainId)}tx/${txnHash}`}>
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
