# SimpleLineWidthPicker

Componente sencillo para seleccionar grosor de linea.

## Uso

```html
<link rel="stylesheet" href="../src/components/simpleLineWidthPicker/simpleLineWidthPicker.css">
<script src="../src/components/simpleLineWidthPicker/simpleLineWidthPicker.js"></script>
```

```js
var picker = SimpleLineWidthPicker({
    containerId: "line-width-picker-window-content",
    minWidth: 1,
    maxWidth: 15,
    steps: 8,
    onLineWidthSelected: function(lineWidth) {
        console.log(lineWidth);
    }
});

var lineWidth = picker.getActiveLineWidth();
```

Tambien queda disponible como `simpleLineWidthPicker(...)`.

## Opciones

- `id`: id del componente.
- `containerId`: id del div donde se renderiza. Si no se pasa, crea un contenedor en `body`.
- `minWidth`: grosor inicial. Por defecto `1`.
- `maxWidth`: grosor final. Por defecto `15`.
- `steps`: numero de grosores disponibles. Por defecto `8`.
- `activeLineWidth`: grosor activo inicial.
- `optionWidth`: ancho de cada opcion. Por defecto `72`.
- `optionHeight`: alto de cada opcion. Por defecto `24`.
- `optionGap`: espacio entre opciones. Por defecto `5`.
- `onChange`: callback al seleccionar grosor.
- `onLineWidthSelected`: alias de `onChange`.

## API

- `picker.getActiveLineWidth()`
- `picker.getWidth()`
- `picker.getHeight()`
- `picker.setActiveLineWidth(lineWidth)`
- `picker.destroy()`
