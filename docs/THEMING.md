# GridForge Theming Guide

GridForge uses CSS custom properties (variables) for all visual styling. You can create a fully custom theme by overriding these properties on `:root` or on a container element.

## CSS Custom Properties Reference

### Grid Container

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-grid-bg` | `#0f1118` | Grid background color |
| `--gf-grid-border-radius` | `12px` | Grid corner radius |
| `--gf-grid-padding` | `16px` | Inner padding |
| `--gf-grid-shadow` | `0 8px 32px rgba(0,0,0,0.4)` | Grid drop shadow |

### Cells

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-cell-size` | `80px` | Cell width and height |
| `--gf-cell-gap` | `4px` | Gap between cells |
| `--gf-cell-bg` | `linear-gradient(145deg, #1a1d2e, #151823)` | Cell background |
| `--gf-cell-border` | `1px solid rgba(255,255,255,0.06)` | Cell border |
| `--gf-cell-border-radius` | `8px` | Cell corner radius |
| `--gf-cell-hover-bg` | `linear-gradient(145deg, #22263a, #1a1d2e)` | Cell hover background |
| `--gf-cell-hover-border` | `1px solid rgba(255,255,255,0.12)` | Cell hover border |

### Focus Ring

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-focus-ring` | `0 0 0 3px #5b8def, 0 0 12px rgba(91,141,239,0.3)` | Focus ring box-shadow |
| `--gf-focus-ring-offset` | `2px` | Focus ring offset |

### Drop Targets

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-drop-target-bg` | `linear-gradient(145deg, #1a2d1e, #152318)` | Valid drop target bg |
| `--gf-drop-target-border` | `2px solid rgba(76,175,80,0.6)` | Valid drop target border |
| `--gf-drop-target-glow` | `0 0 16px rgba(76,175,80,0.2)` | Valid drop target glow |
| `--gf-drop-invalid-border` | `2px solid rgba(244,67,54,0.5)` | Invalid drop border |
| `--gf-drop-invalid-glow` | `0 0 12px rgba(244,67,54,0.15)` | Invalid drop glow |

### Grabbed Items

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-grabbed-opacity` | `0.75` | Opacity of the grabbed item |
| `--gf-grabbed-outline` | `2px dashed rgba(255,215,0,0.7)` | Grabbed item outline |
| `--gf-grabbed-scale` | `1.05` | Scale transform when grabbed |
| `--gf-grabbed-shadow` | `0 8px 24px rgba(0,0,0,0.4)` | Grabbed item shadow |

### Items

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-item-border-radius` | `6px` | Item corner radius |
| `--gf-item-shadow` | `0 2px 8px rgba(0,0,0,0.3)` | Item shadow |
| `--gf-item-hover-shadow` | `0 4px 16px rgba(0,0,0,0.4)` | Item hover shadow |
| `--gf-item-transition` | `transform 0.2s ..., box-shadow 0.2s ...` | Item transition |

### TCG Cards

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-card-aspect-ratio` | `5 / 7` | Card aspect ratio |
| `--gf-card-back-bg` | `linear-gradient(135deg, #2a1f4e, #1a1040)` | Card back color |
| `--gf-card-back-pattern` | `repeating-conic-gradient(...)` | Card back texture |
| `--gf-card-tap-transition` | `transform 0.3s cubic-bezier(0.34,1.56,0.64,1)` | Tap rotation curve |

### Blocked Cells

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-blocked-bg` | `repeating-linear-gradient(45deg, ...)` | Blocked cell hatching |
| `--gf-blocked-opacity` | `0.5` | Blocked cell opacity |

### Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-font-family` | `system-ui, -apple-system, sans-serif` | Font family |
| `--gf-font-size-sm` | `0.75rem` | Small text size |
| `--gf-font-size-md` | `0.875rem` | Medium text size |

### Animation

| Property | Default | Description |
|----------|---------|-------------|
| `--gf-animation-duration` | `0.2s` | General animation duration |
| `--gf-animation-easing` | `cubic-bezier(0.4, 0, 0.2, 1)` | General animation easing |

---

## Creating a Custom Theme

Create a CSS file that overrides the properties you want to change:

```css
/* my-theme.css */
:root {
  --gf-grid-bg: #1a1a2e;
  --gf-cell-bg: linear-gradient(145deg, #16213e, #0f3460);
  --gf-cell-border: 1px solid rgba(100, 150, 255, 0.1);
  --gf-focus-ring: 0 0 0 3px #e94560, 0 0 12px rgba(233, 69, 96, 0.3);
  --gf-drop-target-border: 2px solid rgba(0, 200, 150, 0.6);
  --gf-grabbed-outline: 2px dashed rgba(233, 69, 96, 0.7);
}
```

Import it after the base stylesheet:

```tsx
import 'gridforge/styles/gridforge.css';
import './my-theme.css';
```

### Scoped Themes

Apply a theme to a specific container instead of globally:

```css
.ocean-theme {
  --gf-grid-bg: #0a1628;
  --gf-cell-bg: linear-gradient(145deg, #0d2137, #0a1628);
  --gf-focus-ring: 0 0 0 3px #00bcd4;
}
```

```tsx
<div className="ocean-theme">
  <Grid id="ocean-board" ... />
</div>
```

---

## Built-In Themes

GridForge ships with four themes. Import one alongside the base stylesheet.

### Felt (`theme-felt.css`)

Dark green felt table surface. Classic card-game table aesthetic with a fabric-like texture overlay, warm gold focus ring, and a radial highlight that mimics a table lamp.

```tsx
import 'gridforge/styles/themes/theme-felt.css';
```

### Parchment (`theme-parchment.css`)

Aged parchment surface for RPG battle maps. Warm sepia tones, serif typography (Palatino/Georgia), ink-like grid lines, and a brown leather card-back. Focus ring uses dark ink brown for high contrast on the light surface.

```tsx
import 'gridforge/styles/themes/theme-parchment.css';
```

### Modern (`theme-modern.css`)

Clean, minimal light UI with flat design and subtle shadows. White background, system sans-serif font (Inter), and blue accent colors. Well-suited for inventory screens, kanban boards, and productivity UIs.

```tsx
import 'gridforge/styles/themes/theme-modern.css';
```

### Neon (`theme-neon.css`)

Cyberpunk-inspired dark theme with neon cyan, green, and magenta accent glows. Near-black background, monospace typography (JetBrains Mono/Fira Code), scanline texture overlay, and an intense vignette effect.

```tsx
import 'gridforge/styles/themes/theme-neon.css';
```

---

## Dark / Light Mode Support

The base stylesheet includes a `@media (prefers-color-scheme: light)` block that automatically adjusts all colors for light mode. This provides:

- Light gray grid background (`#f0f2f5`)
- White cell backgrounds
- Darker borders and shadows
- Blue focus ring instead of the default light-blue
- Adjusted card-back and blocked-cell colors

If you create a custom theme and want to support both modes, include your own media query:

```css
:root {
  --gf-grid-bg: #1a1a2e; /* dark mode */
}

@media (prefers-color-scheme: light) {
  :root {
    --gf-grid-bg: #f0f0ff; /* light mode */
  }
}
```

---

## High Contrast Mode

GridForge includes a `@media (forced-colors: active)` rule that ensures:

- Focused cells get a `3px solid Highlight` outline
- Grabbed items get a `3px dashed Highlight` outline
- All visual states remain distinguishable using system colors only

This ensures usability in Windows High Contrast Mode and similar environments.

---

## Reduced Motion

When `prefers-reduced-motion: reduce` is detected, GridForge sets:

```css
--gf-item-transition: none;
--gf-card-tap-transition: none;
--gf-animation-duration: 0s;
```

All animations are disabled. Items still move to their new positions; they simply appear instantly instead of animating.

---

## CSS Class Reference

All classes are prefixed with `.gf-` to avoid naming collisions.

| Class | Element |
|-------|---------|
| `.gf-grid` | Grid container |
| `.gf-row` | Grid row (uses `display: contents`) |
| `.gf-cell` | Cell |
| `.gf-cell--empty` | Empty cell |
| `.gf-cell--occupied` | Cell with items |
| `.gf-cell--drop-target` | Valid drop target (during grab) |
| `.gf-cell--drop-invalid` | Invalid drop target |
| `.gf-cell--blocked` | Permanently blocked cell |
| `.gf-cell--grab-source` | Origin cell of the grabbed item |
| `.gf-cell--focused` | Currently focused cell |
| `.gf-item` | Item/game piece |
| `.gf-item--grabbed` | Currently grabbed item |
| `.gf-item--tapped` | Item with non-zero tap angle |
| `.gf-item--face-down` | Face-down item |
| `.gf-card` | TCG card element |
| `.gf-card-back` | Card back face |
| `.gf-tray` | ItemTray container |
| `.gf-tray--horizontal` | Horizontal tray |
| `.gf-tray--vertical` | Vertical tray |
| `.gf-drag-overlay` | Ghost item during mouse drag |
| `.gf-drop-indicator` | Drop indicator overlay |
| `.gf-drop-indicator--valid` | Valid drop indicator |
| `.gf-drop-indicator--invalid` | Invalid drop indicator |
| `.gf-drop-indicator--stack` | Stack drop indicator |
| `.gf-context-menu` | Context menu container |
| `.gf-context-menu__item` | Context menu item |
| `.gf-context-menu__separator` | Menu separator line |
| `.gf-context-menu__shortcut` | Keyboard shortcut hint |
| `.gf-help-dialog` | Help dialog overlay |
| `.gf-help-dialog__close` | Help dialog close button |
| `.gf-grid-lines` | Grid line overlay |
| `.gf-sr-only` | Screen-reader-only text |
| `.gf-announcer` | Live region container |
