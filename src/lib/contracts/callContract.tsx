import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { Contract, Wallet, Overrides } from "ethers";
import { helperToast } from "../helperToast";
import { getErrorMessage } from "./transactionErrors";
import { getGasLimit, getGasPrice, getBestNonce } from "./utils";
import { ReactNode } from "react";
import React from "react";
import { getTenderlyConfig, simulateTxWithTenderly } from "lib/tenderly";
import { sendOrderTxnSubmittedMetric } from "lib/metrics/utils";
import { OrderMetricId } from "lib/metrics/types";

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
    metricId?: OrderMetricId;
  }
) {
  try {
    const wallet = contract.runner as Wallet;

    if (!Array.isArray(params) && typeof params === "object" && opts === undefined) {
      opts = params;
      params = [];
    }

    if (!opts) {
      opts = {};
    }

    const tenderlyConfig = getTenderlyConfig();

    if (tenderlyConfig) {
      await simulateTxWithTenderly(chainId, contract, wallet.address, method, params, {
        gasLimit: opts.gasLimit !== undefined ? BigInt(opts.gasLimit) : undefined,
        value: opts.value !== undefined ? BigInt(opts.value) : undefined,
        comment: `calling ${method}`,
      });
      return;
    }

    const txnOpts: Overrides = {};

    if (opts.value) {
      txnOpts.value = opts.value;
    }

    if (opts.customSigners) {
      // If we send the transaction to multiple RPCs simultaneously,
      // we should specify a fixed nonce to avoid possible txn duplication.
      txnOpts.nonce = await getBestNonce([wallet, ...opts.customSigners]);
    }

    if (opts.showPreliminaryMsg && !opts.hideSentMsg) {
      showCallContractToast({
        chainId,
        sentMsg: opts.sentMsg || t`Transaction sent.`,
        detailsMsg: opts.detailsMsg || "",
      });
    }

    const customSignerContracts = opts.customSigners?.map((signer) => contract.connect(signer)) || [];

    const txnCalls = [contract, ...customSignerContracts].map(async (cntrct) => {
      const txnInstance = { ...txnOpts };

      if (!cntrct.runner?.provider) {
        throw new Error("No provider found on contract.");
      }

      async function retrieveGasLimit() {
        return opts.gasLimit ? opts.gasLimit : await getGasLimit(cntrct, method, params, opts.value);
      }

      const gasLimitPromise = retrieveGasLimit().then((gasLimit) => {
        txnInstance.gasLimit = gasLimit;
      });

      const gasPriceDataPromise = getGasPrice(cntrct.runner.provider, chainId).then((gasPriceData) => {
        if (gasPriceData.gasPrice !== undefined) {
          txnInstance.gasPrice = gasPriceData.gasPrice;
        } else {
          txnInstance.maxFeePerGas = gasPriceData.maxFeePerGas;
          txnInstance.maxPriorityFeePerGas = gasPriceData.maxPriorityFeePerGas;
        }
      });

      await Promise.all([gasLimitPromise, gasPriceDataPromise]);

      if (opts.metricId) {
        sendOrderTxnSubmittedMetric(opts.metricId);
      }

      return cntrct[method](...params, txnInstance);
    });

    const res = await Promise.any(txnCalls).catch(({ errors }) => {
      if (errors.length > 1) {
        // eslint-disable-next-line no-console
        console.error("All transactions failed", ...errors);
      }

      throw errors[0];
    });

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
        metricId: opts.metricId,
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
