import linePresets from "./linePresets.json";

(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 310,
        height: 469,
        current: {
            weight: 1,
            unit: "px",
            cap: "butt",
            corner: "miter",
            limit: 10,
            antialiasing: false,
            dashed: false,
            dashes: [12, 8, 12, 8, 12, 8],
            arrowStart: "none",
            arrowEnd: "none",
            startScale: 100,
            endScale: 100,
            arrowLinked: false,
            color: null
        },
        onChange: null,
        onGenerate: null
    };

    var CAP_OPTIONS = [
        { value: "butt", title: "Butt cap" },
        { value: "round", title: "Round cap" },
        { value: "square", title: "Square cap" }
    ];
    var CORNER_OPTIONS = [
        { value: "miter", title: "Miter corner" },
        { value: "round", title: "Round corner" },
        { value: "bevel", title: "Bevel corner" }
    ];
    var ARROW_OPTIONS = [
        { value: "none", label: "None" },
        { value: "triangle", label: "Triangle" },
        { value: "bar", label: "Bar" },
        { value: "circle", label: "Circle" }
    ];

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function LinesDesigner(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var componentId = config.id || ("lines-designer-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var controls = {};
        var component;

        config.current = normalizeCurrent(extend(extend({}, DEFAULTS.current), config.current || {}));

        element.id = componentId;
        element.className = "lines-designer";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";

        element.appendChild(createAntialiasingRow(componentId, controls));
        controls.preview = createPreview();
        element.appendChild(controls.preview.wrap);

        element.appendChild(createWeightRow(componentId, controls));
        element.appendChild(createButtonGroupRow("Cap:", CAP_OPTIONS, "cap", controls));
        element.appendChild(createCornerRow(componentId, controls));
        element.appendChild(createRule());
        element.appendChild(createDashSection(componentId, controls));
        element.appendChild(createArrowSection(componentId, controls));
        element.appendChild(createRule());
        element.appendChild(createPresetSection(componentId, controls));

        container.appendChild(element);

        component = {
            id: componentId,
            element: element,
            options: config,
            controls: controls,
            current: config.current,
            getWidth: function() {
                return config.width;
            },
            getHeight: function() {
                return config.height;
            },
            getLine: function() {
                return extend({}, component.current);
            },
            setLine: function(nextCurrent) {
                setCurrent(component, nextCurrent, config);
            },
            destroy: function() {
                destroy(component);
            }
        };

        bindControls(component, controls, config);
        renderPresets(component, controls);
        syncControls(component, controls);
        renderPreview(component);

        return component;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "lines-designer-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("LinesDesigner container not found: " + containerId);
        }

        return container;
    }

    function createPreview() {
        var wrap = document.createElement("div");
        var svg = createSvg("svg");
        var path = createSvg("path");
        var start = createSvg("path");
        var end = createSvg("path");

        wrap.className = "lines-designer-preview";
        svg.setAttribute("viewBox", "0 0 280 64");
        path.setAttribute("d", "M38 32 L242 32");
        path.classList.add("lines-designer-preview-line");
        start.classList.add("lines-designer-preview-arrow");
        end.classList.add("lines-designer-preview-arrow");

        svg.appendChild(path);
        svg.appendChild(start);
        svg.appendChild(end);
        wrap.appendChild(svg);

        return {
            wrap: wrap,
            svg: svg,
            path: path,
            start: start,
            end: end
        };
    }

    function createAntialiasingRow(componentId, controls) {
        var row = document.createElement("label");
        var checkbox = document.createElement("input");

        row.className = "lines-designer-check lines-designer-antialiasing";
        checkbox.id = componentId + "-antialiasing";
        checkbox.type = "checkbox";
        controls.antialiasing = checkbox;

        row.appendChild(checkbox);
        row.appendChild(document.createTextNode("Antialiasing"));
        return row;
    }

    function createWeightRow(componentId, controls) {
        var row = document.createElement("div");
        var label = createLabel(componentId + "-weight", "Weight:");
        var spinner = document.createElement("input");
        var unit = document.createElement("select");
        var pt = document.createElement("option");
        var px = document.createElement("option");

        row.className = "lines-designer-row lines-designer-weight-row";
        spinner.id = componentId + "-weight";
        spinner.type = "number";
        spinner.min = "1";
        spinner.max = "200";
        spinner.step = "1";
        spinner.className = "lines-designer-number lines-designer-weight";

        pt.value = "pt";
        pt.textContent = "pt";
        px.value = "px";
        px.textContent = "px";
        unit.className = "lines-designer-select lines-designer-unit";
        unit.appendChild(pt);
        unit.appendChild(px);

        controls.weight = spinner;
        controls.unit = unit;

        row.appendChild(label);
        row.appendChild(spinner);
        row.appendChild(unit);
        return row;
    }

    function createButtonGroupRow(labelText, options, key, controls) {
        var row = document.createElement("div");
        var label = document.createElement("span");
        var group = document.createElement("div");

        row.className = "lines-designer-row";
        label.className = "lines-designer-label";
        label.textContent = labelText;
        group.className = "lines-designer-button-group";
        controls[key] = [];

        options.forEach(function(option) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "lines-designer-icon-button";
            button.title = option.title;
            button.setAttribute("data-value", option.value);
            button.appendChild(createIcon(key, option.value));
            controls[key].push(button);
            group.appendChild(button);
        });

        row.appendChild(label);
        row.appendChild(group);
        return row;
    }

    function createCornerRow(componentId, controls) {
        var row = createButtonGroupRow("Corner:", CORNER_OPTIONS, "corner", controls);
        var spacer = document.createElement("span");
        var label = createLabel(componentId + "-limit", "Limit:");
        var limit = document.createElement("input");
        var unit = document.createElement("span");

        spacer.className = "lines-designer-row-spacer";
        limit.id = componentId + "-limit";
        limit.type = "number";
        limit.min = "1";
        limit.max = "50";
        limit.step = "1";
        limit.className = "lines-designer-number lines-designer-limit";
        unit.className = "lines-designer-muted";
        unit.textContent = "x";
        controls.limit = limit;

        row.appendChild(spacer);
        row.appendChild(label);
        row.appendChild(limit);
        row.appendChild(unit);
        return row;
    }

    function createDashSection(componentId, controls) {
        var section = document.createElement("div");
        var label = document.createElement("label");
        var checkbox = document.createElement("input");
        var dashGrid = document.createElement("div");
        var i;

        section.className = "lines-designer-dash-section";
        label.className = "lines-designer-check";
        checkbox.id = componentId + "-dashed";
        checkbox.type = "checkbox";
        controls.dashed = checkbox;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("Dashed Line"));
        section.appendChild(label);

        dashGrid.className = "lines-designer-dash-grid";
        controls.dashes = [];

        for (i = 0; i < 6; i++) {
            dashGrid.appendChild(createDashInput(componentId, i, controls));
        }

        section.appendChild(dashGrid);
        return section;
    }

    function createDashInput(componentId, index, controls) {
        var field = document.createElement("label");
        var input = document.createElement("input");
        var text = document.createElement("span");

        field.className = "lines-designer-dash-field";
        input.id = componentId + "-dash-" + index;
        input.type = "number";
        input.min = "0";
        input.max = "99";
        input.step = "1";
        input.className = "lines-designer-dash-input";
        text.textContent = index % 2 === 0 ? "dash" : "gap";

        controls.dashes.push(input);
        field.appendChild(input);
        field.appendChild(text);
        return field;
    }

    function createArrowSection(componentId, controls) {
        var section = document.createElement("div");
        var row = document.createElement("div");
        var label = document.createElement("span");
        var swap = document.createElement("button");
        var scaleRow = document.createElement("div");
        var alignRow = document.createElement("div");

        section.className = "lines-designer-arrow-section";
        row.className = "lines-designer-arrow-row";
        label.className = "lines-designer-label";
        label.textContent = "Arrowheads:";
        controls.arrowStart = createArrowSelect(componentId + "-arrow-start");
        controls.arrowEnd = createArrowSelect(componentId + "-arrow-end");
        swap.type = "button";
        swap.className = "lines-designer-swap";
        swap.title = "Swap arrowheads";
        swap.textContent = "<>";
        controls.swap = swap;

        row.appendChild(label);
        row.appendChild(controls.arrowStart);
        row.appendChild(controls.arrowEnd);
        row.appendChild(swap);

        scaleRow.className = "lines-designer-scale-row";
        scaleRow.appendChild(createGhostLabel("Scale:"));
        controls.startScale = createScaleInput(componentId + "-start-scale");
        controls.endScale = createScaleInput(componentId + "-end-scale");
        controls.arrowLinked = document.createElement("button");
        controls.arrowLinked.type = "button";
        controls.arrowLinked.className = "lines-designer-link";
        controls.arrowLinked.title = "Link arrowhead scales";
        controls.arrowLinked.textContent = "link";
        scaleRow.appendChild(controls.startScale);
        scaleRow.appendChild(createPercent());
        scaleRow.appendChild(controls.endScale);
        scaleRow.appendChild(createPercent());
        scaleRow.appendChild(controls.arrowLinked);

        alignRow.className = "lines-designer-align-arrow-row";
        alignRow.appendChild(createGhostLabel("Align:"));
        alignRow.appendChild(createGhostButton("->"));
        alignRow.appendChild(createGhostButton("->|"));

        section.appendChild(row);
        section.appendChild(scaleRow);
        section.appendChild(alignRow);
        return section;
    }

    function createPresetSection(componentId, controls) {
        var section = document.createElement("div");
        var select = document.createElement("select");
        var grid = document.createElement("div");

        section.className = "lines-designer-preset-section";
        select.id = componentId + "-preset-category";
        select.className = "lines-designer-select lines-designer-preset-category";
        linePresets.categories.forEach(function(category) {
            var option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.label;
            select.appendChild(option);
        });

        grid.className = "lines-designer-preset-grid";
        grid.style.gridTemplateColumns = repeatGridTrack(linePresets.columns, linePresets.cellSize);
        grid.style.gap = linePresets.gap + "px";
        grid.style.padding = linePresets.padding + "px";

        controls.presetCategory = select;
        controls.presetGrid = grid;
        controls.presetButtons = [];

        section.appendChild(select);
        section.appendChild(grid);
        return section;
    }

    function createArrowSelect(id) {
        var select = document.createElement("select");

        select.id = id;
        select.className = "lines-designer-select lines-designer-arrow-select";
        ARROW_OPTIONS.forEach(function(option) {
            var item = document.createElement("option");

            item.value = option.value;
            item.textContent = option.label;
            select.appendChild(item);
        });

        return select;
    }

    function createScaleInput(id) {
        var input = document.createElement("input");

        input.id = id;
        input.type = "number";
        input.min = "10";
        input.max = "300";
        input.step = "5";
        input.className = "lines-designer-number lines-designer-scale";
        return input;
    }

    function createGhostLabel(text) {
        var label = document.createElement("span");

        label.className = "lines-designer-ghost-label";
        label.textContent = text;
        return label;
    }

    function createGhostButton(text) {
        var button = document.createElement("button");

        button.type = "button";
        button.className = "lines-designer-ghost-button";
        button.disabled = true;
        button.textContent = text;
        return button;
    }

    function createPercent() {
        var unit = document.createElement("span");

        unit.className = "lines-designer-muted";
        unit.textContent = "%";
        return unit;
    }

    function createRule() {
        var rule = document.createElement("div");

        rule.className = "lines-designer-rule";
        return rule;
    }

    function createLabel(forId, text) {
        var label = document.createElement("label");

        label.className = "lines-designer-label";
        label.setAttribute("for", forId);
        label.textContent = text;
        return label;
    }

    function createSvg(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    function createIcon(key, value) {
        var svg = createSvg("svg");
        var line = createSvg("path");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.classList.add("lines-designer-icon");
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("fill", "none");

        if (key === "cap") {
            line.setAttribute("d", value === "round" ? "M5 12h14" : "M6 12h12");
            line.setAttribute("stroke-linecap", value);
        } else {
            line.setAttribute("d", "M6 18V7h12");
            line.setAttribute("stroke-linejoin", value);
            line.setAttribute("stroke-linecap", "square");
        }

        svg.appendChild(line);
        return svg;
    }

    function bindControls(component, controls, config) {
        var bind = function(input) {
            input.addEventListener("input", function() {
                readControls(component, controls, config);
            });
            input.addEventListener("change", function() {
                readControls(component, controls, config);
            });
        };

        bind(controls.weight);
        bind(controls.unit);
        bind(controls.limit);
        bind(controls.antialiasing);
        bind(controls.dashed);
        bind(controls.arrowStart);
        bind(controls.arrowEnd);
        bind(controls.startScale);
        bind(controls.endScale);

        controls.dashes.forEach(bind);
        bindButtonGroup(component, controls, config, "cap");
        bindButtonGroup(component, controls, config, "corner");

        controls.swap.addEventListener("click", function() {
            var next = extend({}, component.current);
            var arrowStart = next.arrowStart;

            next.arrowStart = next.arrowEnd;
            next.arrowEnd = arrowStart;
            setCurrent(component, next, config);
        });

        controls.arrowLinked.addEventListener("click", function() {
            setCurrent(component, { arrowLinked: !component.current.arrowLinked }, config);
        });

        controls.presetCategory.addEventListener("change", function() {
            renderPresets(component, controls);
            syncControls(component, controls);
        });
    }

    function bindButtonGroup(component, controls, config, key) {
        controls[key].forEach(function(button) {
            button.addEventListener("click", function() {
                var next = {};

                next[key] = button.getAttribute("data-value");
                setCurrent(component, next, config);
            });
        });
    }

    function readControls(component, controls, config) {
        component.activePresetId = null;

        var next = {
            weight: controls.weight.value,
            unit: controls.unit.value,
            limit: controls.limit.value,
            antialiasing: controls.antialiasing.checked,
            dashed: controls.dashed.checked,
            dashes: controls.dashes.map(function(input) {
                return input.value;
            }),
            arrowStart: controls.arrowStart.value,
            arrowEnd: controls.arrowEnd.value,
            startScale: controls.startScale.value,
            endScale: controls.arrowLinked.classList.contains("lines-designer-link-active") ? controls.startScale.value : controls.endScale.value,
            arrowLinked: controls.arrowLinked.classList.contains("lines-designer-link-active"),
            color: component.current.color
        };

        setCurrent(component, next, config);
    }

    function setCurrent(component, nextCurrent, config) {
        component.current = normalizeCurrent(extend(extend({}, component.current), nextCurrent || {}));
        syncControls(component, component.controls);
        renderPreview(component);

        if (global.App && global.App.memory) {
            global.App.memory.currentLineDesign = component.getLine();
        }

        if (component.current.color && global.AppOpenWindows && typeof global.AppOpenWindows.setActiveColor === "function") {
            global.AppOpenWindows.setActiveColor(component.current.color);
        }

        if (typeof config.onChange === "function") {
            config.onChange(component.current, component);
        }
    }

    function syncControls(component, controls) {
        var current = component.current;

        controls.weight.value = current.weight;
        controls.unit.value = current.unit;
        controls.limit.value = current.limit;
        controls.antialiasing.checked = current.antialiasing;
        controls.dashed.checked = current.dashed;
        controls.arrowStart.value = current.arrowStart;
        controls.arrowEnd.value = current.arrowEnd;
        controls.startScale.value = current.startScale;
        controls.endScale.value = current.endScale;
        controls.arrowLinked.className = current.arrowLinked ? "lines-designer-link lines-designer-link-active" : "lines-designer-link";

        controls.dashes.forEach(function(input, index) {
            input.value = current.dashes[index];
            input.disabled = !current.dashed;
        });

        syncButtonGroup(controls.cap, current.cap);
        syncButtonGroup(controls.corner, current.corner);
        syncPresetButtons(component, controls);
    }

    function syncButtonGroup(buttons, value) {
        buttons.forEach(function(button) {
            if (button.getAttribute("data-value") === value) {
                button.className = "lines-designer-icon-button lines-designer-icon-button-active";
            } else {
                button.className = "lines-designer-icon-button";
            }
        });
    }

    function renderPreview(component) {
        var current = component.current;
        var weight = Math.max(1, getWeightInPixels(current));
        var dash = current.dashed ? current.dashes.join(" ") : "";
        var color = getPreviewColor(current);

        component.controls.preview.path.setAttribute("stroke-width", weight);
        component.controls.preview.path.setAttribute("stroke-linecap", current.cap);
        component.controls.preview.path.setAttribute("stroke-linejoin", current.corner);
        component.controls.preview.path.setAttribute("stroke-miterlimit", current.limit);
        component.controls.preview.path.setAttribute("stroke-dasharray", dash);
        component.controls.preview.path.setAttribute("stroke", color);
        component.controls.preview.start.setAttribute("fill", color);
        component.controls.preview.start.setAttribute("stroke", color);
        component.controls.preview.end.setAttribute("fill", color);
        component.controls.preview.end.setAttribute("stroke", color);
        component.controls.preview.svg.style.shapeRendering = current.antialiasing ? "auto" : "crispEdges";
        component.controls.preview.start.setAttribute("d", getArrowPath(current.arrowStart, 38, 32, -1, current.startScale));
        component.controls.preview.end.setAttribute("d", getArrowPath(current.arrowEnd, 242, 32, 1, current.endScale));
    }

    function renderPresets(component, controls) {
        var category = getPresetCategory(controls.presetCategory.value) || linePresets.categories[0];

        controls.presetGrid.innerHTML = "";
        controls.presetButtons = [];

        category.presets.forEach(function(preset) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "lines-designer-preset-item";
            button.title = preset.label;
            button.style.width = linePresets.cellSize + "px";
            button.style.height = linePresets.cellSize + "px";
            button.setAttribute("data-preset-id", preset.id);
            button.appendChild(createPresetPreview(preset));
            button.addEventListener("click", function() {
                var next = extend({}, preset.line);

                component.activePresetId = preset.id;
                if (!next.color) {
                    next.color = null;
                }

                setCurrent(component, next, component.options);
            });

            controls.presetButtons.push(button);
            controls.presetGrid.appendChild(button);
        });
    }

    function createPresetPreview(preset) {
        var current = normalizeCurrent(extend(extend({}, DEFAULTS.current), preset.line || {}));
        var svg = createSvg("svg");
        var line = createSvg("path");
        var start = createSvg("path");
        var end = createSvg("path");
        var color = getPreviewColor(current);

        svg.setAttribute("viewBox", "0 0 32 32");
        svg.classList.add("lines-designer-preset-preview");
        line.setAttribute("d", "M6 16 L26 16");
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", Math.max(1, Math.min(getWeightInPixels(current), 10)));
        line.setAttribute("stroke-linecap", current.cap);
        line.setAttribute("stroke-linejoin", current.corner);
        line.setAttribute("stroke-dasharray", current.dashed ? current.dashes.join(" ") : "");
        start.setAttribute("d", getArrowPath(current.arrowStart, 6, 16, -1, Math.min(current.startScale, 140)));
        start.setAttribute("fill", color);
        start.setAttribute("stroke", color);
        start.setAttribute("stroke-width", "1.5");
        end.setAttribute("d", getArrowPath(current.arrowEnd, 26, 16, 1, Math.min(current.endScale, 140)));
        end.setAttribute("fill", color);
        end.setAttribute("stroke", color);
        end.setAttribute("stroke-width", "1.5");

        svg.appendChild(line);
        svg.appendChild(start);
        svg.appendChild(end);
        return svg;
    }

    function syncPresetButtons(component, controls) {
        controls.presetButtons.forEach(function(button) {
            if (button.getAttribute("data-preset-id") === component.activePresetId) {
                button.className = "lines-designer-preset-item lines-designer-preset-item-active";
            } else {
                button.className = "lines-designer-preset-item";
            }
        });
    }

    function getPresetCategory(categoryId) {
        var i;

        for (i = 0; i < linePresets.categories.length; i++) {
            if (linePresets.categories[i].id === categoryId) {
                return linePresets.categories[i];
            }
        }

        return null;
    }

    function getWeightInPixels(current) {
        return current.unit === "pt" ? current.weight * (96 / 72) : current.weight;
    }

    function getPreviewColor(current) {
        return current.color || (global.App && global.App.memory && global.App.memory.currentColor) || "#111111";
    }

    function getArrowPath(type, x, y, direction, scale) {
        var size = 8 * (scale / 100);
        var back = x - (direction * size);

        if (type === "triangle") {
            return "M" + x + " " + y + " L" + back + " " + (y - size) + " L" + back + " " + (y + size) + " Z";
        }

        if (type === "bar") {
            return "M" + x + " " + (y - size) + " L" + x + " " + (y + size);
        }

        if (type === "circle") {
            return "M" + x + " " + y + " m-" + size + ",0 a" + size + "," + size + " 0 1,0 " + (size * 2) + ",0 a" + size + "," + size + " 0 1,0 -" + (size * 2) + ",0";
        }

        return "";
    }

    function normalizeCurrent(current) {
        return {
            weight: Math.round(clamp(parseFloat(current.weight), 1, 200, DEFAULTS.current.weight)),
            unit: current.unit === "px" ? "px" : "pt",
            cap: normalizeOption(current.cap, CAP_OPTIONS, DEFAULTS.current.cap),
            corner: normalizeOption(current.corner, CORNER_OPTIONS, DEFAULTS.current.corner),
            limit: Math.round(clamp(parseFloat(current.limit), 1, 50, DEFAULTS.current.limit)),
            antialiasing: typeof current.antialiasing === "boolean" ? current.antialiasing : DEFAULTS.current.antialiasing,
            dashed: !!current.dashed,
            dashes: normalizeDashes(current.dashes),
            arrowStart: normalizeArrow(current.arrowStart),
            arrowEnd: normalizeArrow(current.arrowEnd),
            startScale: Math.round(clamp(parseFloat(current.startScale), 10, 300, DEFAULTS.current.startScale)),
            endScale: Math.round(clamp(parseFloat(current.endScale), 10, 300, DEFAULTS.current.endScale)),
            arrowLinked: !!current.arrowLinked,
            color: normalizeColor(current.color)
        };
    }

    function normalizeDashes(values) {
        var source = Array.isArray(values) ? values : DEFAULTS.current.dashes;
        var dashes = [];
        var i;

        for (i = 0; i < 6; i++) {
            dashes.push(Math.round(clamp(parseFloat(source[i]), 0, 99, DEFAULTS.current.dashes[i])));
        }

        return dashes;
    }

    function normalizeOption(value, options, fallback) {
        var found = options.some(function(option) {
            return option.value === value;
        });

        return found ? value : fallback;
    }

    function normalizeArrow(value) {
        return normalizeOption(value, ARROW_OPTIONS, DEFAULTS.current.arrowStart);
    }

    function clamp(value, min, max, fallback) {
        if (isNaN(value)) {
            return fallback;
        }

        return Math.max(min, Math.min(value, max));
    }

    function normalizeColor(value) {
        if (typeof value !== "string") {
            return null;
        }

        return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
    }

    function repeatGridTrack(count, size) {
        var tracks = [];
        var i;

        for (i = 0; i < count; i++) {
            tracks.push(size + "px");
        }

        return tracks.join(" ");
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.LinesDesigner = LinesDesigner;
    global.linesDesigner = LinesDesigner;

}(window));
