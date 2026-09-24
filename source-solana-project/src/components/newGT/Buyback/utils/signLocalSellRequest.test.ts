import { Keypair, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { signLocalSellRequest } from './signLocalSellRequest';

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const derivationPath = "m/44'/501'/0'/0'";
const owner = Keypair.fromSeed(derivePath(derivationPath, mnemonicToSeedSync(mnemonic).toString('hex')).key);

function createTransaction() {
  const keeper = Keypair.generate();
  return new VersionedTransaction(new TransactionMessage({
    payerKey: owner.publicKey,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [new TransactionInstruction({
      programId: Keypair.generate().publicKey,
      keys: [{ pubkey: keeper.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from('test'),
    })],
  }).compileToV0Message());
}

describe('signLocalSellRequest', () => {
  it('signs the original message and leaves the Keeper signature empty', () => {
    const transaction = createTransaction();
    const originalMessage = transaction.message.serialize();
    const signed = signLocalSellRequest(transaction, mnemonic, derivationPath, owner.publicKey);
    expect(signed.message.serialize()).toEqual(originalMessage);
    expect(nacl.sign.detached.verify(originalMessage, signed.signatures[0], owner.publicKey.toBytes())).toBe(true);
    expect(signed.signatures[1]).toEqual(new Uint8Array(64));
  });

  it('rejects a different connected wallet', () => {
    expect(() => signLocalSellRequest(createTransaction(), mnemonic, derivationPath, Keypair.generate().publicKey)).toThrow('does not match the connected wallet');
  });

  it('rejects an invalid recovery phrase', () => {
    expect(() => signLocalSellRequest(createTransaction(), 'invalid phrase', derivationPath, owner.publicKey)).toThrow('Invalid recovery phrase');
  });

  it('rejects a prepared transaction with a different owner', () => {
    const transaction = createTransaction();
    transaction.message.staticAccountKeys[0] = Keypair.generate().publicKey;
    expect(() => signLocalSellRequest(transaction, mnemonic, derivationPath, owner.publicKey)).toThrow('Prepared transaction owner');
  });
});
