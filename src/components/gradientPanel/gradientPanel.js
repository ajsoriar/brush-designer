(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 236,
        height: 276,
        type: "linear",
        bounded: false,
        retro: false,
        ditheringMethod: "ordered-bayer-8x8",
        ditheringOptions: {
            diffusionStrength: 1,
            noiseAmount: 1,
            halftoneCellSize: 6,
            patternLevels: 6,
            patternCellSize: 4
        },
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
        config.ditheringOptions = extend(extend({}, DEFAULTS.ditheringOptions), config.ditheringOptions || {});
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
        var typeControls = createTypeControls(component);
        var boundControls = createBoundControls(component);
        var preview = createPreview(component);
        var fromRow = createColorRow(component, "From", "from", component.options.fromColor);
        var toRow = createColorRow(component, "To", "to", component.options.toColor);
        var retroControls = createRetroControls(component);

        component.element.innerHTML = "";
        component.element.appendChild(typeControls);
        component.element.appendChild(boundControls);
        component.element.appendChild(preview);
        component.element.appendChild(fromRow);
        component.element.appendChild(toRow);
        component.element.appendChild(retroControls);
    }

    function createPreview(component) {
        var preview;

        if (component.options.retro) {
            preview = document.createElement("canvas");
            preview.className = "gradient-panel-preview gradient-panel-preview-retro";
            preview.width = 220;
            preview.height = 32;
            renderRetroPreview(preview, component);
            return preview;
        }

        preview = document.createElement("div");
        preview.className = "gradient-panel-preview";
        preview.style.background = getPreviewBackground(component);

        return preview;
    }

    function createTypeControls(component) {
        var row = document.createElement("div");
        var reverseButton = document.createElement("button");

        row.className = "gradient-panel-type-row";
        row.appendChild(createTypeRadio(component, "linear", "Linear"));
        row.appendChild(createTypeRadio(component, "radial", "Radial"));
        reverseButton.type = "button";
        reverseButton.className = "gradient-panel-reverse-btn";
        reverseButton.textContent = "Reverse colors";
        reverseButton.addEventListener("click", function() {
            reverseColors(component);
        });
        row.appendChild(reverseButton);

        return row;
    }

    function createTypeRadio(component, value, labelText) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        label.className = "gradient-panel-type-option";
        input.type = "radio";
        input.name = component.id + "-type";
        input.value = value;
        input.checked = component.options.type === value;
        input.addEventListener("change", function() {
            if (input.checked) {
                setGradientType(component, value);
            }
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode(labelText));

        return label;
    }

    function createBoundControls(component) {
        var row = document.createElement("div");
        var label = document.createElement("label");
        var input = document.createElement("input");

        row.className = "gradient-panel-bound-row";
        label.className = "gradient-panel-type-option";
        input.type = "checkbox";
        input.checked = !!component.options.bounded;
        input.addEventListener("change", function() {
            setBounded(component, input.checked);
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode("Bounded"));
        row.appendChild(label);

        return row;
    }

    function createRetroControls(component) {
        var panel = document.createElement("div");
        var methods = [
            { value: "ordered-bayer-4x4", label: "Bayer 4x4" },
            { value: "ordered-bayer-8x8", label: "Bayer 8x8" },
            { value: "floyd-steinberg", label: "Floyd-Steinberg" },
            { value: "atkinson", label: "Atkinson" },
            { value: "stucki", label: "Stucki" },
            { value: "jarvis", label: "Jarvis" },
            { value: "noise", label: "Noise" },
            { value: "blue-noise", label: "Blue Noise" },
            { value: "halftone", label: "Halftone" },
            { value: "pattern", label: "Pattern" }
        ];

        panel.className = "gradient-panel-retro";
        panel.appendChild(createRetroCheck(component));
        methods.forEach(function(method) {
            panel.appendChild(createDitheringRadio(component, method.value, method.label));
        });
        panel.appendChild(createDitheringOptions(component));

        return panel;
    }

    function createRetroCheck(component) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        label.className = "gradient-panel-type-option";
        input.type = "checkbox";
        input.checked = !!component.options.retro;
        input.addEventListener("change", function() {
            setRetro(component, input.checked);
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode("Retro"));

        return label;
    }

    function createDitheringRadio(component, value, labelText) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        label.className = "gradient-panel-retro-option";
        input.type = "radio";
        input.name = component.id + "-dithering";
        input.value = value;
        input.checked = component.options.ditheringMethod === value;
        input.addEventListener("change", function() {
            if (input.checked) {
                setDitheringMethod(component, value);
            }
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode(labelText));

        return label;
    }

    function createDitheringOptions(component) {
        var method = component.options.ditheringMethod;
        var options = component.options.ditheringOptions;
        var panel = document.createElement("div");

        panel.className = "gradient-panel-retro-options";

        if (isErrorDiffusionMethod(method)) {
            panel.appendChild(createStepper(component, "Diffusion", "diffusionStrength", 0.25, 2, 0.25, options.diffusionStrength));
        } else if (method === "noise" || method === "blue-noise") {
            panel.appendChild(createStepper(component, "Amount", "noiseAmount", 0.25, 2, 0.25, options.noiseAmount));
        } else if (method === "halftone") {
            panel.appendChild(createStepper(component, "Cell", "halftoneCellSize", 3, 16, 1, options.halftoneCellSize));
        } else if (method === "pattern") {
            panel.appendChild(createStepper(component, "Levels", "patternLevels", 2, 12, 1, options.patternLevels));
            panel.appendChild(createStepper(component, "Cell", "patternCellSize", 2, 12, 1, options.patternCellSize));
        }

        return panel;
    }

    function createStepper(component, labelText, optionName, min, max, step, value) {
        var row = document.createElement("div");
        var label = document.createElement("span");
        var minus = document.createElement("button");
        var valueText = document.createElement("span");
        var plus = document.createElement("button");

        row.className = "gradient-panel-stepper";
        label.className = "gradient-panel-stepper-label";
        label.textContent = labelText;
        valueText.className = "gradient-panel-stepper-value";
        valueText.textContent = formatOptionValue(value);
        minus.type = "button";
        minus.className = "gradient-panel-stepper-btn";
        minus.textContent = "-";
        plus.type = "button";
        plus.className = "gradient-panel-stepper-btn";
        plus.textContent = "+";

        minus.addEventListener("click", function() {
            setDitheringOption(component, optionName, clampNumber(value - step, min, max));
        });
        plus.addEventListener("click", function() {
            setDitheringOption(component, optionName, clampNumber(value + step, min, max));
        });

        row.appendChild(label);
        row.appendChild(minus);
        row.appendChild(valueText);
        row.appendChild(plus);

        return row;
    }

    function formatOptionValue(value) {
        if (Math.round(value) === value) {
            return String(value);
        }

        return String(Math.round(value * 100) / 100);
    }

    function clampNumber(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getPreviewBackground(component) {
        return "linear-gradient(90deg, " + component.options.fromColor + ", " + component.options.toColor + ")";
    }

    function renderRetroPreview(canvas, component) {
        var context = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var fromColor = getCanvasColor(component.options.fromColor);
        var toColor = getCanvasColor(component.options.toColor);
        var imageData;
        var data;
        var x;
        var y;
        var index;
        var useFrom;

        if (isErrorDiffusionMethod(component.options.ditheringMethod)) {
            renderErrorDiffusionPreview(context, component, fromColor, toColor, width, height);
            return;
        }

        imageData = context.createImageData(width, height);
        data = imageData.data;

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                useFrom = shouldUseFromColor(component, x, y, width, height);
                index = ((y * width) + x) * 4;
                setPreviewPixel(data, index, useFrom ? fromColor : toColor);
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function shouldUseFromColor(component, x, y, width, height) {
        var bayer8 = [
            [0, 32, 8, 40, 2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44, 4, 36, 14, 46, 6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [3, 35, 11, 43, 1, 33, 9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47, 7, 39, 13, 45, 5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ];
        var bayer4 = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
        var t;
        var threshold;
        var fromAmount;

        t = x / Math.max(1, width - 1);
        fromAmount = 1 - t;

        if (component.options.ditheringMethod === "halftone") {
            return shouldUseHalftone(x, y, fromAmount, component.options.ditheringOptions.halftoneCellSize);
        }

        if (component.options.ditheringMethod === "pattern") {
            threshold = getPatternThreshold(x, y, fromAmount, component.options.ditheringOptions.patternLevels, component.options.ditheringOptions.patternCellSize);
        } else if (component.options.ditheringMethod === "noise") {
            threshold = getScaledNoiseThreshold(x, y, component.options.ditheringOptions.noiseAmount);
        } else if (component.options.ditheringMethod === "blue-noise") {
            threshold = getScaledBlueNoiseThreshold(x, y, component.options.ditheringOptions.noiseAmount);
        } else if (component.options.ditheringMethod === "ordered-bayer-4x4") {
            threshold = (bayer4[y % 4][x % 4] + 0.5) / 16;
        } else {
            threshold = (bayer8[y % 8][x % 8] + 0.5) / 64;
        }

        return fromAmount >= threshold;
    }

    function renderErrorDiffusionPreview(context, component, fromColor, toColor, width, height) {
        var imageData = context.createImageData(width, height);
        var data = imageData.data;
        var errorBuffer = [];
        var kernel = getErrorDiffusionKernel(component.options.ditheringMethod);
        var x;
        var y;
        var index;
        var value;
        var output;
        var error;
        var i;
        var item;

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                errorBuffer[(y * width) + x] = 1 - (x / Math.max(1, width - 1));
            }
        }

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                index = (y * width) + x;
                value = Math.max(0, Math.min(1, errorBuffer[index]));
                output = value >= 0.5 ? 1 : 0;
                error = value - output;
                setPreviewPixel(data, index * 4, output ? fromColor : toColor);
                for (i = 0; i < kernel.items.length; i++) {
                    item = kernel.items[i];
                    diffuseError(errorBuffer, width, height, x + item.x, y + item.y, error * item.weight / kernel.divisor * component.options.ditheringOptions.diffusionStrength);
                }
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function isErrorDiffusionMethod(method) {
        return method === "floyd-steinberg" ||
            method === "atkinson" ||
            method === "stucki" ||
            method === "jarvis";
    }

    function getErrorDiffusionKernel(method) {
        if (method === "atkinson") {
            return {
                divisor: 8,
                items: [
                    { x: 1, y: 0, weight: 1 },
                    { x: 2, y: 0, weight: 1 },
                    { x: -1, y: 1, weight: 1 },
                    { x: 0, y: 1, weight: 1 },
                    { x: 1, y: 1, weight: 1 },
                    { x: 0, y: 2, weight: 1 }
                ]
            };
        }

        if (method === "stucki") {
            return {
                divisor: 42,
                items: [
                    { x: 1, y: 0, weight: 8 }, { x: 2, y: 0, weight: 4 },
                    { x: -2, y: 1, weight: 2 }, { x: -1, y: 1, weight: 4 }, { x: 0, y: 1, weight: 8 }, { x: 1, y: 1, weight: 4 }, { x: 2, y: 1, weight: 2 },
                    { x: -2, y: 2, weight: 1 }, { x: -1, y: 2, weight: 2 }, { x: 0, y: 2, weight: 4 }, { x: 1, y: 2, weight: 2 }, { x: 2, y: 2, weight: 1 }
                ]
            };
        }

        if (method === "jarvis") {
            return {
                divisor: 48,
                items: [
                    { x: 1, y: 0, weight: 7 }, { x: 2, y: 0, weight: 5 },
                    { x: -2, y: 1, weight: 3 }, { x: -1, y: 1, weight: 5 }, { x: 0, y: 1, weight: 7 }, { x: 1, y: 1, weight: 5 }, { x: 2, y: 1, weight: 3 },
                    { x: -2, y: 2, weight: 1 }, { x: -1, y: 2, weight: 3 }, { x: 0, y: 2, weight: 5 }, { x: 1, y: 2, weight: 3 }, { x: 2, y: 2, weight: 1 }
                ]
            };
        }

        return {
            divisor: 16,
            items: [
                { x: 1, y: 0, weight: 7 },
                { x: -1, y: 1, weight: 3 },
                { x: 0, y: 1, weight: 5 },
                { x: 1, y: 1, weight: 1 }
            ]
        };
    }

    function diffuseError(buffer, width, height, x, y, error) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            return;
        }

        buffer[(y * width) + x] += error;
    }

    function setPreviewPixel(data, index, color) {
        var rgb = getRgb(color);

        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = 255;
    }

    function getRgb(color) {
        var parser = document.createElement("span");
        var value;
        var parts;

        parser.style.color = color;
        document.body.appendChild(parser);
        value = global.getComputedStyle(parser).color;
        document.body.removeChild(parser);
        parts = value.match(/\d+/g);

        if (!parts || parts.length < 3) {
            return { r: 0, g: 0, b: 0 };
        }

        return {
            r: parseInt(parts[0], 10),
            g: parseInt(parts[1], 10),
            b: parseInt(parts[2], 10)
        };
    }

    function getNoiseThreshold(x, y) {
        var value = Math.sin((x * 12.9898) + (y * 78.233)) * 43758.5453;

        return value - Math.floor(value);
    }

    function getBlueNoiseThreshold(x, y) {
        var value = (getNoiseThreshold(x, y) + getNoiseThreshold(x + 19, y + 37) * 0.5) % 1;

        return value;
    }

    function getScaledNoiseThreshold(x, y, amount) {
        return clampNumber(0.5 + ((getNoiseThreshold(x, y) - 0.5) * amount), 0, 1);
    }

    function getScaledBlueNoiseThreshold(x, y, amount) {
        return clampNumber(0.5 + ((getBlueNoiseThreshold(x, y) - 0.5) * amount), 0, 1);
    }

    function shouldUseHalftone(x, y, fromAmount, cellSize) {
        var cx = (x % cellSize) - ((cellSize - 1) / 2);
        var cy = (y % cellSize) - ((cellSize - 1) / 2);
        var radius = fromAmount * (cellSize * 0.62);

        return (cx * cx) + (cy * cy) <= radius * radius;
    }

    function getPatternThreshold(x, y, fromAmount, levels, cellSize) {
        var level = Math.floor(fromAmount * levels);
        var patternIndex = (x % cellSize) + ((y % cellSize) * cellSize);
        var limit = Math.round((level / Math.max(1, levels)) * cellSize * cellSize);

        return patternIndex < limit ? 0.25 : 0.85;
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
        notifyChange(component);
    }

    function setGradientType(component, type) {
        component.options.type = type === "radial" ? "radial" : "linear";
        render(component);
        notifyChange(component);
    }

    function setBounded(component, bounded) {
        component.options.bounded = !!bounded;
        render(component);
        notifyChange(component);
    }

    function reverseColors(component) {
        var fromColor = component.options.fromColor;

        component.options.fromColor = component.options.toColor;
        component.options.toColor = fromColor;
        render(component);
        notifyChange(component);
    }

    function setRetro(component, retro) {
        component.options.retro = !!retro;
        render(component);
        notifyChange(component);
    }

    function setDitheringMethod(component, ditheringMethod) {
        component.options.ditheringMethod = ditheringMethod;
        render(component);
        notifyChange(component);
    }

    function setDitheringOption(component, optionName, value) {
        component.options.ditheringOptions[optionName] = value;
        render(component);
        notifyChange(component);
    }

    function notifyChange(component) {
        if (typeof component.options.onChange === "function") {
            component.options.onChange(getGradient(component), component);
        }
    }

    function getGradient(component) {
        return {
            type: component.options.type,
            bounded: !!component.options.bounded,
            retro: !!component.options.retro,
            ditheringMethod: component.options.ditheringMethod,
            ditheringOptions: extend({}, component.options.ditheringOptions),
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

    function getCanvasColor(value) {
        var probe = document.createElement("span");

        probe.style.color = value;

        if (!probe.style.color) {
            return "#000000";
        }

        return value;
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.GradientPanel = GradientPanel;
    global.gradientPanel = GradientPanel;

}(window));
