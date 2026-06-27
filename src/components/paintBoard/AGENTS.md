# Layers management — notes for AI agents

Concise map of how board layers work. Read this before touching layer code.

## Ownership
- Layers are **data owned by each board (document)**, not by any UI window.
- Each `PaintBoard` instance holds its own layers in `board.layers` and exposes
  `board.getLayers()`.
- Multiple boards run in parallel, so every board keeps its **own** layers copy.

## The `useLayers` flag
- `PaintBoard` accepts a `useLayers` config flag (default `false`).
- `useLayers: true` (used by the application, `app.openWindows.js`): the board
  builds its initial layers stack and feeds the Layers component with that data.
- `useLayers: false` (used by the demo examples): no layers stack is created
  (`board.layers` stays empty), so the current single-canvas structure is used.

## Where the code lives
- `layersManager.js` (this folder) — **home for all board layer-management
  functions**, including `createInitialLayers()` (the initial stack for a new
  board). Exposed as the global `PaintBoardLayersManager`.
- `paintBoard.js` — only delegates to `PaintBoardLayersManager` and stores the
  result in `board.layers`.

## The Layers UI (must review on any layer change)
- The visual panel is a **separate component**: `src/components/layersPanel`.
- It is a stateless view: it receives layers through its `setLayers(layers)` API
  and returns them with `getLayers()`. It no longer holds any default stack.
- The **shape of each layer object is shared** between `layersManager.js` and
  `layersPanel`. If you change that shape in one place, review the other.
  See `src/components/layersPanel/example*.json` for the expected input shape.

## Photoshop-style painting
- Each layer is a DOM `<li>` with its own `<canvas>`, stacked inside the board's
  `<ol>` (`board.layersElement`).
- The board paints through `board.canvas` / `board.context`. `setActiveLayer`
  (in `layersManager.js`) redirects those to the **selected layer's** canvas, so
  painting always targets the active layer even when other layers sit on top.
- Selecting a layer in the Layers window calls `board.setActiveLayer(layerId)`
  (via the panel's `onActiveLayerChange`). `addLayer`/`removeLayer` also call it
  so the active paint target stays in sync.

## Wiring
- `src/app.openWindows.js` feeds the panel with the active board's layers
  (`syncLayersPanelLayers`) when the Layers window opens and when the active
  board changes (`setActivePaintBoard`). Layer selection in the panel switches
  the board's active paint target through `board.setActiveLayer`.
