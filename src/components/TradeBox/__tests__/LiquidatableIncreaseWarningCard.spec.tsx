import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { openDepositNow, walletState } = vi.hoisted(() => ({
  openDepositNow: vi.fn(),
  walletState: { account: undefined as string | undefined },
}));

vi.mock("context/SyntheticsStateContext/hooks/positionEditorHooks", () => ({
  usePositionEditorOpenAtPrice: () => vi.fn(),
  usePositionEditorOpenDepositNow: () => openDepositNow,
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: walletState.account }),
}));

import { LiquidatableIncreaseWarningCard } from "../LiquidatableIncreaseWarningCard";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const POSITION_KEY = `${ACCOUNT}:0xmarket:0xcollateral:true`;

const WARNING_TEXT =
  "Order may not execute: the resulting position would be liquidatable at the trigger price. Deposit margin or reduce the order size.";

function renderCard(positionKey: string | undefined) {
  return render(
    <I18nProvider i18n={i18n}>
      <LiquidatableIncreaseWarningCard positionKey={positionKey} />
    </I18nProvider>
  );
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => {
  openDepositNow.mockClear();
  walletState.account = ACCOUNT;
});

afterEach(cleanup);

describe("LiquidatableIncreaseWarningCard", () => {
  it("makes the Deposit margin phrase open the deposit-now flow for the position", () => {
    const { container, getByRole } = renderCard(POSITION_KEY);

    expect(container.textContent).toContain(WARNING_TEXT);

    fireEvent.click(getByRole("button", { name: "Deposit margin" }));

    expect(openDepositNow).toHaveBeenCalledWith(POSITION_KEY);
  });

  it("keeps the warning non-actionable when no position resolves", () => {
    const { container, queryByRole } = renderCard(undefined);

    expect(container.textContent).toContain(WARNING_TEXT);
    expect(queryByRole("button")).toBeNull();
  });
});
