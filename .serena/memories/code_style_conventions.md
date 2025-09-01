# Code Style and Conventions

## TypeScript Configuration
- Target: ES2020
- Module: ESNext
- Strict mode partially enabled (strictNullChecks, strictFunctionTypes enabled)
- BaseUrl: ./src for absolute imports
- JSX: react-jsx

## Code Style Rules

### Import/Export Rules
- **CRITICAL**: Do NOT use barrel exports (index.ts/index.tsx files)
- Import components directly from their source files

### React Component Structure
1. One component per file
2. Keep flat folder structure - no nested components
3. Keep styles and components together in the same folder
4. Component body order:
   - State (useState, useFetchedData, etc.)
   - Calculated variables from state and props
   - Event handlers and reused functions
   - useEffect
   - Render

### File Extensions
- Components: `.tsx`
- TypeScript files: `.ts`
- Styles: `.css` or `.scss`

### Formatting
- Print width: 120 characters
- Semicolons: required
- Quotes: double quotes
- Trailing comma: ES5
- Tailwind CSS classes are automatically sorted

### ESLint Rules
- No console warnings
- No var declarations
- Prefer const (currently off but recommended)
- Import order enforced with groups
- No barrel imports from lodash
- Custom rules for BigInt operations

### Data Flow Architecture
Dependencies should flow:
```
config → lib (infrastructure) → domain → components → pages
```
Each layer can only use code from itself or layers to the left.

### SCSS Imports
Use module syntax:
```scss
@use "src/styles/colors";
.ClassName {
  background: colors.$color-red;
}
```

## Tailwind Configuration
- Custom color system with CSS variables
- Dark/Light mode support via class
- Custom spacing system (0-96px)
- Custom font components (text-h1, text-h2, text-body-large, etc.)
- Custom utilities: scrollbar-hide, gmx-hover, desktop-hover
- Numbers class for consistent number formatting (letter-spacing: 0.03em)