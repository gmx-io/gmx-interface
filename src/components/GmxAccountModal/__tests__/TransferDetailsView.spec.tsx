import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { MultichainFundingHistoryItem } from "domain/multichain/types";

import { TransferDetailsView } from "../TransferDetailsView";

const mocks = vi.hoisted(() => ({
  selectedGuid: "0xguid" as string | undefined,
  itemState: {
    transfer: undefined as MultichainFundingHistoryItem | undefined,
    isLoading: false,
    error: undefined as Error | undefined,
  },
}));

vi.mock("context/GmxAccountContext/hooks", () => {
  const setter = () => [undefined, vi.fn()] as const;

  return {
    useGmxAccountModalOpen: setter,
    useGmxAccountDepositViewChain: setter,
    useGmxAccountWithdrawalViewChain: setter,
    useGmxAccountDepositViewTokenAddress: setter,
    useGmxAccountDepositViewTokenInputValue: setter,
    useGmxAccountWithdrawalViewTokenAddress: setter,
    useGmxAccountWithdrawalViewTokenInputValue: setter,
    useGmxAccountSelectedTransferGuid: () => [mocks.selectedGuid, vi.fn()] as const,
  };
});

vi.mock("domain/multichain/useGmxAccountFundingHistory", () => ({
  useGmxAccountFundingHistoryItem: () => mocks.itemState,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161 }),
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

function renderView() {
  return render(
    <I18nProvider i18n={i18n}>
      <TransferDetailsView />
    </I18nProvider>
  );
}

const transfer: MultichainFundingHistoryItem = {
  id: "0xguid",
  operation: "deposit",
  step: "executed",
  settlementChainId: 42161,
  sourceChainId: 0,
  account: "0x426eC19dd3FE5623dAfc32d6636F34711CA99213",
  token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  sentAmount: 12_500_000n,
  receivedAmount: undefined,
  sentTxn: undefined,
  sentTimestamp: 1760000000,
  receivedTxn: undefined,
  receivedTimestamp: undefined,
  isExecutionError: false,
  executedTxn: undefined,
  executedTimestamp: undefined,
};

describe("TransferDetailsView", () => {
  afterEach(() => {
    cleanup();
    mocks.itemState = { transfer: undefined, isLoading: false, error: undefined };
    mocks.selectedGuid = "0xguid";
  });

  it("shows skeleton rows instead of empty values while loading", () => {
    mocks.itemState = { transfer: undefined, isLoading: true, error: undefined };

    const view = renderView();

    expect(view.container.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(0);
    expect(view.getByText("Date")).toBeTruthy();
    expect(view.getByText("Amount")).toBeTruthy();
    expect(view.queryByText(/ on /)).toBeNull();
    expect(view.queryByText("Transfer not found")).toBeNull();
    expect((view.getByRole("button", { name: "Repeat transaction" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an error message when the transfer failed to load", () => {
    mocks.itemState = { transfer: undefined, isLoading: false, error: new Error("squid down") };

    const view = renderView();

    expect(view.getByText("Failed to load transfer details")).toBeTruthy();
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
    expect((view.getByRole("button", { name: "Repeat transaction" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the error message while a retry is in flight", () => {
    mocks.itemState = { transfer: undefined, isLoading: true, error: new Error("squid down") };

    const view = renderView();

    expect(view.getByText("Failed to load transfer details")).toBeTruthy();
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
  });

  it("shows a not found message when there is no such transfer", () => {
    const view = renderView();

    expect(view.getByText("Transfer not found")).toBeTruthy();
    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
    expect(view.queryByText("Date")).toBeNull();
  });

  it("keeps the skeleton instead of not found while the selection is cleared on close", () => {
    mocks.selectedGuid = undefined;

    const view = renderView();

    expect(view.container.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(0);
    expect(view.queryByText("Transfer not found")).toBeNull();
  });

  it("shows the transfer details once loaded", () => {
    mocks.itemState = { transfer, isLoading: false, error: undefined };

    const view = renderView();

    expect(view.container.querySelector(".react-loading-skeleton")).toBeNull();
    expect(view.getByText("From")).toBeTruthy();
    expect(view.getByText(/12\.5/)).toBeTruthy();
    expect((view.getByRole("button", { name: "Repeat transaction" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
