import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

import { appVersion } from './buildInfo';

datadogRum.init({
  applicationId: 'fd61fbd0-941e-494a-855d-7ba0a6ab3cc5',
  clientToken: 'pub113d8393ee5a01d3b6562b3f2ebf8854',
  site: 'datadoghq.com',
  service: 'gmtrade-web',
  env: import.meta.env.VITE_DD_ENV || import.meta.env.MODE,
  version: appVersion,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 0,
  trackResources: true,
  trackUserInteractions: true,
  trackLongTasks: true,
  plugins: [reactPlugin({ router: true })],
});
