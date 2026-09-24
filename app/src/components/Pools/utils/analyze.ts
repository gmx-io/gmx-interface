import { BN } from "@coral-xyz/anchor";

function readU128(buf: Buffer, offset: number): BN {
    return new BN(buf.slice(offset, offset + 16), 16, "le");
}

function readI128(buf: Buffer, offset: number): BN {
    return new BN(buf.slice(offset, offset + 16), 16, "le").fromTwos(128);
}
export function decodeDepositReport(buf: Buffer) {
    let o = 0;

    // params
    const long_token_amount = readU128(buf, o); o += 16;
    const short_token_amount = readU128(buf, o); o += 16;

    const index_min = readU128(buf, o); o += 16;
    const index_max = readU128(buf, o); o += 16;
    const long_min = readU128(buf, o); o += 16;
    const long_max = readU128(buf, o); o += 16;
    const short_min = readU128(buf, o); o += 16;
    const short_max = readU128(buf, o); o += 16;

    // minted
    const minted = readU128(buf, o); o += 16;

    // price_impact
    const price_impact = readI128(buf, o); o += 16;

    // fees[0]
    const fee0_amount_receiver = readU128(buf, o); o += 16;
    const fee0_amount_pool = readU128(buf, o); o += 16;

    // fees[1]
    const fee1_amount_receiver = readU128(buf, o); o += 16;
    const fee1_amount_pool = readU128(buf, o); o += 16;

    if (o !== buf.length) {
        throw new Error(`Decoded size mismatch: used ${o} but buffer is ${buf.length}`);
    }

    return {
        params: {
            long_token_amount,
            short_token_amount,
            prices: {
                index_token_price: { min: index_min, max: index_max },
                long_token_price:  { min: long_min, max: long_max },
                short_token_price: { min: short_min, max: short_max },
            }
        },
        minted,
        price_impact,
        fees: [
            {
                fee_amount_for_receiver: fee0_amount_receiver,
                fee_amount_for_pool: fee0_amount_pool,
            },
            {
                fee_amount_for_receiver: fee1_amount_receiver,
                fee_amount_for_pool: fee1_amount_pool,
            }
        ]
    };
}

export function decodeWithdrawReport(buf: Buffer) {
    let o = 0;

    // params
    const market_token_amount = readU128(buf, o); o += 16;

    const index_min  = readU128(buf, o); o += 16;
    const index_max  = readU128(buf, o); o += 16;
    const long_min   = readU128(buf, o); o += 16;
    const long_max   = readU128(buf, o); o += 16;
    const short_min  = readU128(buf, o); o += 16;
    const short_max  = readU128(buf, o); o += 16;

    // long token fees
    const long_fee_amount_receiver = readU128(buf, o); o += 16;
    const long_fee_amount_pool     = readU128(buf, o); o += 16;

    // short token fees
    const short_fee_amount_receiver = readU128(buf, o); o += 16;
    const short_fee_amount_pool     = readU128(buf, o); o += 16;

    const long_token_output  = readU128(buf, o); o += 16;
    const short_token_output = readU128(buf, o); o += 16;

    if (o !== buf.length) {
        throw new Error(`Decoded size mismatch: used ${o} but buffer is ${buf.length}`);
    }

    return {
        params: {
            market_token_amount,
            prices: {
                index_token_price: { min: index_min, max: index_max },
                long_token_price:  { min: long_min,  max: long_max },
                short_token_price: { min: short_min, max: short_max },
            },
        },

        long_token_fees: {
            fee_amount_for_receiver: long_fee_amount_receiver,
            fee_amount_for_pool: long_fee_amount_pool,
        },

        short_token_fees: {
            fee_amount_for_receiver: short_fee_amount_receiver,
            fee_amount_for_pool: short_fee_amount_pool,
        },

        long_token_output,
        short_token_output,
    };
}