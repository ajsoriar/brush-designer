# NewDocumentDialog2

Diálogo "New Document" estilo Photoshop: tabla de presets por categoría
(cargados desde `presets.json`), campos Width/Height/Resolution, botones
de orientación (sprite `document-orientation.png`) y panel "Image Size"
con megapíxeles.

## Uso

```html
<link rel="stylesheet" href="components/newDocumentDialog2/newDocumentDialog2.css">
<script src="components/newDocumentDialog2/newDocumentDialog2.js"></script>
```

```js
var dialog = NewDocumentDialog2({
    width: 800,
    height: 600,
    onOk: function(options) {
        // options = { name, width, height, dpi, backgroundColor }
        console.log(options);
    },
    onCancel: function() {
        console.log("cancelled");
    }
});

document.body.appendChild(dialog.element);
```

También queda disponible como `newDocumentDialog2(...)`.

Si el `width`/`height` inicial coincide con un preset, el diálogo abre
con ese preset ya seleccionado (categoría incluida); si no, abre en la
categoría "Custom" con esas medidas.

## Opciones

- `name`: nombre inicial del documento. Por defecto `"Untitled-N"` (autoincremental).
- `width`: ancho inicial en píxeles. Por defecto `800`.
- `height`: alto inicial en píxeles. Por defecto `600`.
- `backgroundColor`: color de fondo pasado tal cual en `onOk`. Por defecto `"#ffffff"`.
- `presets`: objeto con la misma forma que `presets.json` para sustituir los presets por defecto.
- `onOk(options, component)`: callback del botón OK.
- `onCancel(component)`: callback del botón Cancel.

## API

- `dialog.element`: nodo raíz para insertar en una ventana/modal.
- `dialog.getOptions()`: `{ name, width, height, dpi, backgroundColor }` actuales.
- `dialog.destroy()`: quita el diálogo del DOM.

## Comportamiento

- El select "Category" filtra la tabla por el campo `group` del preset.
- Clic en una fila aplica el preset (medidas, dpi, orientación, descripción e Image Size).
- Editar Width/Height/Resolution a mano deselecciona el preset (pasa a "Custom").
- Los botones de orientación intercambian Width/Height; se marca el activo según ancho/alto.
- El panel "Image Size" avisa en naranja si se supera `defaultMaxPixels` del JSON.
- Cada fila Width/Height tiene un segundo campo con selector de unidad
  (`pixels` / `inches` / `cm` / `mm`, por defecto `mm`) que muestra la medida
  convertida usando el valor de Resolution (dpi). Editar ese campo convierte
  a píxeles y actualiza el campo principal (acepta coma o punto decimal);
  cambiar la unidad solo re-muestra el valor, sin tocar los píxeles. Cambiar
  Resolution recalcula las conversiones (los píxeles no cambian).
