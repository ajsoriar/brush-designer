# BigColorPicker

Large color picker with saturation/value area, hue slider, and HEX/RGB/CMYK/HSV/HSL readouts.

## Usage

```html
<link rel="stylesheet" href="components/bigColorPicker/bigColorPicker.css">
<script src="components/bigColorPicker/bigColorPicker.js"></script>
```

```js
var picker = BigColorPicker({
    containerId: "big-color-picker-window-content",
    activeColor: "#2c79f5",
    onColorSelected: function(color) {
        console.log(color);
    }
});

var color = picker.getActiveColor();
```

Also available as `bigColorPicker(...)`.

## Options

- `id`: component id.
- `containerId`: target container id.
- `width`: component width. Default `488`.
- `height`: component height. Default `278`.
- `activeColor`: initial color. Default `#2c79f5`.
- `onChange`: callback when selecting a color.
- `onColorSelected`: alias of `onChange`.

## API

- `picker.getActiveColor()`
- `picker.getWidth()`
- `picker.getHeight()`
- `picker.setActiveColor(color)`
- `picker.destroy()`
