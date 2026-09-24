import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import GtChart from "@/components/newGT/GtChart";
import TopGtHolders from './components/topGtHolders';
import HeaderInfo from './components/headerInfo';
import { useGtGlobalDetails } from '@/hooks/fetchHooks';
import { useAppStore } from '@/zustand/useAppStore';
import { useMedia } from 'react-use'

const Global = () => {
  useFetchGtGlobalDetails();
  const isMobile = useMedia('(max-width: 768px)');

  return (
    <div
      className={isMobile ? 'w-full min-w-0 ' : 'w-full min-w-0 pr-[0.8rem]'}
    >
      <HeaderInfo />
      <GtChart yValue="MINTING PRICE ($)" />
      <TopGtHolders />
    </div>
  );
};

const useFetchGtGlobalDetails = () => {
  const { setGlobalDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setGlobalDetails: state.gtState.setGlobalDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtGlobalDetails, isLoading } = useGtGlobalDetails();

  useEffect(() => {
    setIsLoading(isLoading);
    setGlobalDetails(gtGlobalDetails ?? null);
  }, [isLoading, setIsLoading, gtGlobalDetails, setGlobalDetails]);
};

export default Global;
