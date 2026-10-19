import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import type { ContractName } from "sdk/configs/contracts";

import BeginAccountTransfer from "./BeginAccountTransfer";

const SENDER = "0xf9124c1407E942CAD6e44Ac18Aa3E66754913C7f";
const RECEIVER = "0x3F2489706588da1bbd8E8294562F67E1cfC444B5";
const STAKED_AMOUNT = 4730123000000000000000n;

let chainValues: Record<string, bigint> = {};

function setChainValue(account: string, contractName: ContractName, method: string, value: bigint) {
  chainValues[`${account}.${getContract(ARBITRUM, contractName)}.${method}`] = value;
}

vi.mock("swr", () => ({
  default: (key: unknown[] | false) => {
    if (!key) {
      return { data: undefined };
    }

    const [, , contractAddress, method, account] = key;

    return { data: chainValues[`${account}.${contractAddress}.${method}`] ?? 0n };
  },
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ active: true, signer: undefined, account: SENDER }),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM }),
}));

vi.mock("lib/contracts", () => ({
  callContract: vi.fn(),
  contractFetcher: () => undefined,
}));

vi.mock("domain/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("domain/tokens")>()),
  approveTokens: vi.fn(),
}));

vi.mock("domain/synthetics/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("domain/synthetics/tokens")>()),
  useTokensAllowanceData: (_chainId: number, p: { tokenAddresses: string[] }) => ({
    tokensAllowanceData: Object.fromEntries(p.tokenAddresses.map((address) => [address, 0n])),
  }),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));

vi.mock("components/AppPageLayout/AppPageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => {
  chainValues = {};
  setChainValue(SENDER, "FeeGmxTracker", "balanceOf", STAKED_AMOUNT);
  setChainValue(SENDER, "FeeGmxTracker", "stakedAmounts", STAKED_AMOUNT);
});

afterEach(cleanup);

function renderWithReceiver() {
  const { container, getByRole } = render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BeginAccountTransfer />
      </MemoryRouter>
    </I18nProvider>
  );

  fireEvent.change(container.querySelector("input")!, { target: { value: RECEIVER } });

  return { getByRole };
}

describe("BeginAccountTransfer", () => {
  it.each([
    ["receiver", "ExtendedGmxTracker", "cumulativeRewards", "Receiver has staked GMX/GLP"],
    ["receiver", "FeeGmxTracker", "cumulativeRewards", "Receiver has staked GMX/GLP"],
    ["receiver", "GmxVester", "transferredAverageStakedAmounts", "Receiver has staked GMX/GLP"],
    ["receiver", "GlpVester", "transferredAverageStakedAmounts", "Receiver has staked GMX/GLP"],
    ["receiver", "GmxVester", "balanceOf", "Receiver has staked GMX/GLP"],
    ["receiver", "GlpVester", "balanceOf", "Receiver has staked GMX/GLP"],
    ["sender", "FeeGmxTracker", "balanceOf", "Vested GMX not withdrawn"],
    ["sender", "StakedGlpTracker", "stakedAmounts", "Vested GLP not withdrawn"],
  ] as const)(
    "blocks a transfer the RewardRouter rejects: %s %s.%s PRO-3328",
    (party, contractName, method, buttonText) => {
      setChainValue(party === "receiver" ? RECEIVER : SENDER, contractName, method, 1971744599851366909069n);

      const { getByRole } = renderWithReceiver();

      expect(getByRole("button", { name: buttonText }).hasAttribute("disabled")).toBe(true);
    }
  );

  it.each([
    ["sbfGMX", 0n, "Allow all tokens to transfer to the new account"],
    ["GMX", 12871058473350485739n, "Approve GMX"],
  ] as const)("asks for the %s approval the transfer needs PRO-3328", (_token, claimableGmx, buttonText) => {
    setChainValue(SENDER, "ExtendedGmxTracker", "claimable", claimableGmx);

    const { getByRole } = renderWithReceiver();

    expect(getByRole("button", { name: buttonText })).toBeTruthy();
  });
});
