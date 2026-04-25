---
name: Ethereal Obsidian
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ecb2ff'
  on-secondary: '#520071'
  secondary-container: '#cf5cff'
  on-secondary-container: '#480063'
  tertiary: '#f5f5f5'
  on-tertiary: '#2f3131'
  tertiary-container: '#d9d9d9'
  on-tertiary-container: '#5d5f5f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f8d8ff'
  secondary-fixed-dim: '#ecb2ff'
  on-secondary-fixed: '#320047'
  on-secondary-fixed-variant: '#74009f'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  code:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 32px
  gutter: 24px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
This design system is a sophisticated evolution of ethereal aesthetics, focusing on the interplay between deep, volumetric space and organic, hyper-rounded forms. The brand personality is prestigious, serene, and technologically advanced. It evokes an emotional response of "digital weightlessness"—where elements feel like polished obsidian floating in a vacuum, illuminated by soft, atmospheric light.

The style merges **Glassmorphism** with **Minimalism**, utilizing the "super-ellipse" as its core geometric DNA. By combining the vastness of dark mode with the friendly, ergonomic nature of extreme corner radii, the UI feels both high-end and deeply accessible.

## Colors
The palette is rooted in a "True Obsidian" base—a near-black neutral that provides the necessary depth for volumetric effects. 

- **Primary & Secondary:** These are treated as "Luminous Sources" rather than flat fills. Use them for focus states, active indicators, and soft-focus background glows (auras).
- **Surface Colors:** Use subtle variations of the neutral base (e.g., #121214, #1A1A1C) to create a sense of stacked glass layers.
- **Accents:** High-contrast white is reserved for primary typography and essential iconography to ensure legibility against the deep backgrounds.

## Typography
Manrope is the sole typeface, chosen for its geometric balance and modern spirit. Headlines should utilize tighter letter-spacing and heavier weights to feel impactful and "locked-in." Body text maintains a generous line height to preserve the airy, ethereal quality of the design system. Label styles should be used sparingly for metadata and small UI anchors, often benefiting from slight letter-spacing increases for clarity.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy with significant breathing room. Surfaces should never feel cramped; instead, use generous internal padding (container-padding) to emphasize the "super-ellipse" curvature. Elements are arranged in a 12-column system, but the visual priority is on vertical "stacks" and "clusters" that allow the background glows to peak through the negative space.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Backdrop Blurs**. Rather than traditional drop shadows, use "Outer Glows" and "Inner Borders":

1.  **The Void (Level 0):** The deepest background, #050505.
2.  **Floating Panes (Level 1):** Slightly lighter obsidian with a 1px 10% white inner stroke to define the edge. Apply a 20px-40px backdrop blur.
3.  **Active Elements (Level 2):** Use soft-focus glows in the primary or secondary color behind the element to simulate light emission.
4.  **Interaction:** When hovered, elements should subtly scale up and their inner stroke opacity should increase, simulating the object moving closer to the viewer.

## Shapes
The defining characteristic of this design system is the **Super-Ellipse**. Avoid standard geometric radii in favor of continuous curvature that feels organic. 

- **Primary Containers:** Use the highest level of roundedness (32px - 48px).
- **Inputs & Buttons:** Use a pill-shape or a minimum of 16px radius.
- **Code Blocks:** Even technical elements must follow the rounded aesthetic, breaking the traditional "sharp-edged" developer UI trope.
- **Masking:** All imagery and videos must be masked with the same super-ellipse corner radii to maintain system harmony.

## Components
- **Buttons:** High-gloss finishes or deep obsidian fills with luminous text. Primary buttons use a subtle gradient stroke. Radius is always 100vh (pill) or a minimum of 24px.
- **Input Fields:** Semi-transparent dark fills with a 1px "ghost" border. On focus, the border glows with the primary color and the background blur intensity increases.
- **Cards:** Large-format containers with a 40px corner radius. They should feature a very subtle radial gradient moving from the center-top to the bottom-right.
- **Chips/Badges:** Small, pill-shaped indicators with high-contrast text and a low-opacity version of the primary/secondary color as a background.
- **Glass Trays:** Used for navigation or toolbars, these use a heavy backdrop blur (60px+) and float above the main content with 32px of margin from the viewport edges.
- **Progress Bars:** Ultra-thin tracks with glowing, rounded caps for the progress indicator.