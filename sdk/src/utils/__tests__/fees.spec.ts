import { USD_DECIMALS } from "configs/factors";
import type { MarketInfo } from "types/markets";
import { getFundingFactorPerPeriod } from "../fees";
import { numberToBigint } from "utils/numbers";

const dollar = 10n ** BigInt(USD_DECIMALS);
const eightMillion = 8_000_000n;
const tenMillion = 10_000_000n;

function toFactor(percent: `${number}%`) {
  const value = parseFloat(percent.replace("%", ""));
  return numberToBigint(value, 30 - 2);
}

const second = 1;

describe("getFundingFactorPerPeriod", () => {
  it("works when short pay, shorts OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: false,
      longInterestUsd: eightMillion * dollar,
      shortInterestUsd: tenMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("62.5%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("-50%").toString());
  });

  it("works when short pay, longs OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: false,
      longInterestUsd: tenMillion * dollar,
      shortInterestUsd: eightMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("50%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("-62.5%").toString());
  });

  it("works when long pay, shorts OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: true,
      longInterestUsd: eightMillion * dollar,
      shortInterestUsd: tenMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("-62.5%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("50%").toString());
  });

  it("works when long pay, longs OI bigger", () => {
    const marketInfo = {
      fundingFactorPerSecond: toFactor("50%"),
      longsPayShorts: true,
      longInterestUsd: tenMillion * dollar,
      shortInterestUsd: eightMillion * dollar,
    } as MarketInfo;

    const forLongs = getFundingFactorPerPeriod(marketInfo, true, second);
    expect(forLongs.toString()).toBe(toFactor("-50%").toString());

    const forShorts = getFundingFactorPerPeriod(marketInfo, false, second);
    expect(forShorts.toString()).toBe(toFactor("62.5%").toString());
  });
});
