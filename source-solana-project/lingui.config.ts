import { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: [
    'en',
    'es',
    'ko',
    'ja',
    'zh',
    'zh_TW',
    'ru',
    'fr',
    'de',
    'pseudo',
    'pt',
  ],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  formatOptions: {
    lineNumbers: false,
  },
  fallbackLocales: {
    default: 'en',
  },
  format: 'po',
  orderBy: 'messageId',
  pseudoLocale: 'pseudo',
};

export default config;
