import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { decodeFunctionData, zeroAddress, zeroHash, type Hex } from "viem";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BSC_MAINNET } from "config/chains";
import type { SendParam } from "domain/multichain/types";
import type { ExpressTxnParams } from "domain/synthetics/express/types";
import type { TokensData } from "domain/tokens";
import { getAbi } from "sdk/abis/getAbi";
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
  sent: [] as { amount: bigint; kind: string }[],
  simulation: undefined as Promise<void> | undefined,
  gasEstimate: undefined as Promise<bigint> | undefined,
  signing: undefined as Promise<string> | undefined,
  send: vi.fn(),
  relay: vi.fn(),
  quote: vi.fn(),
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ address: state.account }) }));
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
  helperToast: { error: () => undefined, success: () => undefined, info: () => undefined },
}));
vi.mock("lib/metrics", () => ({
  initMultichainWithdrawalMetricData: () => ({ metricId: "withdrawal" }),
  sendOrderSubmittedMetric: () => undefined,
  sendOrderSimulatedMetric: () => undefined,
  sendOrderTxnSubmittedMetric: () => undefined,
  sendTxnValidationErrorMetric: () => undefined,
  sendTxnErrorMetric: () => undefined,
  sendTxnSentMetric: () => undefined,
  metrics: { pushError: () => undefined, pushEvent: () => undefined },
}));
vi.mock("lib/userAnalytics/utils", () => ({ sendMultichainWithdrawalSuccessEvent: () => undefined }));
vi.mock("lib/rpc", () => ({ useJsonRpcProvider: () => ({ provider: {} }), getProvider: () => ({}) }));
vi.mock("lib/gas/gasPrice", () => ({ getGasPrice: async () => ({ gasPrice: 1n }) }));
vi.mock("lib/tenderly", () => ({ getTenderlyConfig: () => undefined }));
vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    readContract: state.quote,
    estimateGas: async () => state.gasEstimate ?? 100n,
    waitForTransactionReceipt: async () => ({ logs: [] }),
  }),
}));
vi.mock("domain/synthetics/express/callRelayTransaction", () => ({ callRelayTransaction: () => state.simulation }));
vi.mock("lib/transactions/sendExpressTransaction", () => ({ sendExpressTransaction: state.relay }));
vi.mock("../wrapChainAction", () => ({
  wrapChainAction: async (_chain: number, _setChain: unknown, action: (signer: unknown) => Promise<void>) =>
    action({
      address: state.account,
      sendTransaction: state.send,
      signTypedData: async () => {
        state.signatureRequests++;
        return state.signing ?? "0x" + "11".repeat(65);
      },
    }),
}));
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
      });
      expect(state.sent).toEqual(destination === ARBITRUM ? [{ amount: 10000n * 10n ** 6n, kind: "wallet" }] : []);
      if (destination !== ARBITRUM) {
        expect(state.signatureRequests).toBe(0);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(150);
        });
        await act(async () => {
          fireEvent.click(view.getByRole("button", { name: /^(Withdraw|Loading network fees)/ }));
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
      });
      expect(state.sent).toEqual([{ amount: 9000n * 10n ** 6n, kind: destination === ARBITRUM ? "wallet" : "relay" }]);
      cleanup();
      state.notify = () => undefined;
    }
  });
});
