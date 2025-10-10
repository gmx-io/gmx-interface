## Use Case: Tabs Component
- `Tabs` renders three visual styles controlled by the `type` prop:
  - `block`: underlined bar suitable for page-level navigation. Active state is handled via border color.
  - `inline`: lightweight pill buttons you can embed inside cards or toolbars; inactive options fall back to the `ghost` variant while the active option adopts `secondary`.
  - `inline-primary`: CTA-style tabs that switch between `primary` and `secondary` buttons.
- Provide `regularOptionClassname` for layout-specific tweaks instead of overriding button variants; this keeps typography and padding consistent with the global styles.
- Pair inline tabs with responsive containers when they might overflow: wrap them in `TableScrollFadeContainer` or another `overflow-x-auto` parent.

## Use Case: Button Variants
- `Button` covers five variants: `primary`, `primary-action`, `secondary` and `ghost`. Rely on the variant API instead of duplicating classes.
- `primary` and `primary-action` share the same palette but `primary-action` bumps padding (`px-24 py-18`) and minimum height for hero CTAs.
- Use the `size` prop (`small`, `medium`, `controlled`) to fit layouts; the helper adjusts min-height and gaps, keeping typography consistent without extra overrides.
- When you need navigational behavior, pass the `to` prop so the component renders a `ButtonLink` with the same visual style and analytics hooks.

## Use Case: Token & Icon Rendering
- Keep inline informational icons as React SVGs (e.g., `img/ic_info.svg?react`) to share palette tokens and respond to `currentColor` without manual theming. It will accept color from text, which also helps with color change on hover.
- Use `size-` for square sized icons and `w-,h-` for others.
- When adding new svg icon please set primary color to `currentColor` and size it to `1em`.

## Use Case: Tooltips
- `Tooltip` is the base primitive; it accepts `variant` (`icon`, `iconStroke`, `underline`, `none`) to control the handle decoration and defaults to a dashed underline.
- Prefer `TooltipWithPortal` when the tooltip might overflow masked containers - this wrapper simply enables portals while keeping the same API.

## Use Case: Alerts & Colorful Banners
- `ColorfulBanner` provides a slim announcement surface. Choose a `color` scheme (`blue`, `green`, `yellow`, `red`) to map border, background, and icon classes via theme tokens.
- Pass an SVG component to `icon` for contextual visuals; the component constrains it to `size-20` and adapts the tint automatically.
- For dismissible banners, supply `onClose`; the built-in close button stops propagation before invoking your callback, which keeps parent click handlers intact.
- `AlertInfoCard` wraps `ColorfulBanner` with opinionated defaults for `info`, `warning`, and `error`. Use it when you just need tone-appropriate styling with optional close behavior.
- Use `ColorfulButtonLink` for primary actions of banner/alert. It correctly highlights action and align with it designs
