import { PublicKey } from '@solana/web3.js';
import { toBN } from './number';
import { makeInvoke } from './invoke';
import { BN, utils } from '@coral-xyz/anchor';
// import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { findGtBankPDA, STORE_PROGRAM_ID, findUserPDA } from 'gmsol';
import { STAKE_PROGRAM_ID } from '../../../program/stake';
import { getTokenEscrow } from './getTokenEscrow';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const makeCreateUnstakeDepositInstruction = async (
  program,
  {
    store,
    owner,
    position,
    amount,
    stateAddress,
    controllerAddress
  }
) => {
  // console.log('program', {
  //   store,
  //   owner,
  //   position,
  //   amount,
  //   stateAddress,
  //   controllerAddress
  // });
  // const store = GMX_SOLANA_STORE_ADDRESS;
  const gtProgram = STORE_PROGRAM_ID;
  const encodeUtf8 = utils.bytes.utf8.encode;
  const { positionId, positionAddress, vault, poolType, marketToken, lpMint } = position || {};
  const [userPda] = findUserPDA(store, owner);
  const userLpToken = getTokenEscrow(
    owner,
    new PublicKey(marketToken)
  );

  const tokenProgram = poolType === 'GLV' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  console.log('log', {
    positionId,
    amount,
    store,
    owner,
    globalState: stateAddress,
    controller: controllerAddress,
    lpMint: lpMint,
    gtProgram,
    position: positionAddress,
    position_vault: vault,
    gtUser: userPda,
    userLpToken: userLpToken,
    eventAuthority: new PublicKey(
      '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
    ),
    tokenProgram: tokenProgram,
  })

  
  let instruction = await program.methods
    .unstakeLp(
      positionId,
      amount
    )
    .accountsPartial({
      store,
      owner,
      globalState: stateAddress,
      controller: controllerAddress,
      lpMint: lpMint,
      gtProgram,
      position: positionAddress,
      position_vault: vault,
      gtUser: userPda,
      userLpToken: userLpToken,
      eventAuthority: new PublicKey(
        '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
      ),
      tokenProgram: tokenProgram,
    })
    .instruction();

  return [
    instruction
  ];
};

export const invokeCreateUnstakeDeposit = makeInvoke(
  makeCreateUnstakeDepositInstruction,
  ['owner'],
  true
);
