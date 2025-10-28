import { t, Trans } from "@lingui/macro";
import { Signer } from "ethers";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { getChainName } from "config/chains";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  getExecutionFeeBufferBps,
  getGasPremium,
  getMinimumExecutionFeeBufferBps,
} from "domain/synthetics/fees/utils/executionFee";
import { ErrorData } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { formatPercentage } from "lib/numbers";
import { switchNetwork } from "lib/wallets";
import { getNativeToken } from "sdk/configs/tokens";
import { CustomErrorName, extractTxnError, TxError, TxErrorType } from "sdk/utils/errors/transactionsErrors";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

export type AdditionalErrorParams = {
  additionalContent?: ReactNode;
  slippageInputId?: string;
  defaultMessage?: ReactNode;
  isInternalSwapFallback?: boolean;
  isPermitIssue?: boolean;
  setIsSettingsVisible?: (isVisible: boolean) => void;
};

export function getTxnErrorToast(
  chainId: number,
  errorData: ErrorData | undefined,
  {
    additionalContent,
    slippageInputId,
    defaultMessage = getDefaultErrorMessage(errorData),
    isInternalSwapFallback,
    isPermitIssue,
    setIsSettingsVisible,
  }: AdditionalErrorParams
) {
  const nativeToken = getNativeToken(chainId);

  const debugErrorMessage = getDebugErrorMessage(errorData);

  const toastParams: {
    autoCloseToast: number | false;
    errorContent: ReactNode | undefined;
  } = {
    autoCloseToast: TOAST_AUTO_CLOSE_TIME,
    errorContent: (
      <div>
        {defaultMessage}
        {additionalContent}
        <br />
        <br />
        {debugErrorMessage && <ToastifyDebug error={debugErrorMessage} />}
      </div>
    ),
  };

  if (!errorData) {
    return toastParams;
  }

  if (errorData.errorMessage === signerAddressError) {
    toastParams.errorContent = (
      <Trans>
        <div>Error submitting order.</div>
        <br />
        <div>Signer address does not match receiver address.</div>
        <br />
        <div>Please reload the page and try again.</div>
      </Trans>
    );

    return toastParams;
  }

  if (isInternalSwapFallback) {
    toastParams.errorContent = (
      <div>
        {defaultMessage}
        <br />
        <br />
        <Trans>External swap is temporarily disabled. Please try again.</Trans>
        <br />
        <br />
        {debugErrorMessage && <ToastifyDebug error={debugErrorMessage} />}
      </div>
    );

    return toastParams;
  }

  if (isPermitIssue) {
    toastParams.errorContent = getInvalidPermitSignatureToastContent();
  }

  if (
    errorData.contractError === CustomErrorName.OrderNotFulfillableAtAcceptablePrice ||
    errorData.contractError === CustomErrorName.InsufficientSwapOutputAmount
  ) {
    toastParams.errorContent = (
      <Trans>
        Order error. Prices are currently volatile for this market, try again by{" "}
        <span
          onClick={() => {
            if (slippageInputId) {
              document.getElementById(slippageInputId)?.focus();
            }
          }}
          className={slippageInputId ? "cursor-pointer underline" : undefined}
        >
          <Trans>increasing the allowed slippage</Trans>
        </span>{" "}
        under the execution details section.
      </Trans>
    );

    return toastParams;
  }

  switch (errorData.txErrorType) {
    case TxErrorType.NotEnoughFunds:
      toastParams.errorContent = (
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
      toastParams.errorContent = getInvalidNetworkToastContent(chainId);
      break;
    case TxErrorType.UserDenied:
      toastParams.errorContent = t`Transaction was cancelled.`;
      break;
    case TxErrorType.Slippage:
      toastParams.errorContent = t`The mark price has changed, consider increasing your allowed slippage by clicking on the "..." icon next to your address.`;
      break;
    case TxErrorType.RpcError: {
      toastParams.autoCloseToast = false;

      toastParams.errorContent = (
        <div>
          <Trans>
            Transaction failed due to RPC error.
            <br />
            <br />
            Please enable{" "}
            <Button variant="link" className="link-underline" onClick={() => setIsSettingsVisible?.(true)}>
              Express trading
            </Button>{" "}
            under settings, which should offer a better experience.
          </Trans>
          <br />
          <br />
          <Trans>
            Otherwise, try changing the RPC url in your wallet settings with the help of{" "}
            <ExternalLink href="https://chainlist.org">chainlist.org</ExternalLink>.
          </Trans>
          <br />
          <br />
          {debugErrorMessage && <ToastifyDebug error={debugErrorMessage} />}
        </div>
      );
      break;
    }
    default:
      break;
  }

  return toastParams;
}

export function getDefaultErrorMessage(errorData: ErrorData | undefined) {
  if (errorData?.errorContext === "simulation") {
    return t`Execute order simulation failed.`;
  }

  return t`Transaction failed`;
}

export function getDebugErrorMessage(errorData: ErrorData | undefined) {
  if (errorData?.contractError) {
    return `${errorData.contractError} [${errorData.contractErrorArgs}] ${errorData.errorMessage}`;
  }

  return errorData?.errorMessage;
}

/**
 * @deprecated Use `parseError` for retrieving error fields or
 */
export function getErrorMessage(
  chainId: number,
  ex: TxError,
  txnMessage?: string,
  additionalContent?: React.ReactNode
) {
  const [message, type, errorData] = extractTxnError(ex);
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
      failMsg = t`The mark price has changed, consider increasing your allowed slippage.`;
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
          {txnMessage || t`Transaction failed.`}
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
export const NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID = "non-eoa-account-chain-warning";

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

export function getNonEoaAccountChainWarningToastContent(chainId: number) {
  return (
    <Trans>
      <div>Smart wallets are not supported on {getChainName(chainId)}.</div>
      <br />
      <div>Please switch to a different network or use a EOA wallet.</div>
    </Trans>
  );
}

export function InvalidSignatureToastContent() {
  const { setFeedbackModalVisible, setIsSettingsVisible } = useSettings();

  return (
    <div>
      <Trans>
        Transaction failed due to invalid signature.
        <br />
        <br />
        Please try a different wallet provider, or switch to Classic or One-Click Trading mode within the{" "}
        <span className="clickable underline" onClick={() => setIsSettingsVisible(true)}>
          Settings.
        </span>
      </Trans>
      <br />
      <br />
      <div className="clickable underline" onClick={() => setFeedbackModalVisible(true)}>
        Report Issue.
      </div>
    </div>
  );
}

export function getInsufficientExecutionFeeToastContent({
  minExecutionFee,
  executionFee,
  chainId,
  executionFeeBufferBps,
  estimatedExecutionGasLimit,
  txUrl,
  errorMessage,
  shouldOfferExpress,
  setIsSettingsVisible,
}: {
  minExecutionFee: bigint;
  executionFee: bigint;
  chainId: number;
  executionFeeBufferBps: number | undefined;
  estimatedExecutionGasLimit: bigint;
  txUrl: string;
  errorMessage: string | undefined;
  shouldOfferExpress: boolean;
  setIsSettingsVisible: (isVisible: boolean) => void;
}) {
  const requiredBufferBps = getMinimumExecutionFeeBufferBps({
    minExecutionFee: minExecutionFee,
    estimatedExecutionFee: executionFee,
    currentBufferBps: getExecutionFeeBufferBps(chainId, executionFeeBufferBps),
    premium: getGasPremium(chainId),
    gasLimit: estimatedExecutionGasLimit,
  });

  const suggestText = shouldOfferExpress ? (
    <>
      Please{" "}
      <div className=" muted inline-block cursor-pointer underline" onClick={() => setIsSettingsVisible(true)}>
        enable Express trading
      </div>{" "}
      under settings, which should offer a better experience.
      <br />
      <br />
      Otherwise, try increasing the max network fee buffer to{" "}
      {formatPercentage(requiredBufferBps, { displayDecimals: 0 })} in{" "}
      <div className=" muted inline-block cursor-pointer underline" onClick={() => setIsSettingsVisible(true)}>
        settings
      </div>
      .
    </>
  ) : (
    <>
      Please try increasing the max network fee buffer to {formatPercentage(requiredBufferBps, { displayDecimals: 0 })}{" "}
      in{" "}
      <div className=" muted inline-block cursor-pointer underline" onClick={() => setIsSettingsVisible(true)}>
        settings
      </div>
      .
    </>
  );

  return (
    <div>
      <Trans>
        Transaction failed due to execution fee validation. <ExternalLink href={txUrl}>View</ExternalLink>.
        <br />
        <br />
        {suggestText}
      </Trans>
      <br />
      <br />
      {errorMessage && <ToastifyDebug error={errorMessage} />}
    </div>
  );
}

export const signerAddressError = "Signer address does not match account address";

export function getInvalidPermitSignatureToastContent() {
  return (
    <Trans>
      <div>Permit signature is invalid. Please try again.</div>
    </Trans>
  );
}

/**
 * @deprecated
 */
export async function validateSignerAddress(signer: Signer, receiverAddress: string, skipToast?: boolean) {
  const signerAddress = await signer.getAddress();

  if (signerAddress !== receiverAddress) {
    if (!skipToast) {
      helperToast.error(
        <Trans>
          <div>Error submitting order.</div>
          <br />
          <div>Signer address does not match receiver address.</div>
          <br />
          <div>Please reload the page and try again.</div>
        </Trans>
      );
    }

    throw new Error(signerAddressError);
  }
}
