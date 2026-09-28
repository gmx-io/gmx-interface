import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStorageSerializeKeySafe } from ".";

const STORAGE_KEY = "reactive-local-storage-test";

function Probe({ account }: { account: string }) {
  const [value] = useLocalStorageSerializeKeySafe<Record<string, boolean>>([STORAGE_KEY, account], {});

  return <div data-testid="value">{JSON.stringify(value)}</div>;
}

describe("useLocalStorageSerializeKeySafe", () => {
  beforeEach(() => localStorage.clear());

  it("hydrates stored values after skipped and valid key changes", () => {
    const accountA = "0x52908400098527886E0F7030069857D2E4169EE7";
    const accountB = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";
    localStorage.setItem(JSON.stringify([STORAGE_KEY, accountA]), JSON.stringify({ first: true }));
    localStorage.setItem(JSON.stringify([STORAGE_KEY, accountB]), JSON.stringify({ second: true }));

    const view = render(<Probe account="anonymous" />);
    expect(screen.getByTestId("value").textContent).toBe("{}");

    view.rerender(<Probe account={accountA} />);
    expect(screen.getByTestId("value").textContent).toBe('{"first":true}');

    view.rerender(<Probe account={accountB} />);
    expect(screen.getByTestId("value").textContent).toBe('{"second":true}');
  });
});
