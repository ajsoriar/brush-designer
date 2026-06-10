(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        width: 216,
        height: 390,
        minSize: 10,
        maxSize: 200,
        size: 100,
        minPointSpacing: 1,
        maxPointSpacing: 30,
        pointSpacing: 2,
        minPointSize: 1,
        maxPointSize: 10,
        pointSize: 1,
        presets: [
            { size: 74, pointSpacing: 2, pointSize: 1 },
            { size: 74, pointSpacing: 3, pointSize: 1 },
            { size: 90, pointSpacing: 5, pointSize: 1 },
            { size: 90, pointSpacing: 8, pointSize: 1 },
            { size: 110, pointSpacing: 5, pointSize: 2 },
            { size: 130, pointSpacing: 8, pointSize: 2 },
            { size: 55, pointSpacing: 1, pointSize: 1 },
            { size: 80, pointSpacing: 1, pointSize: 2 },
            { size: 105, pointSpacing: 2, pointSize: 2 },
            { size: 130, pointSpacing: 3, pointSize: 3 },
            { size: 155, pointSpacing: 4, pointSize: 4 },
            { size: 180, pointSpacing: 5, pointSize: 5 }
        ],
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

    function RetroBrushDesigner(target, options) {
        if (!(this instanceof RetroBrushDesigner)) {
            return new RetroBrushDesigner(target, options);
        }

        this.target = typeof target === "string" ? document.querySelector(target) : target;

        if (!this.target) {
            throw new Error("RetroBrushDesigner target was not found.");
        }

        this.options = extend(extend({}, DEFAULTS), options || {});
        this.state = {
            size: normalizeValue(this.options.size, this.options.minSize, this.options.maxSize),
            pointSpacing: normalizeValue(this.options.pointSpacing, this.options.minPointSpacing, this.options.maxPointSpacing),
            pointSize: normalizeValue(this.options.pointSize, this.options.minPointSize, this.options.maxPointSize)
        };
        this.onChange = typeof this.options.onChange === "function" ? this.options.onChange : function() {};

        this.render();
        this.update();
    }

    RetroBrushDesigner.prototype.render = function() {
        var root = createElement("div", "retro-brush-designer");

        root.style.width = this.options.width + "px";
        root.style.height = this.options.height + "px";
        this.target.replaceChildren(root);
        this.root = root;

        this.preview = createElement("canvas", "retro-brush-designer-preview", root);
        this.preview.width = 198;
        this.preview.height = 198;

        this.sizeControl = this.createControl("Size", "retro-brush-designer-size", this.options.minSize, this.options.maxSize, root);
        this.pointSpacingControl = this.createControl("Space", "retro-brush-designer-point-spacing", this.options.minPointSpacing, this.options.maxPointSpacing, root);
        this.pointSizeControl = this.createControl("Point", "retro-brush-designer-point-size", this.options.minPointSize, this.options.maxPointSize, root);
        this.presetsElement = this.createPresets(root);
    };

    RetroBrushDesigner.prototype.createControl = function(labelText, className, min, max, parent) {
        var self = this;
        var control = createElement("label", "retro-brush-designer-control " + className, parent);
        var label = createElement("span", "retro-brush-designer-label", control);
        var value = createElement("span", "retro-brush-designer-value");
        var input = createElement("input", "retro-brush-designer-range", control);
        var limits = createElement("span", "retro-brush-designer-limits", control);
        var minLabel = createElement("span", "", limits);
        var maxLabel = createElement("span", "", limits);

        label.appendChild(document.createTextNode(labelText + " "));
        label.appendChild(value);

        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.step = "1";
        input.addEventListener("input", function() {
            self.setBrush(self.getControlValues());
        });

        minLabel.textContent = min + "px";
        maxLabel.textContent = max + "px";

        return {
            element: control,
            input: input,
            value: value,
            min: min,
            max: max
        };
    };

    RetroBrushDesigner.prototype.createPresets = function(parent) {
        var self = this;
        var presetsElement = createElement("div", "retro-brush-designer-presets", parent);

        this.presetButtons = [];
        this.options.presets.forEach(function(preset) {
            var normalizedPreset = {
                size: normalizeValue(preset.size, self.options.minSize, self.options.maxSize),
                pointSpacing: normalizeValue(preset.pointSpacing, self.options.minPointSpacing, self.options.maxPointSpacing),
                pointSize: normalizeValue(preset.pointSize, self.options.minPointSize, self.options.maxPointSize)
            };
            var button = createElement("button", "retro-brush-designer-preset", presetsElement);
            var thumbnail = createElement("canvas", "retro-brush-designer-preset-preview", button);

            button.type = "button";
            button.title = normalizedPreset.size + "px / " + normalizedPreset.pointSpacing + "px / " + normalizedPreset.pointSize + "px";
            thumbnail.width = 27;
            thumbnail.height = 23;
            drawPresetThumbnail(thumbnail, normalizedPreset);
            button.addEventListener("click", function() {
                self.setBrush(normalizedPreset);
            });

            self.presetButtons.push({
                button: button,
                brush: normalizedPreset
            });
        });

        return presetsElement;
    };

    RetroBrushDesigner.prototype.getControlValues = function() {
        return {
            size: Number(this.sizeControl.input.value),
            pointSpacing: Number(this.pointSpacingControl.input.value),
            pointSize: Number(this.pointSizeControl.input.value)
        };
    };

    RetroBrushDesigner.prototype.setBrush = function(brush) {
        brush = brush || {};
        this.state.size = normalizeValue(brush.size, this.options.minSize, this.options.maxSize);
        this.state.pointSpacing = normalizeValue(brush.pointSpacing, this.options.minPointSpacing, this.options.maxPointSpacing);
        this.state.pointSize = normalizeValue(brush.pointSize, this.options.minPointSize, this.options.maxPointSize);
        this.update();
    };

    RetroBrushDesigner.prototype.getBrush = function() {
        return {
            size: this.state.size,
            pointSpacing: this.state.pointSpacing,
            pointSize: this.state.pointSize
        };
    };

    RetroBrushDesigner.prototype.update = function() {
        var brush = this.getBrush();

        this.sizeControl.input.value = String(brush.size);
        this.pointSpacingControl.input.value = String(brush.pointSpacing);
        this.pointSizeControl.input.value = String(brush.pointSize);
        this.sizeControl.value.textContent = brush.size + "px";
        this.pointSpacingControl.value.textContent = brush.pointSpacing + "px";
        this.pointSizeControl.value.textContent = brush.pointSize + "px";
        this.drawPreview(brush);
        this.updatePresetSelection(brush);
        this.onChange(brush, this);
    };

    RetroBrushDesigner.prototype.updatePresetSelection = function(brush) {
        if (!this.presetButtons) {
            return;
        }

        this.presetButtons.forEach(function(preset) {
            preset.button.classList.toggle("retro-brush-designer-preset-selected", brushesMatch(brush, preset.brush));
        });
    };

    RetroBrushDesigner.prototype.drawPreview = function(brush) {
        var context = this.preview.getContext("2d");
        var radius = Math.min(brush.size / 2, (Math.min(this.preview.width, this.preview.height) / 2) - 2);

        context.clearRect(0, 0, this.preview.width, this.preview.height);
        drawRetroBrushStamp(context, this.preview.width / 2, this.preview.height / 2, radius, brush.pointSpacing, brush.pointSize, "#000000");
    };

    RetroBrushDesigner.prototype.destroy = function() {
        this.target.replaceChildren();
    };

    function normalizeValue(value, min, max) {
        var number = Math.round(Number(value));

        if (!Number.isFinite(number)) {
            number = min;
        }

        return clamp(number, min, max);
    }

    function drawRetroBrushStamp(context, x, y, radius, pointSpacing, pointSize, color) {
        var size = Math.max(1, Math.round(pointSize));
        var spacing = size + Math.max(0, Math.round(pointSpacing));
        var phaseX = positiveModulo(Math.round(x), spacing);
        var phaseY = positiveModulo(Math.round(y), spacing);
        var left = Math.floor(x - radius);
        var top = Math.floor(y - radius);
        var right = Math.ceil(x + radius);
        var bottom = Math.ceil(y + radius);
        var px;
        var py;
        var dx;
        var dy;

        context.fillStyle = color;

        for (py = top - positiveModulo(top - phaseY, spacing); py <= bottom; py += spacing) {
            for (px = left - positiveModulo(left - phaseX, spacing); px <= right; px += spacing) {
                dx = px - x;
                dy = py - y;

                if ((dx * dx) + (dy * dy) <= radius * radius) {
                    context.fillRect(Math.round(px), Math.round(py), size, size);
                }
            }
        }
    }

    function drawPresetThumbnail(canvas, brush) {
        var context = canvas.getContext("2d");
        var radius = Math.min(canvas.width, canvas.height) * 0.38;
        var spacing = Math.max(2, Math.min(5, Math.round(brush.pointSpacing / 2) + brush.pointSize));
        var pointSize = Math.max(1, Math.min(4, brush.pointSize));

        context.clearRect(0, 0, canvas.width, canvas.height);
        drawRetroBrushStamp(context, canvas.width / 2, canvas.height / 2, radius, spacing, pointSize, "#000000");
    }

    function brushesMatch(a, b) {
        return a.size === b.size && a.pointSpacing === b.pointSpacing && a.pointSize === b.pointSize;
    }

    function positiveModulo(value, divisor) {
        return ((value % divisor) + divisor) % divisor;
    }

    global.RetroBrushDesigner = RetroBrushDesigner;
    global.createRetroBrushDesigner = function(target, options) {
        return new RetroBrushDesigner(target, options);
    };

}(window));
