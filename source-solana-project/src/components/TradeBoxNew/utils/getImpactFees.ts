import { findPositionPDA } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { translateAddress } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js'
import { Position } from '@gmsol-labs/gmsol-sdk';
import { USD_DECIMALS } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import {
    getSimulateOrderByMarketIncrease,
    getSimulateOrderByLimitIncrease,
} from '@/components/TradeBoxNew/utils/getSimulateResult';
import { formatRatePercentage } from '@/utils/legacy';
import { formatInput } from './formatInput';

export const getImpactFees = async (params: {
    priorityFees: BN;
    marketDirection: string;
    tradeMoney: BN;
    graphObj: any;
    marketType: string;
    payTokenNum: BN;
    slippage: number;
    marketInfo: {
        marketToken: string;
        openInterestForLong: string;
        openInterestForShort: string;
    };
    marketBase64Map: Map<string, string>;
    collateralToken: string;
    payerInfo: {
        address: string;
    };
    payerSwapTokenInfo: {
        tokenAddress: string;
    };
    positionMap: Map<any, any>;
    tokenPriceMap: Map<string, { unitPrice: string }>;
    indexToken: string;
    storeProgram: any;
    limitPrice: BN;
    leverage: string;
}) => {
    const {
        marketDirection,
        tradeMoney,
        graphObj,
        marketType,
        payTokenNum,
        slippage,
        marketInfo,
        marketBase64Map,
        collateralToken,
        payerInfo,
        payerSwapTokenInfo,
        positionMap,
        tokenPriceMap,
        indexToken,
        storeProgram,
        priorityFees,
        limitPrice,
        leverage,
    } = params;
    const formatLeverageBN = formatInput(leverage, 1);
    const isLong = marketDirection === 'Long';
    const storeAddress = GMX_SOLANA_STORE_ADDRESS
        ? translateAddress(GMX_SOLANA_STORE_ADDRESS)
        : undefined;
    const positionKey = findPositionPDA(
        storeAddress,
        new PublicKey(payerInfo?.address || '11111111111111111111111111111111'),
        new PublicKey(marketInfo?.marketToken || '11111111111111111111111111111111'),
        new PublicKey(collateralToken || '11111111111111111111111111111111'),
        marketDirection === 'Long'
    )[0].toBase58();
    const positionStr = positionMap instanceof Map ? positionMap.get(positionKey) || '' : '';
    let positionObj = null;
    if (positionStr) {
        positionObj = Position.decode_from_base64(positionStr);
    }
    const currentPrice = tokenPriceMap.get(indexToken)?.unitPrice;
    const acceptablePriceBase = marketType === 'Limit' ? limitPrice : currentPrice;
    let acceptable_price = new BN(0);
    if (acceptablePriceBase) {
        acceptable_price = isLong
            ? new BN(slippage)
                .add(new BN(10000))
                .mul(new BN(acceptablePriceBase))
                .div(new BN(10000))
            : new BN(10000)
                .sub(new BN(slippage))
                .mul(new BN(acceptablePriceBase))
                .div(new BN(10000));
    }
    let isLongFeesRate = new BN(0);
    let isShortFeesRate = new BN(0);
    const longOpenInterest = marketInfo?.openInterestForLong;
    const shortOpenInterest = marketInfo?.openInterestForShort;
    if (longOpenInterest && shortOpenInterest) {
        const flag = new BN(longOpenInterest).gt(
            new BN(shortOpenInterest)
        );
        if (flag) {
            isLongFeesRate = new BN(6).mul(new BN(10).pow(new BN(USD_DECIMALS - 4))).neg();
            isShortFeesRate = new BN(4).mul(new BN(10).pow(new BN(USD_DECIMALS - 4))).neg();
        } else {
            isLongFeesRate = new BN(4).mul(new BN(10).pow(new BN(USD_DECIMALS - 4))).neg();
            isShortFeesRate = new BN(6).mul(new BN(10).pow(new BN(USD_DECIMALS - 4))).neg();
        }
    }

    // calc Fees+impact Price Rate
    let impactFeesRate;
    if (marketType === 'Market' && graphObj && tradeMoney.gt(new BN(0))) {
        const params = {
            marketToken: marketInfo?.marketToken,
            graphObj,
            size: tradeMoney || new BN(0),
            payToken: payerSwapTokenInfo.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : payerSwapTokenInfo.tokenAddress,
            collateralToken,
            amount: payTokenNum,
            isLong: marketDirection === 'Long',
            marketBase64Map,
            storeProgram,
            marketInfo,
            positionObj,
            acceptable_price,
            tokenPriceMap,
            _size: tradeMoney?.mul(new BN(10)).div(formatLeverageBN),
        }
        // console.log('params', params)
        const result = await getSimulateOrderByMarketIncrease(priorityFees, params);
        const priceImpactValue =
            result?.reportData?.execution?.price_impact_value;
        const priceImpactRateBN = priceImpactValue?.mul(new BN(10).pow(new BN(20)))
            .div(tradeMoney);
        impactFeesRate = priceImpactRateBN?.add(isLong ? isLongFeesRate : isShortFeesRate);
    }

    if (marketType === 'Limit' && graphObj && tradeMoney.gt(new BN(0))) {
        const params = {
            marketToken: marketInfo?.marketToken,
            graphObj,
            sizeUsd: tradeMoney || new BN(0),
            payToken: payerSwapTokenInfo.tokenAddress === "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH" ? 'So11111111111111111111111111111111111111112' : payerSwapTokenInfo.tokenAddress,
            // payToken: collateralToken,
            collateralToken,
            amount: payTokenNum,
            amountValue: payTokenNum?.mul(new BN(tokenPriceMap.get(payerSwapTokenInfo?.tokenAddress || '11111111111111111111111111111111')?.unitPrice || '0')),
            isLong: marketDirection === 'Long',
            marketBase64Map,
            storeProgram,
            marketInfo,
            positionObj,
            triggerPrice: limitPrice,
            acceptable_price,
        }
        const result = await getSimulateOrderByLimitIncrease(params);
        const priceImpactValue =
            result?.reportData?.execution?.price_impact_value;
        const priceImpactRateBN = priceImpactValue?.mul(new BN(10).pow(new BN(20)))
            .div(tradeMoney);
        impactFeesRate = priceImpactRateBN?.add(isLong ? isLongFeesRate : isShortFeesRate);
    }
    let roundedImpactFeesRate = impactFeesRate;
    if (impactFeesRate) {
        const percentageBN = impactFeesRate.mul(new BN(100));
        const decimals = 20; // USD_DECIMALS
        const dp = 2; // Round percentage to 2 decimal places
        const divisor = new BN(10).pow(new BN(decimals - dp));

        let quotient = percentageBN.div(divisor);
        const remainder = percentageBN.mod(divisor);

        const shouldRoundUp = remainder.abs().mul(new BN(2)).gte(divisor);

        if (shouldRoundUp) {
            if (percentageBN.isNeg()) {
                quotient = quotient.sub(new BN(1));
            } else {
                quotient = quotient.add(new BN(1));
            }
        }

        const roundedPercentageBN = quotient.mul(divisor);
        roundedImpactFeesRate = roundedPercentageBN.div(new BN(100));
    }
    return {
        isGtZero: roundedImpactFeesRate?.gte(new BN(0)),
        impactFees: roundedImpactFeesRate?.toString() ? formatRatePercentage(roundedImpactFeesRate, 2, { signed: true }) : '-',
        impactFeesNum: roundedImpactFeesRate?.toString() || '0'
    }
}
