import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { createWalletClient, custom, decodeFunctionData, zeroAddress, zeroHash, type Hex } from "viem";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BSC_MAINNET } from "config/chains";
import type { SendParam } from "domain/multichain/types";
import type { ExpressTxnParams } from "domain/synthetics/express/types";
import type { TokensData } from "domain/tokens";
import { getAbi } from "sdk/abis/getAbi";
import { getViemChain } from "sdk/configs/chains";
import { getToken, getWrappedToken } from "sdk/configs/tokens";

import { WithdrawalView } from "../WithdrawalView";

const state = vi.hoisted(() => ({
  input: "200000",
  destination: 42161,
  view: "withdraw",
  account: "0x1111111111111111111111111111111111111111",
  token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  notify: (): void => undefined,
  tokens: {} as TokensData,
  express: undefined as ExpressTxnParams | undefined,
  signatureRequests: 0,
  chainCheck: undefined as Promise<void> | undefined,
  sent: [] as { amount: bigint; kind: string }[],
  simulation: undefined as Promise<void> | undefined,
  gasEstimate: undefined as Promise<bigint> | undefined,
  signing: undefined as Promise<string> | undefined,
  send: vi.fn(),
  relay: vi.fn(),
  quote: vi.fn(),
  errorToast: vi.fn(),
  errorMetric: vi.fn(),
  providerCall: vi.fn(),
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ address: state.account }) }));
vi.mock("@wagmi/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@wagmi/core")>()),
  getAccount: () => ({ address: state.account }),
  getChainId: () => ARBITRUM,
  getWalletClient: async () =>
    createWalletClient({
      account: state.account as Hex,
      chain: getViemChain(ARBITRUM),
      transport: custom({
        request: async ({ method, params }) => {
          if (method === "wallet_switchEthereumChain") return null;
          if (method === "eth_chainId") {
            await state.chainCheck;
            return "0xa4b1";
          }
          if (method === "eth_sendTransaction") return (await state.send(params[0])).hash;
          throw new Error(`Unexpected wallet request: ${method}`);
        },
      }),
    }),
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161 }) }));
vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountWithdrawalViewChain: () => [
    state.destination,
    (value: number) => {
      state.destination = value;
      state.notify();
    },
  ],
  useGmxAccountWithdrawalViewTokenAddress: () => [
    state.token,
    (value: string) => {
      state.token = value;
      state.notify();
    },
  ],
  useGmxAccountWithdrawalViewTokenInputValue: () => [
    state.input,
    (value: string) => {
      state.input = value;
      state.notify();
    },
  ],
  useGmxAccountModalOpen: () => [
    state.view,
    (value: string) => {
      state.view = value;
      state.notify();
    },
  ],
  useGmxAccountSettlementChainId: () => [42161, () => undefined],
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ setIsSettingsVisible: () => undefined }),
}));
vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({
    setMultichainSubmittedWithdrawal: () => "withdrawal",
    setMultichainWithdrawalSentTxnHash: () => undefined,
    setMultichainWithdrawalSentError: () => undefined,
    setMultichainFundingPendingId: () => undefined,
  }),
}));
vi.mock("context/SyntheticsStateContext/selectors/expressSelectors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/selectors/expressSelectors")>()),
  selectGmxAccountExpressGlobalParams: "global",
  selectGmxAccountGasPaymentToken: "gasToken",
  selectGmxAccountExpressFeeTokenAddress: "gasAddress",
}));
vi.mock("context/SyntheticsStateContext/selectors/settingsSelectors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/selectors/settingsSelectors")>()),
  selectExpressOrdersEnabled: "enabled",
  selectSetExpressOrdersEnabled: "setEnabled",
}));
vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: (selector: "global" | "gasToken" | "gasAddress" | "enabled" | "setEnabled") =>
    ({
      global: { relayerFeeTokenAddress: state.token },
      gasToken: state.tokens[state.token],
      gasAddress: state.token,
      enabled: true,
      setEnabled: () => undefined,
    })[selector],
}));
vi.mock("domain/synthetics/tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("domain/synthetics/tokens")>()),
  useTokensDataRequest: () => ({ tokensData: state.tokens }),
}));
vi.mock("domain/multichain/arbitraryRelayParams", () => ({
  useArbitraryRelayParamsAndPayload: () => ({
    data: state.express,
    promise: Promise.resolve(state.express),
    isLoading: false,
  }),
  useArbitraryError: () => ({}),
}));
vi.mock("domain/multichain/useGmxAccountFundingHistory", () => ({
  useGmxAccountFundingHistory: () => ({ fundingHistory: [] }),
}));
vi.mock("domain/multichain/useQuoteSend", () => ({ useQuoteSendNativeFee: () => ({ data: 1n, isLoading: false }) }));
vi.mock("domain/multichain/useMultichainQuoteFeeUsd", () => ({
  useMultichainQuoteFeeUsd: () => ({ networkFeeUsd: 1n, protocolFeeUsd: 1n, protocolFeeAmount: 1n, networkFee: 1n }),
}));
vi.mock("domain/synthetics/fees/useGasPrice", () => ({ useGasPrice: () => 1n }));
vi.mock("domain/tokens/useMaxAvailableAmount", () => ({ useMaxAvailableAmount: () => ({ maxAvailableAmount: 0n }) }));
vi.mock("lib/useThrottledAsync", () => ({ useThrottledAsync: () => ({ data: 1n, isLoading: false }) }));
vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({
  useMultipleWalletExtensionsChainError: () => ({}),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: () => false }));
vi.mock("lib/helperToast", () => ({
  helperToast: { error: state.errorToast, success: () => undefined, info: () => undefined },
}));
vi.mock("lib/metrics", () => ({
  initMultichainWithdrawalMetricData: () => ({ metricId: "withdrawal" }),
  sendOrderSubmittedMetric: () => undefined,
  sendOrderSimulatedMetric: () => undefined,
  sendOrderTxnSubmittedMetric: () => undefined,
  sendTxnValidationErrorMetric: () => undefined,
  sendTxnErrorMetric: state.errorMetric,
  sendTxnSentMetric: () => undefined,
  metrics: { pushError: () => undefined, pushEvent: () => undefined },
}));
vi.mock("lib/metrics/emitMetricEvent", () => ({ emitMetricEvent: state.errorMetric }));
vi.mock("lib/userAnalytics/utils", () => ({ sendMultichainWithdrawalSuccessEvent: () => undefined }));
vi.mock("lib/rpc", () => ({
  useJsonRpcProvider: () => ({ provider: {} }),
  getProvider: () => ({ call: state.providerCall }),
}));
vi.mock("lib/gas/gasPrice", () => ({ getGasPrice: async () => ({ gasPrice: 1n }) }));
vi.mock("lib/tenderly", () => ({ getTenderlyConfig: () => undefined }));
vi.mock("lib/wallets/walletConfig", () => ({
  getWagmiConfig: () => ({}),
  getPublicClientWithRpc: () => ({
    readContract: state.quote,
    estimateGas: async () => state.gasEstimate ?? 100n,
    waitForTransactionReceipt: async () => ({ logs: [] }),
  }),
}));
vi.mock("domain/synthetics/express/callRelayTransaction", () => ({ callRelayTransaction: () => state.simulation }));
vi.mock("lib/transactions/sendExpressTransaction", () => ({ sendExpressTransaction: state.relay }));
vi.mock("../wrapChainAction", async (importOriginal) => {
  const original = await importOriginal<typeof import("../wrapChainAction")>();
  return {
    wrapChainAction: async (...args: Parameters<typeof original.wrapChainAction>) => {
      if (args[0] === ARBITRUM) return original.wrapChainAction(...args);
      return args[2]({
        address: state.account,
        sendTransaction: state.send,
        signTypedData: async () => {
          state.signatureRequests++;
          return state.signing ?? "0x" + "11".repeat(65);
        },
      } as unknown as Parameters<Parameters<typeof original.wrapChainAction>[2]>[0]);
    },
  };
});
vi.mock("components/GmxAccountModal/hooks", () => ({
  useAvailableToTradeAssetMultichain: () => ({ gmxAccountUsd: 500000n * 10n ** 30n }),
  useGmxAccountWithdrawNetworks: () => [
    { id: 42161, name: "Arbitrum" },
    { id: 56, name: "BNB Chain" },
  ],
}));
vi.mock("components/DropdownSelector/DropdownSelector", () => ({ DropdownSelector: () => null }));
vi.mock("components/MaxActions/MaxActions", () => ({ MaxActions: () => null }));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  state.notify = () => undefined;
  vi.useRealTimers();
});

function mountWithdrawal(destination: number) {
  state.input = "200000";
  state.destination = destination;
  state.view = "withdraw";
  state.signatureRequests = 0;
  state.sent = [];
  state.simulation = undefined;
  state.gasEstimate = undefined;
  state.signing = undefined;
  state.chainCheck = undefined;
  state.errorToast.mockClear();
  state.errorMetric.mockClear();
  state.providerCall.mockReset().mockResolvedValue("0x");
  state.tokens = Object.fromEntries(
    [getToken(ARBITRUM, state.token), getToken(ARBITRUM, zeroAddress), getWrappedToken(ARBITRUM)].map((token) => [
      token.address,
      {
        ...token,
        prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n },
        gmxAccountBalance: 500000n * 10n ** BigInt(token.decimals),
        walletBalance: 10n ** 24n,
      },
    ])
  );
  state.express = {
    chainId: ARBITRUM,
    subaccount: undefined,
    subaccountValidations: undefined,
    gasLimit: 100n,
    l1GasLimit: 0n,
    gasPrice: 1n,
    executionFeeAmount: 0n,
    executionGasLimit: 0n,
    estimationMethod: "estimateGas",
    isGmxAccount: true,
    gasPaymentParams: {
      gasPaymentToken: state.tokens[state.token],
      relayFeeToken: state.tokens[state.token],
      gasPaymentTokenAddress: state.token,
      relayerFeeTokenAddress: state.token,
      relayerFeeAmount: 1n,
      gasPaymentTokenAmount: 1n,
      totalRelayerFeeTokenAmount: 1n,
      gasPaymentTokenAsCollateralAmount: 0n,
    },
    gasPaymentValidations: {
      isValid: true,
      isGasPaymentTokenBalanceLoaded: true,
      isOutGasTokenBalance: false,
      needGasPaymentTokenApproval: false,
    },
    relayParamsPayload: {
      oracleParams: { tokens: [], providers: [], data: [] },
      tokenPermits: [],
      externalCalls: {
        sendTokens: [],
        sendAmounts: [],
        externalCallTargets: [],
        externalCallDataList: [],
        refundTokens: [],
        refundReceivers: [],
      },
      fee: { feeToken: zeroAddress, feeAmount: 0n, feeSwapPath: [] },
      desChainId: BigInt(ARBITRUM),
      userNonce: 0n,
      eip6492SignatureWrapperHash: zeroHash,
    },
  };
  state.quote.mockImplementation(async ({ args }: { args: [SendParam] }) => [
    { minAmountLD: 1n, maxAmountLD: 10n ** 18n },
    [],
    { amountSentLD: args[0].amountLD, amountReceivedLD: args[0].amountLD - 1n },
  ]);
  state.send.mockImplementation(async ({ data }: { data: Hex }) => {
    const decoded = decodeFunctionData({ abi: getAbi(ARBITRUM, "MultichainTransferRouter"), data });
    if (decoded.functionName !== "transferOut") throw new Error("Expected transferOut");
    state.sent.push({ amount: decoded.args[0].amount, kind: "wallet" });
    return { hash: "0x" + "22".repeat(32) };
  });
  state.relay.mockImplementation(async ({ txnData }: { txnData: { callData: Hex } }) => {
    const decoded = decodeFunctionData({ abi: getAbi(ARBITRUM, "MultichainTransferRouter"), data: txnData.callData });
    if (decoded.functionName !== "bridgeOut") throw new Error("Expected bridgeOut");
    state.sent.push({ amount: decoded.args[3].amount, kind: "relay" });
    return { wait: async () => ({ status: "success" }) };
  });
  const config = {
    provider: () => new Map(),
    dedupingInterval: 0,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  };
  const element = () => (
    <SWRConfig value={config}>
      <I18nProvider i18n={i18n}>
        <WithdrawalView />
      </I18nProvider>
    </SWRConfig>
  );
  const view = render(element());
  state.notify = () => view.rerender(element());
  return view;
}

describe("WithdrawalView", () => {
  it("never signs or sends the previous amount after rapid edits PRO-4596", async () => {
    vi.useFakeTimers();
    for (const destination of [SOURCE_BSC_MAINNET, ARBITRUM]) {
      const view = mountWithdrawal(destination);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });
      const input = view.getByPlaceholderText("0.00") as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: "100000" } });
      });
      fireEvent.change(input, { target: { value: "10000" } });
      expect(input.value).toBe("10000");
      await act(async () => {
        fireEvent.click(view.getByRole("button", { name: /^(Withdraw|Loading network fees)/ }));
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(state.sent).toEqual(destination === ARBITRUM ? [{ amount: 10000n * 10n ** 6n, kind: "wallet" }] : []);
      if (destination !== ARBITRUM) {
        expect(state.signatureRequests).toBe(0);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(150);
        });
        await act(async () => {
          fireEvent.click(view.getByRole("button", { name: /^(Withdraw|Loading network fees)/ }));
          await vi.advanceTimersByTimeAsync(20);
        });
      }
      expect(state.sent).toEqual([{ amount: 10000n * 10n ** 6n, kind: destination === ARBITRUM ? "wallet" : "relay" }]);
      cleanup();
      state.notify = () => undefined;
    }
    for (const boundary of ["gas", "simulation", "signature", "refresh"]) {
      const destination = boundary === "gas" ? ARBITRUM : SOURCE_BSC_MAINNET;
      const view = mountWithdrawal(destination);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });
      let release: () => void = () => undefined;
      if (boundary === "gas") {
        state.gasEstimate = new Promise((resolve) => {
          release = () => resolve(100n);
        });
      } else if (boundary === "simulation") {
        state.simulation = new Promise((resolve) => {
          release = resolve;
        });
      } else {
        state.signing = new Promise((resolve) => {
          release = () => resolve("0x" + "11".repeat(65));
        });
      }
      await act(async () => {
        fireEvent.click(view.getByRole("button", { name: "Withdraw", exact: true }));
        await vi.advanceTimersByTimeAsync(20);
      });
      await act(async () => {
        if (boundary === "refresh") {
          await vi.advanceTimersByTimeAsync(60150);
        } else {
          state.input = "9000";
          state.notify();
          await vi.advanceTimersByTimeAsync(150);
        }
      });
      await act(async () => {
        release();
      });
      if (boundary === "refresh") {
        expect(state.sent).toEqual([{ amount: 200000n * 10n ** 6n, kind: "relay" }]);
        cleanup();
        state.notify = () => undefined;
        continue;
      }
      expect(state.sent).toEqual([]);
      expect(state.signatureRequests).toBe(boundary === "signature" ? 1 : 0);
      state.gasEstimate = undefined;
      state.simulation = undefined;
      state.signing = undefined;
      await act(async () => {
        fireEvent.click(view.getByRole("button", { name: "Withdraw", exact: true }));
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(state.sent).toEqual([{ amount: 9000n * 10n ** 6n, kind: destination === ARBITRUM ? "wallet" : "relay" }]);
      cleanup();
      state.notify = () => undefined;
    }

    const view = mountWithdrawal(ARBITRUM);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    let releaseChainCheck!: () => void;
    state.chainCheck = new Promise<void>((resolve) => {
      releaseChainCheck = resolve;
    });
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: "Withdraw", exact: true }));
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(state.sent).toEqual([]);
    view.unmount();
    const reopened = mountWithdrawal(ARBITRUM);
    await act(async () => {
      fireEvent.change(reopened.getByPlaceholderText("0.00"), { target: { value: "9000" } });
      releaseChainCheck();
      await vi.advanceTimersByTimeAsync(150);
    });
    expect((reopened.getByPlaceholderText("0.00") as HTMLInputElement).value).toBe("9000");
    expect(state.sent).toEqual([]);
    expect(state.errorToast).not.toHaveBeenCalled();
    expect(state.errorMetric).not.toHaveBeenCalled();
    expect(state.providerCall).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(reopened.getByRole("button", { name: "Withdraw", exact: true }));
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(state.sent).toEqual([{ amount: 9000n * 10n ** 6n, kind: "wallet" }]);
  });

  it("keeps compatible quote refreshes and quietly cancels invalidated signatures PRO-4596", async () => {
    vi.useFakeTimers();
    for (const update of ["credit", "refresh-error", "receipt", "input-error", "close"]) {
      const view = mountWithdrawal(SOURCE_BSC_MAINNET);
      await act(async () => vi.advanceTimersByTimeAsync(150));
      let release!: () => void;
      state.signing = new Promise((resolve) => {
        release = () => resolve("0x" + "11".repeat(65));
      });
      await act(async () => {
        fireEvent.click(view.getByRole("button", { name: "Withdraw", exact: true }));
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(state.signatureRequests).toBe(1);
      if (update.endsWith("error")) {
        state.quote.mockRejectedValue(new Error("Quote RPC unavailable"));
      } else {
        state.quote.mockImplementation(async ({ args }: { args: [SendParam] }) => [
          { minAmountLD: 1n, maxAmountLD: 10n ** 17n },
          [],
          { amountSentLD: args[0].amountLD, amountReceivedLD: args[0].amountLD - (update === "receipt" ? 100n : 1n) },
        ]);
      }
      await act(async () => {
        if (update === "input-error") state.input = "9000";
        if (update === "close") state.view = "main";
        state.notify();
        await vi.advanceTimersByTimeAsync(60150);
        release();
        await vi.advanceTimersByTimeAsync(20);
      });
      expect
        .soft(state.sent, update)
        .toEqual(
          update === "credit" || update === "refresh-error" ? [{ amount: 200000n * 10n ** 6n, kind: "relay" }] : []
        );
      expect.soft(state.errorToast, update).not.toHaveBeenCalled();
      expect.soft(state.errorMetric, update).not.toHaveBeenCalled();
      cleanup();
      state.notify = () => undefined;
    }
  });

  it("still reports actual wallet and relay failures PRO-4596", async () => {
    vi.useFakeTimers();
    for (const destination of [ARBITRUM, SOURCE_BSC_MAINNET]) {
      const view = mountWithdrawal(destination);
      await act(async () => vi.advanceTimersByTimeAsync(150));
      const sender = destination === ARBITRUM ? state.send : state.relay;
      sender.mockRejectedValueOnce(new Error("RPC unavailable"));
      await act(async () => {
        fireEvent.click(view.getByRole("button", { name: "Withdraw", exact: true }));
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(state.sent).toEqual([]);
      expect(state.errorToast).toHaveBeenCalled();
      if (destination === SOURCE_BSC_MAINNET) expect(state.errorMetric).toHaveBeenCalled();
      cleanup();
      state.notify = () => undefined;
    }
  });
});
