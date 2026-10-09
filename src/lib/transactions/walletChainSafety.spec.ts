import { BrowserProvider, Contract, toQuantity, type Eip1193Provider } from "ethers";
import { createWalletClient, custom, publicActions } from "viem";
import { mainnet } from "viem/chains";
import { afterEach, describe, expect, it, vi } from "vitest";

import { approveTokens } from "domain/tokens/approveTokens";
import { callContract } from "lib/contracts/callContract";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { ISigner } from "./iSigner";
import { sendWalletTransaction } from "./sendWalletTransaction";

vi.mock("lib/rpc", () => ({ getProvider: vi.fn() }));
vi.mock("lib/tenderly", () => ({ getTenderlyConfig: () => undefined }));
vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: vi.fn() }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("lib/gas/estimateGasLimit", () => ({ estimateGasLimit: async () => 100000n }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: vi.fn(), pushEvent: vi.fn() } }));
vi.mock("lib/metrics/utils", () => ({ sendOrderTxnSubmittedMetric: vi.fn() }));
vi.mock("components/Errors/errorToasts", () => ({ getErrorMessage: () => ({ failMsg: "Failed" }) }));
vi.mock("lib/errors/additionalValidation", () => ({
  additionalTxnErrorValidation: vi.fn(),
  makeTransactionErrorHandler: () => (error: Error) => Promise.reject(error),
}));

const ACCOUNT = "0x0000000000000000000000000000000000000001";
const TARGET = "0x0000000000000000000000000000000000000002";
const HASH = `0x${"ab".repeat(32)}`;
const ARBITRUM = 42161;
const params = { chainId: ARBITRUM, to: TARGET, data: "0x1234", value: 10n ** 18n, gasLimit: 100000n };
const providers: BrowserProvider[] = [];

function setup(walletChainId: number) {
  const request = vi.fn<Eip1193Provider["request"]>(async ({ method }) => {
    if (method === "eth_chainId") return toQuantity(walletChainId);
    if (method === "eth_sendTransaction") return HASH;
    throw new Error(`Unexpected request: ${method}`);
  });
  const provider = new BrowserProvider({ request }, walletChainId);
  providers.push(provider);
  const signer = new UncheckedJsonRpcSigner(provider, ACCOUNT);
  return { signer, request };
}

function getSentRequest(request: ReturnType<typeof setup>["request"]) {
  return request.mock.calls.find(([payload]) => payload.method === "eth_sendTransaction")?.[0];
}

afterEach(() => {
  providers.splice(0).forEach((provider) => provider.destroy());
  vi.restoreAllMocks();
});

describe("wallet transaction chain propagation", () => {
  it.each(["direct", "ethers adapter"])("blocks wrong-chain sends through sendWalletTransaction (%s)", async (kind) => {
    const { signer, request } = setup(1);
    const walletSigner = kind === "direct" ? signer : await ISigner.from({ ethersSigner: signer });
    const callback = vi.fn();

    await expect(
      sendWalletTransaction({
        ...params,
        signer: walletSigner,
        callData: params.data,
        gasPriceData: { gasPrice: 1n },
        callback,
      })
    ).rejects.toThrow("wallet is connected to 1, but the transaction is on 42161");
    expect(getSentRequest(request)).toBeUndefined();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ event: "Error" }));
    expect(callback).not.toHaveBeenCalledWith(expect.objectContaining({ event: "Sent" }));
  });

  it("preserves chainId through the ethers adapter and sendWalletTransaction", async () => {
    const { signer, request } = setup(ARBITRUM);
    const walletSigner = await ISigner.from({ ethersSigner: signer });

    await expect(
      sendWalletTransaction({
        ...params,
        signer: walletSigner,
        callData: params.data,
        gasPriceData: { gasPrice: 1n },
      })
    ).resolves.toMatchObject({ transactionHash: HASH });
    expect(getSentRequest(request)?.params).toEqual([
      expect.objectContaining({
        chainId: "0xa4b1",
        data: params.data,
        value: toQuantity(params.value),
      }),
    ]);
  });

  it("checks the intended chain in the viem adapter even if the client and wallet agree on another chain", async () => {
    const { request } = setup(1);
    const client = createWalletClient({ account: ACCOUNT, chain: mainnet, transport: custom({ request }) }).extend(
      publicActions
    );
    const signer = ISigner.fromViemSigner(client);

    await expect(signer.sendTransaction(params)).rejects.toThrow(/chain/i);
    expect(getSentRequest(request)).toBeUndefined();
  });

  it.each([1, 8453, ARBITRUM])("preserves the intended chain %i in a viem wallet request", async (chainId) => {
    const { request } = setup(chainId);
    const client = createWalletClient({ account: ACCOUNT, chain: mainnet, transport: custom({ request }) }).extend(
      publicActions
    );
    const signer = ISigner.fromViemSigner(client);

    await expect(signer.sendTransaction({ ...params, chainId })).resolves.toMatchObject({ hash: HASH });
    expect(getSentRequest(request)?.params).toEqual([expect.objectContaining({ chainId: toQuantity(chainId) })]);
  });

  it.each([1, ARBITRUM])(
    "binds callContract overrides to the intended chain with wallet on %i",
    async (walletChainId) => {
      const { signer, request } = setup(walletChainId);
      const contract = new Contract(TARGET, ["function deposit() payable"], signer);
      const result = callContract(ARBITRUM, contract, "deposit", [], {
        value: params.value,
        gasLimit: params.gasLimit,
        gasPriceData: { gasPrice: 1n },
        hideSentMsg: true,
        hideErrorMsg: true,
      });

      if (walletChainId === ARBITRUM) {
        await expect(result).resolves.toMatchObject({ hash: HASH });
        expect(getSentRequest(request)?.params).toEqual([
          expect.objectContaining({ chainId: "0xa4b1", value: toQuantity(params.value) }),
        ]);
      } else {
        await expect(result).rejects.toThrow("Invalid network");
        expect(getSentRequest(request)).toBeUndefined();
      }
    }
  );

  it.each([1, ARBITRUM])("binds token approval to the intended chain with wallet on %i", async (walletChainId) => {
    const { signer, request } = setup(walletChainId);
    const onApproveFail = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await approveTokens({
      chainId: ARBITRUM,
      signer,
      tokenAddress: TARGET,
      spender: ACCOUNT,
      approveAmount: 100n,
      permitParams: undefined,
      setIsApproving: vi.fn(),
      onApproveFail,
      metric: { flow: "trade" },
    });

    if (walletChainId === ARBITRUM) {
      expect(result).toEqual({ hash: HASH });
      expect(getSentRequest(request)?.params).toEqual([expect.objectContaining({ chainId: "0xa4b1" })]);
      expect(onApproveFail).not.toHaveBeenCalled();
    } else {
      expect(result).toBeUndefined();
      expect(getSentRequest(request)).toBeUndefined();
      expect(onApproveFail).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Invalid network") }),
        { isPermit: false }
      );
    }
  });
});
