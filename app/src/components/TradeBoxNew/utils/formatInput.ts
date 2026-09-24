import { BN } from '@coral-xyz/anchor';
import { getGmw340Enabled } from '@/config/featureFlagEnable';

export const formatInput = (input: string, decimals: number = 6) => {
    const validFormat = /^(0|[1-9]\d*)(\.\d*)?$/;
    if (input === '.') {
        return new BN(0);
    }

    if (input !== '' && !validFormat.test(input)) {
        return new BN(0);
    }

    if (input === '' || input === '.') {
        return new BN(0);
    }
    const [integerPart = '0', fractionalPart = ''] = input.split('.');

    // if (fractionalPart.length > decimals) {
    //     return new BN(0);
    // }

    const normalizedFractionalPart = getGmw340Enabled()
        ? fractionalPart.slice(0, decimals)
        : fractionalPart;
    const fractionalPadded = normalizedFractionalPart.padEnd(decimals, '0');

    const amount = new BN(integerPart + fractionalPadded);

    return amount;
}

export function divideAndRound(valueStr) {
    const value = BigInt(valueStr);
    const divisor = 10n ** 20n;

    const quotient = value / divisor;
    const remainder = value % divisor;

    const result =
        remainder * 2n >= divisor ? quotient + 1n : quotient;

    return result.toString();
}

// four leave five up: two number div
export function formatRounding(BN1: BN, BN2: BN) {
    const numerator = BN1.mul(new BN(100));
    const quotient = numerator.div(BN2);
    const remainder = numerator.mod(BN2);

    // remainder * 2 >= payTokenInitNum
    const shouldRoundUp = remainder.mul(new BN(2)).gte(BN2);
    const rate = shouldRoundUp ? quotient.add(new BN(1)) : quotient;
    return rate
}
