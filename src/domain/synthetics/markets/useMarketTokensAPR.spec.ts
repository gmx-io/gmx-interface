import { startOfDay, sub } from "date-fns";
import { getIntervalsByTime } from "./useMarketTokensAPR";

const secondsIn29days = 60 * 60 * 24 * 29;
const secondsIn30days = 60 * 60 * 24 * 30;

describe("useMarketTokensAPR", () => {
  it("12:00", () => {
    const oct13time12pm = new Date("2023-10-13T12:00:00");

    const startInSeconds = Math.floor(startOfDay(oct13time12pm).valueOf() / 1000);
    expect(getIntervalsByTime(oct13time12pm)).toEqual([
      {
        period: "1h",
        timestampGroup_gte: startInSeconds,
      },
      {
        period: "1d",
        timestampGroup_lt: startInSeconds,
        timestampGroup_gte: startInSeconds - secondsIn29days,
      },
      {
        period: "1h",
        timestampGroup_lt: startInSeconds - secondsIn29days,
        timestampGroup_gte: Math.floor(sub(oct13time12pm, { days: 30 }).valueOf() / 1000),
      },
    ]);
  });

  it("00:00", () => {
    const oct13time12am = new Date("2023-10-13T00:00:00");
    const startInSeconds = startOfDay(oct13time12am).valueOf() / 1000;
    expect(getIntervalsByTime(oct13time12am)).toEqual([
      {
        period: "1d",
        timestampGroup_gte: startInSeconds - secondsIn30days,
      },
    ]);
  });

  it("17:00", () => {
    const oct13time5pm = new Date("2023-10-13T17:00:00");
    const startInSeconds = Math.floor(startOfDay(oct13time5pm).valueOf() / 1000);

    expect(getIntervalsByTime(oct13time5pm)).toEqual([
      {
        period: "1h",
        timestampGroup_gte: startInSeconds,
      },
      {
        period: "1d",
        timestampGroup_lt: startInSeconds,
        timestampGroup_gte: startInSeconds - secondsIn29days,
      },
      {
        period: "1h",
        timestampGroup_lt: startInSeconds - secondsIn29days,
        timestampGroup_gte: Math.floor(sub(oct13time5pm, { days: 30 }).valueOf() / 1000),
      },
    ]);
  });

  it("1 week", () => {
    const oct13time5pm = new Date("2023-10-13T17:00:00");
    const startInSeconds = Math.floor(startOfDay(oct13time5pm).valueOf() / 1000);
    const secondsIn6days = 60 * 60 * 24 * 6;

    expect(getIntervalsByTime(oct13time5pm, 7)).toEqual([
      {
        period: "1h",
        timestampGroup_gte: startInSeconds,
      },
      {
        period: "1d",
        timestampGroup_lt: startInSeconds,
        timestampGroup_gte: startInSeconds - secondsIn6days,
      },
      {
        period: "1h",
        timestampGroup_lt: startInSeconds - secondsIn6days,
        timestampGroup_gte: Math.floor(sub(oct13time5pm, { days: 7 }).valueOf() / 1000),
      },
    ]);
  });
});
