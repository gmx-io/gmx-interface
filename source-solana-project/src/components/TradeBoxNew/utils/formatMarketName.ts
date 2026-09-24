import { GMX_SOLANA_TOKENS_RAW } from '@/config/program'

export const formatMarketName = (token: string) => {
    return GMX_SOLANA_TOKENS_RAW[token]?.displayMarketName
}