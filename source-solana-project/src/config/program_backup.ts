import { parseTokens } from '@/utils/legacy/parse';
import { PublicKey } from '@solana/web3.js';

export const GMX_SOLANA_STORE_ADDRESS = new PublicKey(
  'CTDLvGGXnoxvqLyTpGzdGLg9pD6JexKxKXSV8tqqo8bN'
);
export const GMX_SOLANA_CONFIG_ADDRESS = new PublicKey(
  '55tVJJu5En1u4Vizh8yKbe9P6TtAx8BB6nqhFMQt4aB'
);
export const GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS = new PublicKey(
  '4tf9zEjvj2BUR9ZaAr53sQdULDWGGpJTr2zngSrmjtN6'
);

export const GMX_SOLANA_MARKET_TOKENS = [
  new PublicKey('85UW4pE5L1QBCGg2vadJJk5JWQUc3iFNDE1xtrQqr2Vk'),
  new PublicKey('C9MoDptpk6hS8izXiPvJnd6pFShBCRPSpb7FGfvdiboQ'),
  new PublicKey('7VuNcy1A22rYfiaqaqbGZr9z9PmmahAsc6RNET165GiW'),
  new PublicKey('338dwWNqFoXsaw8UzGjVnxqzvrfLWqtMTSUSeZXwaQnY'),
  new PublicKey('B5ZqfnTzrG8odZxYMmBWfZbubAhSPaPcAF2JqT3g9vWC'),
  new PublicKey('4pMNdMykwTwwU8qoR4awCsLEKSsm46QkXZAS51oZyuMf'),
  new PublicKey('HrNo9f2sFss7hkriWMBUHr45fmqnjqa2aVTGTRRxbxqx'),
  new PublicKey('5sdFW7wrKsxxYHMXoqDmNHkGyCWsbLEFb1x1gzBBm4Hx'),
  new PublicKey('nkyxUp1fRzYwTNPZssugpAAR9UCHuLhJMkmXCYiqkh2'),
  new PublicKey('HsvSQBLM1oG4Gy7gyBw4fB8yAXFSyCTprfhkgtk94LUZ'),
  new PublicKey('DW5b4UTdehnn55imWMW1VDe1TzZ9W1PgDZahWa1XQwRx'),
  new PublicKey('Ht4RdPf3bJYLUhJv2hTdZQ4WsoAuW44zyPGhiuqiJjnp'),
  new PublicKey('4uRCqRuTPZTtr1nH6V1wYdX4nPg6Cs5agqj3iT7W7J64'),
  new PublicKey('9ZTju81nuFZ3XZGShyJnnyh3mf9CQNmKNsjL7RnkDE9W'),
  new PublicKey('xiLDzynfr7JEoYinAEunZtdz9ubjVAqa5Ap7gJ9y43L'),
  new PublicKey('2zyCufMw25kyGypeZseSJZK3KNeYKHPYPzhZWukeUTsX'),
];

export const GMX_SOLANA_GLV_TOKENS = [
  new PublicKey('7r3XADNMW12k8QiLPaFjW1giYMJNZzUjmDA5HiK7hAPu'),
];

const GMX_SOLANA_TOKENS_RAW = {
  '11111111111111111111111111111111': {
    symbol: 'SOL',
    decimals: 9,
    decimals_gmx: 9,
    wrappedAddress: 'So11111111111111111111111111111111111111112',
    isNative: true,
    isSynthetic: true,
  },
  So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH: {
    symbol: 'SOL',
    decimals: 9,
    decimals_gmx: 9,
    wrappedAddress: 'So11111111111111111111111111111111111111112',
    isNative: true,
  },
  So11111111111111111111111111111111111111112: {
    symbol: 'WSOL',
    decimals: 9,
    decimals_gmx: 9,
  },
  UsdsBvJe6sPKBzZhEo9bDDVg6d3695gJonz9eVSAUpP: {
    symbol: 'USDC',
    decimals: 6,
    decimals_gmx: 6,
    isStable: true,
  },
  wif68Xs36aEz4eVrpKvpUUdcfMn5mPPE9yHRXzX7NGA: {
    symbol: 'WIF',
    decimals: 9,
    decimals_gmx: 6,
  },
  '1inkDh4FM7mvWQJ4s2xQReD34JWNpdiJqWxPcmsrBvS': {
    symbol: 'LINK',
    decimals: 8,
    decimals_gmx: 18,
  },
  btc5UQ1DtJdCZg12ZCdznjrHB7xc957NQsfjZp4xZx1: {
    symbol: 'BTC',
    decimals: 8,
    decimals_gmx: 8,
  },
  ethGTfH3DPUn8nSmUdfgdJHqJJyT41rRM2tjibFUSoG: {
    symbol: 'ETH',
    decimals: 8,
    decimals_gmx: 18,
  },
  bome449XB96C7J7u9HorwqUyh4qAyS4XjbpqNreTmYW: {
    symbol: 'BOME',
    decimals: 9,
    decimals_gmx: 6,
  },
  bonkpQke5XvuDfTwRAGv2LtDyB2Lsq41WNXpCZXZWVy: {
    symbol: 'BONK',
    decimals: 5,
    decimals_gmx: 5,
  },
  gmxNA9d2BkpQZ6xz2Cpm3si7cp6X5iAf9NxN1gwWtQW: {
    symbol: 'GMX',
    decimals: 8,
    decimals_gmx: 18,
  },
  me1avw1nR4F8TaJQfPZpAd5F9tBSAmooCxGdCXB3Vem: {
    symbol: 'MELANIA',
    decimals: 6,
    decimals_gmx: 6,
  },
  truMYnGqJqX3Be9LKqqBm218AsauUPcwW7QCgDSyPkF: {
    symbol: 'TRUMP',
    decimals: 6,
    decimals_gmx: 6,
  },
};

export const GMX_SOLANA_TOKENS = parseTokens(GMX_SOLANA_TOKENS_RAW);
