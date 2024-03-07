import { USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";

function abs(num: bigint) {
  if (num < 0n) {
    return -num;
  } else {
    return num;
  }
}

export const floorTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return 0;
  }

  const date = new Date(timestamp);
  const seconds = date.getSeconds();

  return date.setSeconds(seconds < 30 ? 0 : 30, 0);
};

export const signedValueClassName = (num: bigint) => (num === 0n ? "" : num < 0 ? "negative" : "positive");

export const formatDelta = (
  delta: bigint,
  {
    decimals = USD_DECIMALS,
    displayDecimals = 2,
    useCommas = true,
    ...p
  }: {
    decimals?: number;
    displayDecimals?: number;
    useCommas?: boolean;
    prefixoid?: string;
    signed?: boolean;
    prefix?: string;
    postfix?: string;
  } = {}
) =>
  `${p.prefixoid ? `${p.prefixoid} ` : ""}${p.signed ? (delta === 0n ? "" : delta > 0 ? "+" : "-") : ""}${
    p.prefix || ""
  }${formatAmount(p.signed ? abs(delta) : delta, decimals, displayDecimals, useCommas)}${p.postfix || ""}`;

export type Profiler = ((msg: string) => number) & {
  getTime(): number;
  report(): void;
};

export const createProfiler = (label: string): Profiler => {
  const start = new Date();
  const profile: [string, number, number, number][] = [];
  const registered = new Set<string>([]);
  let last = start;

  return Object.assign(
    (msg: string) => {
      if (registered.has(msg)) {
        return 0;
      }
      const now = new Date();
      const ts = now.getTime();
      const time = ts - last.getTime();
      profile.push([msg, time, ts - start.getTime(), ts]);
      last = now;
      registered.add(msg);
      return time;
    },
    {
      getTime() {
        return last.getTime() - start.getTime();
      },
      report() {
        // eslint-disable-next-line no-console
        console.groupCollapsed(`${label} profiling total time: ${this.getTime()}ms`);
        // eslint-disable-next-line no-console
        for (const [m, time, sinceStart] of profile) console.info(`  • ${sinceStart}ms/+${time}ms: ${m}`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      },
    }
  );
};
