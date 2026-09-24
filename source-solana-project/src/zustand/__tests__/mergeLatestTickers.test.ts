import { mergeLatestTickers } from '../mergeLatestTickers';

jest.mock('@/config/program', () => ({
  isAlwaysOpenTokenBySymbol: (symbol: string) =>
    ['XAU', 'XAG', 'WTI', 'XCU', 'XPT', 'XPD'].includes(symbol),
}));

describe('mergeLatestTickers', () => {
  it('does not roll a symbol back when an older update arrives later', () => {
    const current = [
      { symbol: 'XAU', price: '438132500000000000000000', timestamp: 1786916585 },
    ];
    const incoming = [
      { symbol: 'XAU', price: '437656500000000000000000', timestamp: 1786916584 },
    ];

    expect(mergeLatestTickers(current, incoming)).toEqual(current);
  });

  it('keeps the first price when duplicate timestamps disagree', () => {
    const current = [{ symbol: 'XAU', price: '4381.325', timestamp: 100 }];
    const incoming = [{ symbol: 'XAU', price: '4376.565', timestamp: 100 }];

    expect(mergeLatestTickers(current, incoming)).toEqual(current);
  });

  it('does not replace an oracle range with a newer point-in-time candle price', () => {
    const current = [
      {
        symbol: 'XAU',
        price: '438132500000000000000000',
        minUnitPrice: '4381320000000000',
        maxUnitPrice: '4381330000000000',
        timestamp: 100,
      },
    ];
    const incoming = [
      {
        symbol: 'XAU',
        price: '437656500000000000000000',
        minUnitPrice: '4376565000000000',
        maxUnitPrice: '4376565000000000',
        timestamp: 101,
      },
    ];

    expect(mergeLatestTickers(current, incoming)).toEqual(current);
  });

  it('allows an oracle range to replace an initial point-in-time price', () => {
    const incoming = {
      symbol: 'XAU',
      price: '438132500000000000000000',
      minUnitPrice: '4381320000000000',
      maxUnitPrice: '4381330000000000',
      timestamp: 101,
    };

    expect(
      mergeLatestTickers(
        [
          {
            symbol: 'XAU',
            price: '437656500000000000000000',
            minUnitPrice: '4376565000000000',
            maxUnitPrice: '4376565000000000',
            timestamp: 100,
          },
        ],
        [incoming]
      )
    ).toEqual([incoming]);
  });

  it.each(['XAU', 'XAG', 'WTI', 'XPT', 'XPD'])(
    'does not publish an initial %s candle price as a socket ticker',
    (symbol) => {
      expect(
        mergeLatestTickers([], [
          {
            symbol,
            price: '437656500000000000000000',
            minUnitPrice: '4376565000000000',
            maxUnitPrice: '4376565000000000',
            timestamp: 100,
          },
        ])
      ).toEqual([]);
    }
  );

  it('keeps the initial XCU point price ticker', () => {
    const ticker = {
      symbol: 'XCU',
      price: '6704500000000000000',
      minUnitPrice: '6704500000000000',
      maxUnitPrice: '6704500000000000',
      timestamp: 100,
    };

    expect(mergeLatestTickers([], [ticker])).toEqual([ticker]);
  });

  it('keeps publishing initial candle prices for non-24/7 markets', () => {
    const ticker = {
      symbol: 'SOL',
      price: '18000000000000000000000',
      minUnitPrice: '1800000000000000',
      maxUnitPrice: '1800000000000000',
      timestamp: 100,
    };

    expect(mergeLatestTickers([], [ticker])).toEqual([ticker]);
  });

  it('accepts newer updates independently for each symbol', () => {
    expect(
      mergeLatestTickers(
        [
          { symbol: 'XAU', price: '4381', timestamp: 100 },
          { symbol: 'SOL', price: '180', timestamp: 100 },
        ],
        [
          { symbol: 'XAU', price: '4382', timestamp: 101 },
          { symbol: 'SOL', price: '179', timestamp: 99 },
        ]
      )
    ).toEqual([
      { symbol: 'XAU', price: '4382', timestamp: 101 },
      { symbol: 'SOL', price: '180', timestamp: 100 },
    ]);
  });

  it('preserves replacement behavior when timestamps are unavailable', () => {
    expect(
      mergeLatestTickers(
        [{ symbol: 'XAU', price: '4381' }],
        [{ symbol: 'XAU', price: '4382' }]
      )
    ).toEqual([{ symbol: 'XAU', price: '4382' }]);
  });

  it('does not retain symbols omitted by the latest snapshot', () => {
    expect(
      mergeLatestTickers(
        [
          { symbol: 'XAU', price: '4381', timestamp: 100 },
          { symbol: 'SOL', price: '180', timestamp: 100 },
        ],
        [{ symbol: 'XAU', price: '4382', timestamp: 101 }]
      )
    ).toEqual([{ symbol: 'XAU', price: '4382', timestamp: 101 }]);
  });
});
