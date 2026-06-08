(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        columns: 10,
        rows: 4,
        colorGap: 0,
        color: {
            defaultWidth: 26,
            defaultHeight: 26
        },
        colors: null,
        activeColor: null,
        onChange: null,
        onColorSelected: null
    };

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function SimpleColorPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        config.color = extend(extend({}, DEFAULTS.color), config.color || {});
        var pickerId = config.id || ("simple-color-picker-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var active = document.createElement("div");
        var preview = document.createElement("span");
        var value = document.createElement("span");
        var grid = document.createElement("div");
        var colors = config.colors || createPalette(config.columns, config.rows);
        var picker;

        element.id = pickerId;
        element.className = "simple-color-picker";

        active.className = "simple-color-picker-active";
        preview.className = "simple-color-picker-preview";
        value.className = "simple-color-picker-value";

        grid.className = "simple-color-picker-grid";
        grid.style.gridTemplateColumns = "repeat(" + config.columns + ", " + config.color.defaultWidth + "px)";
        grid.style.gap = config.colorGap + "px";

        active.appendChild(preview);
        active.appendChild(value);
        element.appendChild(active);
        element.appendChild(grid);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            gridElement: grid,
            colors: colors,
            activeColor: config.activeColor || colors[0],
            getActiveColor: function() {
                return picker.activeColor;
            },
            getWidth: function() {
                return getWidth(config);
            },
            getHeight: function() {
                return getHeight(config);
            },
            setActiveColor: function(color) {
                setActiveColor(picker, color, config);
            },
            destroy: function() {
                destroy(picker);
            }
        };

        renderColors(picker, config);
        setActiveColor(picker, picker.activeColor, config);

        return picker;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "simple-color-picker-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("SimpleColorPicker container not found: " + containerId);
        }

        return container;
    }

    function renderColors(picker, config) {
        picker.gridElement.innerHTML = "";

        picker.colors.forEach(function(color) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "simple-color-picker-cell";
            button.style.backgroundColor = color;
            button.style.width = config.color.defaultWidth + "px";
            button.style.height = config.color.defaultHeight + "px";
            button.setAttribute("data-color", color);
            button.title = color;
            button.addEventListener("click", function() {
                setActiveColor(picker, color, config);
            });

            picker.gridElement.appendChild(button);
        });
    }

    function setActiveColor(picker, color, config) {
        var cells = picker.gridElement.querySelectorAll(".simple-color-picker-cell");
        var preview = picker.element.querySelector(".simple-color-picker-preview");
        var value = picker.element.querySelector(".simple-color-picker-value");

        picker.activeColor = color;
        preview.style.backgroundColor = color;
        value.innerHTML = color + "<br>" + getRgbText(color);

        Array.prototype.forEach.call(cells, function(cell) {
            if (cell.getAttribute("data-color") === color) {
                cell.className = "simple-color-picker-cell simple-color-picker-cell-active";
            } else {
                cell.className = "simple-color-picker-cell";
            }
        });

        if (typeof config.onChange === "function") {
            config.onChange(color, picker);
        }

        if (typeof config.onColorSelected === "function") {
            config.onColorSelected(color, picker);
        }
    }

    function getWidth(config) {
        var gridWidth = (config.columns * config.color.defaultWidth) + ((config.columns - 1) * config.colorGap);
        var activeWidth = 140;
        var horizontalPadding = 20;

        return Math.max(gridWidth, activeWidth) + horizontalPadding;
    }

    function getHeight(config) {
        var gridHeight = (config.rows * config.color.defaultHeight) + ((config.rows - 1) * config.colorGap);
        var activeHeight = 32;
        var componentGap = 8;
        var verticalPadding = 20;

        return activeHeight + componentGap + gridHeight + verticalPadding;
    }

    function createPalette(columns, rows) {
        var count = columns * rows;
        var colors = [];
        var i;
        var ci;
        var hue;
        var row;
        var lightness;

        if (count > 0) {
            colors.push("#000000");
        }

        if (count > 1) {
            colors.push("#ffffff");
        }

        if (count > 2) {
            colors.push("#808080");
        }

        for (i = colors.length; i < count; i++) {
            ci = i - 3;
            hue = Math.round((ci * 360) / Math.max(1, count - 3));
            row = Math.floor(ci / columns);
            lightness = Math.round(38 + (row * 34) / Math.max(1, rows - 1));
            colors.push("hsl(" + hue + ", 85%, " + lightness + "%)");
        }

        return colors;
    }

    function getRgbText(color) {
        var parser = document.createElement("span");
        var value;

        parser.style.color = color;
        document.body.appendChild(parser);
        value = global.getComputedStyle(parser).color;
        document.body.removeChild(parser);

        return value;
    }

    function destroy(picker) {
        if (picker.element.parentNode) {
            picker.element.parentNode.removeChild(picker.element);
        }
    }

    global.SimpleColorPicker = SimpleColorPicker;
    global.simpleColorPicker = SimpleColorPicker;

}(window));
