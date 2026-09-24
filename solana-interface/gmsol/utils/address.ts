import { PublicKey } from '@solana/web3.js';

export const optionalAccount = (address: PublicKey) =>
  address.equals(PublicKey.default) ? null : address;
