import { encodeFunctionData, numberToHex, zeroAddress } from "viem";

import { getCreateWithdrawalMulticallPayload } from "domain/synthetics/markets/createWithdrawalTxn";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { getSimulationPrices } from "domain/synthetics/orders/simulation";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import {
  chainId,
  dataStoreAddress,
  getMarketProps,
  loadMarketToken,
  ParityContext,
  readReader,
} from "domain/testUtils/parity/context";
import { parity, ParityInput, usd } from "domain/testUtils/parity/parity";
import { getErc20Overrides, getTransfersTo, traceCall } from "domain/testUtils/parity/simulation";
import { isSwapMarket } from "domain/testUtils/parity/swapPricing";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";
import { convertToUsd } from "sdk/utils/tokens/utils";

import { selectPoolsDetailsWithdrawalFindSwapPath } from "../poolsDetailsDerivedSelectors";

const ACCOUNT = "0x00000000000000000000000000000000000c0ffe";
const EXECUTION_FEE = 10n ** 15n;

type WithdrawalSwapCase = {
  label: string;
  marketTokenAmount: bigint;
  isReceiveLong: boolean;
  // what the contract withdraws before the swap
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
};

type WithdrawalSwapInput = ParityInput<WithdrawalSwapCase>;

async function withdrawalSwapCases(market: MarketInfo, ctx: ParityContext): Promise<WithdrawalSwapCase[]> {
  const marketToken = await loadMarketToken(ctx, market, false);

  if (!marketToken) {
    return [];
  }

  const sizes = await Promise.all(
    [usd(1_000), usd(5_000)].map(async (withdrawUsd) => {
      const marketTokenAmount = (withdrawUsd * marketToken.totalSupply!) / market.poolValueMax;
      const [longTokenAmount, shortTokenAmount] = await readReader<readonly [bigint, bigint]>(
        ctx,
        "getWithdrawalAmountOut",
        [
          dataStoreAddress,
          getMarketProps(market),
          getContractMarketPrices(ctx.tokensData, market)!,
          marketTokenAmount,
          zeroAddress,
          SwapPricingType.Withdrawal,
        ]
      );

      return { withdrawUsd, marketTokenAmount, longTokenAmount, shortTokenAmount };
    })
  );

  return sizes.flatMap((size) =>
    [true, false].map((isReceiveLong) => ({
      label: `$${size.withdrawUsd / usd(1)} receive ${isReceiveLong ? "long" : "short"}`,
      isReceiveLong,
      marketTokenAmount: size.marketTokenAmount,
      longTokenAmount: size.longTokenAmount,
      shortTokenAmount: size.shortTokenAmount,
    }))
  );
}

const getReceiveToken = ({ market, testCase }: WithdrawalSwapInput) =>
  testCase.isReceiveLong ? market.longToken : market.shortToken;

// The app's swap of the side the user does not receive, as the pool page builds it
function getAppSwapPathStats(input: WithdrawalSwapInput) {
  const { ctx, market, testCase } = input;
  const state = createMockSyntheticsState({
    tokensData: ctx.tokensData,
    marketsInfoData: ctx.marketsInfoData,
    poolsDetails: {
      glvOrMarketAddress: market.marketTokenAddress,
      operation: Operation.Withdrawal,
      mode: Mode.Single,
      firstTokenAddress: getReceiveToken(input).address,
    },
  });
  const findSwapPath = selectPoolsDetailsWithdrawalFindSwapPath(state)!;
  const [swappedToken, swappedAmount] = testCase.isReceiveLong
    ? [market.shortToken, testCase.shortTokenAmount]
    : [market.longToken, testCase.longTokenAmount];
  const usdIn = convertToUsd(swappedAmount, swappedToken.decimals, swappedToken.prices.maxPrice)!;

  return findSwapPath(usdIn)!;
}

// The withdrawal as createWithdrawalTxn creates and simulates it, executed by SimulationRouter
async function simulateWithdrawal(input: WithdrawalSwapInput) {
  const { ctx, market, testCase } = input;
  const { swapPath } = getAppSwapPathStats(input);
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
  const receivedAmount = getTransfersTo(trace, getReceiveToken(input).address, ACCOUNT);

  if (receivedAmount === 0n) {
    throw new Error(`The simulated withdrawal sent nothing: ${trace.error} ${trace.output?.slice(0, 74)}`);
  }

  return receivedAmount;
}

parity("withdrawal swap path (selectPoolsDetailsWithdrawalFindSwapPath) <-> a simulated withdrawal", {
  markets: (market) => isSwapMarket(market) && market.poolValueMax > usd(1_000_000),
  cases: withdrawalSwapCases,
  app: (input) => ({ swapAmountOut: getAppSwapPathStats(input).amountOut }),
  contract: async (input) => {
    const { testCase } = input;
    const receivedAmount = await simulateWithdrawal(input);
    const keptAmount = testCase.isReceiveLong ? testCase.longTokenAmount : testCase.shortTokenAmount;

    return { swapAmountOut: receivedAmount - keptAmount };
  },
  fields: {
    swapAmountOut: {
      knownIssues: [
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
