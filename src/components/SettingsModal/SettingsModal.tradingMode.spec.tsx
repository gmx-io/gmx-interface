import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";

import { SettingsModal } from "./SettingsModal";
import { TradingMode } from "./shared";

type CapturedTradingSettingsProps = {
  tradingMode: TradingMode | undefined;
  handleTradingModeChange: (mode: TradingMode) => Promise<void>;
};

const { mocks, chainState, subaccountContainer, settingsContainer, capturedProps } = vi.hoisted(() => {
  const mocks = {
    tryEnableSubaccount: vi.fn(),
    tryDisableSubaccount: vi.fn(),
    refreshSubaccountData: vi.fn(),
    setExpressOrdersEnabled: vi.fn(),
    helperToastError: vi.fn(),
  };

  return {
    mocks,
    chainState: { chainId: 42161, srcChainId: undefined as number | undefined },
    subaccountContainer: { value: undefined as any },
    settingsContainer: { value: undefined as any },
    capturedProps: { current: undefined as any },
  };
});

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => settingsContainer.value,
}));

vi.mock("context/SubaccountContext/SubaccountContextProvider", () => ({
  useSubaccountContext: () => subaccountContainer.value,
}));

vi.mock("domain/synthetics/express/expressOrderUtils", () => ({
  getOrderRelayRouterAddress: () => "0x0000000000000000000000000000000000000001",
}));

vi.mock("domain/synthetics/subaccount", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getIsSubaccountActionsExceeded: vi.fn(() => false),
  getIsSubaccountApprovalInvalid: vi.fn(() => false),
  getIsSubaccountExpired: vi.fn(() => false),
  getIsSubaccountNonceExpired: vi.fn(() => false),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => chainState,
}));

vi.mock("lib/helperToast", () => ({
  helperToast: {
    info: vi.fn(),
    success: vi.fn(),
    error: mocks.helperToastError,
  },
}));

vi.mock("lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useLocalizedMap: (map: unknown) => map,
}));

vi.mock("components/Modal/SlideModal", () => ({
  SlideModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: () => null,
}));

vi.mock("./DebugSettings", () => ({
  DebugSettings: () => null,
}));

vi.mock("./DisplaySettings", () => ({
  DisplaySettings: () => null,
}));

vi.mock("./TradingSettings", () => ({
  TradingSettings: (props: CapturedTradingSettingsProps) => {
    capturedProps.current = props;
    return null;
  },
}));

const SUBACCOUNT = {
  address: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  signer: {},
  onchainData: { active: true },
  signedApproval: {},
  chainId: 42161,
  signerChainId: 42161,
};

function makeSubaccountState({ subaccount }: { subaccount: typeof SUBACCOUNT | undefined }) {
  return {
    subaccount,
    subaccountConfig: undefined,
    subaccountActivationState: undefined,
    subaccountDeactivationState: undefined,
    subaccountDeactivationFailureReason: undefined,
    tryEnableSubaccount: mocks.tryEnableSubaccount,
    tryDisableSubaccount: mocks.tryDisableSubaccount,
    refreshSubaccountData: mocks.refreshSubaccountData,
    updateSubaccountSettings: vi.fn(),
    resetSubaccountApproval: vi.fn(),
  };
}

function makeSettings({ expressOrdersEnabled }: { expressOrdersEnabled: boolean }) {
  const settings = {
    expressOrdersEnabled,
    setExpressOrdersEnabled: vi.fn((value: boolean) => {
      mocks.setExpressOrdersEnabled(value);
      settings.expressOrdersEnabled = value;
    }),
    settingsWarningDotVisible: false,
    setSettingsWarningDotVisible: vi.fn(),
    savedTwapNumberOfParts: 5,
    setSavedTWAPNumberOfParts: vi.fn(),
    savedAllowedSlippage: 100,
    setSavedAllowedSlippage: vi.fn(),
    executionFeeBufferBps: 3000,
    setExecutionFeeBufferBps: vi.fn(),
    shouldUseExecutionFeeBuffer: true,
  };

  return settings;
}

function setup({
  withSubaccount = true,
  expressOrdersEnabled = true,
}: { withSubaccount?: boolean; expressOrdersEnabled?: boolean } = {}) {
  subaccountContainer.value = makeSubaccountState({ subaccount: withSubaccount ? SUBACCOUNT : undefined });
  settingsContainer.value = makeSettings({ expressOrdersEnabled });

  render(<SettingsModal isSettingsVisible setIsSettingsVisible={vi.fn()} />);

  return capturedProps;
}

async function changeMode(mode: TradingMode) {
  await act(async () => {
    await capturedProps.current.handleTradingModeChange(mode);
  });
}

describe("SettingsModal.handleTradingModeChange", () => {
  beforeEach(() => {
    chainState.chainId = 42161;
    chainState.srcChainId = undefined;
    mocks.tryDisableSubaccount.mockImplementation(async () => {
      subaccountContainer.value = { ...subaccountContainer.value, subaccount: undefined };
      return true;
    });
    mocks.tryEnableSubaccount.mockImplementation(async () => {
      subaccountContainer.value = { ...subaccountContainer.value, subaccount: SUBACCOUNT };
      return true;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps One-Click selected and does not flip express settings when deactivation fails, then completes the switch on retry", async () => {
    mocks.tryDisableSubaccount.mockResolvedValueOnce(false);

    const props = setup();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);

    await changeMode(TradingMode.Express);

    expect(mocks.tryDisableSubaccount).toHaveBeenCalledTimes(1);
    expect(mocks.setExpressOrdersEnabled).not.toHaveBeenCalled();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);

    await changeMode(TradingMode.Express);

    expect(mocks.tryDisableSubaccount).toHaveBeenCalledTimes(2);
    expect(mocks.setExpressOrdersEnabled).toHaveBeenCalledWith(true);
    expect(props.current.tradingMode).toBe(TradingMode.Express);
  });

  it("switches to Classic only after a successful deactivation", async () => {
    mocks.tryDisableSubaccount.mockResolvedValueOnce(false);

    const props = setup();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);

    await changeMode(TradingMode.Classic);

    expect(mocks.setExpressOrdersEnabled).not.toHaveBeenCalled();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);

    await changeMode(TradingMode.Classic);

    expect(mocks.setExpressOrdersEnabled).toHaveBeenCalledWith(false);
    expect(props.current.tradingMode).toBe(TradingMode.Classic);
  });

  it("does not attempt a deactivation when Classic is requested in multichain", async () => {
    chainState.srcChainId = 8453;

    const props = setup();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);

    await changeMode(TradingMode.Classic);

    expect(mocks.tryDisableSubaccount).not.toHaveBeenCalled();
    expect(mocks.setExpressOrdersEnabled).not.toHaveBeenCalled();
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);
  });

  it("ignores a new mode change while the previous one is still in progress", async () => {
    let resolveDisable: (value: boolean) => void = () => undefined;
    mocks.tryDisableSubaccount.mockImplementationOnce(
      () => new Promise<boolean>((resolve) => (resolveDisable = resolve))
    );

    const props = setup();

    let firstChange: Promise<void> | undefined;
    act(() => {
      firstChange = props.current.handleTradingModeChange(TradingMode.Express);
    });

    await changeMode(TradingMode.Classic);

    expect(mocks.tryDisableSubaccount).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDisable(false);
      await firstChange;
    });

    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);
  });

  it("reverts to the previous mode when One-Click activation fails and completes it on success", async () => {
    mocks.tryEnableSubaccount.mockResolvedValueOnce(false);

    const props = setup({ withSubaccount: false, expressOrdersEnabled: true });
    expect(props.current.tradingMode).toBe(TradingMode.Express);

    await changeMode(TradingMode.Express1CT);

    expect(mocks.setExpressOrdersEnabled).not.toHaveBeenCalled();
    expect(props.current.tradingMode).toBe(TradingMode.Express);

    await changeMode(TradingMode.Express1CT);

    expect(mocks.setExpressOrdersEnabled).toHaveBeenCalledWith(true);
    expect(props.current.tradingMode).toBe(TradingMode.Express1CT);
  });
});
