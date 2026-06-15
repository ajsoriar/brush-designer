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
        STRAIGHT_LINE: "STRAIGHT-LINE",
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

    function notifyUndoStateChange(board) {
        var event;
        var detail;

        if (!board) {
            return;
        }

        detail = {
            board: board.element,
            paintBoard: board,
            canUndo: !!board.undoSnapshot
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-undo-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-undo-change", false, false, detail);
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
            if (isPainting && isStraightLineToolMode() && board.pointerStartPosition) {
                paintStraightLinePointerEvent(board, event);
            }

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
            commitUndoableAction(board);
            isPainting = false;
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            board.pointerStartPosition = null;
            board.previewPointerPosition = null;
            board.previewModifierState = null;
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
            rememberPreviewInput(board, event);
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

            rememberPreviewInput(board, event);
            updateTempPreview(board, event);
            continuePointerAction(board, event);
        };
        var updatePreviewModifier = function(event) {
            if (!event || (event.key !== "Shift" && event.key !== "Alt")) {
                return;
            }

            if (!isPainting) {
                return;
            }

            event.preventDefault();
            updatePreviewModifierState(board, event);
            updateTempPreviewFromLastPoint(board, event);
        };
        var endPainting = function(event) {
            if (!isPainting) {
                return;
            }

            if (!isActivePaintInput(event, activePointerId)) {
                return;
            }

            rememberPreviewInput(board, event, true);
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
            board.previewPointerPosition = null;
            board.previewModifierState = null;
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
            previewPointerPosition: null,
            previewModifierState: null,
            designedBrush2Stroke: null,
            pointerStartPosition: null,
            undoSnapshot: null,
            pendingUndoSnapshot: null,
            actionHasChanges: false,
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
            undo: function() {
                return undo(board);
            },
            canUndo: function() {
                return !!board.undoSnapshot;
            },
            destroy: function() {
                destroy(board, {
                    supportsPointerEvents: supportsPointerEvents,
                    startPainting: startPainting,
                    continuePainting: continuePainting,
                    endPainting: endPainting,
                    leaveCanvas: leaveCanvas,
                    updatePreviewModifier: updatePreviewModifier
                }, clearPreviewOnPaintToolChange);
            }
        };

        if (config.paintOnPointer) {
            if (supportsPointerEvents) {
                canvas.addEventListener("pointerdown", startPainting);
                canvas.addEventListener("pointermove", continuePainting);
                document.addEventListener("pointerup", endPainting, true);
                document.addEventListener("pointercancel", endPainting, true);
                canvas.addEventListener("pointerleave", leaveCanvas);
            } else {
                canvas.addEventListener("mousedown", startPainting);
                canvas.addEventListener("mousemove", continuePainting);
                document.addEventListener("mouseup", endPainting, true);
                canvas.addEventListener("mouseleave", leaveCanvas);
            }

            document.addEventListener("keydown", updatePreviewModifier);
            document.addEventListener("keyup", updatePreviewModifier);
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
        beginUndoableAction(board);
        markUndoableChange(board);
        board.context.clearRect(0, 0, board.canvas.width, board.canvas.height);
        board.context.fillStyle = board.backgroundColor;
        board.context.fillRect(0, 0, board.canvas.width, board.canvas.height);
        commitUndoableAction(board);
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
        updateBoardRulesSize(board, width, height);
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
        beginUndoableAction(board);
        markUndoableChange(board);
        board.backgroundColor = backgroundColor;
        board.paintColor = getOppositeColor(backgroundColor);
        board.element.style.backgroundColor = backgroundColor;
        clear(board);
        commitUndoableAction(board);
    }

    function captureBoardSnapshot(board) {
        return {
            width: board.canvas.width,
            height: board.canvas.height,
            backgroundColor: board.backgroundColor,
            imageData: board.context.getImageData(0, 0, board.canvas.width, board.canvas.height)
        };
    }

    function restoreBoardSnapshot(board, snapshot) {
        if (!snapshot || !snapshot.imageData) {
            return false;
        }

        board.width = snapshot.width;
        board.height = snapshot.height;
        board.backgroundColor = snapshot.backgroundColor;
        board.paintColor = getOppositeColor(snapshot.backgroundColor);
        board.element.style.width = snapshot.width + "px";
        board.element.style.height = snapshot.height + "px";
        board.element.style.backgroundColor = snapshot.backgroundColor;
        board.layersElement.style.width = snapshot.width + "px";
        board.layersElement.style.height = snapshot.height + "px";
        setTempLayerSize(board.tempLayerElement, snapshot.width, snapshot.height);
        board.activeLayerElement.style.width = snapshot.width + "px";
        board.activeLayerElement.style.height = snapshot.height + "px";
        board.canvas.width = snapshot.width;
        board.canvas.height = snapshot.height;
        board.canvas.style.width = snapshot.width + "px";
        board.canvas.style.height = snapshot.height + "px";
        updateBoardRulesSize(board, snapshot.width, snapshot.height);
        board.context.putImageData(snapshot.imageData, 0, 0);
        return true;
    }

    function beginUndoableAction(board) {
        if (!board || board.pendingUndoSnapshot) {
            return;
        }

        board.pendingUndoSnapshot = captureBoardSnapshot(board);
        board.actionHasChanges = false;
    }

    function markUndoableChange(board) {
        if (!board || !board.pendingUndoSnapshot) {
            return;
        }

        board.actionHasChanges = true;
    }

    function commitUndoableAction(board) {
        if (!board) {
            return;
        }

        if (board.pendingUndoSnapshot && board.actionHasChanges) {
            board.undoSnapshot = board.pendingUndoSnapshot;
        }

        board.pendingUndoSnapshot = null;
        board.actionHasChanges = false;
        notifyUndoStateChange(board);
    }

    function undo(board) {
        var snapshot;

        if (!board || !board.undoSnapshot) {
            return false;
        }

        snapshot = board.undoSnapshot;
        board.undoSnapshot = null;
        board.pendingUndoSnapshot = null;
        board.actionHasChanges = false;
        board.lastPointerPosition = null;
        board.designedBrush2Stroke = null;
        board.pointerStartPosition = null;
        clearTempSquare(board);
        notifyUndoStateChange(board);
        return restoreBoardSnapshot(board, snapshot);
    }

    function getPointerPosition(board, event) {
        return getClampedPointerPosition(board, event);
    }

    function getClampedPointerPosition(board, event) {
        var rect = board.canvas.getBoundingClientRect();
        var scaleX = board.canvas.width / rect.width;
        var scaleY = board.canvas.height / rect.height;

        return {
            x: clamp(Math.floor((event.clientX - rect.left) * scaleX), 0, board.canvas.width),
            y: clamp(Math.floor((event.clientY - rect.top) * scaleY), 0, board.canvas.height)
        };
    }

    function getCanvasPointerPosition(board, event) {
        var rect = board.canvas.getBoundingClientRect();
        var scaleX;
        var scaleY;
        var x;
        var y;

        if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
            return null;
        }

        if (!isPointerInsideCanvas(board, event)) {
            return null;
        }

        scaleX = board.canvas.width / rect.width;
        scaleY = board.canvas.height / rect.height;
        x = Math.floor((event.clientX - rect.left) * scaleX);
        y = Math.floor((event.clientY - rect.top) * scaleY);

        return {
            x: clamp(x, 0, board.canvas.width),
            y: clamp(y, 0, board.canvas.height)
        };
    }

    function getEventPointerPosition(board, event) {
        if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
            return board.previewPointerPosition || board.pointerStartPosition;
        }

        return getPointerPosition(board, event);
    }

    function rememberPreviewInput(board, event, preserveModifiers) {
        var point;

        if (!board || !event) {
            return;
        }

        if (typeof event.clientX === "number" && typeof event.clientY === "number") {
            point = getCanvasPointerPosition(board, event);

            if (point) {
                board.previewPointerPosition = point;
            }
        }

        if (preserveModifiers) {
            return;
        }

        if (typeof event.shiftKey === "boolean" || typeof event.altKey === "boolean") {
            board.previewModifierState = {
                shiftKey: !!event.shiftKey,
                altKey: !!event.altKey
            };
        }
    }

    function updatePreviewModifierState(board, event) {
        var state;

        if (!board || !event) {
            return;
        }

        state = board.previewModifierState || {
            shiftKey: false,
            altKey: false
        };

        if (event.key === "Shift") {
            state.shiftKey = event.type !== "keyup";
        }

        if (event.key === "Alt") {
            state.altKey = event.type !== "keyup";
        }

        board.previewModifierState = state;
    }

    function getPreviewModifierEvent(board, event) {
        var state = (board && board.previewModifierState) || {};
        var source = event || {};

        return {
            shiftKey: typeof source.shiftKey === "boolean" ? source.shiftKey : !!state.shiftKey,
            altKey: typeof source.altKey === "boolean" ? source.altKey : !!state.altKey
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

        if (isStraightLineToolMode()) {
            startStraightLinePreview(board, event);
            return;
        }

        startTempSquare(board, event);
    }

    function updateTempPreview(board, event) {
        board.previewPointerPosition = getPointerPosition(board, event);

        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            updateGradientPreview(board, event);
            return;
        }

        if (isStraightLineToolMode()) {
            updateStraightLinePreview(board, event);
            return;
        }

        updateTempSquare(board, event);
    }

    function updateTempPreviewFromLastPoint(board, event) {
        if (!board || !board.previewPointerPosition) {
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            updateGradientPreviewToPoint(board, board.previewPointerPosition, event);
            return;
        }

        if (isStraightLineToolMode()) {
            updateStraightLinePreviewToPoint(board, board.previewPointerPosition, event);
            return;
        }

        updateTempSquareToPoint(board, board.previewPointerPosition, event);
    }

    function startTempSquare(board, event) {
        if (!isTempPreviewToolMode()) {
            return;
        }

        if (global.PaintBoardTempLayer && global.PaintBoardTempLayer.startShape) {
            global.PaintBoardTempLayer.startShape(board.tempLayerElement, getPointerPosition(board, event), {
                oval: isOvalToolMode()
            });
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.startSquare) {
            return;
        }

        global.PaintBoardTempLayer.startSquare(board.tempLayerElement, getPointerPosition(board, event));
    }

    function updateTempSquare(board, event) {
        updateTempSquareToPoint(board, getPointerPosition(board, event), event);
    }

    function updateTempSquareToPoint(board, rawPoint, event) {
        var point;
        var options;
        var points;

        if (!isTempPreviewToolMode()) {
            return;
        }

        if (global.PaintBoardTempLayer && global.PaintBoardTempLayer.updateShape) {
            points = getShapeDrawPoints(board.pointerStartPosition, rawPoint, getPreviewModifierEvent(board, event));
            options = {
                oval: isOvalToolMode()
            };
            if (global.PaintBoardTempLayer.updateShapeBounds) {
                global.PaintBoardTempLayer.updateShapeBounds(board.tempLayerElement, points.from, points.to, options);
            } else {
                global.PaintBoardTempLayer.updateShape(board.tempLayerElement, points.to, options);
            }
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.updateSquare) {
            return;
        }

        point = getShapeEndPoint(board.pointerStartPosition, rawPoint, getPreviewModifierEvent(board, event));
        global.PaintBoardTempLayer.updateSquare(board.tempLayerElement, point);
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
        updateGradientPreviewToPoint(board, getPointerPosition(board, event), event);
    }

    function updateGradientPreviewToPoint(board, rawPoint, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint;

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.updateLine) {
            return;
        }

        if (!fromPoint) {
            return;
        }

        toPoint = getGradientEndPoint(fromPoint, rawPoint, event);
        global.PaintBoardTempLayer.updateLine(board.tempLayerElement, toPoint);
    }

    function startStraightLinePreview(board, event) {
        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.startLine) {
            return;
        }

        global.PaintBoardTempLayer.startLine(board.tempLayerElement, getPointerPosition(board, event));
    }

    function updateStraightLinePreview(board, event) {
        updateStraightLinePreviewToPoint(board, getPointerPosition(board, event), event);
    }

    function updateStraightLinePreviewToPoint(board, rawPoint, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint;

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.updateLine) {
            return;
        }

        if (!fromPoint) {
            return;
        }

        toPoint = getGradientEndPoint(fromPoint, rawPoint, event);
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

        point = getCanvasPointerPosition(board, event);

        if (!point) {
            clearRetroBrushPreview(board);
            return;
        }

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

        beginUndoableAction(board);

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
            board.previewPointerPosition = board.pointerStartPosition;
            return;
        }

        if (isStraightLineToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getPointerPosition(board, event);
            board.previewPointerPosition = board.pointerStartPosition;
            return;
        }

        if (isShapeToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getPointerPosition(board, event);
            board.previewPointerPosition = board.pointerStartPosition;
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

        if (isStraightLineToolMode()) {
            return;
        }

        if (isShapeToolMode()) {
            return;
        }

        paintPointerEvent(board, event);
    }

    function paintPointerEvent(board, event) {
        var point = getCanvasPointerPosition(board, event);

        event.preventDefault();

        if (!point) {
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            return;
        }

        if (isContinuousLineToolMode() && !board.lastPointerPosition) {
            markUndoableChange(board);
            paintContinuousLineStart(board, point);
            board.lastPointerPosition = point;
            return;
        }

        markUndoableChange(board);

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

    function isContinuousLineToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH;
    }

    function paintContinuousLineStart(board, point) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES) {
            paintRoundPoint(board, point.x, point.y);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH) {
            paintOldBrushStamp(board, point.x, point.y);
            return;
        }

        paintSquaredPoint(board, point.x, point.y);
    }

    function paintShapePointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var rawPoint;
        var points;

        if (!fromPoint) {
            return;
        }

        rawPoint = getEventPointerPosition(board, event);
        points = getShapeDrawPoints(fromPoint, rawPoint, getPreviewModifierEvent(board, event));
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        markUndoableChange(board);
        paintShape(board, points.from, points.to);
    }

    function paintGradientPointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint = getGradientEndPoint(fromPoint, getPointerPosition(board, event), event);

        if (!fromPoint) {
            return;
        }

        event.preventDefault();
        markUndoableChange(board);
        paintGradient(board, fromPoint, toPoint);
    }

    function paintStraightLinePointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var rawPoint;
        var toPoint;
        var lineDesign;

        if (!fromPoint) {
            return;
        }

        rawPoint = getEventPointerPosition(board, event);
        toPoint = getGradientEndPoint(fromPoint, rawPoint, event);
        lineDesign = getCurrentStoredLineDesign();
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        markUndoableChange(board);
        paintLine(board, fromPoint, toPoint, "butt", "miter", lineDesign);
    }

    function getGradientEndPoint(fromPoint, toPoint, event) {
        var dx;
        var dy;
        var angle;
        var distance;
        var snappedAngle;
        var step = Math.PI / 36;

        if (!fromPoint || !toPoint || !event || !event.shiftKey) {
            return toPoint;
        }

        dx = toPoint.x - fromPoint.x;
        dy = toPoint.y - fromPoint.y;
        distance = Math.sqrt((dx * dx) + (dy * dy));

        if (distance === 0) {
            return toPoint;
        }

        angle = Math.atan2(dy, dx);
        snappedAngle = Math.round(angle / step) * step;

        return {
            x: Math.round(fromPoint.x + Math.cos(snappedAngle) * distance),
            y: Math.round(fromPoint.y + Math.sin(snappedAngle) * distance)
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
        beginUndoableAction(board);
        markUndoableChange(board);
        paintSquaredPoint(board, x, y);
        commitUndoableAction(board);
    }

    function paintSquaredPoint(board, x, y) {
        var size = Math.max(1, getCurrentBrushSize(board));
        var offset = Math.floor(size / 2);
        var left = Math.round(x - offset);
        var top = Math.round(y - offset);

        if (getCurrentBrushStroke()) {
            paintHardSquareStroke(board, left, top, size);
            return;
        }

        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.fillRect(left, top, size, size);
    }

    function paintRoundPoint(board, x, y) {
        var size = Math.max(1, getCurrentBrushSize(board));
        var radius = size / 2;

        if (!getCurrentBrushAntialiasing()) {
            paintHardRoundPoint(board, x, y, radius, getCurrentBrushStroke());
            return;
        }

        board.context.beginPath();
        board.context.arc(x, y, radius, 0, Math.PI * 2);

        if (getCurrentBrushStroke()) {
            board.context.strokeStyle = getCurrentPaintColor(board);
            board.context.lineWidth = 1;
            board.context.stroke();
            return;
        }

        board.context.fillStyle = getCurrentPaintColor(board);
        board.context.fill();
    }

    function paintHardSquareStroke(board, left, top, size) {
        var color = getCurrentPaintColor(board);

        board.context.fillStyle = color;
        board.context.fillRect(left, top, size, 1);
        board.context.fillRect(left, top + size - 1, size, 1);
        board.context.fillRect(left, top, 1, size);
        board.context.fillRect(left + size - 1, top, 1, size);
    }

    function paintHardRoundPoint(board, x, y, radius, strokeOnly) {
        var centerX = Math.round(x);
        var centerY = Math.round(y);
        var outerRadius = Math.max(0.5, radius);
        var innerRadius = Math.max(0, outerRadius - 1);
        var outerSq = outerRadius * outerRadius;
        var innerSq = innerRadius * innerRadius;
        var left = Math.floor(centerX - outerRadius);
        var top = Math.floor(centerY - outerRadius);
        var right = Math.ceil(centerX + outerRadius);
        var bottom = Math.ceil(centerY + outerRadius);
        var px;
        var py;
        var dx;
        var dy;
        var distanceSq;

        board.context.fillStyle = getCurrentPaintColor(board);

        for (py = top; py <= bottom; py++) {
            for (px = left; px <= right; px++) {
                dx = px - centerX;
                dy = py - centerY;
                distanceSq = (dx * dx) + (dy * dy);

                if (distanceSq <= outerSq && (!strokeOnly || distanceSq >= innerSq)) {
                    board.context.fillRect(px, py, 1, 1);
                }
            }
        }
    }

    function paintSquaredLine(board, fromPoint, toPoint) {
        paintStampLine(board, fromPoint, toPoint, paintSquaredPoint);
    }

    function paintRoundLine(board, fromPoint, toPoint) {
        paintStampLine(board, fromPoint, toPoint, paintRoundPoint);
    }

    function paintStampLine(board, fromPoint, toPoint, paintStamp) {
        var size = Math.max(1, getCurrentBrushSize(board));
        var spacing = Math.max(1, Math.floor(size / 2));
        var dx = toPoint.x - fromPoint.x;
        var dy = toPoint.y - fromPoint.y;
        var distance = Math.sqrt((dx * dx) + (dy * dy));
        var steps = Math.max(1, Math.ceil(distance / spacing));
        var i;
        var t;

        for (i = 0; i <= steps; i++) {
            t = i / steps;
            paintStamp(board, fromPoint.x + (dx * t), fromPoint.y + (dy * t));
        }
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

    function paintLine(board, fromPoint, toPoint, lineCap, lineJoin, lineDesignOverride) {
        var lineDesign = lineDesignOverride || getCurrentLineDesign();
        var designWeight = lineDesign ? Number(lineDesign.weight) : NaN;
        var designLimit = lineDesign ? Number(lineDesign.limit) : NaN;
        var size = isNaN(designWeight) ? Math.max(1, getCurrentBrushSize(board)) : Math.max(1, designWeight);

        if (lineDesign && lineDesign.antialiasing === false) {
            paintHardLine(board, fromPoint, toPoint, size, lineDesign);
            return;
        }

        board.context.save();
        board.context.beginPath();
        board.context.strokeStyle = getCurrentPaintColor(board);
        board.context.lineWidth = size;
        board.context.lineCap = lineDesign ? lineDesign.cap : lineCap;
        board.context.lineJoin = lineDesign ? lineDesign.corner : lineJoin;
        board.context.miterLimit = lineDesign && !isNaN(designLimit) ? designLimit : board.context.miterLimit;
        board.context.setLineDash(lineDesign && lineDesign.dashed && Array.isArray(lineDesign.dashes) ? lineDesign.dashes : []);
        board.context.moveTo(fromPoint.x, fromPoint.y);
        board.context.lineTo(toPoint.x, toPoint.y);
        board.context.stroke();
        board.context.restore();
    }

    function paintHardLine(board, fromPoint, toPoint, size, lineDesign) {
        var points = getHardLinePoints(fromPoint, toPoint);
        var width = Math.max(1, Math.round(size));
        var half = Math.floor(width / 2);
        var color = getCurrentPaintColor(board);
        var dashState = createHardLineDashState(lineDesign);

        board.context.save();
        board.context.fillStyle = color;

        points.forEach(function(point, index) {
            if (dashState && !isHardLineDashOn(dashState, index)) {
                return;
            }

            board.context.fillRect(point.x - half, point.y - half, width, width);
        });

        board.context.restore();
    }

    function getHardLinePoints(fromPoint, toPoint) {
        var x0 = Math.round(fromPoint.x);
        var y0 = Math.round(fromPoint.y);
        var x1 = Math.round(toPoint.x);
        var y1 = Math.round(toPoint.y);
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1;
        var sy = y0 < y1 ? 1 : -1;
        var err = dx - dy;
        var points = [];
        var e2;

        while (true) {
            points.push({ x: x0, y: y0 });

            if (x0 === x1 && y0 === y1) {
                break;
            }

            e2 = err * 2;

            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }

            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return points;
    }

    function createHardLineDashState(lineDesign) {
        var dashes;

        if (!lineDesign || !lineDesign.dashed || !Array.isArray(lineDesign.dashes)) {
            return null;
        }

        dashes = lineDesign.dashes.map(function(value) {
            return Math.max(0, Math.round(Number(value) || 0));
        }).filter(function(value) {
            return value > 0;
        });

        if (!dashes.length) {
            return null;
        }

        return {
            dashes: dashes,
            total: dashes.reduce(function(total, value) {
                return total + value;
            }, 0)
        };
    }

    function isHardLineDashOn(dashState, index) {
        var offset = index % dashState.total;
        var total = 0;
        var i;

        for (i = 0; i < dashState.dashes.length; i++) {
            total += dashState.dashes[i];

            if (offset < total) {
                return i % 2 === 0;
            }
        }

        return true;
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
        var stops = gradientConfig.stops || [];
        var gradient;
        var i;
        var stop;

        if (gradientConfig.retro) {
            paintRetroGradient(board, gradientConfig, fromPoint, toPoint);
            return;
        }

        gradient = createCanvasGradient(board, gradientConfig, fromPoint, toPoint);

        for (i = 0; i < stops.length; i++) {
            stop = stops[i];
            gradient.addColorStop(clamp(stop.offset, 0, 1), stop.color);
        }

        board.context.save();
        clipGradientBounds(board, gradientConfig, fromPoint, toPoint);
        board.context.fillStyle = gradient;
        board.context.fillRect(0, 0, board.canvas.width, board.canvas.height);
        board.context.restore();
    }

    function clipGradientBounds(board, gradientConfig, fromPoint, toPoint) {
        var dx;
        var dy;
        var radius;
        var strip;

        if (!gradientConfig.bounded) {
            return;
        }

        board.context.beginPath();

        if (gradientConfig.type === "radial") {
            dx = toPoint.x - fromPoint.x;
            dy = toPoint.y - fromPoint.y;
            radius = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
            board.context.arc(fromPoint.x, fromPoint.y, radius, 0, Math.PI * 2);
        } else {
            strip = getLinearGradientStrip(fromPoint, toPoint, board.canvas.width, board.canvas.height);
            board.context.moveTo(strip.a.x, strip.a.y);
            board.context.lineTo(strip.b.x, strip.b.y);
            board.context.lineTo(strip.c.x, strip.c.y);
            board.context.lineTo(strip.d.x, strip.d.y);
            board.context.closePath();
        }

        board.context.clip();
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

    function paintRetroGradient(board, gradientConfig, fromPoint, toPoint) {
        var stops = gradientConfig.stops || [];
        var fromColor = getRgb((stops[0] && stops[0].color) || "#000000");
        var toColor = getRgb((stops[stops.length - 1] && stops[stops.length - 1].color) || "#ffffff");
        var imageData = getRetroGradientImageData(board, gradientConfig);
        var data = imageData.data;
        var x;
        var y;
        var index;
        var useFrom;
        var color;

        if (isErrorDiffusionMethod(gradientConfig.ditheringMethod)) {
            paintErrorDiffusionGradient(board, imageData, gradientConfig, fromPoint, toPoint, fromColor, toColor);
            return;
        }

        for (y = 0; y < imageData.height; y++) {
            for (x = 0; x < imageData.width; x++) {
                if (!isInsideGradientBounds(gradientConfig, fromPoint, toPoint, x, y)) {
                    continue;
                }

                useFrom = shouldUseRetroFromColor(gradientConfig, fromPoint, toPoint, x, y);
                color = useFrom ? fromColor : toColor;
                index = getPixelIndex(imageData.width, x, y);
                setImageDataPixel(data, index, color);
            }
        }

        board.context.putImageData(imageData, 0, 0);
    }

    function getRetroGradientImageData(board, gradientConfig) {
        if (gradientConfig.bounded) {
            return board.context.getImageData(0, 0, board.canvas.width, board.canvas.height);
        }

        return board.context.createImageData(board.canvas.width, board.canvas.height);
    }

    function shouldUseRetroFromColor(gradientConfig, fromPoint, toPoint, x, y) {
        var bayer8 = getBayer8x8();
        var bayer4 = getBayer4x4();
        var options = getDitheringOptions(gradientConfig);
        var t = getGradientT(gradientConfig, fromPoint, toPoint, x, y);
        var fromAmount = 1 - t;
        var threshold;

        if (gradientConfig.ditheringMethod === "halftone") {
            return shouldUseHalftone(x, y, fromAmount, options.halftoneCellSize);
        }

        if (gradientConfig.ditheringMethod === "pattern") {
            threshold = getPatternThreshold(x, y, fromAmount, options.patternLevels, options.patternCellSize);
        } else if (gradientConfig.ditheringMethod === "noise") {
            threshold = getScaledNoiseThreshold(x, y, options.noiseAmount);
        } else if (gradientConfig.ditheringMethod === "blue-noise") {
            threshold = getScaledBlueNoiseThreshold(x, y, options.noiseAmount);
        } else if (gradientConfig.ditheringMethod === "ordered-bayer-4x4") {
            threshold = (bayer4[y % 4][x % 4] + 0.5) / 16;
        } else {
            threshold = (bayer8[y % 8][x % 8] + 0.5) / 64;
        }

        return fromAmount >= threshold;
    }

    function paintErrorDiffusionGradient(board, imageData, gradientConfig, fromPoint, toPoint, fromColor, toColor) {
        var data = imageData.data;
        var width = imageData.width;
        var height = imageData.height;
        var errorBuffer = new Array(width * height);
        var kernel = getErrorDiffusionKernel(gradientConfig.ditheringMethod);
        var options = getDitheringOptions(gradientConfig);
        var x;
        var y;
        var bufferIndex;
        var dataIndex;
        var value;
        var output;
        var error;
        var i;
        var item;

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                errorBuffer[(y * width) + x] = 1 - getGradientT(gradientConfig, fromPoint, toPoint, x, y);
            }
        }

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                if (!isInsideGradientBounds(gradientConfig, fromPoint, toPoint, x, y)) {
                    continue;
                }

                bufferIndex = (y * width) + x;
                dataIndex = getPixelIndex(width, x, y);
                value = clamp(errorBuffer[bufferIndex], 0, 1);
                output = value >= 0.5 ? 1 : 0;
                error = value - output;
                setImageDataPixel(data, dataIndex, output ? fromColor : toColor);
                for (i = 0; i < kernel.items.length; i++) {
                    item = kernel.items[i];
                    diffuseGradientError(errorBuffer, width, height, x + item.x, y + item.y, error * item.weight / kernel.divisor * options.diffusionStrength);
                }
            }
        }

        board.context.putImageData(imageData, 0, 0);
    }

    function diffuseGradientError(buffer, width, height, x, y, error) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            return;
        }

        buffer[(y * width) + x] += error;
    }

    function isErrorDiffusionMethod(method) {
        return method === "floyd-steinberg" ||
            method === "atkinson" ||
            method === "stucki" ||
            method === "jarvis";
    }

    function getErrorDiffusionKernel(method) {
        if (method === "atkinson") {
            return {
                divisor: 8,
                items: [
                    { x: 1, y: 0, weight: 1 },
                    { x: 2, y: 0, weight: 1 },
                    { x: -1, y: 1, weight: 1 },
                    { x: 0, y: 1, weight: 1 },
                    { x: 1, y: 1, weight: 1 },
                    { x: 0, y: 2, weight: 1 }
                ]
            };
        }

        if (method === "stucki") {
            return {
                divisor: 42,
                items: [
                    { x: 1, y: 0, weight: 8 }, { x: 2, y: 0, weight: 4 },
                    { x: -2, y: 1, weight: 2 }, { x: -1, y: 1, weight: 4 }, { x: 0, y: 1, weight: 8 }, { x: 1, y: 1, weight: 4 }, { x: 2, y: 1, weight: 2 },
                    { x: -2, y: 2, weight: 1 }, { x: -1, y: 2, weight: 2 }, { x: 0, y: 2, weight: 4 }, { x: 1, y: 2, weight: 2 }, { x: 2, y: 2, weight: 1 }
                ]
            };
        }

        if (method === "jarvis") {
            return {
                divisor: 48,
                items: [
                    { x: 1, y: 0, weight: 7 }, { x: 2, y: 0, weight: 5 },
                    { x: -2, y: 1, weight: 3 }, { x: -1, y: 1, weight: 5 }, { x: 0, y: 1, weight: 7 }, { x: 1, y: 1, weight: 5 }, { x: 2, y: 1, weight: 3 },
                    { x: -2, y: 2, weight: 1 }, { x: -1, y: 2, weight: 3 }, { x: 0, y: 2, weight: 5 }, { x: 1, y: 2, weight: 3 }, { x: 2, y: 2, weight: 1 }
                ]
            };
        }

        return {
            divisor: 16,
            items: [
                { x: 1, y: 0, weight: 7 },
                { x: -1, y: 1, weight: 3 },
                { x: 0, y: 1, weight: 5 },
                { x: 1, y: 1, weight: 1 }
            ]
        };
    }

    function setImageDataPixel(data, index, color) {
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = 255;
    }

    function getNoiseThreshold(x, y) {
        var value = Math.sin((x * 12.9898) + (y * 78.233)) * 43758.5453;

        return value - Math.floor(value);
    }

    function getBlueNoiseThreshold(x, y) {
        var value = (getNoiseThreshold(x, y) + getNoiseThreshold(x + 19, y + 37) * 0.5) % 1;

        return value;
    }

    function getScaledNoiseThreshold(x, y, amount) {
        return clamp(0.5 + ((getNoiseThreshold(x, y) - 0.5) * amount), 0, 1);
    }

    function getScaledBlueNoiseThreshold(x, y, amount) {
        return clamp(0.5 + ((getBlueNoiseThreshold(x, y) - 0.5) * amount), 0, 1);
    }

    function shouldUseHalftone(x, y, fromAmount, cellSize) {
        var cx = (x % cellSize) - ((cellSize - 1) / 2);
        var cy = (y % cellSize) - ((cellSize - 1) / 2);
        var radius = fromAmount * (cellSize * 0.62);

        return (cx * cx) + (cy * cy) <= radius * radius;
    }

    function getPatternThreshold(x, y, fromAmount, levels, cellSize) {
        var level = Math.floor(fromAmount * levels);
        var patternIndex = (x % cellSize) + ((y % cellSize) * cellSize);
        var limit = Math.round((level / Math.max(1, levels)) * cellSize * cellSize);

        return patternIndex < limit ? 0.25 : 0.85;
    }

    function getDitheringOptions(gradientConfig) {
        var options = gradientConfig.ditheringOptions || {};

        return {
            diffusionStrength: normalizeNumber(options.diffusionStrength, 1),
            noiseAmount: normalizeNumber(options.noiseAmount, 1),
            halftoneCellSize: normalizeNumber(options.halftoneCellSize, 6),
            patternLevels: normalizeNumber(options.patternLevels, 6),
            patternCellSize: normalizeNumber(options.patternCellSize, 4)
        };
    }

    function normalizeNumber(value, fallback) {
        var number = Number(value);

        return Number.isFinite(number) ? number : fallback;
    }

    function getGradientT(gradientConfig, fromPoint, toPoint, x, y) {
        var dx = toPoint.x - fromPoint.x;
        var dy = toPoint.y - fromPoint.y;
        var lengthSquared = (dx * dx) + (dy * dy);
        var radius;
        var px;
        var py;

        if (gradientConfig.type === "radial") {
            radius = Math.max(1, Math.sqrt(lengthSquared));
            px = x - fromPoint.x;
            py = y - fromPoint.y;

            return clamp(Math.sqrt((px * px) + (py * py)) / radius, 0, 1);
        }

        if (lengthSquared === 0) {
            return 0;
        }

        return clamp(getLinearGradientProjection(fromPoint, toPoint, x, y), 0, 1);
    }

    function isInsideGradientBounds(gradientConfig, fromPoint, toPoint, x, y) {
        var dx;
        var dy;
        var radius;
        var px;
        var py;
        var projection;

        if (!gradientConfig.bounded) {
            return true;
        }

        if (gradientConfig.type === "radial") {
            dx = toPoint.x - fromPoint.x;
            dy = toPoint.y - fromPoint.y;
            radius = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
            px = x - fromPoint.x;
            py = y - fromPoint.y;

            return ((px * px) + (py * py)) <= radius * radius;
        }

        projection = getLinearGradientProjection(fromPoint, toPoint, x, y);

        return projection >= 0 && projection <= 1;
    }

    function getLinearGradientProjection(fromPoint, toPoint, x, y) {
        var dx = toPoint.x - fromPoint.x;
        var dy = toPoint.y - fromPoint.y;
        var lengthSquared = (dx * dx) + (dy * dy);

        if (lengthSquared === 0) {
            return 0;
        }

        return (((x - fromPoint.x) * dx) + ((y - fromPoint.y) * dy)) / lengthSquared;
    }

    function getLinearGradientStrip(fromPoint, toPoint, canvasWidth, canvasHeight) {
        var dx = toPoint.x - fromPoint.x;
        var dy = toPoint.y - fromPoint.y;
        var length = Math.sqrt((dx * dx) + (dy * dy)) || 1;
        var perpX = -dy / length;
        var perpY = dx / length;
        var reach = Math.sqrt((canvasWidth * canvasWidth) + (canvasHeight * canvasHeight)) + length;

        return {
            a: {
                x: fromPoint.x + perpX * reach,
                y: fromPoint.y + perpY * reach
            },
            b: {
                x: fromPoint.x - perpX * reach,
                y: fromPoint.y - perpY * reach
            },
            c: {
                x: toPoint.x - perpX * reach,
                y: toPoint.y - perpY * reach
            },
            d: {
                x: toPoint.x + perpX * reach,
                y: toPoint.y + perpY * reach
            }
        };
    }

    function getBayer8x8() {
        return [
            [0, 32, 8, 40, 2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44, 4, 36, 14, 46, 6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [3, 35, 11, 43, 1, 33, 9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47, 7, 39, 13, 45, 5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ];
    }

    function getBayer4x4() {
        return [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
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

    function getShapeEndPoint(fromPoint, toPoint, event) {
        if (!fromPoint || !toPoint) {
            return toPoint;
        }

        if (usesFixedAspectShape(event)) {
            return getSquareEndPoint(fromPoint, toPoint);
        }

        return toPoint;
    }

    function getShapeDrawPoints(fromPoint, rawPoint, event) {
        var toPoint = getShapeEndPoint(fromPoint, rawPoint, event);
        var dx;
        var dy;

        if (!fromPoint || !toPoint || !event || !event.altKey) {
            return {
                from: fromPoint,
                to: toPoint
            };
        }

        dx = toPoint.x - fromPoint.x;
        dy = toPoint.y - fromPoint.y;

        return {
            from: {
                x: fromPoint.x - dx,
                y: fromPoint.y - dy
            },
            to: toPoint
        };
    }

    function usesFixedAspectShape(event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.FILLED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_SQUARES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_CIRCLES) {
            return true;
        }

        if (!event || !event.shiftKey) {
            return false;
        }

        return currentPaintToolMode === PAINT_TOOL_MODES.FILLED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_OVALS ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_RECTANGLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.STROKED_OVALS;
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

    function isStraightLineToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.STRAIGHT_LINE;
    }

    function isOvalToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.FILLED_CIRCLES ||
            currentPaintToolMode === PAINT_TOOL_MODES.FILLED_OVALS ||
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
        beginUndoableAction(board);
        markUndoableChange(board);
        board.context.drawImage(image, x || 0, y || 0);
        commitUndoableAction(board);
    }

    function getCurrentPaintColor(board) {
        if (global.App && global.App.memory && global.App.memory.currentColor) {
            return global.App.memory.currentColor;
        }

        return board.paintColor;
    }

    function getCurrentBrushSize(board) {
        if (global.App && global.App.memory && global.App.memory.currentBrushWidth) {
            return global.App.memory.currentBrushWidth;
        }

        return board.brushSize;
    }

    function getCurrentBrushStroke() {
        return !!(global.App && global.App.memory && global.App.memory.currentBrushStroke);
    }

    function getCurrentBrushAntialiasing() {
        return !!(global.App && global.App.memory && global.App.memory.currentBrushAntialiasing);
    }

    function getCurrentLineDesign() {
        var lineDesign = global.App && global.App.memory && global.App.memory.currentLineDesign;

        if (!lineDesign || !lineDesign.active) {
            return null;
        }

        return lineDesign;
    }

    function getCurrentStoredLineDesign() {
        if (global.App && global.App.memory && global.App.memory.currentLineDesign) {
            return global.App.memory.currentLineDesign;
        }

        return null;
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
            bounded: false,
            retro: false,
            ditheringMethod: "ordered-bayer-8x8",
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
            document.removeEventListener("pointerup", paintHandlers.endPainting, true);
            document.removeEventListener("pointercancel", paintHandlers.endPainting, true);
            board.canvas.removeEventListener("pointerleave", paintHandlers.leaveCanvas);
        } else if (paintHandlers) {
            board.canvas.removeEventListener("mousedown", paintHandlers.startPainting);
            board.canvas.removeEventListener("mousemove", paintHandlers.continuePainting);
            document.removeEventListener("mouseup", paintHandlers.endPainting, true);
            board.canvas.removeEventListener("mouseleave", paintHandlers.leaveCanvas);
        }

        if (paintHandlers && paintHandlers.updatePreviewModifier) {
            document.removeEventListener("keydown", paintHandlers.updatePreviewModifier);
            document.removeEventListener("keyup", paintHandlers.updatePreviewModifier);
        }

        global.removeEventListener("paint-tools-change", clearPreviewOnPaintToolChange);

        if (board.rules && board.rules.element && board.rules.element.parentNode) {
            board.rules.element.parentNode.removeChild(board.rules.element);
        }

        if (board.element.parentNode) {
            board.element.parentNode.removeChild(board.element);
        }
    }

    function updateBoardRulesSize(board, width, height) {
        if (board && board.rules && typeof board.rules.setSize === "function") {
            board.rules.setSize(width, height);
        }
    }

    global.PaintBoard = PaintBoard;
    global.paintBoard = PaintBoard;
    global.PaintTools = PaintTools;

}(window));
