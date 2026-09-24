import { useEffect, useRef, useState } from 'react';
import { Address, BN } from '@coral-xyz/anchor';
import { useTokenBalances } from '@/components/Pools/Hooks/useTokenBalances';
import { GMX_SOLANA_MARKET_TOKENS, GMX_SOLANA_GLV_TOKENS } from '@/config/program';
import { BN_ZERO } from '@/config/constants';
import { usePayer } from "@/components/TradeBoxNew/Hooks/usePayer";

const EMPTY_TOKENS: Address[] = [];

export const getBalanceMap = () => {
    const [balanceMap, setBalanceMap] = useState<Map<string, BN>>(new Map());
    const { connected } = usePayer();
    const fetchedBalances = useTokenBalances(
        connected ? GMX_SOLANA_MARKET_TOKENS : EMPTY_TOKENS,
        connected ? GMX_SOLANA_GLV_TOKENS : undefined
    );
    const lastVersionRef = useRef<string>('');
    useEffect(() => {
        const entries = Object.entries(fetchedBalances || {});
        if (connected) {
            const version = entries
                .map(([address, value]) => `${address}:${(value || BN_ZERO).toString()}`)
                .sort()
                .join('|');
            if (lastVersionRef.current !== version) {
                const next = new Map<string, BN>();
                entries.forEach(([address, value]) => {
                    next.set(address, value || BN_ZERO);
                });
                setBalanceMap(next);
                lastVersionRef.current = version;
            }
        } else {
            if (lastVersionRef.current !== '') {
                setBalanceMap(new Map());
                lastVersionRef.current = '';
            }
        }
    }, [connected, fetchedBalances]);
    return { balanceMap, connected };
}
