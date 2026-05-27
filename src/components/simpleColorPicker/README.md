# SimpleColorPicker

Componente sencillo para seleccionar un color desde una rejilla configurable.

## Uso

```html
<link rel="stylesheet" href="../src/components/simpleColorPicker/simpleColorPicker.css">
<script src="../src/components/simpleColorPicker/simpleColorPicker.js"></script>
```

```js
var picker = SimpleColorPicker({
    containerId: "color-picker-window-content",
    columns: 10,
    rows: 4,
    colorGap: 0,
    color: {
        defaultWidth: 7,
        defaultHeight: 7
    },
    activeColor: "#000000",
    onColorSelected: function(color) {
        console.log(color);
    }
});

var color = picker.getActiveColor();
var width = picker.getWidth();
var height = picker.getHeight();
```

Tambien queda disponible como `simpleColorPicker(...)`.

## Opciones

- `id`: id del componente.
- `containerId`: id del div donde se renderiza. Si no se pasa, crea un contenedor en `body`.
- `columns`: numero de colores en horizontal. Por defecto `10`.
- `rows`: numero de colores en vertical. Por defecto `4`.
- `colorGap`: espacio en pixeles entre colores. Por defecto `0`.
- `color.defaultWidth`: ancho de cada color en pixeles. Por defecto `26`.
- `color.defaultHeight`: alto de cada color en pixeles. Por defecto `26`.
- `colors`: array opcional de colores CSS. Si no se pasa, se genera una paleta automaticamente.
- `activeColor`: color activo inicial.
- `onChange`: callback al seleccionar color.
- `onColorSelected`: alias de `onChange`.

## API

- `picker.getActiveColor()`
- `picker.getWidth()`
- `picker.getHeight()`
- `picker.setActiveColor(color)`
- `picker.destroy()`
