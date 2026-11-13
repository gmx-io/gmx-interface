import { act, cleanup, render } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import type { ExecutionFee } from "domain/synthetics/fees";
import type { GmPaySource } from "domain/synthetics/markets";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { getWrappedToken } from "sdk/configs/tokens";

import { useWithdrawalTransactions } from "./useWithdrawalTransactions";

const mocks = vi.hoisted(() => ({
  selectorValues: new Map<unknown, unknown>(),
  createWithdrawalTxn: vi.fn(),
  createMultichainWithdrawalTxn: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (selector: unknown) => mocks.selectorValues.get(selector),
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161, srcChainId: undefined }) }));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: "0x0000000000000000000000000000000000000001", signer: {} }),
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({
    setPendingWithdrawal: vi.fn(),
    startTransitRouteProgress: vi.fn(),
    setMultichainTransferProgress: vi.fn(),
  }),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));

vi.mock("context/TokensBalancesContext/TokensBalancesContextProvider", () => ({
  useTokensBalancesUpdates: () => ({ addOptimisticTokensBalancesUpdates: vi.fn() }),
}));

vi.mock("domain/synthetics/markets/createWithdrawalTxn", () => ({ createWithdrawalTxn: mocks.createWithdrawalTxn }));

vi.mock("domain/synthetics/markets/createMultichainWithdrawalTxn", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createMultichainWithdrawalTxn: mocks.createMultichainWithdrawalTxn,
}));

vi.mock("./useMultichainWithdrawalExpressTxnParams", () => ({
  useMultichainWithdrawalExpressTxnParams: () => ({ data: {}, error: undefined }),
}));

vi.mock("domain/multichain/toastCustomOrStargateError", () => ({ toastCustomOrStargateError: vi.fn() }));

vi.mock("lib/helperToast", () => ({ helperToast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ETH_USD_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const TYPED_AMOUNT = "0.5";

const EXECUTION_FEE: ExecutionFee = {
  feeUsd: 0n,
  feeTokenAmount: 10n ** 14n,
  feeToken: getWrappedToken(ARBITRUM),
  gasLimit: 1_000_000n,
  isFeeHigh: false,
  isFeeVeryHigh: false,
};

const TECHNICAL_FEES: Record<"settlementChain" | "gmxAccount", TechnicalGmFees> = {
  settlementChain: { kind: "settlementChain", isDeposit: false, isGlv: false, fees: EXECUTION_FEE },
  gmxAccount: {
    kind: "gmxAccount",
    isDeposit: false,
    isGlv: false,
    fees: { executionFee: EXECUTION_FEE, relayFeeUsd: 0n },
  },
};

const userRejectedError = Object.assign(new Error("User rejected the request."), { code: 4001 });

let box: { amountInput: string; onCreateWithdrawal: () => Promise<void> } | undefined;

function GmSellBox({ technicalFees }: { technicalFees: TechnicalGmFees }) {
  const [amountInput, setAmountInput] = useState(TYPED_AMOUNT);
  const clearAmount = useCallback(() => setAmountInput(""), []);
  const { onCreateWithdrawal } = useWithdrawalTransactions({
    technicalFees,
    shouldDisableValidation: true,
    onSent: clearAmount,
  });

  box = { amountInput, onCreateWithdrawal };

  return null;
}

function setSelectorValues(paySource: GmPaySource) {
  mocks.selectorValues = new Map<unknown, unknown>([
    [selectChainId, ARBITRUM],
    [selectTokensData, {}],
    [selectPoolsDetailsFlags, { isDeposit: false, isWithdrawal: true }],
    [selectPoolsDetailsPaySource, paySource],
    [selectPoolsDetailsMarketTokenData, { address: ETH_USD_MARKET, decimals: 18 }],
    [selectDepositWithdrawalAmounts, { marketTokenAmount: 5n * 10n ** 17n, longTokenAmount: 0n, shortTokenAmount: 0n }],
    [
      selectPoolsDetailsParams,
      {
        addresses: { receiver: ACCOUNT, market: ETH_USD_MARKET, longTokenSwapPath: [], shortTokenSwapPath: [] },
        minLongTokenAmount: 0n,
        minShortTokenAmount: 0n,
        shouldUnwrapNativeToken: false,
      },
    ],
  ]);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  box = undefined;
});

describe("useWithdrawalTransactions", () => {
  it("clears the GM sell amount once the sell is sent and keeps it when the wallet rejects PRO-4568", async () => {
    const cases = [
      { paySource: "settlementChain", isSent: true },
      { paySource: "settlementChain", isSent: false },
      { paySource: "gmxAccount", isSent: true },
      { paySource: "gmxAccount", isSent: false },
    ] as const;

    for (const { paySource, isSent } of cases) {
      setSelectorValues(paySource);
      const createTxn =
        paySource === "settlementChain" ? mocks.createWithdrawalTxn : mocks.createMultichainWithdrawalTxn;
      if (isSent) {
        createTxn.mockResolvedValueOnce({ transactionHash: "0x01", taskId: "task" });
      } else {
        createTxn.mockRejectedValueOnce(userRejectedError);
      }

      render(<GmSellBox technicalFees={TECHNICAL_FEES[paySource]} />);
      await act(async () => {
        await box!.onCreateWithdrawal();
      });

      expect(createTxn, paySource).toHaveBeenCalledTimes(1);
      expect(box!.amountInput, `${paySource} ${isSent ? "sent" : "rejected"}`).toBe(isSent ? "" : TYPED_AMOUNT);

      cleanup();
      vi.clearAllMocks();
    }
  });
});
