(function(global) {
    "use strict";

    var currentScript = document.currentScript;
    var assetBaseUrl = currentScript ? currentScript.src : "";
    var DEFAULTS = {
        width: 380,
        height: 475,
        minSize: 1,
        maxSize: 256,
        size: 64,
        hardness: 50
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function assetUrl(fileName) {
        return new URL(fileName, assetBaseUrl).href;
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

    function injectStyles() {
        if (document.getElementById("brush-designer-v2-styles")) {
            return;
        }

        var style = createElement("style");
        style.id = "brush-designer-v2-styles";
        style.textContent = [
            ".bd2-root{position:relative;width:380px;height:475px;background-image:var(--bd2-bg);background-size:380px 475px;background-repeat:no-repeat;font-family:Arial,sans-serif;color:#111;user-select:none;}",
            ".bd2-root *{box-sizing:border-box;}",
            ".bd2-label{position:absolute;font-size:12px;font-weight:bold;line-height:1;}",
            ".bd2-value{position:absolute;width:58px;height:22px;border:1px solid #c6c6c6;background:#fff;font:bold 12px Arial,sans-serif;text-align:center;}",
            ".bd2-range{position:absolute;width:160px;height:18px;margin:0;accent-color:#1784d1;}",
            ".bd2-preview{position:absolute;width:58px;height:58px;background:transparent;}",
            ".bd2-drawing{position:absolute;left:50px;top:186px;width:280px;height:280px;background:transparent;cursor:crosshair;}",
            ".bd2-handle{position:absolute;width:26px;height:26px;background-image:var(--bd2-handles);background-repeat:no-repeat;background-size:57px 26px;transform:translate(-13px,-13px);cursor:grab;touch-action:none;}",
            ".bd2-handle:active{cursor:grabbing;}",
            ".bd2-handle-size{background-position:0 0;}",
            ".bd2-handle-hardness{background-position:-31px 0;}",
            ".bd2-output{position:absolute;left:50px;right:50px;bottom:9px;height:22px;border:1px solid #bbb;background:rgba(255,255,255,.8);font:11px Consolas,monospace;line-height:20px;overflow:hidden;white-space:nowrap;padding:0 6px;}"
        ].join("\n");
        document.head.appendChild(style);
    }

    function BrushDesignerV2(target, options) {
        if (!(this instanceof BrushDesignerV2)) {
            return new BrushDesignerV2(target, options);
        }

        this.target = typeof target === "string" ? document.querySelector(target) : target;
        if (!this.target) {
            throw new Error("BrushDesignerV2 target was not found.");
        }

        this.options = Object.assign({}, DEFAULTS, options || {});
        this.state = {
            size: clamp(Number(this.options.size), this.options.minSize, this.options.maxSize),
            hardness: clamp(Number(this.options.hardness), 0, 100),
            centerX: 140,
            centerY: 140
        };

        this.onChange = typeof this.options.onChange === "function" ? this.options.onChange : function() {};
        this.draggingHandle = null;
        this.render();
        this.update();
    }

    BrushDesignerV2.prototype.render = function() {
        var root;
        injectStyles();

        root = createElement("div", "bd2-root");
        root.style.setProperty("--bd2-bg", "url(\"" + assetUrl("bd2-bg.png") + "\")");
        root.style.setProperty("--bd2-handles", "url(\"" + assetUrl("bd2-handles.png") + "\")");

        this.target.replaceChildren(root);
        this.root = root;

        createElement("label", "bd2-label", root).textContent = "Hardness:";
        root.lastChild.style.left = "92px";
        root.lastChild.style.top = "58px";

        this.hardnessInput = createElement("input", "bd2-range", root);
        this.hardnessInput.type = "range";
        this.hardnessInput.min = "0";
        this.hardnessInput.max = "100";
        this.hardnessInput.style.left = "91px";
        this.hardnessInput.style.top = "79px";

        this.hardnessValue = createElement("input", "bd2-value", root);
        this.hardnessValue.type = "text";
        this.hardnessValue.style.left = "243px";
        this.hardnessValue.style.top = "50px";

        createElement("label", "bd2-label", root).textContent = "Size:";
        root.lastChild.style.left = "92px";
        root.lastChild.style.top = "126px";

        this.sizeInput = createElement("input", "bd2-range", root);
        this.sizeInput.type = "range";
        this.sizeInput.min = String(this.options.minSize);
        this.sizeInput.max = String(this.options.maxSize);
        this.sizeInput.style.left = "91px";
        this.sizeInput.style.top = "147px";

        this.sizeValue = createElement("input", "bd2-value", root);
        this.sizeValue.type = "text";
        this.sizeValue.style.left = "243px";
        this.sizeValue.style.top = "118px";

        this.softPreview = createElement("canvas", "bd2-preview", root);
        this.softPreview.width = 58;
        this.softPreview.height = 58;
        this.softPreview.style.left = "12px";
        this.softPreview.style.top = "52px";

        this.hardPreview = createElement("canvas", "bd2-preview", root);
        this.hardPreview.width = 58;
        this.hardPreview.height = 58;
        this.hardPreview.style.left = "310px";
        this.hardPreview.style.top = "52px";

        this.canvas = createElement("canvas", "bd2-drawing", root);
        this.canvas.width = 280;
        this.canvas.height = 280;

        this.sizeHandle = createElement("div", "bd2-handle bd2-handle-size", root);
        this.hardnessHandle = createElement("div", "bd2-handle bd2-handle-hardness", root);
        this.output = createElement("div", "bd2-output", root);

        this.bindEvents();
    };

    BrushDesignerV2.prototype.bindEvents = function() {
        var self = this;

        this.hardnessInput.addEventListener("input", function() {
            self.setHardness(Number(self.hardnessInput.value));
        });

        this.sizeInput.addEventListener("input", function() {
            self.setSize(Number(self.sizeInput.value));
        });

        this.hardnessValue.addEventListener("change", function() {
            self.setHardness(parseInt(self.hardnessValue.value, 10));
        });

        this.sizeValue.addEventListener("change", function() {
            self.setSize(parseInt(self.sizeValue.value, 10));
        });

        this.sizeHandle.addEventListener("pointerdown", function(event) {
            self.startDrag("size", event);
        });

        this.hardnessHandle.addEventListener("pointerdown", function(event) {
            self.startDrag("hardness", event);
        });

        global.addEventListener("pointermove", function(event) {
            self.drag(event);
        });

        global.addEventListener("pointerup", function() {
            self.draggingHandle = null;
        });
    };

    BrushDesignerV2.prototype.startDrag = function(handle, event) {
        event.preventDefault();
        this.draggingHandle = handle;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    BrushDesignerV2.prototype.drag = function(event) {
        var rect;
        var x;
        var y;
        var dx;
        var dy;
        var distance;
        var maxRadius = 140;

        if (!this.draggingHandle) {
            return;
        }

        rect = this.canvas.getBoundingClientRect();
        x = clamp(event.clientX - rect.left, 0, this.canvas.width);
        y = clamp(event.clientY - rect.top, 0, this.canvas.height);
        dx = x - this.state.centerX;
        dy = y - this.state.centerY;
        distance = clamp(Math.sqrt(dx * dx + dy * dy), 0, maxRadius);

        if (this.draggingHandle === "size") {
            this.setSize(Math.round((distance / maxRadius) * this.options.maxSize));
        } else {
            this.setHardness(Math.round((distance / maxRadius) * 100));
        }
    };

    BrushDesignerV2.prototype.setSize = function(size) {
        this.state.size = clamp(Number.isFinite(size) ? size : this.options.minSize, this.options.minSize, this.options.maxSize);
        this.update();
    };

    BrushDesignerV2.prototype.setHardness = function(hardness) {
        this.state.hardness = clamp(Number.isFinite(hardness) ? hardness : 0, 0, 100);
        this.update();
    };

    BrushDesignerV2.prototype.update = function() {
        var brush = this.getBrush();

        this.hardnessInput.value = String(brush.hardness);
        this.hardnessValue.value = brush.hardness + "%";
        this.sizeInput.value = String(brush.size);
        this.sizeValue.value = brush.size + " px";
        this.output.textContent = JSON.stringify(brush);

        this.drawPreviewCanvas(this.softPreview, brush.size, brush.hardness);
        this.drawPreviewCanvas(this.hardPreview, brush.size, 100);
        this.drawDesignerCanvas();
        this.positionHandles();
        this.onChange(brush, this);
    };

    BrushDesignerV2.prototype.drawPreviewCanvas = function(canvas, size, hardness) {
        var ctx = canvas.getContext("2d");
        var previewSize = clamp(size, 1, canvas.width - 6);
        var radius = previewSize / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawBrush(ctx, canvas.width / 2, canvas.height / 2, radius, hardness);
    };

    BrushDesignerV2.prototype.drawDesignerCanvas = function() {
        var ctx = this.canvas.getContext("2d");
        var radius = this.brushRadius();
        var hardRadius = radius * (this.state.hardness / 100);

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBrush(ctx, this.state.centerX, this.state.centerY, radius, this.state.hardness);

        ctx.save();
        ctx.strokeStyle = "rgba(255,95,68,.95)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.state.centerX, this.state.centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(52,159,64,.95)";
        ctx.beginPath();
        ctx.arc(this.state.centerX, this.state.centerY, hardRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    };

    BrushDesignerV2.prototype.drawBrush = function(ctx, x, y, radius, hardness) {
        var gradient;
        var hardStop = clamp(hardness / 100, 0, 1);

        ctx.save();
        if (hardness >= 100) {
            ctx.fillStyle = "#000";
        } else {
            gradient = ctx.createRadialGradient(x, y, radius * hardStop, x, y, radius);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = gradient;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    BrushDesignerV2.prototype.brushRadius = function() {
        return clamp(this.state.size / 2, 1, 140);
    };

    BrushDesignerV2.prototype.positionHandles = function() {
        var rootLeft = 50;
        var rootTop = 186;
        var centerX = rootLeft + this.state.centerX;
        var centerY = rootTop + this.state.centerY;
        var sizeRadius = this.brushRadius();
        var hardnessRadius = sizeRadius * (this.state.hardness / 100);

        this.sizeHandle.style.left = centerX - sizeRadius + "px";
        this.sizeHandle.style.top = centerY + "px";
        this.hardnessHandle.style.left = centerX - hardnessRadius + "px";
        this.hardnessHandle.style.top = centerY + "px";
    };

    BrushDesignerV2.prototype.getBrush = function() {
        return {
            size: Math.round(this.state.size),
            hardness: Math.round(this.state.hardness),
            radius: Math.round(this.state.size / 2),
            spacing: 1,
            opacity: 1,
            shape: "round"
        };
    };

    BrushDesignerV2.prototype.createBrushCanvas = function() {
        var brush = this.getBrush();
        var canvas = document.createElement("canvas");
        var ctx;

        canvas.width = brush.size;
        canvas.height = brush.size;
        ctx = canvas.getContext("2d");
        this.drawBrush(ctx, brush.radius, brush.radius, brush.radius, brush.hardness);

        return canvas;
    };

    BrushDesignerV2.prototype.destroy = function() {
        this.target.replaceChildren();
    };

    global.BrushDesignerV2 = BrushDesignerV2;
    global.createBrushDesignerV2 = function(target, options) {
        return new BrushDesignerV2(target, options);
    };
})(window);
