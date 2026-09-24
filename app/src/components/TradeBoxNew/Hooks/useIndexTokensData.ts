import { useEffect, useMemo } from 'react';
import { BN } from '@coral-xyz/anchor';
import useSocketStore from '@/zustand/socketStore';
import { useAppStore } from '@/zustand/useAppStore';
import { getTradeLeverageSliderMarks } from '@/components/TradeBoxNew/utils/getLeverageMarks'
import {
    getBestSwapPath,
    getGraphObj,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams'
import { getMarketOpenInterestPercentage } from '@/utils/market/getMarketOpenInterestPercentage';
import { useShallow } from 'zustand/react/shallow';
import { formatInput } from '../utils/formatInput';
import { GMX_SOLANA_MARKET_TOKENS } from '@/config/program';
import { PublicKey } from '@solana/web3.js';

// sort indexTokens by lpLong
export function useIndexTokensData() {
    const { indexTokens } = useSocketStore();
    const {
        marketDirection,
        tradeMoney,
        setGraphObj,
        priorityFees,
        leverage,
    } = useAppStore(useShallow((state) => state.TradeboxNew));
    const {
        setMarkets,
        setMarketsMap,
        setMarketInfos,
    } = useAppStore(useShallow((state) => state.markets));
    const {
        indexToken,
        setIndexTokenData,
        setSortedIndexTokens,
    } = useAppStore(useShallow((state) => state.indexTokens));
    const {
        setCollateralTokens,
        setCollateralExchangeRates,
    } = useAppStore(useShallow((state) => state.collateralTokens));
    const {
        selectSwapPayToken,
    } = useAppStore(useShallow((state) => state.swap));
    const {
        payerSwapTokenInfo,
    } = useAppStore(useShallow((state) => state.payerSwapTokens));
    const { tokenPriceMap } = useAppStore(
        useShallow((state) => ({
            tickers: state.tickersState.tickers,
            tokenPriceMap: state.tickersState.tokenPriceMap,
        }))
    );
    const {
        marketBase64Map,
    } = useAppStore(useShallow((state) => state.markets));
    const isSwap = !(marketDirection === 'Long' || marketDirection === 'Short');
    const allMarketInfosArray = []
    const formatLeverageBN = useMemo(() => formatInput(leverage, 1), [leverage]);
    // sort indexTokens by lp
    useEffect(() => {
        (async () => {
            if (Array.isArray(indexTokens)) {
                let graph;
                // const filterIndexTokens = getValidMarket(indexTokens);
                const [uniqueTokens, collateralExchangeRates, tokens] = [new Set(), new Map(), []];
                const resTokens = [...indexTokens].sort((a, b) => {
                    const aLp = new BN(marketDirection === 'Long' ? a?.lpLong : a?.lpShort ?? '0');
                    const bLp = new BN(marketDirection === 'Long' ? b?.lpLong : b?.lpShort ?? '0');
                    if (aLp.eq(bLp)) return 0;
                    return aLp.gt(bLp) ? -1 : 1;
                });
                setSortedIndexTokens(resTokens);
                const tokenToUse = resTokens?.find((item) => item.indexToken === indexToken);
                setIndexTokenData(tokenToUse);
                const { marketInfos } = tokenToUse || {};
                marketInfos?.map(item => {
                    const openInterestForLong = new BN(item.openInterestForLong || 0);
                    const openInterestForShort = new BN(item.openInterestForShort || 0);
                    const totalOpenInterest = openInterestForLong.add(openInterestForShort);
                    let openInterestForLongRate = 0;
                    let openInterestForShortRate = 0;
                    if (!totalOpenInterest?.isZero()) {
                        openInterestForLongRate = getMarketOpenInterestPercentage(openInterestForLong, totalOpenInterest);
                        openInterestForShortRate = getMarketOpenInterestPercentage(openInterestForShort, totalOpenInterest);
                    }
                    item.openInterestForLongRate = openInterestForLongRate;
                    item.openInterestForShortRate = openInterestForShortRate;
                    const indexTokenPrice = tokenPriceMap.get(item.indexToken)
                    const longTokenPrice = tokenPriceMap.get(item.longToken)
                    const shortTokenPrice = tokenPriceMap.get(item.shortToken)
                    item.newPrices = {
                        indexToken: {
                            min: indexTokenPrice?.minUnitPrice ?? 0,
                            max: indexTokenPrice?.maxUnitPrice ?? 0,
                        },
                        longToken: {
                            min: longTokenPrice?.minUnitPrice ?? 0,
                            max: longTokenPrice?.maxUnitPrice ?? 0,
                        },
                        shortToken: {
                            min: shortTokenPrice?.minUnitPrice ?? 0,
                            max: shortTokenPrice?.maxUnitPrice ?? 0,
                        },
                    }
                    if (item.longToken !== item.shortToken) {
                        uniqueTokens.add(item.longToken);
                        uniqueTokens.add(item.shortToken);
                    } else {
                        uniqueTokens.add(item.longToken);
                    }

                    const _tokens = item.longToken !== item.shortToken ? [item.longToken, item.shortToken] : [item.longToken];
                    tokens.push(_tokens);
                    return {
                        ...item,
                    };
                })
                const collateralAllTokens = Array.from(new Set(tokens.flat()));
                setCollateralTokens([...collateralAllTokens]);
                setCollateralExchangeRates(collateralExchangeRates);
                setMarketInfos(marketInfos || []);
                resTokens.forEach(token => {
                    if (token.marketInfos && Array.isArray(token.marketInfos)) {
                        allMarketInfosArray.push(...token.marketInfos);
                    }
                });
                allMarketInfosArray.map(item => {
                    const indexTokenPrice = tokenPriceMap.get(item.indexToken)
                    const longTokenPrice = tokenPriceMap.get(item.longToken)
                    const shortTokenPrice = tokenPriceMap.get(item.shortToken)
                    item.newPrices = {
                        indexToken: {
                            min: indexTokenPrice?.minUnitPrice ?? 0,
                            max: indexTokenPrice?.maxUnitPrice ?? 0,
                        },
                        longToken: {
                            min: longTokenPrice?.minUnitPrice ?? 0,
                            max: longTokenPrice?.maxUnitPrice ?? 0,
                        },
                        shortToken: {
                            min: shortTokenPrice?.minUnitPrice ?? 0,
                            max: shortTokenPrice?.maxUnitPrice ?? 0,
                        },
                    };
                    return item;
                });
                const MarketsMap = new Map()
                allMarketInfosArray.map((item) => {
                    MarketsMap.set(item.marketToken, item)
                })
                setMarketsMap(MarketsMap)
                setMarkets(allMarketInfosArray as []);
                if (!isSwap && priorityFees) {
                    graph = await getGraphObj(allMarketInfosArray, tradeMoney.mul(new BN(10))?.div(formatLeverageBN.eq(new BN(0)) ? new BN(100) : formatLeverageBN), marketBase64Map, priorityFees);
                    setGraphObj(graph);
                } else if (isSwap && priorityFees) {
                    graph = await getGraphObj(allMarketInfosArray, selectSwapPayToken?.paySizeInUsd, marketBase64Map, priorityFees);
                    setGraphObj(graph);
                }
                for (const token of collateralAllTokens) {
                    try {
                        const swapPathObj = await getBestSwapPath(graph, payerSwapTokenInfo.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : payerSwapTokenInfo.tokenAddress, token);
                        const exchangeRate = swapPathObj?.exchange_rate
                            ? new BN(swapPathObj.exchange_rate.toString())
                            : new BN(0);
                        collateralExchangeRates.set(token, exchangeRate);
                    } catch (error) {
                        collateralExchangeRates.set(token, new BN(0));
                    }
                }

            }
        })()
    }, [indexTokens, indexToken, tradeMoney, tokenPriceMap]);
}

function getValidMarket(indexTokens: any[]): any[] {
    const gmxMarketTokenSet = new Set(GMX_SOLANA_MARKET_TOKENS.map(pk => pk.toBase58()));
    const validIndexTokens: any[] = [];
    indexTokens.forEach(item => {
        const markets = item.marketInfos.filter(marketInfo => gmxMarketTokenSet.has(marketInfo.marketToken))
        if (markets.length > 0) {
            item.marketInfos = markets
            validIndexTokens.push(item)
        }
    })
    return validIndexTokens
}

