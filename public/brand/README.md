# NEVERBE Brand Identity Assets

Clean, modern, athletic identity for **NEVERBE** apparel & footwear (Sri Lanka).
All assets are vector paths, require zero external fonts, have no FOUT, and scale smoothly from 16px favicons to billboard signage.

---

## 1. Asset Overview

| Asset | Format | Dimensions | Purpose |
| :--- | :--- | :--- | :--- |
| `neverbe-mark-black.svg` | SVG | 48 × 48 | Standalone athletic monogram (9° slant, 9px stems) |
| `neverbe-mark-white.svg` | SVG | 48 × 48 | Standalone mark for dark backgrounds |
| `neverbe-mark-green.svg` | SVG | 48 × 48 | Standalone mark in signature forest green (`#236b3a`) |
| `neverbe-logo-black.svg` | SVG | 231.4 × 36 | Full brand lockup: Monogram + NEVERBE wordmark |
| `neverbe-logo-white.svg` | SVG | 231.4 × 36 | Full brand lockup inverted for dark themes |
| `neverbe-logo-green.svg` | SVG | 231.4 × 36 | Full brand lockup in forest green (`#236b3a`) |
| `public/logo.png` | PNG | 926 × 144 | High-resolution crisp transparent PNG for invoices/bills |
| `public/mail-logo.png` | PNG | 463 × 72 | Optimized transparent PNG for transactional emails |
| `public/apple-touch-icon.png`| PNG | 180 × 180 | iOS home screen bookmark icon (dark squircle) |
| `public/icon-192.png` | PNG | 192 × 192 | PWA standard icon |
| `public/icon-512.png` | PNG | 512 × 512 | PWA high-res splash icon |
| `public/favicon.ico` | ICO | 16/32/48 multi | Browser tab favicon with multi-resolution contrast |
| `identity-preview.svg` | SVG | 1200 × 860 | Visual brand spec sheet & print mockups |
| `identity-preview.png` | PNG | 1200 × 860 | High-res rendered raster sheet |

---

## 2. Geometric Specifications

### Standalone Monogram (Short Mark)
- **ViewBox**: `0 0 48 48`
- **Path**: `M6 43L12 5H21L32.4 28.5L33 5H42L36 43H27L15.6 19.5L15 43Z`
- **Slant**: Exactly 9.0° athletic forward tilt (`dx = (43 - y) * (6 / 38)`).
- **Stems**: Parallel 9.0px vertical stems with flush flat caps.
- **Diagonal**: 9.4px diagonal bar meeting flush with outer uprights.

### Full Brand Lockup
- **ViewBox**: `0 0 231.4 36`
- **Composition**: Slanted monogram at cap height 28px, followed by `NEVERBE` uppercase letterforms at cap height 28px with 3.2px tracking.
- **Paths**: Single unified `fill-rule="evenodd"` path to eliminate SVG draw artifacts and ensure fast GPU composition.

---

## 3. Web Component Usage

Use the React component in `components/BrandLogo.tsx`:

```tsx
import BrandLogo from "@/components/BrandLogo";

// Full brand wordmark (default)
<BrandLogo className="custom-class" />

// Standalone compact mark
<BrandLogo variant="short" className="h-8 w-8" />
```

The component automatically uses `fill="currentColor"`, adapting smoothly across light/dark themes, contrast backgrounds, and hover transitions.
