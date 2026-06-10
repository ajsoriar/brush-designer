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

    function updateSquare(tempLayer, point) {
        if (!tempLayer || !tempLayer.tempShape || !point) {
            return;
        }

        renderSquare(tempLayer, point);
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
        var origin = tempLayer.tempShape.origin;
        var left = Math.min(origin.x, point.x);
        var top = Math.min(origin.y, point.y);
        var right = Math.max(origin.x, point.x);
        var bottom = Math.max(origin.y, point.y);
        var lineWeight = 1;
        var lineColor = "#2563eb";
        var lineOpacity = 1;

        if (right === left) {
            right += 1;
        }

        if (bottom === top) {
            bottom += 1;
        }

        if (!global.dljs || !global.dljs.getLineString) {
            return;
        }

        tempLayer.innerHTML = [
            global.dljs.getLineString("temp-top", left, top, right, top, lineWeight, lineColor, lineOpacity, false, 0, null),
            global.dljs.getLineString("temp-right", right, top, right, bottom, lineWeight, lineColor, lineOpacity, false, 0, null),
            global.dljs.getLineString("temp-bottom", left, bottom, right, bottom, lineWeight, lineColor, lineOpacity, false, 0, null),
            global.dljs.getLineString("temp-left", left, top, left, bottom, lineWeight, lineColor, lineOpacity, false, 0, null)
        ].join("");
    }

    global.PaintBoardTempLayer = {
        create: createTempLayer,
        setSize: setSize,
        startSquare: startSquare,
        updateSquare: updateSquare,
        showCircle: showCircle,
        clear: clear
    };

}(window));
