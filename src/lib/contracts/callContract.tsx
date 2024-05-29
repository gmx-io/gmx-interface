import { BigNumber, Contract } from "ethers";
import { helperToast } from "../helperToast";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { ACCESS_DENIED, extractError, NETWORK_CHANGED, NOT_ENOUGH_FUNDS, RPC_ERROR, SLIPPAGE, USER_DENIED } from "./transactionErrors";
import { getGasLimit, setGasPrice } from "./utils";
import { getChainName, getExplorerUrl } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";

export async function callContract(
  chainId: number,
  contract: Contract,
  method: string,
  params: any,
  opts: {
    value?: BigNumber | number;
    gasLimit?: BigNumber | number;
    sentMsg?: string;
    successMsg?: string;
    hideSuccessMsg?: boolean;
    failMsg?: string;
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

    txnOpts.gasLimit = opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value);

    await setGasPrice(txnOpts, contract.provider, chainId);

    const res = await contract[method](...params, txnOpts);
    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
    const sentMsg = opts.sentMsg || t`Transaction sent.`;

    helperToast.success(
      <div>
        {sentMsg}{" "}
        <ExternalLink href={txUrl}>
          <Trans>View status.</Trans>
        </ExternalLink>
        <br />
      </div>
    );

    if (opts.setPendingTxns) {
      const message = opts.hideSuccessMsg ? undefined : opts.successMsg || t`Transaction completed!`;
      const pendingTxn = {
        hash: res.hash,
        message,
      };
      opts.setPendingTxns((pendingTxns) => [...pendingTxns, pendingTxn]);
    }

    return res;
  } catch (e) {
    let failMsg;

    let autoCloseToast: number | boolean = 5000;

    const [message, type, errorData] = extractError(e);
    console.log("error type:", type);
    switch (type) {
      case NOT_ENOUGH_FUNDS:
        failMsg = (
          <Trans>
            There is not enough ETH in your account on Arbitrum to send this transaction.
            <br />
            <br />
            <ExternalLink href="https://arbitrum.io/bridge-tutorial/">Bridge ETH to Arbitrum</ExternalLink>
          </Trans>
        );
        break;
      case NETWORK_CHANGED:
        failMsg = (
          <Trans>
            <div>Your wallet is not connected to {getChainName(chainId)}.</div>
            <br />
            <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
              Switch to {getChainName(chainId)}
            </div>
          </Trans>
        );
        break;
      case USER_DENIED:
        failMsg = t`Transaction was cancelled.`;
        break;
      case ACCESS_DENIED:
        failMsg = t`Access denied.`;
        break;  
      case SLIPPAGE:
        failMsg = t`The mark price has changed, consider increasing your Allowed Slippage by clicking on the "..." icon next to your address.`;
        break;
      case RPC_ERROR:
        autoCloseToast = false;

        const originalError = errorData?.error?.message || errorData?.message || message;

        failMsg = (
          <div>
            <Trans>
              Transaction failed due to RPC error.
              <br />
              <br />
              Please try changing the RPC url in your wallet settings.{" "}
              <ExternalLink href="https://docs.t3.money/tmx/trading#backup-rpc-urls">More info</ExternalLink>
            </Trans>
            <br />
            {originalError && <ToastifyDebug>{originalError}</ToastifyDebug>}
          </div>
        );
        break;
      default:
        autoCloseToast = false;

        failMsg = (
          <div>
            {opts.failMsg || t`Transaction failed`}
            <br />
            {message && <ToastifyDebug>{message}</ToastifyDebug>}
          </div>
        );
    }

    helperToast.error(failMsg, { autoClose: autoCloseToast });
    throw e;
  }
}
