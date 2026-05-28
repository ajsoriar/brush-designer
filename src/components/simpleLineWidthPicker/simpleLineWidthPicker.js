(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        minWidth: 1,
        maxWidth: 15,
        steps: 8,
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
        var value = document.createElement("div");
        var list = document.createElement("div");
        var lineWidths = createLineWidths(config.minWidth, config.maxWidth, config.steps);
        var picker;

        element.id = pickerId;
        element.className = "simple-line-width-picker";

        value.className = "simple-line-width-picker-value";
        list.className = "simple-line-width-picker-list";
        list.style.gap = config.optionGap + "px";

        element.appendChild(value);
        element.appendChild(list);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            listElement: list,
            lineWidths: lineWidths,
            activeLineWidth: config.activeLineWidth || lineWidths[0],
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
                setActiveLineWidth(picker, lineWidth, config);
            },
            destroy: function() {
                destroy(picker);
            }
        };

        renderOptions(picker, config);
        setActiveLineWidth(picker, picker.activeLineWidth, config);

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
            button.style.width = config.optionWidth + "px";
            button.style.height = config.optionHeight + "px";
            button.setAttribute("data-line-width", lineWidth);
            button.title = lineWidth + "px";
            button.addEventListener("click", function() {
                setActiveLineWidth(picker, lineWidth, config);
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

    function setActiveLineWidth(picker, lineWidth, config) {
        var buttons = picker.listElement.querySelectorAll(".simple-line-width-picker-option");
        var value = picker.element.querySelector(".simple-line-width-picker-value");

        picker.activeLineWidth = lineWidth;
        value.textContent = lineWidth + "px";

        Array.prototype.forEach.call(buttons, function(button) {
            if (parseFloat(button.getAttribute("data-line-width")) === lineWidth) {
                button.className = "simple-line-width-picker-option simple-line-width-picker-option-active";
            } else {
                button.className = "simple-line-width-picker-option";
            }
        });

        if (typeof config.onChange === "function") {
            config.onChange(lineWidth, picker);
        }

        if (typeof config.onLineWidthSelected === "function") {
            config.onLineWidthSelected(lineWidth, picker);
        }
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
        var verticalPadding = 16;
        var valueHeight = 16;
        var componentGap = 4;
        var listHeight = (config.steps * config.optionHeight) + ((config.steps - 1) * config.optionGap);

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
