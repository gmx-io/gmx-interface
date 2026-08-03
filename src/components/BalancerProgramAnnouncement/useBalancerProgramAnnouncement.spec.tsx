import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  account: "prospect-a" as string | undefined,
  flagEnabled: true,
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: testState.account }),
}));

vi.mock("domain/synthetics/uiFlags/useUiFlagsRequest", () => ({
  useUiFlagsRequest: () => ({
    uiFlags: {
      showBalancerProgramAnnouncement: {
        enabled: testState.flagEnabled,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    },
  }),
}));

vi.mock("./balancerProgramAnnouncementLogic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./balancerProgramAnnouncementLogic")>();
  const [firstHash, secondHash] = actual.BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES;

  return {
    ...actual,
    getBalancerProgramAddressHash: (account: string | undefined) => {
      if (account === "prospect-a") return firstHash;
      if (account === "prospect-b") return secondHash;
      return undefined;
    },
  };
});

import { useBalancerProgramAnnouncement } from "./useBalancerProgramAnnouncement";

function TestHarness() {
  const { isVisible, dismiss } = useBalancerProgramAnnouncement();
  return <button onClick={dismiss}>{String(isVisible)}</button>;
}

beforeEach(() => {
  localStorage.clear();
  testState.account = "prospect-a";
  testState.flagEnabled = true;
});

afterEach(cleanup);

describe("useBalancerProgramAnnouncement", () => {
  it("persists dismissal for the current wallet without hiding the campaign for another wallet", () => {
    const firstRender = render(<TestHarness />);
    expect(screen.getByRole("button").textContent).toBe("true");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("false");

    firstRender.unmount();
    render(<TestHarness />);
    expect(screen.getByRole("button").textContent).toBe("false");

    cleanup();
    testState.account = "prospect-b";
    render(<TestHarness />);
    expect(screen.getByRole("button").textContent).toBe("true");
  });

  it("stays hidden while disconnected or when the campaign flag is off", () => {
    testState.account = undefined;
    const disconnectedRender = render(<TestHarness />);
    expect(screen.getByRole("button").textContent).toBe("false");

    disconnectedRender.unmount();
    testState.account = "prospect-a";
    testState.flagEnabled = false;
    render(<TestHarness />);
    expect(screen.getByRole("button").textContent).toBe("false");
  });
});
