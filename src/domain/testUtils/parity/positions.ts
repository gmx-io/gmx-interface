import { zeroAddress } from "viem";

import type { ContractPositionInfo } from "domain/synthetics/positions/types";
import { parseContractPositionInfo } from "domain/synthetics/positions/utils";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import {
  MIN_COLLATERAL_USD_KEY,
  POSITION_LIST_KEY,
  proDiscountFactorKey,
  proTraderTierKey,
} from "sdk/configs/dataStore";
import type { MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { PRECISION } from "sdk/utils/numbers";
import type { Position } from "sdk/utils/positions/types";
import type { UserReferralInfo } from "sdk/utils/referrals/types";
import { getIsEquivalentTokens } from "sdk/utils/tokens/utils";

import {
  chainId,
  dataStoreAddress,
  loadParityContext,
  ParityContext,
  readDataStoreUint,
  readReader,
  Scenario,
} from "./context";
import { ParityInput, usd } from "./parity";

// eslint-disable-next-line no-restricted-globals -- test-only helper, never bundled into the client
const { PARITY_MAX_POSITIONS = "300" } = process.env;

// Token-unit rounding of fees on dust positions reads as whole bps of their size
const MIN_POSITION_SIZE_USD = usd(100);
const KEYS_PAGE = 1000n;

export const referralStorageAddress = getContract(chainId, "ReferralStorage");

export type ParityPosition = {
  label: string;
  key: string;
  info: ContractPositionInfo;
  position: Position;
  referralInfo: UserReferralInfo;
};

export function getCollateralToken(market: MarketInfo, position: Position) {
  return position.collateralTokenAddress === market.longTokenAddress ? market.longToken : market.shortToken;
}

export const bpsOfSize = {
  bpsOf: ({ testCase }: ParityInput<ParityPosition>) => testCase.position.sizeInUsd,
  toleranceBps: 0.001,
};

export const hasProDiscount = ({ testCase: { info } }: ParityInput<ParityPosition>) =>
  info.fees.pro.traderDiscountFactor > info.fees.referral.traderDiscountFactor;

async function readPositionKeys(ctx: ParityContext) {
  const count = await ctx.client.readContract({
    address: dataStoreAddress,
    abi: abis.DataStore,
    functionName: "getBytes32Count",
    args: [POSITION_LIST_KEY],
  });
  const pages = await Promise.all(
    Array.from({ length: Number((count + KEYS_PAGE - 1n) / KEYS_PAGE) }, (_, i) =>
      ctx.client.readContract({
        address: dataStoreAddress,
        abi: abis.DataStore,
        functionName: "getBytes32ValuesAt",
        args: [POSITION_LIST_KEY, BigInt(i) * KEYS_PAGE, BigInt(i + 1) * KEYS_PAGE],
      })
    )
  );

  return pages.flat();
}

type StoredPosition = { addresses: { market: string; collateralToken: string }; flags: { isLong: boolean } };

// An even spread over each side and collateral kind, so rare kinds like shorts with index token collateral are in
async function readSampledPositionKeys(ctx: ParityContext) {
  const keys = await readPositionKeys(ctx);
  const storedPositions = await Promise.all(
    keys.map((key) => readReader<StoredPosition>(ctx, "getPosition", [dataStoreAddress, key]))
  );
  const keysByKind = new Map<string, { key: string; marketAddress: string }[]>();

  keys.forEach((key, i) => {
    const { addresses, flags } = storedPositions[i];
    const market = ctx.marketsInfoData[addresses.market];

    if (!market || market.isSpotOnly) {
      return;
    }

    const collateral = addresses.collateralToken === market.longTokenAddress ? market.longToken : market.shortToken;
    const kind = `${flags.isLong} ${getIsEquivalentTokens(collateral, market.indexToken)}`;

    keysByKind.set(kind, [...(keysByKind.get(kind) ?? []), { key, marketAddress: addresses.market }]);
  });

  const maxPerKind = Math.ceil(Number(PARITY_MAX_POSITIONS) / keysByKind.size);

  return [...keysByKind.values()].flatMap((kindKeys) => {
    const step = Math.max(1, Math.ceil(kindKeys.length / maxPerKind));

    return kindKeys.filter((_, i) => i % step === 0);
  });
}

function getReferralInfo(info: ContractPositionInfo): UserReferralInfo {
  const { referralCode, affiliate, totalRebateFactor, traderDiscountFactor } = info.fees.referral;

  return {
    userReferralCode: referralCode,
    userReferralCodeString: "",
    referralCodeForTxn: referralCode,
    attachedOnChain: true,
    affiliate,
    tierId: 0,
    totalRebate: 0n,
    totalRebateFactor,
    discountShare: 0n,
    // the contract's traderDiscountFactor is already totalRebate * discountShare, the app keeps the share
    discountFactor: totalRebateFactor > 0n ? (traderDiscountFactor * PRECISION) / totalRebateFactor : 0n,
  };
}

async function readPosition(ctx: ParityContext, key: string, market: MarketInfo): Promise<ParityPosition> {
  const prices = getContractMarketPrices(ctx.tokensData, market)!;
  const info = await readReader<ContractPositionInfo>(ctx, "getPositionInfo", [
    dataStoreAddress,
    referralStorageAddress,
    key,
    prices,
    0n,
    zeroAddress,
    true,
  ]);
  const position = parseContractPositionInfo(info);

  if (position.contractKey !== key) {
    throw new Error(`Position key mismatch for ${key}`);
  }

  const side = position.isLong ? "long" : "short";
  const collateral = getCollateralToken(market, position);

  return {
    label: `${side} ${collateral.symbol} $${position.sizeInUsd / usd(1)} ${key.slice(0, 8)}`,
    key,
    info,
    position,
    referralInfo: getReferralInfo(info),
  };
}

let sampledPositionKeys: ReturnType<typeof readSampledPositionKeys> | undefined;

// Scenarios do not change the position list, so every context takes the sample of the live state
async function readPositions(ctx: ParityContext) {
  if (!sampledPositionKeys) {
    sampledPositionKeys = loadParityContext().then(readSampledPositionKeys);
  }

  const keys = await sampledPositionKeys;
  const positions = await Promise.all(
    keys.map(({ key, marketAddress }) => {
      const market = ctx.marketsInfoData[marketAddress];

      return market ? readPosition(ctx, key, market) : undefined;
    })
  );

  return positions.filter((p): p is ParityPosition => p !== undefined && p.position.sizeInUsd >= MIN_POSITION_SIZE_USD);
}

const positionsByContext = new WeakMap<ParityContext, ReturnType<typeof readPositions>>();

function loadAllPositions(ctx: ParityContext) {
  if (!positionsByContext.has(ctx)) {
    positionsByContext.set(ctx, readPositions(ctx));
  }

  return positionsByContext.get(ctx)!;
}

/** Open positions of at least $100 from a fixed sample of up to PARITY_MAX_POSITIONS (default 300) position keys */
export async function loadPositions(market: MarketInfo, ctx: ParityContext): Promise<ParityPosition[]> {
  const positions = await loadAllPositions(ctx);

  return positions.filter((p) => p.position.marketAddress === market.marketTokenAddress);
}

const minCollateralUsdByContext = new WeakMap<ParityContext, Promise<bigint>>();

export function loadMinCollateralUsd(ctx: ParityContext): Promise<bigint> {
  if (!minCollateralUsdByContext.has(ctx)) {
    minCollateralUsdByContext.set(ctx, readDataStoreUint(ctx, MIN_COLLATERAL_USD_KEY));
  }

  return minCollateralUsdByContext.get(ctx)!;
}

const PRO_TIER = 1n;
const PRO_DISCOUNT_FACTOR = PRECISION / 2n;

let proTierScenario: Promise<Scenario> | undefined;

/** Every sampled account gets a pro tier with a 50% closing fee discount */
export function loadProTierScenario(): Promise<Scenario> {
  if (!proTierScenario) {
    proTierScenario = loadParityContext()
      .then(loadAllPositions)
      .then((positions) => {
        const accounts = new Set(positions.map((p) => p.position.account));
        const tiers = [...accounts].map((account): [string, bigint] => [proTraderTierKey(account), PRO_TIER]);

        return {
          name: "pro tier for every account",
          overrides: { uint: [[proDiscountFactorKey(PRO_TIER), PRO_DISCOUNT_FACTOR], ...tiers] },
        };
      });
  }

  return proTierScenario;
}
