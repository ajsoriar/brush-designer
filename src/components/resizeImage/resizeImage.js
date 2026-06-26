(function(global) {

    "use strict";

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
        interpolation: "Bicubic (best for smooth gradients)",
        interpolationOptions: [
            "Nearest Neighbor (preserve hard edges)",
            "Bilinear",
            "Bicubic (best for smooth gradients)",
            "Bicubic Smoother (best for enlargement)",
            "Bicubic Sharper (best for reduction)"
        ],
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
        var interpolationSelect = createSelect("resize-image-interpolation", config.interpolationOptions, config.interpolation);
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
        optionsFieldset.content.appendChild(createResampleRow(resampleCheck, interpolationSelect));

        form.appendChild(sizeFieldset.element);
        form.appendChild(documentFieldset.element);
        form.appendChild(optionsFieldset.element);
        body.appendChild(form);
        actions.appendChild(okButton);
        actions.appendChild(cancelButton);

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
            resampleCheck.input, interpolationSelect].forEach(function(control) {
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
                interpolation: interpolationSelect.value
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
                interpolationSelect.value = nextOptions.interpolation;
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
            interpolationSelect.disabled = !options.resample;
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

    function createResampleRow(resampleCheck, interpolationSelect) {
        var row = createElement("div", "resize-image-resample-row");

        row.appendChild(resampleCheck.row);
        row.appendChild(interpolationSelect);

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
