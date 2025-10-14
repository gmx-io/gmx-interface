## Use Case: Tabs Component
- Keep layout tweaks scoped to wrappers instead of overriding built-in button variants so gaps and paddings stay consistent.
- Pair inline tabs with responsive containers when they might overflow: wrap them in `TableScrollFadeContainer` or another `overflow-x-auto` parent.

## Use Case: Links
- `ExternalLink` keeps typography consistent for out-of-app anchors, offering either the default underline or an icon-decorated option.
- `Link` common link component from `react-router-dom` used for internal navigation. Use it when you need to style simple text-like links.
- `Button` can render navigational links while preserving button styling.

## Use Case: Token & Icon Rendering
- Keep inline informational icons as React SVGs (e.g., `img/ic_info.svg?react`) to share palette tokens and respond to `currentColor` without manual theming. It will accept color from text, which also helps with color change on hover.
- Use `size-` for square sized icons and `w-,h-` for others.
- When adding new svg icon please set primary color to `currentColor` and size it to `1em`.

## Use Case: Tooltips
- Use when you need to surface short clarifications without disrupting the surrounding layout.
- Prefer `TooltipWithPortal` when the tooltip might overflow masked containers - this wrapper simply enables portals while keeping the same API.

## Use Case: Alerts & Colorful Banners
- Add an SVG component for contextual visuals; the component constrains it to `size-20` and adapts the tint automatically.
- When dismissal is enabled, the built-in close button stops propagation before invoking your handler, which keeps parent click handlers intact.
- `AlertInfoCard` wraps `ColorfulBanner` with opinionated defaults for `info`, `warning`, and `error`. Use it when you just need tone-appropriate styling with optional close behavior.
- Use `ColorfulButtonLink` for primary banner or alert actions so the CTA stays highlighted and aligned with the design system.

## Use Case: Page Layout
- `AppPageLayout` is the shell for all page views. It pins the `SideNav`, wraps content in a max-width column, and injects the global `AppHeader`/`Footer` for page.
