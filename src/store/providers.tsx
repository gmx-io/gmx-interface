import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { MORPH_HOLESKY, MORPH_MAINNET, OPTIMISM_MAINNET, SEPOLIA_TESTNET, BASE_MAINNET, getDynamicChain } from "config/chains";
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

      .wallet-list__scroll-container{
        gap: 4px;
      }
      .wallet-list-item__tile{
        padding: 7px;
      }

      .dynamic-widget-card{
        background-color : #ffffff; 
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

     .input__container .input {
      font-size : 1.3rem;
     }

     ${
       themeContext.isDark
         ? `
     .dynamic-widget-inline-controls {
        background-color : transparent; 
        border: 1px solid #ffffff29;
        border-radius: 10px;
     }

     .connect-button {
      background : transparent;
     }

     .badge__container {
      background-color : #302128;
     }
     .badge__container, .badge__dot{
      border-radius: 6px;
      
     }

     .input__container .input, .modal-card {
      background : #111320;
     }
     .input__container .input:not(.input__error):focus, .input__container .input:not(.input__error):hover {
      background : #111320;
     }
     .dynamic-widget-card, .evm-network-control__container, .dropdown{
        background-color : #111320;
     }
     .dynamic-widget-inline-controls__network-picker-list {
        min-width: 170px;
     }
    .dynamic-widget-inline-controls__network-picker-list .network-action .network {
      align-items: center;
    }
`
         : ""
     }

    `;

  const enabledNetworks = [MORPH_MAINNET, BASE_MAINNET];
  if (process.env.NODE_ENV === "development" || process.env.DEPLOYED_ENV === "preview") {
    enabledNetworks.push(MORPH_HOLESKY, SEPOLIA_TESTNET, OPTIMISM_MAINNET);
  }
  const DynamicNetworks = getDynamicChain(enabledNetworks);

  return (
    <DynamicContextProvider
      theme={themeContext.isLight ? "light" : "dark"}
      settings={{
        cssOverrides,
        environmentId: process.env.REACT_APP_DYNAMIC_ENVIRONMENT_ID || "8e7e23bc-43e3-4eb1-ba85-401166cee40e",
        evmNetworks: DynamicNetworks,
        walletConnectorExtensions: [EthersExtension],
        walletConnectors: [EthereumWalletConnectors],
        privacyPolicyUrl: "https://t3.money/#/privacy-policy",
        termsOfServiceUrl: "https://t3.money/#/terms-and-conditions",
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
