/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useAnchorProvider, useCompetitionProgram } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { CompetitionProgram } from 'gmsol';
import { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { competitions, TradeModel } from '@/config/competitions';
// import { DEFAULT_SWR_REFRESH_INTERVAL_10S } from '@/config/ui';
import { expandDecimals } from '@/utils/legacy';
import { BN_ONE, USD_DECIMALS } from '@/config/constants';

type CompetitionItem = {
  competitionId?: PublicKey;
  startTime?: BN;
  endTime?: BN;
  name?: string;
  basePrize?: BN;
  treasuryPriceFactor?: number;
  tradeModel?: TradeModel;
  showMoreAbout?: boolean;
};
const useCompetitionList = () => {
  const program = useCompetitionProgram() as CompetitionProgram;
  const provider = useAnchorProvider();

  const getCompetitionList = useCallback(async () => {
    const competitionList: CompetitionItem[] = [];
    for (const competition of competitions) {
      if (!competition.address) {
        competitionList.push({});
        continue;
      }
      const competitionId = new PublicKey(competition.address);
      const data = await provider.connection.getAccountInfo(competitionId);
      if (!data) return;
      const originalCompetitionInfo: {
        startTime: BN;
        endTime: BN;
      } = program?.account?.competition?.coder?.accounts?.decode(
        'competition',
        data.data
      );
      competitionList.push({
        competitionId: competitionId,
        startTime: originalCompetitionInfo.startTime,
        endTime: originalCompetitionInfo.endTime,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        basePrize: new BN(competition.basePrize).mul(
          expandDecimals(BN_ONE, USD_DECIMALS)
        ),
        treasuryPriceFactor: competition.treasuryPriceFactor,
        name: competition.name,
        tradeModel: competition.tradeModel,
        showMoreAbout: competition?.showMoreAbout || false,
      });
    }
    return competitionList.sort((competitionA, competitionB) => {
      return competitionA?.startTime?.sub(competitionB?.startTime)?.toNumber();
    });
  }, [program?.account?.competition?.coder?.accounts, provider.connection]);

  useEffect(() => {
    void getCompetitionList();
  }, [getCompetitionList]);

  const { data, isLoading } = useSWR(
    ['get/competitionlist'],
    getCompetitionList,
    {
      // refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_10S
    }
  );
  return {
    competitionList: data,
    isLoading,
  };
};

export default useCompetitionList;
