# Task Completion Checklist

When completing any coding task in the GMX Interface project, ensure you:

## 1. Code Quality Checks
- [ ] Run `yarn lint` to check for linting errors
- [ ] Run `yarn lint:fix` if there are fixable issues
- [ ] Run `yarn tscheck` to ensure no TypeScript errors
- [ ] Run `yarn prettier` to format code if needed

## 2. Testing
- [ ] Run `yarn test:ci` to ensure all tests pass
- [ ] Add new tests if implementing new features

## 3. Import/Export Verification
- [ ] Verify no barrel exports are used
- [ ] Ensure all imports are direct from source files

## 4. Component Structure
- [ ] One component per file
- [ ] Component files in flat structure (no nesting)
- [ ] Styles colocated with components
- [ ] Proper component body organization

## 5. Before Committing
- [ ] All lint checks pass
- [ ] Type checking passes
- [ ] Tests pass
- [ ] Code follows project conventions in CLAUDE.md

## 6. Final CI Check
Run `yarn check:ci` to perform all checks at once:
- Linting
- Tests
- TypeScript type checking

This ensures the code is ready for review and merging.