import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { BLAST_SEPOLIA_TESTNET, OPTIMISM_MAINNET, SEPOLIA_TESTNET, getDynamicChain } from "config/chains";
import * as React from "react";
import { EthersExtension } from "@dynamic-labs/ethers-v5";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ThemeContext } from "./theme-provider";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const themeContext = React.useContext(ThemeContext);
  const cssOverrides = `
    .typography--button-primary {
        font-weight : normal;
      }
      .dynamic-widget-inline-controls{
        font-size : 14px;
        max-height : none;
        border-radius : 4px;
      }
  
      .dynamic-widget-modal {
        width : 25%;
      }

     .dynamic-widget-inline-controls {
        background-color : transparent; 
        border: #D7D8D9 2px solid;
        border-radius: 10px;
     }

     .wallet__container, .active-wallet-information-container, .user-profile__fields{
        background-color : transparent;
     }

     ${
       themeContext.isDark
         ? `
     .dynamic-widget-inline-controls {
        background-color : transparent; 
        border: 1px solid #ffffff29;
        border-radius: 10px;
     }
     .dynamic-widget-card, .evm-network-control__container, .dropdown{
        background-color : #1e1e1e;
     }
     
`
         : ""
     }

    `;

  const DynamicNetworks = getDynamicChain([OPTIMISM_MAINNET, SEPOLIA_TESTNET, BLAST_SEPOLIA_TESTNET]);

  return (
    <DynamicContextProvider
      theme={themeContext.isLight ? "light" : "dark"}
      settings={{
        cssOverrides,
        environmentId: "e2b597d3-4634-4d19-9802-301ddcd8bc5a",
        evmNetworks: DynamicNetworks,
        walletConnectorExtensions: [EthersExtension],
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
