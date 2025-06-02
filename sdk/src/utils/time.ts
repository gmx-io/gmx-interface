const SECONDS_IN_PERIOD = {
  "1m": 60,
  "5m": 60 * 5,
  "15m": 60 * 15,
  "1h": 60 * 60,
  "4h": 60 * 60 * 4,
  "1d": 60 * 60 * 24,
  "1y": 60 * 60 * 24 * 365,
};

export function secondsFrom(period: keyof typeof SECONDS_IN_PERIOD) {
  return SECONDS_IN_PERIOD[period];
}

export function secondsToPeriod(seconds: number, period: keyof typeof SECONDS_IN_PERIOD, roundUp = false) {
  const secondsInPeriod = secondsFrom(period);

  const roundedSeconds = roundUp ? Math.ceil(seconds / secondsInPeriod) : Math.floor(seconds / secondsInPeriod);

  return roundedSeconds;
}

export function periodToSeconds(periodsCount: number, period: keyof typeof SECONDS_IN_PERIOD) {
  return periodsCount * secondsFrom(period);
}

export function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}
