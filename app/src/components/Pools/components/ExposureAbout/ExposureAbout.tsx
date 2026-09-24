import { getGmw344Enabled } from '@/config/featureFlagEnable';
import ExposureAboutOld, { ExposureAboutOldProps } from './ExposureAboutOld';
import ExposureAboutNew from './ExposureAboutNew';

export type ExposureAboutProps = ExposureAboutOldProps;

const ExposureAbout = getGmw344Enabled()
  ? ExposureAboutNew
  : ExposureAboutOld;

export default ExposureAbout;
