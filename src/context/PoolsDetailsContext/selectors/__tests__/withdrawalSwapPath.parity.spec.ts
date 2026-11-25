import { encodeFunctionData, numberToHex, zeroAddress } from "viem";

import { Mode, Operation } from "domain/synthetics/markets/types";
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
import ExchangeRouterV2_2_1 from "sdk/abis/ExchangeRouterV2_2_1";
import { getContract } from "sdk/configs/contracts";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { SwapPricingType } from "sdk/utils/orders/types";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";
import { convertToContractTokenPrices, convertToUsd } from "sdk/utils/tokens/utils";

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

// The withdrawal as the app creates it, executed by SimulationRouter at the oracle prices the app quotes with
async function simulateWithdrawal(input: WithdrawalSwapInput) {
  const { ctx, market, testCase } = input;
  const { swapPath } = getAppSwapPathStats(input);
  const withdrawalVault = getContract(chainId, "WithdrawalVault");
  const tokens = [market, ...swapPath.map((address) => ctx.marketsInfoData[address])]
    .flatMap(({ indexToken, longToken, shortToken }) => [indexToken, longToken, shortToken])
    .filter((token, i, all) => all.findIndex((other) => other.address === token.address) === i);
  const priceTimestamp = ctx.blockTimestamp + 120n;
  const simulateExecuteData = encodeFunctionData({
    abi: abis.SimulationRouter,
    functionName: "simulateExecuteLatestWithdrawal",
    args: [
      {
        primaryTokens: tokens.map((token) => token.address),
        primaryPrices: tokens.map((token) => convertToContractTokenPrices(token.prices, token.decimals)),
        minTimestamp: priceTimestamp,
        maxTimestamp: priceTimestamp,
      },
      // the pricing of the withdrawal itself, as WithdrawalHandler.executeWithdrawal uses
      SwapPricingType.Withdrawal,
    ],
  });
  const payload = [
    encodeFunctionData({ abi: ExchangeRouterV2_2_1, functionName: "sendWnt", args: [withdrawalVault, EXECUTION_FEE] }),
    encodeFunctionData({
      abi: ExchangeRouterV2_2_1,
      functionName: "sendTokens",
      args: [market.marketTokenAddress, withdrawalVault, testCase.marketTokenAmount],
    }),
    encodeFunctionData({
      abi: ExchangeRouterV2_2_1,
      functionName: "createWithdrawal",
      args: [
        {
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
      ],
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
      data: encodeFunctionData({ abi: ExchangeRouterV2_2_1, functionName: "multicall", args: [payload] }),
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
