(function(global) {

    "use strict";

    var SPRITE_URL = new URL("../../images/yes-no-32x32-sprite.png", import.meta.url).href;
    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        maxPixels: 9000000,
        fillMode: "background-color",
        onFillModeChange: null,
        onAccept: null,
        onCancel: null
    };

    var FILL_MODES = [
        { value: "transparent", label: "Transparent" },
        { value: "white", label: "White" },
        { value: "black", label: "Black" },
        { value: "front-color", label: "FrontColor" },
        { value: "background-color", label: "BackgroundColor" }
    ];

    function ToolsCropOptionsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var layout = document.createElement("div");
        var sizeLine = document.createElement("div");
        var positionLine = document.createElement("div");
        var pixelsLine = document.createElement("div");
        var pixelsValue = document.createElement("span");
        var sizeLabel = document.createElement("span");
        var sizeValue = document.createElement("span");
        var positionLabel = document.createElement("span");
        var positionValue = document.createElement("span");
        var fillModes = document.createElement("div");
        var fillModeInputs = {};
        var actions = document.createElement("div");
        var acceptButton = document.createElement("button");
        var cancelButton = document.createElement("button");
        var componentId = config.id || ("tools-crop-options-" + Date.now());
        var maxPixels = Math.max(1, toInteger(config.maxPixels));
        var component;

        element.id = componentId;
        element.className = "tools-crop-options";
        legend.textContent = "Crop";

        layout.className = "tools-crop-options-layout";
        sizeLine.className = "tools-crop-options-line";
        positionLine.className = "tools-crop-options-line";
        sizeLabel.className = "tools-crop-options-label";
        sizeValue.className = "tools-crop-options-value";
        positionLabel.className = "tools-crop-options-label";
        positionValue.className = "tools-crop-options-value";
        pixelsLine.className = "tools-crop-options-pixels";
        pixelsValue.className = "tools-crop-options-pixels-value";

        sizeLabel.textContent = "Size:";
        positionLabel.textContent = "Origin:";
        fillModes.className = "tools-crop-options-fill-modes";
        buildFillModeInputs(fillModes, fillModeInputs, componentId);

        actions.className = "tools-crop-options-actions";

        acceptButton.type = "button";
        acceptButton.className = "tools-crop-options-action tools-crop-options-accept";
        acceptButton.title = "Accept crop";
        acceptButton.setAttribute("aria-label", "Accept crop");
        acceptButton.style.backgroundImage = "url('" + SPRITE_URL + "')";

        cancelButton.type = "button";
        cancelButton.className = "tools-crop-options-action tools-crop-options-cancel";
        cancelButton.title = "Cancel crop";
        cancelButton.setAttribute("aria-label", "Cancel crop");
        cancelButton.style.backgroundImage = "url('" + SPRITE_URL + "')";

        sizeLine.appendChild(sizeLabel);
        sizeLine.appendChild(sizeValue);
        pixelsLine.appendChild(pixelsValue);
        positionLine.appendChild(positionLabel);
        positionLine.appendChild(positionValue);

        actions.appendChild(acceptButton);
        actions.appendChild(cancelButton);

        layout.appendChild(sizeLine);
        layout.appendChild(pixelsLine);
        layout.appendChild(positionLine);
        layout.appendChild(fillModes);
        layout.appendChild(actions);

        element.appendChild(legend);
        element.appendChild(layout);
        container.appendChild(element);

        component = {
            id: componentId,
            element: element,
            show: function() {
                setVisible(element, true);
            },
            hide: function() {
                setVisible(element, false);
            },
            setVisible: function(visible) {
                setVisible(element, visible);
            },
            isVisible: function() {
                return element.style.display !== "none";
            },
            setCropBounds: function(bounds) {
                var safe = sanitizeBounds(bounds);
                var numberOfPixels = safe.width * safe.height;
                var isOverLimit = numberOfPixels > maxPixels;
                var availablePixels = Math.max(0, maxPixels - numberOfPixels);
                var availabilityPercent = ((availablePixels / maxPixels) * 100).toFixed(3);

                sizeValue.textContent = safe.width + " x " + safe.height;
                positionValue.textContent = safe.x + ", " + safe.y;
                pixelsValue.textContent = "Number of pixels: " + numberOfPixels + " (" + availabilityPercent + "%)";

                if (isOverLimit) {
                    pixelsLine.classList.add("OVER-LIMIT");
                } else {
                    pixelsLine.classList.remove("OVER-LIMIT");
                }
            },
            setFillMode: function(fillMode) {
                var normalized = normalizeFillMode(fillMode);

                if (fillModeInputs[normalized]) {
                    fillModeInputs[normalized].checked = true;
                }
            },
            getFillMode: function() {
                return readSelectedFillMode(fillModeInputs);
            }
        };

        component.setCropBounds({
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height
        });
        component.setFillMode(config.fillMode);
        component.setVisible(!!config.visible);

        bindFillModeInputs(fillModeInputs, function(fillMode) {
            if (typeof config.onFillModeChange === "function") {
                config.onFillModeChange(fillMode, component);
            }
        });

        acceptButton.addEventListener("click", function() {
            if (typeof config.onAccept === "function") {
                config.onAccept(component);
            }
        });

        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(component);
            }
        });

        return component;
    }

    function sanitizeBounds(bounds) {
        var safe = bounds || {};

        return {
            x: toInteger(safe.x),
            y: toInteger(safe.y),
            width: Math.max(0, toInteger(safe.width)),
            height: Math.max(0, toInteger(safe.height))
        };
    }

    function buildFillModeInputs(container, fillModeInputs, componentId) {
        var i;
        var mode;
        var label;
        var input;
        var groupName = componentId + "-fill-mode";

        for (i = 0; i < FILL_MODES.length; i++) {
            mode = FILL_MODES[i];
            label = document.createElement("label");
            input = document.createElement("input");

            label.className = "tools-crop-options-fill-mode";
            input.type = "radio";
            input.name = groupName;
            input.value = mode.value;
            input.title = mode.label;
            label.appendChild(input);
            label.appendChild(document.createTextNode(mode.label));
            container.appendChild(label);
            fillModeInputs[mode.value] = input;
        }
    }

    function bindFillModeInputs(fillModeInputs, onChange) {
        var key;

        for (key in fillModeInputs) {
            if (Object.prototype.hasOwnProperty.call(fillModeInputs, key)) {
                bindFillModeInput(fillModeInputs[key], onChange);
            }
        }
    }

    function bindFillModeInput(input, onChange) {
        input.addEventListener("change", function() {
            if (input.checked) {
                onChange(input.value);
            }
        });
    }

    function normalizeFillMode(fillMode) {
        var value = String(fillMode || "").toLowerCase();
        var i;

        for (i = 0; i < FILL_MODES.length; i++) {
            if (FILL_MODES[i].value === value) {
                return value;
            }
        }

        return DEFAULTS.fillMode;
    }

    function readSelectedFillMode(fillModeInputs) {
        var key;

        for (key in fillModeInputs) {
            if (Object.prototype.hasOwnProperty.call(fillModeInputs, key) && fillModeInputs[key].checked) {
                return key;
            }
        }

        return DEFAULTS.fillMode;
    }

    function toInteger(value) {
        var numeric = Number(value);

        if (!isFinite(numeric)) {
            return 0;
        }

        return Math.round(numeric);
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "flex" : "none";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ToolsCropOptions container not found: " + containerId);
        }

        return container;
    }

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    global.ToolsCropOptionsComponent = ToolsCropOptionsComponent;
    global.toolsCropOptions = ToolsCropOptionsComponent;

}(window));
