import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { WalletSigner } from "lib/wallets";

import { useCreateReferralCode } from "../useCreateReferralCode";

const mocks = vi.hoisted(() => ({
  wallet: vi.fn(),
  availability: vi.fn(),
  register: vi.fn(),
  receipt: vi.fn(),
}));
vi.mock("@wagmi/core", () => ({ getAccount: mocks.wallet }));
vi.mock("lib/wallets/walletConfig", () => ({
  getWagmiConfig: vi.fn(),
  getPublicClientWithRpc: () => ({ waitForTransactionReceipt: mocks.receipt }),
}));
vi.mock("domain/referrals/utils/referralsHelper", () => ({
  getCodeError: () => "",
  getReferralCodeTakenStatus: mocks.availability,
}));
vi.mock("../index", () => ({ registerReferralCode: mocks.register }));

const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
const signer = {} as WalletSigner;
const hash = `0x${"1".repeat(64)}`;

function setup() {
  let result: ReturnType<typeof useCreateReferralCode>;
  const onSuccess = vi.fn();
  function Probe() {
    result = useCreateReferralCode({ chainId: ARBITRUM, account, signer, onSuccess });
    return null;
  }
  render(<Probe />);
  return { result: () => result!, onSuccess };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.wallet.mockReturnValue({ address: account, chainId: ARBITRUM });
  mocks.availability.mockResolvedValue({ takenStatus: "none", failedChains: [] });
  mocks.register.mockResolvedValue({ hash });
  mocks.receipt.mockResolvedValue({ status: "success" });
});
afterEach(cleanup);

describe("landing referral creation", () => {
  it("only exposes the new code after a successful transaction receipt", async () => {
    let confirm: (value: { status: string }) => void;
    mocks.receipt.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      })
    );
    const hook = setup();
    let pending: Promise<void>;
    await act(async () => {
      pending = hook.result().createCode(" MyCode ");
    });
    expect(hook.onSuccess).not.toHaveBeenCalled();
    expect(hook.result().isSubmitting).toBe(true);
    await act(async () => {
      confirm!({ status: "success" });
      await pending;
    });
    expect(hook.onSuccess).toHaveBeenCalledWith("MyCode");
    expect(mocks.register).toHaveBeenCalledWith(ARBITRUM, "MyCode", signer, expect.any(Object));
  });

  it("does not submit a transaction when the active wallet changes during validation", async () => {
    mocks.wallet.mockReturnValue({ address: "0x0000000000000000000000000000000000000001", chainId: ARBITRUM });
    const hook = setup();
    await act(async () => {
      await hook.result().createCode("MyCode");
    });
    expect(mocks.register).not.toHaveBeenCalled();
    expect(hook.result().error).toBeTruthy();
  });

  it.each([
    { takenStatus: "current", failedChains: [] },
    { takenStatus: "none", failedChains: [ARBITRUM] },
  ])("does not submit when availability is not confirmed: %j", async (availability) => {
    mocks.availability.mockResolvedValue(availability);
    const hook = setup();
    await act(async () => {
      await hook.result().createCode("MyCode");
    });
    expect(mocks.register).not.toHaveBeenCalled();
    expect(hook.onSuccess).not.toHaveBeenCalled();
  });

  it("keeps a reverted code unavailable for sharing and allows retry", async () => {
    mocks.receipt.mockResolvedValue({ status: "reverted" });
    const hook = setup();
    await act(async () => {
      await hook.result().createCode("MyCode");
    });
    expect(hook.onSuccess).not.toHaveBeenCalled();
    expect(hook.result().isSubmitting).toBe(false);
    expect(hook.result().error).toBeTruthy();
  });
});
