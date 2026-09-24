import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect, useCallback } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface PayerInfo {
    address: string | null;
    balance: number | null;
    connected: boolean;
    connectWallet: () => Promise<void>;
    openConnectWalletModal: () => void;
}

export const usePayer = (): PayerInfo => {
    const { connected, publicKey, connect } = useWallet();
    const { connection } = useConnection();
    const [balance, setBalance] = useState<number | null>(null);
    const { setVisible } = useWalletModal();

    const connectWallet = useCallback(async () => {
        if (connected) {
            return;
        }
        try {
            await connect();
        } catch (error) {
            console.error('Failed to connect to wallet:', error);
        }
    }, [connect, connected]);

    useEffect(() => {
        if (connected && publicKey && connection) {
            connection.getBalance(publicKey).then(lamports => {
                setBalance(lamports / LAMPORTS_PER_SOL);
            });
        } else {
            setBalance(null);
        }
    }, [connected]);

    const openConnectWalletModal = useCallback(() => {
        setVisible(true);
    }, [setVisible]);

    return {
        connected,
        address: publicKey ? publicKey.toBase58() : null,
        balance,
        connectWallet,
        openConnectWalletModal,
    };
};