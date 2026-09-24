import { useAnchorProvider, useCompetitionProgram } from '@/contexts/anchor';
import { BN, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { GmsolCompetition } from 'gmsol/dist/gmsol/idl/gmsol_competition';
import { useCallback, useEffect, useState } from 'react';

interface CompetionLeaderboard {
  address: PublicKey;
  volume: BN;
}

interface CompetionAccount {
  competitionId?: PublicKey;
  startTime?: BN;
  endTime?: BN;
  extensionDuration: BN;
  extensionTriggerer: PublicKey;
  volumeMergeWindow: BN;
  extensionCap: BN;
  bump: number;
  onlyCountIncrease: boolean;
  volumeThreshold: BN;
  leaderboard: CompetionLeaderboard[];
}
const useCompetitionAccountChange = (
  competitionId: PublicKey
): { competitionAccount: CompetionAccount | null } => {
  const provider = useAnchorProvider();
  const program =
    useCompetitionProgram() as Program<GmsolCompetition>;
  const [competitionInfo, setCompetitionInfo] = useState(null);

  const getCompetitionInfoById = useCallback(async () => {
    try {
      const data = await provider.connection.getAccountInfo(competitionId);
      if (!data) return;
      const competitionInfo: CompetionAccount =
        program.account.competition.coder.accounts.decode(
          'competition',
          data.data
        );
      setCompetitionInfo(() => ({
        ...competitionInfo,
        competitionId: competitionId,
      }));
      return competitionInfo;
    } catch (error) {
      console.log('getCompetitionInfoById error', error);
      return setCompetitionInfo(null);
    }
  }, [
    competitionId,
    program.account.competition.coder.accounts,
    provider.connection,
  ]);

  useEffect(() => {
    if (!competitionId) return;
    void getCompetitionInfoById();
    const subId = provider.connection.onAccountChange(
      competitionId,
      (accountInfo) => {
        const competitionInfo: CompetionAccount =
          program.account.competition.coder.accounts.decode(
            'competition',
            accountInfo.data
          );
        // console.log('useCompetitionAccountChange', competitionInfo)
        setCompetitionInfo(() => ({
          ...competitionInfo,
          competitionId: competitionId,
        }));
      }
    );
    return () => {
      void provider.connection.removeAccountChangeListener(subId);
    };
  }, [
    competitionId,
    getCompetitionInfoById,
    program.account.competition,
    provider.connection,
  ]);

  return {
    competitionAccount: competitionInfo,
  };
};

export default useCompetitionAccountChange;
