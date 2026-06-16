(function(global) {

    "use strict";

    function createTempLayer(options) {
        var config = options || {};
        var tempLayer = document.createElement("div");

        tempLayer.id = "temp";
        tempLayer.className = "paint-board-temp-layer";
        tempLayer.style.width = (config.width || 0) + "px";
        tempLayer.style.height = (config.height || 0) + "px";
        tempLayer.tempShape = null;

        return tempLayer;
    }

    function setSize(tempLayer, width, height) {
        if (!tempLayer) {
            return;
        }

        tempLayer.style.width = width + "px";
        tempLayer.style.height = height + "px";
    }

    function startSquare(tempLayer, point) {
        if (!tempLayer || !point) {
            return;
        }

        tempLayer.tempShape = {
            origin: {
                x: point.x,
                y: point.y
            }
        };
        renderSquare(tempLayer, point);
    }

    function startShape(tempLayer, point, options) {
        if (!tempLayer || !point) {
            return;
        }

        tempLayer.tempShape = {
            origin: {
                x: point.x,
                y: point.y
            }
        };
        renderShape(tempLayer, point, options);
    }

    function updateSquare(tempLayer, point) {
        if (!tempLayer || !tempLayer.tempShape || !point) {
            return;
        }

        renderSquare(tempLayer, point);
    }

    function updateShape(tempLayer, point, options) {
        if (!tempLayer || !tempLayer.tempShape || !point) {
            return;
        }

        renderShape(tempLayer, point, options);
    }

    function updateShapeBounds(tempLayer, fromPoint, toPoint, options) {
        if (!tempLayer || !fromPoint || !toPoint) {
            return;
        }

        renderShapeFromPoints(tempLayer, fromPoint, toPoint, options);
    }

    function startLine(tempLayer, point, options) {
        if (!tempLayer || !point) {
            return;
        }

        tempLayer.tempShape = {
            origin: {
                x: point.x,
                y: point.y
            }
        };
        renderLine(tempLayer, point, options);
    }

    function updateLine(tempLayer, point, options) {
        if (!tempLayer || !tempLayer.tempShape || !point) {
            return;
        }

        renderLine(tempLayer, point, options);
    }

    function clear(tempLayer) {
        if (!tempLayer) {
            return;
        }

        tempLayer.tempShape = null;
        tempLayer.innerHTML = "";
    }

    function showCircle(tempLayer, point, radius) {
        var circle;
        var diameter;

        if (!tempLayer || !point) {
            return;
        }

        diameter = Math.max(1, Math.round(radius * 2));
        circle = document.createElement("div");
        circle.className = "paint-board-temp-circle";
        circle.style.left = Math.round(point.x - radius) + "px";
        circle.style.top = Math.round(point.y - radius) + "px";
        circle.style.width = diameter + "px";
        circle.style.height = diameter + "px";

        tempLayer.tempShape = null;
        tempLayer.innerHTML = "";
        tempLayer.appendChild(circle);
    }

    function showSquare(tempLayer, point, size) {
        var square;
        var squareSize;

        if (!tempLayer || !point) {
            return;
        }

        squareSize = Math.max(1, Math.round(size));
        square = document.createElement("div");
        square.className = "paint-board-temp-square";
        square.style.left = Math.round(point.x - (squareSize / 2)) + "px";
        square.style.top = Math.round(point.y - (squareSize / 2)) + "px";
        square.style.width = squareSize + "px";
        square.style.height = squareSize + "px";

        tempLayer.tempShape = null;
        tempLayer.innerHTML = "";
        tempLayer.appendChild(square);
    }

    function renderSquare(tempLayer, point) {
        renderShape(tempLayer, point, {
            oval: false
        });
    }

    function renderShape(tempLayer, point, options) {
        renderShapeFromPoints(tempLayer, tempLayer.tempShape.origin, point, options);
    }

    function renderShapeFromPoints(tempLayer, fromPoint, toPoint, options) {
        var left = Math.min(fromPoint.x, toPoint.x);
        var top = Math.min(fromPoint.y, toPoint.y);
        var right = Math.max(fromPoint.x, toPoint.x);
        var bottom = Math.max(fromPoint.y, toPoint.y);
        var lineWeight = 1;
        var lineColor = "#2563eb";
        var lineOpacity = 1;
        var guideOpacity = 0.5;
        var outlineOpacity = options && options.oval ? 0.5 : lineOpacity;
        var fragments;

        if (right === left) {
            right += 1;
        }

        if (bottom === top) {
            bottom += 1;
        }

        if (!global.dljs || !global.dljs.getLineString) {
            return;
        }

        fragments = [
            global.dljs.getLineString("temp-top", left, top, right, top, lineWeight, lineColor, outlineOpacity, false, 0, null),
            global.dljs.getLineString("temp-right", right, top, right, bottom, lineWeight, lineColor, outlineOpacity, false, 0, null),
            global.dljs.getLineString("temp-bottom", left, bottom, right, bottom, lineWeight, lineColor, outlineOpacity, false, 0, null),
            global.dljs.getLineString("temp-left", left, top, left, bottom, lineWeight, lineColor, outlineOpacity, false, 0, null),
            global.dljs.getLineString("temp-center-x", left, top + ((bottom - top) / 2), right, top + ((bottom - top) / 2), lineWeight, lineColor, guideOpacity, false, 0, null),
            global.dljs.getLineString("temp-center-y", left + ((right - left) / 2), top, left + ((right - left) / 2), bottom, lineWeight, lineColor, guideOpacity, false, 0, null)
        ];

        if (options && options.oval) {
            fragments.push(getOvalString(left, top, right, bottom, lineWeight, lineColor));
        }

        addCoordinateLabels(fragments, {
            x: left,
            y: top
        }, {
            x: left + ((right - left) / 2),
            y: top + ((bottom - top) / 2)
        }, {
            x: right,
            y: bottom
        });

        tempLayer.innerHTML = fragments.join("");
    }

    function addCoordinateLabels(fragments, startPoint, centerPoint, endPoint) {
        var labelConfig = {
            bgOpacity: 0.5,
            borderColor: "blue",
            borderWidth: 1,
            bgColor: "white",
            fontSize: 10
        };

        if (!global.PaintBoardCoordinateLabel || !global.PaintBoardCoordinateLabel.getString) {
            return;
        }

        fragments.push(global.PaintBoardCoordinateLabel.getString(startPoint, labelConfig));
        fragments.push(global.PaintBoardCoordinateLabel.getString(centerPoint, labelConfig));
        fragments.push(global.PaintBoardCoordinateLabel.getString(endPoint, labelConfig));
    }

    function getOvalString(left, top, right, bottom, lineWeight, lineColor) {
        return "<div class=\"paint-board-temp-oval\" style=\"" +
            "left:" + Math.round(left) + "px;" +
            "top:" + Math.round(top) + "px;" +
            "width:" + Math.max(1, Math.round(right - left)) + "px;" +
            "height:" + Math.max(1, Math.round(bottom - top)) + "px;" +
            "border:" + lineWeight + "px solid " + lineColor + ";" +
            "\"></div>";
    }

    function renderLine(tempLayer, point, options) {
        var origin = tempLayer.tempShape.origin;
        var lineWeight = 1;
        var lineColor = "#2563eb";
        var lineOpacity = 1;
        var fragments;

        if (options && options.styled) {
            renderStyledLine(tempLayer, origin, point, options);
            return;
        }

        if (!global.dljs || !global.dljs.getLineString) {
            return;
        }

        fragments = [
            global.dljs.getLineString(
                "temp-gradient-line",
                origin.x,
                origin.y,
                point.x,
                point.y,
                lineWeight,
                lineColor,
                lineOpacity,
                false,
                0,
                null
            )
        ];

        addCoordinateLabels(fragments, origin, null, point);

        tempLayer.innerHTML = fragments.join("");
    }

    function renderStyledLine(tempLayer, origin, point, options) {
        var lineWeight = Math.max(1, Number(options.weight) || 1);
        var lineColor = options.color || "#2563eb";
        var lineCap = normalizeLineCap(options.cap);
        var lineOpacity = typeof options.opacity === "number" ? options.opacity : 0.8;
        var dashArray = Array.isArray(options.dashes) ? options.dashes.join(" ") : "";
        var shapeRendering = options.antialiasing === false ? " shape-rendering=\"crispEdges\"" : "";
        var fragments = [
            "<svg class=\"paint-board-temp-line-svg\" xmlns=\"http://www.w3.org/2000/svg\">",
            "<line class=\"paint-board-temp-line-preview\" x1=\"" + escapeHtml(origin.x) + "\" y1=\"" + escapeHtml(origin.y) + "\" x2=\"" + escapeHtml(point.x) + "\" y2=\"" + escapeHtml(point.y) + "\" stroke=\"" + escapeHtml(lineColor) + "\" stroke-width=\"" + escapeHtml(lineWeight) + "\" stroke-linecap=\"" + escapeHtml(lineCap) + "\" stroke-opacity=\"" + escapeHtml(lineOpacity) + "\"",
            dashArray ? " stroke-dasharray=\"" + escapeHtml(dashArray) + "\"" : "",
            shapeRendering,
            "></line>",
            "</svg>"
        ];

        addCoordinateLabels(fragments, origin, null, point);
        tempLayer.innerHTML = fragments.join("");
    }

    function normalizeLineCap(cap) {
        if (cap === "round" || cap === "square") {
            return cap;
        }

        return "butt";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    global.PaintBoardTempLayer = {
        create: createTempLayer,
        setSize: setSize,
        startSquare: startSquare,
        startShape: startShape,
        updateSquare: updateSquare,
        updateShape: updateShape,
        updateShapeBounds: updateShapeBounds,
        startLine: startLine,
        updateLine: updateLine,
        showCircle: showCircle,
        showSquare: showSquare,
        clear: clear
    };

}(window));
