import { createContext } from 'react';
import { AnchorState } from './types';

export * from './AnchorStateProvider';
export * from './hooks';

export const AnchorStateContext = createContext<AnchorState | null>(null);
