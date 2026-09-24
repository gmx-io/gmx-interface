import iconArbitrum from '@/img/network/arbitrum.svg';
import iconAvalanche from '@/img/network/avalanche.svg';
import iconBase from '@/img/network/base.svg';
import iconBnb from '@/img/network/bnb.svg';
import iconEthereum from '@/img/network/ethereum.svg';
import iconMegaeth from '@/img/network/megaeth.svg';
import iconSolana from '@/img/network/solana.svg';

export type NetworkId =
  | 'solana'
  | 'arbitrum'
  | 'base'
  | 'bnb'
  | 'ethereum'
  | 'megaeth'
  | 'avalanche';

export type NetworkOption = {
  id: NetworkId;
  name: string;
  icon: string;
  isCurrent: boolean;
};

export const NETWORKS: NetworkOption[] = [
  { id: 'solana', name: 'Solana', icon: iconSolana, isCurrent: true },
  { id: 'arbitrum', name: 'Arbitrum', icon: iconArbitrum, isCurrent: false },
  { id: 'base', name: 'Base', icon: iconBase, isCurrent: false },
  { id: 'bnb', name: 'BNB', icon: iconBnb, isCurrent: false },
  { id: 'ethereum', name: 'Ethereum', icon: iconEthereum, isCurrent: false },
  { id: 'megaeth', name: 'MegaETH', icon: iconMegaeth, isCurrent: false },
  { id: 'avalanche', name: 'Avalanche', icon: iconAvalanche, isCurrent: false },
];

export const CURRENT_NETWORK = NETWORKS[0];

export const GMX_IO_URL = 'https://gmx.io';
