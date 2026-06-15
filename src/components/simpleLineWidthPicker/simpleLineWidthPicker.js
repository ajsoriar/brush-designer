(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        minWidth: 1,
        maxWidth: 30,
        steps: 16,
        activeLineWidth: null,
        optionWidth: 72,
        optionHeight: 24,
        optionGap: 5,
        onChange: null,
        onLineWidthSelected: null
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

    function SimpleLineWidthPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var pickerId = config.id || ("simple-line-width-picker-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var value = document.createElement("label");
        var valueInput = document.createElement("input");
        var valueUnit = document.createElement("span");
        var list = document.createElement("div");
        var lineWidths = createLineWidths(config.minWidth, config.maxWidth, config.steps);
        var picker;

        element.id = pickerId;
        element.className = "simple-line-width-picker";

        value.className = "simple-line-width-picker-value";
        valueInput.type = "number";
        valueInput.min = "1";
        valueInput.max = "200";
        valueInput.step = "1";
        valueInput.className = "simple-line-width-picker-value-input";
        valueUnit.className = "simple-line-width-picker-value-unit";
        valueUnit.textContent = "px";
        value.appendChild(valueInput);
        value.appendChild(valueUnit);
        list.className = "simple-line-width-picker-list";
        list.style.gap = config.optionGap + "px";

        element.appendChild(value);
        element.appendChild(list);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            listElement: list,
            valueInput: valueInput,
            lineWidths: lineWidths,
            activeLineWidth: normalizeLineWidth(config.activeLineWidth || lineWidths[0]),
            getActiveLineWidth: function() {
                return picker.activeLineWidth;
            },
            getWidth: function() {
                return getWidth(config);
            },
            getHeight: function() {
                return getHeight(config);
            },
            setActiveLineWidth: function(lineWidth) {
                setActiveLineWidth(picker, lineWidth, config, "api");
            },
            destroy: function() {
                destroy(picker);
            }
        };

        renderOptions(picker, config);
        valueInput.addEventListener("input", function() {
            setActiveLineWidth(picker, valueInput.value, config, "user");
        });
        valueInput.addEventListener("change", function() {
            setActiveLineWidth(picker, valueInput.value, config, "user");
        });
        setActiveLineWidth(picker, picker.activeLineWidth, config, "init");

        return picker;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "simple-line-width-picker-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("SimpleLineWidthPicker container not found: " + containerId);
        }

        return container;
    }

    function renderOptions(picker, config) {
        picker.listElement.innerHTML = "";

        picker.lineWidths.forEach(function(lineWidth) {
            var button = document.createElement("button");
            var label = document.createElement("span");
            var line = document.createElement("span");

            button.type = "button";
            button.className = "simple-line-width-picker-option";
            button.setAttribute("data-line-width", lineWidth);
            button.title = lineWidth + "px";
            button.addEventListener("click", function() {
                setActiveLineWidth(picker, lineWidth, config, "user");
            });

            label.className = "simple-line-width-picker-label";
            label.textContent = lineWidth + "px";

            line.className = "simple-line-width-picker-line";
            line.style.height = lineWidth + "px";

            button.appendChild(label);
            button.appendChild(line);
            picker.listElement.appendChild(button);
        });
    }

    function setActiveLineWidth(picker, lineWidth, config, source) {
        var buttons = picker.listElement.querySelectorAll(".simple-line-width-picker-option");
        var normalizedLineWidth = normalizeLineWidth(lineWidth);
        var eventMeta = {
            source: source || "api"
        };

        picker.activeLineWidth = normalizedLineWidth;
        picker.valueInput.value = normalizedLineWidth;

        Array.prototype.forEach.call(buttons, function(button) {
            if (parseFloat(button.getAttribute("data-line-width")) === normalizedLineWidth) {
                button.className = "simple-line-width-picker-option simple-line-width-picker-option-active";
            } else {
                button.className = "simple-line-width-picker-option";
            }
        });

        if (typeof config.onChange === "function") {
            config.onChange(normalizedLineWidth, picker, eventMeta);
        }

        if (typeof config.onLineWidthSelected === "function") {
            config.onLineWidthSelected(normalizedLineWidth, picker, eventMeta);
        }
    }

    function normalizeLineWidth(lineWidth) {
        var value = Math.round(parseFloat(lineWidth));

        if (isNaN(value)) {
            return 1;
        }

        return Math.max(1, Math.min(value, 200));
    }

    function createLineWidths(minWidth, maxWidth, steps) {
        var lineWidths = [];
        var safeSteps = Math.max(1, steps);
        var i;
        var value;

        if (safeSteps === 1) {
            return [minWidth];
        }

        for (i = 0; i < safeSteps; i++) {
            value = minWidth + ((maxWidth - minWidth) * i / (safeSteps - 1));
            lineWidths.push(Math.round(value));
        }

        return lineWidths;
    }

    function getWidth(config) {
        var horizontalPadding = 16;

        return config.optionWidth + horizontalPadding;
    }

    function getHeight(config) {
        var lineWidths = createLineWidths(config.minWidth, config.maxWidth, config.steps);
        var verticalPadding = 11;
        var valueHeight = 23;
        var componentGap = 4;
        var minimumOptionHeight = 12;
        var listHeight = lineWidths.reduce(function(total, lineWidth) {
            return total + Math.max(lineWidth, minimumOptionHeight);
        }, 0) + ((lineWidths.length - 1) * config.optionGap);

        return verticalPadding + valueHeight + componentGap + listHeight;
    }

    function destroy(picker) {
        if (picker.element.parentNode) {
            picker.element.parentNode.removeChild(picker.element);
        }
    }

    global.SimpleLineWidthPicker = SimpleLineWidthPicker;
    global.simpleLineWidthPicker = SimpleLineWidthPicker;

}(window));
