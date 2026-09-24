import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
    create_orders,
    CreateOrderKind,
    CreateOrderParams,
    CreateOrderOptions,
    update_orders,
    UpdateOrderArgs,
} from '@gmsol-labs/gmsol-sdk'
import { waitForTransactionConfirmation } from '@/components/TradeBoxNew/utils/getExchangeStatus';
import { useAppStore } from '@/zustand/useAppStore';
import { applySlippageToMinOut } from '@/utils/tradebox/applySlippageToMinOut';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';

function getDecreaseAcceptablePrice(price, slippage, isLong: boolean) {
    if (!price || slippage === undefined || slippage === null) {
        return undefined;
    }
    const priceBN = new BN(price.toString());
    if (priceBN.lte(new BN(0))) {
        return undefined;
    }
    return applySlippageToPrice(slippage, priceBN, false, isLong);
}

function getSendRawTransactionOpts() {
    const skipPreflight = useAppStore.getState().settings.skipPreflight;
    return {
        skipPreflight,
        preflightCommitment: 'confirmed' as const,
        maxRetries: 3,
    };
}

// exec order
export const useExecOrder = async (
    orderParams: Array<{ kind: CreateOrderKind; orders: CreateOrderParams[]; options: CreateOrderOptions }>,
    { signAllTransactions, storeProgram }
) => {
    const sendRawTransactionOpts = getSendRawTransactionOpts();
    let tsx = [];
    const connection = storeProgram.provider.connection;
    orderParams.forEach(item => {
        const { kind, orders, options } = item;
        console.log('item', item);
        try {
            const transactions = create_orders(kind, orders, options);
            console.log('transactions', transactions);
            tsx.push(...transactions.serialize().flat());
        } catch (error) {
            console.log('create_orders error', error);
        }
    })
    console.log('tsx', tsx)
    try {
        const versionedTxns = tsx.map(item => {
            try {
                if (item instanceof Uint8Array) {
                    return VersionedTransaction.deserialize(item);
                }
                if (Buffer.isBuffer(item)) {
                    return VersionedTransaction.deserialize(new Uint8Array(item));
                }
                return VersionedTransaction.deserialize(item);
            } catch (versionedError) {
                try {
                    return Transaction.from(item);
                } catch (legacyError) {
                    throw new Error(`Transaction deserialization failed: ${versionedError.message}`);
                }
            }
        });
        const signedTx = await signAllTransactions(versionedTxns);
        const results = [];
        if (versionedTxns.length > 1) {
            try {
                const firstTransaction = signedTx[0];
                let serializedTx;
                if (firstTransaction instanceof VersionedTransaction) {
                    serializedTx = firstTransaction.serialize();
                } else if (firstTransaction instanceof Transaction) {
                    serializedTx = firstTransaction.serialize();
                } else {
                    throw new Error('Unknown transaction type');
                }

                const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                results.push(sig);
                const status = await waitForTransactionConfirmation(connection, sig);
                if (status.status === 'processed') {
                    for (let index = 1; index < signedTx.length; index++) {
                        try {
                            const signedTransaction = signedTx[index];
                            let serializedTx;
                            if (signedTransaction instanceof VersionedTransaction) {
                                serializedTx = signedTransaction.serialize();
                            } else if (signedTransaction instanceof Transaction) {
                                serializedTx = signedTransaction.serialize();
                            } else {
                                throw new Error('Unknown transaction type');
                            }

                            const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                            results.push(sig);
                            waitForTransactionConfirmation(connection, sig);
                        } catch (sendError) {
                            console.error(`Failed to send transaction ${index + 1}:`, sendError);
                            throw sendError;
                        }
                    }
                }
            } catch (sendError) {
                console.error(`Failed to send first transaction:`, sendError);
                throw sendError;
            }
        } else {
            for (let index = 0; index < signedTx.length; index++) {
                try {
                    const signedTransaction = signedTx[index];
                    let serializedTx;
                    if (signedTransaction instanceof VersionedTransaction) {
                        serializedTx = signedTransaction.serialize();
                    } else if (signedTransaction instanceof Transaction) {
                        serializedTx = signedTransaction.serialize();
                    } else {
                        throw new Error('Unknown transaction type');
                    }

                    const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                    results.push(sig);
                    waitForTransactionConfirmation(connection, sig);
                } catch (sendError) {
                    console.error(`Failed to send transaction ${index + 1}:`, sendError);
                    throw sendError;
                }
            }
        }
        console.log("result", results)
        return results;
    } catch (error) {
        console.error('Transaction processing error:', error);
        throw error;
    }
};

// exec update order
export const useExecUpdateOrder = async (
    args: UpdateOrderArgs,
    { signAllTransactions, storeProgram }
) => {
    const sendRawTransactionOpts = getSendRawTransactionOpts();
    let tsx = [];
    const connection = storeProgram.provider.connection;
    const transactions = update_orders(args)
    tsx.push(...transactions.serialize().flat());
    console.log('tsx', tsx);
    try {
        const versionedTxns = tsx.map(item => {
            try {
                if (item instanceof Uint8Array) {
                    return VersionedTransaction.deserialize(item);
                }
                if (Buffer.isBuffer(item)) {
                    return VersionedTransaction.deserialize(new Uint8Array(item));
                }
                return VersionedTransaction.deserialize(item);
            } catch (versionedError) {
                try {
                    return Transaction.from(item);
                } catch (legacyError) {
                    console.error('Failed to deserialize transaction:', versionedError, legacyError);
                    throw new Error(`Transaction deserialization failed: ${versionedError.message}`);
                }
            }
        });

        const signedTx = await signAllTransactions(versionedTxns);

        return await Promise.all(signedTx.map(async (signedTransaction, index) => {
            try {
                let serializedTx;
                if (signedTransaction instanceof VersionedTransaction) {
                    serializedTx = signedTransaction.serialize();
                } else if (signedTransaction instanceof Transaction) {
                    serializedTx = signedTransaction.serialize();
                } else {
                    throw new Error('Unknown transaction type');
                }
                const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                waitForTransactionConfirmation(connection, sig);
                return sig;
            } catch (sendError) {
                console.error(`Failed to send transaction ${index + 1}:`, sendError);
                throw sendError;
            }
        }));

    } catch (error) {
        console.error('Transaction processing error:', error);
        throw error;
    }
};

// useCreateOrderParamsByMarketIncrease
export const useCreateOrderParamsByMarketIncrease = async (params) => {
    const {
        marketInfo,
        skip_wrap_native_on_pay,
        marketDirection,
        tradeMoney,
        payTokenNum,
        payer,
        blockhash,
        PrioritizationFees,
        pay_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        acceptable_price,
        transaction_group,
    } = params;

    const order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: marketDirection === 'Long' ? true : false,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
        },
    ];

    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
        // transaction_group,
    };
    console.log('MarketIncrease', {
        kind: "MarketIncrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "MarketIncrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useCreateOrderParamsByMarketDecrease
export const useCreateOrderParamsByMarketDecrease = async (params) => {
    const {
        marketToken,
        isLong,
        amount,
        size,
        blockhash,
        PrioritizationFees,
        payer,
        hints,
        path,
        skip_wrap_native_on_pay,
        skip_unwrap_native_on_receive,
        collateral_or_swap_out_token,
        receiveToken,
        signAllTransactions,
        storeProgram,
        acceptable_price,
    } = params;
    const order_params: CreateOrderParams[] = [
        {
            market_token: marketToken,
            is_long: isLong,
            size: BigInt(size.toString()),
            amount: BigInt(amount.toString()),
            acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
            decrease_position_swap_type: "PnlTokenToCollateralToken",
        },
    ];
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token: receiveToken,
        swap_path: path,
        skip_wrap_native_on_pay,
        skip_unwrap_native_on_receive,
    };
    console.log('MarketDecrease', {
        kind: "MarketDecrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "MarketDecrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useCreateOrderParamsByLimitIncrease
export const useCreateOrderParamsByLimitIncrease = async (params) => {
    const {
        marketInfo,
        skip_wrap_native_on_pay,
        marketDirection,
        tradeMoney,
        payTokenNum,
        payer,
        pay_token,
        blockhash,
        PrioritizationFees,
        limitPrice,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        acceptable_price,
        // transaction_group,
    } = params;
    if (!tradeMoney || new BN(tradeMoney).lte(new BN(0))) {
        throw new Error('Size must be greater than zero');
    }
    if (!payTokenNum || new BN(payTokenNum).lte(new BN(0))) {
        throw new Error('Amount must be greater than zero');
    }
    if (!limitPrice || new BN(limitPrice).lte(new BN(0))) {
        throw new Error('Limit price must be greater than zero');
    }
    const order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: marketDirection === 'Long' ? true : false,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: limitPrice ? BigInt(limitPrice.toString()) : undefined,
            acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
        }
    ];
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        pay_token,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        swap_path: path,
        skip_wrap_native_on_pay,
        // transaction_group,
    };
    console.log('params', {
        kind: "LimitIncrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "LimitIncrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    return execOrder;
};

// useCreateOrderParamsByLimitDecrease
export const useCreateOrderParamsByLimitDecrease = async (params) => {
    const {
        marketToken,
        isLong,
        size,
        amount,
        blockhash,
        PrioritizationFees,
        payer,
        hints,
        path,
        skip_wrap_native_on_pay,
        collateral_or_swap_out_token,
        receive_token,
        signAllTransactions,
        storeProgram,
        tpPrice,
        acceptPrice,
    } = params;
    const order_params: CreateOrderParams[] = [
        {
            market_token: marketToken,
            is_long: isLong,
            size: BigInt(size.toString()),
            amount: BigInt(amount.toString()),
            trigger_price: BigInt(tpPrice.toString()),
            acceptable_price: BigInt(acceptPrice.toString()),
            // decrease_position_swap_type: "PnlTokenToCollateralToken",
        },
    ];
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };
    console.log('LimitDecrease', {
        kind: "LimitDecrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "LimitDecrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useCreateOrderParamsByMarketSwap
export const useCreateOrderParamsByMarketSwap = async (params) => {
    const {
        skip_wrap_native_on_pay,
        skip_unwrap_native_on_receive,
        marketDirection,
        payer,
        blockhash,
        PrioritizationFees,
        pay_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        selectSwapPayToken,
    } = params;
    const marketTokens = Array.from(hints.keys());
    const order_params: CreateOrderParams[] = [
        {
            market_token: marketTokens[marketTokens?.length - 1] as string,
            is_long: marketDirection === 'Long' ? true : false,
            size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
            amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
        },
    ];
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
        skip_unwrap_native_on_receive,
    };
    console.log('params', {
        kind: "MarketSwap",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "MarketSwap",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useCreateOrderParamsByLimitSwap
export const useCreateOrderParamsByLimitSwap = async (params) => {
    const {
        marketInfo,
        skip_wrap_native_on_pay,
        marketDirection,
        payer,
        blockhash,
        PrioritizationFees,
        pay_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        selectSwapPayToken,
        selectSwapReceiveToken,
        slippage,
    } = params;
    const minOutput = applySlippageToMinOut(
        slippage,
        selectSwapReceiveToken?.receiveAmount
    );
    const marketTokens = Array.from(hints.keys());
    const order_params: CreateOrderParams[] = [
        {
            market_token: marketTokens[marketTokens?.length - 1] as string,
            is_long: marketDirection === 'Long' ? true : false,
            size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
            amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
            min_output: BigInt(minOutput.toString()),
        },
    ];
    console.log('order_params', order_params);
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };
    console.log('LimitSwap', {
        kind: "LimitSwap",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "LimitSwap",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useCreateOrderParamsByStopLossDecrease
export const useCreateOrderParamsByStopLossDecrease = async (params) => {
    const {
        marketToken,
        isLong,
        size,
        amount,
        blockhash,
        PrioritizationFees,
        payer,
        hints,
        path,
        skip_wrap_native_on_pay,
        collateral_or_swap_out_token,
        receive_token,
        signAllTransactions,
        storeProgram,
        slPrice,
        acceptPrice,
    } = params;
    const order_params: CreateOrderParams[] = [
        {
            market_token: marketToken,
            is_long: isLong,
            size: BigInt(size.toString()),
            amount: BigInt(amount.toString()),
            trigger_price: BigInt(slPrice.toString()),
            acceptable_price: BigInt(acceptPrice.toString()),
            // decrease_position_swap_type: "PnlTokenToCollateralToken",
        },
    ];
    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };
    console.log('StopLossDecrease', {
        kind: "StopLossDecrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "StopLossDecrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// tpsl market order
export const useCreateOrderParamsByMarketTpsl = async (params) => {
    const {
        marketInfo,
        skip_wrap_native_on_pay,
        marketDirection,
        tradeMoney,
        payTokenNum,
        payer,
        blockhash,
        PrioritizationFees,
        pay_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        tpPrice,
        slPrice,
        acceptable_price,
        slippage,
    } = params;
    const isLong = marketDirection === 'Long';
    const tpAcceptablePrice = getDecreaseAcceptablePrice(tpPrice, slippage, isLong);
    const slAcceptablePrice = getDecreaseAcceptablePrice(slPrice, slippage, isLong);
    const order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
        },
    ];

    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
        // force_create_positions_in_parallel: true,
    };

    const tp_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: tpPrice ? BigInt(tpPrice?.toString()) : undefined,
            acceptable_price: tpAcceptablePrice ? BigInt(tpAcceptablePrice.toString()) : undefined,
        },
    ];
    const tp_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        swap_path: path,
        skip_wrap_native_on_pay,
        receive_token: pay_token,
        // force_create_positions_in_parallel: true,
    };
    const sl_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: slPrice ? BigInt(slPrice?.toString()) : undefined,
            acceptable_price: slAcceptablePrice ? BigInt(slAcceptablePrice.toString()) : undefined,
        },
    ];
    const sl_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token: pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
        // force_create_positions_in_parallel: true,
    };
    const paramsList = [
        {
            kind: "MarketIncrease",
            orders: order_params,
            options: common_params,
        },
        tpPrice ? {
            kind: "LimitDecrease",
            orders: tp_order_params,
            options: tp_common_params,
        } : null,
        slPrice ? {
            kind: "StopLossDecrease",
            orders: sl_order_params,
            options: sl_common_params,
        } : null,
    ].filter(Boolean);
    console.log('tpslParams', paramsList)
    const execOrder = await useExecOrder(paramsList as Array<{ kind: CreateOrderKind; orders: CreateOrderParams[]; options: CreateOrderOptions }>, {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;

}

// tpsl limit order
export const useCreateOrderParamsByLimitTpsl = async (params) => {
    const {
        marketInfo,
        skip_wrap_native_on_pay,
        marketDirection,
        tradeMoney,
        payTokenNum,
        payer,
        blockhash,
        PrioritizationFees,
        pay_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
        tpPrice,
        slPrice,
        limitPrice,
        acceptable_price,
        slippage,
    } = params;
    const isLong = marketDirection === 'Long';
    const tpAcceptablePrice = getDecreaseAcceptablePrice(tpPrice, slippage, isLong);
    const slAcceptablePrice = getDecreaseAcceptablePrice(slPrice, slippage, isLong);
    const order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: BigInt(limitPrice.toString()),
            acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
        },
    ];

    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };

    const tp_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: tpPrice ? BigInt(tpPrice.toString()) : undefined,
            acceptable_price: tpAcceptablePrice ? BigInt(tpAcceptablePrice.toString()) : undefined,
        },
    ];
    const tp_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        swap_path: path,
        skip_wrap_native_on_pay,
        receive_token: pay_token,
        // force_create_positions_in_parallel: true,
    };
    const sl_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(tradeMoney.toString()),
            amount: BigInt(payTokenNum.toString()),
            trigger_price: BigInt(slPrice.toString()),
            acceptable_price: slAcceptablePrice ? BigInt(slAcceptablePrice.toString()) : undefined,
        },
    ];
    const sl_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token: pay_token,
        swap_path: path,
        skip_wrap_native_on_pay,
        // force_create_positions_in_parallel: true,
    };
    const paramsList = [
        {
            kind: "LimitIncrease",
            orders: order_params,
            options: common_params,
        },
        {
            kind: "LimitDecrease",
            orders: tp_order_params,
            options: tp_common_params,
        },
        {
            kind: "StopLossDecrease",
            orders: sl_order_params,
            options: sl_common_params,
        },
    ]
    console.log('tpslParams', paramsList)
    const execOrder = await useExecOrder(paramsList as Array<{ kind: CreateOrderKind; orders: CreateOrderParams[]; options: CreateOrderOptions }>, {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
}

// tpsl decrease
export const useCreateOrderParamsByTpSlDecrease = async (params) => {
    const {
        marketToken,
        isLong,
        size,
        amount,
        tp_tiggerPrice,
        sl_tiggerPrice,
        blockhash,
        PrioritizationFees,
        payer,
        collateralToken,
        hints,
        path,
        skip_wrap_native_on_pay,
        receive_token,
        signAllTransactions,
        storeProgram,
    } = params;
    const tp_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(size.toString()),
            amount: BigInt(amount.toString()),
            trigger_price: BigInt(tp_tiggerPrice.toString()),
        },
    ];
    const tp_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token: collateralToken,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        swap_path: path,
        skip_wrap_native_on_pay,
        receive_token: receive_token,
    };
    const sl_order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(size.toString()),
            amount: BigInt(amount.toString()),
            trigger_price: BigInt(sl_tiggerPrice.toString()),
            decrease_position_swap_type: "PnlTokenToCollateralToken",
        },
    ];
    const sl_common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token: collateralToken,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        receive_token: receive_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };
    const paramsList = [
        tp_tiggerPrice.toString() !== '0' ? {
            kind: "LimitDecrease",
            orders: tp_order_params,
            options: tp_common_params,
        } : null,
        sl_tiggerPrice.toString() !== '0' ? {
            kind: "StopLossDecrease",
            orders: sl_order_params,
            options: sl_common_params,
        } : null,
    ].filter(Boolean);
    console.log('tpslParams', paramsList)
    const execOrder = await useExecOrder(paramsList as Array<{ kind: CreateOrderKind; orders: CreateOrderParams[]; options: CreateOrderOptions }>, {
        signAllTransactions,
        storeProgram,
    });
    return execOrder;
}

// useCreateOrderParamsByDepositMarketIncrease
export const useCreateOrderParamsByDepositMarketIncrease = async (params) => {
    const {
        marketToken,
        skip_wrap_native_on_pay,
        isLong,
        amount,
        payer,
        blockhash,
        PrioritizationFees,
        receive_token,
        collateral_or_swap_out_token,
        hints,
        path,
        signAllTransactions,
        storeProgram,
    } = params;

    const order_params: CreateOrderParams[] = [
        {
            market_token: new PublicKey(marketToken).toBase58(),
            is_long: isLong,
            size: BigInt(0),
            amount: BigInt(amount.toString()),
        },
    ];

    const common_params = {
        recent_blockhash: blockhash,
        payer,
        collateral_or_swap_out_token,
        compute_unit_price_micro_lamports: PrioritizationFees,
        hints,
        pay_token: receive_token,
        swap_path: path,
        skip_wrap_native_on_pay,
    };
    console.log('MarketIncrease', {
        kind: "MarketIncrease",
        orders: order_params,
        options: common_params,
    })
    const execOrder = await useExecOrder([{
        kind: "MarketIncrease",
        orders: order_params,
        options: common_params,
    }], {
        signAllTransactions,
        storeProgram,
    });
    console.log('execOrder', execOrder);
    return execOrder;
};

// useUpdateOrderByLongShortLimitIncrease
export const useUpdateOrderByLongShortLimitIncrease = async (params) => {
    const {
        blockhash,
        payer,
        market_token,
        PrioritizationFees,
        size_delta_value,
        trigger_price,
        acceptable_price,
        order_addr,
        signAllTransactions,
        storeProgram,
    } = params;

    const orders = new Map([
        [
            order_addr,
            {
                params: {
                    size_delta_value: BigInt(size_delta_value.toString()),
                    acceptable_price: BigInt(acceptable_price.toString()),
                    trigger_price: BigInt(trigger_price.toString()),
                },
                hint: {
                    market_token: market_token
                },
            },
        ],
    ]);
    const update_order_params: UpdateOrderArgs = {
        recent_blockhash: blockhash,
        compute_unit_price_micro_lamports: PrioritizationFees,
        payer,
        orders: orders,
    };

    console.log('update_order_params', update_order_params);
    return await useExecUpdateOrder(update_order_params, {
        signAllTransactions,
        storeProgram,
    });

}

// useUpdateOrderByLimitSwap
export const useUpdateOrderByLimitSwap = async (params) => {
    const {
        blockhash,
        payer,
        market_token,
        PrioritizationFees,
        min_output,
        order_addr,
        signAllTransactions,
        storeProgram,
    } = params;

    const orders = new Map([
        [
            order_addr,
            {
                params: {
                    min_output: BigInt(min_output.toString()),
                },
                hint: {
                    market_token: market_token
                },
            },
        ],
    ]);
    const update_order_params: UpdateOrderArgs = {
        recent_blockhash: blockhash,
        compute_unit_price_micro_lamports: PrioritizationFees,
        payer,
        orders: orders,
    };

    console.log('update_limit_swap_order_params', update_order_params);
    return await useExecUpdateOrder(update_order_params, {
        signAllTransactions,
        storeProgram,
    });

}

// useUpdateOrderByTpDecrease
export const useUpdateOrderByTpDecrease = async (params) => {
    const {
        blockhash,
        payer,
        market_token,
        PrioritizationFees,
        size_delta_value,
        trigger_price,
        acceptable_price,
        order_addr,
        signAllTransactions,
        storeProgram,
    } = params;

    const orders = new Map([
        [
            order_addr,
            {
                params: {
                    size_delta_value: BigInt(size_delta_value.toString()),
                    acceptable_price: BigInt(acceptable_price.toString()),
                    trigger_price: BigInt(trigger_price.toString()),
                },
                hint: {
                    market_token: market_token
                },
            },
        ],
    ]);
    const update_order_params: UpdateOrderArgs = {
        recent_blockhash: blockhash,
        compute_unit_price_micro_lamports: PrioritizationFees,
        payer,
        orders: orders,
        // program: storeProgram,
    };

    console.log('update_order_params', update_order_params);
    return await useExecUpdateOrder(update_order_params, {
        signAllTransactions,
        storeProgram,
    });

}

// useUpdateOrderByTpDecrease
export const useUpdateOrderBySlDecrease = async (params) => {
    const {
        blockhash,
        payer,
        market_token,
        PrioritizationFees,
        size_delta_value,
        trigger_price,
        acceptable_price,
        order_addr,
        signAllTransactions,
        storeProgram,
    } = params;

    const orders = new Map([
        [
            order_addr,
            {
                params: {
                    size_delta_value: BigInt(size_delta_value.toString()),
                    acceptable_price: BigInt(acceptable_price.toString()),
                    trigger_price: BigInt(trigger_price.toString()),
                },
                hint: {
                    market_token: market_token
                },
            },
        ],
    ]);
    const update_order_params: UpdateOrderArgs = {
        recent_blockhash: blockhash,
        compute_unit_price_micro_lamports: PrioritizationFees,
        payer,
        orders: orders,
        // program: storeProgram,
    };

    console.log('update_order_params', update_order_params);
    return await useExecUpdateOrder(update_order_params, {
        signAllTransactions,
        storeProgram,
    });

}
