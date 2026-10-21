import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { BrowserProvider, toQuantity, type Eip1193Provider, type JsonRpcApiProvider } from "ethers";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient, custom } from "viem";
import { arbitrum } from "viem/chains";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { helperToast } from "lib/helperToast";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { clientToSigner } from "lib/wallets/useEthersSigner";

import { approveTokens } from "./approveTokens";

const mocks = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("lib/rpc", () => ({ getProvider: vi.fn() }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("lib/gas/estimateGasLimit", () => ({ estimateGasLimit: async () => 100000n }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn(), pushEvent: mocks.pushEvent } }));

const ARBITRUM = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const SPENDER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const GM_BTC_USD = "0x47c031236e19d024b42f8AE6780E44A573170703";
const HASH = `0x${"ab".repeat(32)}`;
const providers: JsonRpcApiProvider[] = [];

function createSigner(sendTransaction: () => Promise<string>) {
  const request = vi.fn<Eip1193Provider["request"]>(async ({ method }) => {
    if (method === "eth_chainId") return toQuantity(ARBITRUM);
    if (method === "eth_sendTransaction") return sendTransaction();
    throw new Error(`Unexpected request: ${method}`);
  });
  const provider = new BrowserProvider({ request }, ARBITRUM);
  providers.push(provider);

  return new UncheckedJsonRpcSigner(provider, ACCOUNT);
}

function approve({
  sendTransaction,
  tokenAddress = USDC,
  approveAmount,
}: {
  sendTransaction: () => Promise<string>;
  tokenAddress?: string;
  approveAmount?: bigint;
}) {
  return approveTokens({
    chainId: ARBITRUM,
    signer: createSigner(sendTransaction),
    tokenAddress,
    spender: SPENDER,
    approveAmount,
    permitParams: undefined,
    setIsApproving: vi.fn(),
    metric: { flow: "trade", isExpress: true, isGasPaymentToken: true },
  });
}

function getApprovalEvents() {
  return mocks.pushEvent.mock.calls.map(([event]) => event).filter((event) => event.event === "tokenApproval");
}

afterEach(() => {
  providers.splice(0).forEach((provider) => provider.destroy());
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("approveTokens metric", () => {
  it("reports an accepted unlimited approval transaction with its context", async () => {
    await approve({ sendTransaction: async () => HASH });

    expect(getApprovalEvents()).toEqual([
      {
        event: "tokenApproval",
        isError: false,
        data: {
          flow: "trade",
          isExpress: true,
          isGasPaymentToken: true,
          method: "transaction",
          outcome: "accepted",
          chainId: ARBITRUM,
          tokenAddress: USDC,
          tokenSymbol: "USDC",
          spenderAddress: SPENDER,
          isUnlimited: true,
        },
      },
    ]);
  });

  it("reports a rejected approval when the user denies the transaction", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approve({
      sendTransaction: async () => {
        throw Object.assign(new Error("User denied transaction signature"), { code: 4001 });
      },
    });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ method: "transaction", outcome: "rejected" }) }),
    ]);
  });

  it("reports a failed approval when the transaction errors for another reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approve({
      sendTransaction: async () => {
        throw new Error("internal error");
      },
    });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ method: "transaction", outcome: "failed" }) }),
    ]);
  });

  it("names GM tokens and marks exact amounts as limited", async () => {
    await approve({ sendTransaction: async () => HASH, tokenAddress: GM_BTC_USD, approveAmount: 100n });

    expect(getApprovalEvents()).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ tokenAddress: GM_BTC_USD, tokenSymbol: "GM", isUnlimited: false }),
      }),
    ]);
  });
});

describe("approveTokens permit metric", () => {
  function approveWithPermit(addTokenPermit: () => Promise<void>, sendTransaction = async () => HASH) {
    return approveTokens({
      chainId: ARBITRUM,
      signer: createSigner(sendTransaction),
      tokenAddress: USDC,
      spender: SPENDER,
      approveAmount: undefined,
      permitParams: { addTokenPermit, setIsPermitsDisabled: vi.fn(), isPermitsDisabled: false },
      setIsApproving: vi.fn(),
      metric: { flow: "trade", isExpress: true },
    });
  }

  function getOutcomes() {
    return getApprovalEvents().map(({ data }) => `${data.method}:${data.outcome}`);
  }

  it("reports a signed permit without a transaction", async () => {
    await approveWithPermit(async () => undefined);

    expect(getOutcomes()).toEqual(["permit:accepted"]);
  });

  it("reports a rejected permit and stops", async () => {
    await approveWithPermit(async () => {
      throw new Error("User rejected the request.");
    });

    expect(getOutcomes()).toEqual(["permit:rejected"]);
  });

  it("reports a failed permit and the approval transaction that replaces it", async () => {
    await approveWithPermit(async () => {
      throw new Error("Unknown connector error");
    });

    expect(getOutcomes()).toEqual(["permit:failed", "transaction:accepted"]);
  });
});

describe("approveTokens rejection toast", () => {
  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  function createWalletSigner(walletError: unknown) {
    const wallet = {
      request: async ({ method }: { method: string }) => {
        if (method === "eth_chainId") return toQuantity(ARBITRUM);
        if (method === "eth_sendTransaction" || method === "eth_signTypedData_v4") throw walletError;
        throw new Error(`Unexpected request: ${method}`);
      },
    };
    const signer = clientToSigner(
      createClient({ account: ACCOUNT, chain: arbitrum, transport: custom(wallet) }),
      ACCOUNT
    );
    providers.push(signer.provider);

    return signer;
  }

  function approveWithWalletError(walletError: unknown, { isPermit = false }: { isPermit?: boolean } = {}) {
    const signer = createWalletSigner(walletError);

    return approveTokens({
      chainId: ARBITRUM,
      signer,
      tokenAddress: USDC,
      spender: SPENDER,
      approveAmount: undefined,
      permitParams: isPermit
        ? {
            addTokenPermit: async () => {
              await signer.provider.send("eth_signTypedData_v4", [ACCOUNT, "{}"]);
            },
            setIsPermitsDisabled: vi.fn(),
            isPermitsDisabled: false,
          }
        : undefined,
      setIsApproving: vi.fn(),
      metric: { flow: "gmBuy" },
    });
  }

  function getErrorToastText() {
    const [[content]] = vi.mocked(helperToast.error).mock.calls;
    return renderToStaticMarkup(<I18nProvider i18n={i18n}>{content as ReactNode}</I18nProvider>);
  }

  function getOutcomes() {
    return getApprovalEvents().map(({ data }) => `${data.method}:${data.outcome}`);
  }

  const rejections: [string, object][] = [
    ["Rabby", { code: 4001, message: "User rejected the request." }],
    ["MetaMask", { code: 4001, message: "MetaMask Tx Signature: User denied transaction signature." }],
    ["WalletConnect", { code: 5000, message: "User rejected." }],
    ["WalletConnect with a custom message", { code: 5000, message: "Rejected by user" }],
    ["a wallet with a custom message", { code: 4001, message: "The user rejected the request" }],
    ["a wallet without an error code", { message: "User denied transaction" }],
  ];

  it.each(rejections)("shows approval cancelled when the user rejects in %s", async (_wallet, walletError) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approveWithWalletError(walletError);

    expect(getErrorToastText()).toBe("Approval cancelled");
    expect(getOutcomes()).toEqual(["transaction:rejected"]);
  });

  it.each([
    ...rejections,
    ["a wallet with a lowercase message and another code", { code: -32000, message: "user rejected the request" }],
  ])("shows permit signing cancelled when the user rejects in %s", async (_wallet, walletError) => {
    await approveWithWalletError(walletError, { isPermit: true });

    expect(getErrorToastText()).toBe("Permit signing cancelled");
    expect(getOutcomes()).toEqual(["permit:rejected"]);
  });

  it.each([
    ["an internal wallet error", { code: -32603, message: "Internal JSON-RPC error." }],
    [
      "an unauthorized account",
      { code: 4100, message: "The requested account and/or method has not been authorized by the user." },
    ],
  ])("shows approval failed with error details for %s", async (_reason, walletError) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await approveWithWalletError(walletError);

    const text = getErrorToastText();
    expect(text).toContain("Approval failed");
    expect(text).not.toContain("Approval cancelled");
    expect(getOutcomes()).toEqual(["transaction:failed"]);
  });
});
