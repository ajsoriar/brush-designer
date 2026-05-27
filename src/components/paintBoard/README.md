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

## Opciones

- `id`: id del componente paint board.
- `containerId`: id del div donde se renderiza. Si no se pasa, crea un contenedor en `body`.
- `width`: ancho del canvas. Por defecto `640`.
- `height`: alto del canvas. Por defecto `480`.
- `backgroundColor`: color de fondo. Por defecto `#ffffff`.
- `className`: clase adicional para el wrapper.
- `onSave`: callback al llamar a `board.save()`.

## API

- `board.clear()`
- `board.setSize(width, height)`
- `board.setBackgroundColor(backgroundColor)`
- `board.save()`
- `board.destroy()`
