import { dataStoreAddress, getMarketProps, ParityContext, readReader } from "domain/testUtils/parity/context";
import { parity, ParityInput, toBps } from "domain/testUtils/parity/parity";
import {
  getCollateralToken,
  isProDiscountLarger,
  loadMinCollateralUsd,
  loadPositions,
  loadStoredStateFees,
  ParityPosition,
  PRO_TIER_SCENARIO,
  referralStorageAddress,
} from "domain/testUtils/parity/positions";
import { MID_PRICES_SCENARIO, TRADER_PNL_CAP_SCENARIO } from "domain/testUtils/parity/scenarios";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/configs/factors";
import { bigMath } from "sdk/utils/bigmath";
import type { ContractMarketPrices, MarketInfo } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { expandDecimals } from "sdk/utils/numbers";
import { getPositionInfo } from "sdk/utils/positions/utils";
import { getMarkPrice } from "sdk/utils/prices";
import type { TokenData } from "sdk/utils/tokens/types";
import { convertToContractTokenPrices, getIsEquivalentTokens, getIsTokenTrackingPrice } from "sdk/utils/tokens/utils";

type LiquidationCase = ParityPosition & { liquidationPrice: bigint };

type LiquidationInput = ParityInput<LiquidationCase>;

const BRACKET_BPS = 500n;
const BISECTION_STEPS = 20;

// Beyond this the price is unlikely to get there and bps of a far-away price say little
const MAX_DISTANCE_BPS = 5_000n;

// Fees from the stored market fee state, the state Reader.isPositionLiquidatable charges
async function liquidationCases(market: MarketInfo, ctx: ParityContext): Promise<LiquidationCase[]> {
  const minCollateralUsd = await loadMinCollateralUsd(ctx);
  const positions = await loadPositions(market, ctx);

  const cases = await Promise.all(
    positions.map(async (p) => {
      const fees = await loadStoredStateFees(ctx, market, p);
      const { liquidationPrice, markPrice } = getPositionInfo({
        position: { ...p.position, ...fees },
        marketInfo: market,
        minCollateralUsd,
        userReferralInfo: p.referralInfo,
        uiFeeFactor: 0n,
      });

      if (liquidationPrice === undefined) {
        return [];
      }

      const distanceBps = ((liquidationPrice - markPrice) * BASIS_POINTS_DIVISOR_BIGINT) / markPrice;

      return bigMath.abs(distanceBps) > MAX_DISTANCE_BPS
        ? []
        : [
            {
              ...p,
              label: `${p.label} liq ${distanceBps} bps away`,
              liquidationPrice,
            },
          ];
    })
  );

  return cases.flat();
}

const isIndexCollateral = ({ market, testCase: { position } }: LiquidationInput) => {
  const collateral = getCollateralToken(market, position);

  return getIsEquivalentTokens(collateral, market.indexToken);
};

// Only the index price moves; collateral that is or tracks the index token moves with it
function getContractPricesAtIndexPrice(
  ctx: ParityContext,
  market: MarketInfo,
  isLong: boolean,
  indexPrice: bigint
): ContractMarketPrices {
  const { indexToken, longToken, shortToken } = market;
  const prices = getContractMarketPrices(ctx.tokensData, market)!;
  const markPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: false, isLong });
  const moved = (token: TokenData) => {
    const movedPrices = {
      minPrice: bigMath.mulDiv(token.prices.minPrice, indexPrice, markPrice),
      maxPrice: bigMath.mulDiv(token.prices.maxPrice, indexPrice, markPrice),
    };

    return convertToContractTokenPrices(movedPrices, token.decimals);
  };
  const movesWithIndex = (token: TokenData) =>
    getIsEquivalentTokens(token, indexToken) || getIsTokenTrackingPrice(token, indexToken);

  return {
    indexTokenPrice: moved(indexToken),
    longTokenPrice: movesWithIndex(longToken) ? moved(longToken) : prices.longTokenPrice,
    shortTokenPrice: movesWithIndex(shortToken) ? moved(shortToken) : prices.shortTokenPrice,
  };
}

async function isLiquidatable(ctx: ParityContext, market: MarketInfo, testCase: LiquidationCase, indexPrice: bigint) {
  const prices = getContractPricesAtIndexPrice(ctx, market, testCase.position.isLong, indexPrice);
  const [liquidatable] = await readReader<readonly [boolean, string, unknown]>(ctx, "isPositionLiquidatable", [
    dataStoreAddress,
    referralStorageAddress,
    testCase.key,
    getMarketProps(market),
    prices,
    true, // shouldValidateMinCollateralUsd, as the liquidation order does
    true, // forLiquidation
  ]);

  return liquidatable;
}

// The index price where the Reader flips to liquidatable, bisected within +/-5% of the app price; none outside that bracket
async function findReaderLiquidationPrice({ ctx, market, testCase }: LiquidationInput) {
  const { liquidationPrice, position } = testCase;
  const towardsSafety = position.isLong ? BRACKET_BPS : -BRACKET_BPS;
  let safe = (liquidationPrice * (BASIS_POINTS_DIVISOR_BIGINT + towardsSafety)) / BASIS_POINTS_DIVISOR_BIGINT;
  let unsafe = (liquidationPrice * (BASIS_POINTS_DIVISOR_BIGINT - towardsSafety)) / BASIS_POINTS_DIVISOR_BIGINT;

  const [isSafeLiquidatable, isUnsafeLiquidatable] = await Promise.all([
    isLiquidatable(ctx, market, testCase, safe),
    isLiquidatable(ctx, market, testCase, unsafe),
  ]);

  if (isSafeLiquidatable || !isUnsafeLiquidatable) {
    return undefined;
  }

  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (safe + unsafe) / 2n;

    if (await isLiquidatable(ctx, market, testCase, mid)) {
      unsafe = mid;
    } else {
      safe = mid;
    }
  }

  return (safe + unsafe) / 2n;
}

parity("getLiquidationPrice <-> Reader.isPositionLiquidatable flip price", {
  markets: (market) => !market.isSpotOnly,
  cases: liquidationCases,
  scenarios: [PRO_TIER_SCENARIO, TRADER_PNL_CAP_SCENARIO, MID_PRICES_SCENARIO],
  app: ({ testCase }) => ({ liquidationPrice: testCase.liquidationPrice }),
  contract: async (input) => ({ liquidationPrice: await findReaderLiquidationPrice(input) }),
  fields: {
    liquidationPrice: {
      // the Reader takes whole price units per token unit, and the bisection resolves 0.001 bps
      toleranceBps: ({ market, testCase }) => {
        const priceUnit = expandDecimals(1, market.indexToken.decimals);

        return toBps(priceUnit, testCase.liquidationPrice) + 0.001;
      },
      knownIssues: [
        {
          reason:
            "getLiquidationPrice values the liquidation impact (pending impact, and exit impact on token open interest) at the current index price, the contract at the liquidation price",
        },
        {
          reason:
            "getLiquidationPrice takes funding owed in index-equivalent collateral as fixed USD, its value moves with the index price",
        },
        {
          reason:
            "getLiquidationPrice values the index token collateral of a short at the same price as the position, the contract at the min price while the short closes at the max price",
        },
        {
          reason: "we keep the closing and borrowing fees in USD, the contract floors them to collateral token units",
        },
        {
          reason: "getLiquidationPrice does not apply the pro tier discount to the closing fee",
          scenario: PRO_TIER_SCENARIO,
        },
        { reason: "getLiquidationPrice does not apply the trader pnl cap", scenario: TRADER_PNL_CAP_SCENARIO },
      ],
    },
  },
  requiredCases: [
    {
      name: "a position with negative pending impact",
      when: ({ testCase }) => testCase.position.pendingImpactAmount < 0n,
    },
    {
      name: "a long with index token collateral",
      when: (input) => input.testCase.position.isLong && isIndexCollateral(input),
    },
    {
      name: "a short with index token collateral",
      when: (input) => !input.testCase.position.isLong && isIndexCollateral(input),
    },
    { name: "the pro tier scenario applies", when: isProDiscountLarger, scenario: PRO_TIER_SCENARIO },
  ],
});
