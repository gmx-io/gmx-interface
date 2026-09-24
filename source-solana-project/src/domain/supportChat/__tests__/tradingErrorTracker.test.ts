import {
  TradingErrorTracker,
  isUserRejectedError,
} from '../tradingErrorTracker';

describe('trading support error tracking', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(0));
  afterEach(() => jest.useRealTimers());

  it('requires two distinct failures within two minutes', () => {
    const tracker = new TradingErrorTracker();
    tracker.reportError({
      actionName: 'Swap',
      errorData: new Error('RPC failed'),
    });
    expect(tracker.shouldSuggestSupport()).toBe(false);
    jest.advanceTimersByTime(119999);
    tracker.reportError({
      actionName: 'Close Position',
      errorData: new Error('Simulation failed'),
    });
    expect(tracker.shouldSuggestSupport()).toBe(true);
    jest.advanceTimersByTime(1);
    expect(tracker.shouldSuggestSupport()).toBe(false);
  });

  it.each([
    { code: 4001 },
    new Error('User rejected the request.'),
    new Error('User denied transaction signature'),
    { error: { code: 4001 } },
    { cause: new Error('Transaction cancelled by user') },
    { isUserRejectedError: true },
  ])('does not count user rejection: %p', (errorData) => {
    const tracker = new TradingErrorTracker();
    tracker.reportError({
      actionName: 'Swap',
      errorData: new Error('RPC failed'),
    });
    expect(
      tracker.reportError({ actionName: 'Swap', errorData })
    ).toBeUndefined();
    expect(tracker.shouldSuggestSupport()).toBe(false);
  });

  it('does not mistake a program rejection for a user rejection', () => {
    expect(
      isUserRejectedError(new Error('Transaction rejected by program'))
    ).toBe(false);
    const error = { cause: undefined as unknown };
    error.cause = error;
    expect(isUserRejectedError(error)).toBe(false);
  });

  it('deduplicates nested handlers and repeated transaction status reports', () => {
    const tracker = new TradingErrorTracker();
    const errorData = new Error('Transaction failed');
    const first = tracker.reportError({
      actionName: 'Swap',
      errorData,
      errorId: 'signature',
    });
    expect(tracker.reportError({ actionName: 'Swap', errorData })).toBe(first);
    expect(
      tracker.reportError({ actionName: 'Swap', errorId: 'signature' })
    ).toBe(first);
    expect(tracker.shouldSuggestSupport()).toBe(false);
  });

  it('keeps the context of each notice when the wallet changes', () => {
    const tracker = new TradingErrorTracker();
    tracker.setContext({ walletAddress: 'wallet-a', network: 'mainnet' });
    const first = tracker.reportError({ actionName: 'Swap' });
    tracker.setContext({ walletAddress: 'wallet-b', network: 'devnet' });
    tracker.reportError({ actionName: 'Close Position' });
    expect(first).toMatchObject({
      walletAddress: 'wallet-a',
      network: 'mainnet',
      actionName: 'Swap',
    });
  });
});
