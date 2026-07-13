(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 441,
        height: 602,
        drawingWidth: 760,
        drawingHeight: 520,
        onChange: null
    };

    var DEFAULT_PARAMS = {
        type: "lansey",
        preset: "rose",
        freqX: 1.01,
        freqY: 1,
        twistFreq: 2.06,
        ampX: 116,
        ampY: 132,
        twistAmp: 42,
        damping: 44,
        twistDamping: 22,
        phase: 28,
        twistPhase: 6,
        detail: 4200,
        lineWidth: 1,
        inkColor: "#1d1d1d"
    };

    var TYPES = {
        simple: "Simple",
        lansey: "Pendulum",
        rotary: "Rotary",
        three: "3-Pend",
        four: "4-Pend",
        polar: "Polar"
    };

    var PRESETS = {
        rose: {
            label: "Rose",
            freqX: 1.01,
            freqY: 1,
            twistFreq: 2.06,
            ampX: 116,
            ampY: 132,
            twistAmp: 42,
            damping: 44,
            twistDamping: 22,
            phase: 28,
            twistPhase: 6
        },
        orbit: {
            label: "Orbit",
            freqX: 1.005,
            freqY: 1,
            twistFreq: 1.62,
            ampX: 145,
            ampY: 118,
            twistAmp: 24,
            damping: 34,
            twistDamping: 18,
            phase: 72,
            twistPhase: 42
        },
        basket: {
            label: "Basket",
            freqX: 1.08,
            freqY: 1,
            twistFreq: 2.2,
            ampX: 106,
            ampY: 128,
            twistAmp: 56,
            damping: 50,
            twistDamping: 31,
            phase: 14,
            twistPhase: 94
        },
        quiet: {
            label: "Quiet",
            freqX: 0.985,
            freqY: 1,
            twistFreq: 1,
            ampX: 134,
            ampY: 94,
            twistAmp: 18,
            damping: 39,
            twistDamping: 14,
            phase: 118,
            twistPhase: 8
        }
    };

    var TRANSFER_TOOLS = [
        {
            id: "brush",
            label: "Brush Transfer",
            icon: "B"
        },
        {
            id: "selection",
            label: "Area Selection",
            icon: "S"
        },
        {
            id: "stamp",
            label: "Stamp Transfer",
            icon: "T"
        },
        {
            id: "path",
            label: "Path Transfer",
            icon: "P"
        },
        {
            id: "fill",
            label: "Fill Transfer",
            icon: "F"
        },
        {
            id: "clipboard",
            label: "Copy to Board",
            icon: "C"
        }
    ];

    function Harmonograph(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = createElement("div", "harmonograph");
        var componentId = config.id || ("harmonograph-" + Date.now());
        var component;

        element.id = componentId;
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";

        component = {
            id: componentId,
            element: element,
            config: config,
            params: normalizeParams(extend({}, DEFAULT_PARAMS)),
            controls: {},
            destroy: function() {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            },
            getParams: function() {
                return extend({}, component.params);
            },
            setParams: function(nextParams) {
                setParams(component, nextParams || {});
            },
            getImageDataUrl: function() {
                return renderCleanDrawing(component).toDataURL("image/png");
            },
            getDrawingCanvas: function() {
                return renderCleanDrawing(component);
            }
        };

        render(component);
        container.appendChild(element);
        update(component, true);

        return component;
    }

    function render(component) {
        var tools = createElement("div", "harmonograph-tools", component.element);
        var stage = createElement("div", "harmonograph-stage", component.element);
        var canvas = createElement("canvas", "harmonograph-preview", stage);
        var controls = createElement("div", "harmonograph-controls", component.element);
        var typeRow = createElement("div", "harmonograph-type-row", controls);
        var presetRow = createElement("div", "harmonograph-preset-row", controls);
        var presetLabel = createElement("label", "harmonograph-select-label", presetRow);
        var presetText = createElement("span", "harmonograph-select-text", presetLabel);
        var presetSelect = createElement("select", "harmonograph-select", presetLabel);
        var randomButton = createElement("button", "harmonograph-button", presetRow);
        var resetButton = createElement("button", "harmonograph-button", presetRow);
        var grid = createElement("div", "harmonograph-control-grid", controls);

        canvas.width = component.config.drawingWidth;
        canvas.height = component.config.drawingHeight;

        component.activeTransferTool = TRANSFER_TOOLS[0].id;
        component.controls.transferTools = createTransferToolButtons(tools);
        component.controls.typeButtons = createTypeButtons(typeRow);
        presetText.textContent = "Preset";
        buildPresetOptions(presetSelect);

        randomButton.type = "button";
        randomButton.textContent = "Random";
        resetButton.type = "button";
        resetButton.textContent = "Reset";

        component.stage = stage;
        component.canvas = canvas;
        component.context = canvas.getContext("2d");
        component.controls.preset = presetSelect;
        component.controls.freqX = createRangeControl(grid, "X ratio", 0.92, 1.12, 0.001);
        component.controls.ampX = createRangeControl(grid, "X amp", 30, 170, 1);
        component.controls.ampY = createRangeControl(grid, "Y amp", 30, 170, 1);
        component.controls.twistFreq = createRangeControl(grid, "Twist freq", 0.6, 2.8, 0.01);
        component.controls.twistAmp = createRangeControl(grid, "Twist amp", 0, 80, 1);
        component.controls.damping = createRangeControl(grid, "Damping", 5, 80, 1);
        component.controls.phase = createRangeControl(grid, "Phase", 0, 180, 1);
        component.controls.lineWidth = createRangeControl(grid, "Line", 1, 5, 0.5);
        component.controls.inkColor = createColorControl(grid, "Ink");

        bindControlEvents(component, randomButton, resetButton);
    }

    function buildPresetOptions(select) {
        var customOption = document.createElement("option");

        customOption.value = "custom";
        customOption.textContent = "Custom";
        select.appendChild(customOption);

        Object.keys(PRESETS).forEach(function(key) {
            var option = document.createElement("option");

            option.value = key;
            option.textContent = PRESETS[key].label;
            select.appendChild(option);
        });
    }

    function createTransferToolButtons(parent) {
        var buttons = {};

        TRANSFER_TOOLS.forEach(function(tool, index) {
            var button = createElement("button", "harmonograph-tool-button", parent);
            var icon = createElement("span", "harmonograph-tool-icon", button);

            button.type = "button";
            button.title = tool.label;
            button.setAttribute("aria-label", tool.label);
            button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
            button.setAttribute("data-harmonograph-transfer-tool", tool.id);
            icon.textContent = tool.icon;
            buttons[tool.id] = button;
        });

        return {
            row: parent,
            buttons: buttons
        };
    }

    function createTypeButtons(parent) {
        var buttons = {};

        Object.keys(TYPES).forEach(function(type) {
            var button = createElement("button", "harmonograph-type-button", parent);
            var icon = createElement("span", "harmonograph-type-icon", button);

            button.type = "button";
            button.title = TYPES[type];
            button.setAttribute("aria-label", TYPES[type]);
            button.setAttribute("data-harmonograph-type", type);
            icon.textContent = TYPES[type].charAt(0);
            buttons[type] = button;
        });

        return {
            row: parent,
            buttons: buttons
        };
    }

    function createRangeControl(parent, labelText, min, max, step) {
        var control = createElement("label", "harmonograph-control", parent);
        var labelRow = createElement("span", "harmonograph-control-label-row", control);
        var label = createElement("span", "harmonograph-control-label", labelRow);
        var value = createElement("span", "harmonograph-control-value", labelRow);
        var input = createElement("input", "harmonograph-range", control);

        label.textContent = labelText;
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);

        return {
            input: input,
            value: value,
            min: min,
            max: max
        };
    }

    function createColorControl(parent, labelText) {
        var control = createElement("label", "harmonograph-control harmonograph-color-control", parent);
        var label = createElement("span", "harmonograph-control-label", control);
        var input = createElement("input", "harmonograph-color", control);

        label.textContent = labelText;
        input.type = "color";

        return {
            input: input
        };
    }

    function bindControlEvents(component, randomButton, resetButton) {
        var controls = component.controls;

        controls.transferTools.row.addEventListener("click", function(event) {
            var button = event.target.closest("[data-harmonograph-transfer-tool]");

            if (!button) {
                return;
            }

            component.activeTransferTool = button.getAttribute("data-harmonograph-transfer-tool");
            updateTransferToolButtons(component);
        });

        controls.typeButtons.row.addEventListener("click", function(event) {
            var button = event.target.closest("[data-harmonograph-type]");

            if (!button) {
                return;
            }

            setParams(component, {
                type: button.getAttribute("data-harmonograph-type"),
                preset: "custom"
            });
        });

        controls.preset.addEventListener("change", function() {
            applyPreset(component, controls.preset.value);
        });

        Object.keys(controls).forEach(function(key) {
            if (!controls[key].input || key === "inkColor") {
                return;
            }

            controls[key].input.addEventListener("input", function() {
                var next = {};

                next[key] = controls[key].input.value;
                next.preset = "custom";
                setParams(component, next);
            });
        });

        controls.inkColor.input.addEventListener("input", function() {
            setParams(component, {
                inkColor: controls.inkColor.input.value,
                preset: "custom"
            });
        });

        randomButton.addEventListener("click", function() {
            setParams(component, createRandomParams());
        });

        resetButton.addEventListener("click", function() {
            setParams(component, extend({}, DEFAULT_PARAMS));
        });
    }

    function applyPreset(component, presetId) {
        if (!PRESETS[presetId]) {
            return;
        }

        setParams(component, extend({ preset: presetId }, PRESETS[presetId]));
    }

    function setParams(component, nextParams) {
        component.params = normalizeParams(extend(extend({}, component.params), nextParams));
        update(component, false);
    }

    function update(component, skipChange) {
        var params = component.params;
        var controls = component.controls;

        updateTransferToolButtons(component);
        updateTypeButtons(component);
        controls.preset.value = PRESETS[params.preset] ? params.preset : "custom";
        setRangeControlValue(controls.freqX, params.freqX, 3);
        setRangeControlValue(controls.ampX, params.ampX, 0);
        setRangeControlValue(controls.ampY, params.ampY, 0);
        setRangeControlValue(controls.twistFreq, params.twistFreq, 2);
        setRangeControlValue(controls.twistAmp, params.twistAmp, 0);
        setRangeControlValue(controls.damping, params.damping, 0);
        setRangeControlValue(controls.phase, params.phase, 0);
        setRangeControlValue(controls.lineWidth, params.lineWidth, 1);
        controls.inkColor.input.value = params.inkColor;

        draw(component.context, component.canvas.width, component.canvas.height, params, true);

        if (!skipChange && typeof component.config.onChange === "function") {
            component.config.onChange(component.getParams(), component);
        }
    }

    function updateTransferToolButtons(component) {
        var buttons = component.controls.transferTools.buttons;

        Object.keys(buttons).forEach(function(toolId) {
            var isActive = component.activeTransferTool === toolId;

            buttons[toolId].className = isActive ?
                "harmonograph-tool-button harmonograph-tool-button-active" :
                "harmonograph-tool-button";
            buttons[toolId].setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function updateTypeButtons(component) {
        var buttons = component.controls.typeButtons.buttons;

        Object.keys(buttons).forEach(function(type) {
            buttons[type].className = component.params.type === type ?
                "harmonograph-type-button harmonograph-type-button-active" :
                "harmonograph-type-button";
        });
    }

    function setRangeControlValue(control, value, decimals) {
        control.input.value = String(value);
        control.value.textContent = Number(value).toFixed(decimals).replace(/\.0+$/, "");
    }

    function renderCleanDrawing(component) {
        var canvas = document.createElement("canvas");
        var context;

        canvas.width = component.config.drawingWidth;
        canvas.height = component.config.drawingHeight;
        context = canvas.getContext("2d");
        draw(context, canvas.width, canvas.height, component.params, false);
        return canvas;
    }

    function draw(context, width, height, params, withPaper) {
        var points = createPoints(params);
        var bounds = getBounds(points);
        var padding = Math.max(16, params.lineWidth * 4);
        var scale = Math.min(
            (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX),
            (height - padding * 2) / Math.max(1, bounds.maxY - bounds.minY)
        );
        var centerX = width / 2;
        var centerY = height / 2;
        var boundsCenterX = (bounds.minX + bounds.maxX) / 2;
        var boundsCenterY = (bounds.minY + bounds.maxY) / 2;

        context.clearRect(0, 0, width, height);

        if (withPaper) {
            drawPaper(context, width, height);
        }

        context.save();
        context.strokeStyle = params.inkColor;
        context.globalAlpha = 0.78;
        context.lineWidth = params.lineWidth;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();

        points.forEach(function(point, index) {
            var x = centerX + (point.x - boundsCenterX) * scale;
            var y = centerY + (point.y - boundsCenterY) * scale;

            if (index === 0) {
                context.moveTo(x, y);
                return;
            }

            context.lineTo(x, y);
        });

        context.stroke();
        context.restore();
    }

    function drawPaper(context, width, height) {
        context.save();
        context.fillStyle = "rgba(255, 252, 241, 0.72)";
        context.fillRect(0, 0, width, height);
        context.strokeStyle = "rgba(100, 85, 66, 0.28)";
        context.lineWidth = 1;
        context.strokeRect(0.5, 0.5, width - 1, height - 1);
        context.restore();
    }

    function createPoints(params) {
        var points = [];
        var count = Math.round(params.detail);
        var duration = 118;
        var damping = params.damping / 100;
        var twistDamping = params.twistDamping / 100;
        var phase = toRadians(params.phase);
        var twistPhase = toRadians(params.twistPhase);
        var i;
        var progress;
        var t;
        var decay;
        var twistDecay;
        var twist;
        var x;
        var y;
        var secondDecay;
        var radius;
        var angle;

        for (i = 0; i < count; i++) {
            progress = i / Math.max(1, count - 1);
            t = -duration + (duration * progress);
            decay = Math.max(0, 1 - (progress * damping));
            twistDecay = Math.max(0, 1 - (progress * twistDamping));
            twist = Math.cos(t * params.twistFreq + twistPhase) * twistDecay * Math.PI;

            if (params.type === "simple") {
                x = params.ampX * Math.cos(t * params.freqX + phase) * decay;
                y = params.ampY * Math.sin(t * params.freqY) * decay;
            } else if (params.type === "rotary") {
                angle = progress * Math.PI * 2.4;
                x = params.ampX * Math.cos(t * params.freqX + phase) * decay;
                y = params.ampY * Math.cos(t * params.freqY) * decay;
                radius = x;
                x = radius * Math.cos(angle) - y * Math.sin(angle);
                y = radius * Math.sin(angle) + y * Math.cos(angle);
                x += params.twistAmp * 0.65 * Math.cos(twist);
                y += params.twistAmp * 0.65 * Math.sin(twist);
            } else if (params.type === "three") {
                secondDecay = Math.max(0, 1 - (progress * (damping * 0.7)));
                x = params.ampX * Math.cos(t * params.freqX + phase) * decay;
                y = params.ampY * Math.cos(t * params.freqY) * decay;
                y += params.twistAmp * Math.sin(t * params.twistFreq + twistPhase) * secondDecay;
            } else if (params.type === "four") {
                secondDecay = Math.max(0, 1 - (progress * (damping * 0.78)));
                x = params.ampX * Math.cos(t * params.freqX + phase) * decay;
                x += params.twistAmp * Math.cos(t * params.twistFreq + twistPhase) * secondDecay;
                y = params.ampY * Math.sin(t * params.freqY) * decay;
                y += params.twistAmp * Math.sin(t * (params.twistFreq * 0.72) + phase) * secondDecay;
            } else if (params.type === "polar") {
                radius = (params.ampX + params.ampY) * 0.42 * (1 + Math.cos(t * params.freqX + phase)) * decay;
                angle = t * params.freqY + Math.sin(t * params.twistFreq + twistPhase) * (params.twistAmp / 22);
                x = radius * Math.cos(angle);
                y = radius * Math.sin(angle);
            } else {
                x = params.ampX * Math.cos(t * params.freqX + phase) * decay;
                y = params.ampY * Math.cos(t * params.freqY) * decay;
                x += params.twistAmp * Math.cos(twist);
                y += params.twistAmp * Math.sin(twist);
            }

            points.push({ x: x, y: y });
        }

        return points;
    }

    function getBounds(points) {
        var bounds = {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
        };

        points.forEach(function(point) {
            bounds.minX = Math.min(bounds.minX, point.x);
            bounds.maxX = Math.max(bounds.maxX, point.x);
            bounds.minY = Math.min(bounds.minY, point.y);
            bounds.maxY = Math.max(bounds.maxY, point.y);
        });

        return bounds;
    }

    function createRandomParams() {
        return normalizeParams({
            type: randomType(),
            preset: "custom",
            freqX: randomNumber(0.965, 1.09, 0.001),
            freqY: 1,
            twistFreq: randomNumber(0.85, 2.55, 0.01),
            ampX: randomNumber(86, 160, 1),
            ampY: randomNumber(86, 160, 1),
            twistAmp: randomNumber(8, 68, 1),
            damping: randomNumber(24, 62, 1),
            twistDamping: randomNumber(8, 42, 1),
            phase: randomNumber(0, 180, 1),
            twistPhase: randomNumber(0, 180, 1),
            detail: DEFAULT_PARAMS.detail,
            lineWidth: DEFAULT_PARAMS.lineWidth,
            inkColor: DEFAULT_PARAMS.inkColor
        });
    }

    function normalizeParams(params) {
        return {
            type: TYPES[params.type] ? params.type : DEFAULT_PARAMS.type,
            preset: String(params.preset || "custom"),
            freqX: clampNumber(params.freqX, 0.92, 1.12, DEFAULT_PARAMS.freqX),
            freqY: clampNumber(params.freqY, 0.8, 1.2, DEFAULT_PARAMS.freqY),
            twistFreq: clampNumber(params.twistFreq, 0.6, 2.8, DEFAULT_PARAMS.twistFreq),
            ampX: clampNumber(params.ampX, 30, 170, DEFAULT_PARAMS.ampX),
            ampY: clampNumber(params.ampY, 30, 170, DEFAULT_PARAMS.ampY),
            twistAmp: clampNumber(params.twistAmp, 0, 80, DEFAULT_PARAMS.twistAmp),
            damping: clampNumber(params.damping, 5, 80, DEFAULT_PARAMS.damping),
            twistDamping: clampNumber(params.twistDamping, 0, 60, DEFAULT_PARAMS.twistDamping),
            phase: clampNumber(params.phase, 0, 180, DEFAULT_PARAMS.phase),
            twistPhase: clampNumber(params.twistPhase, 0, 180, DEFAULT_PARAMS.twistPhase),
            detail: clampNumber(params.detail, 900, 7000, DEFAULT_PARAMS.detail),
            lineWidth: clampNumber(params.lineWidth, 1, 5, DEFAULT_PARAMS.lineWidth),
            inkColor: isHexColor(params.inkColor) ? params.inkColor : DEFAULT_PARAMS.inkColor
        };
    }

    function clampNumber(value, min, max, fallback) {
        var number = Number(value);

        if (!Number.isFinite(number)) {
            number = fallback;
        }

        return Math.max(min, Math.min(max, number));
    }

    function randomNumber(min, max, step) {
        var value = min + Math.random() * (max - min);

        return Math.round(value / step) * step;
    }

    function randomType() {
        var types = Object.keys(TYPES);

        return types[Math.floor(Math.random() * types.length)];
    }

    function isHexColor(value) {
        return /^#[0-9a-f]{6}$/i.test(String(value || ""));
    }

    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("Harmonograph container not found: " + containerId);
        }

        return container;
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

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    global.Harmonograph = Harmonograph;
    global.harmonograph = Harmonograph;

}(window));
