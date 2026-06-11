(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 640,
        height: 480,
        backgroundColor: "#ffffff",
        paintOnPointer: true,
        brushSize: 1,
        className: "",
        onSave: null
    };

    var PAINT_TOOL_MODES = {
        SQUARED_POINTS: "SQUARED-POINTS",
        ROUND_POINTS: "ROUND-POINTS",
        SQUARED_LINES: "SQUARED-LINES",
        ROUND_LINES: "ROUND-LINES",
        FILLED_SQUARES: "FILLED-SQUARES",
        FILLED_RECTANGLES: "FILLED-RECTANGLES",
        FILLED_CIRCLES: "FILLED-CIRCLES",
        FILLED_OVALS: "FILLED-OVALS",
        STROKED_SQUARES: "STROKED-SQUARES",
        STROKED_RECTANGLES: "STROKED-RECTANGLES",
        STROKED_CIRCLES: "STROKED-CIRCLES",
        STROKED_OVALS: "STROKED-OVALS",
        PAINT_BUCKET: "PAINT-BUCKET",
        PATTERN_BUCKET: "PATTERN-BUCKET",
        GRADIENT: "GRADIENT",
        INK_DROPPER: "INK-DROPPER",
        OLD_BRUSH: "OLD-BRUSH",
        DESIGNED_BRUSH: "DESIGNED-BRUSH",
        DESIGNED_BRUSH_2: "DESIGNED-BRUSH-2"
    };

    var currentPaintToolMode = PAINT_TOOL_MODES.SQUARED_POINTS;

    var PaintTools = {
        modes: PAINT_TOOL_MODES,
        use: function(mode) {
            var normalizedMode = String(mode || "").toUpperCase();

            if (!isValidPaintToolMode(normalizedMode)) {
                throw new Error("Unknown paint tool mode: " + mode);
            }

            currentPaintToolMode = normalizedMode;
            notifyPaintToolModeChange(currentPaintToolMode);
            return currentPaintToolMode;
        },
        getMode: function() {
            return currentPaintToolMode;
        }
    };

    function isValidPaintToolMode(mode) {
        var key;

        for (key in PAINT_TOOL_MODES) {
            if (Object.prototype.hasOwnProperty.call(PAINT_TOOL_MODES, key) && PAINT_TOOL_MODES[key] === mode) {
                return true;
            }
        }

        return false;
    }

    function notifyPaintToolModeChange(mode) {
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-tools-change", {
                detail: {
                    mode: mode
                }
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-tools-change", false, false, {
                mode: mode
            });
        }

        global.dispatchEvent(event);
    }

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function PaintBoard(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var boardId = config.id || ("paint-board-" + Date.now());
        var baseLayerId = boardId + "-layer-1";
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var layers = document.createElement("ol");
        var baseLayer = document.createElement("li");
        var canvas = document.createElement("canvas");
        var tempLayer = createTempLayer(config.width, config.height);
        var context;
        var isPainting = false;
        var activePointerId = null;
        var supportsPointerEvents = typeof global.PointerEvent === "function";
        var clearPreviewOnPaintToolChange = function(event) {
            var mode = event.detail && event.detail.mode;

            if (mode !== PAINT_TOOL_MODES.OLD_BRUSH) {
                clearRetroBrushPreview(board);
            }
        };
        var stopPainting = function(event) {
            if (isPainting && isShapeToolMode() && board.pointerStartPosition) {
                paintShapePointerEvent(board, event);
            }

            if (isPainting && currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT && board.pointerStartPosition) {
                paintGradientPointerEvent(board, event);
            }

            if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH && isPointerInsideCanvas(board, event)) {
                updateRetroBrushPreview(board, event);
            } else {
                clearTempSquare(board);
            }
            isPainting = false;
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            board.pointerStartPosition = null;
        };
        var board;
        var startPainting = function(event) {
            if (!isPrimaryPaintInput(event)) {
                return;
            }

            if (supportsPointerEvents) {
                activePointerId = event.pointerId;
                capturePointer(canvas, event.pointerId);
            }

            isPainting = true;
            startTempPreview(board, event);
            updateRetroBrushPreview(board, event);
            startPointerAction(board, event);
        };
        var continuePainting = function(event) {
            if (!isActivePaintInput(event, activePointerId)) {
                return;
            }

            updateRetroBrushPreview(board, event);

            if (!isPainting) {
                return;
            }

            updateTempPreview(board, event);
            continuePointerAction(board, event);
        };
        var endPainting = function(event) {
            if (!isActivePaintInput(event, activePointerId)) {
                return;
            }

            stopPainting(event);
            activePointerId = null;
        };
        var leaveCanvas = function() {
            if (isShapeToolMode()) {
                return;
            }

            isPainting = false;
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            activePointerId = null;
            clearRetroBrushPreview(board);
        };

        element.id = boardId;
        element.className = "paint-board";

        if (config.className) {
            element.className += " " + config.className;
        }

        element.style.width = config.width + "px";
        element.style.height = config.height + "px";
        element.style.backgroundColor = config.backgroundColor;

        layers.id = boardId + "-layers";
        layers.className = "paint-board-layers";
        layers.style.width = config.width + "px";
        layers.style.height = config.height + "px";

        baseLayer.id = baseLayerId;
        baseLayer.className = "paint-board-layer";
        baseLayer.setAttribute("data-layer", baseLayerId);
        baseLayer.style.width = config.width + "px";
        baseLayer.style.height = config.height + "px";

        canvas.id = boardId + "-canvas";
        canvas.className = "paint-board-canvas";
        canvas.width = config.width;
        canvas.height = config.height;
        canvas.style.width = config.width + "px";
        canvas.style.height = config.height + "px";

        baseLayer.appendChild(canvas);
        layers.appendChild(baseLayer);
        element.appendChild(layers);
        element.appendChild(tempLayer);
        container.appendChild(element);

        context = canvas.getContext("2d");
        context.fillStyle = config.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        board = {
            id: boardId,
            element: element,
            layersElement: layers,
            tempLayerElement: tempLayer,
            activeLayerElement: baseLayer,
            activeLayerId: baseLayerId,
            canvas: canvas,
            context: context,
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor,
            paintColor: getOppositeColor(config.backgroundColor),
            brushSize: config.brushSize,
            lastPointerPosition: null,
            designedBrush2Stroke: null,
            pointerStartPosition: null,
            clear: function() {
                clear(board);
            },
            paintAt: function(x, y) {
                paintAt(board, x, y);
            },
            drawImage: function(image, x, y) {
                drawImage(board, image, x, y);
            },
            setSize: function(width, height) {
                setSize(board, width, height);
            },
            setBackgroundColor: function(backgroundColor) {
                setBackgroundColor(board, backgroundColor);
            },
            save: function() {
                return save(board, config);
            },
            destroy: function() {
                destroy(board, {
                    supportsPointerEvents: supportsPointerEvents,
                    startPainting: startPainting,
                    continuePainting: continuePainting,
                    endPainting: endPainting,
                    leaveCanvas: leaveCanvas
                }, clearPreviewOnPaintToolChange);
            }
        };

        if (config.paintOnPointer) {
            if (supportsPointerEvents) {
                canvas.addEventListener("pointerdown", startPainting);
                canvas.addEventListener("pointermove", continuePainting);
                document.addEventListener("pointerup", endPainting);
                document.addEventListener("pointercancel", endPainting);
                canvas.addEventListener("pointerleave", leaveCanvas);
            } else {
                canvas.addEventListener("mousedown", startPainting);
                canvas.addEventListener("mousemove", continuePainting);
                document.addEventListener("mouseup", endPainting);
                canvas.addEventListener("mouseleave", leaveCanvas);
            }

            global.addEventListener("paint-tools-change", clearPreviewOnPaintToolChange);
        }

        return board;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "paint-board-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("PaintBoard container not found: " + containerId);
        }

        return container;
    }

    function clear(board) {
        board.context.clearRect(0, 0, board.canvas.width, board.canvas.height);
        board.context.fillStyle = board.backgroundColor;
        board.context.fillRect(0, 0, board.canvas.width, board.canvas.height);
    }

    function createTempLayer(width, height) {
        if (global.PaintBoardTempLayer && global.PaintBoardTempLayer.create) {
            return global.PaintBoardTempLayer.create({
                width: width,
                height: height
            });
        }

        return document.createElement("div");
    }

    function setSize(board, width, height) {
        board.width = width;
        board.height = height;
        board.element.style.width = width + "px";
        board.element.style.height = height + "px";
        board.layersElement.style.width = width + "px";
        board.layersElement.style.height = height + "px";
        setTempLayerSize(board.tempLayerElement, width, height);
        board.activeLayerElement.style.width = width + "px";
        board.activeLayerElement.style.height = height + "px";
        board.canvas.width = width;
        board.canvas.height = height;
        board.canvas.style.width = width + "px";
        board.canvas.style.height = height + "px";
        clear(board);
    }

    function setTempLayerSize(tempLayer, width, height) {
        if (global.PaintBoardTempLayer && global.PaintBoardTempLayer.setSize) {
            global.PaintBoardTempLayer.setSize(tempLayer, width, height);
            return;
        }

        if (!tempLayer) {
            return;
        }

        tempLayer.style.width = width + "px";
        tempLayer.style.height = height + "px";
    }

    function setBackgroundColor(board, backgroundColor) {
        board.backgroundColor = backgroundColor;
        board.paintColor = getOppositeColor(backgroundColor);
        board.element.style.backgroundColor = backgroundColor;
        clear(board);
    }

    function getPointerPosition(board, event) {
        var rect = board.canvas.getBoundingClientRect();
        var scaleX = board.canvas.width / rect.width;
        var scaleY = board.canvas.height / rect.height;

        return {
            x: clamp(Math.floor((event.clientX - rect.left) * scaleX), 0, board.canvas.width),
            y: clamp(Math.floor((event.clientY - rect.top) * scaleY), 0, board.canvas.height)
        };
    }

    function isPointerInsideCanvas(board, event) {
        var rect;

        if (!event) {
            return false;
        }

        rect = board.canvas.getBoundingClientRect();

        return event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
    }

    function isPrimaryPaintInput(event) {
        if (!event) {
            return false;
        }

        if (typeof event.isPrimary === "boolean" && !event.isPrimary) {
            return false;
        }

        if (event.type && event.type.indexOf("mouse") === 0 && event.button !== 0) {
            return false;
        }

        if (event.type && event.type.indexOf("pointer") === 0 && event.button !== 0) {
            return false;
        }

        return true;
    }

    function isActivePaintInput(event, activePointerId) {
        if (!event) {
            return false;
        }

        if (typeof event.pointerId === "number" && activePointerId !== null && event.pointerId !== activePointerId) {
            return false;
        }

        return true;
    }

    function capturePointer(canvas, pointerId) {
        if (typeof canvas.setPointerCapture !== "function") {
            return;
        }

        try {
            canvas.setPointerCapture(pointerId);
        } catch (error) {
            return;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function startTempPreview(board, event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            startGradientPreview(board, event);
            return;
        }

        startTempSquare(board, event);
    }

    function updateTempPreview(board, event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            updateGradientPreview(board, event);
            return;
        }

        updateTempSquare(board, event);
    }

    function startTempSquare(board, event) {
        if (!isTempPreviewToolMode()) {
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.startSquare) {
            return;
        }

        global.PaintBoardTempLayer.startSquare(board.tempLayerElement, getPointerPosition(board, event));
    }

    function updateTempSquare(board, event) {
        if (!isTempPreviewToolMode()) {
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.updateSquare) {
            return;
        }

        global.PaintBoardTempLayer.updateSquare(board.tempLayerElement, getPointerPosition(board, event));
    }

    function clearTempSquare(board) {
        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.clear) {
            return;
        }

        global.PaintBoardTempLayer.clear(board.tempLayerElement);
    }

    function startGradientPreview(board, event) {
        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.startLine) {
            return;
        }

        global.PaintBoardTempLayer.startLine(board.tempLayerElement, getPointerPosition(board, event));
    }

    function updateGradientPreview(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint;

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.updateLine) {
            return;
        }

        if (!fromPoint) {
            return;
        }

        toPoint = getGradientEndPoint(fromPoint, getPointerPosition(board, event), event);
        global.PaintBoardTempLayer.updateLine(board.tempLayerElement, toPoint);
    }

    function updateRetroBrushPreview(board, event) {
        var point;
        var brush;

        if (currentPaintToolMode !== PAINT_TOOL_MODES.OLD_BRUSH) {
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.showCircle) {
            return;
        }

        point = getPointerPosition(board, event);
        brush = getCurrentRetroBrush();
        global.PaintBoardTempLayer.showCircle(board.tempLayerElement, point, Math.max(1, brush.size / 2));
    }

    function clearRetroBrushPreview(board) {
        clearTempSquare(board);
    }

    function startPointerAction(board, event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.INK_DROPPER) {
            event.preventDefault();
            inkDropperPointerEvent(board, event);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.PAINT_BUCKET) {
            event.preventDefault();
            paintBucketPointerEvent(board, event);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.PATTERN_BUCKET) {
            event.preventDefault();
            patternBucketPointerEvent(board, event);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            event.preventDefault();
            board.pointerStartPosition = getPointerPosition(board, event);
            return;
        }

        if (isShapeToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getPointerPosition(board, event);
            return;
        }

        paintPointerEvent(board, event);
    }

    function continuePointerAction(board, event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.INK_DROPPER) {
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.PAINT_BUCKET) {
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.PATTERN_BUCKET) {
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            return;
        }

        if (isShapeToolMode()) {
            return;
        }

        paintPointerEvent(board, event);
    }

    function paintPointerEvent(board, event) {
        var point = getPointerPosition(board, event);

        event.preventDefault();

        if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH && board.lastPointerPosition) {
            paintOldBrushLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES && board.lastPointerPosition) {
            paintSquaredLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES && board.lastPointerPosition) {
            paintRoundLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH) {
            paintDesignedBrush(board, point.x, point.y);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH_2) {
            paintDesignedBrush2(board, point.x, point.y);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_POINTS) {
            paintRoundPoint(board, point.x, point.y);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH) {
            paintOldBrushStamp(board, point.x, point.y);
        } else {
            paintSquaredPoint(board, point.x, point.y);
        }

        board.lastPointerPosition = point;
    }

    function paintShapePointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint = getPointerPosition(board, event);

        if (!fromPoint) {
            return;
        }

        event.preventDefault();
        paintShape(board, fromPoint, toPoint);
    }

    function paintGradientPointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint = getGradientEndPoint(fromPoint, getPointerPosition(board, event), event);

        if (!fromPoint) {
            return;
        }

        event.preventDefault();
        paintGradient(board, fromPoint, toPoint);
    }

    function getGradientEndPoint(fromPoint, toPoint, event) {
        var dx;
        var dy;

        if (!fromPoint || !toPoint || !event || !event.shiftKey) {
            return toPoint;
        }

        dx = Math.abs(toPoint.x - fromPoint.x);
        dy = Math.abs(toPoint.y - fromPoint.y);

        if (dx >= dy) {
            return {
                x: toPoint.x,
                y: fromPoint.y
            };
        }

        return {
            x: fromPoint.x,
            y: toPoint.y
        };
    }

    function paintBucketPointerEvent(board, event) {
        var point = getPointerPosition(board, event);

        paintBucket(board, point.x, point.y);
    }

    function patternBucketPointerEvent(board, event) {
        var point = getPointerPosition(board, event);

        paintPatternBucket(board, point.x, point.y);
    }

    function inkDropperPointerEvent(board, event) {
        var point = getPointerPosition(board, event);
        var imageData = board.context.getImageData(point.x, point.y, 1, 1);
        var color = pixelDataToHex(imageData.data);

        notifyInkDropperColorSelected(color, board, point);
    }

    function paintAt(board, x, y) {
        paintSquaredPoint(board, x, y);
    }

    function paintSquaredPoint(board, x, y) {
        var size = Math.max(1, getCurrentBrushSize(board));
        var offset = Math.floor(size / 2);

        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.fillRect(x - offset, y - offset, size, size);
    }

    function paintRoundPoint(board, x, y) {
        var size = Math.max(1, getCurrentBrushSize(board));
        var radius = size / 2;

        board.context.beginPath();
        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.arc(x, y, radius, 0, Math.PI * 2);
        board.context.fill();
    }

    function paintSquaredLine(board, fromPoint, toPoint) {
        paintLine(board, fromPoint, toPoint, "square", "miter");
    }

    function paintRoundLine(board, fromPoint, toPoint) {
        paintLine(board, fromPoint, toPoint, "round", "round");
    }

    function paintOldBrushLine(board, fromPoint, toPoint) {
        var brush = getCurrentRetroBrush();
        var size = Math.max(1, brush.size);
        var spacing = Math.max(1, Math.floor(size / 5));
        var dx = toPoint.x - fromPoint.x;
        var dy = toPoint.y - fromPoint.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var steps = Math.max(1, Math.ceil(distance / spacing));
        var i;
        var t;

        for (i = 0; i <= steps; i++) {
            t = i / steps;
            paintOldBrushStamp(board, fromPoint.x + dx * t, fromPoint.y + dy * t);
        }
    }

    function paintOldBrushStamp(board, x, y) {
        var brush = getCurrentRetroBrush();
        var size = Math.max(1, brush.size);
        var radius = Math.max(1, size / 2);
        var color = getCurrentPaintColor(board);
        var dotSize = Math.max(1, brush.pointSize);
        var step = dotSize + Math.max(0, brush.pointSpacing);
        var phaseX = positiveModulo(Math.round(x), step);
        var phaseY = positiveModulo(Math.round(y), step);
        var left = Math.floor(x - radius);
        var top = Math.floor(y - radius);
        var right = Math.ceil(x + radius);
        var bottom = Math.ceil(y + radius);
        var px;
        var py;
        var dx;
        var dy;

        board.context.fillStyle = color;

        for (py = top - positiveModulo(top - phaseY, step); py <= bottom; py += step) {
            for (px = left - positiveModulo(left - phaseX, step); px <= right; px += step) {
                dx = px - x;
                dy = py - y;

                if ((dx * dx) + (dy * dy) <= radius * radius) {
                    board.context.fillRect(Math.round(px), Math.round(py), dotSize, dotSize);
                }
            }
        }
    }

    function positiveModulo(value, divisor) {
        return ((value % divisor) + divisor) % divisor;
    }

    function paintLine(board, fromPoint, toPoint, lineCap, lineJoin) {
        var size = Math.max(1, getCurrentBrushSize(board));

        board.context.beginPath();
        board.context.strokeStyle = getCurrentPaintColor(board);
        board.context.lineWidth = size;
        board.context.lineCap = lineCap;
        board.context.lineJoin = lineJoin;
        board.context.moveTo(fromPoint.x, fromPoint.y);
        board.context.lineTo(toPoint.x, toPoint.y);
        board.context.stroke();
    }

    function paintDesignedBrush(board, x, y) {
        var brush = getCurrentDesignedBrush();
        var width;
        var height;
        var tintedBrush;

        if (!brush) {
            paintRoundPoint(board, x, y);
            return;
        }

        width = brush.naturalWidth || brush.width;
        height = brush.naturalHeight || brush.height;
        tintedBrush = getTintedBrush(brush, width, height, getCurrentPaintColor(board));
        board.context.drawImage(tintedBrush, x - width / 2, y - height / 2, width, height);
    }

    function paintDesignedBrush2(board, x, y) {
        var brush = getCurrentDesignedBrush2();
        var brushConfig;
        var width;
        var height;
        var tintedBrush;

        if (!brush) {
            paintRoundPoint(board, x, y);
            return;
        }

        brushConfig = brush.brush || {};
        if (brushConfig.algorithm === "B") {
            board.designedBrush2Stroke = null;
            paintDesignedBrush2Grid(board, brush, brushConfig, x, y);
            return;
        }

        if (brushConfig.algorithm === "C") {
            paintDesignedBrush2Continuous(board, brush, brushConfig, x, y);
            return;
        }

        width = brush.naturalWidth || brush.width;
        height = brush.naturalHeight || brush.height;
        board.designedBrush2Stroke = null;
        tintedBrush = getTintedBrush(brush, width, height, getCurrentPaintColor(board));
        board.context.drawImage(tintedBrush, x - width / 2, y - height / 2, width, height);
    }

    function paintDesignedBrush2Grid(board, brush, brushConfig, x, y) {
        var gridSize = Math.max(10, parseInt(brushConfig.gridSize, 10) || 200);
        var gridX = Math.round(x / gridSize) * gridSize;
        var gridY = Math.round(y / gridSize) * gridSize;
        var width = brush.naturalWidth || brush.width;
        var height = brush.naturalHeight || brush.height;
        var tintedBrush = getTintedBrush(brush, width, height, getCurrentPaintColor(board));

        board.context.drawImage(tintedBrush, gridX - width / 2, gridY - height / 2, width, height);
    }

    function paintDesignedBrush2Continuous(board, brush, brushConfig, x, y) {
        var width = brush.naturalWidth || brush.width;
        var height = brush.naturalHeight || brush.height;
        var spacing = Math.max(1, width * 0.15);
        var stroke = board.designedBrush2Stroke;
        var tintedBrush = getTintedBrush(brush, width, height, getCurrentPaintColor(board));
        var dx;
        var dy;
        var distance;
        var travel;
        var t;
        var stampX;
        var stampY;

        if (!stroke || stroke.algorithm !== brushConfig.algorithm || stroke.brush !== brush) {
            stampDesignedBrush(board, tintedBrush, width, height, x, y);
            board.designedBrush2Stroke = {
                algorithm: brushConfig.algorithm,
                brush: brush,
                x: x,
                y: y,
                remainder: 0
            };
            return;
        }

        dx = x - stroke.x;
        dy = y - stroke.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return;
        }

        travel = spacing - stroke.remainder;
        while (travel <= distance) {
            t = travel / distance;
            stampX = stroke.x + dx * t;
            stampY = stroke.y + dy * t;
            stampDesignedBrush(board, tintedBrush, width, height, stampX, stampY);
            travel += spacing;
        }

        board.designedBrush2Stroke = {
            algorithm: brushConfig.algorithm,
            brush: brush,
            x: x,
            y: y,
            remainder: (stroke.remainder + distance) % spacing
        };
    }

    function stampDesignedBrush(board, brush, width, height, x, y) {
        board.context.drawImage(brush, x - width / 2, y - height / 2, width, height);
    }

    function paintBucket(board, x, y) {
        var imageData = board.context.getImageData(0, 0, board.canvas.width, board.canvas.height);
        var data = imageData.data;
        var targetColor = getPixelColor(data, imageData.width, x, y);
        var fillColor = getRgb(getCurrentPaintColor(board));
        var stack;
        var point;
        var index;

        if (colorsMatch(targetColor, fillColor)) {
            return;
        }

        fillColor.a = 255;
        stack = [{ x: x, y: y }];

        while (stack.length) {
            point = stack.pop();

            if (point.x < 0 || point.x >= imageData.width || point.y < 0 || point.y >= imageData.height) {
                continue;
            }

            index = getPixelIndex(imageData.width, point.x, point.y);

            if (!colorsMatchAt(data, index, targetColor)) {
                continue;
            }

            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = 255;

            stack.push({ x: point.x + 1, y: point.y });
            stack.push({ x: point.x - 1, y: point.y });
            stack.push({ x: point.x, y: point.y + 1 });
            stack.push({ x: point.x, y: point.y - 1 });
        }

        board.context.putImageData(imageData, 0, 0);
    }

    function paintPatternBucket(board, x, y) {
        var pattern = getCurrentPattern();
        var patternData;
        var imageData;
        var data;
        var targetColor;
        var stack;
        var visited;
        var point;
        var index;
        var pixelIndex;
        var patternColor;
        var frontColor = getRgb(getCurrentPaintColor(board));
        var useFrontColor = getCurrentPatternUseFrontColor();

        if (!pattern || !pattern.image || !pattern.image.complete) {
            return;
        }

        patternData = getPatternImageData(pattern);

        if (!patternData) {
            return;
        }

        imageData = board.context.getImageData(0, 0, board.canvas.width, board.canvas.height);
        data = imageData.data;
        targetColor = getPixelColor(data, imageData.width, x, y);
        stack = [{ x: x, y: y }];
        visited = new Uint8Array(imageData.width * imageData.height);

        while (stack.length) {
            point = stack.pop();

            if (point.x < 0 || point.x >= imageData.width || point.y < 0 || point.y >= imageData.height) {
                continue;
            }

            pixelIndex = (point.y * imageData.width) + point.x;

            if (visited[pixelIndex]) {
                continue;
            }

            visited[pixelIndex] = 1;
            index = getPixelIndex(imageData.width, point.x, point.y);

            if (!colorsMatchAt(data, index, targetColor)) {
                continue;
            }

            patternColor = getPatternPixelColor(patternData, point.x, point.y, frontColor, useFrontColor);
            data[index] = patternColor.r;
            data[index + 1] = patternColor.g;
            data[index + 2] = patternColor.b;
            data[index + 3] = patternColor.a;

            stack.push({ x: point.x + 1, y: point.y });
            stack.push({ x: point.x - 1, y: point.y });
            stack.push({ x: point.x, y: point.y + 1 });
            stack.push({ x: point.x, y: point.y - 1 });
        }

        board.context.putImageData(imageData, 0, 0);
    }

    function getPatternImageData(pattern) {
        var canvas;
        var context;
        var width = Math.max(1, pattern.width || pattern.size || 16);
        var height = Math.max(1, pattern.height || pattern.size || width);

        if (pattern.imageData) {
            return pattern.imageData;
        }

        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext("2d");
        context.drawImage(pattern.image, 0, 0, width, height);
        pattern.imageData = context.getImageData(0, 0, width, height);

        return pattern.imageData;
    }

    function getPatternPixelColor(patternData, x, y, frontColor, useFrontColor) {
        var px = positiveModulo(x, patternData.width);
        var py = positiveModulo(y, patternData.height);
        var index = getPixelIndex(patternData.width, px, py);
        var data = patternData.data;
        var brightness;

        if (useFrontColor) {
            brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;

            if (brightness < 128) {
                return {
                    r: frontColor.r,
                    g: frontColor.g,
                    b: frontColor.b,
                    a: data[index + 3]
                };
            }
        }

        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }

    function getPixelIndex(width, x, y) {
        return ((y * width) + x) * 4;
    }

    function getPixelColor(data, width, x, y) {
        var index = getPixelIndex(width, x, y);

        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }

    function pixelDataToHex(data) {
        return "#" + toHex(data[0]) + toHex(data[1]) + toHex(data[2]);
    }

    function toHex(value) {
        var text = Math.max(0, Math.min(255, value)).toString(16);

        return text.length === 1 ? "0" + text : text;
    }

    function notifyInkDropperColorSelected(color, board, point) {
        var event;
        var detail = {
            color: color,
            board: board.element,
            paintBoard: board,
            x: point.x,
            y: point.y
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-color-picked", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-color-picked", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function colorsMatchAt(data, index, color) {
        return data[index] === color.r &&
            data[index + 1] === color.g &&
            data[index + 2] === color.b &&
            data[index + 3] === color.a;
    }

    function colorsMatch(left, right) {
        return left.r === right.r &&
            left.g === right.g &&
            left.b === right.b &&
            (left.a === undefined || right.a === undefined || left.a === right.a);
    }

    function getTintedBrush(brush, width, height, color) {
        var canvas = document.createElement("canvas");
        var context;

        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext("2d");
        context.drawImage(brush, 0, 0, width, height);
        context.globalCompositeOperation = "source-in";
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);

        return canvas;
    }

    function paintShape(board, fromPoint, toPoint) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.FILLED_SQUARES) {
            paintSquare(board, fromPoint, toPoint, true);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.FILLED_RECTANGLES) {
            paintRectangle(board, fromPoint, toPoint, true);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.FILLED_CIRCLES) {
            paintCircle(board, fromPoint, toPoint, true);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.STROKED_SQUARES) {
            paintSquare(board, fromPoint, toPoint, false);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.STROKED_RECTANGLES) {
            paintRectangle(board, fromPoint, toPoint, false);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.STROKED_CIRCLES) {
            paintCircle(board, fromPoint, toPoint, false);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.FILLED_OVALS) {
            paintOval(board, fromPoint, toPoint, true);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.STROKED_OVALS) {
            paintOval(board, fromPoint, toPoint, false);
        }
    }

    function paintGradient(board, fromPoint, toPoint) {
        var gradientConfig = getCurrentGradient();
        var gradient = createCanvasGradient(board, gradientConfig, fromPoint, toPoint);
        var stops = gradientConfig.stops || [];
        var i;
        var stop;

        for (i = 0; i < stops.length; i++) {
            stop = stops[i];
            gradient.addColorStop(clamp(stop.offset, 0, 1), stop.color);
        }

        board.context.fillStyle = gradient;
        board.context.fillRect(0, 0, board.canvas.width, board.canvas.height);
    }

    function createCanvasGradient(board, gradientConfig, fromPoint, toPoint) {
        var dx;
        var dy;
        var radius;

        if (gradientConfig.type === "radial") {
            dx = toPoint.x - fromPoint.x;
            dy = toPoint.y - fromPoint.y;
            radius = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));

            return board.context.createRadialGradient(
                fromPoint.x,
                fromPoint.y,
                0,
                fromPoint.x,
                fromPoint.y,
                radius
            );
        }

        if (fromPoint.x === toPoint.x && fromPoint.y === toPoint.y) {
            toPoint = {
                x: fromPoint.x + 1,
                y: fromPoint.y
            };
        }

        return board.context.createLinearGradient(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
    }

    function paintSquare(board, fromPoint, toPoint, fill) {
        paintRectangle(board, fromPoint, getSquareEndPoint(fromPoint, toPoint), fill);
    }

    function paintCircle(board, fromPoint, toPoint, fill) {
        paintOval(board, fromPoint, getSquareEndPoint(fromPoint, toPoint), fill);
    }

    function paintRectangle(board, fromPoint, toPoint, fill) {
        var rect = getShapeRect(fromPoint, toPoint);

        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.strokeStyle = getCurrentPaintColor(board);
        board.context.lineWidth = Math.max(1, getCurrentBrushSize(board));

        if (fill) {
            board.context.fillRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            board.context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    function paintOval(board, fromPoint, toPoint, fill) {
        var rect = getShapeRect(fromPoint, toPoint);

        board.context.beginPath();
        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.strokeStyle = getCurrentPaintColor(board);
        board.context.lineWidth = Math.max(1, getCurrentBrushSize(board));
        board.context.ellipse(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
            Math.abs(rect.width / 2),
            Math.abs(rect.height / 2),
            0,
            0,
            Math.PI * 2
        );

        if (fill) {
            board.context.fill();
        } else {
            board.context.stroke();
        }
    }

    function getShapeRect(fromPoint, toPoint) {
        return {
            x: Math.min(fromPoint.x, toPoint.x),
            y: Math.min(fromPoint.y, toPoint.y),
            width: Math.abs(toPoint.x - fromPoint.x),
            height: Math.abs(toPoint.y - fromPoint.y)
        };
    }

    function getSquareEndPoint(fromPoint, toPoint) {
        var width = toPoint.x - fromPoint.x;
        var height = toPoint.y - fromPoint.y;
        var side = Math.max(Math.abs(width), Math.abs(height));

        return {
            x: fromPoint.x + (width < 0 ? -side : side),
            y: fromPoint.y + (height < 0 ? -side : side)
        };
    }

    function isShapeToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.FILLED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_OVALS ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_OVALS;
    }

    function isTempPreviewToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.FILLED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_OVALS ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_OVALS;
    }

    function drawImage(board, image, x, y) {
        board.context.drawImage(image, x || 0, y || 0);
    }

    function getCurrentPaintColor(board) {
        if (global.App && global.App.memory && global.App.memory.currentColor) {
            return global.App.memory.currentColor;
        }

        return board.paintColor;
    }

    function getCurrentBrushSize(board) {
        if (global.App && global.App.memory && global.App.memory.currentLineWidth) {
            return global.App.memory.currentLineWidth;
        }

        return board.brushSize;
    }

    function getCurrentDesignedBrush() {
        if (global.App && global.App.memory && global.App.memory.currentDesignedBrush) {
            return global.App.memory.currentDesignedBrush;
        }

        return null;
    }

    function getCurrentDesignedBrush2() {
        if (global.App && global.App.memory && global.App.memory.currentDesignedBrush2) {
            return global.App.memory.currentDesignedBrush2;
        }

        return null;
    }

    function getCurrentRetroBrush() {
        var brush = global.App && global.App.memory && global.App.memory.currentRetroBrush;

        return {
            size: normalizeBrushNumber(brush && brush.size, 100),
            pointSpacing: normalizeBrushNumber(brush && brush.pointSpacing, 2),
            pointSize: normalizeBrushNumber(brush && brush.pointSize, 1)
        };
    }

    function getCurrentPattern() {
        if (global.App && global.App.memory && global.App.memory.currentPattern) {
            return global.App.memory.currentPattern;
        }

        return null;
    }

    function getCurrentPatternUseFrontColor() {
        return !!(global.App && global.App.memory && global.App.memory.currentPatternUseFrontColor);
    }

    function getCurrentGradient() {
        if (global.App && global.App.memory && global.App.memory.currentGradient) {
            return global.App.memory.currentGradient;
        }

        return {
            type: "linear",
            stops: [
                {
                    offset: 0,
                    color: "#000000"
                },
                {
                    offset: 1,
                    color: "#ffffff"
                }
            ]
        };
    }

    function normalizeBrushNumber(value, fallback) {
        var number = Math.round(Number(value));

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.max(1, number);
    }

    function getOppositeColor(color) {
        var rgb = getRgb(color);

        return "rgb(" + (255 - rgb.r) + ", " + (255 - rgb.g) + ", " + (255 - rgb.b) + ")";
    }

    function getRgb(color) {
        var parser = document.createElement("span");
        var value;
        var parts;

        parser.style.color = color;
        document.body.appendChild(parser);
        value = global.getComputedStyle(parser).color;
        document.body.removeChild(parser);

        parts = value.match(/\d+/g);

        if (!parts || parts.length < 3) {
            return { r: 255, g: 255, b: 255 };
        }

        return {
            r: parseInt(parts[0], 10),
            g: parseInt(parts[1], 10),
            b: parseInt(parts[2], 10)
        };
    }

    function save(board, config) {
        var data = board.canvas.toDataURL("image/png");

        if (typeof config.onSave === "function") {
            config.onSave(data, board);
        }

        return data;
    }

    function destroy(board, paintHandlers, clearPreviewOnPaintToolChange) {
        if (paintHandlers && paintHandlers.supportsPointerEvents) {
            board.canvas.removeEventListener("pointerdown", paintHandlers.startPainting);
            board.canvas.removeEventListener("pointermove", paintHandlers.continuePainting);
            document.removeEventListener("pointerup", paintHandlers.endPainting);
            document.removeEventListener("pointercancel", paintHandlers.endPainting);
            board.canvas.removeEventListener("pointerleave", paintHandlers.leaveCanvas);
        } else if (paintHandlers) {
            board.canvas.removeEventListener("mousedown", paintHandlers.startPainting);
            board.canvas.removeEventListener("mousemove", paintHandlers.continuePainting);
            document.removeEventListener("mouseup", paintHandlers.endPainting);
            board.canvas.removeEventListener("mouseleave", paintHandlers.leaveCanvas);
        }

        global.removeEventListener("paint-tools-change", clearPreviewOnPaintToolChange);

        if (board.element.parentNode) {
            board.element.parentNode.removeChild(board.element);
        }
    }

    global.PaintBoard = PaintBoard;
    global.paintBoard = PaintBoard;
    global.PaintTools = PaintTools;

}(window));
