# GMX Interface Project Overview

## Project Purpose
GMX Interface is a decentralized exchange (DEX) interface built with React/TypeScript. It provides a trading interface for perpetual futures, spot trading, and staking features on the blockchain.

## Tech Stack
- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom configuration + SCSS modules
- **State Management**: React hooks, context, and SWR for data fetching
- **Blockchain Integration**: ethers.js v6, wagmi, rainbowkit for wallet connections
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier with Tailwind plugin
- **Package Manager**: Yarn 3.1.0
- **Internationalization**: Lingui for translations

## Project Structure
- `src/App/` - React App root component with global providers and routing
- `src/components/` - Reusable React components (flat structure, no nesting)
- `src/pages/` - Page components
- `src/lib/` - Infrastructure code (contracts, chains, utils)
- `src/domain/` - Domain logic separated by entities and features
- `src/config/` - Environment-dependent configs and constants
- `src/styles/` - Global styles
- `src/img/` - Images
- `src/abis/` - Contract ABIs
- `src/fonts/` - Font files
- `sdk/` - SDK module with separate build

## Key Features
- Trading interface for perpetual futures
- Spot trading
- Liquidity provision
- Staking and vesting features
- Multi-chain support
- Dark/Light theme support