const Q32 = 1n << 32n;
const Q96 = 1n << 96n;
const MAX_UINT256 = (1n << 256n) - 1n;

export const MAX_TICK = 887272;
export const MIN_TICK = -MAX_TICK;

const TICK_FACTOR_CONSTANTS: readonly bigint[] = [
  0xfffcb933bd6fad37aa2d162d1a594001n,
  0xfff97272373d413259a46990580e213an,
  0xfff2e50f5f656932ef12357cf3c7fdccn,
  0xffe5caca7e10e4e61c3624eaa0941cd0n,
  0xffcb9843d60f6159c9db58835c926644n,
  0xff973b41fa98c081472e6896dfb254c0n,
  0xff2ea16466c96a3843ec78b326b52861n,
  0xfe5dee046a99a2a811c461f1969c3053n,
  0xfcbe86c7900a88aedcffc83b479aa3a4n,
  0xf987a7253ac413176f2b074cf7815e54n,
  0xf3392b0822b70005940c7a398e4b70f3n,
  0xe7159475a2c29b7443b29c7fa6e889d9n,
  0xd097f3bdfd2022b8845ad8f792aa5825n,
  0xa9f746462d870fdf8a65dc1f90e061e5n,
  0x70d869a156d2a1b890bb3df62baf32f7n,
  0x31be135f97d08fd981231505542fcfa6n,
  0x9aa508b5b7a84e1c677de54f3e99bc9n,
  0x5d6af8dedb81196699c329225ee604n,
  0x2216e584f5fa1ea926041bedfe98n,
  0x48a170391f7dc42444e8fa2n,
];

export function getSqrtRatioAtTick(tick: number): bigint {
  if (!Number.isInteger(tick)) {
    throw new Error("Tick must be an integer");
  }

  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new RangeError("Tick out of range");
  }

  let absTick = tick < 0 ? -tick : tick;

  let ratio = (absTick & 0x1) !== 0 ? TICK_FACTOR_CONSTANTS[0] : 0x100000000000000000000000000000000n;

  for (let bit = 1; bit < TICK_FACTOR_CONSTANTS.length; bit++) {
    if ((absTick & (1 << bit)) !== 0) {
      ratio = (ratio * TICK_FACTOR_CONSTANTS[bit]) >> 128n;
    }
  }

  if (tick > 0) {
    ratio = MAX_UINT256 / ratio;
  }

  const result = ratio >> 32n;

  return ratio % Q32 === 0n ? result : result + 1n;
}

function sortRatios(a: bigint, b: bigint): [bigint, bigint] {
  return a > b ? [b, a] : [a, b];
}

function getAmount0Delta(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
  if (liquidity === 0n) {
    return 0n;
  }

  const [sqrtRatioA, sqrtRatioB] = sortRatios(sqrtRatioAX96, sqrtRatioBX96);
  const numerator = liquidity << 96n;
  const diff = sqrtRatioB - sqrtRatioA;
  const denominator = sqrtRatioB * sqrtRatioA;

  if (denominator === 0n) {
    return 0n;
  }

  return (numerator * diff) / denominator;
}

function getAmount1Delta(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity: bigint): bigint {
  if (liquidity === 0n) {
    return 0n;
  }

  const [sqrtRatioA, sqrtRatioB] = sortRatios(sqrtRatioAX96, sqrtRatioBX96);
  const diff = sqrtRatioB - sqrtRatioA;

  return (liquidity * diff) / Q96;
}

export function getAmountsForPosition({
  liquidity,
  sqrtPriceX96,
  tickLower,
  tickUpper,
}: {
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
}): { amount0: bigint; amount1: bigint } {
  if (liquidity === 0n) {
    return { amount0: 0n, amount1: 0n };
  }

  const sqrtRatioLower = getSqrtRatioAtTick(tickLower);
  const sqrtRatioUpper = getSqrtRatioAtTick(tickUpper);

  if (sqrtPriceX96 <= sqrtRatioLower) {
    return {
      amount0: getAmount0Delta(sqrtRatioLower, sqrtRatioUpper, liquidity),
      amount1: 0n,
    };
  }

  if (sqrtPriceX96 < sqrtRatioUpper) {
    return {
      amount0: getAmount0Delta(sqrtPriceX96, sqrtRatioUpper, liquidity),
      amount1: getAmount1Delta(sqrtRatioLower, sqrtPriceX96, liquidity),
    };
  }

  return {
    amount0: 0n,
    amount1: getAmount1Delta(sqrtRatioLower, sqrtRatioUpper, liquidity),
  };
}
