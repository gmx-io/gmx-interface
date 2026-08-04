import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The wallet is connected to Base, but the order is verified on Arbitrum.
 * Some EIP-7702 wallets return a signature that is only valid on the chain they were connected to,
 * so the app has to notice that and ask the user to sign a second time on Arbitrum.
 */

// `vi.hoisted` runs before the imports, so chain ids are wired into these mocks in `beforeEach` instead.
const {
  chainState,
  clientToSignerMock,
  getAccountMock,
  getAccountTypeMock,
  getPublicClientWithRpcMock,
  getWalletClientMock,
  helperToastInfoMock,
  metricsPushErrorMock,
  metricsPushEventMock,
  switchNetworkMock,
  verificationClient,
} = vi.hoisted(() => {
  const chainState = { chainId: 0 };

  return {
    chainState,
    clientToSignerMock: vi.fn(),
    getAccountMock: vi.fn(),
    getAccountTypeMock: vi.fn(),
    getPublicClientWithRpcMock: vi.fn(),
    getWalletClientMock: vi.fn(),
    helperToastInfoMock: vi.fn(),
    metricsPushErrorMock: vi.fn(),
    metricsPushEventMock: vi.fn(),
    switchNetworkMock: vi.fn(async (chainId: number) => {
      chainState.chainId = chainId;
    }),
    verificationClient: { chain: { id: 0 }, verifyHash: vi.fn() },
  };
});

vi.mock("@wagmi/core", () => ({
  getAccount: getAccountMock,
  getChainId: () => chainState.chainId,
  getWalletClient: getWalletClientMock,
}));

vi.mock("config/chains", () => ({
  getChainName: (chainId: number) => String(chainId),
}));

vi.mock("lib/helperToast", () => ({
  helperToast: { info: helperToastInfoMock },
}));

vi.mock("lib/metrics", () => ({
  metrics: { pushError: metricsPushErrorMock, pushEvent: metricsPushEventMock },
}));

vi.mock(".", () => ({
  switchNetwork: switchNetworkMock,
}));

vi.mock("./useAccountType", () => ({
  AccountType: {
    PostEip7702EOA: 0,
    SmartAccount: 1,
    EOA: 2,
  },
  ACCOUNT_TYPE_LABELS: { 0: "postEip7702Eoa", 1: "smartAccount", 2: "eoa" },
  getAccountType: getAccountTypeMock,
}));

vi.mock("./useEthersSigner", () => ({
  clientToSigner: clientToSignerMock,
}));

vi.mock("./useWalletSessionChains", () => ({
  getConnectedWalletName: vi.fn().mockResolvedValue("Base"),
  isAccountMissingOnChain: vi.fn().mockResolvedValue(false),
}));

vi.mock("./walletConfig", () => ({
  getPublicClientWithRpc: getPublicClientWithRpcMock,
  getWagmiConfig: () => ({}),
}));

import { ARBITRUM, SOURCE_BASE_MAINNET as BASE } from "sdk/configs/chainIds";

import { signMessage, signTypedData } from "./signing";
import { AccountType } from "./useAccountType";
import { requiresVerificationChainSigning } from "./verificationChainSigning";

const ACCOUNT = "0xF5B94d808d97AEB44dE46d8997Fdc6D215fC6d60";
const SIGNATURE_FROM_BASE = `0x${"11".repeat(200)}`;
const SIGNATURE_FROM_ARBITRUM = `0x${"22".repeat(200)}`;

const domain = {
  name: "GmxBaseGelatoRelayRouter",
  version: "1",
  chainId: BASE,
  verifyingContract: "0xABFC734f7CFc9352AED7a97b1F6a236eae831e8A",
};

const types = {
  Test: [{ name: "value", type: "uint256" }],
};

function makeWallet(signature: string) {
  return {
    getAddress: vi.fn().mockResolvedValue(ACCOUNT),
    signMessage: vi.fn().mockResolvedValue(signature),
    provider: {
      send: vi.fn().mockResolvedValue(signature),
    },
  } as any;
}

type TestWallet = ReturnType<typeof makeWallet>;

/** How many times the app asked this wallet for a typed data signature. */
function typedDataRequestCount(wallet: TestWallet) {
  return wallet.provider.send.mock.calls.length;
}

/** Every chain the app switched to, in order. Signing on Arbitrum gives [ARBITRUM, BASE]: it switches back. */
function switchedChainIds() {
  return switchNetworkMock.mock.calls.map(([chainId]) => chainId);
}

function signOrderVerifiedOnArbitrum(wallet: TestWallet) {
  return signTypedData({ signer: wallet, domain, types, typedData: { value: 1n }, verificationChainId: ARBITRUM });
}

function verificationAlwaysSucceeds() {
  verificationClient.verifyHash.mockResolvedValue(true);
}

function verificationAlwaysFails() {
  verificationClient.verifyHash.mockResolvedValue(false);
}

function verificationFailsThenSucceeds() {
  verificationClient.verifyHash.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
}

function verificationIsUnavailable() {
  verificationClient.verifyHash.mockRejectedValue(new Error("RPC unavailable"));
}

describe("adaptive EIP-7702 signing", () => {
  let walletOnBase: TestWallet;
  let walletOnArbitrum: TestWallet;

  /** Goes through one failed signature, so the app stores that this wallet must sign on Arbitrum. */
  async function learnThatWalletNeedsArbitrum() {
    verificationFailsThenSucceeds();
    await signOrderVerifiedOnArbitrum(walletOnBase);

    verificationClient.verifyHash.mockReset();
    switchNetworkMock.mockClear();
    helperToastInfoMock.mockClear();
  }

  beforeEach(() => {
    localStorage.clear();
    chainState.chainId = BASE;
    walletOnBase = makeWallet(SIGNATURE_FROM_BASE);
    walletOnArbitrum = makeWallet(SIGNATURE_FROM_ARBITRUM);

    verificationClient.chain.id = ARBITRUM;
    getPublicClientWithRpcMock
      .mockReset()
      .mockImplementation((chainId: number) =>
        chainId === ARBITRUM ? verificationClient : { chain: { id: chainId } }
      );

    getAccountMock.mockReset().mockReturnValue({
      address: ACCOUNT,
      connector: { id: "coinbaseWalletSDK" },
    });
    getAccountTypeMock.mockReset().mockResolvedValue(AccountType.PostEip7702EOA);
    getWalletClientMock.mockReset().mockResolvedValue({});
    clientToSignerMock.mockReset().mockReturnValue(walletOnArbitrum);
    verificationClient.verifyHash.mockReset();
    switchNetworkMock.mockClear();
    helperToastInfoMock.mockClear();
    metricsPushErrorMock.mockClear();
    metricsPushEventMock.mockClear();
  });

  it("does not verify and does not switch chains when the wallet is already on the verification chain", async () => {
    await expect(
      signTypedData({ signer: walletOnBase, domain, types, typedData: { value: 1n }, verificationChainId: BASE })
    ).resolves.toBe(SIGNATURE_FROM_BASE);

    expect(verificationClient.verifyHash).not.toHaveBeenCalled();
    expect(switchNetworkMock).not.toHaveBeenCalled();
    expect(helperToastInfoMock).not.toHaveBeenCalled();
  });

  it("keeps the first signature when it is valid on the verification chain", async () => {
    verificationAlwaysSucceeds();

    await expect(signOrderVerifiedOnArbitrum(walletOnBase)).resolves.toBe(SIGNATURE_FROM_BASE);

    expect(typedDataRequestCount(walletOnBase)).toBe(1);
    expect(typedDataRequestCount(walletOnArbitrum)).toBe(0);
    expect(verificationClient.verifyHash).toHaveBeenCalledTimes(1);
    expect(switchNetworkMock).not.toHaveBeenCalled();
    expect(helperToastInfoMock).not.toHaveBeenCalled();
  });

  it("asks for a second signature on Arbitrum when the first one is invalid there", async () => {
    verificationFailsThenSucceeds();

    await expect(signOrderVerifiedOnArbitrum(walletOnBase)).resolves.toBe(SIGNATURE_FROM_ARBITRUM);

    expect(switchedChainIds()).toEqual([ARBITRUM, BASE]);
    expect(typedDataRequestCount(walletOnBase)).toBe(1);
    expect(typedDataRequestCount(walletOnArbitrum)).toBe(1);
    expect(verificationClient.verifyHash).toHaveBeenCalledTimes(2);
    // The user sees one message explaining why the wallet asks to change network.
    expect(helperToastInfoMock).toHaveBeenCalledTimes(1);
  });

  it("switches to Arbitrum before the first signature once it knows the wallet needs it", async () => {
    await learnThatWalletNeedsArbitrum();

    await expect(signOrderVerifiedOnArbitrum(walletOnBase)).resolves.toBe(SIGNATURE_FROM_ARBITRUM);

    expect(switchedChainIds()).toEqual([ARBITRUM, BASE]);
    expect(typedDataRequestCount(walletOnBase)).toBe(1); // only the one from learnThatWalletNeedsArbitrum
    expect(typedDataRequestCount(walletOnArbitrum)).toBe(2);
    // Nothing to check: the signature is made on the right chain from the start.
    expect(verificationClient.verifyHash).not.toHaveBeenCalled();
    expect(helperToastInfoMock).not.toHaveBeenCalled();
  });

  it("still knows the wallet needs Arbitrum after a page reload, because the flag is in localStorage", async () => {
    await learnThatWalletNeedsArbitrum();

    vi.resetModules();
    const { signTypedData: signTypedDataAfterReload } = await import("./signing");

    await expect(
      signTypedDataAfterReload({
        signer: walletOnBase,
        domain,
        types,
        typedData: { value: 1n },
        verificationChainId: ARBITRUM,
      })
    ).resolves.toBe(SIGNATURE_FROM_ARBITRUM);

    expect(switchedChainIds()).toEqual([ARBITRUM, BASE]);
    expect(verificationClient.verifyHash).not.toHaveBeenCalled();
  });

  it("keeps signMessage on the current chain, because its signature becomes a subaccount private key", async () => {
    await learnThatWalletNeedsArbitrum();

    await expect(
      signMessage({ signer: walletOnBase, message: "subaccount", verificationChainId: ARBITRUM })
    ).resolves.toBe(SIGNATURE_FROM_BASE);

    // Switching would change the signature, and with it the subaccount address the user already approved.
    expect(switchNetworkMock).not.toHaveBeenCalled();
  });

  it("keeps the first signature when the verification RPC call fails, instead of asking to sign again", async () => {
    verificationIsUnavailable();

    await expect(signOrderVerifiedOnArbitrum(walletOnBase)).resolves.toBe(SIGNATURE_FROM_BASE);

    expect(switchNetworkMock).not.toHaveBeenCalled();
    expect(typedDataRequestCount(walletOnArbitrum)).toBe(0);
    expect(metricsPushErrorMock).toHaveBeenCalledTimes(1);
  });

  it("sends the second signature anyway when it also looks invalid, and does not store the flag", async () => {
    verificationAlwaysFails();

    await expect(signOrderVerifiedOnArbitrum(walletOnBase)).resolves.toBe(SIGNATURE_FROM_ARBITRUM);

    expect(switchedChainIds()).toEqual([ARBITRUM, BASE]);
    expect(typedDataRequestCount(walletOnArbitrum)).toBe(1);
    expect(verificationClient.verifyHash).toHaveBeenCalledTimes(2);
    expect(metricsPushErrorMock).toHaveBeenCalledTimes(1);
    expect(requiresVerificationChainSigning(ACCOUNT, ARBITRUM)).toBe(false);
  });

  it("reports both signatures to telemetry, marking the second one as a retry", async () => {
    verificationFailsThenSucceeds();

    await signOrderVerifiedOnArbitrum(walletOnBase);

    await vi.waitFor(() => expect(metricsPushEventMock).toHaveBeenCalledTimes(2));
    expect(metricsPushEventMock.mock.calls.map(([event]) => event.data.isRetryAfterInvalidSignature)).toEqual([
      false,
      true,
    ]);
    expect(metricsPushEventMock.mock.calls[0][0].data).toMatchObject({
      signaturePurpose: "Test",
      signatureKind: "erc1271",
      signatureBytes: 200,
      signingChainId: BASE,
      verificationChainId: ARBITRUM,
      didSwitchChain: false,
      accountTypeOnSigningChain: "postEip7702Eoa",
      accountTypeOnVerificationChain: "postEip7702Eoa",
    });
  });
});
