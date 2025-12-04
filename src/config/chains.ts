import {
  CONTRACTS_CHAIN_IDS as SDK_CONTRACTS_CHAIN_IDS,
  CONTRACTS_CHAIN_IDS_DEV as SDK_CONTRACTS_CHAIN_IDS_DEV,
} from "sdk/configs/chains";

import { isDevelopment } from "./env";

export * from "sdk/configs/chains";

export const CONTRACTS_CHAIN_IDS: readonly number[] = isDevelopment()
  ? SDK_CONTRACTS_CHAIN_IDS_DEV
  : SDK_CONTRACTS_CHAIN_IDS;
