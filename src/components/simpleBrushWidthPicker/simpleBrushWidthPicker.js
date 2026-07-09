(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        minWidth: 1,
        maxWidth: 27,
        steps: 16,
        maxBrushWidth: 512,
        resetBrushWidth: 200,
        activeBrushWidth: null,
        activeBrushTool: "SQUARED-POINTS",
        brushShape: "circle",
        brushStroke: false,
        brushAntialiasing: false,
        optionWidth: 72,
        optionGap: 5,
        columns: 2,
        onChange: null,
        onBrushWidthSelected: null,
        onBrushToolChange: null,
        onBrushStrokeChange: null,
        onBrushAntialiasingChange: null
    };

    var BRUSH_TOOL_BUTTONS = [
        {
            mode: "SQUARED-POINTS",
            label: "Squared Points",
            icon: new URL("../paintTools/icons/paint-tools_03.png", import.meta.url).href
        },
        {
            mode: "ROUND-POINTS",
            label: "Round Points",
            icon: new URL("../paintTools/icons/paint-tools_05.png", import.meta.url).href
        },
        {
            mode: "SQUARED-LINES",
            label: "Squared Lines",
            icon: new URL("../paintTools/icons/paint-tools_07.png", import.meta.url).href
        },
        {
            mode: "ROUND-LINES",
            label: "Round Lines",
            icon: new URL("../paintTools/icons/paint-tools_09.png", import.meta.url).href
        }
    ];

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function SimpleBrushWidthPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var pickerId = config.id || ("simple-brush-width-picker-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var value = document.createElement("label");
        var valueRow = document.createElement("div");
        var valueInput = document.createElement("input");
        var valueUnit = document.createElement("span");
        var resetButton = document.createElement("button");
        var checks = document.createElement("div");
        var strokeControl = createStrokeControl(pickerId);
        var antialiasingControl = createAntialiasingControl(pickerId);
        var tools = document.createElement("div");
        var list = document.createElement("div");
        var brushWidths = createBrushWidths(config.minWidth, config.maxWidth, config.steps);
        var picker;

        element.id = pickerId;
        element.className = "simple-brush-width-picker";

        valueRow.className = "simple-brush-width-picker-value-row";

        value.className = "simple-brush-width-picker-value";
        valueInput.type = "number";
        valueInput.min = "1";
        valueInput.max = String(config.maxBrushWidth);
        valueInput.step = "1";
        valueInput.className = "simple-brush-width-picker-value-input";
        valueUnit.className = "simple-brush-width-picker-value-unit";
        valueUnit.textContent = "px";
        value.appendChild(valueInput);
        value.appendChild(valueUnit);

        resetButton.type = "button";
        resetButton.className = "simple-brush-width-picker-reset";
        resetButton.textContent = "Reset";

        valueRow.appendChild(value);
        valueRow.appendChild(resetButton);

        checks.className = "simple-brush-width-picker-checks";
        checks.appendChild(strokeControl.label);
        checks.appendChild(antialiasingControl.label);

        tools.className = "simple-brush-width-picker-tools";

        list.className = "simple-brush-width-picker-list";
        list.style.gap = config.optionGap + "px";
        list.style.setProperty("--simple-brush-width-picker-columns", getColumnCount(config));
        list.style.setProperty("--simple-brush-width-picker-rows", Math.ceil(brushWidths.length / getColumnCount(config)));

        element.appendChild(valueRow);
        element.appendChild(checks);
        element.appendChild(tools);
        element.appendChild(list);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            listElement: list,
            toolsElement: tools,
            valueInput: valueInput,
            strokeInput: strokeControl.input,
            antialiasingInput: antialiasingControl.input,
            brushWidths: brushWidths,
            activeBrushTool: normalizeBrushTool(config.activeBrushTool),
            brushShape: normalizeBrushShape(config.brushShape),
            brushStroke: !!config.brushStroke,
            brushAntialiasing: !!config.brushAntialiasing,
            activeBrushWidth: normalizeBrushWidth(config.activeBrushWidth || brushWidths[0], config),
            getActiveBrushWidth: function() {
                return picker.activeBrushWidth;
            },
            getWidth: function() {
                return getWidth(config);
            },
            getHeight: function() {
                return getHeight(config);
            },
            setActiveBrushWidth: function(brushWidth) {
                setActiveBrushWidth(picker, brushWidth, config, "api");
            },
            getBrushTool: function() {
                return picker.activeBrushTool;
            },
            setBrushTool: function(brushTool) {
                setBrushTool(picker, brushTool, config, "api");
            },
            getBrushShape: function() {
                return picker.brushShape;
            },
            setBrushShape: function(brushShape) {
                setBrushShape(picker, brushShape);
            },
            getBrushStroke: function() {
                return picker.brushStroke;
            },
            setBrushStroke: function(brushStroke) {
                setBrushStroke(picker, brushStroke, config);
            },
            getBrushAntialiasing: function() {
                return picker.brushAntialiasing;
            },
            setBrushAntialiasing: function(brushAntialiasing) {
                setBrushAntialiasing(picker, brushAntialiasing, config);
            },
            destroy: function() {
                destroy(picker);
            }
        };

        renderToolButtons(picker, config);
        renderOptions(picker, config);
        valueInput.addEventListener("input", function() {
            setActiveBrushWidth(picker, valueInput.value, config, "user");
        });
        valueInput.addEventListener("change", function() {
            setActiveBrushWidth(picker, valueInput.value, config, "user");
        });
        strokeControl.input.addEventListener("change", function() {
            setBrushStroke(picker, strokeControl.input.checked, config);
        });
        antialiasingControl.input.addEventListener("change", function() {
            setBrushAntialiasing(picker, antialiasingControl.input.checked, config);
        });
        resetButton.addEventListener("click", function() {
            setActiveBrushWidth(picker, config.resetBrushWidth, config, "user");
        });
        global.addEventListener("paint-tools-change", function(event) {
            var mode = event.detail && event.detail.mode;

            if (mode === "PENCIL-TOOL") {
                setActiveToolButton(picker, picker.activeBrushTool);
                return;
            }

            if (isBrushToolButtonMode(mode)) {
                setBrushTool(picker, mode, config, "api");
            }
        });
        setActiveBrushWidth(picker, picker.activeBrushWidth, config, "init");
        setBrushTool(picker, picker.activeBrushTool, config, "init");
        setBrushStroke(picker, picker.brushStroke, config);
        setBrushAntialiasing(picker, picker.brushAntialiasing, config);
        setActiveToolButton(picker, picker.activeBrushTool);

        return picker;
    }

    function createStrokeControl(pickerId) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        label.className = "simple-brush-width-picker-check";
        input.id = pickerId + "-stroke";
        input.type = "checkbox";

        label.appendChild(input);
        label.appendChild(document.createTextNode("Stroke"));

        return {
            label: label,
            input: input
        };
    }

    function createAntialiasingControl(pickerId) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        label.className = "simple-brush-width-picker-check";
        input.id = pickerId + "-antialiasing";
        input.type = "checkbox";

        label.appendChild(input);
        label.appendChild(document.createTextNode("Antialiasing"));

        return {
            label: label,
            input: input
        };
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "simple-brush-width-picker-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("SimpleBrushWidthPicker container not found: " + containerId);
        }

        return container;
    }

    function renderOptions(picker, config) {
        picker.listElement.innerHTML = "";

        picker.brushWidths.forEach(function(brushWidth) {
            var button = document.createElement("button");
            var label = document.createElement("span");
            var swatch = document.createElement("span");

            button.type = "button";
            button.className = "simple-brush-width-picker-option";
            button.setAttribute("data-brush-width", brushWidth);
            button.title = brushWidth + "px";
            button.addEventListener("click", function() {
                setActiveBrushWidth(picker, brushWidth, config, "user");
            });

            label.className = "simple-brush-width-picker-label";
            label.textContent = brushWidth + "px";

            swatch.className = "simple-brush-width-picker-swatch";
            swatch.setAttribute("data-brush-width", brushWidth);
            swatch.style.height = brushWidth + "px";
            swatch.style.width = brushWidth + "px";

            button.appendChild(label);
            button.appendChild(swatch);
            picker.listElement.appendChild(button);
        });

        syncBrushShape(picker);
    }

    function renderToolButtons(picker, config) {
        picker.toolsElement.innerHTML = "";

        BRUSH_TOOL_BUTTONS.forEach(function(tool) {
            var button = document.createElement("button");
            var icon = document.createElement("img");

            button.type = "button";
            button.className = "simple-brush-width-picker-tool";
            button.setAttribute("data-paint-tool", tool.mode);
            button.title = tool.label;
            button.addEventListener("click", function() {
                setBrushTool(picker, tool.mode, config, "user");
                if (global.PaintTools && global.PaintTools.use) {
                    global.PaintTools.use("PENCIL-TOOL");
                }
            });

            icon.className = "simple-brush-width-picker-tool-icon";
            icon.src = tool.icon;
            icon.alt = "";
            icon.draggable = false;

            button.appendChild(icon);
            picker.toolsElement.appendChild(button);
        });
    }

    function setActiveBrushWidth(picker, brushWidth, config, source) {
        var buttons = picker.listElement.querySelectorAll(".simple-brush-width-picker-option");
        var normalizedBrushWidth = normalizeBrushWidth(brushWidth, config);
        var eventMeta = {
            source: source || "api"
        };

        picker.activeBrushWidth = normalizedBrushWidth;
        picker.valueInput.value = normalizedBrushWidth;

        Array.prototype.forEach.call(buttons, function(button) {
            if (parseFloat(button.getAttribute("data-brush-width")) === normalizedBrushWidth) {
                button.className = "simple-brush-width-picker-option simple-brush-width-picker-option-active";
            } else {
                button.className = "simple-brush-width-picker-option";
            }
        });

        if (typeof config.onChange === "function") {
            config.onChange(normalizedBrushWidth, picker, eventMeta);
        }

        if (typeof config.onBrushWidthSelected === "function") {
            config.onBrushWidthSelected(normalizedBrushWidth, picker, eventMeta);
        }
    }

    function setBrushTool(picker, brushTool, config, source) {
        var normalizedBrushTool = normalizeBrushTool(brushTool);
        var eventMeta = {
            source: source || "api"
        };

        picker.activeBrushTool = normalizedBrushTool;
        setActiveToolButton(picker, normalizedBrushTool);
        setBrushShape(picker, isRoundBrushTool(normalizedBrushTool) ? "circle" : "square");

        if (typeof config.onBrushToolChange === "function") {
            config.onBrushToolChange(normalizedBrushTool, picker, eventMeta);
        }
    }

    function setBrushShape(picker, brushShape) {
        picker.brushShape = normalizeBrushShape(brushShape);
        syncBrushShape(picker);
    }

    function setBrushStroke(picker, brushStroke, config) {
        picker.brushStroke = !!brushStroke;
        picker.strokeInput.checked = picker.brushStroke;
        syncBrushStroke(picker);

        if (typeof config.onBrushStrokeChange === "function") {
            config.onBrushStrokeChange(picker.brushStroke, picker);
        }
    }

    function setBrushAntialiasing(picker, brushAntialiasing, config) {
        picker.brushAntialiasing = !!brushAntialiasing;
        picker.antialiasingInput.checked = picker.brushAntialiasing;
        picker.element.setAttribute("data-brush-antialiasing", picker.brushAntialiasing ? "true" : "false");

        if (typeof config.onBrushAntialiasingChange === "function") {
            config.onBrushAntialiasingChange(picker.brushAntialiasing, picker);
        }
    }

    function syncBrushShape(picker) {
        var swatches = picker.listElement.querySelectorAll(".simple-brush-width-picker-swatch");

        picker.element.setAttribute("data-brush-shape", picker.brushShape);

        Array.prototype.forEach.call(swatches, function(swatch) {
            swatch.style.borderRadius = picker.brushShape === "circle" ? "50%" : "0";
        });
    }

    function syncBrushStroke(picker) {
        var swatches = picker.listElement.querySelectorAll(".simple-brush-width-picker-swatch");

        picker.element.setAttribute("data-brush-stroke", picker.brushStroke ? "true" : "false");

        Array.prototype.forEach.call(swatches, function(swatch) {
            if (picker.brushStroke) {
                swatch.style.background = "transparent";
                swatch.style.border = "1px solid #111111";
            } else {
                swatch.style.background = "#111111";
                swatch.style.border = "0";
            }
        });
    }

    function normalizeBrushShape(brushShape) {
        return brushShape === "square" ? "square" : "circle";
    }

    function normalizeBrushTool(brushTool) {
        return isBrushToolButtonMode(brushTool) ? brushTool : BRUSH_TOOL_BUTTONS[0].mode;
    }

    function isRoundBrushTool(brushTool) {
        return brushTool === "ROUND-POINTS" || brushTool === "ROUND-LINES";
    }

    function normalizeBrushWidth(brushWidth, config) {
        var value = Math.round(parseFloat(brushWidth));
        var maxBrushWidth = config && config.maxBrushWidth ? config.maxBrushWidth : DEFAULTS.maxBrushWidth;

        if (isNaN(value)) {
            return 1;
        }

        return Math.max(1, Math.min(value, maxBrushWidth));
    }

    function getCurrentPaintToolMode() {
        if (global.PaintTools && global.PaintTools.getMode) {
            return global.PaintTools.getMode();
        }

        return "";
    }

    function setActiveToolButton(picker, activeTool) {
        var buttons = picker.toolsElement.querySelectorAll("[data-paint-tool]");
        var selectedTool = isBrushToolButtonMode(activeTool) ? activeTool : BRUSH_TOOL_BUTTONS[0].mode;

        Array.prototype.forEach.call(buttons, function(button) {
            if (button.getAttribute("data-paint-tool") === selectedTool) {
                button.className = "simple-brush-width-picker-tool simple-brush-width-picker-tool-active";
            } else {
                button.className = "simple-brush-width-picker-tool";
            }
        });
    }

    function isBrushToolButtonMode(activeTool) {
        return BRUSH_TOOL_BUTTONS.some(function(tool) {
            return tool.mode === activeTool;
        });
    }

    function createBrushWidths(minWidth, maxWidth, steps) {
        var brushWidths = [];
        var safeSteps = Math.max(1, steps);
        var i;
        var value;

        if (safeSteps === 1) {
            return [minWidth];
        }

        for (i = 0; i < safeSteps; i++) {
            value = minWidth + ((maxWidth - minWidth) * i / (safeSteps - 1));
            brushWidths.push(Math.round(value));
        }

        return brushWidths;
    }

    function getWidth(config) {
        var horizontalPadding = 16;
        var columns = getColumnCount(config);
        var columnGap = config.optionGap * (columns - 1);

        return (config.optionWidth * columns) + columnGap + horizontalPadding;
    }

    function getHeight(config) {
        var brushWidths = createBrushWidths(config.minWidth, config.maxWidth, config.steps);
        var verticalPadding = 11;
        var valueHeight = 23;
        var checksHeight = 18;
        var toolsHeight = 44;
        var componentGap = 4;
        var columns = getColumnCount(config);
        var rows = Math.ceil(brushWidths.length / columns);
        var minimumOptionHeight = 12;
        var rowHeights = [];
        var listHeight;

        brushWidths.forEach(function(brushWidth, index) {
            var row = index % rows;

            rowHeights[row] = Math.max(rowHeights[row] || 0, Math.max(brushWidth, minimumOptionHeight));
        });

        listHeight = rowHeights.reduce(function(total, rowHeight) {
            return total + rowHeight;
        }, 0) + ((rows - 1) * config.optionGap);

        return verticalPadding + valueHeight + checksHeight + toolsHeight + (componentGap * 3) + listHeight;
    }

    function getColumnCount(config) {
        return Math.max(1, parseInt(config.columns, 10) || DEFAULTS.columns);
    }

    function destroy(picker) {
        if (picker.element.parentNode) {
            picker.element.parentNode.removeChild(picker.element);
        }
    }

    global.SimpleBrushWidthPicker = SimpleBrushWidthPicker;
    global.simpleBrushWidthPicker = SimpleBrushWidthPicker;

}(window));
