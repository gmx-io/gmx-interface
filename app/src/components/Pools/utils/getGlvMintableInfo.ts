import { BN_ZERO } from '@/config/constants';
import { getGlvMarketMaxBuyableUsd } from './getGlvMarketMaxBuyableUsd';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { getTokenData } from '@/utils/token/getTokenData';
import { BN } from '@coral-xyz/anchor';
import values from 'lodash/values';
import { formatAmount } from '@/utils/legacy';

export function getGlvMintableInfo(
    glv: any,
    glvPriceUsd: BN,
    glvDecimals: number,
    marketTokensData: any | undefined
) {
    // console.log('glv', glv)
    // console.log('glvPriceUsd', glvPriceUsd?.toString())
    // console.log('glvDecimals', glvDecimals)
    // console.log('marketTokensData', marketTokensData)

    const amountUsd = values(glv.markets).reduce((acc, market) => {
        const marketInfo = marketTokensData?.get(market.marketTokenAddress.toBase58());
        if (!marketInfo) {
            return acc;
        }
        const result = acc.add(
            marketTokensData
                ? getGlvMarketMaxBuyableUsd(
                    market,
                    marketInfo
                )
                : BN_ZERO
        );

        return result.gt(BN_ZERO) ? result : BN_ZERO;
    }, BN_ZERO);

    return {
        mintableAmount: glvPriceUsd.gt(BN_ZERO) && new BN(glvDecimals).gt(BN_ZERO) ? amountUsd?.div(glvPriceUsd)?.div(new BN(10).pow(new BN(glvDecimals))) :
            BN_ZERO,
        mintableUsd: amountUsd,
    };
}
