import { t, Trans } from "@lingui/macro";
import { Signer } from "ethers";
import { Link } from "react-router-dom";

import { getChainName } from "config/chains";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import { getNativeToken } from "sdk/configs/tokens";
import { extractError, TxError, TxErrorType } from "sdk/utils/errors/transactionsErrors";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

export function getTxnErrorToastContent(
  chainId: number,
  ex: TxError,
  txnMessage?: string,
  additionalContent?: React.ReactNode
) {
  const [message, type, errorData] = extractError(ex);
  const nativeToken = getNativeToken(chainId);

  let failMsg;
  let autoCloseToast: any = 5000;

  switch (type) {
    case TxErrorType.NotEnoughFunds:
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
    case TxErrorType.NetworkChanged:
      failMsg = getInvalidNetworkToastContent(chainId);
      break;
    case TxErrorType.UserDenied:
      failMsg = t`Transaction was cancelled.`;
      break;
    case TxErrorType.Slippage:
      failMsg = t`The mark price has changed, consider increasing your Allowed Slippage by clicking on the "..." icon next to your address.`;
      break;
    case TxErrorType.RpcError: {
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
          {additionalContent}
          <br />
          <br />
          {message && <ToastifyDebug error={message} />}
        </div>
      );
  }

  return { failMsg, autoCloseToast };
}

export const INVALID_NETWORK_TOAST_ID = "invalid-network";

export function getInvalidNetworkToastContent(chainId: number) {
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

export async function validateSignerAddress(signer: Signer, receiverAddress: string) {
  const signerAddress = await signer.getAddress();

  if (signerAddress !== receiverAddress) {
    helperToast.error(
      <Trans>
        <div>Error submitting order.</div>
        <br />
        <div>Signer address does not match receiver address.</div>
        <br />
        <div>Please reload the page and try again.</div>
      </Trans>
    );
    throw new Error("Signer address does not match account address");
  }
}
