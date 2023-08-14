import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";

export const NOT_ENOUGH_FUNDS = "NOT_ENOUGH_FUNDS";
export const USER_DENIED = "USER_DENIED";
export const SLIPPAGE = "SLIPPAGE";
export const RPC_ERROR = "RPC_ERROR";
export const NETWORK_CHANGED = "NETWORK_CHANGED";

type ErrorPattern = { msg?: string; code?: number };

const TX_ERROR_PATTERNS: { [key: string]: ErrorPattern[] } = {
  [NOT_ENOUGH_FUNDS]: [
    { msg: "not enough funds for gas" },
    { msg: "failed to execute call with revert code InsufficientGasFunds" },
  ],
  [USER_DENIED]: [{ msg: "User denied transaction signature" }],
  [SLIPPAGE]: [{ msg: "Router: mark price lower than limit" }, { msg: "Router: mark price higher than limit" }],
  [NETWORK_CHANGED]: [{ msg: "underlying network changed" }],
  [RPC_ERROR]: [
    // @see https://eips.ethereum.org/EIPS/eip-1474#error-codes
    { code: -32005 },
    { msg: "Non-200 status code" },
    { msg: "Request limit exceeded" },
    { msg: "Internal JSON-RPC error" },
    { msg: "Response has no error or result" },
    { msg: "we can't execute this request" },
    { msg: "couldn't connect to the network" },
  ],
};

type TxError = {
  message?: string;
  code?: number;
  data?: any;
};

export function extractError(ex: TxError) {
  if (!ex) {
    return [];
  }

  const message = ex.data?.message || ex.message;
  const code = ex.code;

  if (!message && !code) {
    return [];
  }

  for (const [type, patterns] of Object.entries(TX_ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      const matchCode = pattern.code && code === pattern.code;
      const matchMessage = pattern.msg && message && message.includes(pattern.msg);

      if (matchCode || matchMessage) {
        return [message, type, ex.data];
      }
    }
  }

  return [message, null, ex.data];
}

export function getErrorMessage(chainId: number, ex: TxError, txnMessage?: string) {
  const [message, type, errorData] = extractError(ex);

  let failMsg;
  let autoCloseToast: any = 5000;

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
            <ExternalLink href="https://docs.gmx.io/docs/trading/v1#rpc-urls">More info</ExternalLink>
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
          {txnMessage || t`Transaction failed`}
          <br />
          {message && <ToastifyDebug>{message}</ToastifyDebug>}
        </div>
      );
  }

  return { failMsg, autoCloseToast };
}
