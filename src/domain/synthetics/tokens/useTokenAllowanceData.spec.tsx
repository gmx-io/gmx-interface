import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE, type AnyChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

import { useTokensAllowanceData } from "./useTokenAllowanceData";

const mocks = vi.hoisted(() => ({
  OWNER: "0x0000000000000000000000000000000000000003",
  SPENDER: "0x0000000000000000000000000000000000000002",
  TOKEN: "0x0000000000000000000000000000000000000001",
  data: undefined as { tokenAllowance: Record<string, bigint>; blockNumber: bigint } | undefined,
  approvalStatuses: {} as Record<string, Record<string, { value: bigint; blockNumber: bigint }>>,
  request: undefined as undefined | ((chainId: AnyChainId) => any),
  parseResponse: undefined as undefined | ((res: any) => any),
}));

vi.mock("lib/multicall", () => ({
  useMulticall: (_chainId: AnyChainId, _name: string, params: any) => {
    mocks.request = params.request;
    mocks.parseResponse = params.parseResponse;
    return { data: mocks.data };
  },
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({
    approvalStatuses: mocks.approvalStatuses,
    multichainSourceChainApprovalStatuses: mocks.approvalStatuses,
  }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: mocks.OWNER }),
}));

type HookResult = ReturnType<typeof useTokensAllowanceData>;

let latestResult: HookResult | undefined;

function TestComponent({ chainId }: { chainId: AnyChainId }) {
  latestResult = useTokensAllowanceData(chainId, { spenderAddress: mocks.SPENDER, tokenAddresses: [mocks.TOKEN] });
  return null;
}

describe("useTokensAllowanceData", () => {
  beforeEach(() => {
    mocks.data = undefined;
    mocks.approvalStatuses = {};
  });

  afterEach(() => {
    cleanup();
    latestResult = undefined;
  });

  it("asks ArbSys for the block number on Arbitrum and Multicall elsewhere", () => {
    render(<TestComponent chainId={ARBITRUM} />);

    expect(mocks.request!(ARBITRUM).blockNumber).toMatchObject({
      contractAddress: getContract(ARBITRUM, "ArbSys"),
      abiId: "ArbSys",
      calls: { blockNumber: { methodName: "arbBlockNumber", params: [] } },
    });
    expect(mocks.request!(AVALANCHE).blockNumber).toMatchObject({
      contractAddress: getContract(AVALANCHE, "Multicall"),
      abiId: "Multicall",
      calls: { blockNumber: { methodName: "getBlockNumber", params: [] } },
    });
  });

  it("parses the allowances and the block number from the multicall response", () => {
    render(<TestComponent chainId={ARBITRUM} />);

    const parsed = mocks.parseResponse!({
      data: {
        [mocks.TOKEN]: { allowance: { returnValues: [7n] } },
        blockNumber: { blockNumber: { returnValues: [505n] } },
      },
    });

    expect(parsed).toEqual({ tokenAllowance: { [mocks.TOKEN]: 7n }, blockNumber: 505n });
  });

  it("prefers the Approval event while it is at least as new as the multicall result", () => {
    mocks.data = { tokenAllowance: { [mocks.TOKEN]: 0n }, blockNumber: 500n };
    mocks.approvalStatuses = { [mocks.TOKEN]: { [mocks.SPENDER]: { value: 5n, blockNumber: 505n } } };

    render(<TestComponent chainId={ARBITRUM} />);

    expect(latestResult!.tokensAllowanceData?.[mocks.TOKEN]).toBe(5n);
  });

  it("returns to the multicall result once it is newer than the Approval event", () => {
    mocks.data = { tokenAllowance: { [mocks.TOKEN]: 0n }, blockNumber: 506n };
    mocks.approvalStatuses = { [mocks.TOKEN]: { [mocks.SPENDER]: { value: 5n, blockNumber: 505n } } };

    render(<TestComponent chainId={ARBITRUM} />);

    expect(latestResult!.tokensAllowanceData?.[mocks.TOKEN]).toBe(0n);
  });
});
