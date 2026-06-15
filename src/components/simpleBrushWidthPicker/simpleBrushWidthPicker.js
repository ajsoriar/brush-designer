(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        minWidth: 1,
        maxWidth: 27,
        steps: 16,
        activeBrushWidth: null,
        brushShape: "circle",
        brushStroke: false,
        brushAntialiasing: false,
        optionWidth: 72,
        optionGap: 5,
        onChange: null,
        onBrushWidthSelected: null,
        onBrushStrokeChange: null,
        onBrushAntialiasingChange: null
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

    function SimpleBrushWidthPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var pickerId = config.id || ("simple-brush-width-picker-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var value = document.createElement("label");
        var valueInput = document.createElement("input");
        var valueUnit = document.createElement("span");
        var strokeControl = createStrokeControl(pickerId);
        var antialiasingControl = createAntialiasingControl(pickerId);
        var list = document.createElement("div");
        var brushWidths = createBrushWidths(config.minWidth, config.maxWidth, config.steps);
        var picker;

        element.id = pickerId;
        element.className = "simple-brush-width-picker";

        value.className = "simple-brush-width-picker-value";
        valueInput.type = "number";
        valueInput.min = "1";
        valueInput.max = "200";
        valueInput.step = "1";
        valueInput.className = "simple-brush-width-picker-value-input";
        valueUnit.className = "simple-brush-width-picker-value-unit";
        valueUnit.textContent = "px";
        value.appendChild(valueInput);
        value.appendChild(valueUnit);

        list.className = "simple-brush-width-picker-list";
        list.style.gap = config.optionGap + "px";

        element.appendChild(value);
        element.appendChild(strokeControl.label);
        element.appendChild(antialiasingControl.label);
        element.appendChild(list);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            listElement: list,
            valueInput: valueInput,
            strokeInput: strokeControl.input,
            antialiasingInput: antialiasingControl.input,
            brushWidths: brushWidths,
            brushShape: normalizeBrushShape(config.brushShape),
            brushStroke: !!config.brushStroke,
            brushAntialiasing: !!config.brushAntialiasing,
            activeBrushWidth: normalizeBrushWidth(config.activeBrushWidth || brushWidths[0]),
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
        setActiveBrushWidth(picker, picker.activeBrushWidth, config, "init");
        setBrushStroke(picker, picker.brushStroke, config);
        setBrushAntialiasing(picker, picker.brushAntialiasing, config);

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

    function setActiveBrushWidth(picker, brushWidth, config, source) {
        var buttons = picker.listElement.querySelectorAll(".simple-brush-width-picker-option");
        var normalizedBrushWidth = normalizeBrushWidth(brushWidth);
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

    function normalizeBrushWidth(brushWidth) {
        var value = Math.round(parseFloat(brushWidth));

        if (isNaN(value)) {
            return 1;
        }

        return Math.max(1, Math.min(value, 200));
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

        return config.optionWidth + horizontalPadding;
    }

    function getHeight(config) {
        var brushWidths = createBrushWidths(config.minWidth, config.maxWidth, config.steps);
        var verticalPadding = 11;
        var valueHeight = 23;
        var checksHeight = 36;
        var componentGap = 4;
        var minimumOptionHeight = 12;
        var listHeight = brushWidths.reduce(function(total, brushWidth) {
            return total + Math.max(brushWidth, minimumOptionHeight);
        }, 0) + ((brushWidths.length - 1) * config.optionGap);

        return verticalPadding + valueHeight + checksHeight + (componentGap * 3) + listHeight;
    }

    function destroy(picker) {
        if (picker.element.parentNode) {
            picker.element.parentNode.removeChild(picker.element);
        }
    }

    global.SimpleBrushWidthPicker = SimpleBrushWidthPicker;
    global.simpleBrushWidthPicker = SimpleBrushWidthPicker;

}(window));
