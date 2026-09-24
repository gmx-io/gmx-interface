import ExternalLink from '@/components/Common/Link/ExternalLink';
import { getGmw378Enabled } from '@/config/featureFlagEnable';
import { useCurrentRpcUrl } from '@/hooks/utilsHooks/useCurrentRpcUrl';
import { getTransactionUrl } from '@/utils/lib/explorer';
import { getTransactionUrl as getTransactionUrlNew } from '@/utils/lib/explorerNew';
import { helperNotice } from '@/utils/lib/helperNotice';
import { PendingTransaction } from '@/utils/lib/transaction';
import { Trans } from '@lingui/macro';
import { useConnection } from '@solana/wallet-adapter-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { PendingTransactionsStateContext } from '.';
interface Props {
  children: ReactNode;
  enabled?: boolean;
}

export function PendingStateProvider({ children, enabled = true }: Props) {
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>([]);
  const isGmw378Enabled = getGmw378Enabled();
  const currentRpcUrl = useCurrentRpcUrl();

  const request = useMemo(() => {
    if (!enabled || pendingTxs.length === 0) {
      return null;
    }

    return {
      key: 'check_txs',
      pendingTxs: pendingTxs.map((tx) => tx.signature),
    };
  }, [enabled, pendingTxs]);

  const { connection } = useConnection();

  const { data } = useSWR(
    request,
    async ({ pendingTxs }) => {
      try {
        return (await connection.getSignatureStatuses(pendingTxs)).value ?? [];
      } catch (e) {
        const error = e as Error;
        helperNotice.error(
          <div>
            <Trans>Failed to get signature statuses.</Trans>
            <br />
            {error.message}
          </div>
        );
        return [];
      }
    },
    {}
  );

  useEffect(() => {
    if (data) {
      const updatedPendingTxs: PendingTransaction[] = [];
      for (let i = 0; i < pendingTxs.length; i++) {
        const pendingTx = pendingTxs[i];
        const status = data[i];
        if (status) {
          if (
            status.confirmationStatus === 'confirmed' ||
            status.confirmationStatus === 'finalized'
          ) {
            const url = isGmw378Enabled
              ? getTransactionUrlNew(pendingTx.signature)
              : getTransactionUrl(pendingTx.signature, currentRpcUrl);
            if (status.err) {
              helperNotice.error(
                <div>
                  <Trans>
                    Tx failed. <ExternalLink href={url}>View</ExternalLink>
                  </Trans>
                </div>,
                {
                  tradingErrorInfo: {
                    actionName: pendingTx.key,
                    errorData: status.err,
                    signatures: [pendingTx.signature],
                    errorId: pendingTx.signature,
                  },
                }
              );
            } else {
              helperNotice.success(
                <div>
                  {pendingTx.message}{' '}
                  <ExternalLink href={url}>
                    <Trans>View Tx</Trans>
                  </ExternalLink>
                </div>
              );
            }
            continue;
          }
        } 
        // else {
        //   helperNotice.warning(
        //     <div>
        //       <Trans>{`Status for tx ${pendingTx.signature} not found`}</Trans>
        //     </div>,
        //     { duration: 5000 }
        //   );
        // }
        updatedPendingTxs.push(pendingTx);
      }
      if (updatedPendingTxs.length !== pendingTxs.length) {
        setPendingTxs(updatedPendingTxs);
      }
    }
  }, [data, pendingTxs, currentRpcUrl, isGmw378Enabled]);

  const value = useMemo(() => {
    return {
      pendingTxs,
      setPendingTxs,
    };
  }, [pendingTxs]);
  return (
    <PendingTransactionsStateContext.Provider value={value}>
      {children}
    </PendingTransactionsStateContext.Provider>
  );
}
