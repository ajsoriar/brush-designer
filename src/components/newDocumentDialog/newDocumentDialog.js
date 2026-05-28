(function(global) {

    "use strict";

    var DEFAULTS = {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
        presets: [
            { label: "640 x 480", width: 640, height: 480 },
            { label: "800 x 600", width: 800, height: 600 },
            { label: "1024 x 768", width: 1024, height: 768 },
            { label: "1280 x 720", width: 1280, height: 720 },
            { label: "1280 x 1024", width: 1280, height: 1024 },
            { label: "1366 x 768", width: 1366, height: 768 },
            { label: "1600 x 900", width: 1600, height: 900 },
            { label: "1920 x 1080", width: 1920, height: 1080 }
        ],
        onOk: null,
        onCancel: null
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

    function NewDocumentDialog(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var dialog = document.createElement("div");
        var fieldset = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var presetRow = document.createElement("div");
        var presetLabel = document.createElement("label");
        var preset = document.createElement("select");
        var customOption = document.createElement("option");
        var sizeFields = document.createElement("div");
        var widthInput = createNumberInput("new-document-width", config.width);
        var heightInput = createNumberInput("new-document-height", config.height);
        var actions = document.createElement("div");
        var okButton = document.createElement("button");
        var cancelButton = document.createElement("button");
        var component;

        dialog.className = "new-document-dialog";
        fieldset.className = "new-document-settings";
        legend.textContent = "Preset:";

        presetRow.className = "new-document-form-row";
        presetLabel.setAttribute("for", "new-document-preset");
        presetLabel.textContent = "";
        preset.id = "new-document-preset";
        customOption.value = "custom";
        customOption.textContent = "Custom";
        preset.appendChild(customOption);
        renderPresetOptions(preset, config.presets);

        sizeFields.className = "new-document-size-fields";
        sizeFields.appendChild(createDocumentSizeRow("Width:", widthInput));
        sizeFields.appendChild(createDocumentSizeRow("Height:", heightInput));

        presetRow.appendChild(presetLabel);
        presetRow.appendChild(preset);
        fieldset.appendChild(legend);
        fieldset.appendChild(presetRow);
        fieldset.appendChild(sizeFields);

        actions.className = "new-document-actions";
        okButton.type = "button";
        okButton.textContent = "OK";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        component = {
            element: dialog,
            getOptions: function() {
                return {
                    width: sanitizeDocumentSize(widthInput.value, config.width),
                    height: sanitizeDocumentSize(heightInput.value, config.height),
                    backgroundColor: config.backgroundColor
                };
            },
            destroy: function() {
                destroy(component);
            }
        };

        preset.addEventListener("change", function() {
            applyPreset(preset.value, widthInput, heightInput);
        });

        widthInput.addEventListener("input", function() {
            preset.value = "custom";
        });

        heightInput.addEventListener("input", function() {
            preset.value = "custom";
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

        actions.appendChild(okButton);
        actions.appendChild(cancelButton);
        dialog.appendChild(fieldset);
        dialog.appendChild(actions);

        return component;
    }

    function renderPresetOptions(select, presets) {
        presets.forEach(function(preset) {
            var option = document.createElement("option");

            option.value = preset.width + "x" + preset.height;
            option.textContent = preset.label;
            option.setAttribute("data-width", preset.width);
            option.setAttribute("data-height", preset.height);
            select.appendChild(option);
        });
    }

    function applyPreset(value, widthInput, heightInput) {
        var parts;

        if (value === "custom") {
            return;
        }

        parts = value.split("x");

        if (parts.length !== 2) {
            return;
        }

        widthInput.value = parts[0];
        heightInput.value = parts[1];
    }

    function createNumberInput(id, value) {
        var input = document.createElement("input");

        input.id = id;
        input.type = "number";
        input.min = "1";
        input.max = "4096";
        input.step = "1";
        input.value = value;

        return input;
    }

    function createDocumentSizeRow(labelText, input) {
        var row = document.createElement("div");
        var label = document.createElement("label");
        var unit = document.createElement("span");

        row.className = "new-document-form-row";
        label.setAttribute("for", input.id);
        label.textContent = labelText;
        unit.textContent = "pixels";

        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(unit);

        return row;
    }

    function sanitizeDocumentSize(value, fallback) {
        var size = parseInt(value, 10);

        if (isNaN(size)) {
            return fallback;
        }

        return Math.max(1, Math.min(size, 4096));
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.NewDocumentDialog = NewDocumentDialog;
    global.newDocumentDialog = NewDocumentDialog;

}(window));
