import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  getChainName,
} from "config/chains";
import { isDevelopment } from "config/env";
import { getChainIcon } from "config/icons";

export type NetworkOption = {
  label: string;
  value: number;
  icon: string;
  color: string;
};

export const NETWORK_OPTIONS: NetworkOption[] = [
  {
    label: getChainName(ARBITRUM),
    value: ARBITRUM,
    icon: getChainIcon(ARBITRUM),
    color: "#264f79",
  },
  {
    label: getChainName(AVALANCHE),
    value: AVALANCHE,
    icon: getChainIcon(AVALANCHE),
    color: "#E841424D",
  },
  {
    label: getChainName(BOTANIX),
    value: BOTANIX,
    icon: getChainIcon(BOTANIX),
    color: "#F7931A",
  },
  {
    label: getChainName(SOURCE_BASE_MAINNET),
    value: SOURCE_BASE_MAINNET,
    icon: getChainIcon(SOURCE_BASE_MAINNET),
    color: "#0052ff",
  },
  {
    label: getChainName(SOURCE_BSC_MAINNET),
    value: SOURCE_BSC_MAINNET,
    icon: getChainIcon(SOURCE_BSC_MAINNET),
    color: "#F7931A",
  },
  {
    label: getChainName(SOURCE_ETHEREUM_MAINNET),
    value: SOURCE_ETHEREUM_MAINNET,
    icon: getChainIcon(SOURCE_ETHEREUM_MAINNET),
    color: "#627EEA",
  },
];

if (isDevelopment()) {
  NETWORK_OPTIONS.push(
    {
      label: getChainName(AVALANCHE_FUJI),
      value: AVALANCHE_FUJI,
      icon: getChainIcon(AVALANCHE_FUJI),
      color: "#E841424D",
    },
    {
      label: getChainName(ARBITRUM_SEPOLIA),
      value: ARBITRUM_SEPOLIA,
      icon: getChainIcon(ARBITRUM_SEPOLIA),
      color: "#0052ff",
    },
    {
      label: getChainName(SOURCE_OPTIMISM_SEPOLIA),
      value: SOURCE_OPTIMISM_SEPOLIA,
      icon: getChainIcon(SOURCE_OPTIMISM_SEPOLIA),
      color: "#ff0420",
    },
    {
      label: getChainName(SOURCE_SEPOLIA),
      value: SOURCE_SEPOLIA,
      icon: getChainIcon(SOURCE_SEPOLIA),
      color: "#aa00ff",
    }
  );
}
