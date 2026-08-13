import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { getExplorerUrl } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { PendingOrderData, getGelatoTaskUrl, getPendingOrderKey, useSyntheticsEvents } from "context/SyntheticsEvents";
import { findOrderStatusForAllocation } from "context/SyntheticsEvents/utils";
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
import { isMarginDepositOrder } from "domain/synthetics/orders/marginDeposit";
import { getNameByOrderType } from "domain/synthetics/positions";
import { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { isFullPositionCloseSizeDeltaUsd } from "domain/tpsl/utils";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import useWallet from "lib/wallets/useWallet";
import { getTokenVisualMultiplier, getWrappedToken } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { useToastAutoClose } from "./useToastAutoClose";

// eslint-disable-next-line import/order
import { StatusCode } from "sdk/utils/gelatoRelay";
import "./StatusNotification.scss";

type Props = {
  toastTimestamp: number;
  pendingOrderData: PendingOrderData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  hideTxLink?: "creation" | "execution" | "none";
};

function OrderStatusNotification({
  pendingOrderData,
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

  const pendingOrderKey = useMemo(() => getPendingOrderKey(pendingOrderData), [pendingOrderData]);
  const orderStatus = getByKey(orderStatuses, orderStatusKey);

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

        if (isMarginDepositOrder(orderData)) {
          const longShortText = isLong ? t`Long` : t`Short`;
          const txnTypeText = {
            create: t`Create`,
            cancel: t`Cancel`,
            update: t`Update`,
          }[txnType];

          return t`${txnTypeText} margin deposit: ${amountText} to ${indexTokenText} ${longShortText}`;
        }

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

      const matchingOrderStatuses = Object.values(orderStatuses).filter((orderStatus) => {
        if (orderStatus.isViewed) return false;
        if (orderStatus.cancelledTxnHash && pendingOrderData.txnType !== "cancel") return false;

        return true;
      });
      const matchedStatusKey = findOrderStatusForAllocation(matchingOrderStatuses, pendingOrderData)?.key;

      if (matchedStatusKey) {
        setOrderStatusKey(matchedStatusKey);
        setOrderStatusViewed(matchedStatusKey);
      }
    },
    [orderStatus, orderStatusKey, orderStatuses, pendingOrderData, setOrderStatusViewed, toastTimestamp]
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

  const [matchedOrderStatusKeys, setMatchedOrderStatusKeys] = useState<Record<string, string>>({});

  const getPendingOrderActionKey = useCallback((order: PendingOrderData) => {
    return `${order.txnType}:${order.orderKey ?? getPendingOrderKey(order)}`;
  }, []);

  const getMatchedOrderStatus = useCallback(
    (order: PendingOrderData) => {
      const statusKey = matchedOrderStatusKeys[getPendingOrderActionKey(order)];

      return statusKey ? allOrderStatuses[statusKey] : undefined;
    },
    [allOrderStatuses, getPendingOrderActionKey, matchedOrderStatusKeys]
  );

  const [ordersByPendingKey, ordersByContractKey] = useMemo(() => {
    const ordersByPendingKey = new Map<string, PendingOrderData>();
    const ordersByContractKey = new Map<string, PendingOrderData>();
    pendingOrders.forEach((order) => {
      if (order.orderKey) {
        ordersByContractKey.set(order.orderKey, order);
      } else {
        const key = getPendingOrderKey(order);
        ordersByPendingKey.set(key, order);
      }
    });
    return [ordersByPendingKey, ordersByContractKey];
  }, [pendingOrders]);

  useEffect(() => {
    const allocatedOrderActionKeys = new Set(Object.keys(matchedOrderStatusKeys));

    Object.values(allOrderStatuses).forEach((orderStatus) => {
      const matchedPendingOrder =
        ordersByContractKey.get(orderStatus.key) ??
        (orderStatus.data ? ordersByPendingKey.get(getPendingOrderKey(orderStatus.data)) : undefined);

      if (orderStatus.isViewed || !matchedPendingOrder) return;
      if (!findOrderStatusForAllocation([orderStatus], matchedPendingOrder)) return;
      if (orderStatus.cancelledTxnHash && matchedPendingOrder.txnType !== "cancel") return;

      const pendingOrderActionKey = getPendingOrderActionKey(matchedPendingOrder);
      if (allocatedOrderActionKeys.has(pendingOrderActionKey)) return;

      allocatedOrderActionKeys.add(pendingOrderActionKey);
      setMatchedOrderStatusKeys((prev) => ({ ...prev, [pendingOrderActionKey]: orderStatus.key }));
      setOrderStatusViewed(orderStatus.key);
    });
  }, [
    allOrderStatuses,
    getPendingOrderActionKey,
    matchedOrderStatusKeys,
    ordersByPendingKey,
    ordersByContractKey,
    setOrderStatusViewed,
  ]);

  const isCompleted = useMemo(() => {
    return pendingOrders.every((pendingOrder) => {
      const orderStatus = getMatchedOrderStatus(pendingOrder);

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
  }, [getMatchedOrderStatus, pendingOrders]);

  const isMainOrderFailed = useMemo(() => {
    return pendingOrders.some((pendingOrder) => {
      if (isMarketOrderType(pendingOrder.orderType) || isLimitOrderType(pendingOrder.orderType)) {
        const orderStatus = getMatchedOrderStatus(pendingOrder);

        return pendingOrder.txnType === "create" && orderStatus?.cancelledTxnHash !== undefined;
      }
      return false;
    });
  }, [getMatchedOrderStatus, pendingOrders]);

  const newlyCreatedTriggerOrders = useMemo(() => {
    return pendingOrders.reduce((result, order) => {
      if (isTriggerDecreaseOrderType(order.orderType) && !order.isTwap && order.txnType === "create") {
        const orderStatus = getMatchedOrderStatus(order);

        if (orderStatus?.createdTxnHash && orderStatus?.key) {
          result.push(order);
        }
      }
      return result;
    }, [] as PendingOrderData[]);
  }, [getMatchedOrderStatus, pendingOrders]);

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
      const orderStatus = getMatchedOrderStatus(order);

      if (orderStatus?.createdTxnHash && order.txnType === "create") {
        acc.add(orderStatus.createdTxnHash);
      }
      return acc;
    }, new Set<string>());

    const uniqueHashList = Array.from(uniqueHashSet);

    if (uniqueHashList.length > 0) {
      return uniqueHashList;
    }
  }, [getMatchedOrderStatus, pendingOrders]);

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
