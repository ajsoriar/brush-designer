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

    function startLine(tempLayer, point) {
        if (!tempLayer || !point) {
            return;
        }

        tempLayer.tempShape = {
            origin: {
                x: point.x,
                y: point.y
            }
        };
        renderLine(tempLayer, point);
    }

    function updateLine(tempLayer, point) {
        if (!tempLayer || !tempLayer.tempShape || !point) {
            return;
        }

        renderLine(tempLayer, point);
    }

    function clear(tempLayer) {
        if (!tempLayer) {
            return;
        }

        tempLayer.tempShape = null;
        tempLayer.innerHTML = "";
    }

    function showCircle(tempLayer, point, radius) {
        var diameter;
        var left;
        var top;

        if (!tempLayer || !point) {
            return;
        }

        diameter = Math.max(1, Math.round(radius * 2));
        left = Math.round(point.x - radius);
        top = Math.round(point.y - radius);
        showBrushOutline(tempLayer, left, top, diameter, true);
    }

    function showSquare(tempLayer, point, size) {
        var squareSize;
        var left;
        var top;

        if (!tempLayer || !point) {
            return;
        }

        squareSize = Math.max(1, Math.round(size));
        left = Math.round(point.x - (squareSize / 2));
        top = Math.round(point.y - (squareSize / 2));
        showBrushOutline(tempLayer, left, top, squareSize, false);
    }

    function showBrushOutline(tempLayer, left, top, size, circle) {
        var namespace = "http://www.w3.org/2000/svg";
        var screenPixel = getScreenPixelScale(tempLayer);
        var inset = Math.min(size / 2, screenPixel / 2);
        var innerSize = Math.max(0, size - (inset * 2));
        var svg = document.createElementNS(namespace, "svg");
        var outline = document.createElementNS(namespace, circle ? "ellipse" : "rect");

        svg.classList.add("paint-board-temp-brush-svg");
        svg.style.left = left + "px";
        svg.style.top = top + "px";
        svg.style.width = size + "px";
        svg.style.height = size + "px";
        svg.setAttribute("viewBox", "0 0 " + size + " " + size);

        outline.classList.add("paint-board-temp-brush-outline");
        outline.setAttribute("stroke-width", screenPixel);

        if (innerSize === 0) {
            outline.classList.add("paint-board-temp-brush-outline-solid");
        }

        if (circle) {
            outline.setAttribute("cx", size / 2);
            outline.setAttribute("cy", size / 2);
            outline.setAttribute("rx", innerSize / 2);
            outline.setAttribute("ry", innerSize / 2);
        } else {
            outline.setAttribute("x", inset);
            outline.setAttribute("y", inset);
            outline.setAttribute("width", innerSize);
            outline.setAttribute("height", innerSize);
        }

        svg.appendChild(outline);

        tempLayer.tempShape = null;
        tempLayer.innerHTML = "";
        tempLayer.appendChild(svg);
    }

    function renderSquare(tempLayer, point) {
        renderShape(tempLayer, point, {
            oval: false
        });
    }

    function renderShape(tempLayer, point, options) {
        renderShapeFromPoints(tempLayer, tempLayer.tempShape.origin, point, options);
    }

    function getScreenPixelScale(tempLayer) {
        var board = tempLayer && tempLayer.closest ? tempLayer.closest(".paint-board") : null;
        var zoom;

        if (!board) {
            return 1;
        }

        zoom = parseFloat(board.getAttribute("data-zoom"));

        if (!zoom || isNaN(zoom)) {
            return 1;
        }

        return 1 / zoom;
    }

    function renderShapeFromPoints(tempLayer, fromPoint, toPoint, options) {
        var left = Math.min(fromPoint.x, toPoint.x);
        var top = Math.min(fromPoint.y, toPoint.y);
        var right = Math.max(fromPoint.x, toPoint.x);
        var bottom = Math.max(fromPoint.y, toPoint.y);
        var lineWeight = getScreenPixelScale(tempLayer);
        var lineColor = "#2563eb";
        var lineOpacity = 1;
        var guideOpacity = 0.5;
        var outlineOpacity = options && options.oval ? 0.5 : lineOpacity;
        var centerX;
        var centerY;
        var fragments;

        if (right === left) {
            right += 1;
        }

        if (bottom === top) {
            bottom += 1;
        }

        centerX = left + ((right - left) / 2);
        centerY = top + ((bottom - top) / 2);
        fragments = [
            "<svg class=\"paint-board-temp-line-svg\" xmlns=\"http://www.w3.org/2000/svg\">",
            getSvgRectString(left, top, right - left, bottom - top, lineWeight, lineColor, outlineOpacity),
            getSvgLineString(left, centerY, right, centerY, lineWeight, lineColor, guideOpacity),
            getSvgLineString(centerX, top, centerX, bottom, lineWeight, lineColor, guideOpacity)
        ];

        if (options && options.oval) {
            fragments.push(getSvgEllipseString(centerX, centerY, (right - left) / 2, (bottom - top) / 2, lineWeight, lineColor, lineOpacity));
        }

        fragments.push("</svg>");
        addCoordinateLabels(fragments, {
            x: left,
            y: top
        }, {
            x: centerX,
            y: centerY
        }, {
            x: right,
            y: bottom
        }, lineWeight);

        tempLayer.innerHTML = fragments.join("");
    }

    function addCoordinateLabels(fragments, startPoint, centerPoint, endPoint, scale) {
        var normalizedScale = typeof scale === "number" && scale > 0 ? scale : 1;
        var labelConfig = {
            bgOpacity: 0.5,
            borderColor: "blue",
            borderWidth: 1,
            bgColor: "white",
            fontSize: 10,
            offset: 7 * normalizedScale,
            scale: normalizedScale
        };

        if (!global.PaintBoardCoordinateLabel || !global.PaintBoardCoordinateLabel.getString) {
            return;
        }

        fragments.push(global.PaintBoardCoordinateLabel.getString(startPoint, labelConfig));
        fragments.push(global.PaintBoardCoordinateLabel.getString(centerPoint, labelConfig));
        fragments.push(global.PaintBoardCoordinateLabel.getString(endPoint, labelConfig));
    }

    function getSvgLineString(x1, y1, x2, y2, lineWeight, lineColor, opacity) {
        return "<line class=\"paint-board-temp-shape-guide\" " +
            "x1=\"" + escapeHtml(x1) + "\" y1=\"" + escapeHtml(y1) + "\" " +
            "x2=\"" + escapeHtml(x2) + "\" y2=\"" + escapeHtml(y2) + "\" " +
            "stroke=\"" + escapeHtml(lineColor) + "\" " +
            "stroke-width=\"" + escapeHtml(lineWeight) + "\" " +
            "stroke-opacity=\"" + escapeHtml(opacity) + "\"></line>";
    }

    function getSvgRectString(x, y, width, height, lineWeight, lineColor, opacity) {
        return "<rect class=\"paint-board-temp-shape-guide\" " +
            "x=\"" + escapeHtml(x) + "\" y=\"" + escapeHtml(y) + "\" " +
            "width=\"" + escapeHtml(width) + "\" height=\"" + escapeHtml(height) + "\" " +
            "fill=\"none\" stroke=\"" + escapeHtml(lineColor) + "\" " +
            "stroke-width=\"" + escapeHtml(lineWeight) + "\" " +
            "stroke-opacity=\"" + escapeHtml(opacity) + "\"></rect>";
    }

    function getSvgEllipseString(cx, cy, rx, ry, lineWeight, lineColor, opacity) {
        return "<ellipse class=\"paint-board-temp-shape-guide\" " +
            "cx=\"" + escapeHtml(cx) + "\" cy=\"" + escapeHtml(cy) + "\" " +
            "rx=\"" + escapeHtml(rx) + "\" ry=\"" + escapeHtml(ry) + "\" " +
            "fill=\"none\" stroke=\"" + escapeHtml(lineColor) + "\" " +
            "stroke-width=\"" + escapeHtml(lineWeight) + "\" " +
            "stroke-opacity=\"" + escapeHtml(opacity) + "\"></ellipse>";
    }

    function renderLine(tempLayer, point) {
        var origin = tempLayer.tempShape.origin;
        var lineWeight = getScreenPixelScale(tempLayer);
        var lineColor = "#2563eb";
        var lineOpacity = 1;
        var fragments;

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

        addCoordinateLabels(fragments, origin, null, point, lineWeight);

        tempLayer.innerHTML = fragments.join("");
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
