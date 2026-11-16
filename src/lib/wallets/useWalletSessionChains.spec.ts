import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccountMock, getAccountTypeMock } = vi.hoisted(() => ({
  getAccountMock: vi.fn(),
  getAccountTypeMock: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  getAccount: getAccountMock,
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
  getPublicClientWithRpc: (chainId: number) => ({ chain: { id: chainId } }),
}));

vi.mock("./useAccountType", () => ({
  AccountType: { PostEip7702EOA: 0, SmartAccount: 1, EOA: 2 },
  getAccountType: getAccountTypeMock,
}));

import { AccountType } from "./useAccountType";
import { getWillChainSwitchChangeAccount, isAccountMissingOnChain } from "./useWalletSessionChains";

const ACCOUNT = "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2";
const ARBITRUM = 42161;
const BASE = 8453; // SOURCE_BASE_MAINNET

function mockSession(chainIds: number[]) {
  getAccountMock.mockReturnValue({
    chainId: chainIds[0],
    connector: {
      getProvider: async () => ({
        session: { namespaces: { eip155: { accounts: chainIds.map((chainId) => `eip155:${chainId}:${ACCOUNT}`) } } },
      }),
    },
  });
}

function mockUnreadableSession(currentChainId: number) {
  getAccountMock.mockReturnValue({
    chainId: currentChainId,
    connector: { getProvider: async () => ({}) },
  });
}

function mockAccountTypes(byChainId: Record<number, AccountType>) {
  getAccountTypeMock.mockImplementation(async (_address: string, client: { chain: { id: number } }) => {
    return byChainId[client.chain.id] ?? AccountType.EOA;
  });
}

describe("isAccountMissingOnChain", () => {
  beforeEach(() => {
    getAccountMock.mockReset();
    getAccountTypeMock.mockReset();
  });

  it("does not block an EOA from a chain its session omits", async () => {
    mockSession([ARBITRUM]);
    mockAccountTypes({ [ARBITRUM]: AccountType.EOA, [BASE]: AccountType.EOA });

    await expect(isAccountMissingOnChain(ACCOUNT, BASE)).resolves.toBe(false);
    await expect(getWillChainSwitchChangeAccount(ACCOUNT, BASE)).resolves.toBe(false);
  });

  it("blocks a smart wallet that has no code on the target chain", async () => {
    mockSession([ARBITRUM]);
    mockAccountTypes({ [ARBITRUM]: AccountType.SmartAccount, [BASE]: AccountType.EOA });

    await expect(isAccountMissingOnChain(ACCOUNT, BASE)).resolves.toBe(true);
    await expect(getWillChainSwitchChangeAccount(ACCOUNT, BASE)).resolves.toBe(true);
  });

  it("allows a smart wallet already deployed on the target chain", async () => {
    mockSession([ARBITRUM]);
    mockAccountTypes({ [ARBITRUM]: AccountType.SmartAccount, [BASE]: AccountType.SmartAccount });

    await expect(isAccountMissingOnChain(ACCOUNT, BASE)).resolves.toBe(false);
  });

  it("still detects a missing smart wallet once the wallet has swapped to the target chain", async () => {
    // What buildChainSwitchError sees: session unreadable (Privy proxy) and wagmi already on the target.
    mockUnreadableSession(ARBITRUM);
    mockAccountTypes({ [BASE]: AccountType.SmartAccount, [ARBITRUM]: AccountType.EOA });

    await expect(isAccountMissingOnChain(ACCOUNT, ARBITRUM)).resolves.toBe(true);
  });

  it("does not block a chain the session already declares", async () => {
    mockSession([ARBITRUM, BASE]);
    mockAccountTypes({ [ARBITRUM]: AccountType.SmartAccount, [BASE]: AccountType.EOA });

    await expect(getWillChainSwitchChangeAccount(ACCOUNT, BASE)).resolves.toBe(false);
  });
});
