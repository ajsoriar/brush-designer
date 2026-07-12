import documentPresets from "./presets.json";

(function(global) {

    "use strict";

    var MIN_DOCUMENT_SIZE = 1;
    var MAX_DOCUMENT_SIZE = 8192;
    var DEFAULT_DPI = 72;
    var DEFAULT_UNIT = "mm";
    var UNITS = ["pixels", "inches", "cm", "mm"];

    var DEFAULTS = {
        name: null,
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
        presets: null,
        onOk: null,
        onCancel: null
    };

    var untitledCounter = 0;

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
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

    function NewDocumentDialog2(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var presetsData = config.presets || documentPresets;
        var presets = presetsData.presets || [];
        var maxPixels = Number(presetsData.defaultMaxPixels) || 0;
        var dialog = createElement("div", "new-document-dialog2");
        var main = createElement("div", "ndd2-main", dialog);
        var side = createElement("div", "ndd2-side", dialog);
        var controls = {};
        var state = {
            presetId: null,
            width: sanitizeDocumentSize(config.width, DEFAULTS.width),
            height: sanitizeDocumentSize(config.height, DEFAULTS.height),
            dpi: DEFAULT_DPI,
            widthUnit: DEFAULT_UNIT,
            heightUnit: DEFAULT_UNIT
        };
        var component;

        untitledCounter += 1;

        buildNameRow(main, controls, config.name || ("Untitled-" + untitledCounter));
        buildPresetFieldset(main, controls, presets);
        buildSideColumn(side, controls);

        component = {
            element: dialog,
            getOptions: function() {
                return {
                    name: controls.nameInput.value,
                    width: state.width,
                    height: state.height,
                    dpi: state.dpi,
                    backgroundColor: config.backgroundColor
                };
            },
            destroy: function() {
                destroy(component);
            }
        };

        bindEvents();
        selectInitialPreset();

        return component;

        function bindEvents() {
            controls.categorySelect.addEventListener("change", function() {
                renderPresetRows(getSelectedCategory());
            });

            controls.tableBody.addEventListener("click", function(event) {
                var row = event.target.closest("[data-preset-id]");

                if (row) {
                    applyPreset(row.getAttribute("data-preset-id"));
                }
            });

            controls.widthInput.addEventListener("input", onSizeInput);
            controls.heightInput.addEventListener("input", onSizeInput);
            controls.dpiInput.addEventListener("input", onSizeInput);

            controls.widthUnitInput.addEventListener("input", function() {
                onUnitValueInput("width");
            });
            controls.heightUnitInput.addEventListener("input", function() {
                onUnitValueInput("height");
            });
            controls.widthUnitInput.addEventListener("change", syncUnitValueInputs);
            controls.heightUnitInput.addEventListener("change", syncUnitValueInputs);

            controls.widthUnitSelect.addEventListener("change", function() {
                state.widthUnit = controls.widthUnitSelect.value;
                syncUnitValueInputs();
            });
            controls.heightUnitSelect.addEventListener("change", function() {
                state.heightUnit = controls.heightUnitSelect.value;
                syncUnitValueInputs();
            });

            controls.portraitButton.addEventListener("click", function() {
                applyOrientation("portrait");
            });

            controls.landscapeButton.addEventListener("click", function() {
                applyOrientation("landscape");
            });

            controls.okButton.addEventListener("click", function() {
                if (typeof config.onOk === "function") {
                    config.onOk(component.getOptions(), component);
                }
            });

            controls.cancelButton.addEventListener("click", function() {
                if (typeof config.onCancel === "function") {
                    config.onCancel(component);
                }
            });
        }

        function onSizeInput() {
            state.width = sanitizeDocumentSize(controls.widthInput.value, state.width);
            state.height = sanitizeDocumentSize(controls.heightInput.value, state.height);
            state.dpi = sanitizeDpi(controls.dpiInput.value, state.dpi);
            state.presetId = null;
            syncSelectedRow();
            syncOrientationButtons();
            syncImageSize();
            syncDescription();
            syncUnitValueInputs();
        }

        function onUnitValueInput(dimension) {
            var input = dimension === "width" ? controls.widthUnitInput : controls.heightUnitInput;
            var unit = dimension === "width" ? state.widthUnit : state.heightUnit;
            var unitValue = parseUnitValue(input.value);
            var pixels;

            if (isNaN(unitValue) || unitValue <= 0) {
                return;
            }

            pixels = sanitizeDocumentSize(Math.round(unitToPixels(unitValue, unit, state.dpi)), null);

            if (pixels === null || pixels === state[dimension]) {
                return;
            }

            state[dimension] = pixels;
            state.presetId = null;

            if (dimension === "width") {
                controls.widthInput.value = String(pixels);
            } else {
                controls.heightInput.value = String(pixels);
            }

            syncSelectedRow();
            syncOrientationButtons();
            syncImageSize();
            syncDescription();
        }

        function syncUnitValueInputs() {
            controls.widthUnitInput.value = formatUnitValue(pixelsToUnit(state.width, state.widthUnit, state.dpi));
            controls.heightUnitInput.value = formatUnitValue(pixelsToUnit(state.height, state.heightUnit, state.dpi));
        }

        function getSelectedCategory() {
            return controls.categorySelect.value;
        }

        function getPresetById(presetId) {
            var found = null;

            presets.forEach(function(preset) {
                if (preset.id === presetId) {
                    found = preset;
                }
            });

            return found;
        }

        function selectInitialPreset() {
            var match = null;

            presets.forEach(function(preset) {
                if (!match && preset.width === state.width && preset.height === state.height) {
                    match = preset;
                }
            });

            if (match) {
                controls.categorySelect.value = match.group;
                renderPresetRows(match.group);
                applyPreset(match.id);
                return;
            }

            controls.categorySelect.value = "Custom";
            renderPresetRows("Custom");
            syncInputs();
            syncOrientationButtons();
            syncImageSize();
            syncDescription();
        }

        function applyPreset(presetId) {
            var preset = getPresetById(presetId);

            if (!preset) {
                return;
            }

            state.presetId = preset.id;

            if (preset.width && preset.height) {
                state.width = sanitizeDocumentSize(preset.width, state.width);
                state.height = sanitizeDocumentSize(preset.height, state.height);
            }

            state.dpi = sanitizeDpi(preset.dpi, DEFAULT_DPI);
            syncInputs();
            syncSelectedRow();
            syncOrientationButtons();
            syncImageSize();
            syncDescription();
        }

        function applyOrientation(orientation) {
            var swap;

            if (getCurrentOrientation() === orientation) {
                return;
            }

            swap = state.width;
            state.width = state.height;
            state.height = swap;
            syncInputs();
            syncOrientationButtons();
            syncImageSize();
        }

        function getCurrentOrientation() {
            return state.width > state.height ? "landscape" : "portrait";
        }

        function renderPresetRows(category) {
            var rows = presets.filter(function(preset) {
                return preset.group === category;
            });

            controls.tableBody.innerHTML = "";

            rows.forEach(function(preset) {
                var row = createElement("tr", "ndd2-preset-row", controls.tableBody);

                row.setAttribute("data-preset-id", preset.id);
                createElement("td", "", row).textContent = preset.type || "";
                createElement("td", "", row).textContent = preset.name || "";
                createElement("td", "", row).textContent = preset.width && preset.height ?
                    preset.width + " × " + preset.height :
                    "—";
                createElement("td", "", row).textContent = formatOrientation(preset.orientation);
            });

            syncSelectedRow();
        }

        function syncSelectedRow() {
            var rows = controls.tableBody.querySelectorAll("[data-preset-id]");

            Array.prototype.forEach.call(rows, function(row) {
                row.classList.toggle(
                    "ndd2-preset-row-selected",
                    !!state.presetId && row.getAttribute("data-preset-id") === state.presetId
                );
            });
        }

        function syncInputs() {
            controls.widthInput.value = String(state.width);
            controls.heightInput.value = String(state.height);
            controls.dpiInput.value = String(state.dpi);
            controls.widthUnitSelect.value = state.widthUnit;
            controls.heightUnitSelect.value = state.heightUnit;
            syncUnitValueInputs();
        }

        function syncOrientationButtons() {
            var orientation = getCurrentOrientation();

            controls.portraitButton.classList.toggle("ndd2-orientation-active", orientation === "portrait");
            controls.landscapeButton.classList.toggle("ndd2-orientation-active", orientation === "landscape");
        }

        function syncImageSize() {
            var totalPixels = state.width * state.height;
            var megapixels = totalPixels / 1000000;
            var preset = state.presetId ? getPresetById(state.presetId) : null;
            var caption;

            controls.megapixelsValue.textContent = formatMegapixels(megapixels) + " MP";
            controls.megapixelsValue.classList.toggle(
                "ndd2-megapixels-warning",
                maxPixels > 0 && totalPixels > maxPixels
            );
            controls.megapixelsValue.title = maxPixels > 0 && totalPixels > maxPixels ?
                "Large image: exceeds " + formatMegapixels(maxPixels / 1000000) + " MP" :
                "";
            controls.pixelsValue.textContent = state.width + " x " + state.height + " px";

            if (preset) {
                caption = preset.dpi ? preset.name + " at " + state.dpi + " dpi" : preset.name;
            } else {
                caption = "Custom";
            }

            controls.captionValue.textContent = caption;
        }

        function syncDescription() {
            var preset = state.presetId ? getPresetById(state.presetId) : getPresetById("custom");

            controls.descriptionText.textContent = preset && preset.description ? preset.description : "";
        }
    }

    function buildNameRow(parent, controls, name) {
        var row = createElement("div", "ndd2-name-row", parent);
        var label = createElement("label", "ndd2-name-label", row);
        var input = createElement("input", "ndd2-name-input", row);

        label.textContent = "Name:";
        label.setAttribute("for", "ndd2-name");
        input.id = "ndd2-name";
        input.type = "text";
        input.value = name;
        controls.nameInput = input;
    }

    function buildPresetFieldset(parent, controls, presets) {
        var fieldset = createElement("fieldset", "ndd2-preset", parent);
        var legend = createElement("legend", "", fieldset);
        var categoryRow = createElement("div", "ndd2-category-row", fieldset);
        var categoryLabel = createElement("label", "ndd2-category-label", categoryRow);
        var categorySelect = createElement("select", "ndd2-category-select", categoryRow);
        var tableWrap = createElement("div", "ndd2-table-wrap", fieldset);
        var table = createElement("table", "ndd2-table", tableWrap);
        var tableHead = createElement("thead", "", table);
        var headRow = createElement("tr", "", tableHead);
        var tableBody = createElement("tbody", "", table);
        var fields = createElement("div", "ndd2-fields", fieldset);
        var info = createElement("div", "ndd2-info", fieldset);
        var infoIcon = createElement("span", "ndd2-info-icon", info);
        var infoText = createElement("span", "ndd2-info-text", info);

        legend.textContent = "Preset";
        categoryLabel.textContent = "Category:";
        categoryLabel.setAttribute("for", "ndd2-category");
        categorySelect.id = "ndd2-category";

        getCategories(presets).forEach(function(category) {
            var option = createElement("option", "", categorySelect);

            option.value = category;
            option.textContent = category;
        });

        ["Subcategory", "Preset", "Resolution", "Orientation"].forEach(function(text) {
            createElement("th", "", headRow).textContent = text;
        });

        controls.categorySelect = categorySelect;
        controls.tableBody = tableBody;

        buildDimensionField(fields, "ndd2-width", "Width:", controls, "width");
        buildDimensionField(fields, "ndd2-height", "Height:", controls, "height");
        controls.dpiInput = buildNumberField(fields, "ndd2-dpi", "Resolution:", "dpi", 1, 1200);
        buildOrientationRow(fields, controls);

        infoIcon.textContent = "ⓘ";
        infoText.textContent = "";
        controls.descriptionText = infoText;
    }

    function buildNumberField(parent, id, labelText, unitText, min, max) {
        var row = createElement("div", "ndd2-field-row", parent);
        var label = createElement("label", "ndd2-field-label", row);
        var input = createElement("input", "ndd2-field-input", row);
        var unit = createElement("span", "ndd2-field-unit", row);

        label.textContent = labelText;
        label.setAttribute("for", id);
        input.id = id;
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = "1";
        unit.textContent = unitText;

        return input;
    }

    function buildDimensionField(parent, id, labelText, controls, dimension) {
        var row = createElement("div", "ndd2-field-row ndd2-field-row-dimension", parent);
        var label = createElement("label", "ndd2-field-label", row);
        var input = createElement("input", "ndd2-field-input", row);
        var unit = createElement("span", "ndd2-field-unit", row);
        var unitInput = createElement("input", "ndd2-unit-input", row);
        var unitSelect = createElement("select", "ndd2-unit-select", row);

        label.textContent = labelText;
        label.setAttribute("for", id);
        input.id = id;
        input.type = "number";
        input.min = String(MIN_DOCUMENT_SIZE);
        input.max = String(MAX_DOCUMENT_SIZE);
        input.step = "1";
        unit.textContent = "pixels";

        unitInput.id = id + "-unit-value";
        unitInput.type = "text";
        unitInput.setAttribute("inputmode", "decimal");

        UNITS.forEach(function(unitName) {
            var option = createElement("option", "", unitSelect);

            option.value = unitName;
            option.textContent = unitName;
        });
        unitSelect.value = DEFAULT_UNIT;

        if (dimension === "width") {
            controls.widthInput = input;
            controls.widthUnitInput = unitInput;
            controls.widthUnitSelect = unitSelect;
        } else {
            controls.heightInput = input;
            controls.heightUnitInput = unitInput;
            controls.heightUnitSelect = unitSelect;
        }
    }

    function buildOrientationRow(parent, controls) {
        var row = createElement("div", "ndd2-field-row", parent);
        var label = createElement("span", "ndd2-field-label", row);
        var group = createElement("div", "ndd2-orientation-group", row);
        var portrait = createElement("button", "ndd2-orientation-btn ndd2-orientation-portrait", group);
        var landscape = createElement("button", "ndd2-orientation-btn ndd2-orientation-landscape", group);

        label.textContent = "Orientation:";
        portrait.type = "button";
        portrait.title = "Portrait";
        landscape.type = "button";
        landscape.title = "Landscape";

        controls.portraitButton = portrait;
        controls.landscapeButton = landscape;
    }

    function buildSideColumn(parent, controls) {
        var okButton = createElement("button", "ndd2-ok", parent);
        var cancelButton = createElement("button", "ndd2-cancel", parent);
        var imageSize = createElement("div", "ndd2-image-size", parent);
        var title = createElement("div", "ndd2-image-size-title", imageSize);
        var megapixels = createElement("div", "ndd2-megapixels", imageSize);
        var pixels = createElement("div", "ndd2-pixels", imageSize);
        var caption = createElement("div", "ndd2-caption", imageSize);

        okButton.type = "button";
        okButton.textContent = "OK";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        title.textContent = "Image Size";

        controls.okButton = okButton;
        controls.cancelButton = cancelButton;
        controls.megapixelsValue = megapixels;
        controls.pixelsValue = pixels;
        controls.captionValue = caption;
    }

    function getCategories(presets) {
        var categories = [];

        presets.forEach(function(preset) {
            if (categories.indexOf(preset.group) === -1) {
                categories.push(preset.group);
            }
        });

        return categories;
    }

    function formatOrientation(orientation) {
        if (orientation === "portrait") {
            return "Portrait";
        }

        if (orientation === "landscape") {
            return "Landscape";
        }

        return "—";
    }

    function pixelsToUnit(pixels, unit, dpi) {
        var safeDpi = dpi > 0 ? dpi : DEFAULT_DPI;

        if (unit === "inches") {
            return pixels / safeDpi;
        }

        if (unit === "cm") {
            return (pixels / safeDpi) * 2.54;
        }

        if (unit === "mm") {
            return (pixels / safeDpi) * 25.4;
        }

        return pixels;
    }

    function unitToPixels(value, unit, dpi) {
        var safeDpi = dpi > 0 ? dpi : DEFAULT_DPI;

        if (unit === "inches") {
            return value * safeDpi;
        }

        if (unit === "cm") {
            return (value / 2.54) * safeDpi;
        }

        if (unit === "mm") {
            return (value / 25.4) * safeDpi;
        }

        return value;
    }

    function formatUnitValue(value) {
        return Number(value.toFixed(2)).toLocaleString(undefined, {
            maximumFractionDigits: 2,
            useGrouping: false
        });
    }

    function parseUnitValue(value) {
        return parseFloat(String(value).replace(",", "."));
    }

    function formatMegapixels(megapixels) {
        if (megapixels >= 10) {
            return String(Math.round(megapixels * 10) / 10);
        }

        return String(Math.round(megapixels * 100) / 100);
    }

    function sanitizeDocumentSize(value, fallback) {
        var size = parseInt(value, 10);

        if (isNaN(size)) {
            return fallback;
        }

        return Math.max(MIN_DOCUMENT_SIZE, Math.min(size, MAX_DOCUMENT_SIZE));
    }

    function sanitizeDpi(value, fallback) {
        var dpi = parseInt(value, 10);

        if (isNaN(dpi)) {
            return fallback;
        }

        return Math.max(1, Math.min(dpi, 1200));
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.NewDocumentDialog2 = NewDocumentDialog2;
    global.newDocumentDialog2 = NewDocumentDialog2;

}(window));
