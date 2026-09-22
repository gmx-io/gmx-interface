# AGENTS.md

1. Do not run side-effecting git commands unless explicitly requested. Inspection-only git commands are always allowed.
2. If the user explicitly says `push`, automatically run `git add .`, create a commit with an appropriate commit message, and push the commit to the configured remote.
3. Keep user-facing replies concise and accurate. Describe the essence of the issue clearly, in a way that is easy for humans to read and understand.
4. When solving a task, stay focused on the requested problem only. Do not make opportunistic optimizations, refactors, formatting changes, or unrelated edits.
5. Do not automatically run UI tests, builds, or deployments, open browsers, or start local debug/development servers. UI testing, builds, deployments, and visual verification must be performed manually by the user unless explicitly requested.
6. When requirements, context, or expected behavior are unclear, ask the user for clarification before implementing. Do not proceed based on assumptions or guesses.
7. When requirements, context, or expected behavior are unclear, avoid listing multiple possibilities or providing long speculative explanations. Briefly state what is unclear and ask the user for clarification directly.
8. Treat questions as requests for explanation or analysis by default. Only modify code, edit files, or run commands when the user clearly asks for action.
9. Do not add speculative fallback logic to compensate for uncertainty. Prefer exposing errors clearly over silently masking them.
10. Unless the user explicitly asks for a complete one-shot implementation, prefer incremental, test-friendly changes that are small, focused, and easy for humans to review and test.
