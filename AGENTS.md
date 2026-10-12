## Migration background

This project is integrating Solana support into the main project. The `gmx-solana-interface` subproject is primarily a reference for understanding Solana-related resources and behavior; the implementation must follow the main project's existing frontend component, architecture, state management, and interaction system.

## Solana migration

1. Use `gmx-solana-interface` to understand Solana-related resources, data access, interfaces, and observable behavior; do not treat it as a source to be ported wholesale.
2. Preserve the main project's existing architecture, frontend components, page structure, state management, interaction patterns, and business logic whenever implementing Solana support.
3. For each Solana module, if the main project already provides an equivalent frontend component or module, reuse it. If the main project has no equivalent and a new frontend component or module is required, ask the user for confirmation before introducing it.
4. Do not directly transplant the reference project's business logic, pages, or UI components. Reimplement only the required behavior using the main project's existing patterns and adapt reference data or interfaces to fit them.
5. Keep migration changes focused on the Solana integration and avoid unrelated refactors or component changes.
6. When the required behavior, data contract, or integration approach remains unclear after reviewing the relevant reference code, ask the user for clarification before implementing.

## Engineering standards

1. Refer to the `gmx-prompts` subproject for coding style, technical standards, development practices, and code review guidance.
2. When implementing or reviewing changes, apply the relevant guidance from `gmx-prompts` together with the project-specific instructions in this file.

## General instructions

1. Do not run side-effecting git commands unless explicitly requested. Inspection-only git commands are always allowed.
2. If the user explicitly says `push`, automatically run `git add .`, create a commit with an appropriate commit message, and push the commit to the configured remote.
3. Keep user-facing replies concise and accurate. Describe the essence of the issue clearly, in a way that is easy for humans to read.
4. When solving a task, stay focused on the requested problem only. Do not make opportunistic optimizations, refactors, formatting changes, or unrelated edits.
5. Do not automatically run UI tests, builds, or deployments, open browsers, or start local debug/development servers. UI testing, builds, deployments, and visual verification must be performed manually by the user unless explicitly requested.
6. When requirements, context, or expected behavior are unclear, ask the user for clarification before implementing. Do not proceed based on assumptions or guesses.
7. When requirements, context, or expected behavior are unclear, avoid listing multiple possibilities or providing long speculative explanations. Briefly state what is unclear and ask the user for clarification directly.
8. Treat questions as requests for explanation or analysis by default. Only modify code, edit files, or run commands when the user clearly asks for action.
9. Do not add speculative fallback logic to compensate for uncertainty. Prefer exposing errors clearly over silently masking them.
10. Unless the user explicitly asks for a complete one-shot implementation, prefer incremental, test-friendly changes that are small, focused, and easy for humans to review and test.
