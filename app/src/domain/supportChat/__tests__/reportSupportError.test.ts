jest.mock('@datadog/browser-rum', () => ({
  datadogRum: { addError: jest.fn() },
}));
jest.mock('@/config/buildInfo', () => ({ appVersion: 'test-version' }));

import { datadogRum } from '@datadog/browser-rum';
import { reportSupportError } from '../reportSupportError';
import { buildSupportRequest } from '../supportRequest';
import { SupportError } from '../tradingErrorTracker';

describe('support debug logs', () => {
  it('correlates the prefilled request with the original error and context', () => {
    const previousWindow = Object.getOwnPropertyDescriptor(
      globalThis,
      'window'
    );
    Object.defineProperty(globalThis, 'window', {
      value: { location: { pathname: '/trade' } },
      configurable: true,
    });
    try {
      const error: SupportError = {
        actionName: 'Swap',
        errorData: new Error('RPC failed'),
        walletAddress: 'wallet-a',
        network: 'mainnet',
        signatures: ['tx-a'],
        timestamp: 123,
      };
      reportSupportError(error, 'debug-123');
      expect(datadogRum.addError).toHaveBeenCalledWith(
        error.errorData,
        expect.objectContaining({
          event: 'support.debugLog',
          debugLogId: 'debug-123',
          actionName: 'Swap',
          walletAddress: 'wallet-a',
          signatures: ['tx-a'],
          route: '/trade',
          version: 'test-version',
        })
      );
      expect(buildSupportRequest(error, 'debug-123')).toContain(
        'Debug Log ID: debug-123'
      );
    } finally {
      if (previousWindow)
        Object.defineProperty(globalThis, 'window', previousWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
