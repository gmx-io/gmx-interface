import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderStatuses, PendingOrderData, RelayTaskStatus } from "context/SyntheticsEvents/types";
import { getOrderCreatedDataFromPendingOrder } from "domain/synthetics/tradeHistory/orderStatusesBackfill";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import type { PendingTpSlOrderBatch } from "domain/tpsl/types";
import { expandDecimals } from "lib/numbers";
import { StatusCode } from "sdk/utils/gelatoRelay";
import { DecreasePositionSwapType, OrderType, type PositionOrderInfo } from "sdk/utils/orders/types";
import { convertToContractPrice, parseContractPrice } from "sdk/utils/tokens";

import { OrdersModal } from "./OrdersModal";

const state = vi.hoisted(() => ({
  batches: [] as PendingTpSlOrderBatch[],
  orders: {} as Record<string, PositionOrderInfo>,
  orderStatuses: {} as OrderStatuses,
  relayTaskStatuses: {} as Record<string, RelayTaskStatus>,
  isMobile: false,
  editingOrder: vi.fn(),
  cancelOrder: vi.fn(),
  setBatches: (update: (batches: PendingTpSlOrderBatch[]) => PendingTpSlOrderBatch[]) => {
    state.batches = update(state.batches);
  },
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({
    pendingTpSlOrderBatches: state.batches,
    setPendingTpSlOrderBatches: state.setBatches,
    orderStatuses: state.orderStatuses,
    relayTaskStatuses: state.relayTaskStatuses,
  }),
}));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (selector: { name: string }) =>
    selector.name === "selectChainId" ? 42161 : selector.name === "selectOrdersInfoData" ? state.orders : undefined,
}));
vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  usePositionsConstants: () => ({}),
  useUiFeeFactor: () => 0n,
  useUserReferralInfo: () => undefined,
}));
vi.mock("context/SyntheticsStateContext/hooks/orderEditorHooks", () => ({
  useEditingOrderState: () => [undefined, state.editingOrder],
  useCancellingOrdersKeysState: () => [[], vi.fn()],
}));
vi.mock("context/SyntheticsStateContext/hooks/orderHooks", () => ({
  usePositionOrdersWithErrors: () => Object.values(state.orders).map((order) => ({ order })),
  useCancelOrder: () => [false, state.cancelOrder],
}));
vi.mock("domain/synthetics/orders/useOrderTxnCallbacks", () => ({
  useOrderTxnCallbacks: () => ({ makeOrderTxnCallback: vi.fn() }),
}));
vi.mock("lib/rpc", async (importOriginal) => ({ ...(await importOriginal<object>()), useJsonRpcProvider: () => ({}) }));
vi.mock("lib/wallets/useEthersSigner", () => ({ useEthersSigner: () => undefined }));
vi.mock("lib/useBreakpoints", () => ({ useBreakpoints: () => ({ isTablet: state.isMobile }) }));
vi.mock("components/Modal/Modal", () => ({
  default: ({ isVisible, children }: { isVisible: boolean; children: ReactNode }) =>
    isVisible ? <div role="dialog">{children}</div> : null,
}));
vi.mock("./AddTPSLModal", () => ({
  AddTPSLModal: ({ isVisible }: { isVisible: boolean }) => (isVisible ? <div>TP/SL form</div> : null),
}));

const position = createMockPositionInfo({ account: "0x1111111111111111111111111111111111111111" });
const tp: PendingOrderData = {
  account: position.account,
  marketAddress: position.marketAddress,
  initialCollateralTokenAddress: position.collateralTokenAddress,
  initialCollateralDeltaAmount: 0n,
  swapPath: [],
  sizeDeltaUsd: expandDecimals(1000, 30),
  minOutputAmount: 0n,
  triggerPrice: convertToContractPrice(expandDecimals(2500, 30), position.indexToken.decimals),
  acceptablePrice: 0n,
  autoCancel: false,
  isLong: true,
  orderType: OrderType.LimitDecrease,
  decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
  shouldUnwrapNativeToken: false,
  externalSwapQuote: undefined,
  txnType: "create",
  isTwap: false,
  createdAt: 1000,
};
const sl = {
  ...tp,
  orderType: OrderType.StopLossDecrease,
  triggerPrice: convertToContractPrice(expandDecimals(1500, 30), position.indexToken.decimals),
};
const batch: PendingTpSlOrderBatch = {
  id: "batch",
  chainId: 42161,
  orders: [tp, sl],
  existingOrderKeys: ["existing"],
  relayTaskId: "task",
};
function confirmed(key: string, pending = tp): PositionOrderInfo {
  return {
    ...getOrderCreatedDataFromPendingOrder(pending, key),
    triggerPrice: parseContractPrice(pending.triggerPrice, position.indexToken.decimals),
    acceptablePrice: 0n,
    triggerThresholdType: undefined,
    isSwap: false,
    isTwap: false,
    updatedAtTime: 2n,
    autoCancel: pending.autoCancel,
    data: [],
    uiFeeFactor: undefined,
    validFromTime: 0n,
    marketInfo: position.marketInfo!,
    indexToken: position.indexToken,
    initialCollateralToken: position.collateralToken,
    targetCollateralToken: position.collateralToken,
  };
}
function modal(props: Partial<ComponentProps<typeof OrdersModal>> = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <OrdersModal isVisible position={position} setIsVisible={vi.fn()} {...props} />
    </I18nProvider>
  );
}
beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  state.batches = [batch];
  state.orders = {};
  state.orderStatuses = {};
  state.relayTaskStatuses = {};
  vi.clearAllMocks();
});
afterEach(cleanup);

describe.each([false, true])("orders modal (mobile: %s)", (isMobile) => {
  beforeEach(() => {
    state.isMobile = isMobile;
  });

  it("renders each pending entry instead of the empty state and blocks Add TP/SL", () => {
    const view = render(modal());
    expect(view.getAllByRole("status")).toHaveLength(2);
    expect(view.queryByText("No resting orders")).toBeNull();
    const addButton = view.getByRole("button", { name: "Add TP/SL" }) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    fireEvent.click(addButton);
    expect(view.queryByText("TP/SL form")).toBeNull();
    expect(view.getByText(/\$\s*2,500\.00/)).toBeTruthy();
    expect(view.getByText(/\$\s*1,500\.00/)).toBeTruthy();
  });

  it("keeps pending entries after closing and reopening directly into the add view", () => {
    const view = render(modal());
    view.rerender(modal({ isVisible: false }));
    expect(view.queryByRole("status")).toBeNull();
    view.rerender(modal({ initialView: "add" }));
    expect(view.getAllByRole("status")).toHaveLength(2);
    expect(view.queryByText("TP/SL form")).toBeNull();
  });

  it("keeps confirmed orders usable alongside pending entries", () => {
    state.orders = { existing: confirmed("existing") };
    const view = render(modal());
    expect(view.getAllByRole("status")).toHaveLength(2);
    expect((view.getByRole("button", { name: "Cancel all" }) as HTMLButtonElement).disabled).toBe(false);
    if (isMobile) {
      fireEvent.click(view.getByRole("button", { name: "Edit" }));
      expect(state.editingOrder).toHaveBeenCalledWith({ orderKey: "existing", source: "OrdersModal" });
      fireEvent.click(view.getByRole("button", { name: "Cancel", exact: true }));
      expect(state.cancelOrder).toHaveBeenCalledTimes(1);
    }
  });

  it("waits for fetched data, then replaces each row and unlocks Add TP/SL", () => {
    const view = render(modal());
    state.orderStatuses = {
      tp: { key: "tp", data: getOrderCreatedDataFromPendingOrder(tp, "tp"), createdAt: 2000, createdTxnHash: "tx" },
    };
    view.rerender(modal());
    expect(view.getAllByRole("status")).toHaveLength(2);
    state.orders = { tp: confirmed("tp") };
    view.rerender(modal());
    expect(view.getAllByRole("status")).toHaveLength(1);
    expect((view.getByRole("button", { name: "Add TP/SL" }) as HTMLButtonElement).disabled).toBe(true);
    state.orders = { ...state.orders, sl: confirmed("sl", sl) };
    view.rerender(modal());
    expect(view.queryByRole("status")).toBeNull();
    expect((view.getByRole("button", { name: "Add TP/SL" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("removes failed pending entries and allows another submission", () => {
    const view = render(modal());
    state.relayTaskStatuses = { task: { taskId: "task", statusCode: StatusCode.Reverted, message: "Failed" } };
    view.rerender(modal());
    expect(view.queryByRole("status")).toBeNull();
    const addButtons = view.getAllByRole("button", { name: "Add TP/SL" });
    expect(addButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(addButtons[0]);
    expect(view.getByText("TP/SL form")).toBeTruthy();
  });
});
