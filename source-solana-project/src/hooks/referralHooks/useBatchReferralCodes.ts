import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { useMemo } from 'react';
import useSWR from 'swr';

interface UserAccount {
  referral: {
    code: PublicKey;
  };
}

interface ReferralCode {
  code: number[];
}

interface ValidCodePda {
  owner: PublicKey;
  codePda: PublicKey;
}

export function useBatchReferralCodes(owners: PublicKey[]) {
  const store = useStoreProgram();
  const connection = store?.provider.connection;

  const fetcher = async (owners: PublicKey[]) => {
    if (!store || !GMX_SOLANA_STORE_ADDRESS || !owners.length || !connection)
      return {};

    try {
      // Find all user PDAs in one go
      const userPdas = owners.map(
        (owner) =>
          PublicKey.findProgramAddressSync(
            [
              Buffer.from('user'),
              GMX_SOLANA_STORE_ADDRESS.toBuffer(),
              owner.toBuffer(),
            ],
            store.programId
          )[0]
      );

      // Batch fetch all user accounts in a single RPC call
      const userAccountInfos =
        await connection.getMultipleAccountsInfo(userPdas);
      const userAccounts = userAccountInfos.map((accountInfo) =>
        accountInfo
          ? store.coder.accounts.decode<UserAccount>(
              'userHeader',
              accountInfo.data
            )
          : null
      );

      // Get all valid referral code PDAs
      const validCodePdas: ValidCodePda[] = userAccounts
        .map((account, index) =>
          account && !account.referral.code.equals(PublicKey.default)
            ? { owner: owners[index], codePda: account.referral.code }
            : null
        )
        .filter((item): item is ValidCodePda => item !== null);

      if (!validCodePdas.length) return {};

      // Batch fetch all referral codes in a single RPC call
      const codePdas = validCodePdas.map(({ codePda }) => codePda);
      const codeAccountInfos =
        await connection.getMultipleAccountsInfo(codePdas);
      const codeResults = codeAccountInfos.map((accountInfo) =>
        accountInfo
          ? store.coder.accounts.decode<ReferralCode>(
              'referralCodeV2',
              accountInfo.data
            )
          : null
      );

      // Process results into a map
      const referralCodes: Record<string, string> = {};
      validCodePdas.forEach(({ owner }, index) => {
        const codeBytes = codeResults[index]?.code;
        if (codeBytes) {
          let startIndex = 0;
          while (startIndex < codeBytes.length && codeBytes[startIndex] === 0) {
            startIndex++;
          }
          const actualBytes = codeBytes.slice(startIndex);
          if (actualBytes.length > 0) {
            referralCodes[owner.toBase58()] = bs58.encode(actualBytes);
          }
        }
      });

      return referralCodes;
    } catch (error) {
      console.error('Error fetching batch referral codes:', error);
      return {};
    }
  };

  const { data: referralCodes = {}, isLoading } = useSWR(
    owners.length
      ? ['batchReferralCodes', owners.map((o) => o.toBase58()).join(',')]
      : null,
    () => fetcher(owners),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  );

  return useMemo(
    () => ({
      referralCodes,
      isLoading,
    }),
    [referralCodes, isLoading]
  );
}
