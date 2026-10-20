import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  getEsGmxDistributionError,
  getEsGmxIssuerFunding,
  getUnusedEsGmxDistributionBatchIndex,
} from "domain/vesting/esGmxDistribution";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";

import { RewardsDistributeEsGmxModal } from "../RewardsDistributeEsGmxModal";

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(function (address) {
        return { address };
      }),
    },
  };
});
vi.mock("domain/vesting/esGmxDistribution", () => ({
  getEsGmxDistributionError: vi.fn(),
  getEsGmxIssuerFunding: vi.fn(),
  getUnusedEsGmxDistributionBatchIndex: vi.fn(),
}));
vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({ useIncentivesV2State: vi.fn() }));
vi.mock("lib/contracts", () => ({ callContract: vi.fn() }));
vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({
  useMultipleWalletExtensionsChainError: vi.fn(),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: vi.fn(), getPageOutdatedError: () => "Outdated" }));
vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));
vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));
vi.mock("lib/helperToast", () => ({ helperToast: { info: vi.fn(), error: vi.fn() } }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const wallet = { account: ACCOUNT, active: true, chainId: ARBITRUM_SEPOLIA, signer: {} };
const onDistributed = vi.fn();
const setIsVisible = vi.fn();
const mockCallContract = vi.mocked(callContract);
const config = {
  epochTimestamp: 1_789_736_400,
  epochDuration: 3_600,
  programStartTimestamp: 1_788_220_800,
} as IncentivesConfig;
const swrConfig = { provider: () => new Map() };

function mockConfig(next: IncentivesConfig | undefined = config) {
  vi.mocked(useIncentivesV2State).mockReturnValue({
    availability: next ? { status: "active", config: next, isStale: false } : { status: "loading" },
    isActive: Boolean(next),
    refreshConfig: vi.fn(),
  });
}

i18n.load({ en: {} });
i18n.activate("en");

function view(isVisible = true) {
  return (
    <I18nProvider i18n={i18n}>
      <SWRConfig value={swrConfig}>
        <RewardsDistributeEsGmxModal isVisible={isVisible} setIsVisible={setIsVisible} onDistributed={onDistributed} />
      </SWRConfig>
    </I18nProvider>
  );
}

const RECIPIENT = "0x0000000000000000000000000000000000000001";
const ES_GMX_ISSUER = getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer");

function setField(name: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
}

describe("Sepolia reward distribution modal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig();
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall: 0n, walletBalance: 100n * 10n ** 18n });
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(0n);
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM_SEPOLIA } as ReturnType<typeof useChainId>);
    vi.mocked(useWallet).mockReturnValue(wallet as ReturnType<typeof useWallet>);
    vi.mocked(useMultipleWalletExtensionsChainError).mockReturnValue({});
    vi.mocked(getEsGmxDistributionError).mockResolvedValue(undefined);
    mockCallContract.mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) } as any);
    onDistributed.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it.each([
    {
      name: "distributes to the connected wallet with the default epoch and unused batch",
      unusedBatchIndex: 4n,
      button: "Distribute esGMX",
      expected: [
        ES_GMX_ISSUER,
        "distributeEpoch",
        [BigInt(config.epochTimestamp - config.epochDuration), 4n, [ACCOUNT], [100n * 10n ** 18n]],
      ],
    },
    {
      name: "distributes the entered epoch, batch, recipient, and amount",
      fields: { "Epoch ID": "0", "Batch index": "3", "Recipient address": RECIPIENT, Amount: "1.25" },
      button: "Distribute esGMX",
      expected: [ES_GMX_ISSUER, "distributeEpoch", [0n, 3n, [RECIPIENT], [1_250_000_000_000_000_000n]]],
    },
    {
      name: "sends only the issuer shortfall",
      shortfall: 1_250_000_000_000_000_000n,
      button: "Send 1.25 esGMX to issuer",
      expected: [
        getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx"),
        "transfer",
        [ES_GMX_ISSUER, 1_250_000_000_000_000_000n],
      ],
    },
  ])("$name", async ({ unusedBatchIndex, fields, shortfall, button, expected }) => {
    if (unusedBatchIndex !== undefined)
      vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(unusedBatchIndex);
    if (shortfall !== undefined) {
      vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall, walletBalance: 100n * 10n ** 18n });
    }
    render(view());
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe(
        String(unusedBatchIndex ?? 0n)
      )
    );
    Object.entries(fields ?? {}).forEach(([name, value]) => setField(name, value));

    fireEvent.click(await screen.findByRole("button", { name: button }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    const [address, method, params] = expected;
    expect(mockCallContract.mock.calls[0].slice(0, 4)).toEqual([ARBITRUM_SEPOLIA, { address }, method, params]);
  });
});
