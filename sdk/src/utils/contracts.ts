export enum TxErrorType {
  NotEnoughFunds = "NOT_ENOUGH_FUNDS",
  UserDenied = "USER_DENIED",
  Slippage = "SLIPPAGE",
  RpcError = "RPC_ERROR",
  NetworkChanged = "NETWORK_CHANGED",
  Expired = "EXPIRED",
}

export type ErrorPattern = { msg?: string; code?: number };

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
