# GMX Styling Guide

## Responsiveness
- Breakpoints are centralized in `src/lib/breakpoints.ts` (`mobile: 768`, `tablet: 1024`, `desktop: 1280`, `smallMobile: 400`). Tailwind extends these so `sm/md/lg/xl` map to the same values while arbitrary queries such as `min-[1300px]` stay available for finer control.
- Build the desktop layout first and add enhancements with `md:`/`lg:` modifiers or `max-md:` fallbacks.
- When behavior depends on viewport width (e.g., collapsible sections), gate it behind `useBreakpoints()` from `src/lib/useBreakpoints.ts` to keep logic and styling aligned.

## Common Styles
- Spacing and radius properties follow the 1 px spacing scale declared in `tailwind.config.ts`; use numeric tokens (`p-20`, `gap-8`, `rounded-8`) instead of hard-coded values so components stay aligned with the design rhythm.
- Almost all borders in app .5px width as `border-1/2` and color slate-600 set as `border-slate-600`.
- Most common rounding which applied almost for all blocks in app is `rounded-8`.
- Background depends on context where block placed, usually this is `bg-slate-900` or `bg-slate-800`.

## Typography
- Prefer `text-{size}` for customizing font-size, `text-body-medium` and similar now are deprecated.
- Use typography colors with three variants(`primary`, `secondary`, `inactive`), e.g. `text-typography-secondary`.
- Use `text-caption` for grayed uppercased labels with medium font.
- Use `text-h1`, `text-h2` and so on for titles with font-size >20px.

## Numbers
- All numbers in application are monospaced, because of rule `font-variant-numeric` on `:root`.
- Numerical outputs should use the `.numbers` utility added in the custom Tailwind plugin to lock letter-spacing and prevent wrapping. There is only exceptions for some numbers, e.g. titles. For those we don't use `.numbers` but `.normal-nums` which disables mono font for them.
- $ sign and number should be separated using hairspace symbol, usually it's already included by number component or formatters.

## Theming and Colors
- Colors are defined once in `src/config/colors.ts` and converted into CSS variables by `generateColorConfig`, which the Tailwind config injects for both themes. Every token class (e.g., `bg-slate-900`, `text-typography-primary`) resolves to a `var(--color-*)` value.
- Colors is JavaScript object, you can import and use it anywhere in application.
- Since tailwind need custom color string, colors converted to rgb for supporting opacity. It is done internally on color config creation.
- Theme can be accessed using `useTheme` hook
- Raw color value can be accessed using css variable `var(--color-*-raw)`.
- Dark mode is class-based. The `<body>` receives `.dark`, so you can opt into theme-specific tweaks with the `dark:` prefix (e.g., `dark:bg-slate-750`).
