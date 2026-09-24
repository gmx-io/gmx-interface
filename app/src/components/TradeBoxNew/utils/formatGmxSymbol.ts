import { GMX_SOLANA_TOKENS_RAW } from '@/config/program'

export const formatGmxSymbol = (token: string, key?: string) => {
    if (GMX_SOLANA_TOKENS_RAW[token]?.symbol === 'WGMX') {
        return 'GMX'
    }
    if (key && GMX_SOLANA_TOKENS_RAW[token]?.symbol === 'WSOL') {
        return 'SOL'
    }
    return GMX_SOLANA_TOKENS_RAW[token]?.symbol
}

export const formatDisplayGmxSymbol = (token: string, key?: string) => {
    return GMX_SOLANA_TOKENS_RAW[token]?.displaySymbol
}