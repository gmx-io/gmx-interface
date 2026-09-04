import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTokenApproval } from "./useTokenApproval";

const mocks = vi.hoisted(() => ({
  CHAIN_ID: 42161,
  TOKEN: "0x0000000000000000000000000000000000000001",
  SPENDER: "0x0000000000000000000000000000000000000002",
  OWNER: "0x0000000000000000000000000000000000000003",
  HASH: "0xabc" as `0x${string}`,
  allowanceData: undefined as Record<string, bigint> | undefined,
  approveTokens: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  readContract: vi.fn(),
  toastError: vi.fn(),
  toastContent: vi.fn(),
}));

vi.mock("domain/synthetics/tokens", () => ({
  getNeedTokenApprove: (
    allowanceData: Record<string, bigint> | undefined,
    tokenAddress: string,
    amount: bigint | undefined
  ) => {
    if (amount === undefined || amount <= 0n) {
      return false;
    }

    const allowance = allowanceData?.[tokenAddress];

    return allowance === undefined || amount > allowance;
  },
  useTokensAllowanceData: () => ({
    tokensAllowanceData: mocks.allowanceData,
    isLoading: mocks.allowanceData === undefined,
    isLoaded: mocks.allowanceData !== undefined,
  }),
}));

vi.mock("./approveTokens", () => ({ approveTokens: mocks.approveTokens }));

vi.mock("./insufficientApproval", () => ({ getInsufficientApprovalToastContent: mocks.toastContent }));

vi.mock("lib/helperToast", () => ({
  helperToast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() },
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
    readContract: mocks.readContract,
  }),
}));

vi.mock("context/TokenPermitsContext/TokenPermitsContextProvider", () => ({
  useTokenPermitsContext: () => ({
    tokenPermits: [],
    addTokenPermit: vi.fn(),
    isPermitsDisabled: true,
    setIsPermitsDisabled: vi.fn(),
  }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSettlementChainId: () => [mocks.CHAIN_ID, vi.fn()],
}));

vi.mock("components/GmxAccountModal/wrapChainAction", () => ({
  wrapChainAction: (_chainId: number, _setChainId: unknown, action: (signer: unknown) => Promise<void>) => action({}),
}));

type HookResult = ReturnType<typeof useTokenApproval>;

let latestResult: HookResult | undefined;

function TestComponent({ amount }: { amount: bigint }) {
  latestResult = useTokenApproval({
    chainId: mocks.CHAIN_ID as 42161,
    spenderAddress: mocks.SPENDER,
    tokens: [{ tokenAddress: mocks.TOKEN, amount }],
  });
  return null;
}

function setup(amount: bigint) {
  const view = render(<TestComponent amount={amount} />);

  return {
    get result() {
      return latestResult!;
    },
    rerender: (nextAmount: bigint = amount) => view.rerender(<TestComponent amount={nextAmount} />),
  };
}

async function flushAsync() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function approve(view: ReturnType<typeof setup>) {
  await act(async () => {
    view.result.handleApprove();
  });
  await flushAsync();
}

describe("useTokenApproval", () => {
  beforeEach(() => {
    mocks.allowanceData = { [mocks.TOKEN]: 0n };
    mocks.approveTokens.mockResolvedValue({ hash: mocks.HASH });
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success", blockNumber: 105n, from: mocks.OWNER });
    mocks.readContract.mockResolvedValue(900n);
    mocks.toastContent.mockImplementation((params) => params);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    latestResult = undefined;
  });

  it("releases the button and reports the shortfall when the mined allowance is below the amount", async () => {
    const view = setup(1000n);
    expect(view.result.needsApproval).toBe(true);

    await approve(view);

    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: mocks.TOKEN,
        functionName: "allowance",
        args: [mocks.OWNER, mocks.SPENDER],
      })
    );
    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(true);
    expect(mocks.toastContent).toHaveBeenCalledWith({
      chainId: mocks.CHAIN_ID,
      tokenAddress: mocks.TOKEN,
      approvedAmount: 900n,
      requiredAmount: 1000n,
    });
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
  });

  it("keeps the spinner until the allowance data catches up when the mined allowance covers the amount", async () => {
    mocks.readContract.mockResolvedValue(1000n);

    const view = setup(1000n);
    await approve(view);

    expect(view.result.isApproving).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();

    mocks.allowanceData = { [mocks.TOKEN]: 1000n };
    await act(async () => {
      view.rerender();
    });

    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(false);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("checks the mined allowance against the amount entered by the time it is mined", async () => {
    let resolveAllowance!: (value: bigint) => void;
    mocks.readContract.mockReturnValue(
      new Promise<bigint>((resolve) => {
        resolveAllowance = resolve;
      })
    );

    const view = setup(1000n);
    await approve(view);
    expect(view.result.isApproving).toBe(true);

    await act(async () => {
      view.rerender(2000n);
    });
    await act(async () => {
      resolveAllowance(1500n);
    });
    await flushAsync();

    expect(view.result.isApproving).toBe(false);
    expect(mocks.toastContent).toHaveBeenCalledWith({
      chainId: mocks.CHAIN_ID,
      tokenAddress: mocks.TOKEN,
      approvedAmount: 1500n,
      requiredAmount: 2000n,
    });
  });

  it("releases the button when the approve transaction reverts", async () => {
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "reverted", blockNumber: 105n, from: mocks.OWNER });

    const view = setup(1000n);
    await approve(view);

    expect(mocks.readContract).not.toHaveBeenCalled();
    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("releases the button when the receipt cannot be fetched", async () => {
    mocks.waitForTransactionReceipt.mockRejectedValue(new Error("timeout"));

    const view = setup(1000n);
    await approve(view);

    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("releases the button when the mined allowance cannot be read", async () => {
    mocks.readContract.mockRejectedValue(new Error("rpc"));

    const view = setup(1000n);
    await approve(view);

    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
