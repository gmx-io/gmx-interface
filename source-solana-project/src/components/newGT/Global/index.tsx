import { getGmw411Enabled } from '@/config/featureFlagEnable';
import GlobalOld from './indexOld';
import GlobalNew from './indexNew';

export default getGmw411Enabled() ? GlobalNew : GlobalOld;
