import { encodeFunctionData, formatUnits, numberToHex, zeroAddress } from "viem";

import { getCreateWithdrawalMulticallPayload } from "domain/synthetics/markets/createWithdrawalTxn";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { getSimulationPrices } from "domain/synthetics/orders/simulation";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { chainId, loadMarketToken, ParityContext } from "domain/testUtils/parity/context";
import { parity, ParityInput, usd } from "domain/testUtils/parity/parity";
import {
  getErc20Overrides,
  getSimulationRevert,
  getTransferredAmountTo,
  traceCall,
} from "domain/testUtils/parity/simulation";
import { isSwapMarket } from "domain/testUtils/parity/swapPricing";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import type { MarketInfo } from "sdk/utils/markets/types";
import { SwapPricingType } from "sdk/utils/orders/types";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";
import type { TokenData } from "sdk/utils/tokens/types";
import type { WithdrawalAmounts } from "sdk/utils/trade/types";

import { selectDepositWithdrawalAmounts } from "../selectDepositWithdrawalAmounts";

const ACCOUNT = "0x00000000000000000000000000000000000c0ffe";
const EXECUTION_FEE = 10n ** 15n;

type WithdrawalSwapCase = { label: string; marketToken: TokenData; marketTokenAmount: bigint; isReceiveLong: boolean };

type WithdrawalSwapInput = ParityInput<WithdrawalSwapCase>;

async function withdrawalSwapCases(market: MarketInfo, ctx: ParityContext): Promise<WithdrawalSwapCase[]> {
  const marketToken = await loadMarketToken(ctx, market, false);

  if (!marketToken) {
    return [];
  }

  return [usd(1_000), usd(5_000)].flatMap((withdrawUsd) =>
    [true, false].map((isReceiveLong) => ({
      label: `$${withdrawUsd / usd(1)} receive ${isReceiveLong ? "long" : "short"}`,
      marketToken,
      marketTokenAmount: (withdrawUsd * marketToken.totalSupply!) / market.poolValueMax,
      isReceiveLong,
    }))
  );
}

const getReceiveToken = ({ market, testCase }: WithdrawalSwapInput) =>
  testCase.isReceiveLong ? market.longToken : market.shortToken;

// The withdrawal amounts the pool page shows for a GM amount and one receive token
function getAppWithdrawalAmounts(input: WithdrawalSwapInput) {
  const { ctx, market, testCase } = input;
  const state = createMockSyntheticsState({
    tokensData: ctx.tokensData,
    marketsInfoData: ctx.marketsInfoData,
    poolsDetails: {
      glvOrMarketAddress: market.marketTokenAddress,
      operation: Operation.Withdrawal,
      mode: Mode.Single,
      firstTokenAddress: getReceiveToken(input).address,
      focusedInput: "market",
      marketOrGlvTokenInputValue: formatUnits(testCase.marketTokenAmount, testCase.marketToken.decimals),
      withdrawalMarketTokensData: { [market.marketTokenAddress]: testCase.marketToken },
    },
  });

  return selectDepositWithdrawalAmounts(state) as WithdrawalAmounts;
}

const getAppSwapPath = (input: WithdrawalSwapInput) => {
  const amounts = getAppWithdrawalAmounts(input);
  const swapPathStats = input.testCase.isReceiveLong ? amounts.shortTokenSwapPathStats : amounts.longTokenSwapPathStats;

  return swapPathStats!.swapPath;
};

// The withdrawal as createWithdrawalTxn creates and simulates it, executed by SimulationRouter
async function simulateWithdrawal(input: WithdrawalSwapInput) {
  const { ctx, market, testCase } = input;
  const swapPath = getAppSwapPath(input);
  // the price timestamp simulateExecuteTxn uses
  const priceTimestamp = ctx.blockTimestamp + 120n;
  const simulateExecuteData = encodeFunctionData({
    abi: abis.SimulationRouter,
    functionName: "simulateExecuteLatestWithdrawal",
    args: [
      {
        ...getSimulationPrices(chainId, ctx.tokensData, []),
        minTimestamp: priceTimestamp,
        maxTimestamp: priceTimestamp,
      },
      // the pricing of the withdrawal itself, as WithdrawalHandler.executeWithdrawal uses
      SwapPricingType.Withdrawal,
    ],
  });
  const payload = [
    ...getCreateWithdrawalMulticallPayload(chainId, {
      marketTokenAmount: testCase.marketTokenAmount,
      params: {
        addresses: {
          receiver: ACCOUNT,
          callbackContract: zeroAddress,
          uiFeeReceiver: zeroAddress,
          market: market.marketTokenAddress,
          longTokenSwapPath: testCase.isReceiveLong ? [] : swapPath,
          shortTokenSwapPath: testCase.isReceiveLong ? swapPath : [],
        },
        minLongTokenAmount: 0n,
        minShortTokenAmount: 0n,
        shouldUnwrapNativeToken: false,
        executionFee: EXECUTION_FEE,
        callbackGasLimit: 0n,
        dataList: [],
      },
    }),
    encodeSimulationRouterExternalCall(getContract(chainId, "SimulationRouter"), simulateExecuteData),
  ];
  const marketTokenOverrides = await getErc20Overrides(ctx, {
    token: market.marketTokenAddress,
    account: ACCOUNT,
    amount: testCase.marketTokenAmount,
    spender: getContract(chainId, "SyntheticsRouter"),
  });
  const trace = await traceCall(
    ctx,
    {
      from: ACCOUNT,
      to: getContract(chainId, "ExchangeRouter"),
      data: encodeFunctionData({ abi: abis.ExchangeRouter, functionName: "multicall", args: [payload] }),
      value: EXECUTION_FEE,
    },
    { ...marketTokenOverrides, [ACCOUNT]: { balance: numberToHex(10n ** 18n) } }
  );
  // the trace keeps the transfers of reverted calls, so a withdrawal that reverts midway still sends something
  const endError = getSimulationRevert(trace)?.name;

  if (endError !== "EndOfOracleSimulation") {
    throw new Error(
      `The simulated withdrawal did not finish: ${endError ?? trace.error} ${trace.output?.slice(0, 74)}`
    );
  }

  return getTransferredAmountTo(trace, getReceiveToken(input).address, ACCOUNT);
}

parity("withdrawal with a swap path (selectDepositWithdrawalAmounts) <-> a simulated withdrawal", {
  markets: (market) => isSwapMarket(market) && market.poolValueMax > usd(1_000_000),
  cases: withdrawalSwapCases,
  app: (input) => {
    const amounts = getAppWithdrawalAmounts(input);

    return { receiveAmount: input.testCase.isReceiveLong ? amounts.longTokenAmount : amounts.shortTokenAmount };
  },
  contract: async (input) => ({ receiveAmount: await simulateWithdrawal(input) }),
  fields: {
    receiveAmount: {
      knownIssues: [
        { reason: "marketTokenAmountToUsd prices GM at poolValueMax, the contract at the minimized pool value" },
        {
          reason:
            "we take the fees on the USD output and round once, the contract floors the output and each fee to token units",
        },
        {
          reason:
            "getWithdrawalAmounts gives the swap its input in USD at the max price, getSwapStats turns it back into tokens at the min price: the swap input is too large by the token's spread",
        },
        {
          reason:
            "getSwapStats measures the impact on usdIn at the min price, the contract on amountIn at the mid price",
        },
        {
          reason:
            "we price the swap on the pool before the withdrawal, the contract after the withdrawal took its tokens",
        },
      ],
    },
  },
});
