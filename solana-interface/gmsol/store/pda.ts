import { PublicKey } from '@solana/web3.js';
import { COMPETITION_PROGRAM_ID, STORE_PROGRAM_ID } from '../program';
import { utils } from '@coral-xyz/anchor';

const encodeUtf8 = utils.bytes.utf8.encode;

export const POSITION_SEED = encodeUtf8('position');
export const ORDER_SEED = encodeUtf8('order');
export const CONFIG_SEED = utils.bytes.utf8.encode('config');
export const USER_SEED = utils.bytes.utf8.encode('user');
export const GT_EXCHANGE_VAULT_SEED =
  utils.bytes.utf8.encode('gt_exchange_vault');
export const GT_EXCHANGE_SEED = utils.bytes.utf8.encode('gt_exchange');

export const findRolesPDA = (store: PublicKey, authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('roles'), store.toBytes(), authority.toBytes()],
    STORE_PROGRAM_ID
  );

export const findTokenConfigMapPDA = (store: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('token_config_map'), store.toBytes()],
    STORE_PROGRAM_ID
  );

export const findMarketPDA = (store: PublicKey, token: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('market'), store.toBytes(), token.toBytes()],
    STORE_PROGRAM_ID
  );

export const findMarketVaultPDA = (
  store: PublicKey,
  tokenMint: PublicKey,
  marketTokenMint?: PublicKey
) =>
  PublicKey.findProgramAddressSync(
    [
      encodeUtf8('market_vault'),
      store.toBytes(),
      tokenMint.toBytes(),
      marketTokenMint?.toBytes() ?? new Uint8Array(),
    ],
    STORE_PROGRAM_ID
  );

export const findDepositPDA = (
  store: PublicKey,
  user: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('deposit'), store.toBytes(), user.toBytes(), nonce],
    STORE_PROGRAM_ID
  );

export const findWithdrawalPDA = (
  store: PublicKey,
  user: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('withdrawal'), store.toBytes(), user.toBytes(), nonce],
    STORE_PROGRAM_ID
  );

export const findPositionPDAWithKind = (
  store: PublicKey,
  user: PublicKey,
  marketToken: PublicKey,
  collateralToken: PublicKey,
  kind: number
) =>
  PublicKey.findProgramAddressSync(
    [
      POSITION_SEED,
      store.toBytes(),
      user.toBytes(),
      marketToken.toBytes(),
      collateralToken.toBytes(),
      new Uint8Array([kind]),
    ],
    STORE_PROGRAM_ID
  );

export const findPositionPDA = (
  store: PublicKey,
  user: PublicKey,
  marketToken: PublicKey,
  collateralToken: PublicKey,
  isLong: boolean
) =>
  findPositionPDAWithKind(
    store,
    user,
    marketToken,
    collateralToken,
    isLong ? 1 : 2
  );

export const findOrderPDA = (
  store: PublicKey,
  user: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [ORDER_SEED, store.toBytes(), user.toBytes(), nonce],
    STORE_PROGRAM_ID
  );

export const findConfigPDA = (store: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [CONFIG_SEED, store.toBytes()],
    STORE_PROGRAM_ID
  );

export const findUserPDA = (store: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [USER_SEED, store.toBytes(), owner.toBytes()],
    STORE_PROGRAM_ID
  );

export const findGtExchangePDA = (
  vault: PublicKey | undefined,
  owner: PublicKey | undefined
): [PublicKey, number] | [undefined, undefined] => {
  if (!vault || !owner) {
    return [undefined, undefined];
  }

  return PublicKey.findProgramAddressSync(
    [GT_EXCHANGE_SEED, vault.toBytes(), owner.toBytes()],
    STORE_PROGRAM_ID
  );
};

export const findGtExchangeVaultPDA = (
  store: PublicKey,
  timeWindowIndex: bigint,
  timeWindow: number
) => {
  const timeWindowIndexBuffer = new ArrayBuffer(8);
  const timeWindowIndexDataView = new DataView(timeWindowIndexBuffer);
  timeWindowIndexDataView.setBigInt64(0, timeWindowIndex, true);

  const timeWindowBuffer = new ArrayBuffer(4);
  const timeWindowDataView = new DataView(timeWindowBuffer);
  timeWindowDataView.setUint32(0, timeWindow, true);

  return PublicKey.findProgramAddressSync(
    [
      GT_EXCHANGE_VAULT_SEED,
      store.toBytes(),
      new Uint8Array(timeWindowIndexBuffer),
      new Uint8Array(timeWindowBuffer),
    ],
    STORE_PROGRAM_ID
  );
};

export const findGtExchangeVaultPDAWithDt = (
  store: PublicKey,
  dt: Date,
  timeWindow: number
) => {
  const index = BigInt(dt.getTime()) / 1000n / BigInt(timeWindow);

  return findGtExchangeVaultPDA(store, index, timeWindow);
};

export const findShiftPDA = (
  store: PublicKey,
  owner: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('shift'), store.toBytes(), owner.toBytes(), nonce],
    STORE_PROGRAM_ID
  );

export const findGlvPDA = (glv_token: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('glv'), glv_token.toBytes()],
    STORE_PROGRAM_ID
  );

export const findGlvDepositPDA = (
  store: PublicKey,
  owner: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('glv_deposit'), store.toBytes(), owner.toBytes(), nonce],
    STORE_PROGRAM_ID
  );

export const findGlvWithdrawalPDA = (
  store: PublicKey,
  owner: PublicKey,
  nonce: Uint8Array
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('glv_withdrawal'), store.toBytes(), owner.toBytes(), nonce],
    STORE_PROGRAM_ID
  );
export const findPartitionedDataAccountPDA = (
  owner: PublicKey,
  competitionId: PublicKey
) =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('participant'), competitionId.toBuffer(), owner.toBuffer()],
    COMPETITION_PROGRAM_ID
  );

export const findEventAuthorityPDA = () =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('event_authority')],
    COMPETITION_PROGRAM_ID
  );

export const findCallbackAuthorityPDA = () =>
  PublicKey.findProgramAddressSync(
    [encodeUtf8('callback_authority')],
    STORE_PROGRAM_ID
  );
