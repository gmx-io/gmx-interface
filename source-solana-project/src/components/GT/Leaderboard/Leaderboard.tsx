import { getGmw331Enabled } from '@/config/featureFlagEnable';
import LeaderboardLegacy from './LeaderboardLegacy';
import LeaderboardPaginated from './LeaderboardPaginated';

export default getGmw331Enabled()
  ? LeaderboardPaginated
  : LeaderboardLegacy;
