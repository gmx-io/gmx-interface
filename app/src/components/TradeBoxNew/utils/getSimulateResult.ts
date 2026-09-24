import { useCallback } from "react";
import { getGmw233Enabled, getGmw317Enabled, getGmw390Enabled, getGmw440Enabled } from '@/config/featureFlagEnable';
import crypto from 'crypto'
import { Market, Position } from '@gmsol-labs/gmsol-sdk';
import { PublicKey } from '@solana/web3.js'
import {
    decodeIncreasePositionReport,
    decodeDecreasePositionReport,
    decodeSwapReport
} from '../utils/decodeSimulationParams'
import { BN } from "@coral-xyz/anchor";
import { Trans, t } from '@lingui/macro';
import { useAppStore } from '@/zustand/useAppStore';
import { correctLiquidationPriceFromMarketInfo } from '@/utils/position/correctLiquidationPrice';
import { formatDisplayGmxSymbol } from './formatGmxSymbol';

// PUMP and WPUMP mint addresses
const PUMP_MINT = new PublicKey('pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn');
const WPUMP_MINT = new PublicKey('HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC');

const getTokenDisplaySymbol = (token) => formatDisplayGmxSymbol(token) || token || 'token';

function isPayBalanceSufficient({
    amount,
    payTokenBalance,
    syncSize,
    defaultMaxTradeMoney,
}: {
    amount?: BN | string | number | null;
    payTokenBalance?: BN | string | number | null;
    syncSize?: BN | null;
    defaultMaxTradeMoney?: BN | null;
}) {
    // GMW-440: compare pay token amount to balance to avoid USD round-trip false positives
    if (getGmw440Enabled() && payTokenBalance != null) {
        return !new BN(amount || 0).gt(new BN(payTokenBalance));
    }
    return !defaultMaxTradeMoney || !syncSize || syncSize.lte(defaultMaxTradeMoney);
}

// simulate order by market increase
export const getSimulateOrderByMarketIncrease = async (priorityFees, data) => {
    const {
        marketToken,
        graphObj,
        size,
        payToken,
        collateralToken,
        amount,
        marketBase64Map,
        storeProgram,
        marketInfo,
        positionInfo,
        acceptable_price,
        tokenPriceMap,
        _size,
        syncSize,
        defaultMaxTradeMoney,
        payTokenBalance,
        isLong
    } = data;
    try {
        if (!graphObj || new BN(amount).isZero()) {
            return null;
        }
        // 1. check user balance
        if (!isPayBalanceSufficient({ amount, payTokenBalance, syncSize, defaultMaxTradeMoney })) {
            return { msg: t`Insufficient ${getTokenDisplaySymbol(payToken)} balance` }
        }
        const lpBn = isLong
            ? new BN(marketInfo?.lpLong)
            : new BN(marketInfo?.lpShort);
        const marketName = formatDisplayGmxSymbol(marketInfo?.indexToken);
        // 2. check user balance and available liquity
        if (defaultMaxTradeMoney && defaultMaxTradeMoney.gt(lpBn) && syncSize && syncSize.gt(lpBn)) {
            if (getGmw390Enabled()) {
                return { msg: t`Exceeds available liquidity` }
            }
            if (isLong) {
                return { msg: t`Max ${marketName} long exceeded` }
            } else {
                return { msg: t`Max ${marketName} short exceeded` }
            }
        }
        graphObj.update_value(BigInt(_size?.toString() || '0'))
        graphObj.update_base_cost(BigInt(priorityFees?.toString() || '0'))
        const swapPathObj = await getBestSwapPath(graphObj, payToken, collateralToken)
        const { path, arbitrage_exists } = swapPathObj
        // 3. check swap path
        if (payToken !== collateralToken && path?.length === 0 && !arbitrage_exists) {
            return { msg: t`Swap path not found` }
        }
        const params = positionInfo ? {
            kind: "MarketIncrease",
            params: {
                market_token: new PublicKey(marketToken).toBase58(),
                is_long: isLong,
                size: BigInt(syncSize.toString()),
                amount: BigInt(amount.toString()),
                acceptable_price: acceptable_price ? BigInt(acceptable_price.toString()) : undefined,
            },
            swap_path: path,
            collateral_or_swap_out_token: collateralToken,
            pay_token: payToken,
        } : {
            kind: "MarketIncrease",
            params: {
                market_token: new PublicKey(marketToken).toBase58(),
                is_long: isLong,
                size: BigInt(syncSize?.toString()),
                amount: BigInt(amount.toString()),
            },
            swap_path: path,
            collateral_or_swap_out_token: collateralToken,
            pay_token: payToken,
        }
        // console.log('params', params)
        const Simulator = graphObj.to_simulator()
        const simulationOutput = Simulator.simulate_order(params, positionInfo);
        const dataObj = await analyzeSimulationOutput(simulationOutput, {
            marketInfo,
            marketBase64Map,
            storeProgram,
            path,
            tokenPriceMap,
        })
        return dataObj;
    } catch (error) {
        console.log('error', error)
        return error
    }
};

// simulate order by market decrease
export const getSimulateOrderByMarketDecrease = async (value: BN, baseCost: BN, params) => {
    try {
        let path = []
        const { graphObj } = params
        if (!graphObj) {
            return null;
        }
        graphObj.update_value(BigInt(value.toString()))
        graphObj.update_base_cost(BigInt(baseCost.toString()))
        if (value.gt(new BN(0)) && params.collateralToken != params.receiveToken) {
            const pathRet = await getBestSwapPath(graphObj, params.collateralToken, params.receiveToken)
            path = pathRet.path
        }
        const simulateParams = {
            kind: "MarketDecrease",
            params: {
                market_token: params.marketToken,
                is_long: params.isLong,
                size: BigInt(params.sizeNum.toString()),
                amount: BigInt(params.amount.toString()),
                decrease_position_swap_type: params.decreasePositionSwapKind,
            },
            swap_path: path || [],
            collateral_or_swap_out_token: params.collateralToken,
            receive_token: params.receiveToken,
        }
        // console.log('simulateParams', simulateParams, Position.decode_from_base64(params.positionBase64))
        const Simulator = graphObj.to_simulator()
        const simulationOutput = Simulator.simulate_order(simulateParams, Position.decode_from_base64(params.positionBase64));
        const ret = await analyzeDecreaseSimulationOutput(simulationOutput, {
            marketInfo: params.marketInfo,
            marketBase64Map: params.marketBase64Map,
            storeProgram: params.storeProgram,
            tokenPriceMap: params.tokenPriceMap,
        })
        ret.path = path
        return ret
    } catch (error) {
        console.log('error', error)
    }
}

// simulate order by limit increase
export const getSimulateOrderByLimitIncrease = async (params) => {
    const {
        marketToken,
        graphObj,
        payToken,
        collateralToken,
        amount,
        amountValue,
        baseCost,
        isLong,
        triggerPrice,
        marketBase64Map,
        storeProgram,
        marketInfo,
        positionInfo,
        acceptable_price,
        tokenPriceMap,
        sizeUsd,
        syncSize,
        defaultMaxTradeMoney,
        payTokenBalance,
    } = params;
    try {
        if (!graphObj) {
            return null;
        }
        // 1. check user balance
        if (!isPayBalanceSufficient({ amount, payTokenBalance, syncSize, defaultMaxTradeMoney })) {
            return { msg: t`Insufficient ${getTokenDisplaySymbol(payToken)} balance` }
        }
        const lpBn = isLong
            ? new BN(marketInfo?.lpLong)
            : new BN(marketInfo?.lpShort);
        const marketName = formatDisplayGmxSymbol(marketInfo?.indexToken);
        // 2. check user balance and available liquity
        if (defaultMaxTradeMoney && defaultMaxTradeMoney.gt(lpBn) && syncSize && syncSize.gt(lpBn)) {
            if (getGmw390Enabled()) {
                return { msg: t`Exceeds available liquidity` }
            }
            if (isLong) {
                return { msg: t`Max ${marketName} long exceeded` }
            } else {
                return { msg: t`Max ${marketName} short exceeded` }
            }
        }
        let path = []
        let arbitrage_exists = false;
        if (collateralToken != payToken && amountValue?.gt(new BN(0))) {
            graphObj.update_value(BigInt(amountValue?.toString()))
            graphObj.update_base_cost(BigInt(baseCost?.toString()))
            const pathRet = await getBestSwapPath(graphObj, payToken, collateralToken)
            path = pathRet.path
            arbitrage_exists = pathRet.arbitrage_exists
        }
        // 3. check swap path
        if (payToken !== collateralToken && path?.length === 0 && !arbitrage_exists) {
            return { msg: t`Swap path not found` }
        }
        const simulateParams = positionInfo ? {
            kind: "LimitIncrease",
            params: {
                market_token: marketToken,
                is_long: isLong,
                size: BigInt(syncSize?.toString() || '0'),
                amount: BigInt(amount?.toString() || '0'),
                trigger_price: triggerPrice ? BigInt(triggerPrice?.toString() || '0') : undefined,
                acceptable_price: acceptable_price ? BigInt(acceptable_price?.toString() || '0') : undefined,
            },
            swap_path: path,
            collateral_or_swap_out_token: collateralToken,
            pay_token: payToken,
            update_prices_for_limit_order: true,
        } : {
            kind: "LimitIncrease",
            params: {
                market_token: marketToken,
                is_long: isLong,
                size: BigInt(syncSize?.toString()),
                amount: BigInt(amount?.toString()),
                trigger_price: triggerPrice ? BigInt(triggerPrice?.toString()) : undefined,
                acceptable_price: acceptable_price ? BigInt(acceptable_price?.toString()) : undefined,
            },
            swap_path: path,
            collateral_or_swap_out_token: collateralToken,
            pay_token: payToken,
            update_prices_for_limit_order: true,
        }
        const Simulator = graphObj.to_simulator()
        const simulationOutput = Simulator.simulate_order(simulateParams, positionInfo);
        return await analyzeSimulationOutput(simulationOutput, {
            marketInfo,
            marketBase64Map,
            storeProgram,
            tokenPriceMap,
            path,
            // Evaluate status at trigger (limit fill price), matching update_prices_for_limit_order
            ...(getGmw317Enabled() ? { indexPriceOverride: triggerPrice } : {}),
        })
    } catch (error) {
        console.log('error', error)
        return error
    }
}

// simulate order by limit decrease
// export const getSimulateOrderByLimitDecrease = (position: Position) => {
//     const {
//         marketInfo,
//         payTokenNum,
//         graphObj,
//         collateralToken,
//         tradeMoney,
//         marketDirection,
//         _collateralToken,
//         SOL_RELTOKEN,
//         storeProgram,
//         marketBase64Map,
//         limitPrice,
//     } = useSimulateOrderData();
//     return useCallback(async () => {
//         try {
//             const { path } = await getBestSwapPath(graphObj, SOL_RELTOKEN, _collateralToken)
//             if (!graphObj) {
//                 return null;
//             }
//             const simulationOutput = graphObj.simulate_order({
//                 kind: "LimitDecrease",
//                 params: {
//                     market_token: new PublicKey(marketInfo.marketToken).toBase58(),
//                     is_long: marketDirection === 'Long',
//                     size: BigInt(tradeMoney.toString()),
//                     amount: BigInt(payTokenNum.toString()),
//                     trigger_price: BigInt(limitPrice.toString()),
//                 },
//                 swap_path: path,
//                 collateral_or_swap_out_token: collateralToken,
//                 pay_token: SOL_RELTOKEN,
//             }, position);
//             return await analyzeSimulationOutput(simulationOutput, {
//                 marketInfo,
//                 marketBase64Map,
//                 storeProgram,
//             })
//         } catch (error) {
//             console.log('error', error)
//         }
//     }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, _collateralToken, SOL_RELTOKEN, storeProgram, marketBase64Map])
// }

// simulate order by market swap
export const getSimulateOrderByMarketSwap = async (params) => {
    const {
        graphObj,
        marketBase64Map,
        storeProgram,
        marketInfo,
        selectSwapPayToken,
        selectSwapReceiveToken,
        baseCost,
    } = params;
    try {
        const pay_token = selectSwapPayToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapPayToken?.tokenAddress || '';
        const collateral_token = selectSwapReceiveToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapReceiveToken?.tokenAddress || '';

        if ((selectSwapPayToken?.tokenAddress === PUMP_MINT.toBase58() ||
            selectSwapPayToken?.tokenAddress === WPUMP_MINT.toBase58()) &&
            (selectSwapReceiveToken?.tokenAddress === PUMP_MINT.toBase58() ||
                selectSwapReceiveToken?.tokenAddress === WPUMP_MINT.toBase58())) {
            return null;
        }

        graphObj.update_value(BigInt(selectSwapPayToken?.paySizeInUsd?.toString()))
        graphObj.update_base_cost(BigInt(baseCost.toString()))
        const swapPathObj = await getBestSwapPath(graphObj, pay_token, collateral_token)
        if (pay_token !== collateral_token && !swapPathObj?.arbitrage_exists && swapPathObj?.path?.length === 0) {
            return { msg: t`Swap path not found` }
        }
        if (!graphObj) {
            return null;
        }
        const Simulator = graphObj.to_simulator()
        const simulationOutput = Simulator.simulate_order({
            kind: "MarketSwap",
            params: {
                market_token: swapPathObj?.path[swapPathObj?.path.length - 1],
                is_long: true,
                size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
                amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
            },
            swap_path: swapPathObj?.path,
            collateral_or_swap_out_token: collateral_token,
            pay_token: pay_token,
        });
        return await analyzeSimulationOutput(simulationOutput, {
            marketInfo,
            marketBase64Map,
            storeProgram,
            path: swapPathObj?.path,
            type: 'Swap',
        })
    } catch (error) {
        console.log('error', error)
    }
}

// simulate order by limit swap
export const getSimulateOrderByLimitSwap = async (value, baseCost, params) => {
    const {
        payToken,
        graphObj,
        collateralToken,
        outToken,
        marketInfo,
        minOutputAmount,
        storeProgram,
        marketBase64Map,
        payTokenNum,
        size,
    } = params;
    try {
        graphObj.update_value(size ? BigInt(size.toString()) : BigInt(value.toString()))
        graphObj.update_base_cost(BigInt(baseCost.toString()))
        const swapPathObj = await getBestSwapPath(graphObj, payToken, collateralToken.toBase58())
        if (payToken !== collateralToken && !swapPathObj?.arbitrage_exists && swapPathObj?.path?.length === 0) {
            return { msg: t`Swap path not found` }
        }
        if (!graphObj) {
            return null;
        }
        const orderParams = {
            kind: "LimitSwap",
            params: {
                market_token: swapPathObj?.path[0],
                is_long: true,
                size: size ? BigInt(size.toString()) : BigInt(minOutputAmount.toString()),
                amount: BigInt(payTokenNum.toString()),
                min_output: BigInt(minOutputAmount.toString()),
            },
            swap_path: swapPathObj?.path,
            collateral_or_swap_out_token: outToken,
            pay_token: payToken,
            update_prices_for_limit_order: true,
        }
        const Simulator = graphObj.to_simulator()
        const simulationOutput = Simulator.simulate_order(orderParams);
        const ret = await analyzeSimulationOutput(simulationOutput, {
            marketInfo,
            marketBase64Map,
            storeProgram,
            path: swapPathObj?.path,
            type: 'Swap',
        })
        ret.path = swapPathObj?.path
        return ret
    } catch (error) {
        console.log('error', error)
    }
}

// simulate order by stop loss decrease
// export const getSimulateOrderByStopLossDecrease = (position: Position) => {
//     const {
//         marketInfo,
//         payTokenNum,
//         graphObj,
//         collateralToken,
//         tradeMoney,
//         marketDirection,
//         _collateralToken,
//         SOL_RELTOKEN,
//         storeProgram,
//         marketBase64Map,
//         limitPrice,
//         slPrice,
//     } = useSimulateOrderData();
//     return useCallback(async () => {
//         try {
//             const { path } = await getBestSwapPath(graphObj, _collateralToken, SOL_RELTOKEN)
//             if (!graphObj) {
//                 return null;
//             }
//             const simulationOutput = graphObj.simulate_order({
//                 kind: "StopLossDecrease",
//                 params: {
//                     market_token: new PublicKey(marketInfo.marketToken).toBase58(),
//                     is_long: marketDirection === 'Long',
//                     size: BigInt(tradeMoney.toString()),
//                     amount: BigInt(payTokenNum.toString()),
//                     trigger_price: BigInt(slPrice.toString()),
//                     decrease_position_swap_type: 'NoSwap'
//                 },
//                 swap_path: path,
//                 collateral_or_swap_out_token: collateralToken,
//                 receive_token: SOL_RELTOKEN,
//             }, position);
//             return await analyzeSimulationOutput(simulationOutput, {
//                 marketInfo,
//                 marketBase64Map,
//                 storeProgram,
//             })
//         } catch (error) {
//             console.log('error', error)
//         }
//     }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, _collateralToken, SOL_RELTOKEN, storeProgram, marketBase64Map, limitPrice])
// }

export const analyzeSimulationOutput = (simulationOutput, params) => {
    const {
        marketInfo,
        storeProgram,
        type,
        path,
        tokenPriceMap,
        indexPriceOverride,
    } = params
    if (!simulationOutput) {
        return null;
    }
    if (type === 'Swap') {
        const swapStrList = simulationOutput.swap().report
        const swapReports = swapStrList?.map(i => {
            const swapBuf = Buffer.from(i, 'base64');
            return decodeSwapReport(swapBuf)
        })
        return { swapReports, path }
    }
    const positionModel = simulationOutput.position_model()
    const increaseResult = simulationOutput.increase()
    if (getGmw317Enabled() && (!increaseResult?.position || !increaseResult?.report)) {
        return null;
    }
    const positionBuf = Buffer.from(increaseResult?.position, 'base64')
    const reportBuf = Buffer.from(increaseResult.report, 'base64')
    const reportData = decodeIncreasePositionReport(reportBuf)
    const positionDisc = accountDiscriminator("Position");
    const positionFullBuf = Buffer.concat([positionDisc, positionBuf]);
    const positionData = storeProgram.coder.accounts.decode("position", positionFullBuf)
    const rawPositionStatus = getPositionStatusByModel(
        marketInfo,
        positionModel,
        tokenPriceMap,
        indexPriceOverride
    )
    const positionStatus = applyLiquidationPriceCorrection(rawPositionStatus, positionData, marketInfo)
    const swapData = increaseResult?.swaps.map(i => {
        const swapBuf = Buffer.from(i, 'base64')
        return decodeSwapReport(swapBuf)
    })
    return {
        reportData,
        positionData,
        positionStatus,
        swapData,
        path,
    }
}

export const analyzeDecreaseSimulationOutput = (simulationOutput, params) => {
    const {
        marketBase64Map,
        marketInfo,
        storeProgram,
        tokenPriceMap
    } = params
    if (!simulationOutput) {
        return null;
    }
    const positionBuf = Buffer.from(simulationOutput?.decrease().position, 'base64')
    const reportBuf = Buffer.from(simulationOutput?.decrease().report, 'base64')
    const swapData = simulationOutput?.decrease()?.swaps.map(i => {
        const swapBuf = Buffer.from(i, 'base64')
        return decodeSwapReport(swapBuf)
    })
    const reportData = decodeDecreasePositionReport(reportBuf)
    const positionDisc = accountDiscriminator("Position");
    const positionFullBuf = Buffer.concat([positionDisc, positionBuf]);
    const positionData = storeProgram.coder.accounts.decode("position", positionFullBuf)
    const position = Position.decode_from_base64_with_options(simulationOutput?.decrease().position, true)
    const ret = {
        reportData,
        positionData,
    }
    if (swapData) {
        ret.swapData = swapData
    }
    if (positionData?.state?.sizeInTokens > 0) {
        const rawPositionStatus = getPositionStatus(position, marketInfo, marketBase64Map, tokenPriceMap)
        ret.positionStatus = applyLiquidationPriceCorrection(rawPositionStatus, positionData, marketInfo)
    }

    return ret
}

function applyLiquidationPriceCorrection(statusData: any, positionData: any, marketInfo: any): any {
    if (!getGmw233Enabled()) return statusData;
    const marketsState = useAppStore.getState().markets.marketsState;
    return correctLiquidationPriceFromMarketInfo(statusData, positionData, marketInfo, marketsState);
}

export const getPositionStatusByModel = (marketInfo, positionModel, tokenPriceMap, indexPriceOverride) => {
    const indexTokenPrice = tokenPriceMap?.get(marketInfo.indexToken)
    const longTokenPrice = tokenPriceMap?.get(marketInfo.longToken)
    const shortTokenPrice = tokenPriceMap?.get(marketInfo.shortToken)
    // GMW-317: when caller passes indexPriceOverride (limit fill), evaluate status at that price.
    // If index token is also long/short pool token, override those slots too so one token
    // is not priced at both limit and mark in the same status() call.
    // Without override, keep legacy tokenPriceMap-only pricing for all other increase sims.
    if (getGmw317Enabled() && indexPriceOverride != null) {
        const override = indexPriceOverride.toString()
        const overridePrice = { min: BigInt(override), max: BigInt(override) }
        const prices = {
            index_token: overridePrice,
            long_token:
                marketInfo.longToken === marketInfo.indexToken
                    ? overridePrice
                    : {
                          min: BigInt(longTokenPrice?.minUnitPrice || '0'),
                          max: BigInt(longTokenPrice?.maxUnitPrice || '0'),
                      },
            short_token:
                marketInfo.shortToken === marketInfo.indexToken
                    ? overridePrice
                    : {
                          min: BigInt(shortTokenPrice?.minUnitPrice || '0'),
                          max: BigInt(shortTokenPrice?.maxUnitPrice || '0'),
                      },
        }
        return positionModel.status(prices)
    }
    const prices = {
        index_token:
            { min: BigInt(indexTokenPrice?.minUnitPrice || '0'), max: BigInt(indexTokenPrice?.maxUnitPrice || '0') },
        long_token:
            { min: BigInt(longTokenPrice?.minUnitPrice || '0'), max: BigInt(longTokenPrice?.maxUnitPrice || '0') },
        short_token:
            { min: BigInt(shortTokenPrice?.minUnitPrice || '0'), max: BigInt(shortTokenPrice?.maxUnitPrice || '0') },
    }
    return positionModel.status(prices)
}

export const getPositionStatus = (position: Position, marketInfo, marketBase64Map) => {
    // console.log('position', position)
    // console.log('marketInfo', marketInfo)
    // console.log('marketBase64Map', marketBase64Map)
    const encodedMarket = marketBase64Map.get(marketInfo.marketToken)
    if (!encodedMarket) {
        throw new Error(`Market account data is unavailable for market token: ${marketInfo.marketToken}`)
    }
    const market = Market.decode_from_base64(encodedMarket).to_model(BigInt(marketInfo.supply))
    // console.log('getPositionStatus position', position)
    // console.log('getPositionStatus market', market)
    const positionModel = position.to_model(market)
    const prices = {
        index_token:
            { min: BigInt(marketInfo.newPrices.indexToken.min), max: BigInt(marketInfo.newPrices.indexToken.max) },
        long_token:
            { min: BigInt(marketInfo.newPrices.longToken.min), max: BigInt(marketInfo.newPrices.longToken.max) },
        short_token:
            { min: BigInt(marketInfo.newPrices.shortToken.min), max: BigInt(marketInfo.newPrices.shortToken.max) },
    }
    const positionStatus = positionModel.status(prices)
    return positionStatus
}

export const getBestSwapPath = (graph, pay_token, collateral_or_swap_out_token) => {
    const swapPathObj = graph.best_swap_path(
        pay_token,
        collateral_or_swap_out_token,
        false
    );
    // if (swapPathObj?.arbitrage_exists) {
    //     graph?.update_base_cost(BigInt(1000000000000000000000))
    //     swapPathObj = graph.best_swap_path(
    //         pay_token,
    //         collateral_or_swap_out_token,
    //         false
    //     );
    // console.log('getBestSwapPath swapPathObj2', swapPathObj)
    // }
    return swapPathObj;
}

// simulate order by limit increase sl&tp
export const getSimulateOrderBySLTP = (kind, order, positionInitData) => {
    const {
        marketInfo,
        isLong,
        sizeDeltaUsd,
        amount,
        collateralTokenAddress,
        triggerPrice,
        graphObj,
        storeProgram,
        marketBase64Map,
    } = order || {};

    const position = Position.decode_from_base64(positionInitData);
    return useCallback(async () => {
        try {
            if (!graphObj || !position) {
                console.log('useSimulateOrderBySLTP: graphObj or position is null', { graphObj, position });
                return null;
            }
            const Simulator = graphObj.to_simulator()
            const simulationOutput = Simulator.simulate_order({
                kind,
                params: {
                    market_token: marketInfo.marketToken,
                    is_long: isLong,
                    size: BigInt(sizeDeltaUsd.toString()),
                    amount: BigInt(amount.toString()),
                    trigger_price: BigInt(triggerPrice.toString()),
                    decrease_position_swap_type: 'PnlTokenToCollateralToken'
                },
                swap_path: [],
                collateral_or_swap_out_token: collateralTokenAddress.toString(),
                receive_token: collateralTokenAddress.toString(),
            }, position);

            return await analyzeDecreaseSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
            });
        } catch (error) {
            // console.log('useSimulateOrderBySLTP error', error)
        }
    }, [marketInfo, graphObj, collateralTokenAddress, storeProgram, marketBase64Map])
}

// get account discriminator
export function accountDiscriminator(name) {
    const preimage = `account:${name}`;
    return crypto.createHash("sha256").update(preimage).digest().slice(0, 8);
}
