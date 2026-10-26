import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatusCode } from "sdk/utils/express";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import type { PendingExpressTxnParams, RelayTaskStatus } from "./types";
import { useExecutedTokenPermits } from "./useExecutedTokenPermits";

const mocks = vi.hoisted(() => ({
  removeTokenPermits: vi.fn(),
  sendTokenPermitMetric: vi.fn(),
  accountType: "eoa" as string | undefined,
}));

vi.mock("context/TokenPermitsContext/TokenPermitsContextProvider", () => ({
  useTokenPermitsContext: () => ({ removeTokenPermits: mocks.removeTokenPermits, accountType: mocks.accountType }),
}));
vi.mock("lib/metrics/tokenPermitMetrics", () => ({ sendTokenPermitMetric: mocks.sendTokenPermitMetric }));

const ARBITRUM = 42161;
const AVALANCHE = 43114;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

const usdcPermit = { token: USDC, r: "0x1", s: "0x2" } as SignedTokenPermit;
const wethPermit = { token: WETH, r: "0x3", s: "0x4" } as SignedTokenPermit;

type Props = {
  chainId: number;
  pendingExpressTxns: { [key: string]: Partial<PendingExpressTxnParams> };
  relayTaskStatuses: { [taskId: string]: RelayTaskStatus };
};

function TestComponent({ params }: { params: Props }) {
  useExecutedTokenPermits(params);
  return null;
}

function renderExecutedTokenPermits(initialParams: Props) {
  const view = render(<TestComponent params={initialParams} />);

  return { rerender: (params: Props) => view.rerender(<TestComponent params={params} />) };
}

function relayStatus(taskId: string, statusCode: StatusCode): { [taskId: string]: RelayTaskStatus } {
  return { [taskId]: { taskId, statusCode } };
}

const sentTxn = { key: "txn", taskId: "task", tokenPermits: [usdcPermit, wethPermit] };

describe("useExecutedTokenPermits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountType = "eoa";
  });
  afterEach(cleanup);

  it("forgets the permits a successful relay call carried, once per relay task", () => {
    const { rerender } = renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: {},
    });

    rerender({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });
    rerender({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: { ...sentTxn, isViewed: true } },
      relayTaskStatuses: { ...relayStatus("task", StatusCode.Success), ...relayStatus("other", StatusCode.Success) },
    });

    expect(mocks.removeTokenPermits.mock.calls).toEqual([[[usdcPermit, wethPermit], ARBITRUM]]);
  });

  it("forgets the permits of tasks that succeed together in one removal", () => {
    renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: {
        first: { key: "first", taskId: "first", tokenPermits: [usdcPermit] },
        second: { key: "second", taskId: "second", tokenPermits: [wethPermit] },
      },
      relayTaskStatuses: { ...relayStatus("first", StatusCode.Success), ...relayStatus("second", StatusCode.Success) },
    });

    expect(mocks.removeTokenPermits.mock.calls).toEqual([[[usdcPermit, wethPermit], ARBITRUM]]);
  });

  it.each([StatusCode.Reverted, StatusCode.Rejected])("sends nothing when the relay ends with %s", (statusCode) => {
    const { rerender } = renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", statusCode),
    });

    rerender({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });

    expect(mocks.sendTokenPermitMetric).not.toHaveBeenCalled();
    expect(mocks.removeTokenPermits).not.toHaveBeenCalled();
  });

  it("reports the chain and account type the relay call was sent with after a chain switch", () => {
    mocks.accountType = "eip7702";
    const { rerender } = renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: {},
    });

    mocks.accountType = undefined;
    rerender({
      chainId: AVALANCHE,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });

    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: ARBITRUM, accountType: "eip7702" })
    );
    expect(mocks.removeTokenPermits).toHaveBeenCalledWith([usdcPermit, wethPermit], ARBITRUM);
  });
});
