(function(global) {

    "use strict";

    var PX_TO_MM = 25.4 / 96;

    var DEFAULTS = {
        id: null,
        width: 304,
        height: 380,
        previewWidth: 276,
        previewHeight: 140,
        segmentCount: 30,
        minBrushWidth: 10,
        maxBrushWidth: 256,
        brushWidth: 20,
        minLineWidth: 1,
        maxLineWidth: 10,
        lineWidth: 2,
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
            lineWidth: normalizeValue(this.options.lineWidth, this.options.minLineWidth, this.options.maxLineWidth, DEFAULTS.lineWidth)
        };
        this.segments = generateSegments(this.options.segmentCount);
        this.hover = null;
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
            "Brush Wide",
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

        this.bindPreviewEvents();
        this.bindControlEvents();
    };

    RandomLinesDesigner.prototype.createControl = function(labelText, min, max, parent) {
        var control = createElement("label", "random-lines-designer-control", parent);
        var labelRow = createElement("span", "random-lines-designer-control-label", control);
        var row = createElement("div", "random-lines-designer-control-row", control);
        var value = createElement("span", "random-lines-designer-value", row);
        var input = createElement("input", "random-lines-designer-range", row);
        var limits = createElement("div", "random-lines-designer-limits", control);

        labelRow.textContent = labelText;
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = "1";

        createElement("span", "", limits).textContent = min + "px";
        createElement("span", "", limits).textContent = max + "px";

        return {
            element: control,
            input: input,
            value: value,
            min: min,
            max: max
        };
    };

    RandomLinesDesigner.prototype.bindControlEvents = function() {
        var self = this;

        this.brushWidthControl.input.addEventListener("input", function() {
            self.setBrush({
                brushWidth: self.brushWidthControl.input.value,
                lineWidth: self.state.lineWidth
            });
        });

        this.lineWidthControl.input.addEventListener("input", function() {
            self.setBrush({
                brushWidth: self.state.brushWidth,
                lineWidth: self.lineWidthControl.input.value
            });
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

    RandomLinesDesigner.prototype.setBrush = function(brush) {
        brush = brush || {};
        this.state.brushWidth = normalizeValue(brush.brushWidth, this.options.minBrushWidth, this.options.maxBrushWidth, this.state.brushWidth);
        this.state.lineWidth = normalizeValue(brush.lineWidth, this.options.minLineWidth, this.options.maxLineWidth, this.state.lineWidth);
        this.update();
    };

    RandomLinesDesigner.prototype.getBrush = function() {
        return {
            brushWidth: this.state.brushWidth,
            lineWidth: this.state.lineWidth
        };
    };

    RandomLinesDesigner.prototype.update = function() {
        var brush = this.getBrush();

        this.brushWidthControl.input.value = String(brush.brushWidth);
        this.lineWidthControl.input.value = String(brush.lineWidth);
        this.brushWidthControl.value.textContent = brush.brushWidth + "px";
        this.lineWidthControl.value.textContent = brush.lineWidth + "px";
        this.drawPreview();
        this.onChange(brush, this);
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

        drawSegments(ctx, this.segments, width, centerY, bandHeight, this.state.lineWidth);

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

    function drawSegments(ctx, segments, width, centerY, bandHeight, lineWidth) {
        ctx.save();
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";

        segments.forEach(function(segment) {
            var x = segment.xFraction * width;
            var y = centerY + (segment.yFactor * bandHeight);
            var radians = segment.angle * Math.PI / 180;
            var dx = Math.cos(radians) * segment.length / 2;
            var dy = Math.sin(radians) * segment.length / 2;

            ctx.beginPath();
            ctx.moveTo(x - dx, y - dy);
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();
        });

        ctx.restore();
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
