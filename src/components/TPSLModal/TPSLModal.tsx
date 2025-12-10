import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";

import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
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
  isLimitDecreaseOrderType,
  isStopLossOrderType,
  isTwapOrder,
  PositionOrderInfo,
} from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { PositionInfo, formatLiquidationPrice } from "domain/synthetics/positions";
import { formatUsd } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { getMarketIndexName } from "sdk/utils/markets";
import { getOrderKeys } from "sdk/utils/orders";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";

import PlusCircleIcon from "img/ic_plus_circle.svg?react";

import { AddTPSLForm } from "./AddTPSLForm";
import { TPSLOrdersList } from "./TPSLOrdersList";

type TabType = "all" | "takeProfit" | "stopLoss";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  position: PositionInfo;
};

export function TPSLModal({ isVisible, setIsVisible, position }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);

  const isMobile = useMedia("(max-width: 1024px)");

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);

  const ordersWithErrors = usePositionOrdersWithErrors(position.key);
  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position.market.indexTokenAddress));

  const { tpOrders, slOrders, allOrders } = useMemo(() => {
    const tpOrders: PositionOrderInfo[] = [];
    const slOrders: PositionOrderInfo[] = [];

    for (const { order } of ordersWithErrors) {
      if (isTwapOrder(order)) continue;
      if (isLimitDecreaseOrderType(order.orderType)) {
        tpOrders.push(order);
      } else if (isStopLossOrderType(order.orderType)) {
        slOrders.push(order);
      }
    }

    return {
      tpOrders,
      slOrders,
      allOrders: [...tpOrders, ...slOrders],
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
      { value: "all" as TabType, label: t`All` },
      {
        value: "takeProfit" as TabType,
        label: (
          <>
            <Trans>Take Profit</Trans> {tpOrders.length > 0 ? <Badge>{tpOrders.length}</Badge> : null}
          </>
        ),
      },
      {
        value: "stopLoss" as TabType,
        label: (
          <>
            <Trans>Stop Loss</Trans> {slOrders.length > 0 ? <Badge>{slOrders.length}</Badge> : null}
          </>
        ),
      },
    ],
    [tpOrders.length, slOrders.length]
  );

  const handleCancelAll = useCallback(async () => {
    if (!signer || !provider || allOrders.length === 0) return;

    setIsCancellingAll(true);

    const orderKeys = allOrders.flatMap((order) => getOrderKeys(order));
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
        callback: makeOrderTxnCallback({}),
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
    allOrders,
    chainId,
    srcChainId,
    globalExpressParams,
    subaccount,
    makeOrderTxnCallback,
    setCancellingOrdersKeys,
  ]);

  const handleAddTPSL = useCallback(() => {
    setIsAddFormVisible(true);
  }, []);

  const positionTitle = `${position.isLong ? t`Long` : t`Short`} ${getMarketIndexName({ indexToken: position.indexToken, isSpotOnly: false })} `;

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>TP/SL: {positionTitle}</Trans>}
      className="TPSLModal"
      contentClassName="!max-w-[896px] w-[95%]"
      contentPadding={false}
      withMobileBottomPosition={true}
    >
      <div className="mt-16 flex gap-32 border-t-1/2 border-slate-600 px-20 py-12 max-md:gap-16 max-md:px-16">
        <div className="flex flex-col">
          <span className="text-body-small text-typography-secondary">
            <Trans>Entry Price</Trans>
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
            <Trans>Mark Price</Trans>
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
            <Trans>Liquidation Price</Trans>
          </span>
          <span className="text-body-medium text-red-500 numbers">
            {formatLiquidationPrice(position.liquidationPrice, {
              displayDecimals: marketDecimals,
              visualMultiplier: position.indexToken.visualMultiplier,
            }) || "..."}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-b-1/2 border-t-1/2 border-slate-600 bg-slate-800/50">
        <Tabs
          options={tabOptions}
          selectedValue={activeTab}
          onChange={setActiveTab}
          type="block"
          className="-mb-1 w-full pr-20 max-md:pr-16"
          rightContent={
            <div className="flex items-center shrink-0 gap-8 max-md:order-2 max-md:ml-auto max-md:pr-0">
              {allOrders.length > 0 && (
                <Button variant="ghost" onClick={handleCancelAll} disabled={isCancellingAll}>
                  <Trans>Cancel all</Trans>
                </Button>
              )}
              {!isMobile && (
                <Button variant="ghost" onClick={handleAddTPSL}>
                  <Trans>Add TP/SL</Trans>
                  <PlusCircleIcon className="size-16" />
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
      />

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 px-16 py-12">
          <Button variant="primary-action" className="w-full" onClick={handleAddTPSL}>
            <Trans>Add TP/SL</Trans>
          </Button>
        </div>
      )}

      <AddTPSLForm isVisible={isAddFormVisible} setIsVisible={setIsAddFormVisible} position={position} />
    </Modal>
  );
}
