import { PublicKey } from '@solana/web3.js';
import { makeInvoke } from '../../utils/invoke';
import { CompetitionProgram } from '../../program';

export type MakeCloseParticipantParams = {
  trader: PublicKey;
  competitionId: PublicKey;
  participant: PublicKey;
};

export const makeCloseParticipant = async (
  program: CompetitionProgram,
  { trader, competitionId, participant }: MakeCloseParticipantParams
) => {
  const instruction = await program.methods
    .closeParticipant()
    .accounts({
      trader,
      competitionId,
      participant,
    })
    .instruction();
  return [instruction];
};

// export const invokeCloseParticipantWithPayerAsSigner = makeInvoke(
//   makeCloseParticipant,
//   ['owner']
// );

export const invokeCloseParticipant = makeInvoke(
  makeCloseParticipant,
  [],
  true
);
