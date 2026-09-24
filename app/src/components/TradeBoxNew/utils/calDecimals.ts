import { BN } from '@coral-xyz/anchor'

export function convertDecimals(
    sourceAmount: BN,
    sourceDecimals: number,
    targetDecimals: number
): BN {
    const exponent = targetDecimals - sourceDecimals;
    const multiplier = new BN(10).pow(new BN(Math.abs(exponent)));

    if (exponent >= 0) {
        return sourceAmount.mul(multiplier);
    } else {
        return sourceAmount.div(multiplier);
    }
}