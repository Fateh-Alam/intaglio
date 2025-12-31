# Changelog

All notable changes to the Nyvarra Studio project will be documented in this file.

## [2.5.0] - 2025-12-31 "The Physics Update"

### 🚀 New Features

- **Palette Heist v2 (Interactive Color Match)**:
  - Added **Region of Interest (ROI)** selection. Draw a box on your image to match colors from a specific area.
  - Visual ROI overlay with draggable/resizable selection.
- **Physics-Based Effects**:
  - Added **Halation**: Film-like red-orange light bleed around bright areas.
  - Added **Optical Bloom**: Soft, natural glow effect with adjustable threshold and radius.
- **New Controls**:
  - Added "Physics: Halation & Bloom" control group in the Effects tab.
  - Strength, Threshold, and Radius sliders for fine-tuning.
- **3D LUT Creator**:
  - Build custom Look Up Tables with lift, gamma, gain, saturation, temperature controls.
  - 6 quick presets (Neutral, Cinematic, Faded Film, High Contrast, Cool/Warm Tone).
  - Export as industry-standard .cube files or apply directly to image.
- **Video Color Grading**:
  - Upload .mp4, .mov, .webm videos for live color grading preview.
  - Real-time CSS filter application showing your grade on video.
  - Extract frames to use as images with full grading controls.
- **Reference View**:
  - Floating, draggable comparison window for reference images.
  - Pin position, zoom controls, and Original/Reference toggle.
- **History Branching**:
  - Create named branches to save different edit versions.
  - Restore or delete branches from the History panel.

### 🎨 UI/UX Improvements

- **Advanced Export Modal**: Added quality slider (1-100%), scale selection (0.5x-4x), and format choice (JPG/PNG/WEBP).
- **Histogram Tutorial**: Interactive modal explaining how to read histograms with "Plain English" explanations.
- **Minimizable Panels**: Left/Right sidebars and Look Intensity overlay can now be collapsed.

---

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
