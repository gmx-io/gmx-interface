import {
  GLV_COMMODITY_TOKEN,
  GLV_FOREX_TOKEN,
  GLV_STOCK_TOKEN,
} from '@/utils/glv/glvTokens';

export const GLV_TOKEN_TO_ACCOUNT: Record<string, string> = {
  '7r3XADNMW12k8QiLPaFjW1giYMJNZzUjmDA5HiK7hAPu':
    'fh3nAdi3P4tYKssVX9AAh9ZmMnek497qz6hPKKL1DPQ',
  '7uwzUKKbXHNmpC5x67apE7JgAmPoWWQpCf7jJZRTqjMk':
    'FFht5uQqaopvmCYCyxoDaScGNoQGwZjPw7Qu3w8GCnaT',
  [GLV_STOCK_TOKEN]: 'DWkWTYb8otwdhkRG6enJXyizia95nRp2v23MhaTFmRnS',
  HhVNkJ9EWi64j645aVfnNBqXguXvhvKHk7wRnS4wAYmz:
    '9qKxKw8jnTmAY3kTHHipwyfp3B4kZGLjPhTghbcz6Wvs',
  [GLV_COMMODITY_TOKEN]: '3KyZda3udrMpULGgk7pVqJbLALYPFD3gJDUgNSeYZdPm',
  [GLV_FOREX_TOKEN]: 'EtLsc9Aa7JQTSme3TLSTZrDkvSR48ez4gZDr6B7YpbTg',
};

export const GLV_ACCOUNT_TO_TOKEN: Record<string, string> = Object.fromEntries(
  Object.entries(GLV_TOKEN_TO_ACCOUNT).map(([token, account]) => [account, token])
);
