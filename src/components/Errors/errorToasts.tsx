import { t, Trans } from "@lingui/macro";
import { Signer } from "ethers";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ContractsChainId, getChainName, getGasPricePremium } from "config/chains";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getExecutionFeeBufferBps, getMinimumExecutionFeeBufferBps } from "domain/synthetics/fees/utils/executionFee";
import { ErrorData } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { formatPercentage } from "lib/numbers";
import { switchNetwork } from "lib/wallets";
import { getNativeToken } from "sdk/configs/tokens";
import { extractTxnError, TxError, TxErrorType } from "sdk/utils/errors/transactionsErrors";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

import { getContractErrorToastContent } from "./getContractErrorToastContent";

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
        <div>Order failed: wallet address mismatch</div>
        <br />
        <div>Refresh and retry</div>
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
        <Trans>External swap temporarily disabled. Try again</Trans>
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

  const contractErrorMessage = getContractErrorToastContent({ chainId, errorData, slippageInputId });
  if (contractErrorMessage) {
    toastParams.errorContent = contractErrorMessage;
    return toastParams;
  }

  switch (errorData.txErrorType) {
    case TxErrorType.NotEnoughFunds:
      toastParams.errorContent = (
        <Trans>
          Insufficient {nativeToken.symbol} for gas on {getChainName(chainId)}
          <br />
          <br />
          <Link className="underline" to="/buy_gmx#bridge">
            Buy or transfer {nativeToken.symbol} to {getChainName(chainId)}
          </Link>
        </Trans>
      );
      break;
    case TxErrorType.NetworkChanged:
      toastParams.errorContent = getInvalidNetworkToastContent(chainId);
      break;
    case TxErrorType.UserDenied:
      toastParams.errorContent = t`Transaction canceled`;
      break;
    case TxErrorType.Slippage:
      toastParams.errorContent = t`Mark price changed. Increase allowed slippage`;
      break;
    case TxErrorType.RpcError: {
      toastParams.autoCloseToast = false;

      toastParams.errorContent = (
        <div>
          <Trans>
            RPC error.
            <br />
            <br />
            Enable{" "}
            <Button variant="link" className="link-underline" onClick={() => setIsSettingsVisible?.(true)}>
              Express Trading
            </Button>{" "}
            in settings for better reliability.
          </Trans>
          <br />
          <br />
          <Trans>
            Or update your wallet's RPC via <ExternalLink href="https://chainlist.org">chainlist.org</ExternalLink>
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

function getDefaultErrorMessage(errorData: ErrorData | undefined) {
  if (errorData?.errorContext === "simulation") {
    return t`Order simulation failed`;
  }

  return t`Transaction failed`;
}

function getDebugErrorMessage(errorData: ErrorData | undefined) {
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
          Insufficient {nativeToken.symbol} for gas on {getChainName(chainId)}
          <br />
          <br />
          <Link className="underline" to="/buy_gmx#bridge">
            Buy or transfer {nativeToken.symbol} to {getChainName(chainId)}
          </Link>
        </Trans>
      );
      break;
    case TxErrorType.NetworkChanged:
      failMsg = getInvalidNetworkToastContent(chainId);
      break;
    case TxErrorType.UserDenied:
      failMsg = t`Transaction canceled`;
      break;
    case TxErrorType.Slippage:
      failMsg = t`Mark price changed. Increase allowed slippage`;
      break;
    case TxErrorType.RpcError: {
      autoCloseToast = false;

      const originalError = errorData?.error?.message || errorData?.message || message;

      failMsg = (
        <div>
          <Trans>
            RPC error. Update your wallet's RPC via{" "}
            <ExternalLink href="https://chainlist.org">chainlist.org</ExternalLink>.{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading#rpc-urls">Read more</ExternalLink>
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
export const NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID = "non-eoa-account-chain-warning";

export function getInvalidNetworkToastContent(chainId: number) {
  return (
    <Trans>
      <div>Wallet not connected to {getChainName(chainId)}</div>
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
      <div>Smart wallets not supported on {getChainName(chainId)}</div>
      <br />
      <div>Switch to a different network or use an EOA wallet</div>
    </Trans>
  );
}

export function InvalidSignatureToastContent() {
  const { setFeedbackModalVisible, setIsSettingsVisible } = useSettings();

  return (
    <div>
      <Trans>
        Invalid signature.
        <br />
        <br />
        Try a different wallet provider, or switch to Classic or One-Click Trading in{" "}
        <span className="clickable underline" onClick={() => setIsSettingsVisible(true)}>
          settings
        </span>
      </Trans>
      <br />
      <br />
      <div className="clickable underline" onClick={() => setFeedbackModalVisible(true)}>
        <Trans>Report issue</Trans>
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
    premium: getGasPricePremium(chainId as ContractsChainId) || 0n,
    gasLimit: estimatedExecutionGasLimit,
  });

  const bufferText =
    requiredBufferBps !== undefined ? t`to ${formatPercentage(requiredBufferBps, { displayDecimals: 0 })} ` : t``;

  const settingsLink = (
    <div className="inline-block cursor-pointer underline" onClick={() => setIsSettingsVisible(true)}>
      <Trans>settings</Trans>
    </div>
  );

  const suggestText = shouldOfferExpress ? (
    <Trans>
      Enable{" "}
      <span className="inline-block cursor-pointer underline" onClick={() => setIsSettingsVisible(true)}>
        Express Trading
      </span>{" "}
      in settings for better reliability.
      <br />
      <br />
      Or increase the max network fee buffer {bufferText} in {settingsLink}.
    </Trans>
  ) : (
    <Trans>
      Increase the max network fee buffer to {formatPercentage(requiredBufferBps, { displayDecimals: 0 })} in{" "}
      {settingsLink}
    </Trans>
  );

  return (
    <div>
      <Trans>
        Execution fee validation failed.
        <br />
        <br />
        {suggestText}
        <br />
        <br />
        <ExternalLink href={txUrl}>View status</ExternalLink>
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
      <div>Invalid permit signature. Try again</div>
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
          <div>Order failed: wallet address mismatch</div>
          <br />
          <div>Refresh and retry</div>
        </Trans>
      );
    }

    throw new Error(signerAddressError);
  }
}
