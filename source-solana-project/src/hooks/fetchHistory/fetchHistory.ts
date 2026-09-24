import { Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { GMX_SOLANA_TOKENS_RAW } from "@/config/program";
import { BN } from "@coral-xyz/anchor";

export async function getInitialHoldings(owner, connection) {
    const ownerPubkey = new PublicKey(owner);

    const tokenAccounts = await connection.getTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID },
        "finalized"
    );
    const holdings = [];
    for (const { pubkey, account } of tokenAccounts.value) {
        const data = AccountLayout.decode(account.data);
        const mint = new PublicKey(data.mint).toBase58();
        const amount = data.amount;
        const decimals = GMX_SOLANA_TOKENS_RAW[mint].decimals;
        holdings.push({
            tokenAccount: pubkey.toBase58(),
            mint,
            amount,
            amountHuman: new BN(amount?.toString()).eq(new BN(0)) ? '0' : new BN(amount?.toString())?.div(new BN(10).pow(new BN(decimals))).toString(),
            decimals,
        });
    }
    return holdings;
}


export async function subscribeHoldings(owner, onUpdate, connection) {
    const initialHoldings = await getInitialHoldings(owner, connection);
    console.log('initialHoldings', initialHoldings)
    const tokenAccountAddresses = initialHoldings.map(h => new PublicKey(h.tokenAccount));

    const subscriptionIds = [];
    for (const accountPubkey of tokenAccountAddresses) {
        const subId = connection.onAccountChange(
            accountPubkey,
            (updatedAccountInfo) => {
                const data = AccountLayout.decode(updatedAccountInfo.data);
                const mint = new PublicKey(data.mint).toBase58();
                const newAmount = data.amount;

                const holding = initialHoldings.find(h => h.mint === mint);
                if (!holding) return;

                const newAmountHuman = new BN(newAmount.toString())
                    .div(new BN(10).pow(new BN(holding.decimals)))
                    .toString();

                onUpdate({
                    mint,
                    tokenAccount: accountPubkey.toBase58(),
                    oldAmount: holding.amount.toString(),
                    newAmount: newAmount.toString(),
                    newAmountHuman,
                    updatedAt: new Date(),
                });

                holding.amount = new BN(newAmount.toString());
                holding.amountHuman = newAmountHuman;
            },
            "finalized"
        );

        subscriptionIds.push(subId);
    }

    return () => {
        subscriptionIds.forEach(subId => connection.removeAccountChangeListener(subId));
    };
}