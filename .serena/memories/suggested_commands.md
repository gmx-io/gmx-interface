# Suggested Commands for Development

## Installation & Setup
- `yarn` - Install dependencies
- `yarn husky install` - Setup pre-commit hooks (first time)

## Development
- `yarn start` - Start dev server on port 3010
- `yarn start-home` - Start with home page in dev mode
- `yarn start-app` - Start with main app in dev mode

## Building
- `yarn build` - Build for production
- `yarn build:analyze` - Build with bundle analyzer
- `yarn build-home` - Build home page for production
- `yarn build-app` - Build main app for production

## Testing
- `yarn test` - Run tests in interactive watch mode
- `yarn test:ci` - Run tests once (CI mode)

## Code Quality & Linting
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues automatically
- `yarn tscheck` - TypeScript type checking
- `yarn prettier` - Format code with Prettier
- `yarn check:ci` - Run lint, tests, and type checking (full CI check)

## Pre-commit/Push Hooks (automatic)
- `yarn pre-commit` - Runs lint (automatic on git commit)
- `yarn pre-push` - Runs tests (automatic on git push)

## Internationalization
- `yarn extract` - Extract translation strings
- `yarn compile` - Compile translations
- `yarn lingui:prepare` - Extract and compile translations
- `yarn lingui:generate` - Generate translation files with overwrite

## SDK & Types
- `yarn typechain` - Generate TypeScript types from ABIs
- `yarn postinstall` - Build SDK and generate types (runs after yarn install)

## System Commands (macOS/Darwin)
- `git` - Version control
- `ls` - List directory contents
- `cd` - Change directory
- `rg` (ripgrep) - Fast text search (preferred over grep)
- `find` - Find files and directories