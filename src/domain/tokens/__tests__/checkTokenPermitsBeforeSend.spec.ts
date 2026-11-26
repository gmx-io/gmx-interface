import { encodeFunctionResult, erc20Abi, maxUint256 } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { abis } from "sdk/abis";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { TokenPermitsCheckError } from "../checkTokenPermits";
import { getWalletTxnTokenPermits } from "../checkTokenPermitsBeforeSend";

const mocks = vi.hoisted(() => ({ call: vi.fn(), now: 1_800_000_000 }));

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({ call: mocks.call }) }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn() } }));
vi.mock("sdk/utils/time", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/utils/time")>()),
  nowInSeconds: () => mocks.now,
}));

const ARBITRUM = 42161;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";

function usdcPermit(deadline: bigint): SignedTokenPermit {
  return {
    token: USDC,
    owner: "0x00000000000000000000000000000000000000A1",
    spender: ROUTER,
    value: maxUint256,
    deadline,
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "USD Coin", version: "2", nonce: 0n },
  };
}

type CallResult = { success: boolean; returnData: `0x${string}` };

const allowanceData = (amount: bigint) =>
  encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: amount }) as `0x${string}`;
const nonceData = (nonce: bigint) =>
  encodeFunctionResult({ abi: abis.ERC20PermitInterface, functionName: "nonces", result: nonce }) as `0x${string}`;

// allowance 0 before the permit, nonce unused, the permit executes, allowance unlimited after it
const VALID_PERMIT_RESULTS: CallResult[] = [
  { success: true, returnData: allowanceData(0n) },
  { success: true, returnData: nonceData(0n) },
  { success: true, returnData: "0x" },
  { success: true, returnData: allowanceData(maxUint256) },
];
const VALID_PERMIT_RESPONSE = {
  data: encodeFunctionResult({ abi: abis.Multicall, functionName: "aggregate3", result: VALID_PERMIT_RESULTS }),
};

const getPermits = (permit: SignedTokenPermit) =>
  getWalletTxnTokenPermits({ chainId: ARBITRUM, tokenPermits: [permit], requiredAmounts: { [USDC]: 100_000_000n } });

describe("getWalletTxnTokenPermits", () => {
  beforeEach(() => {
    mocks.call.mockReset();
  });

  // an unchecked unlimited permit would overwrite a newer, smaller approval without reverting
  it.each([
    { name: "one failed check is retried", failures: 1, expected: "sent" },
    { name: "a check that keeps failing stops the send", failures: 2, expected: "stopped" },
  ])("$name", async ({ failures, expected }) => {
    const permit = usdcPermit(maxUint256);
    Array.from({ length: failures }).forEach(() =>
      mocks.call.mockRejectedValueOnce(new Error("HTTP request failed. Status: 503"))
    );
    mocks.call.mockResolvedValue(VALID_PERMIT_RESPONSE);

    const result = getPermits(permit);

    await (expected === "sent"
      ? expect(result).resolves.toEqual({
          validPermits: [permit],
          stalePermits: [],
          failedPermits: [],
          outdatedPermits: [],
        })
      : expect(result).rejects.toThrow("503"));
    expect(mocks.call).toHaveBeenCalledTimes(2);
  });

  it("asks for a new permit instead of sending one that can expire while the wallet holds the transaction", async () => {
    const permit = usdcPermit(BigInt(mocks.now + 5 * 60));
    mocks.call.mockResolvedValue(VALID_PERMIT_RESPONSE);

    const error = await getPermits(permit).catch((error) => error);

    expect(error).toBeInstanceOf(TokenPermitsCheckError);
    expect(error).toMatchObject({ failedPermits: [], outdatedPermits: [permit] });
  });
});
