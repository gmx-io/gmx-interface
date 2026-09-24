import { useCallback, useEffect, useState } from "react";
import crypto from 'crypto'
import { useAppStore } from '@/zustand/useAppStore'
import { Market, Position } from '@gmsol-labs/gmsol-sdk';
import { PublicKey } from '@solana/web3.js'
import { useStoreProgram } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import {
    decodeIncreasePositionReport,
    decodeDecreasePositionReport,
    decodeSwapReport
} from '../utils/decodeSimulationParams'
import { useShallow } from "zustand/react/shallow";
import { applySlippageToMinOut } from "@/utils/tradebox/applySlippageToMinOut";
import { getGmw385Enabled } from '@/config/featureFlagEnable';

export const useSimulateOrderData = () => {
    const {
        payTokenNum,
        graphObj,
        tradeMoney,
        marketDirection,
        limitPrice,
        slippage,
    } = useAppStore(useShallow((state) => state.TradeboxNew));
    const {
        marketInfo,
        marketBase64Map,
    } = useAppStore(useShallow((state) => state.markets));

    const {
        collateralToken,
    } = useAppStore(useShallow((state) => state.collateralTokens));

    const {
        selectSwapReceiveToken,
        selectSwapPayToken,
    } = useAppStore(useShallow((state) => state.swap));

    const {
        slPrice,
    } = useAppStore(useShallow((state) => state.tpSlTokens));

    const {
        payerSwapTokenInfo,
    } = useAppStore(useShallow((state) => state.payerSwapTokens));

    const storeProgram = useStoreProgram();
    const SOL_RELTOKEN = payerSwapTokenInfo?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : payerSwapTokenInfo?.tokenAddress || ''

    return {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        payerSwapTokenInfo,
        marketBase64Map,
        limitPrice,
        storeProgram,
        SOL_RELTOKEN,
        selectSwapReceiveToken,
        slPrice,
        selectSwapPayToken,
        slippage,
    };
};

// simulate order by market increase
export const useSimulateOrderByMarketIncrease = (positionObj) => {
    const {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
    } = useSimulateOrderData();

    return useCallback(async () => {
        try {
            if (!graphObj) {
                return null;
            }
            const swapPathObj = await getBestSwapPath(graphObj, SOL_RELTOKEN, collateralToken)
            const { path } = swapPathObj
            // console.log('MarketIncreaseSimulate', {
            //     kind: "MarketIncrease",
            //     params: {
            //         market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            //         is_long: marketDirection === 'Long',
            //         size: BigInt(tradeMoney.toString()),
            //         amount: BigInt(payTokenNum.toString()),
            //     },
            //     swap_path: path,
            //     collateral_or_swap_out_token: collateralToken,
            //     pay_token: SOL_RELTOKEN,
            // })
            // console.log('positionObj', positionObj)
            const simulationOutput = graphObj.simulate_order({
                kind: "MarketIncrease",
                params: {
                    market_token: new PublicKey(marketInfo.marketToken).toBase58(),
                    is_long: marketDirection === 'Long',
                    size: BigInt(tradeMoney.toString()),
                    amount: BigInt(payTokenNum.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateralToken,
                pay_token: SOL_RELTOKEN,
            }, positionObj);
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, SOL_RELTOKEN]);
};

// simulate order by market decrease
// export const useSimulateOrderByMarketDecrease = async (value: BN, baseCost: BN, params) => {
//     try {
//         let path = []
//         const { graphObj } = params
//         if (!graphObj) {
//             return null;
//         }
//         graphObj.update_value(BigInt(value.toString()))
//         graphObj.update_base_cost(BigInt(baseCost.toString()))
//         if (params.collateralToken != params.receiveToken) {
//             const pathRet = await getBestSwapPath(graphObj, params.collateralToken, params.receiveToken)
//             // console.log('pathRet', pathRet)
//             path = pathRet.path
//         }
//         const simulateParams = {
//             kind: "MarketDecrease",
//             params: {
//                 market_token: params.marketToken,
//                 is_long: params.isLong,
//                 size: BigInt(params.sizeNum.toString()),
//                 amount: BigInt(params.amount.toString()),
//             },
//             swap_path: path,
//             collateral_or_swap_out_token: params.collateralToken,
//             receive_token: params.receiveToken,
//         }
//         // console.log('simulateParams', simulateParams)
//         const simulationOutput = graphObj.simulate_order(simulateParams, Position.decode_from_base64(params.positionBase64));
//         const ret = await analyzeDecreaseSimulationOutput(simulationOutput, {
//             marketInfo: params.marketInfo,
//             marketBase64Map: params.marketBase64Map,
//             storeProgram: params.storeProgram,
//         })
//         ret.path = path
//         return ret
//     } catch (error) {
//         console.log('error', error)
//     }
// }

// simulate order by limit increase
export const useSimulateOrderByLimitIncrease = () => {
    const {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
        limitPrice,
        slippage,
    } = useSimulateOrderData();
    return useCallback(async () => {
        try {
            const { path } = await getBestSwapPath(graphObj, SOL_RELTOKEN, collateralToken)
            if (!graphObj) {
                return null;
            }
            const acceptable_price = marketDirection === 'Long'
                ? new BN(slippage).add(new BN(10000)).mul(new BN(limitPrice)).div(new BN(10000))
                : new BN(10000).sub(new BN(slippage)).mul(new BN(limitPrice)).div(new BN(10000));
            // console.log('LimitIncrease', {
            //     kind: "LimitIncrease",
            //     params: {
            //         market_token: new PublicKey(marketInfo.marketToken).toBase58(),
            //         is_long: marketDirection === 'Long',
            //         size: BigInt(tradeMoney.toString()),
            //         amount: BigInt(payTokenNum.toString()),
            //         trigger_price: BigInt(limitPrice.toString()),
            //     },
            //     swap_path: path,
            //     collateral_or_swap_out_token: collateralToken,
            //     pay_token: SOL_RELTOKEN,
            // })
            const simulationOutput = graphObj.simulate_order({
                kind: "LimitIncrease",
                params: {
                    market_token: new PublicKey(marketInfo.marketToken).toBase58(),
                    is_long: marketDirection === 'Long',
                    size: BigInt(tradeMoney.toString()),
                    amount: BigInt(payTokenNum.toString()),
                    trigger_price: BigInt(limitPrice.toString()),
                    acceptable_price: BigInt(acceptable_price.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateralToken,
                pay_token: SOL_RELTOKEN,
            });
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, SOL_RELTOKEN, storeProgram, marketBase64Map, limitPrice, slippage])
}

// simulate order by limit decrease
export const useSimulateOrderByLimitDecrease = (position: Position) => {
    const {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        _collateralToken,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
        limitPrice,
    } = useSimulateOrderData();
    return useCallback(async () => {
        try {
            const { path } = await getBestSwapPath(graphObj, SOL_RELTOKEN, _collateralToken)
            if (!graphObj) {
                return null;
            }
            const simulationOutput = graphObj.simulate_order({
                kind: "LimitDecrease",
                params: {
                    market_token: new PublicKey(marketInfo.marketToken).toBase58(),
                    is_long: marketDirection === 'Long',
                    size: BigInt(tradeMoney.toString()),
                    amount: BigInt(payTokenNum.toString()),
                    trigger_price: BigInt(limitPrice.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateralToken,
                pay_token: SOL_RELTOKEN,
            }, position);
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, _collateralToken, SOL_RELTOKEN, storeProgram, marketBase64Map])
}

// simulate order by market swap
export const useSimulateOrderByMarketSwap = () => {
    const {
        marketInfo,
        graphObj,
        collateralToken,
        marketDirection,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
        selectSwapReceiveToken,
        selectSwapPayToken,
    } = useSimulateOrderData();
    return useCallback(async () => {
        try {
            const pay_token = selectSwapPayToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapPayToken?.tokenAddress || '';
            const collateral_token = selectSwapReceiveToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapReceiveToken?.tokenAddress || '';
            const { path } = await getBestSwapPath(graphObj, pay_token, selectSwapReceiveToken?.tokenAddress)
            if (!graphObj) {
                return null;
            }
            console.log('MarketSwap', {
                kind: "MarketSwap",
                params: {
                    market_token: path[0],
                    is_long: true,
                    size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
                    amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateral_token,
                pay_token: pay_token,
            })
            const simulationOutput = graphObj.simulate_order({
                kind: "MarketSwap",
                params: {
                    market_token: path[0],
                    is_long: true,
                    size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
                    amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateral_token,
                pay_token: pay_token,
            });
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                marketDirection,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, graphObj, collateralToken, marketDirection, SOL_RELTOKEN, storeProgram, marketBase64Map, selectSwapReceiveToken])
}

// simulate order by limit swap
export const useSimulateOrderByLimitSwap = () => {
    const {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
        limitPrice,
        selectSwapPayToken,
        selectSwapReceiveToken,
        slippage,
    } = useSimulateOrderData();
    return useCallback(async () => {
        try {
            const pay_token = selectSwapPayToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapPayToken?.tokenAddress || '';
            const collateral_token = selectSwapReceiveToken?.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : selectSwapReceiveToken?.tokenAddress || '';
            const { path } = await getBestSwapPath(graphObj, pay_token, selectSwapReceiveToken?.tokenAddress)
            if (!graphObj) {
                return null;
            }
            const receiveAmount = (selectSwapReceiveToken as any)?.receiveAmount;
            const minOutput = applySlippageToMinOut(
                slippage,
                receiveAmount
            );
            console.log('selectSwapPayToken', selectSwapPayToken)
            console.log('LimitSwap', {
                kind: "LimitSwap",
                params: {
                    market_token: path[0],
                    is_long: true,
                    size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
                    amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
                    min_output: BigInt(minOutput.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateral_token,
                pay_token: pay_token,
            })
            const simulationOutput = graphObj.simulate_order({
                kind: "LimitSwap",
                params: {
                    market_token: path[0],
                    is_long: true,
                    size: BigInt(selectSwapPayToken?.paySizeInUsd?.toString()),
                    amount: BigInt(selectSwapPayToken?.payAmount?.toString()),
                    min_output: BigInt(minOutput.toString()),
                },
                swap_path: path,
                collateral_or_swap_out_token: collateral_token,
                pay_token: pay_token,
            });
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                marketDirection,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, SOL_RELTOKEN, storeProgram, marketBase64Map, limitPrice])
}

// simulate order by stop loss decrease
export const useSimulateOrderByStopLossDecrease = (position: Position) => {
    const {
        marketInfo,
        payTokenNum,
        graphObj,
        collateralToken,
        tradeMoney,
        marketDirection,
        _collateralToken,
        SOL_RELTOKEN,
        storeProgram,
        marketBase64Map,
        limitPrice,
        slPrice,
    } = useSimulateOrderData();
    return useCallback(async () => {
        try {
            const { path } = await getBestSwapPath(graphObj, _collateralToken, SOL_RELTOKEN)
            if (!graphObj) {
                return null;
            }
            const simulationOutput = graphObj.simulate_order({
                kind: "StopLossDecrease",
                params: {
                    market_token: new PublicKey(marketInfo.marketToken).toBase58(),
                    is_long: marketDirection === 'Long',
                    size: BigInt(tradeMoney.toString()),
                    amount: BigInt(payTokenNum.toString()),
                    trigger_price: BigInt(slPrice.toString()),
                    decrease_position_swap_type: 'NoSwap'
                },
                swap_path: path,
                collateral_or_swap_out_token: collateralToken,
                receive_token: SOL_RELTOKEN,
            }, position);
            return await analyzeSimulationOutput(simulationOutput, {
                marketInfo,
                marketBase64Map,
                storeProgram,
                path,
            })
        } catch (error) {
            console.log('error', error)
        }
    }, [marketInfo, payTokenNum, graphObj, collateralToken, tradeMoney, marketDirection, _collateralToken, SOL_RELTOKEN, storeProgram, marketBase64Map, limitPrice])
}

export const analyzeSimulationOutput = (simulationOutput, params) => {
    const {
        marketBase64Map,
        marketInfo,
        storeProgram,
        marketDirection,
        path,
    } = params
    // console.log('simulationOutput', simulationOutput.increase())
    if (!simulationOutput) {
        return null;
    }
    if (marketDirection === 'Swap') {
        const swapStrList = simulationOutput.swap().report
        const swapReports = swapStrList?.map(i => {
            const swapBuf = Buffer.from(i, 'base64');
            const swapData = decodeSwapReport(swapBuf)
            return { swapData }
        })
        return { swapReports }
    }
    const encodedMarket = marketBase64Map.get(marketInfo.marketToken)
    const market = Market.decode_from_base64(encodedMarket).to_model(BigInt(marketInfo.supply))
    const positionBuf = Buffer.from(simulationOutput?.increase().position, 'base64')
    const reportBuf = Buffer.from(simulationOutput?.increase().report, 'base64')
    const swapData = simulationOutput?.increase()?.swaps.map(i => {
        const swapBuf = Buffer.from(i, 'base64')
        return decodeSwapReport(swapBuf)
    }) || []
    const reportData = decodeIncreasePositionReport(reportBuf)
    const positionDisc = accountDiscriminator("Position");
    const positionFullBuf = Buffer.concat([positionDisc, positionBuf]);
    const positionData = storeProgram.coder.accounts.decode("position", positionFullBuf)
    const positionStatus = Position.decode_from_base64_with_options(simulationOutput?.increase().position, true)
    const positionStatusModel = positionStatus.to_model(market).status({
        index_token:
            { min: BigInt(marketInfo.newPrices.indexToken.min), max: BigInt(marketInfo.newPrices.indexToken.max) },
        long_token:
            { min: BigInt(marketInfo.newPrices.longToken.min), max: BigInt(marketInfo.newPrices.longToken.max) },
        short_token:
            { min: BigInt(marketInfo.newPrices.shortToken.min), max: BigInt(marketInfo.newPrices.shortToken.max) },
    })
    return {
        reportData,
        positionData,
        swapData,
        positionStatus: positionStatusModel,
        path,
    }
}

export const analyzeDecreaseSimulationOutput = (simulationOutput, params) => {
    const {
        marketBase64Map,
        marketInfo,
        storeProgram,
    } = params
    if (!simulationOutput) {
        return null;
    }
    const encodedMarket = marketBase64Map.get(marketInfo.marketToken)
    const market = Market.decode_from_base64(encodedMarket).to_model(BigInt(marketInfo.supply))
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
    let ret = {
        reportData,
        positionData,
    }
    if (swapData) {
        ret.swapData = swapData
    }

    if (positionData?.state?.sizeInTokens > 0) {
        const positionStatus = getPositionStatus(position, marketInfo, marketBase64Map)
        ret.positionStatus = positionStatus
    }

    return ret
}

export const getPositionStatus = (position: Position, marketInfo, marketBase64Map) => {
    // console.log('position', position)
    // console.log('marketInfo', marketInfo)
    // console.log('marketBase64Map', marketBase64Map)
    const encodedMarket = marketBase64Map.get(marketInfo.marketToken)
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
    let swapPathObj = graph.best_swap_path(
        pay_token,
        collateral_or_swap_out_token,
        false
    );
    if (swapPathObj?.arbitrage_exists) {
        graph?.update_base_cost(BigInt(10000000000000000000))
        swapPathObj = graph.best_swap_path(
            pay_token,
            collateral_or_swap_out_token,
            false
        );
    }
    return swapPathObj;
}

// get account discriminator
export function accountDiscriminator(name) {
    const preimage = `account:${name}`;
    return crypto.createHash("sha256").update(preimage).digest().slice(0, 8);
}

// simulate order by limit increase sl&tp
export const useSimulateOrderBySLTP = (
    kind,
    order,
    positionInitData,
) => {
    const gmw385Enabled = getGmw385Enabled();
    const {
        marketInfo,
        isLong,
        sizeDeltaUsd,
        amount,
        collateralTokenAddress,
        triggerPrice
    } = order || {};

    const marketToken =
        order?.marketTokenAddress?.toBase58?.() ?? marketInfo?.marketToken;
    const sizeDeltaUsdValue = sizeDeltaUsd?.toString();
    const amountValue = amount?.toString();
    const triggerPriceValue = triggerPrice?.toString();
    const collateralToken = collateralTokenAddress?.toString();

    const position = gmw385Enabled
        ? positionInitData
            ? Position.decode_from_base64(positionInitData)
            : null
        : Position.decode_from_base64(positionInitData);

    const {
        graphObj,
        storeProgram,
        marketBase64Map,
    } = useSimulateOrderData();

    return useCallback(async () => {
        if (!gmw385Enabled) {
            try {
                if (!graphObj || !position) {
                    console.log('useSimulateOrderBySLTP: graphObj or position is null', { graphObj, position });
                    return null;
                }

                const simulationOutput = graphObj.simulate_order({
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
            return undefined;
        }

        try {
            if (
                !graphObj ||
                !position ||
                !marketToken ||
                !sizeDeltaUsdValue ||
                !amountValue ||
                !triggerPriceValue ||
                !collateralToken
            ) {
                console.log('useSimulateOrderBySLTP: graphObj or position is null', { graphObj, position });
                return null;
            }

            const simulationOutput = graphObj.simulate_order({
                kind,
                params: {
                    market_token: marketToken,
                    is_long: isLong,
                    size: BigInt(sizeDeltaUsdValue),
                    amount: BigInt(amountValue),
                    trigger_price: BigInt(triggerPriceValue),
                    decrease_position_swap_type: 'PnlTokenToCollateralToken'
                },
                swap_path: [],
                collateral_or_swap_out_token: collateralToken,
                receive_token: collateralToken,
            }, position);

            const report = simulationOutput?.decrease()?.report;
            if (!report) {
                return null;
            }

            return {
                reportData: decodeDecreasePositionReport(
                    Buffer.from(report, 'base64')
                ),
            };
        } catch (error) {
            console.error('useSimulateOrderBySLTP error', error)
        }
    }, [
        amountValue,
        collateralToken,
        collateralTokenAddress,
        gmw385Enabled,
        graphObj,
        isLong,
        kind,
        marketBase64Map,
        marketInfo,
        marketToken,
        positionInitData,
        sizeDeltaUsdValue,
        sizeDeltaUsd,
        storeProgram,
        triggerPrice,
        triggerPriceValue,
    ])
}
