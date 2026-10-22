import { maxUint256 } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getInvalidPermitSignatureError, PERMIT_WALLET_CHANGED_ERROR } from "lib/errors/customErrors";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { getActivationPermitTokenAddresses, signActivationTokenPermits } from "./activationTokenPermits";

vi.mock("lib/metrics/tokenPermitMetrics", () => ({ sendTokenPermitMetric: vi.fn() }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn() } }));

const ARBITRUM = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

type TokenState = { balance: bigint; allowance: bigint; nonce: bigint } | "failed";

function mockClient(states: Record<string, TokenState>) {
  return {
    multicall: async ({ contracts }: { contracts: readonly { address: string; functionName: string }[] }) =>
      contracts.map(({ address, functionName }) => {
        const state = states[address];

        if (state === undefined || state === "failed") {
          return { status: "failure", error: new Error("reverted"), result: undefined };
        }

        const result = { balanceOf: state.balance, allowance: state.allowance, nonces: state.nonce }[functionName];
        return { status: "success", result };
      }),
  } as any;
}

function permit(token: string, overrides: Partial<SignedTokenPermit> = {}): SignedTokenPermit {
  return {
    token,
    owner: ACCOUNT,
    spender: ROUTER,
    value: maxUint256,
    deadline: maxUint256,
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "Token", version: "1", nonce: 3n },
    ...overrides,
  };
}

const HELD = { balance: 100n, allowance: 0n, nonce: 3n };

function getTokens({
  states,
  tokenPermits = [],
  gasPaymentTokenAddress,
  getIsPermitAvailable = () => true,
}: {
  states: Record<string, TokenState>;
  tokenPermits?: SignedTokenPermit[];
  gasPaymentTokenAddress?: string;
  getIsPermitAvailable?: (tokenAddress: string) => boolean;
}) {
  return getActivationPermitTokenAddresses({
    chainId: ARBITRUM,
    client: mockClient(states),
    account: ACCOUNT,
    spender: ROUTER,
    gasPaymentTokenAddress,
    tokenPermits,
    getIsPermitAvailable,
  });
}

describe("getActivationPermitTokenAddresses", () => {
  it.each<[string, TokenState, boolean, string[]]>([
    ["held with nothing approved", HELD, true, [USDC]],
    ["approved below the balance", { ...HELD, allowance: 99n }, true, [USDC]],
    ["approved in full", { ...HELD, allowance: maxUint256 }, true, []],
    ["not held", { ...HELD, balance: 0n }, true, []],
    ["unreadable", "failed", true, []],
    ["unable to use permits", HELD, false, []],
  ])("picks a token %s", async (_, state, isPermitAvailable, expected) => {
    const tokens = await getTokens({ states: { [USDC]: state }, getIsPermitAvailable: () => isPermitAvailable });

    expect(tokens).toEqual(expected);
  });

  it("puts the gas payment token first", async () => {
    const tokens = await getTokens({ states: { [USDC]: HELD, [WETH]: HELD }, gasPaymentTokenAddress: WETH });

    expect(tokens).toEqual([WETH, USDC]);
  });

  it.each<[string, SignedTokenPermit, string[]]>([
    // a JSON round trip leaves the nonce as a string
    [
      "is unused",
      permit(USDC, { onchainParams: { name: "Token", version: "1", nonce: "3" as unknown as bigint } }),
      [],
    ],
    ["has a used nonce", permit(USDC, { onchainParams: { name: "Token", version: "1", nonce: 2n } }), [USDC]],
    ["expires", permit(USDC, { deadline: 2000000000n }), [USDC]],
    ["is for another spender", permit(USDC, { spender: "0x0000000000000000000000000000000000000002" }), [USDC]],
  ])("signs again only when a stored permit %s", async (_, stored, expected) => {
    const tokens = await getTokens({ states: { [USDC]: HELD }, tokenPermits: [stored] });

    expect(tokens).toEqual(expected);
  });
});

describe("signActivationTokenPermits", () => {
  const addTokenPermit = vi.fn();
  const disableTokenPermits = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    addTokenPermit.mockResolvedValue(undefined);
  });

  function sign(tokenAddresses: string[]) {
    return signActivationTokenPermits({
      chainId: ARBITRUM,
      account: ACCOUNT,
      spender: ROUTER,
      tokenAddresses,
      accountType: "eoa",
      addTokenPermit,
      disableTokenPermits,
    });
  }

  it("signs one unlimited, non-expiring permit per token", async () => {
    await sign([USDC, WETH]);

    expect(addTokenPermit.mock.calls).toEqual([
      [USDC, ROUTER, maxUint256, { deadline: maxUint256 }],
      [WETH, ROUTER, maxUint256, { deadline: maxUint256 }],
    ]);
    expect(disableTokenPermits).not.toHaveBeenCalled();
  });

  const invalidSignature = (token: string) =>
    getInvalidPermitSignatureError({ isValid: false, error: undefined, permit: permit(token) });
  const rpcError = new Error("rpc unavailable");

  it.each([
    {
      name: "the user rejects",
      errors: [Object.assign(new Error("User rejected the request."), { code: 4001 })],
      tokens: [USDC, WETH],
      asked: [USDC],
      disabled: [],
    },
    {
      name: "a signature is invalid or the rpc fails",
      errors: [invalidSignature(USDC), undefined, rpcError],
      tokens: [USDC, WETH, USDT],
      asked: [USDC, WETH, USDT],
      disabled: [USDC],
    },
    {
      name: "the account or chain changes",
      errors: [rpcError, invalidSignature(WETH), new Error(PERMIT_WALLET_CHANGED_ERROR)],
      tokens: [USDC, WETH, USDT, USDC],
      asked: [USDC, WETH, USDT],
      disabled: [WETH],
    },
  ])("keeps only invalid signatures on approvals when $name", async ({ errors, tokens, asked, disabled }) => {
    errors.forEach((error) =>
      error === undefined
        ? addTokenPermit.mockResolvedValueOnce(undefined)
        : addTokenPermit.mockRejectedValueOnce(error)
    );

    await sign(tokens);

    expect(addTokenPermit.mock.calls.map(([token]) => token)).toEqual(asked);
    expect(disableTokenPermits.mock.calls).toEqual(
      disabled.length > 0 ? [[disabled, { chainId: ARBITRUM, account: ACCOUNT }]] : []
    );
  });
});
