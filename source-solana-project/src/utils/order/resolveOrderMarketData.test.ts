import { PublicKey } from '@solana/web3.js';

import { resolveOrderMarketData } from './resolveOrderMarketData';

const marketTokenAddress = new PublicKey('11111111111111111111111111111111');
const order = { marketTokenAddress };
const indexTokenAddress = 'index-token-address';

describe('resolveOrderMarketData', () => {
  it('is not ready before the market arrives', () => {
    expect(resolveOrderMarketData(order, new Map(), new Map())).toMatchObject({
      indexTokenAddress: undefined,
      ticker: undefined,
      isReady: false,
    });
  });

  it('is not ready before the ticker arrives', () => {
    const marketsMap = new Map<string, unknown>([
      [marketTokenAddress.toBase58(), { indexToken: indexTokenAddress }],
    ]);

    expect(resolveOrderMarketData(order, marketsMap, new Map())).toMatchObject({
      indexTokenAddress,
      ticker: undefined,
      isReady: false,
    });
  });

  it('returns the shared market context when all display data is ready', () => {
    const ticker = { price: '65000' };
    const marketsMap = new Map<string, unknown>([
      [marketTokenAddress.toBase58(), { indexToken: indexTokenAddress }],
    ]);
    const tokenPriceMap = new Map([[indexTokenAddress, ticker]]);

    expect(resolveOrderMarketData(order, marketsMap, tokenPriceMap)).toEqual({
      marketTokenAddress: marketTokenAddress.toBase58(),
      indexTokenAddress,
      ticker,
      isReady: true,
    });
  });
});
