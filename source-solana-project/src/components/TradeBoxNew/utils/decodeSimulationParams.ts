import { BN } from "@coral-xyz/anchor";

function readBool(buf: Buffer, offset: number): boolean {
    return buf.readUInt8(offset) !== 0;
}

function readU128(buf: Buffer, offset: number): BN {
    return new BN(buf.slice(offset, offset + 16), 16, "le");
}

function readI128(buf: Buffer, offset: number): BN {
    return new BN(buf.slice(offset, offset + 16), 16, "le").fromTwos(128);
}

function readOption<T>(
    buf: Buffer,
    offset: number,
    readFn: (buf: Buffer, offset: number) => T
): { value: T | null; size: number } {
    const tag = buf.readUInt8(offset);
    if (tag === 0) return { value: null, size: 1 };
    const value = readFn(buf, offset + 1);
    return { value, size: 1 + 16 * (typeof value === "object" && "min" in value ? 2 : 1) };
}

export function decodeIncreasePositionReport(buf: Buffer) {
    let o = 0;

    const collateral_increment_amount = readU128(buf, o); o += 16;
    const size_delta_usd = readU128(buf, o); o += 16;

    const acceptable_price_opt = readOption(buf, o, readU128);
    const acceptable_price = acceptable_price_opt.value;
    o += acceptable_price_opt.size;

    // Prices
    const index_min = readU128(buf, o); o += 16;
    const index_max = readU128(buf, o); o += 16;
    const long_min = readU128(buf, o); o += 16;
    const long_max = readU128(buf, o); o += 16;
    const short_min = readU128(buf, o); o += 16;
    const short_max = readU128(buf, o); o += 16;

    // Execution
    const price_impact_value = readI128(buf, o); o += 16;
    const price_impact_amount = readI128(buf, o); o += 16;
    const size_delta_in_tokens = readU128(buf, o); o += 16;
    const execution_price = readU128(buf, o); o += 16;

    const collateral_delta_amount = readI128(buf, o); o += 16;

    // Fees
    const paid_order_and_borrowing_fee_value = readU128(buf, o); o += 16;

    const order_fee_receiver = readU128(buf, o); o += 16;
    const order_fee_pool = readU128(buf, o); o += 16;
    const order_fee_value = readU128(buf, o); o += 16;

    const borrowing_fee_amount = readU128(buf, o); o += 16;
    const borrowing_fee_receiver = readU128(buf, o); o += 16;

    const funding_amount = readU128(buf, o); o += 16;
    const funding_long = readU128(buf, o); o += 16;
    const funding_short = readU128(buf, o); o += 16;

    const liquidation_opt = readOption(buf, o, (b, ofs) => {
        const fee_value = readU128(b, ofs);
        const fee_amount = readU128(b, ofs + 16);
        const fee_receiver = readU128(b, ofs + 32);
        return { fee_value, fee_amount, fee_receiver };
    });
    const liquidation = liquidation_opt.value;
    o += liquidation_opt.size;

    const claimable_funding_long_token_amount = readU128(buf, o); o += 16;
    const claimable_funding_short_token_amount = readU128(buf, o); o += 16;

    if (o !== buf.length) {
        throw new Error(`Decoded size mismatch: used ${o} but buffer is ${buf.length}`);
    }

    return {
        params: {
            collateral_increment_amount,
            size_delta_usd,
            acceptable_price,
            prices: {
                index_token_price: { min: index_min, max: index_max },
                long_token_price: { min: long_min, max: long_max },
                short_token_price: { min: short_min, max: short_max }
            }
        },
        execution: { price_impact_value, price_impact_amount, size_delta_in_tokens, execution_price },
        collateral_delta_amount,
        fees: {
            paid_order_and_borrowing_fee_value,
            order: {
                base: { fee_amount_for_receiver: order_fee_receiver, fee_amount_for_pool: order_fee_pool },
                fee_value: order_fee_value
            },
            borrowing: { fee_amount: borrowing_fee_amount, fee_amount_for_receiver: borrowing_fee_receiver },
            funding: { amount: funding_amount, claimable_long_token_amount: funding_long, claimable_short_token_amount: funding_short },
            liquidation
        },
        claimable_funding_long_token_amount,
        claimable_funding_short_token_amount
    };
}

export function decodeSwapReport(buf: Buffer) {
    let o = 0;
    // SwapParams
    const is_token_in_long = buf?.readUInt8(o) !== 0; o += 1;
    const token_in_amount = readU128(buf, o); o += 16;

    const index_min = readU128(buf, o); o += 16;
    const index_max = readU128(buf, o); o += 16;
    const long_min = readU128(buf, o); o += 16;
    const long_max = readU128(buf, o); o += 16;
    const short_min = readU128(buf, o); o += 16;
    const short_max = readU128(buf, o); o += 16;

    const params = {
        is_token_in_long,
        token_in_amount,
        prices: {
            index_token_price: { min: index_min, max: index_max },
            long_token_price: { min: long_min, max: long_max },
            short_token_price: { min: short_min, max: short_max }
        }
    };

    // SwapResult
    const fee_amount_for_receiver = readU128(buf, o); o += 16;
    const fee_amount_for_pool = readU128(buf, o); o += 16;
    const token_out_amount = readU128(buf, o); o += 16;
    const price_impact_value = readI128(buf, o); o += 16;
    const price_impact_amount = readU128(buf, o); o += 16;

    const result = {
        token_in_fees: {
            fee_amount_for_receiver,
            fee_amount_for_pool
        },
        token_out_amount,
        price_impact_value,
        price_impact_amount
    };

    if (o !== buf.length) {
        throw new Error(`Decoded size mismatch: used ${o} but buffer is ${buf.length}`);
    }

    return { params, result };
}

/** Fees<T> */
function readFees(buf: Buffer, offset: number) {
    const fee_amount_for_receiver = readU128(buf, offset); offset += 16;
    const fee_amount_for_pool = readU128(buf, offset); offset += 16;
    return { value: { fee_amount_for_receiver, fee_amount_for_pool }, size: 32 };
}

/** OrderFees<T> */
function readOrderFees(buf: Buffer, offset: number) {
    const base = readFees(buf, offset); offset += base.size;
    const fee_value = readU128(buf, offset); offset += 16;
    return { value: { base: base.value, fee_value }, size: base.size + 16 };
}

/** BorrowingFees<T> */
function readBorrowingFees(buf: Buffer, offset: number) {
    const fee_amount = readU128(buf, offset); offset += 16;
    const fee_amount_for_receiver = readU128(buf, offset); offset += 16;
    return { value: { fee_amount, fee_amount_for_receiver }, size: 32 };
}

/** FundingFees<T> */
function readFundingFees(buf: Buffer, offset: number) {
    const amount = readU128(buf, offset); offset += 16;
    const claimable_long_token_amount = readU128(buf, offset); offset += 16;
    const claimable_short_token_amount = readU128(buf, offset); offset += 16;
    return { value: { amount, claimable_long_token_amount, claimable_short_token_amount }, size: 48 };
}

/** LiquidationFees<T> */
function readLiquidationFees(buf: Buffer, offset: number) {
    const fee_value = readU128(buf, offset); offset += 16;
    const fee_amount = readU128(buf, offset); offset += 16;
    const fee_amount_for_receiver = readU128(buf, offset); offset += 16;
    return { value: { fee_value, fee_amount, fee_amount_for_receiver }, size: 48 };
}

/** PositionFees<T> */
function readPositionFees(buf: Buffer, offset: number) {
    const paid_order_and_borrowing_fee_value = readU128(buf, offset); offset += 16;
    const order = readOrderFees(buf, offset); offset += order.size;
    const borrowing = readBorrowingFees(buf, offset); offset += borrowing.size;
    const funding = readFundingFees(buf, offset); offset += funding.size;
    const liquidation = readOption(buf, offset, readLiquidationFees);
    offset += liquidation.size;
    return {
        value: {
            paid_order_and_borrowing_fee_value,
            order: order.value,
            borrowing: borrowing.value,
            funding: funding.value,
            liquidation: liquidation.value
        },
        size: 16 + order.size + borrowing.size + funding.size + liquidation.size
    };
}

/** Pnl<T> */
function readPnl(buf: Buffer, offset: number) {
    const pnl = readI128(buf, offset); offset += 16;
    const uncapped_pnl = readI128(buf, offset); offset += 16;
    return { value: { pnl, uncapped_pnl }, size: 32 };
}

/** InsolventCloseStep enum (u8) */
function readInsolventCloseStep(buf: Buffer, offset: number) {
    const tag = buf.readUInt8(offset);
    let value: string;
    switch (tag) {
        case 0: value = "Pnl"; break;
        case 1: value = "Fees"; break;
        case 2: value = "Funding"; break;
        case 3: value = "Impact"; break;
        case 4: value = "Diff"; break;
        default: throw new Error(`Unknown InsolventCloseStep tag: ${tag}`);
    }
    return { value, size: 1 };
}

/** OutputAmounts<T> */
function readOutputAmounts(buf: Buffer, offset: number) {
    const output_amount = readU128(buf, offset); offset += 16;
    const secondary_output_amount = readU128(buf, offset); offset += 16;
    return { value: { output_amount, secondary_output_amount }, size: 32 };
}

/** ClaimableCollateral<T> */
function readClaimableCollateral(buf: Buffer, offset: number) {
    const output_token_amount = readU128(buf, offset); offset += 16;
    const secondary_output_token_amount = readU128(buf, offset); offset += 16;
    return { value: { output_token_amount, secondary_output_token_amount }, size: 32 };
}

/** DecreasePositionReport */
export function decodeDecreasePositionReport(buf: Buffer) {
    let o = 0;

    const price_impact_value = readI128(buf, o); o += 16;
    const price_impact_diff = readU128(buf, o); o += 16;
    const execution_price = readU128(buf, o); o += 16;
    const size_delta_in_tokens = readU128(buf, o); o += 16;
    const withdrawable_collateral_amount = readU128(buf, o); o += 16;
    const initial_size_delta_usd = readU128(buf, o); o += 16;
    const size_delta_usd = readU128(buf, o); o += 16;

    const fees = readPositionFees(buf, o); o += fees.size;
    const pnl = readPnl(buf, o); o += pnl.size;

    const insolvent_close_step = readOption(buf, o, readInsolventCloseStep);
    o += insolvent_close_step.size;

    const should_remove = readBool(buf, o); o += 1;
    const is_output_token_long = readBool(buf, o); o += 1;
    const is_secondary_output_token_long = readBool(buf, o); o += 1;

    const output_amounts = readOutputAmounts(buf, o); o += output_amounts.size;
    const claimable_funding_long_token_amount = readU128(buf, o); o += 16;
    const claimable_funding_short_token_amount = readU128(buf, o); o += 16;

    const for_holding = readClaimableCollateral(buf, o); o += for_holding.size;
    const for_user = readClaimableCollateral(buf, o); o += for_user.size;

    if (o !== buf.length) {
        throw new Error(`Decoded size mismatch: used ${o} but buffer is ${buf.length}`);
    }

    return {
        price_impact_value,
        price_impact_diff,
        execution_price,
        size_delta_in_tokens,
        withdrawable_collateral_amount,
        initial_size_delta_usd,
        size_delta_usd,
        fees: fees.value,
        pnl: pnl.value,
        insolvent_close_step: insolvent_close_step.value,
        should_remove,
        is_output_token_long,
        is_secondary_output_token_long,
        output_amounts: output_amounts.value,
        claimable_funding_long_token_amount,
        claimable_funding_short_token_amount,
        for_holding: for_holding.value,
        for_user: for_user.value,
    };
}