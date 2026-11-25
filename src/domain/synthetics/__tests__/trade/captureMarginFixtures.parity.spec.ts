/**
 * Recaptures fixtures/margin on an anvil fork of Arbitrum, with PARITY_RPC_URL pointing at the fork:
 * CAPTURE_MARGIN_FIXTURES=write writes the positions, then CAPTURE_MARGIN_FIXTURES=capture bisects the orders and
 * rewrites the JSON. Each fixture keeps its position and order, with the prices scaled to the market now. The
 * positions go into DataStore through a controller, in one block where the markets look just updated, so nothing
 * is pending at the capture. An order size executes when SimulationRouter.simulateExecuteLatestOrder reaches
 * EndOfOracleSimulation.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  maxUint256,
  numberToHex,
  zeroAddress,
  zeroHash,
} from "viem";
import { describe, it } from "vitest";

import type { ContractPositionInfo } from "domain/synthetics/positions/types";
import { parseContractPositionInfo } from "domain/synthetics/positions/utils";
import {
  chainId,
  dataStoreAddress,
  loadParityContext,
  ParityContext,
  readDataStoreUint,
  readReader,
} from "domain/testUtils/parity/context";
import { getErc20Overrides, getSimulationRevert, traceCall } from "domain/testUtils/parity/simulation";
import { abis } from "sdk/abis";
import { getViemChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import {
  cumulativeBorrowingFactorKey,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  maxOpenInterestKey,
  maxPnlFactorKey,
  MIN_COLLATERAL_USD_KEY,
  minCollateralFactorForOpenInterest,
  openInterestInTokensKey,
  openInterestKey,
  openInterestReserveFactorKey,
  POSITION_LIST_KEY,
  reserveFactorKey,
  totalBorrowingKey,
} from "sdk/configs/dataStore";
import { getWrappedToken } from "sdk/configs/tokens";
import { hashData, hashString } from "sdk/utils/hash";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { applyFactor } from "sdk/utils/numbers";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import { encodeSimulationRouterExternalCall } from "sdk/utils/orderTransactions/simulation";
import { encodeExchangeRouterMulticall } from "sdk/utils/orderTransactions/utils";
import { getPositionInfo } from "sdk/utils/positions/utils";
import type { TokenData } from "sdk/utils/tokens/types";
import { convertToContractPrice, convertToContractTokenPrices } from "sdk/utils/tokens/utils";
import { getMarketInfoAtIndexPrice } from "sdk/utils/trade/increaseMarginCheck";

// eslint-disable-next-line no-restricted-globals -- test-only
const { CAPTURE_MARGIN_FIXTURES, PARITY_RPC_URL = "" } = process.env;

const FIXTURES_DIR = path.join(__dirname, "fixtures/margin");
const EXECUTION_FEE = 10n ** 15n;
const PRECISION_USD = 10n ** 28n;
const POSITION_UTILS = "0x3bacf30e1f71c3711FA0508BCDFFcBDCde6120C7";
const INCREASE_POSITION_UTILS = "0x3173404B80bd6fE8C8a9583608247046de3D0621";

const reviver = (_: string, v: any) => (v && typeof v === "object" && "$bigint" in v ? BigInt(v.$bigint) : v);
const replacer = (_: string, v: any) => (typeof v === "bigint" ? { $bigint: v.toString() } : v);

const positionField = (key: string, name: string) => hashData(["bytes32", "bytes32"], [key, hashString(name)]);
const fundingKey = (prefix: string, market: string, token: string, isLong: boolean) =>
  hashData(["bytes32", "address", "address", "bool"], [hashString(prefix), market, token, isLong]);

const midPrice = (token: TokenData) => (token.prices.minPrice + token.prices.maxPrice) / 2n;

async function getController(client: ReturnType<typeof createPublicClient>) {
  const roleStore = await client.readContract({
    address: dataStoreAddress,
    abi: [{ name: "roleStore", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }],
    functionName: "roleStore",
  });
  const [controller] = await client.readContract({
    address: roleStore,
    abi: [
      {
        name: "getRoleMembers",
        type: "function",
        stateMutability: "view",
        inputs: [{ type: "bytes32" }, { type: "uint256" }, { type: "uint256" }],
        outputs: [{ type: "address[]" }],
      },
    ],
    functionName: "getRoleMembers",
    args: [hashString("CONTROLLER"), 0n, 1n],
  });

  return controller;
}

type Template = any;

function scaleByIndex(template: Template, market: MarketInfo) {
  const oldIndex = template.marketsInfoData[template.market.marketTokenAddress].indexToken as TokenData;
  const ratio = (value: bigint) => (value * midPrice(market.indexToken)) / midPrice(oldIndex);

  return ratio;
}

// each fixture has its own account: two fixtures can hold the same market, collateral and side
const getAccount = (template: Template) => `0x${keccak256(new TextEncoder().encode(template.name)).slice(26)}`;

async function writePosition(template: Template, market: MarketInfo, live: ParityContext, writeTimestamp: bigint) {
  const account = getAccount(template);
  const p = template.position;
  const scale = scaleByIndex(template, market);
  const entryPrice = scale(p.entryPrice as bigint);
  const sizeInTokens = (p.sizeInUsd * 10n ** BigInt(market.indexToken.decimals)) / entryPrice;
  const key = hashData(
    ["address", "address", "address", "bool"],
    [account, market.marketTokenAddress, p.collateralTokenAddress, p.isLong]
  );
  const openInterestUsdKey = openInterestKey(market.marketTokenAddress, p.collateralTokenAddress, p.isLong);
  const openInterestTokensKey = openInterestInTokensKey(market.marketTokenAddress, p.collateralTokenAddress, p.isLong);
  const [
    openInterestUsd,
    openInterestTokens,
    totalBorrowing,
    borrowingFactor,
    fundingFeeAmountPerSize,
    longClaimable,
    shortClaimable,
  ] = await Promise.all([
    readDataStoreUint(live, openInterestUsdKey),
    readDataStoreUint(live, openInterestTokensKey),
    readDataStoreUint(live, totalBorrowingKey(market.marketTokenAddress, p.isLong)),
    readDataStoreUint(live, cumulativeBorrowingFactorKey(market.marketTokenAddress, p.isLong)),
    readDataStoreUint(
      live,
      fundingKey("FUNDING_FEE_AMOUNT_PER_SIZE", market.marketTokenAddress, p.collateralTokenAddress, p.isLong)
    ),
    readDataStoreUint(
      live,
      fundingKey("CLAIMABLE_FUNDING_AMOUNT_PER_SIZE", market.marketTokenAddress, market.longTokenAddress, p.isLong)
    ),
    readDataStoreUint(
      live,
      fundingKey("CLAIMABLE_FUNDING_AMOUNT_PER_SIZE", market.marketTokenAddress, market.shortTokenAddress, p.isLong)
    ),
  ]);
  const accountPositionListKey = hashData(["bytes32", "address"], [hashString("ACCOUNT_POSITION_LIST"), account]);
  const calls: { functionName: string; args: unknown[] }[] = [
    { functionName: "addBytes32", args: [POSITION_LIST_KEY, key] },
    { functionName: "addBytes32", args: [accountPositionListKey, key] },
    { functionName: "setAddress", args: [positionField(key, "ACCOUNT"), account] },
    { functionName: "setAddress", args: [positionField(key, "MARKET"), market.marketTokenAddress] },
    { functionName: "setAddress", args: [positionField(key, "COLLATERAL_TOKEN"), p.collateralTokenAddress] },
    { functionName: "setUint", args: [positionField(key, "SIZE_IN_USD"), p.sizeInUsd] },
    { functionName: "setUint", args: [positionField(key, "SIZE_IN_TOKENS"), sizeInTokens] },
    { functionName: "setUint", args: [positionField(key, "COLLATERAL_AMOUNT"), p.collateralAmount] },
    { functionName: "setUint", args: [positionField(key, "BORROWING_FACTOR"), borrowingFactor] },
    { functionName: "setUint", args: [positionField(key, "FUNDING_FEE_AMOUNT_PER_SIZE"), fundingFeeAmountPerSize] },
    {
      functionName: "setUint",
      args: [positionField(key, "LONG_TOKEN_CLAIMABLE_FUNDING_AMOUNT_PER_SIZE"), longClaimable],
    },
    {
      functionName: "setUint",
      args: [positionField(key, "SHORT_TOKEN_CLAIMABLE_FUNDING_AMOUNT_PER_SIZE"), shortClaimable],
    },
    { functionName: "setUint", args: [positionField(key, "INCREASED_AT_TIME"), writeTimestamp] },
    { functionName: "setBool", args: [positionField(key, "IS_LONG"), p.isLong] },
  ];
  // the fixtures are about the margin gates: the capacity gates get room
  const openInterest = p.isLong ? market.longInterestUsd : market.shortInterestUsd;
  calls.push(
    {
      functionName: "setUint",
      args: [maxOpenInterestKey(market.marketTokenAddress, p.isLong), openInterest + 10n ** 37n],
    },
    { functionName: "setUint", args: [openInterestReserveFactorKey(market.marketTokenAddress, p.isLong), 10n ** 31n] },
    { functionName: "setUint", args: [reserveFactorKey(market.marketTokenAddress, p.isLong), 10n ** 31n] }
  );
  // a pnl-capped fixture keeps the trader pnl cap it was made with, and the leverage check, which counts the
  // capped pnl, is what stops its orders
  if (template.name.includes("pnl-capped")) {
    const oldMarket = template.marketsInfoData[template.market.marketTokenAddress];
    calls.push(
      {
        functionName: "setUint",
        args: [
          maxPnlFactorKey(MAX_PNL_FACTOR_FOR_TRADERS_KEY, market.marketTokenAddress, p.isLong),
          p.isLong ? oldMarket.maxPnlFactorForTradersLong : oldMarket.maxPnlFactorForTradersShort,
        ],
      },
      { functionName: "setUint", args: [minCollateralFactorForOpenInterest(market.marketTokenAddress, p.isLong), 0n] }
    );
  }
  // the market totals a real position is part of: its open interest, and its share of the total borrowing,
  // which an increase takes out again
  const additions = [
    { key: openInterestUsdKey, total: openInterestUsd, share: p.sizeInUsd as bigint },
    { key: openInterestTokensKey, total: openInterestTokens, share: sizeInTokens },
    {
      key: totalBorrowingKey(market.marketTokenAddress, p.isLong),
      total: totalBorrowing,
      share: applyFactor(p.sizeInUsd, borrowingFactor),
    },
  ];

  return { key, entryPrice, sizeInTokens, calls, additions };
}

async function sendAsController(calls: { functionName: string; args: unknown[] }[], timestamp: bigint) {
  const transport = http(PARITY_RPC_URL);
  const client = createPublicClient({ chain: getViemChain(chainId), transport });
  const controller = await getController(client as any);
  const request = client.request as any;

  await request({ method: "anvil_impersonateAccount", params: [controller] });
  await request({ method: "anvil_setBalance", params: [controller, numberToHex(10n ** 20n)] });

  const wallet = createWalletClient({ chain: getViemChain(chainId), transport, account: controller });
  let nonce = await client.getTransactionCount({ address: controller });
  const hashes: string[] = [];

  // every write in one block at the given timestamp, the block the capture then reads
  await request({ method: "evm_setAutomine", params: [false] });

  for (const call of calls) {
    hashes.push(
      await wallet.writeContract({
        address: dataStoreAddress,
        abi: abis.DataStore,
        gas: 500_000n,
        nonce: nonce++,
        ...(call as any),
      })
    );
  }

  await request({ method: "evm_setNextBlockTimestamp", params: [numberToHex(timestamp)] });
  await request({ method: "evm_mine", params: [] });
  await request({ method: "evm_setAutomine", params: [true] });

  for (const hash of hashes) {
    const receipt = await client.waitForTransactionReceipt({ hash: hash as `0x${string}` });
    if (receipt.status !== "success") throw new Error(`write failed: ${hash}`);
  }
}

function getOrderPrices(template: Template, market: MarketInfo, triggerPrice: bigint | undefined) {
  const { marketInfo } = getMarketInfoAtIndexPrice({
    marketInfo: market,
    collateralToken: market.longToken,
    indexPrice: triggerPrice,
    isLong: template.order.isLong,
  });
  const tokens = [marketInfo.indexToken, marketInfo.longToken, marketInfo.shortToken].filter(
    (token, i, all) => all.findIndex((t) => t.address === token.address) === i
  );

  return {
    primaryTokens: tokens.map((token) => token.address),
    primaryPrices: tokens.map((token) => convertToContractTokenPrices(token.prices, token.decimals)),
  };
}

async function simulateIncrease(
  ctx: ParityContext,
  template: Template,
  market: MarketInfo,
  sizeDeltaUsd: bigint,
  triggerPrice: bigint | undefined
) {
  const { order } = template;
  const account = getAccount(template);
  const orderVault = getContract(chainId, "OrderVault");
  const payAmount: bigint = order.payAmount;
  const isMarket = order.orderType === OrderType.MarketIncrease;
  const priceTimestamp = ctx.blockTimestamp + 120n;
  const prices = getOrderPrices(template, market, triggerPrice);
  const simulateExecuteData = encodeFunctionData({
    abi: abis.SimulationRouter,
    functionName: "simulateExecuteLatestOrder",
    args: [{ ...prices, minTimestamp: priceTimestamp, maxTimestamp: priceTimestamp }],
  });
  // a WETH payment goes in as ETH through sendWnt, as the app sends it
  const isWethPayment = order.payTokenAddress === getWrappedToken(chainId).address;
  const value = EXECUTION_FEE + (isWethPayment ? payAmount : 0n);
  const multicall = [
    { method: "sendWnt", params: [orderVault, value] },
    ...(payAmount > 0n && !isWethPayment
      ? [{ method: "sendTokens", params: [order.payTokenAddress, orderVault, payAmount] }]
      : []),
    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: account,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: market.marketTokenAddress,
            initialCollateralToken: order.payTokenAddress,
            swapPath: order.swapPath,
          },
          numbers: {
            sizeDeltaUsd,
            initialCollateralDeltaAmount: 0n,
            triggerPrice: isMarket ? 0n : convertToContractPrice(triggerPrice!, market.indexToken.decimals),
            acceptablePrice: order.isLong ? maxUint256 : 0n,
            executionFee: EXECUTION_FEE,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: order.orderType,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: order.isLong,
          shouldUnwrapNativeToken: false,
          autoCancel: false,
          referralCode: zeroHash,
          dataList: [],
        },
      ],
    },
  ];
  const { encodedMulticall } = encodeExchangeRouterMulticall(chainId, multicall as any);
  const data = encodeFunctionData({
    abi: abis.ExchangeRouter,
    functionName: "multicall",
    args: [
      [
        ...encodedMulticall,
        encodeSimulationRouterExternalCall(getContract(chainId, "SimulationRouter"), simulateExecuteData),
      ],
    ],
  });
  const tokenOverrides =
    payAmount > 0n && !isWethPayment
      ? await getErc20Overrides(ctx, {
          token: order.payTokenAddress,
          account: account,
          amount: payAmount,
          spender: getContract(chainId, "SyntheticsRouter"),
        })
      : {};
  const trace = await traceCall(
    ctx,
    { from: account, to: getContract(chainId, "ExchangeRouter"), data, value },
    { ...tokenOverrides, [account]: { balance: numberToHex(10n ** 22n) } }
  );
  const error = getSimulationRevert(trace);

  if (error?.name === "EndOfOracleSimulation") {
    return { executes: true as const };
  }

  const reason = error
    ? `${error.name}(${Object.values(error.args ?? {}).join(", ")})`
    : `${trace.error} ${trace.output}`;

  return { executes: false as const, reason };
}

function loadTemplates(): { file: string; template: Template }[] {
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, template: JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), "utf8"), reviver) }));
}

// the position as the app shows it, from Reader.getPositionInfo
async function loadPositionInfo(ctx: ParityContext, key: string, market: MarketInfo) {
  const info = await readReader<ContractPositionInfo>(ctx, "getPositionInfo", [
    dataStoreAddress,
    getContract(chainId, "ReferralStorage"),
    key,
    getContractMarketPrices(ctx.tokensData, market)!,
    0n,
    zeroAddress,
    true,
  ]);
  const minCollateralUsd = await readDataStoreUint(ctx, MIN_COLLATERAL_USD_KEY);
  const position = getPositionInfo({
    position: parseContractPositionInfo(info),
    marketInfo: market,
    minCollateralUsd,
    userReferralInfo: undefined,
    uiFeeFactor: 0n,
  });

  return { position, minCollateralUsd };
}

async function findFlip(probe: (size: bigint) => Promise<{ executes: boolean; reason?: string }>, start: bigint) {
  let low = 10n ** 30n;
  let high = start;
  let probes = 0;
  const run = async (size: bigint) => {
    probes++;
    return probe(size);
  };

  const atLow = await run(low);
  if (!atLow.executes) throw new Error(`$1 does not execute: ${atLow.reason}`);

  let atHigh = await run(high);
  while (atHigh.executes) {
    low = high;
    high *= 2n;
    atHigh = await run(high);
  }

  let reason = atHigh.reason!;
  while (high - low > PRECISION_USD) {
    const mid = (low + high) / 2n;
    const result = await run(mid);
    if (result.executes) low = mid;
    else [high, reason] = [mid, result.reason!];
  }

  return { largestExecutesUsd: low, firstRejectedUsd: high, reason, precisionUsd: PRECISION_USD, probes };
}

const POSITION_FIELDS = [
  "key",
  "marketAddress",
  "collateralTokenAddress",
  "isLong",
  "sizeInUsd",
  "sizeInTokens",
  "collateralAmount",
  "pendingImpactAmount",
  "pendingBorrowingFeesUsd",
  "pendingFundingFeesUsd",
  "fundingFeeAmount",
  "collateralUsd",
  "entryPrice",
  "liquidationPrice",
  "pnl",
] as const;

describe.skipIf(!CAPTURE_MARGIN_FIXTURES)("capture fixtures/margin", () => {
  it.runIf(CAPTURE_MARGIN_FIXTURES === "write")(
    "writes the fixture positions",
    async () => {
      const live = await loadParityContext();
      const latest = await createPublicClient({
        chain: getViemChain(chainId),
        transport: http(PARITY_RPC_URL),
      }).getBlock();
      const writeTimestamp = latest.timestamp + 1n;
      const templates = loadTemplates();
      const written = await Promise.all(
        templates.map(({ template }) =>
          writePosition(template, live.marketsInfoData[template.market.marketTokenAddress], live, writeTimestamp)
        )
      );
      // the markets look updated in the write block: no borrowing or funding is pending at the capture
      const markets = [...new Set(templates.map(({ template }) => template.market.marketTokenAddress as string))];
      const updatedAtCalls = markets.flatMap((market) => [
        {
          functionName: "setUint",
          args: [hashData(["bytes32", "address"], [hashString("FUNDING_UPDATED_AT"), market]), writeTimestamp],
        },
        ...[true, false].map((isLong) => ({
          functionName: "setUint",
          args: [
            hashData(
              ["bytes32", "address", "bool"],
              [hashString("CUMULATIVE_BORROWING_FACTOR_UPDATED_AT"), market, isLong]
            ),
            writeTimestamp,
          ],
        })),
      ]);

      const totals = new Map<string, bigint>();
      written
        .flatMap(({ additions }) => additions)
        .forEach(({ key, total, share }) => totals.set(key, (totals.get(key) ?? total) + share));
      const totalCalls = [...totals].map(([key, value]) => ({ functionName: "setUint", args: [key, value] }));

      await sendAsController([...written.flatMap((w) => w.calls), ...totalCalls, ...updatedAtCalls], writeTimestamp);
    },
    600_000
  );

  it.runIf(CAPTURE_MARGIN_FIXTURES === "capture")(
    "bisects each order and writes the fixtures",
    async () => {
      const ctx = await loadParityContext();
      const [positionUtilsCode, increasePositionUtilsCode] = await Promise.all(
        [POSITION_UTILS, INCREASE_POSITION_UTILS].map((address) => ctx.client.getCode({ address }))
      );

      for (const { file, template } of loadTemplates()) {
        const market = ctx.marketsInfoData[template.market.marketTokenAddress];
        const scale = scaleByIndex(template, market);
        const p = template.position;
        const account = getAccount(template);
        const key = hashData(
          ["address", "address", "address", "bool"],
          [account, market.marketTokenAddress, p.collateralTokenAddress, p.isLong]
        );
        const { position, minCollateralUsd } = await loadPositionInfo(ctx, key, market);

        const triggerPrice = template.order.triggerPrice === null ? undefined : scale(template.order.triggerPrice);
        const flip = await findFlip(
          (size) => simulateIncrease(ctx, template, market, size, triggerPrice),
          template.flip.largestExecutesUsd
        );
        const tokens = [market.indexToken, market.longToken, market.shortToken];
        const fixture = {
          name: template.name,
          meta: {
            chainId,
            forkBlock: Number(ctx.blockNumber),
            forkBlockTimestamp: Number(ctx.blockTimestamp),
            capturedAt: new Date().toISOString(),
            positionUtils: POSITION_UTILS,
            increasePositionUtils: INCREASE_POSITION_UTILS,
            bytecodeHashes: {
              positionUtils: keccak256(positionUtilsCode!),
              increasePositionUtils: keccak256(increasePositionUtilsCode!),
            },
          },
          market: { name: market.name, marketTokenAddress: market.marketTokenAddress },
          minCollateralUsd,
          marketsInfoData: { [market.marketTokenAddress]: market },
          tokensData: Object.fromEntries(
            tokens.filter((t) => ctx.tokensData[t.address]).map((t) => [t.address, ctx.tokensData[t.address]])
          ),
          position: Object.fromEntries(POSITION_FIELDS.map((field) => [field, position[field]])),
          order: { ...template.order, triggerPrice: triggerPrice ?? null },
          flip: { ...flip, probedAt: triggerPrice === undefined ? "mark" : "trigger" },
        };

        writeFileSync(path.join(FIXTURES_DIR, file), JSON.stringify(fixture, replacer, 1) + "\n");
        // eslint-disable-next-line no-console
        console.log(template.name, flip);
      }
    },
    3_600_000
  );
});
