# VirtualLine

Componente genérico para dibujar una línea de "preview" (SVG) mientras
se arrastra el ratón, antes de asentarla en el algoritmo de pintado que
corresponda.

## Uso

```html
<link rel="stylesheet" href="../src/components/virtualLine/virtualLine.css">
<script src="../src/components/virtualLine/virtualLine.js"></script>
```

```js
var target = document.getElementById("preview-overlay");
var line = VirtualLine(target, {
    width: 4,
    color: "#000000",
    opacity: 0.8,
    capStyle: "round",
    dashArray: [12, 8]
});

// mousedown
line.start({ x: 10, y: 10 });

// mousemove (se puede llamar repetidas veces mientras se arrastra)
line.update({ x: 80, y: 40 });

// mouseup
var lineData = line.finish({ x: 100, y: 60 });
// lineData = { id, from, to, width, color, opacity, capStyle, dashArray }
// listo para pasarle a cualquier algoritmo de pintado.
```

También queda disponible como `virtualLine(...)`.

## Opciones

- `width`: ancho del trazo. Por defecto `2`.
- `color`: color del trazo (cualquier color CSS válido). Por defecto `"#000000"`.
- `opacity`: transparencia del trazo, `0`-`1`. Por defecto `1`.
- `capStyle`: forma de los extremos, `"butt"` | `"round"` | `"square"`.
  Por defecto `"butt"`. `"round"`/`"square"` usan el `stroke-linecap`
  nativo de SVG, que ya dibuja el extremo con radio = mitad del `width`
  — no hace falta ninguna configuración extra para eso.
- `dashArray`: array de números `[dash, gap, dash, gap, ...]` para
  líneas discontinuas, o `null` para línea continua. Por defecto `null`.
- `die`: si es `true`, `finish()` no destruye el elemento — hay que
  llamar a `destroy()` explícitamente cuando ya no haga falta. Por
  defecto `false` (se destruye solo al llamar a `finish()`).

## API

- `line.id`: identificador único de la instancia (incluye timestamp de creación).
- `line.element`: el `<svg>` real montado en el DOM.
- `line.start(point)`: fija el punto de origen y monta/pinta el preview inicial.
- `line.update(point)`: mueve el punto final y repinta.
- `line.finish(point)`: actualiza (si se pasa `point`), devuelve el
  snapshot de la línea (`getLineData()`) y destruye el elemento salvo
  que `die: true`.
- `line.getLineData()`: devuelve el snapshot actual (`from`/`to`/`width`/
  `color`/`opacity`/`capStyle`/`dashArray`) en cualquier momento.
- `line.isDestroyed()`: `true` si el elemento ya fue destruido.
- `line.destroy()`: quita el `<svg>` del DOM. Idempotente.
