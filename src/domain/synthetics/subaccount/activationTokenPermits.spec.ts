import { maxUint256 } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getInvalidPermitSignatureError, PERMIT_WALLET_CHANGED_ERROR } from "lib/errors/customErrors";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { getActivationPermitTokenAddresses, signActivationTokenPermits } from "./activationTokenPermits";

const mocks = vi.hoisted(() => ({ sendTokenPermitMetric: vi.fn(), pushError: vi.fn() }));

vi.mock("lib/metrics/tokenPermitMetrics", () => ({ sendTokenPermitMetric: mocks.sendTokenPermitMetric }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: mocks.pushError } }));

const ARBITRUM = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

type TokenState = { balance: bigint; allowance: bigint; nonce: bigint } | "failed";

function mockClient(states: Record<string, TokenState>) {
  return {
    multicall: vi.fn(async ({ contracts }: { contracts: readonly { address: string; functionName: string }[] }) =>
      contracts.map(({ address, functionName }) => {
        const state = states[address];

        if (state === undefined || state === "failed") {
          return { status: "failure", error: new Error("reverted"), result: undefined };
        }

        const result = { balanceOf: state.balance, allowance: state.allowance, nonces: state.nonce }[functionName];
        return { status: "success", result };
      })
    ),
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
  it("picks held allowlisted tokens the Router can't spend yet", async () => {
    const tokens = await getTokens({
      states: {
        [USDC]: HELD,
        [USDT]: { balance: 0n, allowance: 0n, nonce: 0n },
        [WETH]: { balance: 100n, allowance: maxUint256, nonce: 0n },
      },
    });

    expect(tokens).toEqual([USDC]);
  });

  it("covers a token whose allowance is below the balance", async () => {
    const tokens = await getTokens({ states: { [USDC]: { balance: 100n, allowance: 99n, nonce: 0n } } });

    expect(tokens).toEqual([USDC]);
  });

  it("skips tokens that can't use permits, without reading them", async () => {
    const client = mockClient({ [USDC]: HELD, [WETH]: HELD });

    const tokens = await getActivationPermitTokenAddresses({
      chainId: ARBITRUM,
      client,
      account: ACCOUNT,
      spender: ROUTER,
      gasPaymentTokenAddress: undefined,
      tokenPermits: [],
      getIsPermitAvailable: (tokenAddress) => tokenAddress === WETH,
    });

    expect(tokens).toEqual([WETH]);
    expect(client.multicall.mock.calls[0][0].contracts.map((c: { address: string }) => c.address)).toEqual([
      WETH,
      WETH,
      WETH,
    ]);
  });

  it("reads nothing when no token can use permits", async () => {
    const client = mockClient({});

    const tokens = await getActivationPermitTokenAddresses({
      chainId: ARBITRUM,
      client,
      account: ACCOUNT,
      spender: ROUTER,
      gasPaymentTokenAddress: undefined,
      tokenPermits: [],
      getIsPermitAvailable: () => false,
    });

    expect(tokens).toEqual([]);
    expect(client.multicall).not.toHaveBeenCalled();
  });

  it("has no tokens on chains without verified permits", async () => {
    const tokens = await getActivationPermitTokenAddresses({
      chainId: 421614,
      client: mockClient({}),
      account: ACCOUNT,
      spender: ROUTER,
      gasPaymentTokenAddress: undefined,
      tokenPermits: [],
      getIsPermitAvailable: () => true,
    });

    expect(tokens).toEqual([]);
  });

  it("skips tokens whose reads failed", async () => {
    const tokens = await getTokens({ states: { [USDC]: "failed", [WETH]: HELD } });

    expect(tokens).toEqual([WETH]);
  });

  it("puts the gas payment token first", async () => {
    const tokens = await getTokens({ states: { [USDC]: HELD, [WETH]: HELD }, gasPaymentTokenAddress: WETH });

    expect(tokens).toEqual([WETH, USDC]);
  });

  it("skips a token with an unused permit from an earlier activation", async () => {
    // a JSON round trip leaves the nonce as a string
    const stored = permit(USDC, { onchainParams: { name: "Token", version: "1", nonce: "3" as unknown as bigint } });

    const tokens = await getTokens({ states: { [USDC]: HELD, [WETH]: HELD }, tokenPermits: [stored] });

    expect(tokens).toEqual([WETH]);
  });

  it.each([
    ["its nonce was used", permit(USDC, { onchainParams: { name: "Token", version: "1", nonce: 2n } })],
    ["it expires", permit(USDC, { deadline: 2000000000n })],
    ["it is for another spender", permit(USDC, { spender: "0x0000000000000000000000000000000000000002" })],
  ])("signs again over a stored permit when %s", async (_, stored) => {
    const tokens = await getTokens({ states: { [USDC]: HELD }, tokenPermits: [stored] });

    expect(tokens).toEqual([USDC]);
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
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith({
      chainId: ARBITRUM,
      tokenAddress: USDC,
      accountType: "eoa",
      flow: "oneClickActivation",
      outcome: "signed",
    });
    expect(disableTokenPermits).not.toHaveBeenCalled();
  });

  it("stops asking once the user rejects a permit, leaving the token on approvals", async () => {
    addTokenPermit.mockRejectedValueOnce(Object.assign(new Error("User rejected the request."), { code: 4001 }));

    await sign([USDC, WETH]);

    expect(addTokenPermit).toHaveBeenCalledTimes(1);
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith(
      expect.objectContaining({ tokenAddress: USDC, outcome: "rejected", flow: "oneClickActivation" })
    );
    expect(disableTokenPermits).not.toHaveBeenCalled();
  });

  it("keeps only tokens with an invalid signature on approvals and keeps going", async () => {
    addTokenPermit
      .mockRejectedValueOnce(getInvalidPermitSignatureError({ isValid: false, error: undefined, permit: permit(USDC) }))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("rpc unavailable"));

    await sign([USDC, WETH, USDT]);

    expect(addTokenPermit).toHaveBeenCalledTimes(3);
    expect(disableTokenPermits).toHaveBeenCalledTimes(1);
    expect(disableTokenPermits).toHaveBeenCalledWith([USDC], { chainId: ARBITRUM, account: ACCOUNT });
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith(
      expect.objectContaining({ tokenAddress: USDC, outcome: "fallback", reason: "invalidSignature" })
    );
    expect(mocks.sendTokenPermitMetric).toHaveBeenCalledWith(
      expect.objectContaining({ tokenAddress: USDT, outcome: "fallback", reason: "failed" })
    );
  });
  it("stops asking once the account or chain changes, still keeping earlier invalid signatures on approvals", async () => {
    addTokenPermit
      .mockRejectedValueOnce(new Error("rpc unavailable"))
      .mockRejectedValueOnce(getInvalidPermitSignatureError({ isValid: false, error: undefined, permit: permit(WETH) }))
      .mockRejectedValueOnce(new Error(PERMIT_WALLET_CHANGED_ERROR));

    await sign([USDC, WETH, USDT, USDC]);

    expect(addTokenPermit).toHaveBeenCalledTimes(3);
    expect(disableTokenPermits).toHaveBeenCalledWith([WETH], { chainId: ARBITRUM, account: ACCOUNT });
  });
});
