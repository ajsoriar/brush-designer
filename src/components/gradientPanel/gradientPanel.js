(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 236,
        height: 108,
        fromColor: "#000000",
        toColor: "#ffffff",
        onChange: null
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

    function GradientPanel(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var componentId = config.id || ("gradient-panel-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var component;

        element.id = componentId;
        element.className = "gradient-panel";
        element.style.width = config.width + "px";
        element.style.minHeight = config.height + "px";

        component = {
            id: componentId,
            element: element,
            options: config,
            getWidth: function() {
                return config.width;
            },
            getHeight: function() {
                return config.height;
            },
            getGradient: function() {
                return getGradient(component);
            },
            setStopColor: function(stopId, color) {
                setStopColor(component, stopId, color);
            },
            destroy: function() {
                destroy(component);
            }
        };

        render(component);
        container.appendChild(element);

        return component;
    }

    function render(component) {
        var preview = document.createElement("div");
        var fromRow = createColorRow(component, "From", "from", component.options.fromColor);
        var toRow = createColorRow(component, "To", "to", component.options.toColor);

        preview.className = "gradient-panel-preview";
        preview.style.background = "linear-gradient(90deg, " + component.options.fromColor + ", " + component.options.toColor + ")";

        component.element.innerHTML = "";
        component.element.appendChild(preview);
        component.element.appendChild(fromRow);
        component.element.appendChild(toRow);
    }

    function createColorRow(component, labelText, stopId, color) {
        var row = document.createElement("div");
        var label = document.createElement("div");
        var swatch = document.createElement("div");

        row.className = "gradient-panel-row";
        label.className = "gradient-panel-label";
        label.textContent = labelText;
        swatch.className = "gradient-panel-swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("data-gradient-stop", stopId);
        swatch.title = color;
        swatch.addEventListener("dragover", function(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            swatch.className = "gradient-panel-swatch gradient-panel-swatch-drop";
        });
        swatch.addEventListener("dragleave", function() {
            swatch.className = "gradient-panel-swatch";
        });
        swatch.addEventListener("drop", function(event) {
            var droppedColor;

            event.preventDefault();
            swatch.className = "gradient-panel-swatch";
            droppedColor = event.dataTransfer.getData("application/x-brush-designer-color") ||
                event.dataTransfer.getData("text/plain");

            if (isColorValue(droppedColor)) {
                setStopColor(component, stopId, droppedColor);
            }
        });

        row.appendChild(label);
        row.appendChild(swatch);

        return row;
    }

    function setStopColor(component, stopId, color) {
        if (stopId === "from") {
            component.options.fromColor = color;
        } else if (stopId === "to") {
            component.options.toColor = color;
        } else {
            return;
        }

        render(component);

        if (typeof component.options.onChange === "function") {
            component.options.onChange(getGradient(component), component);
        }
    }

    function getGradient(component) {
        return {
            type: "linear",
            stops: [
                {
                    offset: 0,
                    color: component.options.fromColor
                },
                {
                    offset: 1,
                    color: component.options.toColor
                }
            ]
        };
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "gradient-panel-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("GradientPanel container not found: " + containerId);
        }

        return container;
    }

    function isColorValue(value) {
        var probe;

        if (!value) {
            return false;
        }

        probe = document.createElement("span");
        probe.style.color = "";
        probe.style.color = value;

        return !!probe.style.color;
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.GradientPanel = GradientPanel;
    global.gradientPanel = GradientPanel;

}(window));
