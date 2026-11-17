import { BrowserProvider, toQuantity, type Eip1193Provider } from "ethers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UncheckedJsonRpcSigner } from "./UncheckedJsonRpcSigner";

const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x0000000000000000000000000000000000000002";
const HASH = `0x${"ab".repeat(32)}`;
const ARBITRUM = 42161;
const transaction = { chainId: ARBITRUM, to: ROUTER, data: "0x1234", value: 10n ** 18n, gasLimit: 100000n };
const providers: BrowserProvider[] = [];

function setup(walletChainId: number, providerChainId = walletChainId) {
  const request = vi.fn<Eip1193Provider["request"]>(async ({ method }) => {
    if (method === "eth_chainId") return toQuantity(walletChainId);
    if (method === "eth_sendTransaction") return HASH;
    throw new Error(`Unexpected request: ${method}`);
  });
  const provider = new BrowserProvider({ request }, providerChainId);
  providers.push(provider);
  return { signer: new UncheckedJsonRpcSigner(provider, ACCOUNT), provider, request };
}

function sentTransactions(request: ReturnType<typeof setup>["request"]) {
  return request.mock.calls.filter(([payload]) => payload.method === "eth_sendTransaction");
}

afterEach(() => {
  providers.splice(0).forEach((provider) => provider.destroy());
});

describe("UncheckedJsonRpcSigner chain safety", () => {
  it.each([1, 8453, 56])("blocks Arbitrum calldata and native value when the wallet is on %i", async (chainId) => {
    const { signer, request } = setup(chainId);

    await expect(signer.sendTransaction(transaction)).rejects.toThrow(
      `Invalid network: wallet is connected to ${chainId}, but the transaction is on ${ARBITRUM}`
    );
    expect(sentTransactions(request)).toHaveLength(0);
  });

  it("reads the live wallet chain even when the provider was created for the expected chain", async () => {
    const { signer, provider, request } = setup(8453, ARBITRUM);
    const getNetwork = vi.spyOn(provider, "getNetwork");

    await expect(signer.sendTransaction(transaction)).rejects.toThrow("wallet is connected to 8453");
    expect(getNetwork).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({ method: "eth_chainId", params: [] });
    expect(sentTransactions(request)).toHaveLength(0);
  });

  it.each([undefined, null])("rejects a missing expected chain (%s) before requesting a send", async (chainId) => {
    const { signer, request } = setup(ARBITRUM);

    await expect(signer.sendTransaction({ ...transaction, chainId })).rejects.toThrow(
      "Transaction chainId is required"
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed when the wallet chain cannot be read", async () => {
    const { signer, provider, request } = setup(ARBITRUM);
    vi.spyOn(provider, "send").mockRejectedValue(new Error("Wallet disconnected"));

    await expect(signer.sendTransaction(transaction)).rejects.toThrow("Wallet disconnected");
    expect(sentTransactions(request)).toHaveLength(0);
  });

  it.each([0, -1, NaN])("rejects invalid expected chain %s before contacting the wallet", async (chainId) => {
    const { signer, request } = setup(ARBITRUM);

    await expect(signer.sendTransaction({ ...transaction, chainId })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("includes the expected chain, calldata and full native amount in the wallet request", async () => {
    const { signer, request } = setup(ARBITRUM);

    await expect(signer.sendTransaction(transaction)).resolves.toMatchObject({ hash: HASH });
    expect(sentTransactions(request)).toEqual([
      [
        {
          method: "eth_sendTransaction",
          params: [
            {
              chainId: "0xa4b1",
              from: ACCOUNT,
              to: ROUTER,
              data: transaction.data,
              value: toQuantity(transaction.value),
              gas: toQuantity(transaction.gasLimit),
            },
          ],
        },
      ],
    ]);
  });

  it("allows a transaction whose intended destination is a source chain", async () => {
    const { signer, request } = setup(8453);

    await expect(signer.sendTransaction({ ...transaction, chainId: 8453 })).resolves.toMatchObject({ hash: HASH });
    expect(sentTransactions(request)[0][0].params).toEqual([expect.objectContaining({ chainId: "0x2105" })]);
  });

  it("also guards callers of sendUncheckedTransaction", async () => {
    const { signer, request } = setup(1);

    await expect(signer.sendUncheckedTransaction(transaction)).rejects.toThrow("Invalid network");
    expect(sentTransactions(request)).toHaveLength(0);
  });

  it("keeps the expected chain in the request if the wallet changes after validation", async () => {
    const { signer, request } = setup(ARBITRUM);
    request.mockImplementation(async ({ method, params }) => {
      if (method === "eth_chainId") return toQuantity(ARBITRUM);
      if (method === "eth_sendTransaction") {
        expect(params).toEqual([expect.objectContaining({ chainId: "0xa4b1" })]);
        throw new Error("Wallet chain changed before signing");
      }
      throw new Error(`Unexpected request: ${method}`);
    });

    await expect(signer.sendTransaction(transaction)).rejects.toThrow("Wallet chain changed before signing");
  });
});
