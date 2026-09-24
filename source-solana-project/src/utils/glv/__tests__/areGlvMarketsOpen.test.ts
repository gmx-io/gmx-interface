import { areGlvMarketsOpen } from '../areGlvMarketsOpen';

describe('areGlvMarketsOpen', () => {
  it('returns true when every configured GM market is open', () => {
    const marketInfosMap = new Map([
      ['xag-market', { closed: false }],
      ['wti-market', { closed: false }],
    ]);

    expect(
      areGlvMarketsOpen(
        [
          { marketToken: 'xag-market' },
          { marketTokenAddress: 'wti-market' },
        ],
        marketInfosMap
      )
    ).toBe(true);
  });

  it('returns false when any configured GM market is closed', () => {
    const marketInfosMap = new Map([
      ['xag-market', { closed: false }],
      ['wti-market', { closed: true }],
    ]);

    expect(
      areGlvMarketsOpen(
        [
          { marketToken: 'xag-market' },
          { marketToken: 'wti-market' },
        ],
        marketInfosMap
      )
    ).toBe(false);
  });

  it('does not depend on a GM market balance', () => {
    const marketInfosMap = new Map([
      ['xag-market', { closed: false }],
      ['wti-market', { closed: true }],
    ]);

    expect(
      areGlvMarketsOpen(
        [
          { marketTokenAddress: 'xag-market', gmBalance: 100 },
          { marketTokenAddress: 'wti-market', gmBalance: 0 },
        ],
        marketInfosMap
      )
    ).toBe(false);
  });

  it.each([
    ['an empty member list', []],
    ['a missing member list', undefined],
    ['a member without an address', [{}]],
    ['a member with unavailable market state', [{ marketToken: 'unknown' }]],
  ])('returns false for %s', (_description, markets) => {
    expect(areGlvMarketsOpen(markets, new Map())).toBe(false);
  });
});
