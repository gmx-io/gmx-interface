import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { waitForTransactionConfirmation } from '@/components/TradeBoxNew/utils/getExchangeStatus';
import { useAppStore } from '@/zustand/useAppStore';

function getSendRawTransactionOpts() {
    const skipPreflight = useAppStore.getState().settings.skipPreflight;
    return {
        skipPreflight,
        preflightCommitment: 'confirmed' as const,
        maxRetries: 3,
    };
}

// exec order
export const useExecOrder = async (
    transactions: any,
    { signAllTransactions, storeProgram }
) => {
    const sendRawTransactionOpts = getSendRawTransactionOpts();
    let tsx = [];
    const connection = storeProgram.provider.connection;
    try {
        tsx.push(...transactions.serialize().flat());
    } catch (error) {
        console.log('create_orders error', error);
    }
    console.log('tsx', tsx)
    try {
        const versionedTxns = tsx.map(item => {
            try {
                if (item instanceof Uint8Array) {
                    return VersionedTransaction.deserialize(item);
                }
                if (Buffer.isBuffer(item)) {
                    return VersionedTransaction.deserialize(new Uint8Array(item));
                }
                return VersionedTransaction.deserialize(item);
            } catch (versionedError) {
                try {
                    return Transaction.from(item);
                } catch (legacyError) {
                    throw new Error(`Transaction deserialization failed: ${versionedError.message}`);
                }
            }
        });
        const signedTx = await signAllTransactions(versionedTxns);
        const results = [];
        if (versionedTxns.length > 1) {
            try {
                const firstTransaction = signedTx[0];
                let serializedTx;
                if (firstTransaction instanceof VersionedTransaction) {
                    serializedTx = firstTransaction.serialize();
                } else if (firstTransaction instanceof Transaction) {
                    serializedTx = firstTransaction.serialize();
                } else {
                    throw new Error('Unknown transaction type');
                }

                const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                results.push(sig);
                const status = await waitForTransactionConfirmation(connection, sig);
                if (status.status === 'processed') {
                    for (let index = 1; index < signedTx.length; index++) {
                        try {
                            const signedTransaction = signedTx[index];
                            let serializedTx;
                            if (signedTransaction instanceof VersionedTransaction) {
                                serializedTx = signedTransaction.serialize();
                            } else if (signedTransaction instanceof Transaction) {
                                serializedTx = signedTransaction.serialize();
                            } else {
                                throw new Error('Unknown transaction type');
                            }

                            const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                            results.push(sig);
                            waitForTransactionConfirmation(connection, sig);
                        } catch (sendError) {
                            console.error(`Failed to send transaction ${index + 1}:`, sendError);
                            throw sendError;
                        }
                    }
                }
            } catch (sendError) {
                console.error(`Failed to send first transaction:`, sendError);
                throw sendError;
            }
        } else {
            for (let index = 0; index < signedTx.length; index++) {
                try {
                    const signedTransaction = signedTx[index];
                    let serializedTx;
                    if (signedTransaction instanceof VersionedTransaction) {
                        serializedTx = signedTransaction.serialize();
                    } else if (signedTransaction instanceof Transaction) {
                        serializedTx = signedTransaction.serialize();
                    } else {
                        throw new Error('Unknown transaction type');
                    }

                    const sig = await connection.sendRawTransaction(serializedTx, sendRawTransactionOpts);
                    results.push(sig);
                    waitForTransactionConfirmation(connection, sig);
                } catch (sendError) {
                    console.error(`Failed to send transaction ${index + 1}:`, sendError);
                    throw sendError;
                }
            }
        }
        console.log("result", results)
        return results;
    } catch (error) {
        console.error('Transaction processing error:', error);
        throw error;
    }
};




