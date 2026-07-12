(function(global) {

    "use strict";

    var PX_TO_MM = 25.4 / 96;

    var DEFAULTS = {
        id: null,
        width: 200,
        height: 470,
        previewWidth: 276,
        previewHeight: 140,
        minSegmentCount: 10,
        maxSegmentCount: 140,
        minBrushWidth: 10,
        maxBrushWidth: 256,
        brushWidth: 125,
        minLineWidth: 1,
        maxLineWidth: 10,
        lineWidth: 1,
        minDensity: 0,
        maxDensity: 100,
        density: 35,
        antialiasing: false,
        colorMode: "front",
        onChange: null
    };

    var COLOR_MODES = {
        front: "All Front Color",
        alternate: "Front / Background",
        crazy: "Crazy Rainbow"
    };

    var COLOR_MODE_BUTTONS = [
        {
            mode: "front",
            label: COLOR_MODES.front,
            icon: new URL("./r-l_front-color.png", import.meta.url).href
        },
        {
            mode: "alternate",
            label: COLOR_MODES.alternate,
            icon: new URL("./r-l_two-colors.png", import.meta.url).href
        },
        {
            mode: "crazy",
            label: COLOR_MODES.crazy,
            icon: new URL("./r-l_rainbow.png", import.meta.url).href
        }
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

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function mapRange(value, inMin, inMax, outMin, outMax) {
        return outMin + (clamp(value, inMin, inMax) - inMin) * (outMax - outMin) / (inMax - inMin);
    }

    function normalizeValue(value, min, max, fallback) {
        var number = Math.round(Number(value));

        if (!Number.isFinite(number)) {
            number = fallback;
        }

        return clamp(number, min, max);
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

    function generateSegments(count) {
        var segments = [];
        var i;

        for (i = 0; i < count; i++) {
            segments.push({
                xFraction: Math.random(),
                yFactor: Math.random() - 0.5,
                angle: (Math.random() * 140) - 70,
                length: 10 + (Math.random() * 22)
            });
        }

        return segments;
    }

    function RandomLinesDesigner(target, options) {
        if (!(this instanceof RandomLinesDesigner)) {
            return new RandomLinesDesigner(target, options);
        }

        this.target = typeof target === "string" ? document.querySelector(target) : target;

        if (!this.target) {
            throw new Error("RandomLinesDesigner target was not found.");
        }

        this.options = extend(extend({}, DEFAULTS), options || {});
        this.state = {
            brushWidth: normalizeValue(this.options.brushWidth, this.options.minBrushWidth, this.options.maxBrushWidth, DEFAULTS.brushWidth),
            lineWidth: normalizeValue(this.options.lineWidth, this.options.minLineWidth, this.options.maxLineWidth, DEFAULTS.lineWidth),
            density: normalizeValue(this.options.density, this.options.minDensity, this.options.maxDensity, DEFAULTS.density),
            antialiasing: typeof this.options.antialiasing === "boolean" ? this.options.antialiasing : DEFAULTS.antialiasing,
            colorMode: normalizeColorMode(this.options.colorMode)
        };
        this.segments = generateSegments(this.getSegmentCount());
        this.hover = null;
        this.syncedCrazyOptionsColorMode = null;
        this.onChange = typeof this.options.onChange === "function" ? this.options.onChange : function() {};

        this.render();
        this.update();
    }

    RandomLinesDesigner.prototype.render = function() {
        var root = createElement("div", "random-lines-designer");
        var previewWrap = createElement("div", "random-lines-designer-preview-wrap", root);

        root.style.width = this.options.width + "px";
        root.style.height = this.options.height + "px";
        this.target.replaceChildren(root);
        this.root = root;

        createElement("span", "random-lines-designer-preview-label", previewWrap).textContent = "Preview";

        this.previewCanvas = createElement("canvas", "random-lines-designer-preview", previewWrap);
        this.previewCanvas.width = this.options.previewWidth;
        this.previewCanvas.height = this.options.previewHeight;
        this.previewCtx = this.previewCanvas.getContext("2d");

        this.brushWidthControl = this.createControl(
            "Brush Width",
            this.options.minBrushWidth,
            this.options.maxBrushWidth,
            root
        );
        this.lineWidthControl = this.createControl(
            "Line Width",
            this.options.minLineWidth,
            this.options.maxLineWidth,
            root
        );
        this.densityControl = this.createControl(
            "Density",
            this.options.minDensity,
            this.options.maxDensity,
            root,
            { unit: "", limitLabels: ["Low", "High"] }
        );
        this.colorModeControl = this.createColorModeButtons("Color Mode", root);
        this.antialiasingControl = this.createCheckbox("Antialiasing", root);

        this.bindPreviewEvents();
        this.bindControlEvents();
    };

    RandomLinesDesigner.prototype.createControl = function(labelText, min, max, parent, settings) {
        var control = createElement("label", "random-lines-designer-control", parent);
        var labelRow = createElement("div", "random-lines-designer-label-row", control);
        var labelSpan = createElement("span", "random-lines-designer-control-label", labelRow);
        var value = createElement("span", "random-lines-designer-value", labelRow);
        var row = createElement("div", "random-lines-designer-control-row", control);
        var input = createElement("input", "random-lines-designer-range", row);
        var limits = createElement("div", "random-lines-designer-limits", control);
        var unit = settings && typeof settings.unit === "string" ? settings.unit : "px";
        var limitLabels = settings && settings.limitLabels ? settings.limitLabels : [min + unit, max + unit];

        labelSpan.textContent = labelText;
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = "1";

        createElement("span", "", limits).textContent = limitLabels[0];
        createElement("span", "", limits).textContent = limitLabels[1];

        return {
            element: control,
            input: input,
            value: value,
            min: min,
            max: max,
            unit: unit
        };
    };

    RandomLinesDesigner.prototype.createCheckbox = function(labelText, parent) {
        var row = createElement("label", "random-lines-designer-check", parent);
        var input = createElement("input", "", row);

        input.type = "checkbox";
        row.appendChild(document.createTextNode(labelText));

        return {
            element: row,
            input: input
        };
    };

    RandomLinesDesigner.prototype.createColorModeButtons = function(labelText, parent) {
        var control = createElement("label", "random-lines-designer-control", parent);
        var labelRow = createElement("div", "random-lines-designer-label-row", control);
        var labelSpan = createElement("span", "random-lines-designer-control-label", labelRow);
        var buttonsRow = createElement("div", "random-lines-designer-color-mode-buttons", control);

        labelSpan.textContent = labelText;

        COLOR_MODE_BUTTONS.forEach(function(colorModeButton) {
            var button = createElement("button", "random-lines-designer-color-mode-button", buttonsRow);
            var icon = createElement("img", "random-lines-designer-color-mode-icon", button);

            button.type = "button";
            button.setAttribute("data-color-mode", colorModeButton.mode);
            button.title = colorModeButton.label;

            icon.src = colorModeButton.icon;
            icon.alt = colorModeButton.label;
            icon.draggable = false;
        });

        return {
            element: control,
            buttonsRow: buttonsRow
        };
    };

    RandomLinesDesigner.prototype.bindControlEvents = function() {
        var self = this;

        this.brushWidthControl.input.addEventListener("input", function() {
            self.setBrush({ brushWidth: self.brushWidthControl.input.value });
        });

        this.lineWidthControl.input.addEventListener("input", function() {
            self.setBrush({ lineWidth: self.lineWidthControl.input.value });
        });

        this.densityControl.input.addEventListener("input", function() {
            self.setBrush({ density: self.densityControl.input.value });
        });

        this.colorModeControl.buttonsRow.addEventListener("click", function(event) {
            var button = event.target.closest("[data-color-mode]");

            if (!button) {
                return;
            }

            self.setBrush({ colorMode: button.getAttribute("data-color-mode") });
        });

        this.antialiasingControl.input.addEventListener("change", function() {
            self.setBrush({ antialiasing: self.antialiasingControl.input.checked });
        });
    };

    RandomLinesDesigner.prototype.bindPreviewEvents = function() {
        var self = this;

        this.previewCanvas.addEventListener("mousemove", function(event) {
            self.hover = self.getCanvasPoint(event);
            self.drawPreview();
        });

        this.previewCanvas.addEventListener("mouseleave", function() {
            self.hover = null;
            self.drawPreview();
        });
    };

    RandomLinesDesigner.prototype.getCanvasPoint = function(event) {
        var rect = this.previewCanvas.getBoundingClientRect();
        var scaleX = this.previewCanvas.width / rect.width;
        var scaleY = this.previewCanvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    };

    RandomLinesDesigner.prototype.getSegmentCount = function() {
        return Math.round(mapRange(this.state.density, this.options.minDensity, this.options.maxDensity, this.options.minSegmentCount, this.options.maxSegmentCount));
    };

    RandomLinesDesigner.prototype.setBrush = function(brush) {
        var previousDensity = this.state.density;

        brush = brush || {};
        this.state.brushWidth = normalizeValue(brush.brushWidth, this.options.minBrushWidth, this.options.maxBrushWidth, this.state.brushWidth);
        this.state.lineWidth = normalizeValue(brush.lineWidth, this.options.minLineWidth, this.options.maxLineWidth, this.state.lineWidth);
        this.state.density = normalizeValue(brush.density, this.options.minDensity, this.options.maxDensity, this.state.density);
        this.state.antialiasing = typeof brush.antialiasing === "boolean" ? brush.antialiasing : this.state.antialiasing;
        this.state.colorMode = brush.colorMode ? normalizeColorMode(brush.colorMode) : this.state.colorMode;

        if (this.state.density !== previousDensity) {
            this.segments = generateSegments(this.getSegmentCount());
        }

        this.update();
    };

    RandomLinesDesigner.prototype.getBrush = function() {
        return {
            brushWidth: this.state.brushWidth,
            lineWidth: this.state.lineWidth,
            density: this.state.density,
            antialiasing: this.state.antialiasing,
            colorMode: this.state.colorMode
        };
    };

    RandomLinesDesigner.prototype.update = function() {
        var brush = this.getBrush();

        this.brushWidthControl.input.value = String(brush.brushWidth);
        this.lineWidthControl.input.value = String(brush.lineWidth);
        this.densityControl.input.value = String(brush.density);
        this.brushWidthControl.value.textContent = brush.brushWidth + this.brushWidthControl.unit;
        this.lineWidthControl.value.textContent = brush.lineWidth + this.lineWidthControl.unit;
        this.densityControl.value.textContent = brush.density + this.densityControl.unit;
        this.updateColorModeButtons(brush.colorMode);
        this.antialiasingControl.input.checked = brush.antialiasing;
        this.syncCrazyOptions();
        this.drawPreview();
        this.onChange(brush, this);
    };

    RandomLinesDesigner.prototype.updateColorModeButtons = function(colorMode) {
        var buttons = this.colorModeControl.buttonsRow.querySelectorAll("[data-color-mode]");

        Array.prototype.forEach.call(buttons, function(button) {
            if (button.getAttribute("data-color-mode") === colorMode) {
                button.className = "random-lines-designer-color-mode-button random-lines-designer-color-mode-button-active";
            } else {
                button.className = "random-lines-designer-color-mode-button";
            }
        });
    };

    RandomLinesDesigner.prototype.syncCrazyOptions = function() {
        var api = global.ToolsCrazyOptionsApi;

        if (!api || this.syncedCrazyOptionsColorMode === this.state.colorMode) {
            return;
        }

        this.syncedCrazyOptionsColorMode = this.state.colorMode;

        if (this.state.colorMode === "crazy") {
            if (typeof api.applySetup === "function") {
                api.applySetup("random-lines-crazy");
            }
            return;
        }

        if (typeof api.resetSetup === "function") {
            api.resetSetup();
        }

        if (typeof api.setOptions === "function") {
            api.setOptions({ active: false });
        }

        if (global.App && global.App.memory) {
            global.App.memory.rainbowCrazyMode = false;
        }
    };

    RandomLinesDesigner.prototype.getBandHeight = function() {
        var maxBand = this.options.previewHeight - 20;

        return mapRange(this.state.brushWidth, this.options.minBrushWidth, this.options.maxBrushWidth, 8, maxBand);
    };

    RandomLinesDesigner.prototype.drawPreview = function() {
        var ctx = this.previewCtx;
        var width = this.previewCanvas.width;
        var height = this.previewCanvas.height;
        var centerY = height / 2;
        var bandHeight = this.getBandHeight();

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        drawGuideLine(ctx, width, centerY - (bandHeight / 2), "#e8a26a");
        drawGuideLine(ctx, width, centerY + (bandHeight / 2), "#e8a26a");
        drawGuideLine(ctx, width, centerY, "#3d6fd6");

        drawSegments(ctx, this.segments, width, centerY, bandHeight, this.state.lineWidth, this.state.antialiasing);

        if (this.hover) {
            drawCursor(ctx, this.hover, bandHeight);
            drawTooltip(ctx, this.hover, width, height);
        }
    };

    RandomLinesDesigner.prototype.destroy = function() {
        this.target.replaceChildren();
    };

    function drawGuideLine(ctx, width, y, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.restore();
    }

    function drawSegments(ctx, segments, width, centerY, bandHeight, lineWidth, antialiasing) {
        ctx.save();
        ctx.strokeStyle = "#111111";
        ctx.fillStyle = "#111111";

        if (antialiasing) {
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
        }

        segments.forEach(function(segment) {
            var x = segment.xFraction * width;
            var y = centerY + (segment.yFactor * bandHeight);
            var radians = segment.angle * Math.PI / 180;
            var dx = Math.cos(radians) * segment.length / 2;
            var dy = Math.sin(radians) * segment.length / 2;
            var x0 = x - dx;
            var y0 = y - dy;
            var x1 = x + dx;
            var y1 = y + dy;

            if (antialiasing) {
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            } else {
                drawAliasedLineSegment(ctx, x0, y0, x1, y1, Math.round(lineWidth));
            }
        });

        ctx.restore();
    }

    function bresenhamPoints(x0, y0, x1, y1) {
        var points = [];
        var dx;
        var dy;
        var sx;
        var sy;
        var err;
        var e2;
        var x;
        var y;

        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        dx = Math.abs(x1 - x0);
        dy = -Math.abs(y1 - y0);
        sx = x0 < x1 ? 1 : -1;
        sy = y0 < y1 ? 1 : -1;
        err = dx + dy;
        x = x0;
        y = y0;

        while (true) {
            points.push({ x: x, y: y });

            if (x === x1 && y === y1) {
                break;
            }

            e2 = 2 * err;

            if (e2 >= dy) {
                err += dy;
                x += sx;
            }

            if (e2 <= dx) {
                err += dx;
                y += sy;
            }
        }

        return points;
    }

    function drawAliasedLineSegment(ctx, x0, y0, x1, y1, thickness) {
        var half = Math.floor(Math.max(1, thickness) / 2);
        var size = Math.max(1, thickness);

        bresenhamPoints(x0, y0, x1, y1).forEach(function(point) {
            ctx.fillRect(point.x - half, point.y - half, size, size);
        });
    }

    function normalizeColorMode(colorMode) {
        colorMode = String(colorMode || DEFAULTS.colorMode).toLowerCase();

        if (!Object.prototype.hasOwnProperty.call(COLOR_MODES, colorMode)) {
            return DEFAULTS.colorMode;
        }

        return colorMode;
    }

    function drawCursor(ctx, hover, bandHeight) {
        ctx.save();
        ctx.strokeStyle = "#2ecc40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hover.x, hover.y, bandHeight / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawTooltip(ctx, hover, width, height) {
        var lines = [
            "X: " + (hover.x * PX_TO_MM).toFixed(2) + " mm",
            "Y: " + (hover.y * PX_TO_MM).toFixed(2) + " mm"
        ];
        var boxWidth = 96;
        var boxHeight = 34;
        var offset = 14;
        var boxX = clamp(hover.x + offset, 2, width - boxWidth - 2);
        var boxY = clamp(hover.y + offset, 2, height - boxHeight - 2);

        ctx.save();
        ctx.fillStyle = "rgba(230, 230, 230, 0.92)";
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 1;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = "#111111";
        ctx.font = "11px Arial, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(lines[0], boxX + 6, boxY + 5);
        ctx.fillText(lines[1], boxX + 6, boxY + 18);
        ctx.restore();
    }

    global.RandomLinesDesigner = RandomLinesDesigner;
    global.createRandomLinesDesigner = function(target, options) {
        return new RandomLinesDesigner(target, options);
    };

}(window));
