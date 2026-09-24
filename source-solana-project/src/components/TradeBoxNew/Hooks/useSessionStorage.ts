import { useEffect, useState } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useShallow } from 'zustand/react/shallow';

export const useSessionStorage = () => {
    const {
        payTokenNum,
        sizeNumber,
    } = useAppStore(useShallow((state) => state.TradeboxNew));
    const {
        indexToken
    } = useAppStore(useShallow((state) => state.indexTokens));
    const {
        payerSwapTokenInfo
    } = useAppStore(useShallow((state) => state.payerSwapTokens));
    useEffect(() => {
        const sessionPayTokenSession = sessionStorage.getItem('payTokenSession');
        let sessionArray = [];
        if (sessionPayTokenSession) {
            try {
                const parsed = JSON.parse(sessionPayTokenSession);
                if (Array.isArray(parsed)) {
                    sessionArray = parsed;
                }
            } catch (error) {
                sessionArray = [];
            }
        }
        const existingIndex = sessionArray.findIndex(i => i.payToken === payerSwapTokenInfo?.tokenAddress);
        if (payTokenNum?.gt(new BN(0))) {
            const newItem = {
                payTokenNum: payTokenNum?.toString(),
                sizeNumber: sizeNumber?.toString(),
                payToken: payerSwapTokenInfo?.tokenAddress,
            };
            if (existingIndex > -1) {
                // has session
                sessionArray[existingIndex] = newItem;
            } else {
                sessionArray.push(newItem);
            }
            sessionStorage.setItem('payTokenSession', JSON.stringify(sessionArray));
        }
    }, [payTokenNum, sizeNumber, payerSwapTokenInfo])

    // indexToken change
    useEffect(() => {
        if (indexToken) {
            sessionStorage.removeItem('payTokenSession')
        }
    }, [indexToken])

    // page refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem('payTokenSession')
            return '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [])
};