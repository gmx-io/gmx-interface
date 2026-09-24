import {
    GMX_SOLANA_STORE_ADDRESS,
} from '@/config/program';
import { PublicKey, Connection, Commitment } from '@solana/web3.js';
import { findMarketPDA } from 'gmsol';
import { MarketGraph } from '@gmsol-labs/gmsol-sdk'
import { getGmw379Enabled } from '@/config/featureFlagEnable';

export const MARKETS_KEY = 'data_store/markets';
const store = GMX_SOLANA_STORE_ADDRESS;

// get recent blockhash
export const getRecentBlockhash = async (connection: Connection, commitment: Commitment = 'confirmed'): Promise<string> => {
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    return blockhash;
};

// get priority fees
export const getPriorityFees = async (connection: Connection, num = 1): Promise<number> => {
    const recentPriorityFees = await connection.getRecentPrioritizationFees();
    const signFee = 5000 * num
    const validFees = recentPriorityFees
        .map(block => block.prioritizationFee)
        .filter(fee => fee > 0);
    validFees.sort((a, b) => a - b);
    if (validFees.length === 0) {
        return signFee;
    }
    const medianFee = validFees[Math.floor(validFees.length / 2)];
    const recommendedFee = Math.ceil(medianFee * 1.2);
    const result = recommendedFee + signFee
    return result;
};

// get recent prioritization fees
export const getRecentPrioritizationFeesFn = async (connection: Connection) => {
    const recentPriorityFees = await connection.getRecentPrioritizationFees();
    console.log('recentPriorityFees', recentPriorityFees)
    if (recentPriorityFees.length > 0) {
        return recentPriorityFees[0].prioritizationFee;
    }
    return 1000;
}

export async function getMarketBase64(marketToken: PublicKey, storeProgram: any) {
    const _marketAddress = findMarketPDA(store, marketToken)[0].toBase58()
    const marketAddress = new PublicKey(_marketAddress)
    const accountInfo =
        await storeProgram.provider.connection.getAccountInfo(marketAddress,
            'confirmed'
        );
    return accountInfo?.data.toString('base64')
}

export async function getMultipMarketBase64(marketTokens: PublicKey[], storeProgram: any) {
    if (getGmw379Enabled()) return [];
    const marketAddresses = marketTokens.map((token) =>
        findMarketPDA(store, new PublicKey(token))[0].toBase58()
    );
    const accountInfos =
        await storeProgram.provider.connection.getMultipleAccountsInfo(
            marketAddresses.map((address) => new PublicKey(address)),
            'confirmed'
        );
    return accountInfos
}

// get graph obj
export const getGraphObj = async (marketInfos, tradeMoney, marketBase64Map, priorityFees) => {
    if (!marketInfos.length) {
        return;
    }
    const graph = new MarketGraph({
        swap_estimation_params: {
            value: tradeMoney ? BigInt(tradeMoney?.toString()) : BigInt(0),
            base_cost: BigInt(priorityFees),
        },
        max_steps: 5,
    });
    const new_marketInfos = marketInfos.filter((marketInfo) => marketInfo.newPrices?.indexToken.min !== '0');
    await Promise.all(new_marketInfos.map((marketInfo) => {
        if (marketBase64Map.size === 0) {
            return
        }
        const encodedMarket = marketBase64Map.get(marketInfo.marketToken)
        if (!encodedMarket) {
            return
        }
        graph?.insert_market_from_base64(encodedMarket, BigInt(marketInfo.supply));
        const _indexToken = marketInfo.indexToken;
        const _longToken = marketInfo.longToken;
        const _shortToken = marketInfo.shortToken;
        graph?.update_token_price(_indexToken, { min: BigInt(marketInfo.newPrices.indexToken.min), max: BigInt(marketInfo.newPrices.indexToken.max) });
        graph?.update_token_price(_longToken, { min: BigInt(marketInfo.newPrices.longToken.min), max: BigInt(marketInfo.newPrices.longToken.max) });
        graph?.update_token_price(_shortToken, { min: BigInt(marketInfo.newPrices.shortToken.min), max: BigInt(marketInfo.newPrices.shortToken.max) });
    }))
    return graph;
}

// get best swap path
export const getBestSwapPath = (graphObj, pay_token, collateral_or_swap_out_token) => {
    let swapPathObj = graphObj?.best_swap_path(
        pay_token,
        collateral_or_swap_out_token,
        false
    );
    // console.log('swapPathObj', swapPathObj)
    if (swapPathObj?.arbitrage_exists) {
        graphObj?.update_base_cost(BigInt(1000000000000000000000))
        swapPathObj = graphObj.best_swap_path(
            pay_token,
            collateral_or_swap_out_token,
            false
        );
    }
    return swapPathObj;
}
