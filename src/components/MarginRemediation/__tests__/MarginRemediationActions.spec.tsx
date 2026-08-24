import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { openAtPrice, openDepositNow, walletState } = vi.hoisted(() => ({
  openAtPrice: vi.fn(),
  openDepositNow: vi.fn(),
  walletState: { account: undefined as string | undefined },
}));

vi.mock("context/SyntheticsStateContext/hooks/positionEditorHooks", () => ({
  usePositionEditorOpenAtPrice: () => openAtPrice,
  usePositionEditorOpenDepositNow: () => openDepositNow,
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: walletState.account }),
}));

import {
  DepositMarginNowAction,
  MarginDepositInsufficientMessage,
  ReplaceMarginDepositAction,
} from "../MarginRemediationActions";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const OTHER_ACCOUNT = "0x2222222222222222222222222222222222222222";
const POSITION_KEY = `${ACCOUNT}:0xmarket:0xcollateral:true`;
const ORDER_KEY = "0xorderkey";

const INSUFFICIENT_MESSAGE =
  "This deposit would not leave the position above its liquidation requirement at the trigger price. Increase the deposit amount or move the trigger farther from liquidation.";

function renderWithI18n(node: ReactNode) {
  return render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => {
  openAtPrice.mockClear();
  openDepositNow.mockClear();
  walletState.account = ACCOUNT;
});

afterEach(cleanup);

describe("DepositMarginNowAction", () => {
  it("opens the deposit-now flow for the connected wallet's position", () => {
    const { getByRole } = renderWithI18n(
      <DepositMarginNowAction positionKey={POSITION_KEY}>Deposit margin</DepositMarginNowAction>
    );

    fireEvent.click(getByRole("button", { name: "Deposit margin" }));

    expect(openDepositNow).toHaveBeenCalledWith(POSITION_KEY);
  });

  it("renders plain text when the position cannot be resolved", () => {
    const { getByText, queryByRole } = renderWithI18n(
      <DepositMarginNowAction positionKey={undefined}>Deposit margin</DepositMarginNowAction>
    );

    expect(getByText("Deposit margin")).toBeTruthy();
    expect(queryByRole("button")).toBeNull();
  });

  it("renders plain text for another account's position", () => {
    walletState.account = OTHER_ACCOUNT;

    const { queryByRole } = renderWithI18n(
      <DepositMarginNowAction positionKey={POSITION_KEY}>Deposit margin</DepositMarginNowAction>
    );

    expect(queryByRole("button")).toBeNull();
  });

  it("renders plain text when no wallet is connected", () => {
    walletState.account = undefined;

    const { queryByRole } = renderWithI18n(
      <DepositMarginNowAction positionKey={POSITION_KEY}>Deposit margin</DepositMarginNowAction>
    );

    expect(queryByRole("button")).toBeNull();
  });
});

describe("ReplaceMarginDepositAction", () => {
  it("opens the At price replace flow bound to the order", () => {
    const { getByRole } = renderWithI18n(
      <ReplaceMarginDepositAction positionKey={POSITION_KEY} orderKey={ORDER_KEY}>
        Increase the deposit amount
      </ReplaceMarginDepositAction>
    );

    fireEvent.click(getByRole("button", { name: "Increase the deposit amount" }));

    expect(openAtPrice).toHaveBeenCalledWith({ positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY });
  });

  it("renders plain text without an order to replace", () => {
    const { getByText, queryByRole } = renderWithI18n(
      <ReplaceMarginDepositAction positionKey={POSITION_KEY} orderKey={undefined}>
        Increase the deposit amount
      </ReplaceMarginDepositAction>
    );

    expect(getByText("Increase the deposit amount")).toBeTruthy();
    expect(queryByRole("button")).toBeNull();
  });

  it("renders plain text for another account's position", () => {
    walletState.account = OTHER_ACCOUNT;

    const { queryByRole } = renderWithI18n(
      <ReplaceMarginDepositAction positionKey={POSITION_KEY} orderKey={ORDER_KEY}>
        Increase the deposit amount
      </ReplaceMarginDepositAction>
    );

    expect(queryByRole("button")).toBeNull();
  });
});

describe("MarginDepositInsufficientMessage", () => {
  it("keeps the exact copy and makes the phrase replace the bound order", () => {
    const { container, getByRole } = renderWithI18n(
      <MarginDepositInsufficientMessage positionKey={POSITION_KEY} orderKey={ORDER_KEY} />
    );

    expect(container.textContent).toBe(INSUFFICIENT_MESSAGE);

    fireEvent.click(getByRole("button", { name: "Increase the deposit amount" }));

    expect(openAtPrice).toHaveBeenCalledWith({ positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY });
  });

  it("stays non-actionable without a bound order", () => {
    const { container, queryByRole } = renderWithI18n(<MarginDepositInsufficientMessage />);

    expect(container.textContent).toBe(INSUFFICIENT_MESSAGE);
    expect(queryByRole("button")).toBeNull();
  });
});
