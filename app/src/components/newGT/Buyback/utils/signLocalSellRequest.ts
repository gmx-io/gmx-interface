import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { derivePath } from 'ed25519-hd-key';

export function signLocalSellRequest(
  transaction: VersionedTransaction,
  mnemonic: string,
  derivationPath: string,
  owner: PublicKey
): VersionedTransaction {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
  if (!validateMnemonic(normalizedMnemonic)) {
    throw new Error('Invalid recovery phrase');
  }
  if (!/^m\/44'\/501'(\/\d+')+$/.test(derivationPath)) {
    throw new Error('Enter a hardened Solana derivation path');
  }
  const seed = mnemonicToSeedSync(normalizedMnemonic);
  let derivedKey: Uint8Array | undefined;
  try {
    derivedKey = derivePath(derivationPath, seed.toString('hex')).key;
    const signer = Keypair.fromSeed(derivedKey);
    if (!signer.publicKey.equals(owner)) {
      throw new Error(
        `Derived address ${signer.publicKey.toBase58()} does not match the connected wallet. Check the derivation path and wallet account.`
      );
    }
    if (!transaction.message.staticAccountKeys[0]?.equals(owner)) {
      throw new Error('Prepared transaction owner does not match the connected wallet');
    }
    const originalMessage = transaction.message.serialize();
    transaction.sign([signer]);
    if (!Buffer.from(originalMessage).equals(Buffer.from(transaction.message.serialize()))) {
      throw new Error('Transaction message changed during signing');
    }
    return transaction;
  } finally {
    seed.fill(0);
    derivedKey?.fill(0);
  }
}
