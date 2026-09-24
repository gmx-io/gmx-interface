import { Connection, TransactionSignature } from "@solana/web3.js";
import { getGmw351Enabled } from '@/config/featureFlagEnable';

async function getTransactionStatus(
    connection: Connection,
    signature: TransactionSignature
) {
    try {
        const sigStatuses = await connection.getSignatureStatuses([signature], {
            searchTransactionHistory: true,
        });
        const sigStatus = sigStatuses?.value?.[0];

        if (!sigStatus) {
            return {
                status: "pending",
                signature,
                message: "Signature status not available yet",
            };
        }

        if (getGmw351Enabled() && sigStatus.err) {
            return {
                status: "failed",
                signature,
                error: sigStatus.err,
                message: "Transaction failed on-chain",
            };
        }

        const normalizedStatus = sigStatus.confirmationStatus ?? (
            sigStatus.confirmations === null
                ? "finalized"
                : sigStatus.confirmations === 0
                    ? "processed"
                    : "confirmed"
        );

        if (
            normalizedStatus === "processed" ||
            normalizedStatus === "confirmed" ||
            normalizedStatus === "finalized"
        ) {
            return {
                status: "processed",
                signature,
                blockTime: null,
                slot: sigStatus.slot,
                error: null,
                logs: [],
                message: "Transaction reached processed or higher state",
            };
        }

        return {
            status: "pending",
            signature,
            message: "Transaction still pending",
        };
    } catch (error) {
        console.error(`search ${signature} error:`, error);
        return {
            status: "error",
            signature,
            message: (error as Error).message,
        };
    }
}

export async function waitForTransactionConfirmation(
    connection: Connection,
    signature: TransactionSignature,
    interval = 200,
    timeout = 30000
) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const status = await getTransactionStatus(connection, signature);
        console.log('status', status)
        if (getGmw351Enabled()) {
            if (
                status.status === "processed" ||
                status.status === "failed" ||
                status.status === "error"
            ) {
                return status;
            }
        } else if (status.status === "processed") {
            return status;
        }

        await new Promise(resolve => setTimeout(resolve, interval));
    }

    return {
        status: "timeout",
        signature,
        message: `Transaction not confirmed within ${timeout}ms`,
    };
}
