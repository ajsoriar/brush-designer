# ResizeImage

Dialog component for resizing an existing image.

## Usage

```html
<link rel="stylesheet" href="components/resizeImage/resizeImage.css">
<script src="components/resizeImage/resizeImage.js"></script>
```

```js
var dialog = ResizeImage({
    width: 800,
    height: 600,
    onOk: function(options) {
        console.log(options.width, options.height);
    }
});

someWindow.setContent(dialog.element);
```

Also available as `resizeImage(...)`.

## Options

- `width`: initial image width in pixels. Default `800`.
- `height`: initial image height in pixels. Default `600`.
- `resolution`: initial print resolution. Default `72`.
- `constrainProportions`: keep width and height linked. Default `true`.
- `resample`: enable resampling controls. Default `true`.
- `interpolation`: selected resampling method.
- `onOk`: callback called with the resize options.
- `onCancel`: callback called when pressing Cancel.
- `onChange`: callback called when an input changes.

## API

- `dialog.element`
- `dialog.getOptions()`
- `dialog.setOptions(options)`
- `dialog.destroy()`