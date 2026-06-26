(function(global) {

    "use strict";

    var FALLBACK_RESAMPLING_ALGORITHMS = [
        {
            id: "nearest-neighbor",
            displayText: "Nearest Neighbor (preserve hard edges)",
            textColor: "blue",
            description: "Samples the closest source pixel without smoothing. Best for pixel art, masks, icons, and hard-edged artwork."
        },
        {
            id: "bilinear",
            displayText: "Bilinear",
            textColor: "blue",
            description: "Blends the four nearest source pixels. Fast and smooth, but softer than higher-quality filters."
        },
        {
            id: "bicubic",
            displayText: "Bicubic (best for smooth gradients)",
            textColor: "blue",
            description: "Uses cubic interpolation over neighboring pixels. Good general-purpose quality for smooth artwork and gradients."
        },
        {
            id: "bicubic-smoother",
            displayText: "Bicubic Smoother (best for enlargement)",
            textColor: "blue",
            description: "A smoother bicubic variant intended for upscaling, reducing jagged edges at the cost of some sharpness."
        },
        {
            id: "bicubic-sharper",
            displayText: "Bicubic Sharper (best for reduction)",
            textColor: "blue",
            description: "A sharper bicubic variant intended for downscaling, preserving apparent detail while reducing size."
        }
    ];

    var DEFAULTS = {
        width: 800,
        height: 600,
        resolution: 72,
        widthUnit: "pixels",
        heightUnit: "pixels",
        printWidth: 11.11,
        printHeight: 8.33,
        printUnit: "inches",
        constrainProportions: true,
        resample: true,
        interpolation: "bicubic",
        interpolationOptions: null,
        onOk: null,
        onCancel: null,
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

    function ResizeImage(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var interpolationOptions = getResamplingAlgorithms(config.interpolationOptions);
        var initialInterpolationId = normalizeInterpolationId(config.interpolation, interpolationOptions);
        var aspectRatio = sanitizeNumber(config.width, DEFAULTS.width) /
            sanitizeNumber(config.height, DEFAULTS.height);
        var root = createElement("div", "resize-image-dialog");
        var body = createElement("div", "resize-image-body", root);
        var sidePanel = createElement("div", "resize-image-side", root);
        var actions = createElement("div", "resize-image-actions", sidePanel);
        var form = createElement("div", "resize-image-form");
        var sizeFieldset = createFieldset("Pixel Dimensions:");
        var widthInput = createNumberInput("resize-image-width", config.width, 1, 99999, 1);
        var heightInput = createNumberInput("resize-image-height", config.height, 1, 99999, 1);
        var widthUnit = createSelect("resize-image-width-unit", ["pixels", "percent"], config.widthUnit);
        var heightUnit = createSelect("resize-image-height-unit", ["pixels", "percent"], config.heightUnit);
        var documentFieldset = createFieldset("Document Size");
        var printWidthInput = createNumberInput("resize-image-print-width", config.printWidth, 0.01, 99999, 0.01);
        var printHeightInput = createNumberInput("resize-image-print-height", config.printHeight, 0.01, 99999, 0.01);
        var printUnit = createSelect("resize-image-print-unit", ["inches", "cm", "mm", "points"], config.printUnit);
        var resolutionInput = createNumberInput("resize-image-resolution", config.resolution, 1, 99999, 1);
        var resolutionUnit = createSelect("resize-image-resolution-unit", ["pixels/inch", "pixels/cm"], "pixels/inch");
        var optionsFieldset = createFieldset("Options");
        var constrainCheck = createCheckbox("resize-image-constrain", "Constrain Proportions", config.constrainProportions);
        var resampleCheck = createCheckbox("resize-image-resample", "Resample Image", config.resample);
        var interpolationRadios = createAlgorithmRadios("resize-image-interpolation", interpolationOptions, initialInterpolationId);
        var algorithmDescription = createAlgorithmDescriptionPanel();
        var okButton = createButton("OK");
        var cancelButton = createButton("Cancel");
        var component;

        sizeFieldset.content.appendChild(createSizeRow("Width:", widthInput, widthUnit));
        sizeFieldset.content.appendChild(createSizeRow("Height:", heightInput, heightUnit));
        addChainIcon(sizeFieldset.content);

        documentFieldset.content.appendChild(createSizeRow("Width:", printWidthInput, printUnit));
        documentFieldset.content.appendChild(createSizeRow("Height:", printHeightInput, printUnit.cloneNode(true)));
        documentFieldset.content.appendChild(createSizeRow("Resolution:", resolutionInput, resolutionUnit));
        addChainIcon(documentFieldset.content);

        optionsFieldset.content.appendChild(constrainCheck.row);
        appendResampleLegend(resampleCheck.row);
        optionsFieldset.content.appendChild(createResampleRow(resampleCheck, interpolationRadios.element));

        form.appendChild(sizeFieldset.element);
        form.appendChild(documentFieldset.element);
        form.appendChild(optionsFieldset.element);
        body.appendChild(form);
        actions.appendChild(okButton);
        actions.appendChild(cancelButton);
        sidePanel.appendChild(algorithmDescription.element);

        component = {
            element: root,
            getOptions: function() {
                return getOptions();
            },
            setOptions: function(nextOptions) {
                applyOptions(nextOptions || {});
            },
            destroy: function() {
                destroy(component);
            }
        };

        widthInput.addEventListener("input", function() {
            syncProportionalDimension("width");
            updateState(true);
        });

        heightInput.addEventListener("input", function() {
            syncProportionalDimension("height");
            updateState(true);
        });

        widthUnit.addEventListener("change", function() {
            heightUnit.value = widthUnit.value;
            updateState(true);
        });

        heightUnit.addEventListener("change", function() {
            widthUnit.value = heightUnit.value;
            updateState(true);
        });

        constrainCheck.input.addEventListener("change", function() {
            updateState(true);
        });

        [printWidthInput, printHeightInput, printUnit, resolutionInput, resolutionUnit,
            resampleCheck.input, interpolationRadios.element].forEach(function(control) {
            control.addEventListener("input", function() {
                updateState(true);
            });
            control.addEventListener("change", function() {
                updateState(true);
            });
        });

        okButton.addEventListener("click", function() {
            if (typeof config.onOk === "function") {
                config.onOk(component.getOptions(), component);
            }
        });

        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(component);
            }
        });

        updateState(false);
        return component;

        function getOptions() {
            var widthValue = sanitizeNumber(widthInput.value, config.width);
            var heightValue = sanitizeNumber(heightInput.value, config.height);
            var interpolationOption = getAlgorithmById(interpolationOptions, interpolationRadios.getValue());

            return {
                width: unitToPixels(widthValue, widthUnit.value, config.width),
                height: unitToPixels(heightValue, heightUnit.value, config.height),
                widthValue: widthValue,
                heightValue: heightValue,
                widthUnit: widthUnit.value,
                heightUnit: heightUnit.value,
                printWidth: sanitizeNumber(printWidthInput.value, config.printWidth),
                printHeight: sanitizeNumber(printHeightInput.value, config.printHeight),
                printUnit: printUnit.value,
                resolution: sanitizeNumber(resolutionInput.value, config.resolution),
                resolutionUnit: resolutionUnit.value,
                constrainProportions: constrainCheck.input.checked,
                resample: resampleCheck.input.checked,
                interpolationId: interpolationOption.id,
                interpolation: interpolationOption.displayText,
                interpolationDescription: interpolationOption.description
            };
        }

        function applyOptions(nextOptions) {
            if (nextOptions.width !== undefined) {
                widthInput.value = nextOptions.width;
                config.width = sanitizeNumber(nextOptions.width, config.width);
            }
            if (nextOptions.height !== undefined) {
                heightInput.value = nextOptions.height;
                config.height = sanitizeNumber(nextOptions.height, config.height);
            }
            if (nextOptions.resolution !== undefined) {
                resolutionInput.value = nextOptions.resolution;
            }
            if (nextOptions.constrainProportions !== undefined) {
                constrainCheck.input.checked = !!nextOptions.constrainProportions;
            }
            if (nextOptions.resample !== undefined) {
                resampleCheck.input.checked = !!nextOptions.resample;
            }
            if (nextOptions.interpolation !== undefined) {
                interpolationRadios.setValue(normalizeInterpolationId(nextOptions.interpolation, interpolationOptions));
            }
            if (nextOptions.interpolationId !== undefined) {
                interpolationRadios.setValue(normalizeInterpolationId(nextOptions.interpolationId, interpolationOptions));
            }

            aspectRatio = sanitizeNumber(config.width, DEFAULTS.width) /
                sanitizeNumber(config.height, DEFAULTS.height);
            updateState(true);
        }

        function syncProportionalDimension(changedField) {
            var value;

            if (!constrainCheck.input.checked || !aspectRatio) {
                return;
            }

            if (changedField === "width") {
                value = sanitizeNumber(widthInput.value, config.width);
                heightInput.value = Math.max(1, Math.round(value / aspectRatio));
                return;
            }

            value = sanitizeNumber(heightInput.value, config.height);
            widthInput.value = Math.max(1, Math.round(value * aspectRatio));
        }

        function updateState(emitChange) {
            var options = getOptions();

            sizeFieldset.legend.textContent = "Pixel Dimensions: " + estimateImageSize(options.width, options.height);
            interpolationRadios.setDisabled(!options.resample);
            algorithmDescription.update(options.resample ? getAlgorithmById(interpolationOptions, options.interpolationId) : null);
            root.classList.toggle("resize-image-constrained", options.constrainProportions);
            root.classList.toggle("resize-image-resample-disabled", !options.resample);
            if (emitChange && typeof config.onChange === "function") {
                config.onChange(options, component);
            }
        }
    }

    function addChainIcon(parent) {
        var icon = createElement("span", "resize-image-chain", parent);

        icon.setAttribute("aria-hidden", "true");
    }

    function createAlgorithmDescriptionPanel() {
        var element = createElement("div", "resize-image-algorithm-description");
        var title = createElement("div", "resize-image-algorithm-description-title", element);
        var text = createElement("div", "resize-image-algorithm-description-text", element);

        return {
            element: element,
            update: function(algorithm) {
                if (!algorithm) {
                    title.textContent = "";
                    text.textContent = "";
                    element.classList.add("resize-image-algorithm-description-empty");
                    return;
                }

                title.textContent = algorithm.displayText;
                text.textContent = algorithm.description;
                element.classList.remove("resize-image-algorithm-description-empty");
            }
        };
    }

    function createFieldset(title) {
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var content = createElement("div", "resize-image-fieldset-content", element);

        element.className = "resize-image-fieldset";
        legend.textContent = title;
        element.insertBefore(legend, content);

        return {
            element: element,
            legend: legend,
            content: content
        };
    }

    function createSizeRow(labelText, input, select) {
        var row = createElement("label", "resize-image-row");
        var label = createElement("span", "resize-image-row-label", row);

        label.textContent = labelText;
        row.appendChild(input);
        row.appendChild(select);

        return row;
    }

    function createResampleRow(resampleCheck, interpolationControl) {
        var row = createElement("div", "resize-image-resample-row");

        row.appendChild(resampleCheck.row);
        row.appendChild(interpolationControl);

        return row;
    }

    function createCheckbox(id, labelText, checked) {
        var row = createElement("label", "resize-image-check");
        var input = document.createElement("input");
        var label = createElement("span", "", row);

        input.id = id;
        input.type = "checkbox";
        input.checked = !!checked;
        row.insertBefore(input, label);
        label.textContent = labelText;

        return {
            row: row,
            input: input
        };
    }

    function appendResampleLegend(row) {
        var legend = createElement("div", "resize-image-resample-legend", row);

        appendLegendItem(legend, "blue", "Default (Photoshop)");
        appendLegendItem(legend, "green", "Interesting / Creative");
        appendLegendItem(legend, "red", "Slow");
        appendLegendItem(legend, "gray", "Not important");
    }

    function appendLegendItem(parent, color, labelText) {
        var item = createElement("span", "resize-image-resample-legend-item", parent);
        var swatch = createElement("span", "resize-image-resample-legend-swatch", item);
        var label = createElement("span", "", item);

        swatch.style.backgroundColor = color;
        label.textContent = labelText;
    }

    function createNumberInput(id, value, min, max, step) {
        var input = document.createElement("input");

        input.id = id;
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = value;

        return input;
    }

    function createSelect(id, options, value) {
        var select = document.createElement("select");

        select.id = id;
        options.forEach(function(optionValue) {
            var option = document.createElement("option");

            option.value = optionValue;
            option.textContent = optionValue;
            select.appendChild(option);
        });
        select.value = value;

        return select;
    }

    function createAlgorithmRadios(name, algorithms, value) {
        var group = createElement("div", "resize-image-algorithm-radios");
        var selectedValue = normalizeInterpolationId(value, algorithms);

        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", "Resampling algorithm");
        algorithms.forEach(function(algorithm) {
            var label = createElement("label", "resize-image-algorithm-option", group);
            var input = document.createElement("input");
            var text = createElement("span", "", label);

            input.type = "radio";
            input.name = name;
            input.value = algorithm.id;
            input.checked = algorithm.id === selectedValue;
            input.title = algorithm.description;
            if (algorithm.textColor) {
                text.style.color = algorithm.textColor;
            }
            text.textContent = algorithm.displayText;
            label.title = algorithm.description;
            label.insertBefore(input, text);
        });

        return {
            element: group,
            getValue: function() {
                var checked = group.querySelector("input:checked");

                return checked ? checked.value : selectedValue;
            },
            setValue: function(nextValue) {
                var normalized = normalizeInterpolationId(nextValue, algorithms);
                var input = group.querySelector('input[value="' + cssEscape(normalized) + '"]');

                if (input) {
                    input.checked = true;
                    selectedValue = normalized;
                }
            },
            setDisabled: function(disabled) {
                var inputs = group.querySelectorAll("input");
                var i;

                for (i = 0; i < inputs.length; i++) {
                    inputs[i].disabled = !!disabled;
                }
            }
        };
    }

    function getResamplingAlgorithms(options) {
        var source = options ||
            global.ResizeImageResamplingAlgorithms ||
            FALLBACK_RESAMPLING_ALGORITHMS;

        return source.map(function(algorithm) {
            return {
                id: String(algorithm.id || "").trim(),
                displayText: String(algorithm.displayText || algorithm.label || algorithm.id || "").trim(),
                textColor: algorithm.textColor || "#444444",
                description: String(algorithm.description || "").trim()
            };
        }).filter(function(algorithm) {
            return algorithm.id && algorithm.displayText;
        });
    }

    function normalizeInterpolationId(value, algorithms) {
        var normalized = String(value || "").toLowerCase();
        var found = algorithms.filter(function(algorithm) {
            return algorithm.id.toLowerCase() === normalized ||
                algorithm.displayText.toLowerCase() === normalized;
        })[0];

        return (found || algorithms[0] || { id: "bicubic" }).id;
    }

    function getAlgorithmById(algorithms, id) {
        return algorithms.filter(function(algorithm) {
            return algorithm.id === id;
        })[0] || algorithms[0] || {
            id: "bicubic",
            displayText: "Bicubic (best for smooth gradients)",
            description: ""
        };
    }

    function cssEscape(value) {
        if (global.CSS && typeof global.CSS.escape === "function") {
            return global.CSS.escape(value);
        }

        return String(value).replace(/"/g, "\\\"");
    }

    function createButton(label) {
        var button = document.createElement("button");

        button.type = "button";
        button.textContent = label;

        return button;
    }

    function createElement(tagName, className, parent) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }
        if (parent) {
            parent.appendChild(element);
        }

        return element;
    }

    function unitToPixels(value, unit, originalValue) {
        if (unit === "percent") {
            return Math.max(1, Math.round(originalValue * value / 100));
        }

        return Math.max(1, Math.round(value));
    }

    function sanitizeNumber(value, fallback) {
        var number = parseFloat(value);

        if (isNaN(number)) {
            return fallback;
        }

        return Math.max(0.01, number);
    }

    function estimateImageSize(width, height) {
        var bytes = Math.max(1, Math.round(width * height * 4));
        var mb = bytes / 1024 / 1024;

        if (mb >= 1) {
            return mb.toFixed(1) + "M";
        }

        return Math.max(1, Math.round(bytes / 1024)) + "K";
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.ResizeImage = ResizeImage;
    global.resizeImage = ResizeImage;

}(window));
