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
