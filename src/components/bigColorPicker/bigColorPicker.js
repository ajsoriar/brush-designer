(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 488,
        height: 278,
        activeColor: "#2c79f5",
        onChange: null,
        onColorSelected: null,
        onAccept: null,
        onApply: null,
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

    function BigColorPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var pickerId = config.id || ("big-color-picker-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var areaWrap = document.createElement("div");
        var area = document.createElement("canvas");
        var areaCursor = document.createElement("span");
        var hueWrap = document.createElement("div");
        var hue = document.createElement("canvas");
        var hueCursor = document.createElement("span");
        var readout = document.createElement("div");
        var actions = document.createElement("div");
        var acceptButton = document.createElement("button");
        var applyButton = document.createElement("button");
        var cancelButton = document.createElement("button");
        var initial = hexToHsv(config.activeColor) || { h: 217, s: 82, v: 96 };
        var picker;

        element.id = pickerId;
        element.className = "big-color-picker";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";

        areaWrap.className = "big-color-picker-area-wrap";
        area.className = "big-color-picker-area";
        areaCursor.className = "big-color-picker-area-cursor";

        hueWrap.className = "big-color-picker-hue-wrap";
        hue.className = "big-color-picker-hue";
        hueCursor.className = "big-color-picker-hue-cursor";

        readout.className = "big-color-picker-readout";
        readout.innerHTML = [
            fieldHtml("HEX", "hex", true),
            fieldHtml("RGB", "rgb", false),
            fieldHtml("CMYK", "cmyk", false),
            fieldHtml("HSV", "hsv", false),
            fieldHtml("HSL", "hsl", false)
        ].join("");
        actions.className = "big-color-picker-actions";
        acceptButton.type = "button";
        acceptButton.textContent = "Accept";
        applyButton.type = "button";
        applyButton.textContent = "Apply";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        actions.appendChild(acceptButton);
        actions.appendChild(applyButton);
        actions.appendChild(cancelButton);

        areaWrap.appendChild(area);
        areaWrap.appendChild(areaCursor);
        hueWrap.appendChild(hue);
        hueWrap.appendChild(hueCursor);
        element.appendChild(areaWrap);
        element.appendChild(hueWrap);
        element.appendChild(readout);
        element.appendChild(actions);
        container.appendChild(element);

        picker = {
            id: pickerId,
            element: element,
            areaCanvas: area,
            hueCanvas: hue,
            areaCursor: areaCursor,
            hueCursor: hueCursor,
            hue: initial.h,
            saturation: initial.s,
            value: initial.v,
            activeColor: hsvToHex(initial.h, initial.s, initial.v),
            getActiveColor: function() {
                return picker.activeColor;
            },
            getWidth: function() {
                return config.width;
            },
            getHeight: function() {
                return config.height;
            },
            setActiveColor: function(color) {
                setActiveColor(picker, config, color);
            },
            destroy: function() {
                destroy(picker);
            }
        };

        sizeCanvases(picker);
        drawHue(picker);
        drawArea(picker);
        bindEvents(picker, config);
        acceptButton.addEventListener("click", function() {
            if (typeof config.onAccept === "function") {
                config.onAccept(picker.activeColor, picker);
            }
        });
        applyButton.addEventListener("click", function() {
            if (typeof config.onApply === "function") {
                config.onApply(picker.activeColor, picker);
            }
        });
        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(picker);
            }
        });
        updateFromHsv(picker, config, true);

        return picker;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "big-color-picker-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("BigColorPicker container not found: " + containerId);
        }

        return container;
    }

    function fieldHtml(label, name, isHex) {
        var className = "big-color-picker-field" + (isHex ? " big-color-picker-field-hex" : "");

        return '<div class="' + className + '"><span class="big-color-picker-label">' + label + '</span><span class="big-color-picker-value" data-value="' + name + '"></span></div>';
    }

    function sizeCanvases(picker) {
        var areaRect = picker.areaCanvas.getBoundingClientRect();
        var hueRect = picker.hueCanvas.getBoundingClientRect();

        picker.areaCanvas.width = Math.max(1, Math.round(areaRect.width));
        picker.areaCanvas.height = Math.max(1, Math.round(areaRect.height));
        picker.hueCanvas.width = Math.max(1, Math.round(hueRect.width));
        picker.hueCanvas.height = Math.max(1, Math.round(hueRect.height));
    }

    function drawArea(picker) {
        var context = picker.areaCanvas.getContext("2d");
        var width = picker.areaCanvas.width;
        var height = picker.areaCanvas.height;
        var hueColor = hsvToHex(picker.hue, 100, 100);
        var whiteGradient;
        var blackGradient;

        context.fillStyle = hueColor;
        context.fillRect(0, 0, width, height);

        whiteGradient = context.createLinearGradient(0, 0, width, 0);
        whiteGradient.addColorStop(0, "#ffffff");
        whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = whiteGradient;
        context.fillRect(0, 0, width, height);

        blackGradient = context.createLinearGradient(0, 0, 0, height);
        blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        blackGradient.addColorStop(1, "#000000");
        context.fillStyle = blackGradient;
        context.fillRect(0, 0, width, height);
    }

    function drawHue(picker) {
        var context = picker.hueCanvas.getContext("2d");
        var width = picker.hueCanvas.width;
        var height = picker.hueCanvas.height;
        var gradient = context.createLinearGradient(0, 0, width, 0);

        gradient.addColorStop(0, "#ff0000");
        gradient.addColorStop(0.17, "#ffff00");
        gradient.addColorStop(0.34, "#00ff00");
        gradient.addColorStop(0.51, "#00ffff");
        gradient.addColorStop(0.68, "#0000ff");
        gradient.addColorStop(0.85, "#ff00ff");
        gradient.addColorStop(1, "#ff0000");

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
    }

    function bindEvents(picker, config) {
        var isPickingArea = false;
        var isPickingHue = false;

        picker.areaCanvas.addEventListener("mousedown", function(event) {
            isPickingArea = true;
            pickArea(picker, config, event);
        });

        picker.hueCanvas.addEventListener("mousedown", function(event) {
            isPickingHue = true;
            pickHue(picker, config, event);
        });

        document.addEventListener("mousemove", function(event) {
            if (isPickingArea) {
                pickArea(picker, config, event);
            }

            if (isPickingHue) {
                pickHue(picker, config, event);
            }
        });

        document.addEventListener("mouseup", function() {
            isPickingArea = false;
            isPickingHue = false;
        });
    }

    function pickArea(picker, config, event) {
        var rect = picker.areaCanvas.getBoundingClientRect();
        var x = clamp(event.clientX - rect.left, 0, rect.width);
        var y = clamp(event.clientY - rect.top, 0, rect.height);

        event.preventDefault();
        picker.saturation = Math.round((x / rect.width) * 100);
        picker.value = Math.round(100 - ((y / rect.height) * 100));
        updateFromHsv(picker, config, false);
    }

    function pickHue(picker, config, event) {
        var rect = picker.hueCanvas.getBoundingClientRect();
        var x = clamp(event.clientX - rect.left, 0, rect.width);

        event.preventDefault();
        picker.hue = Math.round((x / rect.width) * 360);
        drawArea(picker);
        updateFromHsv(picker, config, false);
    }

    function setActiveColor(picker, config, color) {
        var hsv = hexToHsv(color);

        if (!hsv) {
            return;
        }

        picker.hue = hsv.h;
        picker.saturation = hsv.s;
        picker.value = hsv.v;
        drawArea(picker);
        updateFromHsv(picker, config, false);
    }

    function updateFromHsv(picker, config, skipCallback) {
        var rgb = hsvToRgb(picker.hue, picker.saturation, picker.value);
        var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        var cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

        picker.activeColor = hex;
        setText(picker, "hex", hex);
        setText(picker, "rgb", rgb.r + ", " + rgb.g + ", " + rgb.b);
        setText(picker, "cmyk", cmyk.c + "%, " + cmyk.m + "%, " + cmyk.y + "%, " + cmyk.k + "%");
        setText(picker, "hsv", picker.hue + "deg, " + picker.saturation + "%, " + picker.value + "%");
        setText(picker, "hsl", hsl.h + "deg, " + hsl.s + "%, " + hsl.l + "%");
        updateCursors(picker);

        if (!skipCallback) {
            notify(config, hex, picker);
        }
    }

    function setText(picker, name, text) {
        picker.element.querySelector('[data-value="' + name + '"]').textContent = text;
    }

    function updateCursors(picker) {
        var areaX = (picker.saturation / 100) * picker.areaCanvas.clientWidth;
        var areaY = (1 - (picker.value / 100)) * picker.areaCanvas.clientHeight;
        var hueX = (picker.hue / 360) * picker.hueCanvas.clientWidth;

        picker.areaCursor.style.left = areaX + "px";
        picker.areaCursor.style.top = areaY + "px";
        picker.hueCursor.style.left = hueX + "px";
        picker.hueCursor.style.top = (picker.hueCanvas.clientHeight / 2) + "px";
    }

    function notify(config, color, picker) {
        if (typeof config.onChange === "function") {
            config.onChange(color, picker);
        }

        if (typeof config.onColorSelected === "function") {
            config.onColorSelected(color, picker);
        }
    }

    function hsvToRgb(h, s, v) {
        var c = (v / 100) * (s / 100);
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = (v / 100) - c;
        var r = 0;
        var g = 0;
        var b = 0;

        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function hsvToHex(h, s, v) {
        var rgb = hsvToRgb(h, s, v);

        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function hexToHsv(hex) {
        var rgb = hexToRgb(hex);
        var r;
        var g;
        var b;
        var max;
        var min;
        var delta;
        var h;
        var s;
        var v;

        if (!rgb) {
            return null;
        }

        r = rgb.r / 255;
        g = rgb.g / 255;
        b = rgb.b / 255;
        max = Math.max(r, g, b);
        min = Math.min(r, g, b);
        delta = max - min;
        h = 0;

        if (delta !== 0) {
            if (max === r) {
                h = 60 * (((g - b) / delta) % 6);
            } else if (max === g) {
                h = 60 * (((b - r) / delta) + 2);
            } else {
                h = 60 * (((r - g) / delta) + 4);
            }
        }

        if (h < 0) {
            h += 360;
        }

        s = max === 0 ? 0 : delta / max;
        v = max;

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    }

    function hexToRgb(hex) {
        var clean = hex.replace("#", "");

        if (clean.length === 3) {
            clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }

        if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
            return null;
        }

        return {
            r: parseInt(clean.substr(0, 2), 16),
            g: parseInt(clean.substr(2, 2), 16),
            b: parseInt(clean.substr(4, 2), 16)
        };
    }

    function rgbToHex(r, g, b) {
        return "#" + toHex(r) + toHex(g) + toHex(b);
    }

    function toHex(value) {
        var text = value.toString(16);

        return text.length === 1 ? "0" + text : text;
    }

    function rgbToHsl(r, g, b) {
        var rn = r / 255;
        var gn = g / 255;
        var bn = b / 255;
        var max = Math.max(rn, gn, bn);
        var min = Math.min(rn, gn, bn);
        var delta = max - min;
        var h = 0;
        var s = 0;
        var l = (max + min) / 2;

        if (delta !== 0) {
            s = delta / (1 - Math.abs((2 * l) - 1));

            if (max === rn) {
                h = 60 * (((gn - bn) / delta) % 6);
            } else if (max === gn) {
                h = 60 * (((bn - rn) / delta) + 2);
            } else {
                h = 60 * (((rn - gn) / delta) + 4);
            }
        }

        if (h < 0) {
            h += 360;
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    function rgbToCmyk(r, g, b) {
        var rn = r / 255;
        var gn = g / 255;
        var bn = b / 255;
        var k = 1 - Math.max(rn, gn, bn);

        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 100 };
        }

        return {
            c: Math.round(((1 - rn - k) / (1 - k)) * 100),
            m: Math.round(((1 - gn - k) / (1 - k)) * 100),
            y: Math.round(((1 - bn - k) / (1 - k)) * 100),
            k: Math.round(k * 100)
        };
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function destroy(picker) {
        if (picker.element.parentNode) {
            picker.element.parentNode.removeChild(picker.element);
        }
    }

    global.BigColorPicker = BigColorPicker;
    global.bigColorPicker = BigColorPicker;

}(window));
