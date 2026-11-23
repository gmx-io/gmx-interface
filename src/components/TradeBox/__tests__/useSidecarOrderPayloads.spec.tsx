import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { selectTradeBoxCreateOrderParams } from "context/SyntheticsStateContext/selectors/transactionsSelectors/tradeBoxOrdersSelectors";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { OrderType } from "sdk/utils/orders/types";
import type { DecreasePositionAmounts, IncreasePositionAmounts } from "sdk/utils/trade/types";

import { useSidecarOrderPayloads } from "../hooks/useSidecarOrderPayloads";

const inputs = vi.hoisted(() => ({
  state: undefined as unknown as SyntheticsState,
  networkId: 42161,
  entries: [] as SidecarOrderEntry[],
  amounts: undefined as unknown as DecreasePositionAmounts,
  increase: undefined as unknown as IncreasePositionAmounts,
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161, networkId: inputs.networkId }) }));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: (selector: (state: SyntheticsState) => unknown) => selector(inputs.state),
}));
vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/selectors/tradeboxSelectors")>()),
  selectTradeboxSelectedPosition: () => undefined,
  selectTradeboxExecutionFee: () => ({ feeTokenAmount: 1n, gasLimit: 1n }),
  selectTradeboxIncreasePositionAmounts: () => inputs.increase,
  selectTradeboxDecreasePositionAmounts: () => inputs.amounts,
}));
vi.mock("domain/synthetics/sidecarOrders/useSidecarEntries", () => ({ useSidecarEntries: () => inputs.entries }));
vi.mock("domain/synthetics/trade/useMaxAutoCancelOrdersState", () => ({
  useMaxAutoCancelOrdersState: () => ({ autoCancelOrdersLimit: 2 }),
}));
vi.mock("../hooks/useTPSLSummaryExecutionFee", () => ({
  useTPSLSummaryExecutionFee: () => ({
    getExecutionFeeAmountForEntry: () => 1n,
    getOrderExecutionFee: () => ({ gasLimit: 1n }),
  }),
}));

afterEach(cleanup);

const usd = 10n ** 30n;
const dogeMint = "DogeJP1vR955QsXWKT1vw5gJsyiTthqPEtJZj8enDWxF";
const solanaCollateral = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function setMarket(isSolana: boolean) {
  inputs.networkId = isSolana ? SOLANA_NETWORK_ID : ARBITRUM;
  inputs.state = createMockSyntheticsState({
    account: isSolana ? "9XUH3oy5kjA4UjFeB7RM6bGJCWeWN6GPYAKVmrKRVaYz" : "0x1234567890123456789012345678901234567890",
    marketInfo: createMockMarketInfo(undefined, isSolana ? { tradeMath: "gmsol", indexTokenAddress: dogeMint } : {}),
    collateralAddress: isSolana ? solanaCollateral : USDC_TOKEN.address,
    toTokenAddress: isSolana ? dogeMint : ETH_TOKEN.address,
  });
  inputs.amounts = {
    sizeDeltaUsd: 100n * usd,
    sizeDeltaInTokens: 10n ** 18n,
    collateralDeltaAmount: 0n,
    triggerPrice: 2100n * usd,
    acceptablePrice: 2100n * usd,
    triggerOrderType: OrderType.LimitDecrease,
    decreaseSwapType: 0,
  } as DecreasePositionAmounts;
  inputs.increase = {
    sizeDeltaUsd: 100n * usd,
    sizeDeltaInTokens: 10n ** 18n,
    initialCollateralAmount: 10_000_000n,
    collateralDeltaAmount: 10_000_000n,
    acceptablePrice: 2000n * usd,
    swapStrategy: { type: "noSwap" },
  } as IncreasePositionAmounts;
}

function entry(txnType: "create" | "update" | "cancel", orderType = OrderType.LimitDecrease): SidecarOrderEntry {
  return {
    txnType,
    decreaseAmounts: { ...inputs.amounts, triggerOrderType: orderType },
    percentage: { value: 10000n },
    order: { key: `0x${"1".repeat(64)}`, orderType, autoCancel: true, decreasePositionSwapType: 0 },
  } as SidecarOrderEntry;
}

let payloads: ReturnType<typeof useSidecarOrderPayloads>;
function Probe() {
  payloads = useSidecarOrderPayloads();
  return null;
}

describe("TradeBox EVM payload boundaries", () => {
  it("keeps Solana TP/SL entries out of EVM sidecar payloads across network changes TRD-70", () => {
    setMarket(false);
    inputs.entries = [entry("create"), entry("create", OrderType.StopLossDecrease), entry("update"), entry("cancel")];
    const { rerender } = render(<Probe />);
    expect(payloads?.createPayloads.map((payload) => payload.orderPayload.orderType)).toEqual([
      OrderType.LimitDecrease,
      OrderType.StopLossDecrease,
    ]);
    expect(payloads?.updatePayloads[0].updatePayload.sizeDeltaUsd).toBe(100n * usd);
    expect(payloads?.cancelPayloads).toEqual([{ orderKey: `0x${"1".repeat(64)}` }]);

    inputs.networkId = SOLANA_NETWORK_ID;
    rerender(<Probe />);
    expect(payloads).toBeUndefined();
    inputs.networkId = ARBITRUM;
    rerender(<Probe />);
    expect(payloads?.createPayloads).toHaveLength(2);

    for (const entries of [
      [entry("create")],
      [entry("create", OrderType.StopLossDecrease)],
      [entry("update")],
      inputs.entries,
    ]) {
      setMarket(true);
      inputs.entries = entries;
      rerender(<Probe />);
      expect(payloads).toBeUndefined();
    }

    setMarket(false);
    inputs.entries = [entry("create")];
    rerender(<Probe />);
    expect(payloads?.createPayloads[0].orderPayload.addresses.initialCollateralToken).toBe(USDC_TOKEN.address);
    expect(payloads?.createPayloads[0].orderPayload.numbers.triggerPrice).toBe(2100n * 10n ** 12n);
  });

  it("excludes gmsol primary orders even when EVM execution fees are available TRD-70", () => {
    setMarket(false);
    const evmPayload = selectTradeBoxCreateOrderParams(inputs.state);
    expect(evmPayload?.[0].params).toMatchObject({ indexTokenAddress: ETH_TOKEN.address });
    expect(evmPayload?.[0].orderPayload.numbers.sizeDeltaUsd).toBe(100n * usd);
    setMarket(true);
    expect(selectTradeBoxCreateOrderParams(inputs.state)).toBeUndefined();
  });
});
