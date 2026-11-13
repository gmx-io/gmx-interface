import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { AccountType, useAccountType } from "lib/wallets/useAccountType";

const source = vi.hoisted(() => ({
  networkId: -501,
  code: vi.fn().mockResolvedValue("0x"),
  incentives: vi.fn().mockResolvedValue({ trading: { isActive: false } }),
}));
vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161, networkId: source.networkId }),
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0000000000000000000000000000000000000001", connector: { uid: "test" } }),
}));
vi.mock("@wagmi/core", () => ({ watchAccount: () => () => undefined }));
vi.mock("lib/wallets/walletConfig", () => ({
  getWagmiConfig: () => ({}),
  getPublicClientWithRpc: () => ({ chain: { id: 42161 }, getCode: source.code }),
}));
vi.mock("lib/oracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => ({ fetchIncentivesRewards: source.incentives }),
}));
afterEach(cleanup);

it("isolates EVM account classification and incentives across Solana reloads and network switches FESOL-19", async () => {
  source.networkId = SOLANA_NETWORK_ID;
  const cache = new Map();
  const config = { provider: () => cache, dedupingInterval: 0 };
  let result!: { account: ReturnType<typeof useAccountType>; stats: ReturnType<typeof useIncentiveStats> };
  function Probe() {
    result = { account: useAccountType(), stats: useIncentiveStats() };
    return null;
  }
  const content = () => (
    <SWRConfig value={config}>
      <Probe />
    </SWRConfig>
  );
  const view = render(content());
  await act(async () => {
    await Promise.resolve();
  });
  expect(source.code).not.toHaveBeenCalled();
  expect(source.incentives).not.toHaveBeenCalled();
  expect(result.account.accountType).toBeUndefined();
  expect(result.stats).toBeNull();

  source.networkId = ARBITRUM;
  view.rerender(content());
  await waitFor(() => {
    expect(result.account.accountType).toBe(AccountType.EOA);
    expect(result.stats).toEqual({ trading: { isActive: false } });
  });
  const codeReads = source.code.mock.calls.length;
  const incentiveReads = source.incentives.mock.calls.length;
  source.networkId = SOLANA_NETWORK_ID;
  view.rerender(content());
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.account.accountType).toBeUndefined();
  expect(result.stats).toBeNull();
  expect(source.code).toHaveBeenCalledTimes(codeReads);
  expect(source.incentives).toHaveBeenCalledTimes(incentiveReads);

  source.networkId = ARBITRUM;
  view.rerender(content());
  await waitFor(() => expect(result.account.accountType).toBe(AccountType.EOA));
});
