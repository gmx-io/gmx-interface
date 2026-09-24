import { buildSupportRequest } from '../supportRequest';

describe('support request message', () => {
  it('includes the failed operation and its log correlation ID', () => {
    const message = buildSupportRequest(
      {
        actionName: 'Close Position',
        collateral: 'USDC',
        walletAddress: 'wallet-a',
        walletProvider: 'Phantom',
        network: 'mainnet',
        signatures: ['tx-a'],
        errorData: new Error('Simulation failed'),
        timestamp: 123,
      },
      'debug-123'
    );
    for (const value of [
      'Close Position',
      'USDC',
      'wallet-a',
      'Phantom',
      'mainnet',
      'tx-a',
      'Simulation failed',
      'Debug Log ID: debug-123',
    ]) {
      expect(message).toContain(value);
    }
    expect(message).not.toContain('Metric ID');
    expect(message).not.toContain('Request ID');
  });

  it('does not invent a signature when signing or submission failed', () => {
    const message = buildSupportRequest(
      { actionName: 'Swap', timestamp: 123 },
      'debug-123'
    );
    expect(message).not.toContain('Transaction signatures:');
    expect(message).toContain('Wallet address: Not connected');
  });
});
