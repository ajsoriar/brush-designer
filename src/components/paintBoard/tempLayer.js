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

    function renderLine(tempLayer, point) {
        var origin = tempLayer.tempShape.origin;
        var lineWeight = 1;
        var lineColor = "#2563eb";
        var lineOpacity = 1;

        if (!global.dljs || !global.dljs.getLineString) {
            return;
        }

        tempLayer.innerHTML = global.dljs.getLineString(
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
        );
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
        clear: clear
    };

}(window));
