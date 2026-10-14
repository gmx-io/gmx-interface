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

  it("counts every permit the successful relay call carried and forgets it", () => {
    const { rerender } = renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: {},
    });

    expect(mocks.sendTokenPermitMetric).not.toHaveBeenCalled();

    rerender({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });

    expect(mocks.removeTokenPermits).toHaveBeenCalledWith([usdcPermit, wethPermit]);
    expect(mocks.sendTokenPermitMetric.mock.calls).toEqual([
      [{ outcome: "executed", chainId: ARBITRUM, tokenAddress: USDC, accountType: "eoa" }],
      [{ outcome: "executed", chainId: ARBITRUM, tokenAddress: WETH, accountType: "eoa" }],
    ]);
  });

  it("sends executed once per relay task across re-renders", () => {
    const { rerender } = renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: sentTxn },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });

    rerender({
      chainId: ARBITRUM,
      pendingExpressTxns: { txn: { ...sentTxn, isViewed: true } },
      relayTaskStatuses: { ...relayStatus("task", StatusCode.Success), ...relayStatus("other", StatusCode.Success) },
    });

    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledTimes(2);
    expect(mocks.removeTokenPermits).toHaveBeenCalledTimes(1);
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

  it("sends nothing for relay calls without permits or before a task id is known", () => {
    renderExecutedTokenPermits({
      chainId: ARBITRUM,
      pendingExpressTxns: {
        noPermits: { key: "noPermits", taskId: "task", tokenPermits: [] },
        notSent: { key: "notSent", taskId: undefined, tokenPermits: [usdcPermit] },
      },
      relayTaskStatuses: relayStatus("task", StatusCode.Success),
    });

    expect(mocks.sendTokenPermitMetric).not.toHaveBeenCalled();
  });

  it("reports the chain and account type the relay call was sent with after a chain switch", () => {
    mocks.accountType = "metaMask7702";
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
      expect.objectContaining({ chainId: ARBITRUM, accountType: "metaMask7702" })
    );
  });
});
