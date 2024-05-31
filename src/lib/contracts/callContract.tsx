import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { Contract, Wallet } from "ethers";
import { helperToast } from "../helperToast";
import { getErrorMessage } from "./transactionErrors";
import { getGasLimit, setGasPrice } from "./utils";
import { ReactNode } from "react";
import React from "react";

export async function callContract(
  chainId: number,
  contract: Contract,
  method: string,
  params: any,
  opts: {
    value?: bigint | number;
    gasLimit?: bigint | number;
    detailsMsg?: ReactNode;
    sentMsg?: string;
    successMsg?: string;
    hideSentMsg?: boolean;
    hideSuccessMsg?: boolean;
    showPreliminaryMsg?: boolean;
    failMsg?: string;
    customSigners?: Wallet[];
    setPendingTxns?: (txns: any) => void;
  }
) {
  try {
    if (!Array.isArray(params) && typeof params === "object" && opts === undefined) {
      opts = params;
      params = [];
    }

    if (!opts) {
      opts = {};
    }

    const txnOpts: any = {};

    if (opts.value) {
      txnOpts.value = opts.value;
    }

    if (opts.showPreliminaryMsg && !opts.hideSentMsg) {
      showCallContractToast({
        chainId,
        sentMsg: opts.sentMsg || t`Transaction sent.`,
        detailsMsg: opts.detailsMsg || "",
      });
    }

    txnOpts.gasLimit = opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value);

    if (!contract.runner?.provider) {
      throw new Error("No provider found on contract.");
    }

    await setGasPrice(txnOpts, contract.runner.provider, chainId);

    const signerRaceContracts = opts.customSigners?.map((signer) => contract.connect(signer));

    const res = signerRaceContracts
      ? await Promise.any([contract, ...signerRaceContracts].map((cnt) => cnt[method](...params, txnOpts))).catch(
          ({ errors }) => {
            throw errors[0];
          }
        )
      : await contract[method](...params, txnOpts);

    if (!opts.hideSentMsg) {
      showCallContractToast({
        chainId,
        sentMsg: opts.sentMsg || t`Transaction sent.`,
        detailsMsg: opts.detailsMsg || "",
        hash: res.hash,
      });
    }

    if (opts.setPendingTxns) {
      const message = opts.hideSuccessMsg ? undefined : opts.successMsg || t`Transaction completed!`;
      const pendingTxn = {
        hash: res.hash,
        message,
        messageDetails: opts.detailsMsg,
      };
      opts.setPendingTxns((pendingTxns) => [...pendingTxns, pendingTxn]);
    }

    return res;
  } catch (e) {
    const { failMsg, autoCloseToast } = getErrorMessage(chainId, e, opts?.failMsg);

    helperToast.error(failMsg, { autoClose: autoCloseToast });
    throw e;
  }
}

function showCallContractToast({
  chainId,
  hash,
  sentMsg,
  detailsMsg,
  toastId,
}: {
  chainId: number;
  hash?: string;
  sentMsg: string;
  detailsMsg?: React.ReactNode;
  toastId?: string;
}) {
  helperToast.success(
    <div>
      {sentMsg || t`Transaction sent.`}{" "}
      {hash && (
        <ExternalLink href={getExplorerUrl(chainId) + "tx/" + hash}>
          <Trans>View status.</Trans>
        </ExternalLink>
      )}
      <br />
      {detailsMsg && <br />}
      {detailsMsg}
    </div>,
    {
      toastId,
    }
  );
}
