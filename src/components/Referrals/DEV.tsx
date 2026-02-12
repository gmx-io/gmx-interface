import { USD_DECIMALS } from "config/factors";
import { numberToBigint } from "lib/numbers";

const SECONDS_PER_DAY = 86400;
// const BASE_TIMESTAMP = 1713542400; // 2024-04-19 00:00:00 UTC

function mathMap(value: number, min: number, max: number) {
  return (value - min) / (max - min);
}

const NOW = Date.now() / 1000;

export const STUB_HOUR_DATA: { timestamp: number; volume: bigint; profit: number; loss: number }[] = Array.from({
  length: 24,
})
  .fill(undefined)
  .map((_, index) => ({
    timestamp: NOW - index * 3600,
    volume: numberToBigint(mathMap(index + Math.random() * index, 0, 24) * 1e6, USD_DECIMALS),
    profit: index % 4 !== 0 ? mathMap(index + Math.random() * index, 0, 24) : 0,
    loss: index % 3 !== 0 ? mathMap(index + Math.random() * index, 0, 24) : 0,
  }));

export const STUB_DATA: { timestamp: number; volume: bigint; profit: number; loss: number }[] = Array.from({
  length: 130,
})
  .fill(undefined)
  .map((_, index, array) => ({
    timestamp: NOW - (array.length - index) * SECONDS_PER_DAY,
    volume: numberToBigint(mathMap(index + Math.random() * index, 0, 30) * 1e6, USD_DECIMALS),
    profit: index % 4 !== 0 ? mathMap(index + Math.random() * index, 0, 30) : 0,
    loss: index % 3 !== 0 ? mathMap(index + Math.random() * index, 0, 30) : 0,
  }));
