# NewDocumentDialog

Dialog component for creating a new paint document.

## Usage

```html
<link rel="stylesheet" href="components/newDocumentDialog/newDocumentDialog.css">
<script src="components/newDocumentDialog/newDocumentDialog.js"></script>
```

```js
var dialog = NewDocumentDialog({
    width: 800,
    height: 600,
    onOk: function(options) {
        PaintBoard(options);
    }
});

someWindow.setContent(dialog.element);
```

Also available as `newDocumentDialog(...)`.

## Options

- `width`: initial document width. Default `800`.
- `height`: initial document height. Default `600`.
- `backgroundColor`: document background color. Default `#ffffff`.
- `presets`: select options for predefined document sizes.
- `onOk`: callback called with `{ width, height, backgroundColor }`.
- `onCancel`: callback called when pressing Cancel.

## API

- `dialog.element`
- `dialog.getOptions()`
- `dialog.destroy()`
