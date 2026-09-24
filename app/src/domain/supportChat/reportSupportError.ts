import { datadogRum } from '@datadog/browser-rum';
import { appVersion } from '@/config/buildInfo';
import { getSupportErrorMessage } from './supportRequest';
import { SupportError } from './tradingErrorTracker';

export function reportSupportError(error: SupportError, debugLogId: string) {
  datadogRum.addError(
    error.errorData instanceof Error
      ? error.errorData
      : new Error(getSupportErrorMessage(error.errorData)),
    {
      event: 'support.debugLog',
      debugLogId,
      actionName: error.actionName,
      collateral: error.collateral,
      market: error.market,
      signatures: error.signatures,
      errorData: error.errorData,
      walletAddress: error.walletAddress,
      walletProvider: error.walletProvider,
      network: error.network,
      errorTimestamp: error.timestamp,
      version: appVersion,
      route: window.location.pathname,
    }
  );
}
