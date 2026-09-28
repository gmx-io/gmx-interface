import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getRewardsVestingConfig } from "config/vesting";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { useEsGmxIssuerData } from "domain/vesting/useEsGmxIssuerData";
import useWallet from "lib/wallets/useWallet";

import UserIncentiveDistribution from "../UserIncentiveDistribution";

vi.mock("domain/synthetics/common/useUserIncentiveData", () => ({ default: vi.fn() }));
vi.mock("domain/vesting/useEsGmxIssuerData", () => ({ useEsGmxIssuerData: vi.fn() }));
vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));
vi.mock("lib/wallets/useIsWalletInitializing", () => ({ useIsWalletInitializing: () => false }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: ARBITRUM_SEPOLIA }) }));
vi.mock("lib/useBreakpoints", () => ({ useBreakpoints: () => ({ isMobile: false, isTablet: false }) }));
vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: () => undefined,
}));
vi.mock("domain/synthetics/markets", () => ({ useMarketTokensData: () => ({ marketTokensData: undefined }) }));
vi.mock("../ClaimableAmounts", () => ({ default: () => <div>Legacy claim balances</div> }));
vi.mock("../EsGmxIssuerClaimableAmounts", () => ({
  EsGmxIssuerClaimableAmounts: () => <div>Issuer claim balance</div>,
}));

i18n.load({ en: {} });
i18n.activate("en");
const transactionHash = `0x${"a".repeat(64)}`;
const legacyResult = {
  data: [
    {
      id: "legacy",
      typeId: "1001",
      timestamp: 100,
      transactionHash,
      tokens: ["0x29211690da8c7770D5189638272c837925BB83FB"],
      amounts: ["1000000000000000000"],
      amountsInUsd: ["1000000000000000000000000000000"],
    },
  ],
  isLoading: false,
  error: undefined,
};

function issuerResult() {
  return {
    issuerConfig: getRewardsVestingConfig(ARBITRUM_SEPOLIA),
    enabled: true,
    history: {
      data: [{ id: "issued", amount: 100n * 10n ** 18n, epochId: 1n, batchIndex: 0n, timestamp: 200, transactionHash }],
      isLoading: false,
      error: undefined,
    },
    claimable: { data: 100n * 10n ** 18n, isLoading: false, error: undefined, mutate: vi.fn() },
  };
}

function renderPage() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <UserIncentiveDistribution />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("Earn distribution history", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      account: "0x52908400098527886E0F7030069857D2E4169EE7",
      active: true,
    } as ReturnType<typeof useWallet>);
    vi.mocked(useUserIncentiveData).mockReturnValue(legacyResult as any);
    vi.mocked(useEsGmxIssuerData).mockReturnValue(issuerResult() as any);
  });
  afterEach(cleanup);

  it("merges issuer events with existing distributions in reverse chronological order", () => {
    renderPage();
    const rows = document.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText("esGMX incentives")).toBeDefined();
    expect(within(rows[0] as HTMLElement).getByText(/100.*esGMX/)).toBeDefined();
    expect(within(rows[1] as HTMLElement).getByText("GM airdrop")).toBeDefined();
    expect(screen.getByText("Legacy claim balances")).toBeDefined();
    expect(screen.getByText("Issuer claim balance")).toBeDefined();
  });

  it("shows issuer distributions even when the old indexer has no history", () => {
    vi.mocked(useUserIncentiveData).mockReturnValue({ ...legacyResult, data: [] });
    renderPage();
    expect(screen.getByText("esGMX incentives")).toBeDefined();
    expect(screen.queryByText("No distribution history")).toBeNull();
  });

  it("preserves existing history and shows an error when the issuer RPC fails", () => {
    const issuer = issuerResult();
    vi.mocked(useEsGmxIssuerData).mockReturnValue({
      ...issuer,
      history: { data: undefined, isLoading: false, error: new Error("RPC unavailable") },
    } as any);
    renderPage();
    expect(screen.getByText("GM airdrop")).toBeDefined();
    expect(screen.getByText("Some distribution history could not be loaded. Please try again.")).toBeDefined();
  });

  it("preserves issuer history when the old indexer fails", () => {
    vi.mocked(useUserIncentiveData).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Indexer unavailable"),
    });
    renderPage();
    expect(screen.getByText("esGMX incentives")).toBeDefined();
    expect(screen.getByText("Some distribution history could not be loaded. Please try again.")).toBeDefined();
  });

  it("waits for issuer history before showing an empty state", () => {
    vi.mocked(useUserIncentiveData).mockReturnValue({ ...legacyResult, data: [] });
    vi.mocked(useEsGmxIssuerData).mockReturnValue({
      ...issuerResult(),
      history: { data: undefined, isLoading: true },
    } as any);
    renderPage();
    expect(screen.getByText("Loading...")).toBeDefined();
    expect(screen.queryByText("No distribution history")).toBeNull();
  });
});
