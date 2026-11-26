import { act, cleanup, render } from "@testing-library/react";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExpressTokenPermitBlockReason } from "domain/synthetics/express/validateMultichainExpressSubmit";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import type { TokenPermitUnavailableReason } from "./tokenPermitsEligibility";
import { useTokenApproval } from "./useTokenApproval";

const mocks = vi.hoisted(() => ({
  CHAIN_ID: 42161,
  TOKEN: "0x0000000000000000000000000000000000000001",
  SPENDER: "0x0000000000000000000000000000000000000002",
  OWNER: "0x0000000000000000000000000000000000000003",
  PAY_TOKEN: "0x0000000000000000000000000000000000000004",
  HASH: "0xabc" as `0x${string}`,
  allowanceData: undefined as Record<string, bigint> | undefined,
  approveTokens: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  readContract: vi.fn(),
  toastError: vi.fn(),
  toastContent: vi.fn(),
  tokenPermits: [] as { token: string; spender: string; value: bigint; deadline?: bigint }[],
  isPermitAvailable: false,
  addTokenPermit: vi.fn(),
  SIGNER: { address: "0x0000000000000000000000000000000000000003" },
  isBatchAvailable: false,
  atomicStatus: "ready",
  sendTokenApprovalMetric: vi.fn(),
  permitUnavailableReason: "tokenNotAllowed" as TokenPermitUnavailableReason | undefined,
}));

vi.mock("domain/synthetics/tokens", () => ({
  getNeedTokenApprove: (
    allowanceData: Record<string, bigint> | undefined,
    tokenAddress: string,
    amount: bigint | undefined,
    permits: { token: string; value: bigint }[]
  ) => {
    if (amount === undefined || amount <= 0n) {
      return false;
    }

    if (permits.some((permit) => permit.token === tokenAddress && permit.value >= amount)) {
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

vi.mock("./tokenApprovalMetric", () => ({ sendTokenApprovalMetric: mocks.sendTokenApprovalMetric }));

vi.mock("./useWalletBatching", () => ({
  useWalletBatching: ({ enabled }: { enabled: boolean }) => ({
    isAvailable: enabled && mocks.isBatchAvailable,
    atomicStatus: mocks.atomicStatus,
  }),
}));

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
    tokenPermits: mocks.tokenPermits,
    accountType: "eoa",
    getIsPermitAvailable: () => mocks.isPermitAvailable,
    getPermitUnavailableReason: () => mocks.permitUnavailableReason,
    addTokenPermit: mocks.addTokenPermit,
    disableTokenPermits: vi.fn(),
  }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSettlementChainId: () => [mocks.CHAIN_ID, vi.fn()],
}));

vi.mock("components/GmxAccountModal/wrapChainAction", () => ({
  wrapChainAction: (_chainId: number, _setChainId: unknown, action: (signer: unknown) => Promise<void>) =>
    action(mocks.SIGNER),
}));

type HookResult = ReturnType<typeof useTokenApproval>;

let latestResult: HookResult | undefined;

function TestComponent({
  amount,
  allowPermit,
  allowBatch,
  permitBlockReason,
  tokenAddress = mocks.TOKEN,
}: {
  amount: bigint;
  allowPermit?: boolean;
  allowBatch?: boolean;
  permitBlockReason?: ExpressTokenPermitBlockReason;
  tokenAddress?: string;
}) {
  latestResult = useTokenApproval({
    chainId: mocks.CHAIN_ID as 42161,
    spenderAddress: mocks.SPENDER,
    tokens: [{ tokenAddress, amount }],
    allowPermit,
    allowBatch,
    metric: {
      flow: "trade",
      isExpress: true,
      gasPaymentTokenAddress: mocks.TOKEN,
      payTokenAddress: mocks.PAY_TOKEN,
      permitBlockReason,
    },
  });
  return null;
}

function setup(
  amount: bigint,
  allowPermit?: boolean,
  { allowBatch, permitBlockReason }: { allowBatch?: boolean; permitBlockReason?: ExpressTokenPermitBlockReason } = {}
) {
  const props = { allowPermit, allowBatch, permitBlockReason };
  const view = render(<TestComponent amount={amount} {...props} />);

  return {
    get result() {
      return latestResult!;
    },
    rerender: (nextAmount: bigint = amount) => view.rerender(<TestComponent amount={nextAmount} {...props} />),
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
    mocks.isPermitAvailable = false;
    mocks.isBatchAvailable = false;
    mocks.atomicStatus = "ready";
    mocks.permitUnavailableReason = "tokenNotAllowed";
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
    mocks.tokenPermits = [];
  });

  it.each([
    { name: "relayed spend", allowPermit: true, spender: mocks.SPENDER, needsApproval: false },
    { name: "wallet transaction", allowPermit: false, spender: mocks.SPENDER, needsApproval: true },
    { name: "permit for another spender", allowPermit: true, spender: mocks.OWNER, needsApproval: true },
    // the wallet can hold the transaction until the permit expires, so Approve signs a new one instead
    {
      name: "wallet-sent spend, permit expires in 5 min",
      allowPermit: true,
      allowBatch: true,
      expiresInSeconds: 300,
      spender: mocks.SPENDER,
      needsApproval: true,
    },
    {
      name: "relayed spend, permit expires in 5 min",
      allowPermit: true,
      expiresInSeconds: 300,
      spender: mocks.SPENDER,
      needsApproval: false,
    },
  ])(
    "counts a stored permit as the approval: $name -> $needsApproval",
    ({ allowPermit, allowBatch, expiresInSeconds, spender, needsApproval }) => {
      const deadline =
        expiresInSeconds !== undefined ? BigInt(Math.floor(Date.now() / 1000) + expiresInSeconds) : undefined;
      mocks.tokenPermits = [{ token: mocks.TOKEN, spender, value: 1000n, deadline }];

      expect(setup(1000n, allowPermit, { allowBatch }).result.needsApproval).toBe(needsApproval);
    }
  );

  it.each([
    { allowPermit: true, isPermitAvailable: true, expected: true },
    { allowPermit: false, isPermitAvailable: true, expected: false },
    { allowPermit: true, isPermitAvailable: false, expected: false },
  ])(
    "tells a permit from a transaction: allowPermit $allowPermit, permit available $isPermitAvailable -> $expected",
    ({ allowPermit, isPermitAvailable, expected }) => {
      mocks.isPermitAvailable = isPermitAvailable;

      expect(setup(1000n, allowPermit).result.getIsPermitApproval(mocks.TOKEN)).toBe(expected);
    }
  );

  it("reports allowances as loaded when only the native token is spent PRO-4527", () => {
    mocks.allowanceData = undefined;

    render(<TestComponent amount={1000n} tokenAddress={NATIVE_TOKEN_ADDRESS} />);

    expect(latestResult).toMatchObject({ isAllowanceLoaded: true, isAllowanceLoading: false });
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
        blockNumber: 105n,
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

  it("passes the approval flow to the metric and marks the gas payment token", async () => {
    const view = setup(1000n);
    await approve(view);

    expect(mocks.approveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: { flow: "trade", isExpress: true, isGasPaymentToken: true },
      })
    );
  });

  it("signs the permit with the signer from after the network switch", async () => {
    mocks.isPermitAvailable = true;
    const view = setup(1000n, true);
    await approve(view);

    await mocks.approveTokens.mock.calls[0][0].permitParams.addTokenPermit(mocks.TOKEN, mocks.SPENDER, 1000n);

    expect(mocks.addTokenPermit).toHaveBeenCalledWith(mocks.TOKEN, mocks.SPENDER, 1000n, { signer: mocks.SIGNER });
  });

  it.each([
    {
      name: "the flow blocks permits",
      allowPermit: false,
      permitBlockReason: "notEnoughGasToken" as const,
      permitUnavailableReason: "flagOff" as const,
      expected: "notEnoughGasToken",
    },
    {
      name: "the flow never uses permits",
      allowPermit: undefined,
      permitBlockReason: undefined,
      permitUnavailableReason: undefined,
      expected: "notInFlow",
    },
    {
      name: "the account type is still loading",
      allowPermit: true,
      permitBlockReason: undefined,
      permitUnavailableReason: "accountTypeNotLoaded" as const,
      expected: "accountTypeNotLoaded",
    },
    {
      name: "the token can't be permitted at all",
      allowPermit: false,
      permitBlockReason: "noExpressParams" as const,
      permitUnavailableReason: "tokenNotAllowed" as const,
      expected: undefined,
    },
  ])(
    "logs why an approval is a transaction: $name -> $expected",
    async ({ allowPermit, permitBlockReason, permitUnavailableReason, expected }) => {
      mocks.permitUnavailableReason = permitUnavailableReason;

      await approve(setup(1000n, allowPermit, { permitBlockReason }));

      expect(mocks.approveTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          permitParams: undefined,
          metric: expect.objectContaining({ permitSkipReason: expected }),
        })
      );
    }
  );

  it("signs a permit without a skip reason when the flow and the account allow it", async () => {
    mocks.isPermitAvailable = true;
    mocks.permitUnavailableReason = undefined;

    await approve(setup(1000n, true));

    expect(mocks.approveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        permitParams: expect.objectContaining({ accountType: "eoa" }),
        metric: expect.objectContaining({ permitSkipReason: undefined }),
      })
    );
  });

  it("releases the button when the mined allowance cannot be read", async () => {
    mocks.readContract.mockRejectedValue(new Error("rpc"));

    const view = setup(1000n);
    await approve(view);

    expect(view.result.isApproving).toBe(false);
    expect(view.result.needsApproval).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it.each([
    { name: "the wallet can batch", allowBatch: true, isBatchAvailable: true, isBatched: true },
    { name: "the action is relayed", allowBatch: false, isBatchAvailable: true, isBatched: false },
    { name: "the wallet can't batch", allowBatch: true, isBatchAvailable: false, isBatched: false },
    // a free signature beats an on-chain approve and the smart account upgrade
    { name: "the token can take a permit", allowBatch: true, isBatchAvailable: true, isPermit: true, isBatched: false },
    // already a smart account: the batch is the single confirmation (TRD-26)
    {
      name: "the token can take a permit, the account is a smart account",
      allowBatch: true,
      isBatchAvailable: true,
      isPermit: true,
      atomicStatus: "supported",
      isBatched: true,
    },
  ])(
    "puts an unlimited approve into the action's batch only when $name",
    ({ allowBatch, isBatchAvailable, isPermit = false, atomicStatus = "ready", isBatched }) => {
      mocks.isBatchAvailable = isBatchAvailable;
      mocks.isPermitAvailable = isPermit;
      mocks.atomicStatus = atomicStatus;

      const { approvalBatch } = setup(1000n, isPermit, { allowBatch }).result;

      expect(approvalBatch?.calls).toEqual(
        isBatched
          ? [
              {
                to: mocks.TOKEN,
                data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [mocks.SPENDER, maxUint256] }),
                value: 0n,
              },
            ]
          : undefined
      );
    }
  );

  it.each([
    { name: "the allowance covers the amount", allowanceData: { [mocks.TOKEN]: 1000n } },
    { name: "the allowance is still loading", allowanceData: undefined },
  ])("leaves nothing to batch while $name", ({ allowanceData }) => {
    mocks.isBatchAvailable = true;
    mocks.allowanceData = allowanceData;

    expect(setup(1000n, false, { allowBatch: true }).result.approvalBatch).toBeUndefined();
  });

  it.each([
    { outcome: "confirmed", metricOutcome: "accepted" },
    { outcome: "upgradeRejected", metricOutcome: "rejected" },
    // it can still land, so it's no failure
    { outcome: "statusUnknown", metricOutcome: undefined },
  ] as const)(
    "reports a batched approval as $metricOutcome when the batch is $outcome",
    ({ outcome, metricOutcome }) => {
      mocks.isBatchAvailable = true;

      setup(1000n, false, { allowBatch: true }).result.approvalBatch!.onOutcome!(outcome);

      expect(mocks.sendTokenApprovalMetric.mock.calls.map(([params]) => params)).toEqual(
        metricOutcome
          ? [
              expect.objectContaining({
                method: "batch",
                outcome: metricOutcome,
                tokenAddress: mocks.TOKEN,
                isUnlimited: true,
              }),
            ]
          : []
      );
    }
  );
});
