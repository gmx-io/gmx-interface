import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getChainName } from "config/chains";
import { BaseContract, Overrides, Provider, Signer, TransactionRequest } from "ethers";
import { helperToast } from "lib/helperToast";
import { ErrorEvent } from "lib/metrics";
import { emitMetricEvent } from "lib/metrics/emitMetricEvent";
import { ErrorLike, parseError } from "lib/parseError";
import { mustNeverExist } from "lib/types";
import { switchNetwork } from "lib/wallets";
import { Link } from "react-router-dom";
import { getNativeToken } from "sdk/configs/tokens";

export enum TxErrorType {
  NotEnoughFunds = "NOT_ENOUGH_FUNDS",
  UserDenied = "USER_DENIED",
  Slippage = "SLIPPAGE",
  RpcError = "RPC_ERROR",
  NetworkChanged = "NETWORK_CHANGED",
  Expired = "EXPIRED",
}

type ErrorPattern = { msg?: string; code?: number };

const TX_ERROR_PATTERNS: { [key in TxErrorType]: ErrorPattern[] } = {
  [TxErrorType.NotEnoughFunds]: [
    { msg: "insufficient funds for gas" },
    { msg: "not enough funds for gas" },
    { msg: "failed to execute call with revert code InsufficientGasFunds" },
  ],
  [TxErrorType.UserDenied]: [
    { msg: "User denied transaction signature" },
    { msg: "User rejected" },
    { msg: "user rejected action" },
    { msg: "ethers-user-denied" },
    { msg: "User canceled" },
    { msg: "Signing aborted by user" },
  ],
  [TxErrorType.Slippage]: [
    { msg: "Router: mark price lower than limit" },
    { msg: "Router: mark price higher than limit" },
  ],
  [TxErrorType.NetworkChanged]: [{ msg: "network changed" }, { msg: "Invalid network" }],
  [TxErrorType.Expired]: [{ msg: "Request expired" }],
  [TxErrorType.RpcError]: [
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

const UNRECOGNIZED_ERROR_PATTERNS: ErrorPattern[] = [
  { msg: "header not found" },
  { msg: "cannot query unfinalized data" },
  { msg: "could not coalesce error" },
  { msg: "Internal JSON RPC error" },
];

export type TxError = {
  message?: string;
  code?: number;
  data?: any;
  error?: any;
};

export function extractError(ex: TxError): [string, TxErrorType | null, any] | [] {
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
        return [message, type as TxErrorType, ex.data];
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

  const shouldCallStatic = UNRECOGNIZED_ERROR_PATTERNS.some((pattern) => {
    const isMessageMatch =
      pattern.msg &&
      errorData?.errorMessage &&
      errorData.errorMessage.toLowerCase().includes(pattern.msg.toLowerCase());

    return isMessageMatch;
  });

  if (shouldCallStatic) {
    return "tryCallStatic";
  }

  const shouldEstimateGas = errorData?.errorStack && errorData.errorStack.includes("estimateGas");

  if (shouldEstimateGas) {
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
    await provider.call(txnData);
    return { txnData };
  } catch (error) {
    (error as ErrorLike).errorSource = "getCallStaticError";

    return { error, txnData };
  }
}

export function makeTransactionErrorHandler(
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
          const { error: callStaticError } = await getCallStaticError(contract.runner!.provider!, {
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

      emitMetricEvent<ErrorEvent>({
        event: "error",
        isError: true,
        data: errorToLog,
      });
    }

    additionalValidation();

    throw error;
  };
}
