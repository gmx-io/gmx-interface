import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { EXECUTION_FEE_CONFIG_V2, getChainName } from "config/chains";
import { BaseContract, Overrides, Provider, Signer, TransactionRequest } from "ethers";
import { helperToast } from "lib/helperToast";
import { ErrorEvent } from "lib/metrics";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import { ErrorLike, parseError } from "lib/parseError";
import { mustNeverExist } from "lib/types";
import { switchNetwork } from "lib/wallets";
import { Link } from "react-router-dom";
import { getNativeToken } from "sdk/configs/tokens";
import { extractError, TxError, TxErrorType, ErrorPattern } from "sdk/utils/contracts";

const UNRECOGNIZED_ERROR_PATTERNS: ErrorPattern[] = [
  { msg: "header not found" },
  { msg: "unfinalized data" },
  { msg: "could not coalesce error" },
  { msg: "Internal JSON RPC error" },
  { msg: "execution reverted" },
];

export function getErrorMessage(
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
      failMsg = getInvalidNetworkErrorMessage(chainId);
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

export function getIsUserRejectedError(errorType: TxErrorType) {
  return errorType === TxErrorType.UserDenied;
}

export function getIsUserError(errorType: TxErrorType) {
  return [TxErrorType.UserDenied, TxErrorType.NetworkChanged, TxErrorType.Expired, TxErrorType.NotEnoughFunds].includes(
    errorType
  );
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

export function extractDataFromError(errorMessage: unknown) {
  if (typeof errorMessage !== "string") return null;

  const pattern = /data="([^"]+)"/;
  const match = errorMessage.match(pattern);

  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export function getAdditionalValidationType(error: Error) {
  const errorData = parseError(error);

  const shouldTryCallStatic = UNRECOGNIZED_ERROR_PATTERNS.some((pattern) => {
    const isMessageMatch =
      pattern.msg &&
      errorData?.errorMessage &&
      errorData.errorMessage.toLowerCase().includes(pattern.msg.toLowerCase());

    return isMessageMatch;
  });

  if (shouldTryCallStatic) {
    return "tryCallStatic";
  }

  const shouldTryEstimateGas = errorData?.errorStack && errorData.errorStack.includes("estimateGas");

  if (shouldTryEstimateGas) {
    return "tryEstimateGas";
  }

  return undefined;
}

export function getEstimateGasError(contract: BaseContract, method: string, params: any[], txnOpts: Overrides) {
  return contract[method]
    .estimateGas(...params, txnOpts)
    .then(() => {
      return undefined;
    })
    .catch((error) => {
      (error as ErrorLike).errorSource = "getEstimateGasError";
      return error;
    });
}

export async function getCallStaticError(
  chainId: number,
  provider: Provider,
  txnData?: TransactionRequest,
  txnHash?: string
): Promise<{ error?: ErrorLike; txnData?: TransactionRequest }> {
  // if txnData is not provided, try to fetch it from blockchain by txnHash
  if (!txnData && txnHash) {
    try {
      txnData = (await provider.getTransaction(txnHash)) || undefined;
    } catch (error) {
      return { error };
    }
  }

  if (!txnData) {
    const error = new Error("missed transaction data");
    (error as ErrorLike).errorSource = "getTransaction";

    return { error };
  }

  try {
    const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId];

    if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
      delete txnData.gasPrice;
    } else {
      delete txnData.maxPriorityFeePerGas;
      delete txnData.maxFeePerGas;
    }

    await provider.call(txnData);
    return { txnData };
  } catch (error) {
    (error as ErrorLike).errorSource = "getCallStaticError";

    return { error, txnData };
  }
}

export function makeTransactionErrorHandler(
  chainId: number,
  contract: BaseContract,
  method: string,
  params: any[],
  txnOpts: Overrides,
  from: string
) {
  return async (error) => {
    async function additionalValidation() {
      const additionalValidationType = getAdditionalValidationType(error);

      if (!additionalValidationType) {
        return;
      }

      let errorToLog: ErrorLike = error;

      switch (additionalValidationType) {
        case "tryCallStatic": {
          const { error: callStaticError } = await getCallStaticError(chainId, contract.runner!.provider!, {
            data: contract.interface.encodeFunctionData(method, params),
            to: await contract.getAddress(),
            from,
            ...txnOpts,
          });

          if (callStaticError) {
            callStaticError.parentError = errorToLog;
            errorToLog = callStaticError;
          } else {
            errorToLog.isAdditinalValidationPassed = true;
          }

          errorToLog.additionalValidationType = "tryCallStatic";

          break;
        }

        case "tryEstimateGas": {
          const { error: estimateGasError } = await getEstimateGasError(contract, method, params, txnOpts);

          if (estimateGasError) {
            estimateGasError.parentError = errorToLog;
            errorToLog = estimateGasError;
          } else {
            errorToLog.isAdditinalValidationPassed = true;
          }

          errorToLog.additionalValidationType = "tryEstimateGas";

          break;
        }

        default:
          mustNeverExist(additionalValidationType);
      }

      const errorData = parseError(errorToLog);

      emitMetricEvent<ErrorEvent>({
        event: "error",
        isError: true,
        data: errorData || {},
      });
    }

    additionalValidation();

    throw error;
  };
}
