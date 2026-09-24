import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createCloseAccountInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createSyncNativeInstruction } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

export const SOL_MINT = new PublicKey('So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH');
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

export const wrapSol = async (
    connection: Connection,
    owner: PublicKey,
    amount: BN | number
): Promise<Transaction> => {
    const amountBN = amount instanceof BN ? amount : new BN(amount);

    // Create transaction with feePayer set
    const transaction = new Transaction();
    transaction.feePayer = owner;

    const associatedTokenAccount = await getAssociatedTokenAddress(
        WSOL_MINT,
        owner,
        false
    );

    try {
        const accountInfo = await connection.getAccountInfo(associatedTokenAccount);

        if (!accountInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    owner,
                    associatedTokenAccount,
                    owner,
                    WSOL_MINT
                )
            );
        }
    } catch (error) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                owner,
                associatedTokenAccount,
                owner,
                WSOL_MINT
            )
        );
    }

    transaction.add(
        SystemProgram.transfer({
            fromPubkey: owner,
            toPubkey: associatedTokenAccount,
            lamports: amountBN.toNumber(),
        })
    );

    transaction.add(createSyncNativeInstruction(associatedTokenAccount));

    return transaction;
};

export const unwrapSol = async (
    connection: Connection,
    owner: PublicKey,
    amount?: BN | number
): Promise<Transaction> => {
    // Create transaction with feePayer set
    const transaction = new Transaction();
    transaction.feePayer = owner;

    const associatedTokenAccount = await getAssociatedTokenAddress(
        WSOL_MINT,
        owner,
        false
    );

    try {
        const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
        if (!accountInfo) {
            return transaction;
        }

        try {
            const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAccount);
            if (parseInt(tokenAccountInfo.value.amount) === 0) {
                return transaction;
            }

            transaction.add(
                createCloseAccountInstruction(
                    associatedTokenAccount,
                    owner,
                    owner,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

        } catch (error) {
            transaction.add(
                createCloseAccountInstruction(
                    associatedTokenAccount,
                    owner,
                    owner,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );
        }
    } catch (error) {
        console.error('Error checking WSOL account:', error);
    }
    return transaction;
};

export const handleSolWsolConversion = async (
    connection: Connection,
    owner: PublicKey,
    fromToken: PublicKey,
    toToken: PublicKey,
    amount: BN
): Promise<Transaction | null> => {
    if (fromToken.equals(SOL_MINT) && toToken.equals(WSOL_MINT)) {
        return await wrapSol(connection, owner, amount);
    }

    if (fromToken.equals(WSOL_MINT) && toToken.equals(SOL_MINT)) {
        return await unwrapSol(connection, owner, amount);
    }

    if (fromToken.equals(SOL_MINT) && !toToken.equals(WSOL_MINT)) {
        return await wrapSol(connection, owner, amount);
    }

    if (!fromToken.equals(WSOL_MINT) && toToken.equals(SOL_MINT)) {
        return null;
    }

    return null;
};

export const needsUnwrapAfterSwap = (
    fromToken: PublicKey,
    toToken: PublicKey
): boolean => {
    return fromToken.equals(WSOL_MINT) && toToken.equals(SOL_MINT);
};

export const needsWrapBeforeSwap = (
    fromToken: PublicKey,
): boolean => {
    return fromToken.equals(SOL_MINT);
};

export const formatSolAmount = (amount: BN | number | string, decimals: number = 9): string => {
    let amountNum: number;

    if (amount instanceof BN) {
        amountNum = amount.toNumber();
    } else if (typeof amount === 'string') {
        amountNum = parseFloat(amount);
    } else {
        amountNum = amount;
    }

    return (amountNum / LAMPORTS_PER_SOL).toFixed(decimals);
};