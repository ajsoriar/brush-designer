# Filters

This directory contains one-file, self-contained image filters for the Brush Designer paint board.

Each filter is a plain IIFE that exposes a function on `global.Filters[id]`. They require no parameters — the user simply clicks the menu item and the filter runs on the active layer with undo support.

## How to add a new filter

1. Create `<filterName>.js` in this directory using the same IIFE pattern.
2. Add the function to `global.Filters` at the bottom of the file.
3. Add a menu item in `src/components/appMenu/appMenu.json` with action `"filter<Id>"`.
4. Import the file in `src/main.js`.
5. Wire the action in `src/app.js` as `filter<Id>: global.Filters && global.Filters.<id>`.

## Filter list

| # | ID | Description | File |
|---|---|---|---|
| 1 | `desaturate` | Grayscale via weighted luminance (0.299R + 0.587G + 0.114B) | `desaturate.js` |
| 2 | `invertColors` | Invert every RGB channel (255 − value) | `invertColors.js` |
| 3 | `blur` | 3×3 box blur averaging kernel | `blur.js` |
| 4 | `sepia` | Classic sepia tone with fixed RGB coefficients | `sepia.js` |
| 5 | `solarize` | Invert channels below 128 threshold | `solarize.js` |
| 6 | `posterize` | Reduce to 4 discrete levels per channel | `posterize.js` |
| 7 | `emboss` | Emboss relief kernel + 128 offset | `emboss.js` |
| 8 | `edgeDetect` | Laplacian edge detection | `edgeDetect.js` |
| 9 | `sharpen` | 3×3 sharpen kernel (center 5, neighbours −1) | `sharpen.js` |
| 10 | `grayscaleAvg` | Grayscale via equal average (R+G+B)/3 | `grayscaleAvg.js` |
| 11 | `autoContrast` | Stretch each channel min–max to 0–255 | `autoContrast.js` |
| 12 | `removeAlpha` | Set alpha to 255 for every pixel | `removeAlpha.js` |

## Structure

```
src/filters/
├── filters.json          — machine-readable index of all filters
├── README.md             — this file
├── desaturate.js
├── invertColors.js
├── blur.js
├── sepia.js
├── solarize.js
├── posterize.js
├── emboss.js
├── edgeDetect.js
├── sharpen.js
├── grayscaleAvg.js
├── autoContrast.js
└── removeAlpha.js
```
