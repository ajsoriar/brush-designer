(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        columns: 10,
        rows: 4,
        colorGap: 0,
        bgColor: "#f2f2f2",
        textColor: "#000000",
        color: {
            defaultWidth: 26,
            defaultHeight: 26
        },
        padding: {
            top: 10,
            right: 0,
            bottom: 0,
            left: 0
        },
        colors: null,
        activeColor: null,
        resizePolicy: "SCALE",
        onChange: null,
        onColorSelected: null
    };
    var DEFAULT_HUES = [0, 15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 345];
    var RESIZE_POLICIES = {
        SCALE: "SCALE",
        EXPAND: "EXPAND"
    };
    var ACTIVE_HEIGHT = 32;
    var COMPONENT_GAP = 8;

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
        config.padding = normalizePadding(config.padding);
        config.resizePolicy = normalizeResizePolicy(config.resizePolicy);
        config.hasCustomColors = !!config.colors;
        config.baseColor = extend({}, config.color);
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
        element.style.backgroundColor = config.bgColor;
        element.style.color = config.textColor;
        element.style.padding = getPaddingCss(config);

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
            getNextColorRight: function(options) {
                return getNextColorRight(picker, config, options);
            },
            getNextColorDown: function(options) {
                return getNextColorDown(picker, config, options);
            },
            getWidth: function() {
                return getWidth(config);
            },
            getHeight: function() {
                return getHeight(config);
            },
            getSize: function() {
                return {
                    width: getWidth(config),
                    height: getHeight(config)
                };
            },
            setActiveColor: function(color, silent) {
                setActiveColor(picker, color, config, !!silent);
            },
            resizeTo: function(width, height, resizePolicy) {
                resizeTo(picker, config, width, height, resizePolicy);
            },
            destroy: function() {
                destroy(picker);
            }
        };

        renderColors(picker, config);
        setActiveColor(picker, picker.activeColor, config);

        return picker;
    }

    function getNextColorRight(picker, config, options) {
        var settings = options || {};
        var index = getActiveColorIndex(picker);
        var columns = Math.max(1, config.columns);
        var rowStart;
        var rowEnd;
        var nextRowStart;
        var direction;

        if (!picker.colors.length) {
            return null;
        }

        if (index < 0) {
            return picker.colors[0];
        }

        rowStart = Math.floor(index / columns) * columns;
        rowEnd = Math.min(rowStart + columns - 1, picker.colors.length - 1);

        if (settings.loop) {
            direction = picker.nextColorRightDirection || 1;

            if (direction > 0) {
                if (index < rowEnd) {
                    return picker.colors[index + 1];
                }

                picker.nextColorRightDirection = -1;
                return picker.colors[Math.max(rowStart, index - 1)];
            }

            if (index > rowStart) {
                return picker.colors[index - 1];
            }

            picker.nextColorRightDirection = 1;

            if (settings.jump) {
                nextRowStart = rowStart + columns;
                return picker.colors[nextRowStart < picker.colors.length ? nextRowStart : 0];
            }

            return picker.colors[Math.min(rowEnd, index + 1)];
        }

        if (index < rowEnd) {
            return picker.colors[index + 1];
        }

        if (settings.jump === false) {
            return picker.colors[rowStart];
        }

        nextRowStart = rowStart + columns;

        if (nextRowStart < picker.colors.length) {
            return picker.colors[nextRowStart];
        }

        return picker.colors[0];
    }

    function getNextColorDown(picker, config, options) {
        var settings = options || {};
        var index = getActiveColorIndex(picker);
        var columns = Math.max(1, config.columns);
        var column;
        var columnTop;
        var columnBottom;
        var direction;
        var nextIndex;
        var nextColumn;

        if (!picker.colors.length) {
            return null;
        }

        if (index < 0) {
            return picker.colors[0];
        }

        column = index % columns;
        columnTop = column;
        columnBottom = getColumnBottomIndex(picker, columns, column);
        nextIndex = index + columns;

        if (settings.loop) {
            direction = picker.nextColorDownDirection || 1;

            if (direction > 0) {
                if (nextIndex <= columnBottom) {
                    return picker.colors[nextIndex];
                }

                picker.nextColorDownDirection = -1;
                return picker.colors[Math.max(columnTop, index - columns)];
            }

            if (index - columns >= columnTop) {
                return picker.colors[index - columns];
            }

            picker.nextColorDownDirection = 1;

            if (settings.jump) {
                nextColumn = (column + 1) % columns;
                return picker.colors[nextColumn < picker.colors.length ? nextColumn : 0];
            }

            return picker.colors[Math.min(columnBottom, index + columns)];
        }

        if (nextIndex < picker.colors.length) {
            return picker.colors[nextIndex];
        }

        if (settings.jump) {
            nextColumn = (column + 1) % columns;
            return picker.colors[Math.min(nextColumn, picker.colors.length - 1)];
        }

        return picker.colors[Math.min(column, picker.colors.length - 1)];
    }

    function getColumnBottomIndex(picker, columns, column) {
        var bottom = column;

        while (bottom + columns < picker.colors.length) {
            bottom += columns;
        }

        return bottom;
    }

    function getActiveColorIndex(picker) {
        var i;

        for (i = 0; i < picker.colors.length; i++) {
            if (picker.colors[i] === picker.activeColor) {
                return i;
            }
        }

        return -1;
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
        picker.gridElement.style.gridTemplateColumns = "repeat(" + config.columns + ", " + config.color.defaultWidth + "px)";

        picker.colors.forEach(function(color) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "simple-color-picker-cell";
            button.style.backgroundColor = color;
            button.style.width = config.color.defaultWidth + "px";
            button.style.height = config.color.defaultHeight + "px";
            button.setAttribute("data-color", color);
            button.setAttribute("draggable", "true");
            button.title = color;
            button.addEventListener("click", function() {
                setActiveColor(picker, color, config);
            });
            button.addEventListener("dragstart", function(event) {
                event.dataTransfer.setData("text/plain", color);
                event.dataTransfer.setData("application/x-brush-designer-color", color);
                event.dataTransfer.effectAllowed = "copy";
            });

            picker.gridElement.appendChild(button);
        });
    }

    function setActiveColor(picker, color, config, silent) {
        var cells = picker.gridElement.querySelectorAll(".simple-color-picker-cell");
        var preview = picker.element.querySelector(".simple-color-picker-preview");
        var value = picker.element.querySelector(".simple-color-picker-value");
        var normalizedColor = String(color || "").toLowerCase();

        picker.activeColor = color;
        preview.style.backgroundColor = color;
        value.innerHTML = color + "<br>" + getRgbText(color);

        Array.prototype.forEach.call(cells, function(cell) {
            if (String(cell.getAttribute("data-color") || "").toLowerCase() === normalizedColor) {
                cell.className = "simple-color-picker-cell simple-color-picker-cell-active";
            } else {
                cell.className = "simple-color-picker-cell";
            }
        });

        if (silent) {
            return;
        }

        if (typeof config.onChange === "function") {
            config.onChange(color, picker);
        }

        if (typeof config.onColorSelected === "function") {
            config.onColorSelected(color, picker);
        }
    }

    function resizeTo(picker, config, width, height, resizePolicy) {
        var policy = normalizeResizePolicy(resizePolicy || config.resizePolicy);

        if (policy === RESIZE_POLICIES.EXPAND && !config.hasCustomColors) {
            expandTo(picker, config, width, height);
        } else {
            scaleTo(picker, config, width, height);
        }

        setActiveColor(picker, picker.activeColor, config, true);
    }

    function expandTo(picker, config, width, height) {
        var columns = getColumnsForWidth(config, width);
        var rows = getRowsForHeight(config, height);

        if (columns === config.columns && rows === config.rows) {
            return;
        }

        config.columns = columns;
        config.rows = rows;
        config.color.defaultWidth = config.baseColor.defaultWidth;
        config.color.defaultHeight = config.baseColor.defaultHeight;
        picker.colors = createPalette(config.columns, config.rows);
        renderColors(picker, config);
    }

    function scaleTo(picker, config, width, height) {
        var gridWidth = Math.max(1, width - getHorizontalPadding(config));
        var gridHeight = Math.max(1, height - ACTIVE_HEIGHT - COMPONENT_GAP - getVerticalPadding(config));
        var horizontalGap = Math.max(0, (config.columns - 1) * config.colorGap);
        var verticalGap = Math.max(0, (config.rows - 1) * config.colorGap);
        var cellWidth = Math.max(5, Math.floor((gridWidth - horizontalGap) / Math.max(1, config.columns)));
        var cellHeight = Math.max(5, Math.floor((gridHeight - verticalGap) / Math.max(1, config.rows)));

        config.color.defaultWidth = cellWidth;
        config.color.defaultHeight = cellHeight;
        renderColors(picker, config);
    }

    function getColumnsForWidth(config, width) {
        var availableWidth = Math.max(1, width - getHorizontalPadding(config));
        var cellWidth = Math.max(1, config.baseColor.defaultWidth + config.colorGap);

        return Math.max(1, Math.floor((availableWidth + config.colorGap) / cellWidth));
    }

    function getRowsForHeight(config, height) {
        var availableHeight = Math.max(1, height - ACTIVE_HEIGHT - COMPONENT_GAP - getVerticalPadding(config));
        var cellHeight = Math.max(1, config.baseColor.defaultHeight + config.colorGap);

        return Math.max(1, Math.floor((availableHeight + config.colorGap) / cellHeight));
    }

    function getWidth(config) {
        var gridWidth = (config.columns * config.color.defaultWidth) + ((config.columns - 1) * config.colorGap);
        var activeWidth = 140;

        return Math.max(gridWidth, activeWidth) + getHorizontalPadding(config);
    }

    function getHeight(config) {
        var gridHeight = (config.rows * config.color.defaultHeight) + ((config.rows - 1) * config.colorGap);

        return ACTIVE_HEIGHT + COMPONENT_GAP + gridHeight + getVerticalPadding(config);
    }

    function normalizePadding(padding) {
        var normalized = extend({}, DEFAULTS.padding);

        if (typeof padding === "number") {
            normalized.top = padding;
            normalized.right = padding;
            normalized.bottom = padding;
            normalized.left = padding;
            return normalized;
        }

        return extend(normalized, padding || {});
    }

    function getHorizontalPadding(config) {
        return Number(config.padding.left) + Number(config.padding.right);
    }

    function getVerticalPadding(config) {
        return Number(config.padding.top) + Number(config.padding.bottom);
    }

    function getPaddingCss(config) {
        return config.padding.top + "px " + config.padding.right + "px " + config.padding.bottom + "px " + config.padding.left + "px";
    }

    function normalizeResizePolicy(resizePolicy) {
        var policy = String(resizePolicy || RESIZE_POLICIES.SCALE).toUpperCase();

        if (policy === RESIZE_POLICIES.EXPAND) {
            return RESIZE_POLICIES.EXPAND;
        }

        return RESIZE_POLICIES.SCALE;
    }

    function createPalette(columns, rows) {
        var count = columns * rows;
        var colors = [];
        var i;
        var hue;
        var row;
        var column;
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
            column = i % columns;
            hue = getPaletteHue(column, columns);
            row = Math.floor(i / columns);
            lightness = Math.round(30 + (row * 40) / Math.max(1, rows - 1));
            if (row === Math.floor(rows / 2)) {
                lightness = 50;
            }
            colors.push("hsl(" + hue + ", 100%, " + lightness + "%)");
        }

        return colors;
    }

    function getPaletteHue(column, columns) {
        if (columns === DEFAULT_HUES.length) {
            return DEFAULT_HUES[column];
        }

        return Math.round((column * 360) / Math.max(1, columns));
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
