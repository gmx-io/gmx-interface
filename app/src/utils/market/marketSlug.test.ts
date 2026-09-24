jest.mock('@/config/program', () => ({
  GMX_SOLANA_TOKENS_RAW: {
    // Placeholder mint must not win SOL-USD mapping (insertion order first).
    '11111111111111111111111111111111': {
      displayMarketName: 'SOL/USD',
    },
    So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH: {
      displayMarketName: 'SOL/USD',
    },
    So11111111111111111111111111111111111111112: {
      displayMarketName: 'SOL/USD',
    },
    jpygxG9g45Lui4P3GQgfdfNSYcR9985HAcxBRPTHr66: {
      displayMarketName: 'USD/JPY',
    },
  },
}));

jest.mock('@/components/TradeBoxNew/utils/formatMarketName', () => ({
  formatMarketName: (token: string) => {
    const map: Record<string, string> = {
      So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH: 'SOL/USD',
      jpygxG9g45Lui4P3GQgfdfNSYcR9985HAcxBRPTHr66: 'USD/JPY',
    };
    return map[token];
  },
}));

jest.mock('@/config/tokens', () => ({
  NATIVE_TOKEN_ADDRESS: {
    toBase58: () => '11111111111111111111111111111111',
  },
  SOL_TOKEN_ADDRESS: {
    toBase58: () => 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH',
  },
}));

import {
  DEFAULT_TRADE_MARKET_SLUG,
  getCanonicalTradePath,
  getMarketSlugFromPathname,
  isBareTradePath,
  isTradePathname,
  marketNameToSlug,
  normalizeSlug,
  resolveSlugFromPathname,
  resolveSlugToIndexToken,
  slugToMarketName,
} from './marketSlug';

describe('marketSlug', () => {
  describe('marketNameToSlug', () => {
    it('converts SOL/USD to SOL-USD', () => {
      expect(marketNameToSlug('SOL/USD')).toBe('SOL-USD');
    });

    it('converts USD/JPY to USD-JPY', () => {
      expect(marketNameToSlug('USD/JPY')).toBe('USD-JPY');
    });
  });

  describe('slugToMarketName', () => {
    it('converts SOL-USD to SOL/USD', () => {
      expect(slugToMarketName('SOL-USD')).toBe('SOL/USD');
    });

    it('is case insensitive', () => {
      expect(slugToMarketName('sol-usd')).toBe('SOL/USD');
    });
  });

  describe('normalizeSlug', () => {
    it('uppercases slug segments', () => {
      expect(normalizeSlug('btc-usd')).toBe('BTC-USD');
    });
  });

  describe('path helpers', () => {
    it('detects trade pathnames', () => {
      expect(isTradePathname('/trade')).toBe(true);
      expect(isTradePathname('/trade/SOL-USD')).toBe(true);
      expect(isTradePathname('/trade/SOL-USD/extra')).toBe(true);
      expect(isTradePathname('/trades')).toBe(false);
    });

    it('detects bare trade path', () => {
      expect(isBareTradePath('/trade')).toBe(true);
      expect(isBareTradePath('/trade/')).toBe(true);
      expect(isBareTradePath('/trade/SOL-USD')).toBe(false);
    });

    it('extracts slug from pathname', () => {
      expect(getMarketSlugFromPathname('/trade/SOL-USD')).toBe('SOL-USD');
      expect(getMarketSlugFromPathname('/trade')).toBeNull();
    });

    it('builds canonical trade path', () => {
      expect(getCanonicalTradePath('sol-usd')).toBe('/trade/SOL-USD');
    });
  });

  describe('resolveSlugToIndexToken', () => {
    it('resolves SOL-USD to SOL mint', () => {
      expect(resolveSlugToIndexToken('SOL-USD')).toBe(
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
      );
    });

    it('resolves case-insensitive slugs', () => {
      expect(resolveSlugToIndexToken('sol-usd')).toBe(
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
      );
    });

    it('returns null for invalid slug', () => {
      expect(resolveSlugToIndexToken('INVALID-MARKET')).toBeNull();
    });
  });

  describe('resolveSlugFromPathname', () => {
    it('resolves index token from trade pathname', () => {
      expect(resolveSlugFromPathname('/trade/SOL-USD')).toBe(
        'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
      );
    });

    it('returns null for bare trade path', () => {
      expect(resolveSlugFromPathname('/trade')).toBeNull();
    });
  });

  it('uses SOL-USD as default slug', () => {
    expect(DEFAULT_TRADE_MARKET_SLUG).toBe('SOL-USD');
  });
});
