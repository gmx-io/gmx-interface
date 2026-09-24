import { getSupportChatNetwork } from '../utils';

describe('support chat network', () => {
  it.each([
    ['5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d', 'Solana Mainnet'],
    ['EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', 'Solana Devnet'],
    ['4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY', 'Solana Testnet'],
  ])('identifies the RPC network from genesis hash %s', (hash, network) => {
    expect(getSupportChatNetwork(hash)).toBe(network);
  });

  it.each([
    undefined,
    'custom-network-genesis',
    'https://rpc.example/?api-key=secret',
  ])(
    'does not guess a network or expose an RPC URL for %s',
    (hash) => {
      expect(getSupportChatNetwork(hash)).toBeUndefined();
    }
  );
});
