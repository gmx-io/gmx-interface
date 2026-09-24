/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useCallback, useContext, useMemo } from 'react';
import {
  makeStoreProgram,
  makeTreasuryProgram,
  makeCompetitionProgram,
  StoreProgram,
} from 'gmsol';
import { AnchorStateContext } from '.';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { makeNullWalletProvider } from './utils';
import { makeStakeProgram } from '../../program/stake';

export const useStoreProgram = () => {
  const { provider } = useAnchor();
  const program = useMemo(() => {
    return makeStoreProgram(provider);
  }, [provider]);

  return program as StoreProgram;
};

export const useMakeStatusStoreProgram = () => {
  const { provider } = useAnchor();
  const program = useMemo(() => {
    return makeStoreProgram(provider);
  }, [provider]);

  return program;
};

export const useStoreNullWalletProgram = () => {
  const { connection } = useConnection();
  const provider = makeNullWalletProvider(connection);

  // return program;
  const program = useMemo(() => {
    return makeStoreProgram(provider);
  }, [provider]);

  return program;
};
export const useTreasuryProgram = () => {
  const { provider } = useAnchor();
  const program = useMemo(() => {
    return makeTreasuryProgram(provider);
  }, [provider]);

  return program;
};
export const useCompetitionProgram = () => {
  const { provider } = useAnchor();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const program = useMemo(() => {
    return makeCompetitionProgram(provider);
  }, [provider]);

  return program;
};
export const useAnchorProvider = () => {
  const { provider } = useAnchor();
  return provider;
};

export const useAnchor = () => {
  const ctx = useContext(AnchorStateContext);
  if (!ctx) {
    throw new Error('Used `useAnchor` outside of `AnchorStateProvider`');
  }
  return ctx;
};

export const useOpenConnectModal = () => {
  const { setVisible } = useWalletModal();

  return useCallback(() => {
    setVisible(true);
  }, [setVisible]);
};

export const useStakeProgram = () => {
  const { provider } = useAnchor();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const program = useMemo(() => {
    return makeStakeProgram(provider);
  }, [provider]);

  return program;
};
