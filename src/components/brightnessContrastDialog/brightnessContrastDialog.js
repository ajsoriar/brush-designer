(function(global) {

    "use strict";

    var DEFAULTS = {
        brightness: 0,
        contrast: 0,
        preview: true,
        useLegacy: true,
        onOk: null,
        onCancel: null,
        onChange: null
    };

    function BrightnessContrastDialog(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var root = createElement("div", "brightness-contrast-dialog");
        var controls = createElement("div", "brightness-contrast-controls", root);
        var actions = createElement("div", "brightness-contrast-actions", root);
        var brightnessControl = createSliderControl("brightness-contrast-brightness", "Brightness:", config.brightness);
        var contrastControl = createSliderControl("brightness-contrast-contrast", "Contrast:", config.contrast);
        var okButton = createButton("OK");
        var cancelButton = createButton("Cancel");
        var previewCheck = createCheckbox("brightness-contrast-preview", "Preview", config.preview);
        var legacyCheck = createCheckbox("brightness-contrast-legacy", "Use Legacy", config.useLegacy);
        var component;

        controls.appendChild(brightnessControl.row);
        controls.appendChild(contrastControl.row);
        actions.appendChild(okButton);
        actions.appendChild(cancelButton);
        actions.appendChild(previewCheck.row);
        actions.appendChild(legacyCheck.row);

        component = {
            element: root,
            getOptions: getOptions,
            setOptions: setOptions,
            destroy: function() {
                destroy(component);
            }
        };

        [brightnessControl.range, brightnessControl.input].forEach(function(control) {
            control.addEventListener("input", function() {
                syncSliderControl(brightnessControl, control);
                emitChange();
            });
            control.addEventListener("change", function() {
                syncSliderControl(brightnessControl, control);
                emitChange();
            });
        });

        [contrastControl.range, contrastControl.input].forEach(function(control) {
            control.addEventListener("input", function() {
                syncSliderControl(contrastControl, control);
                emitChange();
            });
            control.addEventListener("change", function() {
                syncSliderControl(contrastControl, control);
                emitChange();
            });
        });

        [previewCheck.input, legacyCheck.input].forEach(function(control) {
            control.addEventListener("change", emitChange);
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

        return component;

        function getOptions() {
            return {
                brightness: getControlValue(brightnessControl.input),
                contrast: getControlValue(contrastControl.input),
                preview: previewCheck.input.checked,
                useLegacy: legacyCheck.input.checked
            };
        }

        function setOptions(nextOptions) {
            var values = nextOptions || {};

            if (values.brightness !== undefined) {
                setSliderControlValue(brightnessControl, values.brightness);
            }
            if (values.contrast !== undefined) {
                setSliderControlValue(contrastControl, values.contrast);
            }
            if (values.preview !== undefined) {
                previewCheck.input.checked = !!values.preview;
            }
            if (values.useLegacy !== undefined) {
                legacyCheck.input.checked = !!values.useLegacy;
            }
            emitChange();
        }

        function emitChange() {
            if (typeof config.onChange === "function") {
                config.onChange(component.getOptions(), component);
            }
        }
    }

    function createSliderControl(id, labelText, value) {
        var row = createElement("label", "brightness-contrast-row");
        var label = createElement("span", "brightness-contrast-label", row);
        var range = document.createElement("input");
        var input = document.createElement("input");

        label.textContent = labelText;
        range.id = id;
        range.type = "range";
        range.min = "-100";
        range.max = "100";
        range.step = "1";
        input.type = "number";
        input.min = "-100";
        input.max = "100";
        input.step = "1";
        input.setAttribute("aria-label", labelText.replace(":", ""));
        row.appendChild(range);
        row.appendChild(input);
        setSliderControlValue({
            range: range,
            input: input
        }, value);

        return {
            row: row,
            range: range,
            input: input
        };
    }

    function syncSliderControl(control, source) {
        setSliderControlValue(control, source.value);
    }

    function setSliderControlValue(control, value) {
        var normalized = normalizePercentValue(value);

        control.range.value = String(normalized);
        control.input.value = String(normalized);
    }

    function createCheckbox(id, labelText, checked) {
        var row = createElement("label", "brightness-contrast-check");
        var input = document.createElement("input");
        var text = createElement("span", "", row);

        input.id = id;
        input.type = "checkbox";
        input.checked = !!checked;
        row.insertBefore(input, text);
        text.textContent = labelText;

        return {
            row: row,
            input: input
        };
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

    function getControlValue(input) {
        return normalizePercentValue(input.value);
    }

    function normalizePercentValue(value) {
        var number = parseInt(value, 10);

        if (isNaN(number)) {
            return 0;
        }

        return Math.max(-100, Math.min(100, number));
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

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.BrightnessContrastDialog = BrightnessContrastDialog;
    global.brightnessContrastDialog = BrightnessContrastDialog;

}(window));
