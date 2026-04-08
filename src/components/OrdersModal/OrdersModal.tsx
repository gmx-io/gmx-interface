import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { usePositionsConstants } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useCancellingOrdersKeysState,
  useEditingOrderState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectSrcChainId,
  selectSubaccountForChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import {
  isIncreaseOrderType,
  isLimitDecreaseOrderType,
  isStopLossOrderType,
  isTwapOrder,
  PositionOrderInfo,
} from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { PositionInfo, formatLiquidationPrice, getEstimatedLiquidationTimeInHours } from "domain/synthetics/positions";
import type { TokenData } from "domain/synthetics/tokens";
import { formatUsd } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useBreakpoints } from "lib/useBreakpoints";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { getMarketIndexName } from "sdk/utils/markets";
import { getOrderKeys } from "sdk/utils/orders";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";

import PlusIcon from "img/ic_plus.svg?react";

import { AddTPSLModal } from "./AddTPSLModal";
import { TPSLOrdersList } from "./TPSLOrdersList";

export type TpSlTabType = "all" | "takeProfit" | "stopLoss";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  position?: PositionInfo;
  positionKey?: string;
  isLong?: boolean;
  indexToken?: TokenData;
  /**
   * When "add", the modal opens directly into the AddTPSLModal form.
   * When "list" (default), it shows the TP/SL orders list.
   */
  initialView?: "list" | "add";
  initialTpPriceInput?: string;
  initialSlPriceInput?: string;
  initialTab?: TpSlTabType;
};

export function OrdersModal({
  isVisible,
  setIsVisible,
  position,
  positionKey: positionKeyProp,
  isLong: isLongProp,
  indexToken: indexTokenProp,
  initialView = "list",
  initialTpPriceInput,
  initialSlPriceInput,
  initialTab = "all",
}: Props) {
  const [activeTab, setActiveTab] = useState<TpSlTabType>("all");
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);

  const { isTablet } = useBreakpoints();
  const isMobile = isTablet;

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);

  const effectivePositionKey = position?.key ?? positionKeyProp;
  const effectiveIsLong = position?.isLong ?? isLongProp;
  const effectiveIndexToken = position?.indexToken ?? indexTokenProp;

  const ordersWithErrors = usePositionOrdersWithErrors(effectivePositionKey);
  const marketDecimals = useSelector(
    makeSelectMarketPriceDecimals(position?.market.indexTokenAddress ?? indexTokenProp?.address)
  );
  const { minCollateralUsd } = usePositionsConstants();
  const estimatedLiquidationHours = useMemo(
    () => (position ? getEstimatedLiquidationTimeInHours(position, minCollateralUsd) : undefined),
    [position, minCollateralUsd]
  );

  const { tpOrders, slOrders, allOrders } = useMemo(() => {
    const tpOrders: PositionOrderInfo[] = [];
    const slOrders: PositionOrderInfo[] = [];
    const increaseOrders: PositionOrderInfo[] = [];

    for (const { order } of ordersWithErrors) {
      if (isTwapOrder(order)) continue;
      if (isLimitDecreaseOrderType(order.orderType)) {
        tpOrders.push(order);
      } else if (isStopLossOrderType(order.orderType)) {
        slOrders.push(order);
      } else if (isIncreaseOrderType(order.orderType)) {
        increaseOrders.push(order);
      }
    }

    return {
      tpOrders,
      slOrders,
      allOrders: [...tpOrders, ...slOrders, ...increaseOrders],
    };
  }, [ordersWithErrors]);

  const displayedOrders = useMemo(() => {
    switch (activeTab) {
      case "takeProfit":
        return tpOrders;
      case "stopLoss":
        return slOrders;
      default:
        return allOrders;
    }
  }, [activeTab, tpOrders, slOrders, allOrders]);

  const tabOptions = useMemo(
    () => [
      { value: "all" as TpSlTabType, label: t`All` },
      {
        value: "takeProfit" as TpSlTabType,
        label: (
          <>
            <Trans>Take-Profit</Trans> {tpOrders.length > 0 ? <Badge>{tpOrders.length}</Badge> : null}
          </>
        ),
      },
      {
        value: "stopLoss" as TpSlTabType,
        label: (
          <>
            <Trans>Stop-Loss</Trans> {slOrders.length > 0 ? <Badge>{slOrders.length}</Badge> : null}
          </>
        ),
      },
    ],
    [tpOrders.length, slOrders.length]
  );

  const handleCancelAll = useCallback(async () => {
    if (!signer || !provider || displayedOrders.length === 0) return;

    setIsCancellingAll(true);

    const orderKeys = displayedOrders.flatMap((order) => getOrderKeys(order));
    setCancellingOrdersKeys((prev) => [...new Set([...prev, ...orderKeys])]);

    const batchParams = {
      createOrderParams: [],
      updateOrderParams: [],
      cancelOrderParams: orderKeys.map((k) => ({ orderKey: k })),
    };

    try {
      const expressParams = globalExpressParams
        ? await estimateBatchExpressParams({
            signer,
            chainId,
            batchParams,
            globalExpressParams,
            requireValidations: true,
            estimationMethod: "approximate",
            provider,
            isGmxAccount: srcChainId !== undefined,
            subaccount,
          })
        : undefined;

      await sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({
          actionName: "Cancel Order",
          collateralSymbol: position?.collateralToken.symbol,
        }),
        provider,
        isGmxAccount: srcChainId !== undefined,
      });
    } finally {
      setIsCancellingAll(false);
      setCancellingOrdersKeys((prev) => prev.filter((k) => !orderKeys.includes(k)));
    }
  }, [
    signer,
    provider,
    displayedOrders,
    setCancellingOrdersKeys,
    globalExpressParams,
    chainId,
    srcChainId,
    subaccount,
    makeOrderTxnCallback,
    position?.collateralToken.symbol,
  ]);

  useEffect(() => {
    if (isVisible) {
      setIsAddFormVisible(initialView === "add");
      setActiveTab(initialTab);
    } else {
      setIsAddFormVisible(false);
    }
  }, [isVisible, initialView, initialTab]);

  const handleAddTPSLOpen = useCallback(() => {
    setIsAddFormVisible(true);
  }, []);

  const handleAddFormVisibilityChange = useCallback(
    (visible: boolean) => {
      setIsAddFormVisible(visible);
      if (!visible && isVisible) {
        setIsVisible(true);
      }
    },
    [isVisible, setIsVisible]
  );

  const handleAddTPSLBack = useCallback(() => {
    setIsAddFormVisible(false);
  }, []);

  const isEditingFromOrdersModal = !!editingOrderState?.orderKey && editingOrderState.source === "OrdersModal";

  // Clean up stale state from OrderEditor's "Back" action
  useEffect(() => {
    if (editingOrderState && editingOrderState.source === "OrdersModal" && !editingOrderState.orderKey) {
      setEditingOrderState(undefined);
    }
  }, [editingOrderState, setEditingOrderState]);

  const handleEditOrder = useCallback(
    (orderKey: string) => {
      setEditingOrderState({ orderKey, source: "OrdersModal" });
    },
    [setEditingOrderState]
  );

  const positionTitle = effectiveIndexToken
    ? `${effectiveIsLong ? t`Long` : t`Short`} ${getMarketIndexName({ indexToken: effectiveIndexToken, isSpotOnly: false })} `
    : "";

  return (
    <>
      <Modal
        isVisible={isVisible && !isAddFormVisible && !isEditingFromOrdersModal}
        setIsVisible={setIsVisible}
        label={<Trans>{positionTitle} orders</Trans>}
        className="max-lg:!w-full max-lg:!items-end"
        contentClassName="!max-w-[896px] w-[95%] h-[min(90vh,500px)] min-h-[300px] max-lg:h-[85vh] max-lg:!w-full max-lg:!max-w-none"
        contentPadding={false}
        withMobileBottomPosition={true}
        takeFullHeight={true}
      >
        {position && (
          <div className="flex gap-32 px-20 py-12 max-md:gap-16 max-md:px-16">
            <div className="flex flex-col">
              <span className="text-body-small text-typography-secondary">
                <Trans>Entry price</Trans>
              </span>
              <span className="text-body-medium numbers">
                {formatUsd(position.entryPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier: position.indexToken.visualMultiplier,
                })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-body-small text-typography-secondary">
                <Trans>Mark price</Trans>
              </span>
              <span className="text-body-medium numbers">
                {formatUsd(position.markPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier: position.indexToken.visualMultiplier,
                })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-body-small text-typography-secondary">
                <Trans>Liquidation price</Trans>
              </span>
              <span
                className={cx("text-body-medium numbers", {
                  "text-yellow-300": estimatedLiquidationHours && estimatedLiquidationHours < 24 * 7,
                  "text-error-red": estimatedLiquidationHours && estimatedLiquidationHours < 24,
                })}
              >
                {formatLiquidationPrice(position.liquidationPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier: position.indexToken.visualMultiplier,
                }) || "..."}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b-1/2 border-t-1/2 border-slate-600 bg-slate-800/50">
          <Tabs
            options={tabOptions}
            selectedValue={activeTab}
            onChange={setActiveTab}
            type="block"
            className="-mb-1 w-full pr-20 max-md:pr-16"
            rightContent={
              <div className="flex shrink-0 items-center gap-8 max-md:order-2 max-md:ml-auto max-md:pr-0">
                {!isMobile && position && (
                  <Button variant="ghost" onClick={handleAddTPSLOpen}>
                    <Trans>Add TP/SL</Trans>
                    <PlusIcon className="size-16" />
                  </Button>
                )}
                {displayedOrders.length > 0 && (
                  <Button variant="ghost" onClick={handleCancelAll} disabled={isCancellingAll}>
                    <Trans>Cancel all</Trans>
                  </Button>
                )}
              </div>
            }
          />
        </div>

        <TPSLOrdersList
          orders={displayedOrders}
          position={position}
          marketDecimals={marketDecimals}
          isMobile={isMobile}
          activeTab={activeTab}
          onEdit={handleEditOrder}
          onAddTPSL={position ? handleAddTPSLOpen : undefined}
        />

        {isMobile && position && (
          <div className="fixed bottom-0 left-0 right-0 border-t-1/2 border-slate-600 bg-slate-900 px-16 py-12">
            <Button variant="primary" className="w-full" onClick={handleAddTPSLOpen}>
              <Trans>Add TP/SL</Trans>
            </Button>
          </div>
        )}
      </Modal>

      {position && (
        <AddTPSLModal
          isVisible={isAddFormVisible}
          setIsVisible={handleAddFormVisibilityChange}
          position={position}
          onBack={handleAddTPSLBack}
          initialTpPriceInput={initialTpPriceInput}
          initialSlPriceInput={initialSlPriceInput}
        />
      )}
    </>
  );
}
