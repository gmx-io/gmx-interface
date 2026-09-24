import { DEFAULT_CLUSTER } from '@/config/env';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export function toValidCluster(cluster: string) {
  switch (cluster) {
    case 'mainnet':
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'devnet':
      return WalletAdapterNetwork.Devnet;
    case 'testnet':
      return WalletAdapterNetwork.Devnet;
    case 'localnet':
      return 'http://127.0.0.1:8899';
    case 'default':
      return DEFAULT_CLUSTER;
    default:
      return cluster.startsWith('http:') || cluster.startsWith('https:')
        ? cluster
        : DEFAULT_CLUSTER;
  }
}
