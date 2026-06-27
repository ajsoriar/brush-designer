(function(global) {

    "use strict";

    function getString(point, options) {
        var config = options || {};
        var backgroundColor;
        var backgroundOpacity;
        var borderColor;
        var borderWidth;
        var fontSize;
        var scale = typeof config.scale === "number" && config.scale > 0 ? config.scale : 1;
        var offset = typeof config.offset === "number" ? config.offset : 7;
        var horizontal;
        var textColor;
        var vertical;
        var transformX;
        var transformY;
        var x;
        var y;

        if (!point) {
            return "";
        }

        x = Math.round(point.x);
        y = Math.round(point.y);
        backgroundColor = config.bgColor || config.bg || "#fff4bd";
        backgroundOpacity = typeof config.bgOpacity === "number" ? config.bgOpacity : null;
        if (backgroundOpacity !== null) {
            backgroundColor = getColorWithOpacity(backgroundColor, backgroundOpacity);
        }
        borderColor = config.borderColor || "#7aa2ff";
        borderWidth = typeof config.borderWidth === "number" ? config.borderWidth : 1;
        fontSize = typeof config.fontSize === "number" ? config.fontSize : 12;
        textColor = config.color || "#111";
        horizontal = config.horizontal || (x < 70 ? "right" : "left");
        vertical = config.vertical || (y < 24 ? "bottom" : "top");
        transformX = horizontal === "left" ? "-100%" : "0";
        transformY = vertical === "top" ? "-100%" : "0";

        return "<span class=\"coordinate-label\" style=\"" +
            "left:" + (horizontal === "left" ? x - offset : x + offset) + "px;" +
            "top:" + (vertical === "top" ? y - offset : y + offset) + "px;" +
            "transform:scale(" + scale + ") translate(" + transformX + "," + transformY + ");" +
            "transform-origin:0 0;" +
            "background:" + backgroundColor + ";" +
            "border-width:" + borderWidth + "px;" +
            "border-color:" + borderColor + ";" +
            "color:" + textColor + ";" +
            "font-size:" + fontSize + "px;" +
            "\">" + x + "," + y + "</span>";
    }

    function getColorWithOpacity(color, opacity) {
        var clampedOpacity = Math.max(0, Math.min(1, opacity));
        var parsedColor = parseColor(color);

        if (!parsedColor) {
            return color;
        }

        return "rgba(" +
            parsedColor.r + "," +
            parsedColor.g + "," +
            parsedColor.b + "," +
            clampedOpacity +
            ")";
    }

    function parseColor(color) {
        var canvas;
        var context;
        var hex;
        var match;
        var normalizedColor;

        if (color === "transparent") {
            return {
                r: 0,
                g: 0,
                b: 0
            };
        }

        normalizedColor = color;
        if (document.createElement) {
            canvas = document.createElement("canvas");
            context = canvas.getContext && canvas.getContext("2d");

            if (context) {
                context.fillStyle = "#000";
                context.fillStyle = color;
                normalizedColor = context.fillStyle;
            }
        }

        if (normalizedColor.charAt(0) === "#") {
            hex = normalizedColor.slice(1);

            if (hex.length === 3) {
                hex = hex.charAt(0) + hex.charAt(0) +
                    hex.charAt(1) + hex.charAt(1) +
                    hex.charAt(2) + hex.charAt(2);
            }

            if (hex.length === 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        }

        match = /^rgba?\(([^)]+)\)$/.exec(normalizedColor);
        if (match) {
            match = match[1].split(",");
            return {
                r: parseInt(match[0], 10),
                g: parseInt(match[1], 10),
                b: parseInt(match[2], 10)
            };
        }

        return null;
    }

    global.PaintBoardCoordinateLabel = {
        getString: getString
    };

}(window));
