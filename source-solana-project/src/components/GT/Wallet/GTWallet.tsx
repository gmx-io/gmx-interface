import { getGmw331Enabled } from '@/config/featureFlagEnable';
import GTWalletLegacy from './GTWalletLegacy';
import GTWalletPaginated from './GTWalletPaginated';

export default getGmw331Enabled()
  ? GTWalletPaginated
  : GTWalletLegacy;
