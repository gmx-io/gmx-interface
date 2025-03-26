import { ARBITRUM, AVALANCHE, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { FundingHistoryItem } from "./types";

export const DEV_FUNDING_HISTORY: FundingHistoryItem[] = [
  {
    id: "1",
    chainId: AVALANCHE,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606400,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "pending",
  },
  {
    id: "2",
    chainId: ARBITRUM,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "SOL"),
    operation: "deposit",
    timestamp: 1721606401,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
  {
    id: "3",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "DAI"),
    operation: "withdraw",
    timestamp: 1721606402,
    size: 100n * 10n ** 18n,
    sizeUsd: 100n * 10n ** 30n,
    status: "failed",
  },
  {
    id: "4",
    chainId: BASE_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "withdraw",
    timestamp: 1721606403,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
  {
    id: "5",
    chainId: AVALANCHE,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "SOL"),
    operation: "withdraw",
    timestamp: 1721606404,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "pending",
  },
  {
    id: "6",
    chainId: ARBITRUM,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "DAI"),
    operation: "withdraw",
    timestamp: 1721606405,
    size: 100n * 10n ** 18n,
    sizeUsd: 100n * 10n ** 30n,
    status: "failed",
  },
  {
    id: "7",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606406,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
  {
    id: "8",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606407,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "pending",
  },
  {
    id: "9",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606408,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
  {
    id: "10",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606409,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "pending",
  },
  {
    id: "11",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606410,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
  {
    id: "12",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606411,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "pending",
  },
  {
    id: "13",
    chainId: SONIC_MAINNET,
    walletAddress: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
    txnId: "0x2d3c4eaacc2b0b02af14af93d91ca846b72240e2e82e4bd4b316b5be9f89a75c",
    token: getTokenBySymbol(ARBITRUM, "USDC"),
    operation: "deposit",
    timestamp: 1721606412,
    size: 100n * 10n ** 6n,
    sizeUsd: 100n * 10n ** 30n,
    status: "completed",
  },
];
