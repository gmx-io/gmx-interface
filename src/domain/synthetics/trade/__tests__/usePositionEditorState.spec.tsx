import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ expressOrdersEnabled: true }),
}));

vi.mock("domain/multichain/useIsGmxAccount", () => ({
  useIsGmxAccount: ({
    storedIsGmxAccount,
    setStoredIsGmxAccount,
  }: {
    storedIsGmxAccount: boolean | undefined;
    setStoredIsGmxAccount: (isGmxAccount: boolean) => void;
  }) => [Boolean(storedIsGmxAccount), setStoredIsGmxAccount],
}));

vi.mock("lib/localStorage", () => ({
  useLocalStorageSerializeKey: <T,>(_key: unknown, initialValue: T) => {
    const [value, setValue] = useState<T | undefined>(initialValue);
    return [value, setValue];
  },
}));

import { Operation, usePositionEditorState, type PositionEditorState } from "../usePositionEditorState";

const POSITION_KEY = "0x1111111111111111111111111111111111111111:0xmarket:0xcollateral:true";
const OTHER_POSITION_KEY = "0x1111111111111111111111111111111111111111:0xmarket:0xcollateral:false";

// @testing-library/react 11 has no renderHook
function renderState() {
  const result = { current: undefined as unknown as PositionEditorState };

  function Harness() {
    result.current = usePositionEditorState(ARBITRUM, undefined);
    return null;
  }

  render(<Harness />);

  return { result };
}

describe("usePositionEditorState — open flows", () => {
  it("openDepositNow opens the position in Deposit → Now and clears any at-price state", () => {
    const { result } = renderState();

    act(() => {
      result.current.setOperation(Operation.Withdraw);
      result.current.openAtPrice({ positionKey: OTHER_POSITION_KEY, replacingOrderKey: "0xorder" });
    });

    act(() => {
      result.current.openDepositNow(POSITION_KEY);
    });

    expect(result.current.editingPositionKey).toBe(POSITION_KEY);
    expect(result.current.operation).toBe(Operation.Deposit);
    expect(result.current.depositMode).toBe("now");
    expect(result.current.triggerPriceInputValue).toBe("");
    expect(result.current.replacingOrderKey).toBeUndefined();
    expect(result.current.atPriceOpenRequest).toBeUndefined();
  });

  it("openAtPrice opens the position in Deposit → At price with the request applied", () => {
    const { result } = renderState();

    act(() => {
      result.current.setOperation(Operation.Withdraw);
    });

    act(() => {
      result.current.openAtPrice({
        positionKey: POSITION_KEY,
        triggerPriceInputValue: "3000",
        replacingOrderKey: "0xorder",
      });
    });

    expect(result.current.editingPositionKey).toBe(POSITION_KEY);
    expect(result.current.operation).toBe(Operation.Deposit);
    expect(result.current.depositMode).toBe("atPrice");
    expect(result.current.triggerPriceInputValue).toBe("3000");
    expect(result.current.replacingOrderKey).toBe("0xorder");
    expect(result.current.atPriceOpenRequest).toEqual({
      positionKey: POSITION_KEY,
      triggerPriceInputValue: "3000",
      replacingOrderKey: "0xorder",
    });
  });

  it("a plain edit resets the at-price state but keeps the last operation", () => {
    const { result } = renderState();

    act(() => {
      result.current.setOperation(Operation.Withdraw);
      result.current.setDepositMode("atPrice");
      result.current.setTriggerPriceInputValue("3000");
    });

    act(() => {
      result.current.setEditingPositionKey(POSITION_KEY);
    });

    expect(result.current.editingPositionKey).toBe(POSITION_KEY);
    expect(result.current.operation).toBe(Operation.Withdraw);
    expect(result.current.depositMode).toBe("now");
    expect(result.current.triggerPriceInputValue).toBe("");
  });
});
