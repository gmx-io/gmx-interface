import React, { Dispatch, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { BigNumber, ethers } from "ethers";
import { callContract } from "./callContract";
import { useChainId } from "lib/chains";

export type Transaction = {
  message?: string;
  hash: string;
};

export type TransactionParams = {
  contract: ethers.Contract;
  method: string;
  params: any[];
  opts?: {
    value?: BigNumber | number;
    gasLimit?: BigNumber | number;
    sentMsg?: string;
    successMsg?: string;
    hideSuccessMsg?: boolean;
    failMsg?: string;
  };
};

export type TransactionsContextType = {
  pendingTxns: Transaction[];
  setPendingTxns: Dispatch<Transaction[]>;
  executeTxn: (params: TransactionParams) => Promise<ethers.ContractTransaction>;
};

const TransactionsContext = React.createContext<TransactionsContextType>({
  pendingTxns: [],
  setPendingTxns: () => null,
  executeTxn: async () => ({} as ethers.ContractTransaction),
});

export function useTransactions() {
  return useContext(TransactionsContext);
}

export function TransactionsProvider({ children }) {
  const { library } = useWeb3React();
  const { chainId } = useChainId();

  const [pendingTxns, setPendingTxns] = useState<Transaction[]>([]);

  const executeTxn = useCallback(
    ({ contract, method, params, opts = {} }: TransactionParams) => {
      if (!chainId) return;

      return callContract(chainId, contract, method, params, {
        ...opts,
        setPendingTxns,
      }) as any;
    },
    [chainId, setPendingTxns]
  );

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns: Transaction[] = [];

      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await library.getTransactionReceipt(pendingTxn.hash);

        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            helperToast.error(
              <div>
                <Trans>
                  Txn failed. <ExternalLink href={txUrl}>View</ExternalLink>
                </Trans>
                <br />
              </div>
            );
          }

          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            helperToast.success(
              <div>
                {pendingTxn.message}{" "}
                <ExternalLink href={txUrl}>
                  <Trans>View</Trans>
                </ExternalLink>
                <br />
              </div>
            );
          }

          continue;
        }
        updatedPendingTxns.push(pendingTxn);
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns);
      }
    };

    const interval = setInterval(() => {
      checkPendingTxns();
    }, 2 * 1000);

    return () => clearInterval(interval);
  }, [library, pendingTxns, chainId, setPendingTxns]);

  const state = useMemo(
    () => ({
      pendingTxns,
      setPendingTxns,
      executeTxn,
    }),
    [executeTxn, pendingTxns, setPendingTxns]
  );

  return <TransactionsContext.Provider value={state}>{children}</TransactionsContext.Provider>;
}
