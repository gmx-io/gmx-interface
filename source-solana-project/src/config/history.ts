import { PublicKey } from '@solana/web3.js';
import GmsolStoreIDL from '@/components/TradeBoxNew/idl/gmsol_store.json';
import { utils } from '@coral-xyz/anchor';

export const STORE_PROGRAM_ID: PublicKey = new PublicKey(GmsolStoreIDL.address);

const encodeUtf8 = utils.bytes.utf8.encode;

export const findMarketPDA = (store: PublicKey, token: PublicKey) =>
    PublicKey.findProgramAddressSync(
        [encodeUtf8('market'), store.toBytes(), token.toBytes()],
        STORE_PROGRAM_ID
    );