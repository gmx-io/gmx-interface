import { BN } from '@coral-xyz/anchor'

export const formatLeverage = (value: string): BN => {
    if (!value) return

    const parts = value.split('.')
    if (parts.length === 1) {
        return new BN(parts[0]).mul(new BN(10))
    } else if (parts.length === 2) {
        const integerPart = parts[0]
        const decimalPart = parts[1].substring(0, 1)
        const combined = integerPart + decimalPart
        return new BN(combined)
    }
    return
}
