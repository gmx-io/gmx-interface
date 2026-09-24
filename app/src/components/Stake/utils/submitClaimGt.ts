import { PublicKey } from '@solana/web3.js';
import { STORE_PROGRAM_ID, findUserPDA } from 'gmsol';
import { makeInvoke } from './invoke';
import { BN } from '@coral-xyz/anchor';

export const makeClaimGtDeposit = async (
  program,
  {
    store,
    owner,
    position,
    stateAddress,
    controllerAddress
  }
) => {
  const gtProgram = STORE_PROGRAM_ID;
  const { positionId, positionAddress } = position || {};
  const [userPda] = findUserPDA(store, owner);

  console.log('log', {
    program,
    positionId,
    store,
    owner,
    globalState: stateAddress,
    controller: controllerAddress,
    gtProgram,
    position: positionAddress,
    gtUser: userPda,
    eventAuthority: new PublicKey(
      '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
    )
  })
  
  let instruction = await program.methods
    .claimGt(
      new BN(positionId)
    )
    .accounts({
      store,
      owner,
      globalState: stateAddress,
      controller: controllerAddress,
      gtProgram,
      position: positionAddress,
      gtUser: userPda,
      eventAuthority: new PublicKey('8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF')
    })
    .instruction();

  console.log('instruction', instruction)
  return [
    instruction
  ];
};

export const invokeClaimGtDeposit = makeInvoke(
  makeClaimGtDeposit,
  ['owner'],
  true
);
