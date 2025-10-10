# GMX Component Styling Guide

## Responsiveness
- Breakpoints are centralized in `src/lib/breakpoints.ts` (`mobile: 768`, `tablet: 1024`, `desktop: 1280`, `smallMobile: 400`). Tailwind extends these so `sm/md/lg/xl` map to the same values while arbitrary queries such as `min-[1300px]` stay available for finer control.
- Build the mobile layout first and add enhancements with `md:`/`lg:` modifiers or `max-md:` fallbacks.
- When behavior depends on viewport width (e.g., collapsible sections), gate it behind `useBreakpoints()` from `src/lib/useBreakpoints.ts` to keep logic and styling aligned.

## Common Styles
- Spacing and radii follow the 1 px spacing scale declared in `tailwind.config.ts:167`; use numeric tokens (`p-20`, `gap-8`, `rounded-8`) instead of hard-coded values so components stay aligned with the design rhythm.
- Prefer 0.5 px borders via `border-1/2` paired with slate shades such as `border-slate-600` (`src/components/Earn/Discovery/EarnProductCard.tsx:139`).
- Default containers usually combine `rounded-8` with `bg-slate-900` or `bg-slate-800`; keep padding at `p-16`/`p-20` for consistency (`src/components/Earn/Portfolio/RewardsBar.tsx:42`).
- Use the typography tokens for text hierarchy—`text-typography-primary`, `text-typography-secondary`, `text-typography-inactive`—instead of raw color classes.

## TODO Typography

## Numbers
- Numeric text inherits `font-variant-numeric` from `:root`, so figures stay monospaced by default across the app.
- Apply the `.numbers` utility (from the Tailwind plugin) whenever values should avoid wrapping and use the shared letter-spacing; use `.normal-nums` only for headings or titles that need proportional digits.
- The currency formatter already inserts hair spaces between the symbol and value—preserve that spacing when composing custom number displays.

## Theming and Colors
- Colors are defined once in `src/config/colors.ts` and converted into CSS variables by `generateColorConfig`, which the Tailwind config injects for both themes. Every token class (e.g., `bg-slate-900`, `text-typography-primary`) resolves to a `var(--color-*)` value, so avoid raw hex codes unless a design asset explicitly requires it (`src/components/Earn/Discovery/EarnProductCard.tsx:143`).
- Dark mode is class-based (`tailwind.config.ts:166`, `darkMode: "class"`). The `<body>` receives `.dark`, so you can opt into theme-specific tweaks with the `dark:` prefix (e.g., `dark:bg-slate-750`).

