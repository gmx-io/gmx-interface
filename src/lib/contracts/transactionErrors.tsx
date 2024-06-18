import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getChainName } from "config/chains";
import { getNativeToken } from "config/tokens";
import { switchNetwork } from "lib/wallets";
import { Link } from "react-router-dom";

export const NOT_ENOUGH_FUNDS = "NOT_ENOUGH_FUNDS";
export const USER_DENIED = "USER_DENIED";
export const SLIPPAGE = "SLIPPAGE";
export const RPC_ERROR = "RPC_ERROR";
export const NETWORK_CHANGED = "NETWORK_CHANGED";

type ErrorPattern = { msg?: string; code?: number };

const TX_ERROR_PATTERNS: { [key: string]: ErrorPattern[] } = {
  [NOT_ENOUGH_FUNDS]: [
    { msg: "insufficient funds for gas" },
    { msg: "not enough funds for gas" },
    { msg: "failed to execute call with revert code InsufficientGasFunds" },
  ],
  [USER_DENIED]: [{ msg: "User denied transaction signature" }],
  [SLIPPAGE]: [{ msg: "Router: mark price lower than limit" }, { msg: "Router: mark price higher than limit" }],
  [NETWORK_CHANGED]: [{ msg: "underlying network changed" }],
  [RPC_ERROR]: [
    // @see https://eips.ethereum.org/EIPS/eip-1474#error-codes
    { code: -32700 }, // Parse error: Invalid JSON
    { code: -32600 }, // Invalid request: JSON is not a valid request object
    { code: -32601 }, // Method not found: Method does not exist
    { code: -32602 }, // Invalid params: Invalid method parameters
    { code: -32603 }, // Internal error: Internal JSON-RPC error
    { code: -32000 }, // Invalid input: Missing or invalid parameters	non-standard
    { code: -32001 }, // Resource not found: Requested resource not found
    { code: -32002 }, // Resource unavailable: Requested resource not available
    { code: -32003 }, // Transaction rejected: Transaction creation failed
    { code: -32004 }, // Method not supported: Method is not implemented
    { code: -32005 }, // Limit exceeded: Request exceeds defined limit
    { code: -32006 }, // JSON-RPC version not supported: Version of JSON-RPC protocol is not supported
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
  error?: any;
};

export function extractError(ex: TxError) {
  if (!ex) {
    return [];
  }

  // ethers v6 moved error to `.info` field 🤷‍♂️,
  // we also fallback to `ex` cos we might catch errors from ethers v5
  // from some outdated dependency like @davatar/react
  ex = (ex as any)?.info ?? ex;
  let message = ex.error?.message || ex.data?.message || ex.message;
  let code = ex.error?.code || ex.code;

  if (ex.error?.body) {
    try {
      const parsed = JSON.parse(ex.error?.body);
      if (parsed?.error?.message) {
        message = parsed.error.message;
      }
      if (parsed?.error?.code) {
        code = parsed.error.code;
      }
    } catch (e) {
      // do nothing
    }
  }

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
  const nativeToken = getNativeToken(chainId);

  let failMsg;
  let autoCloseToast: any = 5000;

  switch (type) {
    case NOT_ENOUGH_FUNDS:
      failMsg = (
        <Trans>
          There is not enough {nativeToken.symbol} in your account on {getChainName(chainId)} to send this transaction.
          <br />
          <br />
          <Link className="underline" to="/buy_gmx#bridge">
            Buy or Transfer {nativeToken.symbol} to {getChainName(chainId)}
          </Link>
        </Trans>
      );
      break;
    case NETWORK_CHANGED:
      failMsg = getInvalidNetworkErrorMessage(chainId);
      break;
    case USER_DENIED:
      failMsg = t`Transaction was cancelled.`;
      break;
    case SLIPPAGE:
      failMsg = t`The mark price has changed, consider increasing your Allowed Slippage by clicking on the "..." icon next to your address.`;
      break;
    case RPC_ERROR: {
      autoCloseToast = false;

      const originalError = errorData?.error?.message || errorData?.message || message;

      failMsg = (
        <div>
          <Trans>
            Transaction failed due to RPC error.
            <br />
            <br />
            Please try changing the RPC url in your wallet settings with the help of{" "}
            <ExternalLink href="https://chainlist.org">chainlist.org</ExternalLink>.
            <br />
            <br />
            <ExternalLink href="https://docs.gmx.io/docs/trading/v1#rpc-urls">Read more</ExternalLink>.
          </Trans>
          <br />
          <br />
          {originalError && <ToastifyDebug error={originalError} />}
        </div>
      );
      break;
    }
    default:
      autoCloseToast = false;

      failMsg = (
        <div>
          {txnMessage || t`Transaction failed`}
          <br />
          <br />
          {message && <ToastifyDebug error={message} />}
        </div>
      );
  }

  return { failMsg, autoCloseToast };
}

export const INVALID_NETWORK_TOAST_ID = "invalid-network";
export function getInvalidNetworkErrorMessage(chainId: number) {
  return (
    <Trans>
      <div>Your wallet is not connected to {getChainName(chainId)}.</div>
      <br />
      <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
        Switch to {getChainName(chainId)}
      </div>
    </Trans>
  );
}
