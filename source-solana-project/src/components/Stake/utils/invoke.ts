import {
  ComputeBudgetProgram,
  ConfirmOptions,
  Signer,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  AddressLookupTableAccount,
  TransactionMessage,
  PublicKey,
  sendAndConfirmTransaction,
  Connection,
} from '@solana/web3.js';
import { AnchorError, Idl, Program, utils } from '@coral-xyz/anchor';
import { SendTransactionError } from '@solana/web3.js';
import { formatParseUsdToBN } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';

type ParamsWithSigners<T, S extends PropertyKey[]> = {
  [P in keyof T]: P extends S[number] ? Signer : T[P];
};

export type IxWithOutput<T> = [TransactionInstruction[], T];

let altCache: Record<string, AddressLookupTableAccount> = {};

async function getAltsOnce(pubkeys: PublicKey[], connection: Connection) {
  const uncached = pubkeys.filter((key) => !altCache[key.toBase58()]);
  console.log('getAltsOnce', uncached);
  if (uncached.length) {
    const fetched = await Promise.all(
      uncached.map((key) => connection.getAddressLookupTable(key))
    );
    fetched.forEach((res, idx) => {
      if (res.value) altCache[uncached[idx].toBase58()] = res.value;
    });
  }
  return pubkeys
    .map((key) => altCache[key.toBase58()])
    .filter((val): val is AddressLookupTableAccount => !!val);
}

export const makeInvoke = <
  IDL extends Idl,
  T extends Record<string, unknown>,
  S extends (keyof T & string)[],
  U = undefined,
>(
  makeInstructions: (
    program: Program<IDL>,
    params: T
  ) => Promise<TransactionInstruction[] | IxWithOutput<U>>,
  signers: S,
  defaultSignByProvider?: boolean
) => {
  return async (
    program: Program<IDL>,
    params: ParamsWithSigners<T, S>,
    options?: ConfirmOptions & {
      signByProvider?: boolean;
      computeUnits?: number;
      computeUnitPrice?: number | bigint;
      lookupTables?: PublicKey[];
    }
  ) => {
    const originalParams: Partial<T> = { ...params } as any;
    const signerList: Signer[] = [];
    console.log('originalParams', originalParams)

    signers.forEach((signerField) => {
      const signer = params[signerField] as Signer;
      originalParams[signerField] = signer as T[keyof T & string];
      signerList.push(signer);
    });

    // instructions: [...computeBudgetIxs, ...ixs, ...ixs, ...ixs, ...ixs, ...ixs xxxxxx],
    const result = [];

    // originalParams.positions.forEach(async (item) => {
    //   const parameters = {
    //     ...originalParams,
    //     position: item,
    //     controllerAddress: item.controller
    //   }
    //   const data = await makeInstructions(program, parameters as T);
    //   result.push(data);
    // })
    for (const item of originalParams.positions) {
      const parameters = {
        ...originalParams,
        position: item,
        controllerAddress: item.controller,
        amount: item?.value && item?.value.gt(new BN(0)) ? formatParseUsdToBN(item?.value?.toString(), item?.decimals) : new BN(0)
      };
      const data = await makeInstructions(program, parameters as T);
      result.push(data);
    }
    
    let ixs: TransactionInstruction[] = [];
    let output: U | undefined = undefined;

    result.forEach(item => {
      if ((item as TransactionInstruction[])[0].programId != undefined) {
        ixs.push(item as TransactionInstruction[]);
      } else {
        const [ixsItem, output] = item as IxWithOutput<U>;
        ixs.push(ixsItem);
        output.push(output);
      }
    })
    
    // if ((result as TransactionInstruction[])[0].programId != undefined) {
    //   ixs = result as TransactionInstruction[];
    // } else {
    //   [ixs, output] = result as IxWithOutput<U>;
    // }

    const signByProvider = options?.signByProvider ?? defaultSignByProvider;

    // ✅ try load lookup tables
    let addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    if (options?.lookupTables?.length) {
      addressLookupTableAccounts = await getAltsOnce(
        options.lookupTables,
        program.provider.connection
      );
      // const altPubkeys = options?.lookupTables;
      // const fetched = await Promise.all(
      //   altPubkeys.map((key) =>
      //     program.provider.connection.getAddressLookupTable(key)
      //   )
      // );
      // addressLookupTableAccounts = fetched
      //   .map((res) => res.value)
      //   .filter((val): val is AddressLookupTableAccount => val !== null);
    }

    const computeBudgetIxs = options?.computeUnits
      ? [
          ComputeBudgetProgram.setComputeUnitLimit({
            units: options.computeUnits,
          }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: options.computeUnitPrice ?? 1,
          }),
        ]
      : [];

    // VersionedTransaction if lookup tables loaded
    if (addressLookupTableAccounts.length > 0) {
      const connection = program.provider.connection;
      const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const message = new TransactionMessage({
        payerKey: program.provider.publicKey!,
        recentBlockhash,
        instructions: [...computeBudgetIxs, ...ixs],
      }).compileToV0Message(addressLookupTableAccounts);

      const vtx = new VersionedTransaction(message);

      console.info(
        'vtx to sign:',
        utils.bytes.base64.encode(Buffer.from(vtx.serialize()))
      );

      if (!signByProvider) {
        vtx.sign(signerList);
      }

      try {
        if (signByProvider && program.provider.sendAndConfirm) {
          return [
            await program.provider.sendAndConfirm(vtx, signerList, {
              skipPreflight: options?.skipPreflight ?? false,
            }),
            output,
          ] as [string, U];
        } else {
          return [
            await connection.sendTransaction(vtx, {
              ...options,
              skipPreflight: options?.skipPreflight ?? false,
            }),
            output,
          ] as [string, U];
        }
      } catch (error) {
        console.error('VersionedTransaction error', error);
        if ((error as SendTransactionError).logs) {
          const anchorError = AnchorError.parse(
            (error as SendTransactionError).logs ?? []
          );
          if (anchorError) throw anchorError;
        }
        throw error;
      }
    }

    // 🧱 fallback: legacy Transaction
    const tx = new Transaction().add(...computeBudgetIxs, ...ixs);
    console.log('166 tx', tx);

    try {
      if (signByProvider && program.provider.sendAndConfirm) {
        const hash = await program.provider.connection.getLatestBlockhash();
        tx.recentBlockhash = hash.blockhash;
        tx.feePayer = program.provider.publicKey!;
        console.log('using sendAndConfirm');
        return [
          await program.provider.sendAndConfirm(tx, signerList, {
            skipPreflight: options?.skipPreflight ?? false,
          }),
          output,
        ] as [string, U];
      } else {
        console.log('using sendAndConfirmTransaction');
        console.log('tx', tx)
        return [
          await sendAndConfirmTransaction(
            program.provider.connection,
            tx,
            signerList,
            {
              skipPreflight: options?.skipPreflight ?? false,
              ...(options ?? {}),
            }
          ),
          output,
        ] as [string, U];
      }
    } catch (error) {
      console.error('SendTransactionError (legacy)', error);
      if ((error as SendTransactionError).logs) {
        const anchorError = AnchorError.parse(
          (error as SendTransactionError).logs ?? []
        );
        if (anchorError) throw anchorError;
      }
      throw error;
    }
  };
};
