# GMX Interface Development Guidelines

## Project Overview

GMX Interface is a decentralized exchange (DEX) interface built with React/TypeScript that provides trading interfaces for perpetual futures, spot trading, and staking features on the blockchain.

### Tech Stack
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

```
src/
├── App/                    # React App root with global providers and routing
├── components/             # Reusable React components (flat structure)
├── pages/                  # Page components
├── lib/                    # Infrastructure code (contracts, chains, utils)
├── domain/                 # Domain logic by entities and features
├── config/                 # Environment configs and constants
├── styles/                 # Global styles
├── img/                    # Images
├── abis/                   # Contract ABIs
├── fonts/                  # Font files
└── typechain-types/        # Generated TypeScript types from ABIs
sdk/                        # SDK module with separate build
```

## Code Style and Conventions

### TypeScript Configuration
- Target: ES2020, Module: ESNext
- Strict mode partially enabled (strictNullChecks, strictFunctionTypes)
- BaseUrl: `./src` for absolute imports
- JSX: react-jsx

### Import/Export Rules

**CRITICAL**: Do NOT use barrel exports (index.ts/index.tsx files) for re-exporting modules.

```tsx
// ❌ Bad - barrel export
import { Component1, Component2 } from "components/Formatted";

// ✅ Good - direct imports
import { Component1 } from "components/Formatted/Component1";
import { Component2 } from "components/Formatted/Component2";
```

### React Component Guidelines

#### Structure Rules
1. **One component per file**
2. **Flat folder structure** - no nested components in folders
3. **Colocate styles** with components in the same folder
4. **Component body organization** (in order):
   - State (useState, useFetchedData, etc.)
   - Calculated variables from state and props
   - Event handlers and reused functions
   - useEffect hooks
   - Render JSX

#### File Extensions
- Components: `.tsx`
- TypeScript files: `.ts`
- Styles: `.css` or `.scss`

### Data Flow Architecture

Dependencies should follow this hierarchy:
```
config → lib (infrastructure) → domain → components → pages
```
Each layer can only use code from itself or layers to the left.

### Styling

#### Tailwind CSS
- Custom color system with CSS variables for dark/light themes
- Custom spacing system (0-96px)
- Custom font components: `text-h1`, `text-h2`, `text-body-large`, etc.
- Custom utilities: `scrollbar-hide`, `gmx-hover`, `desktop-hover`
- Numbers class for consistent formatting: `className="numbers"` (letter-spacing: 0.03em)

#### SCSS Modules
Use module syntax for imports:
```scss
@use "src/styles/colors";

.ClassName {
  background: colors.$color-red;
}
```

### Code Formatting
- **Print width**: 120 characters
- **Semicolons**: required
- **Quotes**: double quotes
- **Trailing comma**: ES5
- Tailwind CSS classes are automatically sorted by Prettier

### ESLint Rules
- No console warnings (use sparingly)
- No var declarations (use const/let)
- Import order enforced with alphabetical sorting
- No barrel imports from lodash
- Custom rules for BigInt operations

## Development Workflow

### Setup
```bash
yarn                    # Install dependencies
yarn husky install      # Setup pre-commit hooks (first time only)
```

### Development
```bash
yarn start             # Start dev server on port 3010
yarn start-home        # Start with home page in dev mode
yarn start-app         # Start with main app in dev mode
```

### Code Quality
```bash
yarn lint              # Run ESLint
yarn lint:fix          # Fix ESLint issues automatically
yarn tscheck           # TypeScript type checking
yarn prettier          # Format code
yarn check:ci          # Full CI check (lint + tests + typecheck)
```

### Testing
```bash
yarn test              # Interactive test runner
yarn test:ci           # Run tests once (CI mode)
```

### Building
```bash
yarn build             # Production build
yarn build:analyze     # Build with bundle analyzer
```

### Internationalization
```bash
yarn lingui:prepare    # Extract and compile translations
yarn extract           # Extract translation strings only
yarn compile           # Compile translations only
```

## Task Completion Checklist

Before considering any task complete:

### Code Quality
- [ ] Run `yarn lint` - no linting errors
- [ ] Run `yarn tscheck` - no TypeScript errors
- [ ] Run `yarn test:ci` - all tests pass
- [ ] Format code with `yarn prettier` if needed

### Code Review
- [ ] No barrel exports used
- [ ] All imports are direct from source files
- [ ] Components follow flat structure
- [ ] Styles are colocated with components
- [ ] Follows data flow architecture

### Final Check
- [ ] Run `yarn check:ci` for complete validation
- [ ] Code follows all conventions in this document

## Pre-commit Hooks

The project automatically runs:
- **pre-commit**: `yarn lint` (blocks commit if fails)
- **pre-push**: `yarn test` (blocks push if fails)

## Additional Notes

- Use `className="numbers"` for consistent number formatting
- Prefer `rg` (ripgrep) over `grep` for text search
- SDK types are auto-generated via `yarn typechain`
- Project supports multi-chain and dark/light themes
- Follow existing patterns when adding new features