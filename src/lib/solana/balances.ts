import {
  address,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getU8Decoder,
  getU32Decoder,
  getU64Decoder,
} from "@solana/kit";

import { SOLANA_SYSTEM_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS, type GmsolTokenConfig } from "config/gmsol/tokens";

import { fetchSolanaAccounts } from "./rpc";

const ASSOCIATED_TOKEN_PROGRAM_ID = address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_ACCOUNT_SIZE = 165;
const TOKEN_2022_ACCOUNT_TYPE = 2;

const tokenAccountDecoder = getStructDecoder([
  ["mint", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["amount", getU64Decoder()],
  ["delegateOption", getU32Decoder()],
  ["delegate", getAddressDecoder()],
  ["state", getU8Decoder()],
  ["nativeOption", getU32Decoder()],
  ["nativeReserve", getU64Decoder()],
  ["delegatedAmount", getU64Decoder()],
  ["closeAuthorityOption", getU32Decoder()],
  ["closeAuthority", getAddressDecoder()],
]);

export type SolanaBalances = Record<string, bigint>;

/** Reads configured ATAs only. Raw amounts do not guarantee that funds are spendable. */
export async function fetchSolanaBalances(owner: string): Promise<SolanaBalances> {
  const ownerAddress = address(owner);
  const encoder = getAddressEncoder();
  const tokenAccounts = await Promise.all(
    GMSOL_TOKENS.filter((token) => !token.isSynthetic).map(async (token) => {
      const [ata] = await getProgramDerivedAddress({
        programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
        seeds: [
          encoder.encode(ownerAddress),
          encoder.encode(address(token.tokenProgram)),
          encoder.encode(address(token.address)),
        ],
      });
      return { token, ata };
    })
  );
  const [nativeAccount, ...accounts] = await fetchSolanaAccounts([
    ownerAddress,
    ...tokenAccounts.map(({ ata }) => ata),
  ]);
  if (nativeAccount && (nativeAccount.owner !== SOLANA_SYSTEM_PROGRAM_ID || nativeAccount.executable)) {
    throw new Error(`Invalid Solana wallet account: ${owner}`);
  }
  const balances: SolanaBalances = { [GMSOL_NATIVE_TOKEN.address]: nativeAccount?.lamports ?? 0n };

  tokenAccounts.forEach(({ token, ata }, index) => {
    const account = accounts[index];
    if (!account) {
      balances[token.address] = 0n;
      return;
    }
    balances[token.address] = decodeSolanaTokenBalance({ account, token, owner: ownerAddress, ata });
  });
  return balances;
}

export function decodeSolanaTokenBalance({
  account,
  token,
  owner,
  ata,
}: {
  account: { owner: string; executable: boolean; data: readonly [string, "base64"] };
  token: GmsolTokenConfig;
  owner: string;
  ata: string;
}) {
  if (account.owner !== token.tokenProgram || account.executable) {
    throw new Error(`Invalid Solana token program for account: ${ata}`);
  }
  const data = Uint8Array.from(atob(account.data[0]), (char) => char.charCodeAt(0));
  if (
    data.length < TOKEN_ACCOUNT_SIZE ||
    (token.tokenProgram === SOLANA_TOKEN_PROGRAM_ID && data.length !== TOKEN_ACCOUNT_SIZE)
  ) {
    throw new Error(`Invalid Solana token account size: ${ata}`);
  }
  if (data.length > TOKEN_ACCOUNT_SIZE) {
    validateTokenExtensions(data);
  }
  const decoded = tokenAccountDecoder.decode(data);
  if (
    decoded.mint !== token.address ||
    decoded.owner !== owner ||
    (decoded.state !== 1 && decoded.state !== 2) ||
    decoded.delegateOption > 1 ||
    decoded.nativeOption > 1 ||
    decoded.closeAuthorityOption > 1
  ) {
    throw new Error(`Invalid Solana token account data: ${ata}`);
  }
  return decoded.amount;
}

// Token-2022 shares the base layout, followed by an account type and TLV extensions.
// Validate the envelope without interpreting extensions as spendable balances.
function validateTokenExtensions(data: Uint8Array) {
  if (data[TOKEN_ACCOUNT_SIZE] !== TOKEN_2022_ACCOUNT_TYPE) {
    throw new Error("Invalid Token-2022 account type");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = TOKEN_ACCOUNT_SIZE + 1;
  while (offset < data.length) {
    if (data.subarray(offset).every((byte) => byte === 0)) {
      break;
    }
    if (offset + 4 > data.length) {
      throw new Error("Truncated Token-2022 extension header");
    }
    const length = view.getUint16(offset + 2, true);
    offset += 4 + length;
    if (offset > data.length) {
      throw new Error("Truncated Token-2022 extension data");
    }
  }
}
