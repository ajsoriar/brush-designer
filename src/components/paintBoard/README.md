# PaintBoard

Componente canvas reusable. Por defecto crea un board de `640x480` con fondo blanco.

## Uso

```html
<link rel="stylesheet" href="../src/components/paintBoard/paintBoard.css">
<script src="../src/components/paintBoard/paintBoard.js"></script>
```

```js
var board = PaintBoard({
    containerId: "paint-board-window-content",
    width: 640,
    height: 480,
    backgroundColor: "#000000"
});
```

Tambien queda disponible como `paintBoard(...)`.

## Herramientas

El modo de pintado se puede cambiar desde la consola:

```js
PaintTools.use("SQUARED-POINTS");
PaintTools.use("ROUND-POINTS");
PaintTools.use("SQUARED-LINES");
PaintTools.use("ROUND-LINES");
PaintTools.use("FILLED-SQUARES");
PaintTools.use("FILLED-RECTANGLES");
PaintTools.use("FILLED-CIRCLES");
PaintTools.use("FILLED-OVALS");
PaintTools.use("STROKED-SQUARES");
PaintTools.use("STROKED-RECTANGLES");
PaintTools.use("STROKED-CIRCLES");
PaintTools.use("STROKED-OVALS");
PaintTools.use("DESIGNED-BRUSH");
```

`SQUARED-POINTS` es el modo por defecto. `ROUND-POINTS` pinta puntos circulares. `SQUARED-LINES` pinta una linea cuadrada desde la ultima posicion del raton hasta la posicion actual mientras se arrastra. `ROUND-LINES` pinta esa linea con extremos y uniones redondeadas. Las herramientas `FILLED-*` y `STROKED-*` capturan el punto inicial en `mousedown` y dibujan la figura final en `mouseup`. `DESIGNED-BRUSH` pinta con el brush seleccionado en `brush-editor-outputs`.

## Opciones

- `id`: id del componente paint board.
- `containerId`: id del div donde se renderiza. Si no se pasa, crea un contenedor en `body`.
- `width`: ancho del canvas. Por defecto `640`.
- `height`: alto del canvas. Por defecto `480`.
- `backgroundColor`: color de fondo. Por defecto `#ffffff`.
- `paintOnPointer`: pinta al hacer click o arrastrar. Por defecto `true`.
- `brushSize`: tamano del pincel en pixeles. Por defecto `1`.
- `className`: clase adicional para el wrapper.
- `onSave`: callback al llamar a `board.save()`.

## API

- `board.clear()`
- `board.paintAt(x, y)`
- `board.setSize(width, height)`
- `board.setBackgroundColor(backgroundColor)`
- `board.save()`
- `board.destroy()`
