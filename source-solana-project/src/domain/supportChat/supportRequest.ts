import { SupportError } from './tradingErrorTracker';

export function buildSupportRequest(error: SupportError, debugLogId: string) {
  return [
    'GMTrade Support Request',
    '',
    `Action: ${error.actionName}`,
    ...(error.collateral ? [`Collateral: ${error.collateral}`] : []),
    ...(error.market ? [`Market: ${error.market}`] : []),
    `Wallet address: ${error.walletAddress ?? 'Not connected'}`,
    `Wallet Provider: ${error.walletProvider ?? 'Not connected'}`,
    `Connected Network: ${error.network ?? 'Unknown'}`,
    ...(error.signatures?.length
      ? [`Transaction signatures: ${error.signatures.join(', ')}`]
      : []),
    `Error: ${getSupportErrorMessage(error.errorData)}`,
    `Debug Log ID: ${debugLogId}`,
    '',
    '*** Please describe what happened and any additional details that may help us investigate ***',
  ].join('\n');
}

export function getSupportErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Transaction failed';
}
