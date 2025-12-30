# Changelog

All notable changes to the Nyvarra Studio project will be documented in this file.

## [2.0.0] - 2025-12-31 "The Cinematic Update"

### 🚀 New Features

- **Advanced Typography Engine**:
  - Integrated dynamic Google Fonts support (Type any font name).
  - Added **Character Spacing (Tracking)** control.
  - Added text transforms: Uppercase, Lowercase, Capitalize.
  - Added true **Small Caps** support.
  - Variable font weight control (Thin 100 to Black 900) and Italics.
- **Cinematic Text Presets**:
  - Added 12 Hollywood-grade text styles (e.g., _Blade Runner_, _Dune_, _Oppenheimer_, _Barbie_).
- **Masking Studio**:
  - Added **Brush Mask** ("Paint to Select") for precise local adjustments.
  - Added **Luminosity Masks** (targeting Shadows/Highlights).
  - Added **Gradient Masks** (Linear/Radial).

### 🎨 UI/UX Improvements

- **Modernized Controls**:
  - Replaced native browser checkboxes with custom animated `Toggle` components.
  - Replaced native dropdowns with premium `CustomSelect` components (backdrop blur, search-ready styling).
  - Removed all emojis from the interface; replaced with professional **Tabler Icons** (e.g., colored circles in HSL panel).
- **Text Tab Overhaul**:
  - Completely redesigned the Typography tab for better hierarchy (Content vs. Style vs. Typography).

### 🛠️ Technical Improvements

- **Refactoring**:
  - Extracted `CinematicTextControls.tsx` as a standalone component.
  - Modularized `ControlGroup` and `Slider` into reusable `app/components/`.
  - Improved type safety across component props.
- **Stability**:
  - Resolved `Next.js` Turbopack build issues ("Expected static flag was missing").
  - Optimized dynamic imports for Editor performance.
