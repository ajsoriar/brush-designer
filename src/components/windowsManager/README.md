# WindowsManager

Componente de ventanas para navegador. Expone `window.WindowsManager` en el scope global y mantiene un array con las ventanas activas en `WindowsManager.windows`.

## Uso

```html
<link rel="stylesheet" href="../src/components/windowsManager/windowsManager.css">
<script src="../src/components/windowsManager/windowsManager.js"></script>
```

```js
var win = WindowsManager.create({
    id: "brush-tools-window",
    title: "Brush tools",
    x: 60,
    y: 60,
    width: 420,
    height: 260,
    resizable: true
});

document.getElementById(win.contentId).innerHTML = "<p>Contenido de la ventana</p>";
```

## Opciones

- `id`: id del elemento raiz de la ventana.
- `windowId`: identificador logico opcional. Si ya existe una ventana con el mismo `windowId`, no se crea otra instancia.
- `windowGroupName`: nombre de grupo opcional para limitar familias de ventanas.
- `maxGroupItems`: maximo de ventanas permitidas en `windowGroupName`. Si se alcanza, no se crea otra ventana y se trae al frente una existente del grupo.
- `contentId`: id del div central. Si no se pasa, se crea como `id + "-content"`.
- `title`: texto de la barra superior.
- `type`: tipo de ventana. Puede ser `"NORMAL"`, `"TOOL"` o `"MODAL"`. Por defecto `"NORMAL"`.
- `x`, `y`, `width`, `height`: posicion y tamano inicial.
- `fixed`: si es `true`, la ventana no se mueve ni se redimensiona.
- `movable`: permite mover desde la barra superior.
- `resizable`: activa los handles de resize.
- `minimizable`: muestra u oculta el boton `_`.
- `maximizable`: muestra u oculta el boton de maximizar/restaurar.
- `closable`: muestra u oculta el boton `x`.
- `modal`: alias legacy de `type: "MODAL"`.
- `scrollbars`: activa u oculta ambos scrollbars del div central.
- `scrollBarX`: activa u oculta el scroll horizontal del div central.
- `scrollBarY`: activa u oculta el scroll vertical del div central.
- `cornerRadius`: radio de las esquinas en px. Se limita al ancho del marco de la ventana.
- `topBarGradient`: top bar gradient using `{ a: "#2563eb", b: "#14b8a6", orientation: "horizontal" }`. In horizontal mode, the left section uses `a`, the right section uses `b`, and the center uses a left-to-right gradient. In vertical mode, all three sections use the same top-to-bottom gradient.
- `toolsRow`: muestra una fila adicional debajo de la barra superior, con altura minima igual a la barra superior.
- `content`: string HTML o nodo DOM inicial para pintar dentro del centro.
- `beforeClose`: callback opcional. Si devuelve `false`, el cierre se cancela.

## API

- `WindowsManager.create(options)`
- `WindowsManager.getWindow(id)`
- `WindowsManager.getWindowByWindowId(windowId)`
- `WindowsManager.closeWindow(id)`
- `WindowsManager.minimizeWindow(id)`
- `WindowsManager.maximizeWindow(id)`
- `WindowsManager.restoreWindow(id)`
- `WindowsManager.setWindowTitle(id, title)`
- `WindowsManager.setWindowScrollBars(id, scrollBarX, scrollBarY)`
- `WindowsManager.bringToFront(id)`

Cada ventana creada tambien expone:

- `window.setTitle(title)`: cambia el titulo visible de la ventana.
- `window.setScrollBars(scrollBarX, scrollBarY)`: cambia el overflow del div central. Si se pasa un solo booleano, se aplica a ambos ejes.
- `window.scaleToContent(width, height)`: ajusta la ventana para que el div central tenga ese tamano.
- `window.toolsRowElement`: referencia al elemento de la fila de herramientas.

## Z-index

WindowsManager usa tres rangos de profundidad:

- `"NORMAL"`: ventanas de documento.
- `"TOOL"`: paletas y herramientas, siempre por encima de `"NORMAL"`.
- `"MODAL"`: dialogos bloqueantes, siempre por encima de `"TOOL"` y `"NORMAL"`.

Las ventanas solo se reordenan dentro de su propio rango cuando se llama a `bringToFront`.
