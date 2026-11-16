import { cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode, useState } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { ExternalSwapCalculationStrategy } from "sdk/utils/trade/types";

import type { KyberSwapQuote } from "../kyberSwap";
import { useExternalSwapOutputRequest } from "../useExternalSwapOutputRequest";

const { kyberMock } = vi.hoisted(() => ({
  kyberMock: {
    calls: [] as { amountIn: bigint; slippage: number; signal: AbortSignal | undefined }[],
    impl: undefined as ((params: { amountIn: bigint }) => Promise<KyberSwapQuote | undefined>) | undefined,
  },
}));

vi.mock("../kyberSwap", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getKyberSwapTxnData: (params: { amountIn: bigint; slippage: number; signal?: AbortSignal }) => {
    kyberMock.calls.push({ amountIn: params.amountIn, slippage: params.slippage, signal: params.signal });
    return kyberMock.impl!(params);
  },
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: () => undefined,
}));

vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  useTokensData: () => ({}),
}));

vi.mock("../../tokens", () => ({
  useTokensAllowanceData: () => ({ tokensAllowanceData: {} }),
  getNeedTokenApprove: () => false,
}));

const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const RECEIVER = "0x000000000000000000000000000000000000dddd";

function mockKyberQuote(amountIn: bigint): KyberSwapQuote {
  return {
    to: "0xrouter",
    data: "0xcalldata",
    value: 0n,
    estimatedGas: 100000n,
    usdIn: 0n,
    usdOut: 0n,
    priceIn: 0n,
    priceOut: 0n,
    gasPrice: 10n,
    amountIn,
    outputAmount: 1n,
    slippage: 100,
  };
}

type HookProps = Parameters<typeof useExternalSwapOutputRequest>[0];
type HookResult = ReturnType<typeof useExternalSwapOutputRequest>;

function makeProps(overrides?: Partial<HookProps>): HookProps {
  return {
    chainId: ARBITRUM,
    tokenInAddress: WETH.address,
    tokenOutAddress: USDC.address,
    receiverAddress: RECEIVER,
    amountIn: 1_000_000_000n,
    slippage: 100,
    gasPrice: 10n,
    strategy: "byFromValue" as ExternalSwapCalculationStrategy,
    ...overrides,
  };
}

function Harness({ hookProps, onResult }: { hookProps: HookProps; onResult: (r: HookResult) => void }) {
  onResult(useExternalSwapOutputRequest(hookProps));
  return null;
}

// One cache per mounted tree (= per test), stable across rerenders.
function TestSWRProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line react/hook-use-state
  const [value] = useState(() => ({ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }));
  return <SWRConfig value={value}>{children}</SWRConfig>;
}

function setup(initialProps: HookProps) {
  const results: HookResult[] = [];
  const view = render(
    <TestSWRProvider>
      <Harness hookProps={initialProps} onResult={(r) => results.push(r)} />
    </TestSWRProvider>
  );
  return {
    latest: () => results[results.length - 1],
    rerender: (props: HookProps) =>
      view.rerender(
        <TestSWRProvider>
          <Harness hookProps={props} onResult={(r) => results.push(r)} />
        </TestSWRProvider>
      ),
  };
}

describe("useExternalSwapOutputRequest", () => {
  beforeEach(() => {
    kyberMock.calls = [];
    kyberMock.impl = async ({ amountIn }) => mockKyberQuote(amountIn);
  });

  afterEach(cleanup);

  it("fetches a quote and seals the request key with the actually requested params", async () => {
    const props = makeProps();
    const { latest } = setup(props);

    await waitFor(() => expect(latest().quote).toBeDefined());

    expect(latest().quote?.txnData.data).toBe("0xcalldata");
    expect(latest().requestKey).toEqual({
      structuralKey: `${WETH.address}:${USDC.address}:byFromValue:100`,
      amount: 1_000_000_000n,
      strategy: "byFromValue",
    });
    expect(latest().isDataUpToDate).toBe(true);
  });

  it("flags data as stale during the debounce window after an input change", async () => {
    const props = makeProps();
    const { latest, rerender } = setup(props);
    await waitFor(() => expect(latest().quote).toBeDefined());

    rerender(makeProps({ amountIn: 2_000_000_000n }));
    expect(latest().isDataUpToDate).toBe(false);

    await waitFor(() => expect(kyberMock.calls.length).toBe(2), { timeout: 3000 });
    await waitFor(() => expect(latest().requestKey?.amount).toBe(2_000_000_000n), { timeout: 3000 });
    expect(latest().isDataUpToDate).toBe(true);
  });

  it("aborts the in-flight request when a newer one starts", async () => {
    let resolveFirst!: (q: KyberSwapQuote) => void;
    kyberMock.impl = ({ amountIn }) => {
      if (kyberMock.calls.length === 1) {
        return new Promise<KyberSwapQuote>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(mockKyberQuote(amountIn));
    };

    const { latest, rerender } = setup(makeProps());
    await waitFor(() => expect(kyberMock.calls.length).toBe(1));

    rerender(makeProps({ amountIn: 2_000_000_000n }));
    await waitFor(() => expect(kyberMock.calls.length).toBe(2), { timeout: 3000 });

    expect(kyberMock.calls[0].signal?.aborted).toBe(true);
    expect(kyberMock.calls[1].signal?.aborted).toBe(false);

    resolveFirst(mockKyberQuote(1_000_000_000n));
    await waitFor(() => expect(latest().requestKey?.amount).toBe(2_000_000_000n), { timeout: 3000 });
  });

  it("refetches on any amount change for manual strategies, even within 30bps", async () => {
    const { latest, rerender } = setup(makeProps({ amountIn: 1_000_000_000n }));
    await waitFor(() => expect(latest().quote).toBeDefined());

    rerender(makeProps({ amountIn: 1_000_000_001n }));

    await waitFor(() => expect(kyberMock.calls.length).toBe(2), { timeout: 3000 });
    expect(kyberMock.calls[1].amountIn).toBe(1_000_000_001n);
  });

  it("keeps the requested amount stable within 30bps for leverageBySize (no refetch on oracle drift)", async () => {
    const { latest, rerender } = setup(makeProps({ strategy: "leverageBySize", amountIn: 1_000_000_000n }));
    await waitFor(() => expect(latest().quote).toBeDefined());

    rerender(makeProps({ strategy: "leverageBySize", amountIn: 1_000_000_001n }));
    await new Promise((r) => setTimeout(r, 450));

    expect(kyberMock.calls.length).toBe(1);
    expect(latest().isDataUpToDate).toBe(true);

    // A real size change beyond tolerance still refetches.
    rerender(makeProps({ strategy: "leverageBySize", amountIn: 2_000_000_000n }));
    await waitFor(() => expect(kyberMock.calls.length).toBe(2), { timeout: 3000 });
    expect(kyberMock.calls[1].amountIn).toBe(2_000_000_000n);
  });

  it("does not fetch when disabled", async () => {
    setup(makeProps({ enabled: false }));

    await new Promise((r) => setTimeout(r, 100));
    expect(kyberMock.calls.length).toBe(0);
  });

  it("exposes the error without a quote when the fetch fails", async () => {
    kyberMock.impl = async () => {
      throw new Error("no route");
    };

    const { latest } = setup(makeProps());

    await waitFor(() => expect(latest().error).toBeDefined(), { timeout: 3000 });
    expect(latest().quote).toBeUndefined();
  });
});
