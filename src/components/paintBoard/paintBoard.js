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
        useLayers: false,
        layers: null,
        onSave: null
    };

    // Layer management (including the initial layers stack) lives in the
    // PaintBoardLayersManager module (layersManager.js). The board only delegates
    // to it. The layer object shape is shared with the LayersPanel component
    // (src/components/layersPanel) and must stay in sync with it.
    function createInitialLayers(boardId) {
        if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.createInitialLayers) {
            return global.PaintBoardLayersManager.createInitialLayers(boardId);
        }

        return [];
    }

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
        LASSO_SELECTION: "LASSO-SELECTION",
        MAGIC_WAND: "MAGIC-WAND",
        PAINT_BUCKET: "PAINT-BUCKET",
        PATTERN_BUCKET: "PATTERN-BUCKET",
        GRADIENT: "GRADIENT",
        INK_DROPPER: "INK-DROPPER",
        OLD_BRUSH: "OLD-BRUSH",
        DESIGNED_BRUSH: "DESIGNED-BRUSH",
        DESIGNED_BRUSH_2: "DESIGNED-BRUSH-2"
    };

    var SELECTION_TOOL_TYPES = {
        FREEHAND: "freehand",
        POLYGONAL: "polygonal",
        RECTANGLE: "rectangle",
        OVAL: "oval"
    };

    var SELECTION_BEHAVIORS = {
        NORMAL: "normal",
        ADD: "add",
        REMOVE: "remove"
    };

    var currentPaintToolMode = PAINT_TOOL_MODES.SQUARED_POINTS;
    var currentSelectionToolType = SELECTION_TOOL_TYPES.FREEHAND;
    var currentSelectionBehavior = SELECTION_BEHAVIORS.NORMAL;
    var MAGIC_WAND_MODES = {
        FAST: "fast",
        PHOTOSHOP: "photoshop",
        PERCEPTUAL: "perceptual"
    };
    var DEFAULT_MAGIC_WAND_MODE = MAGIC_WAND_MODES.PHOTOSHOP;
    var currentMagicWandOptions = {
        tolerance: 32,
        antiAlias: true,
        contiguous: true,
        mode: DEFAULT_MAGIC_WAND_MODE
    };
    var MAGIC_WAND_MAX_DISTANCE = Math.sqrt(4 * 255 * 255);
    var MAGIC_WAND_MAX_LAB_DISTANCE = 100;

    var PaintTools = {
        modes: PAINT_TOOL_MODES,
        selectionTools: SELECTION_TOOL_TYPES,
        selectionBehaviors: SELECTION_BEHAVIORS,
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
        },
        setSelectionTool: function(selectionTool) {
            var normalizedSelectionTool = String(selectionTool || "").toLowerCase();

            if (!isValidSelectionToolType(normalizedSelectionTool)) {
                throw new Error("Unknown selection tool: " + selectionTool);
            }

            currentSelectionToolType = normalizedSelectionTool;
            notifySelectionToolChange(currentSelectionToolType);
            return currentSelectionToolType;
        },
        getSelectionTool: function() {
            return currentSelectionToolType;
        },
        setSelectionBehavior: function(selectionBehavior) {
            var normalizedSelectionBehavior = String(selectionBehavior || "").toLowerCase();

            if (!isValidSelectionBehavior(normalizedSelectionBehavior)) {
                throw new Error("Unknown selection behavior: " + selectionBehavior);
            }

            currentSelectionBehavior = normalizedSelectionBehavior;
            notifySelectionBehaviorChange(currentSelectionBehavior);
            return currentSelectionBehavior;
        },
        getSelectionBehavior: function() {
            return currentSelectionBehavior;
        },
        setMagicWandTolerance: function(tolerance) {
            var normalizedTolerance = normalizeMagicWandTolerance(tolerance);

            currentMagicWandOptions.tolerance = normalizedTolerance;
            notifyMagicWandOptionsChange(currentMagicWandOptions);
            return normalizedTolerance;
        },
        getMagicWandTolerance: function() {
            return currentMagicWandOptions.tolerance;
        },
        setMagicWandAntiAlias: function(antiAlias) {
            currentMagicWandOptions.antiAlias = !!antiAlias;
            notifyMagicWandOptionsChange(currentMagicWandOptions);
            return currentMagicWandOptions.antiAlias;
        },
        getMagicWandAntiAlias: function() {
            return currentMagicWandOptions.antiAlias;
        },
        setMagicWandContiguous: function(contiguous) {
            currentMagicWandOptions.contiguous = !!contiguous;
            notifyMagicWandOptionsChange(currentMagicWandOptions);
            return currentMagicWandOptions.contiguous;
        },
        getMagicWandContiguous: function() {
            return currentMagicWandOptions.contiguous;
        },
        setMagicWandMode: function(mode) {
            currentMagicWandOptions.mode = normalizeMagicWandMode(mode);
            notifyMagicWandOptionsChange(currentMagicWandOptions);
            return currentMagicWandOptions.mode;
        },
        getMagicWandMode: function() {
            return currentMagicWandOptions.mode;
        },
        setMagicWandOptions: function(options) {
            currentMagicWandOptions = normalizeMagicWandOptions(options);
            notifyMagicWandOptionsChange(currentMagicWandOptions);
            return copyMagicWandOptions(currentMagicWandOptions);
        },
        getMagicWandOptions: function() {
            return copyMagicWandOptions(currentMagicWandOptions);
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

    function isValidSelectionToolType(selectionTool) {
        var key;

        for (key in SELECTION_TOOL_TYPES) {
            if (Object.prototype.hasOwnProperty.call(SELECTION_TOOL_TYPES, key) && SELECTION_TOOL_TYPES[key] === selectionTool) {
                return true;
            }
        }

        return false;
    }

    function isValidSelectionBehavior(selectionBehavior) {
        var key;

        for (key in SELECTION_BEHAVIORS) {
            if (Object.prototype.hasOwnProperty.call(SELECTION_BEHAVIORS, key) && SELECTION_BEHAVIORS[key] === selectionBehavior) {
                return true;
            }
        }

        return false;
    }

    function normalizeMagicWandTolerance(tolerance) {
        var numericTolerance = parseInt(tolerance, 10);

        if (isNaN(numericTolerance)) {
            return 0;
        }

        return Math.max(0, Math.min(100, numericTolerance));
    }

    function normalizeMagicWandMode(mode) {
        var key;

        for (key in MAGIC_WAND_MODES) {
            if (Object.prototype.hasOwnProperty.call(MAGIC_WAND_MODES, key) && MAGIC_WAND_MODES[key] === mode) {
                return mode;
            }
        }

        return DEFAULT_MAGIC_WAND_MODE;
    }

    function normalizeMagicWandOptions(options) {
        var source = options || {};

        return {
            tolerance: normalizeMagicWandTolerance(source.tolerance),
            antiAlias: !!source.antiAlias,
            contiguous: !!source.contiguous,
            mode: normalizeMagicWandMode(source.mode)
        };
    }

    function copyMagicWandOptions(options) {
        return {
            tolerance: options.tolerance,
            antiAlias: options.antiAlias,
            contiguous: options.contiguous,
            mode: options.mode
        };
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

    function notifySelectionToolChange(selectionTool) {
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-selection-tool-change", {
                detail: {
                    selectionTool: selectionTool
                }
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-selection-tool-change", false, false, {
                selectionTool: selectionTool
            });
        }

        global.dispatchEvent(event);
    }

    function notifySelectionBehaviorChange(selectionBehavior) {
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-selection-behavior-change", {
                detail: {
                    selectionBehavior: selectionBehavior
                }
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-selection-behavior-change", false, false, {
                selectionBehavior: selectionBehavior
            });
        }

        global.dispatchEvent(event);
    }

    function notifyMagicWandOptionsChange(options) {
        var event;
        var detail = copyMagicWandOptions(options);

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-magic-wand-options-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-magic-wand-options-change", false, false, detail);
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

    function notifySelectionStateChange(board) {
        var event;
        var detail;

        if (!board) {
            return;
        }

        detail = {
            board: board.element,
            paintBoard: board,
            hasSelection: hasActiveSelection(board)
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-selection-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-selection-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function notifyContentChange(board) {
        var event;
        var detail;

        if (!board) {
            return;
        }

        detail = {
            board: board.element,
            paintBoard: board,
            layerId: board.activeLayerId,
            canvas: board.canvas
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-content-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-content-change", false, false, detail);
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
        var overlays = document.createElement("div");
        var baseLayer = document.createElement("li");
        var canvas = document.createElement("canvas");
        var tempLayer = createTempLayer(config.width, config.height);
        var selectionLayer = createSelectionLayer(config.width, config.height);
        var context;
        var isPainting = false;
        var activePointerId = null;
        var supportsPointerEvents = typeof global.PointerEvent === "function";
        var clearPreviewOnPaintToolChange = function(event) {
            var mode = event.detail && event.detail.mode;

            if (!isBrushHoverPreviewToolMode(mode)) {
                clearBrushHoverPreview(board);
            }
        };
        var clearSelectionDraftOnToolChange = function(event) {
            var mode = event.detail && event.detail.mode;

            if (mode !== PAINT_TOOL_MODES.LASSO_SELECTION) {
                clearSelectionDraft(board);
            }
        };
        var clearSelectionDraftOnSelectionToolChange = function() {
            clearSelectionDraft(board);
        };
        var finishPolygonalSelectionFromEvent = function(event) {
            if (isLassoSelectionToolMode() && isPolygonalSelectionTool()) {
                event.preventDefault();
                finishPolygonalSelection(board, event);
            }
        };
        var clearHoverGuideOnBlur = function() {
            board.hoverGuideControlActive = false;
            board.axisLockMode = null;
            clearHoverGuide(board);
        };
        var stopPainting = function(event) {
            if (isPainting && isLassoSelectionToolMode() && isFreehandSelectionTool() && board.lassoSelectionStroke) {
                finishFreehandSelection(board, event);
                commitUndoableAction(board);
                isPainting = false;
                board.lastPointerPosition = null;
                board.designedBrush2Stroke = null;
                board.pointerStartPosition = null;
                board.previewPointerPosition = null;
                board.previewModifierState = null;
                return;
            }

            if (isPainting && isLassoSelectionToolMode() && isBoxSelectionTool() && board.pointerStartPosition) {
                finishBoxSelection(board, event);
                commitUndoableAction(board);
                isPainting = false;
                board.lastPointerPosition = null;
                board.designedBrush2Stroke = null;
                board.pointerStartPosition = null;
                board.previewPointerPosition = null;
                board.previewModifierState = null;
                return;
            }

            if (isPainting && isLassoSelectionToolMode() && isPolygonalSelectionTool()) {
                isPainting = false;
                board.lastPointerPosition = null;
                board.designedBrush2Stroke = null;
                board.pointerStartPosition = null;
                board.previewModifierState = null;
                return;
            }

            if (isPainting && isStraightLineToolMode() && board.pointerStartPosition) {
                paintStraightLinePointerEvent(board, event);
            }

            if (isPainting && isShapeToolMode() && board.pointerStartPosition) {
                paintShapePointerEvent(board, event);
            }

            if (isPainting && currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT && board.pointerStartPosition) {
                paintGradientPointerEvent(board, event);
            }

            if (isBrushHoverPreviewToolMode() && isPointerInsideCanvas(board, event)) {
                updateBrushHoverPreview(board, event);
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

            updateHoverGuideFromPointer(board, event, true);

            if (supportsPointerEvents) {
                activePointerId = event.pointerId;
                capturePointer(getPointerCaptureTarget(board), event.pointerId);
            }

            isPainting = true;
            rememberPreviewInput(board, event);
            startTempPreview(board, event);
            updateBrushHoverPreview(board, event);
            startPointerAction(board, event);
        };
        var startPaintingFromOutside = function(event) {
            if (!isPrimaryPaintInput(event)) {
                return;
            }

            if (event.target === board.canvas) {
                return;
            }

            if (board.floatingPaste &&
                board.floatingPaste.layer &&
                board.floatingPaste.layer.contains(event.target)) {
                return;
            }

            if (isPointerInsideCanvas(board, event)) {
                startPainting(event);
                return;
            }

            if (!canStartActionOutsideCanvas()) {
                return;
            }

            startPainting(event);
        };
        var continuePainting = function(event) {
            var isDocumentMove = event && event.currentTarget === document;

            if (isDocumentMove && !isPainting && !(isLassoSelectionToolMode() && isPolygonalSelectionTool() && board.polygonalSelectionPath)) {
                return;
            }

            if (isDocumentMove &&
                isPointerInsideCanvas(board, event) &&
                event.target === board.canvas) {
                return;
            }

            updateHoverGuideFromPointer(board, event, true);

            if (!isActivePaintInput(event, activePointerId)) {
                return;
            }

            updateBrushHoverPreview(board, event);

            if (!isPainting && isLassoSelectionToolMode() && isPolygonalSelectionTool() && board.polygonalSelectionPath) {
                updatePolygonalSelectionPreview(board, event);
                return;
            }

            if (!isPainting) {
                return;
            }

            rememberPreviewInput(board, event);
            updateTempPreview(board, event);
            continuePointerAction(board, event);
        };
        var rememberHoverGuidePointer = function(event) {
            updateHoverGuideFromPointer(board, event, false);
        };
        var updatePreviewModifier = function(event) {
            var isPreviewModifier;

            if (isEscapeKey(event) && event.type === "keydown") {
                event.preventDefault();
                clearSelection(board);
                return;
            }

            if (isSpacePanKey(event) && event.type !== "keyup") {
                clearBrushHoverPreview(board);
            }

            updateHoverGuideFromKey(board, event);

            isPreviewModifier = event &&
                (event.key === "Shift" || event.key === "Alt" || isAxisLockKey(event));

            if (!isPreviewModifier) {
                return;
            }

            updateAxisLockState(board, event);

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
            board.hoverGuidePointerPosition = null;
            board.hoverGuideControlActive = false;
            clearHoverGuide(board);

            if (isPainting) {
                clearBrushHoverPreview(board);
                return;
            }

            if (isShapeToolMode() || isLassoSelectionToolMode()) {
                return;
            }

            isPainting = false;
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            activePointerId = null;
            board.previewPointerPosition = null;
            board.previewModifierState = null;
            clearBrushHoverPreview(board);
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

        overlays.className = "paint-board-overlays";
        overlays.style.width = config.width + "px";
        overlays.style.height = config.height + "px";

        baseLayer.id = baseLayerId;
        baseLayer.className = "paint-board-layer ACTIVE-LAYER";
        baseLayer.setAttribute("data-layer", baseLayerId);
        baseLayer.setAttribute("data-type", "CANVAS");
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
        overlays.appendChild(tempLayer);
        overlays.appendChild(selectionLayer);
        element.appendChild(layers);
        element.appendChild(overlays);
        container.appendChild(element);

        context = canvas.getContext("2d");
        context.fillStyle = config.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        board = {
            id: boardId,
            element: element,
            layersElement: layers,
            overlaysElement: overlays,
            selectionLayerElement: selectionLayer,
            tempLayerElement: tempLayer,
            activeLayerElement: baseLayer,
            activeLayerId: baseLayerId,
            floatingPaste: null,
            canvas: canvas,
            context: context,
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor,
            paintColor: getOppositeColor(config.backgroundColor),
            brushSize: config.brushSize,
            useLayers: config.useLayers,
            layers: config.layers || (config.useLayers ? createInitialLayers(boardId) : []),
            layerSequence: 1,
            getLayers: function() {
                return board.layers;
            },
            addLayer: function(options) {
                var previousCanvas = board.canvas;
                var layer;

                if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.addLayer) {
                    layer = global.PaintBoardLayersManager.addLayer(board, options);

                    if (config.paintOnPointer && layer) {
                        rebindCanvasPaintHandlers(previousCanvas, board.canvas, {
                            startPainting: startPainting,
                            continuePainting: continuePainting,
                            leaveCanvas: leaveCanvas,
                            rememberHoverGuidePointer: rememberHoverGuidePointer,
                            finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent
                        }, supportsPointerEvents);
                    }

                    return layer;
                }

                return null;
            },
            removeLayer: function(layerId) {
                var previousCanvas = board.canvas;
                var removed;

                if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.removeLayer) {
                    removed = global.PaintBoardLayersManager.removeLayer(board, layerId);

                    if (config.paintOnPointer && removed) {
                        rebindCanvasPaintHandlers(previousCanvas, board.canvas, {
                            startPainting: startPainting,
                            continuePainting: continuePainting,
                            leaveCanvas: leaveCanvas,
                            rememberHoverGuidePointer: rememberHoverGuidePointer,
                            finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent
                        }, supportsPointerEvents);
                    }

                    return removed;
                }

                return false;
            },
            setActiveLayer: function(layerId) {
                var previousCanvas = board.canvas;
                var activated;

                if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.setActiveLayer) {
                    activated = global.PaintBoardLayersManager.setActiveLayer(board, layerId);

                    if (config.paintOnPointer && activated) {
                        rebindCanvasPaintHandlers(previousCanvas, board.canvas, {
                            startPainting: startPainting,
                            continuePainting: continuePainting,
                            leaveCanvas: leaveCanvas,
                            rememberHoverGuidePointer: rememberHoverGuidePointer,
                            finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent
                        }, supportsPointerEvents);
                    }

                    return activated;
                }

                return false;
            },
            setLayerVisibility: function(layerId, visible) {
                if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.setLayerVisibility) {
                    return global.PaintBoardLayersManager.setLayerVisibility(board, layerId, visible);
                }

                return false;
            },
            setLayersOrder: function(layers) {
                if (global.PaintBoardLayersManager && global.PaintBoardLayersManager.setLayersOrder) {
                    return global.PaintBoardLayersManager.setLayersOrder(board, layers);
                }

                return false;
            },
            lastPointerPosition: null,
            previewPointerPosition: null,
            previewModifierState: null,
            axisLockMode: null,
            hoverGuidePointerPosition: null,
            hoverGuideControlActive: false,
            designedBrush2Stroke: null,
            lassoSelectionStroke: null,
            polygonalSelectionPath: null,
            selection: null,
            pointerStartPosition: null,
            undoSnapshot: null,
            pendingUndoSnapshot: null,
            actionHasChanges: false,
            clear: function() {
                clear(board);
            },
            clearSelection: function() {
                clearSelection(board);
            },
            hasSelection: function() {
                return hasActiveSelection(board);
            },
            getClipboardCanvas: function() {
                return getClipboardCanvas(board);
            },
            fillSelectionWithFrontColor: function() {
                return fillSelectionWithFrontColor(board);
            },
            deleteSelection: function() {
                return deleteSelection(board);
            },
            paintAt: function(x, y) {
                paintAt(board, x, y);
            },
            drawImage: function(image, x, y) {
                drawImage(board, image, x, y);
            },
            startFloatingPaste: function(image) {
                startFloatingPaste(board, image);
            },
            commitFloatingPaste: function() {
                return commitFloatingPaste(board);
            },
            cancelFloatingPaste: function() {
                cancelFloatingPaste(board);
            },
            cancelFloatingPasteDistortion: function() {
                return cancelFloatingPasteDistortion(board);
            },
            setFloatingPasteTransformAlgorithm: function(algorithm) {
                return setFloatingPasteTransformAlgorithm(board, algorithm);
            },
            setFloatingPasteWarpRoundBehavior: function(active) {
                return setFloatingPasteWarpRoundBehavior(board, active);
            },
            setFloatingPasteTransformOperation: function(operation) {
                return setFloatingPasteTransformOperation(board, operation);
            },
            setFloatingPasteDistortMode: function(active) {
                return setFloatingPasteDistortMode(board, active);
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
                    startPaintingFromOutside: startPaintingFromOutside,
                    container: container,
                    continuePainting: continuePainting,
                    rememberHoverGuidePointer: rememberHoverGuidePointer,
                    endPainting: endPainting,
                    leaveCanvas: leaveCanvas,
                    finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent,
                    updatePreviewModifier: updatePreviewModifier,
                    clearHoverGuideOnBlur: clearHoverGuideOnBlur
                }, {
                    clearPreviewOnPaintToolChange: clearPreviewOnPaintToolChange,
                    clearSelectionDraftOnToolChange: clearSelectionDraftOnToolChange,
                    clearSelectionDraftOnSelectionToolChange: clearSelectionDraftOnSelectionToolChange
                });
            }
        };

        if (config.paintOnPointer) {
            if (supportsPointerEvents) {
                bindCanvasPaintHandlers(canvas, {
                    startPainting: startPainting,
                    continuePainting: continuePainting,
                    leaveCanvas: leaveCanvas,
                    rememberHoverGuidePointer: rememberHoverGuidePointer,
                    finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent
                }, true, true);
                container.addEventListener("pointerdown", startPaintingFromOutside);
                document.addEventListener("pointermove", continuePainting, true);
                document.addEventListener("pointerup", endPainting, true);
                document.addEventListener("pointercancel", endPainting, true);
            } else {
                bindCanvasPaintHandlers(canvas, {
                    startPainting: startPainting,
                    continuePainting: continuePainting,
                    leaveCanvas: leaveCanvas,
                    rememberHoverGuidePointer: rememberHoverGuidePointer,
                    finishPolygonalSelectionFromEvent: finishPolygonalSelectionFromEvent
                }, false, true);
                container.addEventListener("mousedown", startPaintingFromOutside);
                document.addEventListener("mousemove", continuePainting, true);
                document.addEventListener("mouseup", endPainting, true);
            }

            document.addEventListener("keydown", updatePreviewModifier);
            document.addEventListener("keyup", updatePreviewModifier);
            global.addEventListener("blur", clearHoverGuideOnBlur);
            global.addEventListener("paint-tools-change", clearPreviewOnPaintToolChange);
            global.addEventListener("paint-tools-change", clearSelectionDraftOnToolChange);
            global.addEventListener("paint-selection-tool-change", clearSelectionDraftOnSelectionToolChange);
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
        cancelFloatingPaste(board);
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

    function createSelectionLayer(width, height) {
        var selectionLayer = document.createElement("div");

        selectionLayer.className = "paint-board-selection-layer";
        selectionLayer.style.width = width + "px";
        selectionLayer.style.height = height + "px";

        return selectionLayer;
    }

    function setSize(board, width, height) {
        cancelFloatingPaste(board);
        board.width = width;
        board.height = height;
        board.element.style.width = width + "px";
        board.element.style.height = height + "px";
        board.layersElement.style.width = width + "px";
        board.layersElement.style.height = height + "px";
        board.overlaysElement.style.width = width + "px";
        board.overlaysElement.style.height = height + "px";
        setSelectionLayerSize(board.selectionLayerElement, width, height);
        setTempLayerSize(board.tempLayerElement, width, height);
        board.activeLayerElement.style.width = width + "px";
        board.activeLayerElement.style.height = height + "px";
        board.canvas.width = width;
        board.canvas.height = height;
        board.canvas.style.width = width + "px";
        board.canvas.style.height = height + "px";
        updateBoardRulesSize(board, width, height);
        clearSelection(board);
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

    function setSelectionLayerSize(selectionLayer, width, height) {
        if (!selectionLayer) {
            return;
        }

        selectionLayer.style.width = width + "px";
        selectionLayer.style.height = height + "px";
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

        cancelFloatingPaste(board);
        board.width = snapshot.width;
        board.height = snapshot.height;
        board.backgroundColor = snapshot.backgroundColor;
        board.paintColor = getOppositeColor(snapshot.backgroundColor);
        board.element.style.width = snapshot.width + "px";
        board.element.style.height = snapshot.height + "px";
        board.element.style.backgroundColor = snapshot.backgroundColor;
        board.layersElement.style.width = snapshot.width + "px";
        board.layersElement.style.height = snapshot.height + "px";
        board.overlaysElement.style.width = snapshot.width + "px";
        board.overlaysElement.style.height = snapshot.height + "px";
        setSelectionLayerSize(board.selectionLayerElement, snapshot.width, snapshot.height);
        setTempLayerSize(board.tempLayerElement, snapshot.width, snapshot.height);
        board.activeLayerElement.style.width = snapshot.width + "px";
        board.activeLayerElement.style.height = snapshot.height + "px";
        board.canvas.width = snapshot.width;
        board.canvas.height = snapshot.height;
        board.canvas.style.width = snapshot.width + "px";
        board.canvas.style.height = snapshot.height + "px";
        updateBoardRulesSize(board, snapshot.width, snapshot.height);
        clearSelection(board);
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
        var contentChanged;

        if (!board) {
            return;
        }

        contentChanged = !!(board.pendingUndoSnapshot && board.actionHasChanges);

        if (contentChanged) {
            board.undoSnapshot = board.pendingUndoSnapshot;
        }

        board.pendingUndoSnapshot = null;
        board.actionHasChanges = false;
        notifyUndoStateChange(board);
        if (contentChanged) {
            notifyContentChange(board);
        }
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
        if (!restoreBoardSnapshot(board, snapshot)) {
            return false;
        }
        notifyContentChange(board);
        return true;
    }

    function getPointerPosition(board, event) {
        return applyAxisLock(board, getClampedPointerPosition(board, event));
    }

    function getPreviewPointerPosition(board, event) {
        if (isLassoSelectionToolMode() ||
            isShapeToolMode() ||
            isStraightLineToolMode() ||
            currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT) {
            return getSelectionPointerPosition(board, event);
        }

        return getPointerPosition(board, event);
    }

    function getSelectionPointerPosition(board, event) {
        return applyAxisLock(board, getUnclampedPointerPosition(board, event));
    }

    function getUnclampedPointerPosition(board, event) {
        var rect = getBoardInputRect(board);
        var scaleX = board.canvas.width / rect.width;
        var scaleY = board.canvas.height / rect.height;

        return {
            x: Math.floor((event.clientX - rect.left) * scaleX),
            y: Math.floor((event.clientY - rect.top) * scaleY)
        };
    }

    function getClampedPointerPosition(board, event) {
        var rect = getBoardInputRect(board);
        var scaleX = board.canvas.width / rect.width;
        var scaleY = board.canvas.height / rect.height;

        return {
            x: clamp(Math.floor((event.clientX - rect.left) * scaleX), 0, board.canvas.width),
            y: clamp(Math.floor((event.clientY - rect.top) * scaleY), 0, board.canvas.height)
        };
    }

    function getCanvasPointerPosition(board, event) {
        var rect = getBoardInputRect(board);
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

    function getBoardInputRect(board) {
        var rect;

        if (!board || !board.element || !board.element.getBoundingClientRect) {
            return {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 1,
                height: 1
            };
        }

        rect = board.element.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return {
                left: rect.left || 0,
                top: rect.top || 0,
                right: rect.right || rect.left || 0,
                bottom: rect.bottom || rect.top || 0,
                width: 1,
                height: 1
            };
        }
        return rect;
    }

    function getPointerCaptureTarget(board) {
        var canvasRect;

        if (!board || !board.canvas) {
            return board && board.element;
        }

        canvasRect = board.canvas.getBoundingClientRect();
        if (canvasRect.width && canvasRect.height) {
            return board.canvas;
        }
        return board.element;
    }

    function getStrokePointerPosition(board, event) {
        if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
            return null;
        }

        return applyAxisLock(board, getUnclampedPointerPosition(board, event));
    }

    function getEventPointerPosition(board, event) {
        if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
            return board.previewPointerPosition || board.pointerStartPosition;
        }

        return getPointerPosition(board, event);
    }

    function getPaintPointerPosition(board, event) {
        return applyAxisLock(board, getCanvasPointerPosition(board, event));
    }

    function getStrokePaintPointerPosition(board, event) {
        if (isDragPaintToolMode()) {
            return getStrokePointerPosition(board, event);
        }

        return getPaintPointerPosition(board, event);
    }

    function isPointInsideCanvas(board, point) {
        return !!(board && point &&
            point.x >= 0 &&
            point.y >= 0 &&
            point.x <= board.canvas.width &&
            point.y <= board.canvas.height);
    }

    function rememberPreviewInput(board, event, preserveModifiers) {
        var point;

        if (!board || !event) {
            return;
        }

        if (typeof event.clientX === "number" && typeof event.clientY === "number") {
            point = getPaintPointerPosition(board, event);

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

    function applyAxisLock(board, point) {
        var anchor;

        if (!board || !point || !board.axisLockMode) {
            return point;
        }

        anchor = getAxisLockAnchor(board);

        if (!anchor) {
            return point;
        }

        if (board.axisLockMode === "x") {
            return {
                x: point.x,
                y: clamp(anchor.y, 0, board.canvas.height)
            };
        }

        if (board.axisLockMode === "y") {
            return {
                x: clamp(anchor.x, 0, board.canvas.width),
                y: point.y
            };
        }

        return point;
    }

    function getAxisLockAnchor(board) {
        return board.pointerStartPosition || board.lastPointerPosition || null;
    }

    function updateAxisLockState(board, event) {
        var key;

        if (!board || !event || !isAxisLockKey(event)) {
            return;
        }

        key = String(event.key || "").toLowerCase();

        if (event.type === "keyup") {
            if (board.axisLockMode === key) {
                board.axisLockMode = null;
            }
            return;
        }

        board.axisLockMode = key;
    }

    function isAxisLockKey(event) {
        var key = event && String(event.key || "").toLowerCase();

        return key === "x" || key === "y";
    }

    function updateHoverGuideFromPointer(board, event, syncControlState) {
        var point;

        if (!board || !event) {
            return;
        }

        point = getCanvasPointerPosition(board, event);

        if (!point) {
            board.hoverGuidePointerPosition = null;
            clearHoverGuide(board);
            return;
        }

        board.hoverGuidePointerPosition = point;
        if (syncControlState) {
            board.hoverGuideControlActive = !!event.ctrlKey;
        }
        updateHoverGuide(board);
    }

    function updateHoverGuideFromKey(board, event) {
        if (!board || !event || event.key !== "Control") {
            return;
        }

        board.hoverGuideControlActive = event.type !== "keyup";
        updateHoverGuide(board);
    }

    function updateHoverGuide(board) {
        if (!board || !board.rules || !board.hoverGuideControlActive || !board.hoverGuidePointerPosition) {
            clearHoverGuide(board);
            return;
        }

        if (typeof board.rules.setPointerGuide === "function") {
            board.rules.setPointerGuide(board.hoverGuidePointerPosition);
        }
    }

    function clearHoverGuide(board) {
        if (board && board.rules && typeof board.rules.clearPointerGuide === "function") {
            board.rules.clearPointerGuide();
        }
    }

    function isPointerInsideCanvas(board, event) {
        var rect;

        if (!event) {
            return false;
        }

        rect = getBoardInputRect(board);

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
        board.previewPointerPosition = getPreviewPointerPosition(board, event);

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

        if (isLassoSelectionToolMode() && isBoxSelectionTool() && board.pointerStartPosition) {
            renderBoxSelectionPreview(
                board,
                board.pointerStartPosition,
                getBoxSelectionEndPoint(board, board.pointerStartPosition, board.previewPointerPosition, event)
            );
            return;
        }

        updateTempSquareToPoint(board, board.previewPointerPosition, event);
    }

    function startTempSquare(board, event) {
        if (!isTempPreviewToolMode()) {
            return;
        }

        if (global.PaintBoardTempLayer && global.PaintBoardTempLayer.startShape) {
            global.PaintBoardTempLayer.startShape(board.tempLayerElement, getPreviewPointerPosition(board, event), {
                oval: isOvalToolMode()
            });
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.startSquare) {
            return;
        }

        global.PaintBoardTempLayer.startSquare(board.tempLayerElement, getPreviewPointerPosition(board, event));
    }

    function updateTempSquare(board, event) {
        updateTempSquareToPoint(board, getPreviewPointerPosition(board, event), event);
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

        global.PaintBoardTempLayer.startLine(board.tempLayerElement, getSelectionPointerPosition(board, event));
    }

    function updateGradientPreview(board, event) {
        updateGradientPreviewToPoint(board, getSelectionPointerPosition(board, event), event);
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

        global.PaintBoardTempLayer.startLine(board.tempLayerElement, getSelectionPointerPosition(board, event), getStraightLinePreviewOptions(board));
    }

    function updateStraightLinePreview(board, event) {
        updateStraightLinePreviewToPoint(board, getSelectionPointerPosition(board, event), event);
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
        global.PaintBoardTempLayer.updateLine(board.tempLayerElement, toPoint, getStraightLinePreviewOptions(board));
    }

    function getStraightLinePreviewOptions(board) {
        var lineDesign = getCurrentStoredLineDesign();
        var designWeight = lineDesign ? Number(lineDesign.weight) : NaN;

        return {
            styled: true,
            weight: isNaN(designWeight) ? Math.max(1, getCurrentBrushSize(board)) : Math.max(1, designWeight),
            color: lineDesign && lineDesign.color ? lineDesign.color : getCurrentPreviewPaintColor(board),
            cap: lineDesign && lineDesign.cap ? lineDesign.cap : "butt",
            dashes: lineDesign && lineDesign.dashed && Array.isArray(lineDesign.dashes) ? lineDesign.dashes : null,
            antialiasing: lineDesign ? lineDesign.antialiasing : true,
            opacity: 0.8
        };
    }

    function updateBrushHoverPreview(board, event) {
        var point;
        var radius;
        var size;

        if (isSpacePanModeActive() || isSpacePanKey(event)) {
            clearBrushHoverPreview(board);
            return;
        }

        if (!isBrushHoverPreviewToolMode()) {
            return;
        }

        if (!global.PaintBoardTempLayer || !global.PaintBoardTempLayer.showCircle) {
            return;
        }

        point = getCanvasPointerPosition(board, event);

        if (!point) {
            clearBrushHoverPreview(board);
            return;
        }

        if (isSquareBrushHoverPreviewToolMode()) {
            if (!global.PaintBoardTempLayer.showSquare) {
                return;
            }

            size = getCurrentHoverBrushSize(board);
            global.PaintBoardTempLayer.showSquare(board.tempLayerElement, point, size);
            return;
        }

        radius = getCurrentHoverBrushSize(board) / 2;
        global.PaintBoardTempLayer.showCircle(board.tempLayerElement, point, radius);
    }

    function clearBrushHoverPreview(board) {
        clearTempSquare(board);
    }

    function isBrushHoverPreviewToolMode(mode) {
        var toolMode = mode || currentPaintToolMode;

        return toolMode === PAINT_TOOL_MODES.OLD_BRUSH ||
            toolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH ||
            toolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH_2 ||
            toolMode === PAINT_TOOL_MODES.SQUARED_POINTS ||
            toolMode === PAINT_TOOL_MODES.ROUND_POINTS ||
            toolMode === PAINT_TOOL_MODES.SQUARED_LINES ||
            toolMode === PAINT_TOOL_MODES.ROUND_LINES;
    }

    function isSquareBrushHoverPreviewToolMode(mode) {
        var toolMode = mode || currentPaintToolMode;

        return toolMode === PAINT_TOOL_MODES.SQUARED_POINTS ||
            toolMode === PAINT_TOOL_MODES.SQUARED_LINES;
    }

    function getCurrentHoverBrushSize(board) {
        var brush = null;
        var width;
        var height;

        if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH) {
            return Math.max(2, getCurrentRetroBrush().size);
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH) {
            brush = getCurrentDesignedBrush();
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH_2) {
            brush = getCurrentDesignedBrush2();
        }

        if (!brush) {
            return Math.max(2, getCurrentBrushSize(board));
        }

        width = brush.naturalWidth || brush.width || getCurrentBrushSize(board);
        height = brush.naturalHeight || brush.height || width;

        return Math.max(2, Math.max(width, height));
    }

    function isSpacePanModeActive() {
        return !!(document.body && document.body.className.indexOf("paint-board-pan-mode") !== -1);
    }

    function isSpacePanKey(event) {
        return !!(event && (event.key === " " || event.key === "Spacebar" || event.code === "Space"));
    }

    function isEscapeKey(event) {
        return !!(event && (event.key === "Escape" || event.key === "Esc" || event.code === "Escape"));
    }

    function isLassoSelectionToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.LASSO_SELECTION;
    }

    function isFreehandSelectionTool() {
        return currentSelectionToolType === SELECTION_TOOL_TYPES.FREEHAND;
    }

    function isPolygonalSelectionTool() {
        return currentSelectionToolType === SELECTION_TOOL_TYPES.POLYGONAL;
    }

    function isRectangleSelectionTool() {
        return currentSelectionToolType === SELECTION_TOOL_TYPES.RECTANGLE;
    }

    function isOvalSelectionTool() {
        return currentSelectionToolType === SELECTION_TOOL_TYPES.OVAL;
    }

    function isBoxSelectionTool() {
        return isRectangleSelectionTool() || isOvalSelectionTool();
    }

    function startLassoSelection(board, event) {
        if (isPolygonalSelectionTool()) {
            addPolygonalSelectionPoint(board, event);
            return;
        }

        if (isBoxSelectionTool()) {
            startBoxSelection(board, event);
            return;
        }

        startFreehandSelection(board, event);
    }

    function updateLassoSelection(board, event) {
        if (isPolygonalSelectionTool()) {
            updatePolygonalSelectionPreview(board, event);
            return;
        }

        if (isBoxSelectionTool()) {
            updateBoxSelectionPreview(board, event);
            return;
        }

        updateFreehandSelection(board, event);
    }

    function startFreehandSelection(board, event) {
        var point = getSelectionPointerPosition(board, event);

        clearSelectionDraft(board);
        if (currentSelectionBehavior === SELECTION_BEHAVIORS.NORMAL) {
            clearSelection(board);
        }
        board.lassoSelectionStroke = {
            points: [point],
            lastPoint: point
        };
        board.pointerStartPosition = point;
        board.previewPointerPosition = point;
        renderLassoSelectionPreview(board, board.lassoSelectionStroke.points);
    }

    function updateFreehandSelection(board, event) {
        var stroke = board.lassoSelectionStroke;
        var point;

        if (!stroke) {
            return;
        }

        point = getSelectionPointerPosition(board, event);

        if (getPointDistance(stroke.lastPoint, point) >= 2) {
            stroke.points.push(point);
            stroke.lastPoint = point;
        }

        board.previewPointerPosition = point;
        renderLassoSelectionPreview(board, stroke.points);
    }

    function finishFreehandSelection(board, event) {
        var stroke = board.lassoSelectionStroke;
        var point;
        var points;

        if (!stroke) {
            return;
        }

        point = getSelectionPointerPosition(board, event);

        if (getPointDistance(stroke.lastPoint, point) >= 2) {
            stroke.points.push(point);
        }

        points = simplifyLassoPoints(stroke.points);
        board.lassoSelectionStroke = null;
        clearTempSquare(board);

        if (points.length < 3) {
            clearSelection(board);
            return;
        }

        setPolygonSelection(board, "freehand", points);
        renderLassoSelection(board);
    }

    function addPolygonalSelectionPoint(board, event) {
        var point = getSelectionPointerPosition(board, event);
        var path = board.polygonalSelectionPath;

        if (!path) {
            clearSelectionDraft(board);
            if (currentSelectionBehavior === SELECTION_BEHAVIORS.NORMAL) {
                clearSelection(board);
            }
            board.polygonalSelectionPath = {
                points: [point],
                previewPoint: point
            };
            renderPolygonalSelectionPreview(board);
            return;
        }

        if (path.points.length >= 3 && getPointDistance(path.points[0], point) <= 8) {
            finishPolygonalSelection(board, event);
            return;
        }

        path.points.push(point);
        path.previewPoint = point;
        renderPolygonalSelectionPreview(board);
    }

    function updatePolygonalSelectionPreview(board, event) {
        var path = board.polygonalSelectionPath;

        if (!path) {
            return;
        }

        path.previewPoint = getSelectionPointerPosition(board, event);
        renderPolygonalSelectionPreview(board);
    }

    function finishPolygonalSelection(board, event) {
        var path = board.polygonalSelectionPath;
        var points;

        if (!path) {
            return;
        }

        if (event && event.detail < 2 && path.points.length >= 3) {
            path.previewPoint = getSelectionPointerPosition(board, event);
        }

        points = simplifyLassoPoints(path.points);
        board.polygonalSelectionPath = null;
        clearTempSquare(board);

        if (points.length < 3) {
            clearSelection(board);
            return;
        }

        setPolygonSelection(board, "polygonal", points);
        renderLassoSelection(board);
    }

    function renderPolygonalSelectionPreview(board) {
        var path = board.polygonalSelectionPath;
        var points;

        if (!path || !path.points.length) {
            return;
        }

        points = path.points.slice();

        if (path.previewPoint && getPointDistance(points[points.length - 1], path.previewPoint) > 0) {
            points.push(path.previewPoint);
        }

        renderLassoSelectionPreview(board, points);
    }

    function startBoxSelection(board, event) {
        var point = getSelectionPointerPosition(board, event);

        clearSelectionDraft(board);
        if (currentSelectionBehavior === SELECTION_BEHAVIORS.NORMAL) {
            clearSelection(board);
        }
        board.pointerStartPosition = point;
        board.previewPointerPosition = point;
        renderBoxSelectionPreview(board, point, point);
    }

    function updateBoxSelectionPreview(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint;

        if (!fromPoint) {
            return;
        }

        toPoint = getSelectionPointerPosition(board, event);
        board.previewPointerPosition = toPoint;
        renderBoxSelectionPreview(board, fromPoint, getBoxSelectionEndPoint(board, fromPoint, toPoint, event));
    }

    function getBoxSelectionEndPoint(board, fromPoint, toPoint, event) {
        var modifierEvent = getPreviewModifierEvent(board, event);

        if (fromPoint && toPoint && modifierEvent.shiftKey) {
            return getSquareEndPoint(fromPoint, toPoint);
        }

        return toPoint;
    }

    function finishBoxSelection(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint;
        var bounds;

        if (!fromPoint) {
            return;
        }

        toPoint = getBoxSelectionEndPoint(board, fromPoint, getSelectionPointerPosition(board, event), event);
        bounds = getSelectionBoundsFromPoints(fromPoint, toPoint);
        clearTempSquare(board);

        if (bounds.width < 1 || bounds.height < 1) {
            clearSelection(board);
            return;
        }

        if (isOvalSelectionTool()) {
            setOvalSelection(board, bounds);
            return;
        }

        setRectangleSelection(board, bounds);
    }

    function renderBoxSelectionPreview(board, fromPoint, toPoint) {
        var bounds = getSelectionBoundsFromPoints(fromPoint, toPoint);

        if (!board || !board.tempLayerElement) {
            return;
        }

        board.tempLayerElement.innerHTML = getBoxSelectionSvgString(bounds, isOvalSelectionTool());
    }

    function setPolygonSelection(board, type, points) {
        var maskCanvas = createPolygonSelectionMask(board, points);

        if (isSelectionMaskEmpty(maskCanvas)) {
            clearSelection(board);
            return;
        }

        applySelectionBehavior(board, {
            type: type,
            points: points,
            bounds: getLassoBounds(points),
            maskCanvas: maskCanvas
        });
    }

    function setRectangleSelection(board, bounds) {
        var maskCanvas = createRectangleSelectionMask(board, bounds);

        if (isSelectionMaskEmpty(maskCanvas)) {
            clearSelection(board);
            return;
        }

        applySelectionBehavior(board, {
            type: "rectangle",
            bounds: bounds,
            maskCanvas: maskCanvas
        });
        renderLassoSelection(board);
    }

    function setOvalSelection(board, bounds) {
        var maskCanvas = createOvalSelectionMask(board, bounds);

        if (isSelectionMaskEmpty(maskCanvas)) {
            clearSelection(board);
            return;
        }

        applySelectionBehavior(board, {
            type: "oval",
            bounds: bounds,
            maskCanvas: maskCanvas
        });
        renderLassoSelection(board);
    }

    function applySelectionBehavior(board, nextSelection) {
        var combinedMask;

        if (!board.selection || currentSelectionBehavior === SELECTION_BEHAVIORS.NORMAL) {
            board.selection = nextSelection;
            notifySelectionStateChange(board);
            return;
        }

        if (currentSelectionBehavior === SELECTION_BEHAVIORS.ADD) {
            combinedMask = combineSelectionMasks(board, board.selection.maskCanvas, nextSelection.maskCanvas, "source-over");
        } else if (currentSelectionBehavior === SELECTION_BEHAVIORS.REMOVE) {
            combinedMask = combineSelectionMasks(board, board.selection.maskCanvas, nextSelection.maskCanvas, "destination-out");
        }

        if (!combinedMask || isSelectionMaskEmpty(combinedMask)) {
            clearSelection(board);
            return;
        }

        board.selection = {
            type: "mask",
            bounds: getSelectionMaskBounds(combinedMask),
            maskCanvas: combinedMask
        };
        notifySelectionStateChange(board);
    }

    function clearSelection(board) {
        if (!board) {
            return;
        }

        board.selection = null;
        board.lassoSelectionStroke = null;
        board.polygonalSelectionPath = null;

        if (board.selectionLayerElement) {
            board.selectionLayerElement.innerHTML = "";
        }

        clearTempSquare(board);
        notifySelectionStateChange(board);
    }

    function clearSelectionDraft(board) {
        if (!board) {
            return;
        }

        board.lassoSelectionStroke = null;
        board.polygonalSelectionPath = null;
        board.pointerStartPosition = null;
        board.previewPointerPosition = null;
        clearTempSquare(board);
    }

    function renderLassoSelectionPreview(board, points) {
        if (!board || !board.tempLayerElement) {
            return;
        }

        board.tempLayerElement.innerHTML = getLassoSvgString(points, false);
    }

    function renderLassoSelection(board) {
        if (!board || !board.selectionLayerElement || !board.selection) {
            return;
        }

        if (board.selection.type === "mask") {
            board.selectionLayerElement.innerHTML = getMaskSelectionHtml(board.selection.maskCanvas);
            return;
        }

        if (board.selection.points) {
            board.selectionLayerElement.innerHTML = getLassoSvgString(board.selection.points, true);
            return;
        }

        if (board.selection.bounds) {
            board.selectionLayerElement.innerHTML = getBoxSelectionSvgString(board.selection.bounds, board.selection.type === "oval");
        }
    }

    function getLassoSvgString(points, closed) {
        var pointString;
        var shapeTag;

        if (!points || !points.length) {
            return "";
        }

        pointString = points.map(function(point) {
            return escapeHtml(point.x) + "," + escapeHtml(point.y);
        }).join(" ");

        shapeTag = closed ? "polygon" : "polyline";

        return "<svg class=\"paint-board-lasso-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
            (closed ? "<polygon class=\"paint-board-lasso-fill\" points=\"" + pointString + "\"></polygon>" : "") +
            "<" + shapeTag + " class=\"paint-board-lasso-outline paint-board-lasso-outline-dark\" points=\"" + pointString + "\"></" + shapeTag + ">" +
            "<" + shapeTag + " class=\"paint-board-lasso-outline paint-board-lasso-outline-light\" points=\"" + pointString + "\"></" + shapeTag + ">" +
            "</svg>";
    }

    function getBoxSelectionSvgString(bounds, oval) {
        var shape;

        if (!bounds) {
            return "";
        }

        if (oval) {
            shape = "<ellipse class=\"paint-board-lasso-fill\" cx=\"" + escapeHtml(bounds.left + (bounds.width / 2)) + "\" cy=\"" + escapeHtml(bounds.top + (bounds.height / 2)) + "\" rx=\"" + escapeHtml(bounds.width / 2) + "\" ry=\"" + escapeHtml(bounds.height / 2) + "\"></ellipse>" +
                "<ellipse class=\"paint-board-lasso-outline paint-board-lasso-outline-dark\" cx=\"" + escapeHtml(bounds.left + (bounds.width / 2)) + "\" cy=\"" + escapeHtml(bounds.top + (bounds.height / 2)) + "\" rx=\"" + escapeHtml(bounds.width / 2) + "\" ry=\"" + escapeHtml(bounds.height / 2) + "\"></ellipse>" +
                "<ellipse class=\"paint-board-lasso-outline paint-board-lasso-outline-light\" cx=\"" + escapeHtml(bounds.left + (bounds.width / 2)) + "\" cy=\"" + escapeHtml(bounds.top + (bounds.height / 2)) + "\" rx=\"" + escapeHtml(bounds.width / 2) + "\" ry=\"" + escapeHtml(bounds.height / 2) + "\"></ellipse>";
        } else {
            shape = "<rect class=\"paint-board-lasso-fill\" x=\"" + escapeHtml(bounds.left) + "\" y=\"" + escapeHtml(bounds.top) + "\" width=\"" + escapeHtml(bounds.width) + "\" height=\"" + escapeHtml(bounds.height) + "\"></rect>" +
                "<rect class=\"paint-board-lasso-outline paint-board-lasso-outline-dark\" x=\"" + escapeHtml(bounds.left) + "\" y=\"" + escapeHtml(bounds.top) + "\" width=\"" + escapeHtml(bounds.width) + "\" height=\"" + escapeHtml(bounds.height) + "\"></rect>" +
                "<rect class=\"paint-board-lasso-outline paint-board-lasso-outline-light\" x=\"" + escapeHtml(bounds.left) + "\" y=\"" + escapeHtml(bounds.top) + "\" width=\"" + escapeHtml(bounds.width) + "\" height=\"" + escapeHtml(bounds.height) + "\"></rect>";
        }

        return "<svg class=\"paint-board-lasso-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + shape + "</svg>";
    }

    function getMaskSelectionHtml(maskCanvas) {
        var pathData;

        if (!maskCanvas) {
            return "";
        }

        pathData = getSelectionMaskPathData(maskCanvas);

        if (!pathData) {
            return "";
        }

        return "<svg class=\"paint-board-lasso-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
            "<path class=\"paint-board-lasso-outline paint-board-lasso-outline-dark\" d=\"" + escapeHtml(pathData) + "\"></path>" +
            "<path class=\"paint-board-lasso-outline paint-board-lasso-outline-light\" d=\"" + escapeHtml(pathData) + "\"></path>" +
            "</svg>";
    }

    function simplifyLassoPoints(points) {
        var simplified = [];
        var i;

        for (i = 0; i < points.length; i++) {
            if (!simplified.length || getPointDistance(simplified[simplified.length - 1], points[i]) >= 1) {
                simplified.push({
                    x: points[i].x,
                    y: points[i].y
                });
            }
        }

        return simplified;
    }

    function getPointDistance(a, b) {
        var dx;
        var dy;

        if (!a || !b) {
            return 0;
        }

        dx = b.x - a.x;
        dy = b.y - a.y;

        return Math.sqrt((dx * dx) + (dy * dy));
    }

    function getLassoBounds(points) {
        var left = points[0].x;
        var top = points[0].y;
        var right = points[0].x;
        var bottom = points[0].y;
        var i;

        for (i = 1; i < points.length; i++) {
            left = Math.min(left, points[i].x);
            top = Math.min(top, points[i].y);
            right = Math.max(right, points[i].x);
            bottom = Math.max(bottom, points[i].y);
        }

        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };
    }

    function getSelectionBoundsFromPoints(fromPoint, toPoint) {
        var left = Math.min(fromPoint.x, toPoint.x);
        var top = Math.min(fromPoint.y, toPoint.y);
        var right = Math.max(fromPoint.x, toPoint.x);
        var bottom = Math.max(fromPoint.y, toPoint.y);

        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };
    }

    function createSelectionMaskCanvas(board) {
        var maskCanvas = document.createElement("canvas");

        maskCanvas.width = board.canvas.width;
        maskCanvas.height = board.canvas.height;

        return maskCanvas;
    }

    function createPolygonSelectionMask(board, points) {
        var maskCanvas = createSelectionMaskCanvas(board);
        var maskContext = maskCanvas.getContext("2d");
        var i;

        maskContext.fillStyle = "#ffffff";
        maskContext.beginPath();
        maskContext.moveTo(points[0].x, points[0].y);

        for (i = 1; i < points.length; i++) {
            maskContext.lineTo(points[i].x, points[i].y);
        }

        maskContext.closePath();
        maskContext.fill();

        return maskCanvas;
    }

    function createRectangleSelectionMask(board, bounds) {
        var maskCanvas = createSelectionMaskCanvas(board);
        var maskContext = maskCanvas.getContext("2d");

        maskContext.fillStyle = "#ffffff";
        maskContext.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

        return maskCanvas;
    }

    function createOvalSelectionMask(board, bounds) {
        var maskCanvas = createSelectionMaskCanvas(board);
        var maskContext = maskCanvas.getContext("2d");

        maskContext.fillStyle = "#ffffff";
        maskContext.beginPath();
        maskContext.ellipse(
            bounds.left + (bounds.width / 2),
            bounds.top + (bounds.height / 2),
            bounds.width / 2,
            bounds.height / 2,
            0,
            0,
            Math.PI * 2
        );
        maskContext.fill();

        return maskCanvas;
    }

    function combineSelectionMasks(board, baseMaskCanvas, nextMaskCanvas, operation) {
        var combinedMask = createSelectionMaskCanvas(board);
        var combinedContext = combinedMask.getContext("2d");

        combinedContext.drawImage(baseMaskCanvas, 0, 0);
        combinedContext.globalCompositeOperation = operation;
        combinedContext.drawImage(nextMaskCanvas, 0, 0);
        combinedContext.globalCompositeOperation = "source-over";

        return combinedMask;
    }

    function isSelectionMaskEmpty(maskCanvas) {
        return !getSelectionMaskBounds(maskCanvas);
    }

    function getSelectionMaskBounds(maskCanvas) {
        var maskContext = maskCanvas.getContext("2d");
        var imageData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        var data = imageData.data;
        var left = maskCanvas.width;
        var top = maskCanvas.height;
        var right = -1;
        var bottom = -1;
        var x;
        var y;
        var index;

        for (y = 0; y < maskCanvas.height; y++) {
            for (x = 0; x < maskCanvas.width; x++) {
                index = ((y * maskCanvas.width) + x) * 4;

                if (data[index + 3] === 0) {
                    continue;
                }

                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x);
                bottom = Math.max(bottom, y);
            }
        }

        if (right < left || bottom < top) {
            return null;
        }

        return {
            left: left,
            top: top,
            right: right + 1,
            bottom: bottom + 1,
            width: (right - left) + 1,
            height: (bottom - top) + 1
        };
    }

    function getSelectionMaskPathData(maskCanvas) {
        var loops = getSelectionMaskBoundaryLoops(maskCanvas);
        var pathParts = [];
        var i;

        for (i = 0; i < loops.length; i++) {
            if (loops[i].length < 2) {
                continue;
            }

            pathParts.push(getSelectionBoundaryLoopPathData(loops[i]));
        }

        return pathParts.join(" ");
    }

    function getSelectionBoundaryLoopPathData(loop) {
        var commands = ["M " + loop[0].x + " " + loop[0].y];
        var i;

        for (i = 1; i < loop.length; i++) {
            commands.push("L " + loop[i].x + " " + loop[i].y);
        }

        commands.push("Z");

        return commands.join(" ");
    }

    function getSelectionMaskBoundaryLoops(maskCanvas) {
        var maskContext = maskCanvas.getContext("2d");
        var maskImageData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        var maskData = maskImageData.data;
        var edgesByStart = {};
        var loops = [];
        var x;
        var y;

        for (y = 0; y < maskCanvas.height; y++) {
            for (x = 0; x < maskCanvas.width; x++) {
                if (!isSelectionMaskPixelFilled(maskData, maskCanvas.width, maskCanvas.height, x, y)) {
                    continue;
                }

                if (!isSelectionMaskPixelFilled(maskData, maskCanvas.width, maskCanvas.height, x, y - 1)) {
                    addSelectionBoundaryEdge(edgesByStart, x, y, x + 1, y);
                }

                if (!isSelectionMaskPixelFilled(maskData, maskCanvas.width, maskCanvas.height, x + 1, y)) {
                    addSelectionBoundaryEdge(edgesByStart, x + 1, y, x + 1, y + 1);
                }

                if (!isSelectionMaskPixelFilled(maskData, maskCanvas.width, maskCanvas.height, x, y + 1)) {
                    addSelectionBoundaryEdge(edgesByStart, x + 1, y + 1, x, y + 1);
                }

                if (!isSelectionMaskPixelFilled(maskData, maskCanvas.width, maskCanvas.height, x - 1, y)) {
                    addSelectionBoundaryEdge(edgesByStart, x, y + 1, x, y);
                }
            }
        }

        while (true) {
            var startKey = getFirstSelectionBoundaryEdgeKey(edgesByStart);

            if (!startKey) {
                break;
            }

            loops.push(traceSelectionBoundaryLoop(edgesByStart, startKey));
        }

        return loops;
    }

    function addSelectionBoundaryEdge(edgesByStart, startX, startY, endX, endY) {
        var key = getSelectionPointKey(startX, startY);

        if (!edgesByStart[key]) {
            edgesByStart[key] = [];
        }

        edgesByStart[key].push({
            start: {
                x: startX,
                y: startY
            },
            end: {
                x: endX,
                y: endY
            }
        });
    }

    function getFirstSelectionBoundaryEdgeKey(edgesByStart) {
        var key;

        for (key in edgesByStart) {
            if (Object.prototype.hasOwnProperty.call(edgesByStart, key) && edgesByStart[key].length) {
                return key;
            }
        }

        return null;
    }

    function traceSelectionBoundaryLoop(edgesByStart, startKey) {
        var edge = removeSelectionBoundaryEdge(edgesByStart, startKey);
        var firstPoint = edge.start;
        var loop = [firstPoint, edge.end];
        var currentPoint = edge.end;
        var currentKey;
        var guard = 0;

        while ((currentPoint.x !== firstPoint.x || currentPoint.y !== firstPoint.y) && guard < 100000) {
            currentKey = getSelectionPointKey(currentPoint.x, currentPoint.y);
            edge = removeSelectionBoundaryEdge(edgesByStart, currentKey);

            if (!edge) {
                break;
            }

            currentPoint = edge.end;
            loop.push(currentPoint);
            guard++;
        }

        return simplifySelectionBoundaryLoop(loop);
    }

    function removeSelectionBoundaryEdge(edgesByStart, key) {
        var edges = edgesByStart[key];
        var edge;

        if (!edges || !edges.length) {
            return null;
        }

        edge = edges.shift();

        if (!edges.length) {
            delete edgesByStart[key];
        }

        return edge;
    }

    function simplifySelectionBoundaryLoop(loop) {
        var simplified = [];
        var i;
        var previous;
        var current;
        var next;

        if (!loop.length) {
            return simplified;
        }

        simplified.push(loop[0]);

        for (i = 1; i < loop.length - 1; i++) {
            previous = simplified[simplified.length - 1];
            current = loop[i];
            next = loop[i + 1];

            if ((previous.x === current.x && current.x === next.x) ||
                (previous.y === current.y && current.y === next.y)) {
                continue;
            }

            simplified.push(current);
        }

        simplified.push(loop[loop.length - 1]);

        return simplified;
    }

    function getSelectionPointKey(x, y) {
        return x + "," + y;
    }

    function isSelectionMaskPixelFilled(maskData, width, height, x, y) {
        var index;

        if (x < 0 || y < 0 || x >= width || y >= height) {
            return false;
        }

        index = ((y * width) + x) * 4;

        return maskData[index + 3] > 0;
    }

    function hasActiveSelection(board) {
        return !!(board && board.selection && board.selection.maskCanvas);
    }

    function isPointInSelection(board, point) {
        var maskContext;
        var pixel;

        if (!hasActiveSelection(board) || !point) {
            return true;
        }

        if (point.x < 0 || point.y < 0 || point.x >= board.canvas.width || point.y >= board.canvas.height) {
            return false;
        }

        maskContext = board.selection.maskCanvas.getContext("2d");
        pixel = maskContext.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;

        return pixel[3] > 0;
    }

    function paintWithSelection(board, paintCallback) {
        var beforeCanvas;

        if (!hasActiveSelection(board)) {
            paintCallback();
            return;
        }

        beforeCanvas = copyBoardCanvas(board);
        paintCallback();
        applySelectionMaskToPaint(board, beforeCanvas);
    }

    function copyBoardCanvas(board) {
        var copyCanvas = document.createElement("canvas");
        var copyContext;

        copyCanvas.width = board.canvas.width;
        copyCanvas.height = board.canvas.height;
        copyContext = copyCanvas.getContext("2d");
        copyContext.drawImage(board.canvas, 0, 0);

        return copyCanvas;
    }

    function getClipboardCanvas(board) {
        var bounds;
        var clipboardCanvas;
        var clipboardContext;

        if (!hasActiveSelection(board)) {
            return board.canvas;
        }

        bounds = getSelectionMaskBounds(board.selection.maskCanvas);
        if (!bounds) {
            return board.canvas;
        }

        clipboardCanvas = document.createElement("canvas");
        clipboardCanvas.width = bounds.width;
        clipboardCanvas.height = bounds.height;
        clipboardContext = clipboardCanvas.getContext("2d");
        clipboardContext.drawImage(
            board.canvas,
            bounds.left,
            bounds.top,
            bounds.width,
            bounds.height,
            0,
            0,
            bounds.width,
            bounds.height
        );
        clipboardContext.globalCompositeOperation = "destination-in";
        clipboardContext.drawImage(
            board.selection.maskCanvas,
            bounds.left,
            bounds.top,
            bounds.width,
            bounds.height,
            0,
            0,
            bounds.width,
            bounds.height
        );
        clipboardContext.globalCompositeOperation = "source-over";

        return clipboardCanvas;
    }

    function applySelectionMaskToPaint(board, beforeCanvas) {
        var selectedCanvas = document.createElement("canvas");
        var selectedContext;

        selectedCanvas.width = board.canvas.width;
        selectedCanvas.height = board.canvas.height;
        selectedContext = selectedCanvas.getContext("2d");
        selectedContext.drawImage(board.canvas, 0, 0);
        selectedContext.globalCompositeOperation = "destination-in";
        selectedContext.drawImage(board.selection.maskCanvas, 0, 0);

        board.context.clearRect(0, 0, board.canvas.width, board.canvas.height);
        board.context.drawImage(beforeCanvas, 0, 0);
        board.context.drawImage(selectedCanvas, 0, 0);
    }

    function fillSelectionWithFrontColor(board) {
        if (!hasActiveSelection(board)) {
            return false;
        }

        beginUndoableAction(board);
        markUndoableChange(board);
        paintWithSelection(board, function() {
            board.context.fillStyle = getCurrentPaintColor(board);
            board.context.fillRect(0, 0, board.canvas.width, board.canvas.height);
        });
        commitUndoableAction(board);

        return true;
    }

    function deleteSelection(board) {
        if (!hasActiveSelection(board)) {
            return false;
        }

        beginUndoableAction(board);
        markUndoableChange(board);
        board.context.save();
        board.context.globalCompositeOperation = "destination-out";
        board.context.drawImage(board.selection.maskCanvas, 0, 0);
        board.context.restore();
        commitUndoableAction(board);

        return true;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function startPointerAction(board, event) {
        if (currentPaintToolMode === PAINT_TOOL_MODES.INK_DROPPER) {
            event.preventDefault();
            inkDropperPointerEvent(board, event);
            return;
        }

        if (isLassoSelectionToolMode()) {
            event.preventDefault();
            startLassoSelection(board, event);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.MAGIC_WAND) {
            event.preventDefault();
            magicWandPointerEvent(board, event);
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
            board.pointerStartPosition = getSelectionPointerPosition(board, event);
            board.previewPointerPosition = board.pointerStartPosition;
            return;
        }

        if (isStraightLineToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getSelectionPointerPosition(board, event);
            board.previewPointerPosition = board.pointerStartPosition;
            return;
        }

        if (isShapeToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getSelectionPointerPosition(board, event);
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

        if (isLassoSelectionToolMode()) {
            updateLassoSelection(board, event);
            return;
        }

        if (currentPaintToolMode === PAINT_TOOL_MODES.MAGIC_WAND) {
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
        var point = getStrokePaintPointerPosition(board, event);

        event.preventDefault();

        if (!point) {
            board.lastPointerPosition = null;
            board.designedBrush2Stroke = null;
            return;
        }

        if (isContinuousLineToolMode() && !board.lastPointerPosition) {
            markUndoableChange(board);
            paintWithSelection(board, function() {
                paintContinuousLineStart(board, point);
            });
            board.lastPointerPosition = point;
            return;
        }

        markUndoableChange(board);

        paintWithSelection(board, function() {
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
                if (isPointInsideCanvas(board, point)) {
                    paintRoundPoint(board, point.x, point.y);
                }
            } else if (currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH) {
                if (isPointInsideCanvas(board, point)) {
                    paintOldBrushStamp(board, point.x, point.y);
                }
            } else {
                if (isPointInsideCanvas(board, point)) {
                    paintSquaredPoint(board, point.x, point.y);
                }
            }
        });

        board.lastPointerPosition = point;
    }

    function isContinuousLineToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH;
    }

    function isDragPaintToolMode() {
        return currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_POINTS ||
            currentPaintToolMode === PAINT_TOOL_MODES.ROUND_POINTS ||
            currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES ||
            currentPaintToolMode === PAINT_TOOL_MODES.OLD_BRUSH ||
            currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH ||
            currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH_2;
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

        rawPoint = getSelectionPointerPosition(board, event);
        points = getShapeDrawPoints(fromPoint, rawPoint, getPreviewModifierEvent(board, event));
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        markUndoableChange(board);
        paintWithSelection(board, function() {
            paintShape(board, points.from, points.to);
        });
    }

    function paintGradientPointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var toPoint = getGradientEndPoint(fromPoint, getSelectionPointerPosition(board, event), event);

        if (!fromPoint) {
            return;
        }

        event.preventDefault();
        markUndoableChange(board);
        paintWithSelection(board, function() {
            paintGradient(board, fromPoint, toPoint);
        });
    }

    function paintStraightLinePointerEvent(board, event) {
        var fromPoint = board.pointerStartPosition;
        var rawPoint;
        var toPoint;
        var lineDesign;

        if (!fromPoint) {
            return;
        }

        rawPoint = getSelectionPointerPosition(board, event);
        toPoint = getGradientEndPoint(fromPoint, rawPoint, event);
        lineDesign = getCurrentStoredLineDesign();
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        markUndoableChange(board);
        paintWithSelection(board, function() {
            paintLine(board, fromPoint, toPoint, "butt", "miter", lineDesign);
        });
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

        if (!isPointInSelection(board, point)) {
            return;
        }

        paintWithSelection(board, function() {
            paintBucket(board, point.x, point.y);
        });
    }

    function patternBucketPointerEvent(board, event) {
        var point = getPointerPosition(board, event);

        if (!isPointInSelection(board, point)) {
            return;
        }

        paintWithSelection(board, function() {
            paintPatternBucket(board, point.x, point.y);
        });
    }

    function inkDropperPointerEvent(board, event) {
        var point = getPointerPosition(board, event);
        var imageData = board.context.getImageData(point.x, point.y, 1, 1);
        var color = pixelDataToHex(imageData.data);

        notifyInkDropperColorSelected(color, board, point);
    }

    function magicWandPointerEvent(board, event) {
        var point = getPointerPosition(board, event);
        var sampleX = clamp(Math.floor(point.x), 0, board.canvas.width - 1);
        var sampleY = clamp(Math.floor(point.y), 0, board.canvas.height - 1);
        var maskCanvas = createMagicWandMask(board, sampleX, sampleY, currentMagicWandOptions);

        if (!maskCanvas || isSelectionMaskEmpty(maskCanvas)) {
            if (currentSelectionBehavior === SELECTION_BEHAVIORS.NORMAL) {
                clearSelection(board);
            }

            return;
        }

        applySelectionBehavior(board, {
            type: "mask",
            bounds: getSelectionMaskBounds(maskCanvas),
            maskCanvas: maskCanvas
        });

        renderLassoSelection(board);
    }

    function createMagicWandMask(board, startX, startY, options) {
        var width = board.canvas.width;
        var height = board.canvas.height;
        var sourceData;
        var reference;
        var matcher;
        var matched;
        var maskCanvas;
        var maskContext;
        var maskImageData;

        if (width <= 0 || height <= 0) {
            return null;
        }

        sourceData = board.context.getImageData(0, 0, width, height).data;
        reference = getMagicWandReferenceColor(sourceData, width, startX, startY);
        matcher = createMagicWandMatcher(options, reference);

        if (options && options.contiguous) {
            matched = magicWandFloodFill(sourceData, width, height, startX, startY, matcher);
        } else {
            matched = magicWandGlobalMatch(sourceData, width, height, matcher);
        }

        maskCanvas = createSelectionMaskCanvas(board);
        maskContext = maskCanvas.getContext("2d");
        maskImageData = maskContext.createImageData(width, height);

        fillMagicWandMask(maskImageData.data, matched, width, height);

        if (options && options.antiAlias) {
            applyMagicWandAntiAlias(maskImageData.data, matched, width, height);
        }

        maskContext.putImageData(maskImageData, 0, 0);

        return maskCanvas;
    }

    function getMagicWandReferenceColor(data, width, x, y) {
        var index = ((y * width) + x) * 4;
        var reference = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };

        reference.lab = rgbToLab(reference.r, reference.g, reference.b);

        return reference;
    }

    function createMagicWandMatcher(options, reference) {
        var tolerance = normalizeMagicWandTolerance(options ? options.tolerance : 0);
        var mode = normalizeMagicWandMode(options ? options.mode : DEFAULT_MAGIC_WAND_MODE);

        if (mode === MAGIC_WAND_MODES.PHOTOSHOP) {
            return createMagicWandPhotoshopMatcher(tolerance, reference);
        }

        if (mode === MAGIC_WAND_MODES.PERCEPTUAL) {
            return createMagicWandPerceptualMatcher(tolerance, reference);
        }

        return createMagicWandFastMatcher(tolerance, reference);
    }

    function createMagicWandFastMatcher(tolerance, reference) {
        var maxDistance = (tolerance / 100) * MAGIC_WAND_MAX_DISTANCE;
        var thresholdSquared = maxDistance * maxDistance;

        return function(data, index) {
            var dr = data[index] - reference.r;
            var dg = data[index + 1] - reference.g;
            var db = data[index + 2] - reference.b;
            var da = data[index + 3] - reference.a;

            return ((dr * dr) + (dg * dg) + (db * db) + (da * da)) <= thresholdSquared;
        };
    }

    function createMagicWandPhotoshopMatcher(tolerance, reference) {
        var channelTolerance = (tolerance / 100) * 255;

        return function(data, index) {
            return Math.abs(data[index] - reference.r) <= channelTolerance &&
                Math.abs(data[index + 1] - reference.g) <= channelTolerance &&
                Math.abs(data[index + 2] - reference.b) <= channelTolerance &&
                Math.abs(data[index + 3] - reference.a) <= channelTolerance;
        };
    }

    function createMagicWandPerceptualMatcher(tolerance, reference) {
        var threshold = (tolerance / 100) * MAGIC_WAND_MAX_LAB_DISTANCE;
        var referenceLab = reference.lab;

        return function(data, index) {
            var lab = rgbToLab(data[index], data[index + 1], data[index + 2]);
            var dl = lab.l - referenceLab.l;
            var da = lab.a - referenceLab.a;
            var db = lab.b - referenceLab.b;
            var alphaDiff = Math.abs(data[index + 3] - reference.a);

            if (alphaDiff > (tolerance / 100) * 255) {
                return false;
            }

            return Math.sqrt((dl * dl) + (da * da) + (db * db)) <= threshold;
        };
    }

    function rgbToLab(r, g, b) {
        var sr = magicWandSrgbToLinear(r / 255);
        var sg = magicWandSrgbToLinear(g / 255);
        var sb = magicWandSrgbToLinear(b / 255);
        var x = ((sr * 0.4124) + (sg * 0.3576) + (sb * 0.1805)) / 0.95047;
        var y = ((sr * 0.2126) + (sg * 0.7152) + (sb * 0.0722)) / 1;
        var z = ((sr * 0.0193) + (sg * 0.1192) + (sb * 0.9505)) / 1.08883;
        var fx = magicWandLabPivot(x);
        var fy = magicWandLabPivot(y);
        var fz = magicWandLabPivot(z);

        return {
            l: (116 * fy) - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    }

    function magicWandSrgbToLinear(channel) {
        if (channel <= 0.04045) {
            return channel / 12.92;
        }

        return Math.pow((channel + 0.055) / 1.055, 2.4);
    }

    function magicWandLabPivot(value) {
        if (value > 0.008856) {
            return Math.pow(value, 1 / 3);
        }

        return (7.787 * value) + (16 / 116);
    }

    function magicWandFloodFill(data, width, height, startX, startY, matcher) {
        var matched = new Uint8Array(width * height);
        var stack = [(startY * width) + startX];
        var pixel;
        var x;
        var y;

        while (stack.length) {
            pixel = stack.pop();

            if (matched[pixel]) {
                continue;
            }

            if (!matcher(data, pixel * 4)) {
                continue;
            }

            matched[pixel] = 1;
            x = pixel % width;
            y = (pixel - x) / width;

            if (x > 0) {
                stack.push(pixel - 1);
            }

            if (x < width - 1) {
                stack.push(pixel + 1);
            }

            if (y > 0) {
                stack.push(pixel - width);
            }

            if (y < height - 1) {
                stack.push(pixel + width);
            }
        }

        return matched;
    }

    function magicWandGlobalMatch(data, width, height, matcher) {
        var matched = new Uint8Array(width * height);
        var total = width * height;
        var pixel;

        for (pixel = 0; pixel < total; pixel++) {
            if (matcher(data, pixel * 4)) {
                matched[pixel] = 1;
            }
        }

        return matched;
    }

    function fillMagicWandMask(maskData, matched, width, height) {
        var total = width * height;
        var pixel;
        var index;

        for (pixel = 0; pixel < total; pixel++) {
            if (!matched[pixel]) {
                continue;
            }

            index = pixel * 4;
            maskData[index] = 255;
            maskData[index + 1] = 255;
            maskData[index + 2] = 255;
            maskData[index + 3] = 255;
        }
    }

    function applyMagicWandAntiAlias(maskData, matched, width, height) {
        var total = width * height;
        var pixel;
        var index;
        var x;
        var y;
        var neighbors;

        for (pixel = 0; pixel < total; pixel++) {
            if (matched[pixel]) {
                continue;
            }

            x = pixel % width;
            y = (pixel - x) / width;
            neighbors = countMagicWandMatchedNeighbors(matched, width, height, x, y);

            if (neighbors === 0) {
                continue;
            }

            index = pixel * 4;
            maskData[index] = 255;
            maskData[index + 1] = 255;
            maskData[index + 2] = 255;
            maskData[index + 3] = Math.round((neighbors / 8) * 160);
        }
    }

    function countMagicWandMatchedNeighbors(matched, width, height, x, y) {
        var count = 0;
        var offsetX;
        var offsetY;
        var neighborX;
        var neighborY;

        for (offsetY = -1; offsetY <= 1; offsetY++) {
            for (offsetX = -1; offsetX <= 1; offsetX++) {
                if (offsetX === 0 && offsetY === 0) {
                    continue;
                }

                neighborX = x + offsetX;
                neighborY = y + offsetY;

                if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) {
                    continue;
                }

                if (matched[(neighborY * width) + neighborX]) {
                    count++;
                }
            }
        }

        return count;
    }

    function paintAt(board, x, y) {
        var point = {
            x: x,
            y: y
        };

        if (!isPointInSelection(board, point)) {
            return;
        }

        beginUndoableAction(board);
        markUndoableChange(board);
        paintWithSelection(board, function() {
            paintSquaredPoint(board, x, y);
        });
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
        board.context.strokeStyle = lineDesign && lineDesign.color ? lineDesign.color : getCurrentPaintColor(board);
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
        var color = lineDesign && lineDesign.color ? lineDesign.color : getCurrentPaintColor(board);
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

        if (useFrontColor && isPatternMonochrome(patternData)) {
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

    function isPatternMonochrome(patternData) {
        var data = patternData.data;
        var index;
        var min;
        var max;

        if (typeof patternData.isMonochrome === "boolean") {
            return patternData.isMonochrome;
        }

        patternData.isMonochrome = true;

        for (index = 0; index < data.length; index += 4) {
            if (data[index + 3] === 0) {
                continue;
            }

            min = Math.min(data[index], data[index + 1], data[index + 2]);
            max = Math.max(data[index], data[index + 1], data[index + 2]);

            if (max - min > 2) {
                patternData.isMonochrome = false;
                break;
            }
        }

        return patternData.isMonochrome;
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
        board.context.lineWidth = fill ? Math.max(1, getCurrentBrushSize(board)) : getCurrentShapeStrokeWidth(board);

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
        board.context.lineWidth = fill ? Math.max(1, getCurrentBrushSize(board)) : getCurrentShapeStrokeWidth(board);
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

    function canStartActionOutsideCanvas() {
        return isLassoSelectionToolMode() ||
            isDragPaintToolMode() ||
            isStraightLineToolMode() ||
            isShapeToolMode() ||
            currentPaintToolMode === PAINT_TOOL_MODES.GRADIENT;
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
        paintWithSelection(board, function() {
            board.context.drawImage(image, x || 0, y || 0);
        });
        commitUndoableAction(board);
    }

    function startFloatingPaste(board, image) {
        var size;
        var layer;
        var canvas;
        var context;
        var floatingPaste;

        if (!board || !image) {
            return;
        }

        cancelFloatingPaste(board);
        size = getImageDrawSize(image);
        layer = document.createElement("div");
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d");

        layer.id = board.id + "-floating-paste-layer";
        layer.className = "paint-board-floating-paste-layer";
        layer.setAttribute("data-layer", layer.id);
        layer.setAttribute("data-type", "TEMP");
        layer.style.width = board.canvas.width + "px";
        layer.style.height = board.canvas.height + "px";
        layer.title = "Scale mode: press T to distort corners independently.";

        canvas.className = "paint-board-floating-paste-canvas";
        canvas.width = board.canvas.width;
        canvas.height = board.canvas.height;
        canvas.style.width = board.canvas.width + "px";
        canvas.style.height = board.canvas.height + "px";

        layer.appendChild(canvas);
        board.overlaysElement.insertBefore(layer, board.tempLayerElement);

        floatingPaste = {
            image: image,
            layer: layer,
            canvas: canvas,
            context: context,
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
            corners: createFloatingPasteRectangleCorners(0, 0, size.width, size.height),
            startCorners: null,
            warpPoints: createFloatingPasteWarpGrid(
                createFloatingPasteRectangleCorners(0, 0, size.width, size.height)
            ),
            startWarpPoints: null,
            warpRoundBehavior: false,
            transformOperation: "scale",
            distortMode: false,
            transformAlgorithms: {
                scale: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("scale") :
                    "nearest-neighbor",
                rotate: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("rotate") :
                    "smooth",
                skew: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("skew") :
                    "smooth",
                distort: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("distort") :
                    "pixel-warp",
                perspective: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("perspective") :
                    "projective",
                warp: global.ImageTransformRegistry ?
                    global.ImageTransformRegistry.getDefaultAlgorithm("warp") :
                    "smooth"
            },
            isDragging: false,
            dragAction: null,
            resizeHandle: null,
            pointerId: null,
            dragOffsetX: 0,
            dragOffsetY: 0,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startPointerX: 0,
            startPointerY: 0,
            aspectRatio: size.height ? size.width / size.height : 1,
            pointerDown: null,
            pointerMove: null,
            pointerUp: null,
            pointerHover: null,
            doubleClick: null,
            keyDown: null
        };

        floatingPaste.pointerDown = function(event) {
            startFloatingPasteDrag(board, event);
        };
        floatingPaste.pointerMove = function(event) {
            moveFloatingPaste(board, event);
        };
        floatingPaste.pointerUp = function(event) {
            stopFloatingPasteDrag(board, event);
        };
        floatingPaste.pointerHover = function(event) {
            updateFloatingPasteCursor(board, event);
        };
        floatingPaste.doubleClick = function(event) {
            event.preventDefault();
            commitFloatingPaste(board);
        };
        floatingPaste.keyDown = function(event) {
            handleFloatingPasteKeyDown(board, event);
        };

        board.floatingPaste = floatingPaste;
        layer.addEventListener("pointerdown", floatingPaste.pointerDown);
        layer.addEventListener("pointermove", floatingPaste.pointerHover);
        layer.addEventListener("dblclick", floatingPaste.doubleClick);
        document.addEventListener("pointermove", floatingPaste.pointerMove, true);
        document.addEventListener("pointerup", floatingPaste.pointerUp, true);
        document.addEventListener("pointercancel", floatingPaste.pointerUp, true);
        document.addEventListener("keydown", floatingPaste.keyDown);
        renderFloatingPaste(board);
        notifyFloatingPasteChange(board, true);
    }

    function getImageDrawSize(image) {
        return {
            width: image.naturalWidth || image.videoWidth || image.width || 0,
            height: image.naturalHeight || image.videoHeight || image.height || 0
        };
    }

    function renderFloatingPaste(board) {
        var paste = board && board.floatingPaste;
        var handles;
        var i;

        if (!paste) {
            return;
        }

        paste.context.clearRect(0, 0, paste.canvas.width, paste.canvas.height);
        drawFloatingPasteImage(paste.context, paste);
        paste.context.save();
        paste.context.strokeStyle = "#000";
        paste.context.setLineDash([4, 4]);
        paste.context.lineWidth = 1;
        traceFloatingPasteOutline(paste.context, paste.corners);
        paste.context.stroke();
        paste.context.strokeStyle = "#fff";
        paste.context.lineDashOffset = 4;
        traceFloatingPasteOutline(paste.context, paste.corners);
        paste.context.stroke();
        paste.context.restore();
        if (paste.transformOperation === "warp") {
            drawFloatingPasteWarpGrid(
                paste.context,
                paste.warpPoints,
                paste.warpRoundBehavior
            );
        }
        handles = getFloatingPasteHandles(paste);
        paste.context.save();
        paste.context.fillStyle = paste.transformOperation === "scale" ? "#fff" : "#ffe36e";
        paste.context.strokeStyle = "#000";
        paste.context.lineWidth = 1;
        paste.context.setLineDash([]);
        for (i = 0; i < handles.length; i++) {
            paste.context.fillRect(handles[i].left, handles[i].top, handles[i].size, handles[i].size);
            paste.context.strokeRect(handles[i].left + 0.5, handles[i].top + 0.5, handles[i].size - 1, handles[i].size - 1);
        }
        paste.context.restore();
    }

    function startFloatingPasteDrag(board, event) {
        var paste = board && board.floatingPaste;
        var point;
        var handle;

        if (!paste || !isPrimaryPaintInput(event)) {
            return;
        }

        point = getSelectionPointerPosition(board, event);
        handle = getFloatingPasteHandleAtPoint(paste, point);

        if (!handle && !isPointInsideBounds(point, paste)) {
            commitFloatingPaste(board);
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        paste.isDragging = true;
        paste.dragAction = handle ? "resize" : "move";
        paste.resizeHandle = handle;
        paste.pointerId = typeof event.pointerId === "number" ? event.pointerId : null;
        paste.dragOffsetX = point.x - paste.x;
        paste.dragOffsetY = point.y - paste.y;
        paste.startX = paste.x;
        paste.startY = paste.y;
        paste.startWidth = paste.width;
        paste.startHeight = paste.height;
        paste.startPointerX = point.x;
        paste.startPointerY = point.y;
        paste.startCorners = cloneFloatingPasteCorners(paste.corners);
        paste.startWarpPoints = cloneFloatingPasteCorners(paste.warpPoints);
        paste.aspectRatio = paste.height ? paste.width / paste.height : 1;
        paste.layer.style.cursor = getFloatingPasteCursor(handle);
        capturePointer(paste.layer, event.pointerId);
    }

    function moveFloatingPaste(board, event) {
        var paste = board && board.floatingPaste;
        var point;

        if (!paste || !paste.isDragging) {
            return;
        }

        if (paste.pointerId !== null && typeof event.pointerId === "number" && event.pointerId !== paste.pointerId) {
            return;
        }

        event.preventDefault();
        point = getSelectionPointerPosition(board, event);
        if (paste.dragAction === "resize" && paste.transformOperation === "rotate") {
            rotateFloatingPaste(board, point, event);
        } else if (paste.dragAction === "resize" && paste.transformOperation === "skew") {
            skewFloatingPaste(board, point);
        } else if (paste.dragAction === "resize" && paste.transformOperation === "perspective") {
            perspectiveFloatingPaste(board, point);
        } else if (paste.dragAction === "resize" && paste.transformOperation === "warp") {
            warpFloatingPaste(board, point);
        } else if (paste.dragAction === "resize" && paste.transformOperation === "distort") {
            distortFloatingPaste(board, point);
        } else if (paste.dragAction === "resize") {
            resizeFloatingPaste(board, point, event);
        } else {
            moveFloatingPasteBy(board, Math.round(point.x - paste.startPointerX), Math.round(point.y - paste.startPointerY));
        }
        renderFloatingPaste(board);
    }

    function resizeFloatingPaste(board, point, event) {
        var paste = board && board.floatingPaste;
        var handle;
        var left;
        var top;
        var right;
        var bottom;
        var width;
        var height;
        var aspectWidth;
        var aspectHeight;

        if (!paste || !paste.resizeHandle) {
            return;
        }

        handle = paste.resizeHandle;
        left = paste.startX;
        top = paste.startY;
        right = paste.startX + paste.startWidth;
        bottom = paste.startY + paste.startHeight;

        if (handle.indexOf("w") !== -1) {
            left = point.x;
        }

        if (handle.indexOf("e") !== -1) {
            right = point.x;
        }

        if (handle.indexOf("n") !== -1) {
            top = point.y;
        }

        if (handle.indexOf("s") !== -1) {
            bottom = point.y;
        }

        width = Math.max(1, right - left);
        height = Math.max(1, bottom - top);

        if (event && event.shiftKey && paste.aspectRatio > 0 && handle.length === 2) {
            if (width / height > paste.aspectRatio) {
                aspectWidth = height * paste.aspectRatio;
                if (handle.indexOf("w") !== -1) {
                    left = right - aspectWidth;
                } else {
                    right = left + aspectWidth;
                }
            } else {
                aspectHeight = width / paste.aspectRatio;
                if (handle.indexOf("n") !== -1) {
                    top = bottom - aspectHeight;
                } else {
                    bottom = top + aspectHeight;
                }
            }
        }

        if (right < left) {
            aspectWidth = left;
            left = right;
            right = aspectWidth;
        }

        if (bottom < top) {
            aspectHeight = top;
            top = bottom;
            bottom = aspectHeight;
        }

        paste.x = Math.round(left);
        paste.y = Math.round(top);
        paste.width = Math.max(1, Math.round(right - left));
        paste.height = Math.max(1, Math.round(bottom - top));
        paste.corners = scaleFloatingPasteCorners(
            paste.startCorners,
            paste.startX,
            paste.startY,
            paste.startWidth,
            paste.startHeight,
            paste.x,
            paste.y,
            paste.width,
            paste.height
        );
    }

    function distortFloatingPaste(board, point) {
        var paste = board && board.floatingPaste;
        var cornerIndex;

        if (!paste || !paste.resizeHandle || !paste.startCorners) {
            return;
        }

        cornerIndex = getFloatingPasteCornerIndex(paste.resizeHandle);
        if (cornerIndex < 0) {
            return;
        }

        paste.corners = cloneFloatingPasteCorners(paste.startCorners);
        paste.corners[cornerIndex] = {
            x: Math.round(point.x),
            y: Math.round(point.y)
        };
        updateFloatingPasteBounds(paste);
    }

    function warpFloatingPaste(board, point) {
        var paste = board && board.floatingPaste;
        var pointIndex;

        if (!paste || !paste.resizeHandle || !paste.startWarpPoints) {
            return;
        }

        pointIndex = getFloatingPasteWarpPointIndex(paste.resizeHandle);
        if (pointIndex < 0) {
            return;
        }

        paste.warpPoints = cloneFloatingPasteCorners(paste.startWarpPoints);
        paste.warpPoints[pointIndex] = {
            x: Math.round(point.x),
            y: Math.round(point.y)
        };
        syncFloatingPasteCornersFromWarp(paste);
        updateFloatingPasteBoundsFromPoints(paste, paste.warpPoints);
    }

    function rotateFloatingPaste(board, point, event) {
        var paste = board && board.floatingPaste;
        var center;
        var startAngle;
        var currentAngle;
        var angle;
        var cosine;
        var sine;

        if (!paste || !paste.startCorners) {
            return;
        }

        center = getCornersCenter(paste.startCorners);
        startAngle = Math.atan2(paste.startPointerY - center.y, paste.startPointerX - center.x);
        currentAngle = Math.atan2(point.y - center.y, point.x - center.x);
        angle = currentAngle - startAngle;
        if (event && event.shiftKey) {
            angle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
        }
        cosine = Math.cos(angle);
        sine = Math.sin(angle);
        paste.corners = paste.startCorners.map(function(corner) {
            var x = corner.x - center.x;
            var y = corner.y - center.y;

            return {
                x: center.x + (x * cosine) - (y * sine),
                y: center.y + (x * sine) + (y * cosine)
            };
        });
        updateFloatingPasteBounds(paste);
    }

    function skewFloatingPaste(board, point) {
        var paste = board && board.floatingPaste;
        var deltaX;
        var deltaY;
        var indexes;

        if (!paste || !paste.startCorners || !paste.resizeHandle) {
            return;
        }

        deltaX = point.x - paste.startPointerX;
        deltaY = point.y - paste.startPointerY;
        paste.corners = cloneFloatingPasteCorners(paste.startCorners);
        indexes = {
            n: [0, 1],
            e: [1, 2],
            s: [2, 3],
            w: [3, 0]
        }[paste.resizeHandle];
        if (!indexes) {
            return;
        }
        indexes.forEach(function(index) {
            if (paste.resizeHandle === "n" || paste.resizeHandle === "s") {
                paste.corners[index].x += deltaX;
            } else {
                paste.corners[index].y += deltaY;
            }
        });
        updateFloatingPasteBounds(paste);
    }

    function perspectiveFloatingPaste(board, point) {
        var paste = board && board.floatingPaste;
        var cornerIndex;
        var deltaX;
        var deltaY;
        var partnerIndex;

        if (!paste || !paste.startCorners || !paste.resizeHandle) {
            return;
        }

        cornerIndex = getFloatingPasteCornerIndex(paste.resizeHandle);
        if (cornerIndex < 0) {
            return;
        }
        deltaX = point.x - paste.startPointerX;
        deltaY = point.y - paste.startPointerY;
        paste.corners = cloneFloatingPasteCorners(paste.startCorners);
        paste.corners[cornerIndex] = {
            x: paste.startCorners[cornerIndex].x + deltaX,
            y: paste.startCorners[cornerIndex].y + deltaY
        };

        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
            partnerIndex = [3, 2, 1, 0][cornerIndex];
            paste.corners[partnerIndex].x -= deltaX;
        } else {
            partnerIndex = [1, 0, 3, 2][cornerIndex];
            paste.corners[partnerIndex].y -= deltaY;
        }
        updateFloatingPasteBounds(paste);
    }

    function moveFloatingPasteBy(board, deltaX, deltaY) {
        var paste = board && board.floatingPaste;
        var i;

        if (!paste || !paste.startCorners) {
            return;
        }

        paste.corners = cloneFloatingPasteCorners(paste.startCorners);
        for (i = 0; i < paste.corners.length; i++) {
            paste.corners[i].x += deltaX;
            paste.corners[i].y += deltaY;
        }
        if (paste.transformOperation === "warp" && paste.startWarpPoints) {
            paste.warpPoints = cloneFloatingPasteCorners(paste.startWarpPoints);
            for (i = 0; i < paste.warpPoints.length; i++) {
                paste.warpPoints[i].x += deltaX;
                paste.warpPoints[i].y += deltaY;
            }
            syncFloatingPasteCornersFromWarp(paste);
            updateFloatingPasteBoundsFromPoints(paste, paste.warpPoints);
            return;
        }
        updateFloatingPasteBounds(paste);
    }

    function stopFloatingPasteDrag(board, event) {
        var paste = board && board.floatingPaste;

        if (!paste || !paste.isDragging) {
            return;
        }

        if (paste.pointerId !== null && event && typeof event.pointerId === "number" && event.pointerId !== paste.pointerId) {
            return;
        }

        paste.isDragging = false;
        paste.dragAction = null;
        paste.resizeHandle = null;
        paste.startCorners = null;
        paste.startWarpPoints = null;
        paste.pointerId = null;
        renderFloatingPaste(board);
        if (event) {
            updateFloatingPasteCursor(board, event);
        }
    }

    function updateFloatingPasteCursor(board, event) {
        var paste = board && board.floatingPaste;
        var point;
        var handle;

        if (!paste || paste.isDragging) {
            return;
        }

        point = getSelectionPointerPosition(board, event);
        handle = getFloatingPasteHandleAtPoint(paste, point);
        paste.layer.style.cursor = getFloatingPasteCursor(handle || (isPointInsideBounds(point, paste) ? "move" : null));
    }

    function handleFloatingPasteKeyDown(board, event) {
        var paste = board && board.floatingPaste;

        if (!paste || isEditableKeyboardTarget(event.target)) {
            return;
        }

        if (String(event.key).toLowerCase() === "t" && !event.repeat && !paste.isDragging) {
            event.preventDefault();
            setFloatingPasteDistortMode(board, !paste.distortMode);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            commitFloatingPaste(board);
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            cancelFloatingPaste(board);
        }
    }

    function setFloatingPasteDistortMode(board, active) {
        return setFloatingPasteTransformOperation(board, active ? "distort" : "scale");
    }

    function setFloatingPasteTransformOperation(board, operation) {
        var paste = board && board.floatingPaste;

        if (!paste || paste.isDragging) {
            return false;
        }

        if (isImmediateTransformOperation(operation)) {
            return applyImmediateFloatingPasteTransform(board, operation);
        }

        if (!global.ImageTransformRegistry ||
            !global.ImageTransformRegistry.hasOperation(operation)) {
            return false;
        }

        if (operation === "warp" && paste.transformOperation !== "warp") {
            paste.warpPoints = createFloatingPasteWarpGrid(paste.corners);
        }
        paste.transformOperation = operation;
        paste.distortMode = operation === "distort";
        paste.layer.classList.toggle("paint-board-floating-paste-distort", operation !== "scale");
        paste.layer.title = operation + " mode";
        renderFloatingPaste(board);
        notifyFloatingPasteTransformChange(board, operation);
        return true;
    }

    function setFloatingPasteTransformAlgorithm(board, algorithm) {
        var paste = board && board.floatingPaste;
        var operation;

        if (!paste || !global.ImageTransformRegistry ||
            !global.ImageTransformRegistry.hasAlgorithm) {
            return false;
        }

        operation = paste.transformOperation || "scale";
        if (!global.ImageTransformRegistry.hasAlgorithm(operation, algorithm)) {
            return false;
        }

        paste.transformAlgorithms[operation] = algorithm;
        renderFloatingPaste(board);
        return true;
    }

    function setFloatingPasteWarpRoundBehavior(board, active) {
        var paste = board && board.floatingPaste;

        if (!paste) {
            return false;
        }

        paste.warpRoundBehavior = !!active;
        if (paste.transformOperation === "warp") {
            renderFloatingPaste(board);
        }
        return true;
    }

    function cancelFloatingPasteDistortion(board) {
        var paste = board && board.floatingPaste;

        if (!paste || paste.isDragging) {
            return false;
        }

        paste.corners = createFloatingPasteRectangleCorners(
            paste.x,
            paste.y,
            paste.width,
            paste.height
        );
        paste.warpPoints = createFloatingPasteWarpGrid(paste.corners);
        setFloatingPasteTransformOperation(board, "scale");
        return true;
    }

    function notifyFloatingPasteTransformChange(board, operation) {
        var detail = {
            board: board.element,
            paintBoard: board,
            operation: operation
        };
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-floating-paste-transform-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-floating-paste-transform-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function isEditableKeyboardTarget(target) {
        var tagName = target && target.tagName ? target.tagName.toLowerCase() : "";

        return tagName === "input" ||
            tagName === "textarea" ||
            tagName === "select" ||
            Boolean(target && target.isContentEditable);
    }

    function isPointInsideBounds(point, bounds) {
        return !!(point && bounds &&
            point.x >= bounds.x &&
            point.y >= bounds.y &&
            point.x <= bounds.x + bounds.width &&
            point.y <= bounds.y + bounds.height);
    }

    function getFloatingPasteHandles(paste) {
        var size = 8;
        var half = size / 2;
        var corners = paste.corners;
        var left;
        var top;
        var centerX;
        var centerY;
        var right;
        var bottom;

        if (paste.transformOperation === "warp") {
            return paste.warpPoints.map(function(point, index) {
                return createFloatingPasteHandle("warp-" + index, point.x, point.y, size, half);
            });
        }

        if (paste.transformOperation === "rotate" ||
            paste.transformOperation === "distort" ||
            paste.transformOperation === "perspective") {
            return [
                createFloatingPasteHandle("nw", corners[0].x, corners[0].y, size, half),
                createFloatingPasteHandle("ne", corners[1].x, corners[1].y, size, half),
                createFloatingPasteHandle("se", corners[2].x, corners[2].y, size, half),
                createFloatingPasteHandle("sw", corners[3].x, corners[3].y, size, half)
            ];
        }

        if (paste.transformOperation === "skew") {
            return [
                createFloatingPasteHandle("n", (corners[0].x + corners[1].x) / 2, (corners[0].y + corners[1].y) / 2, size, half),
                createFloatingPasteHandle("e", (corners[1].x + corners[2].x) / 2, (corners[1].y + corners[2].y) / 2, size, half),
                createFloatingPasteHandle("s", (corners[2].x + corners[3].x) / 2, (corners[2].y + corners[3].y) / 2, size, half),
                createFloatingPasteHandle("w", (corners[3].x + corners[0].x) / 2, (corners[3].y + corners[0].y) / 2, size, half)
            ];
        }

        left = paste.x;
        top = paste.y;
        centerX = paste.x + (paste.width / 2);
        centerY = paste.y + (paste.height / 2);
        right = paste.x + paste.width;
        bottom = paste.y + paste.height;

        return [
            createFloatingPasteHandle("nw", left, top, size, half),
            createFloatingPasteHandle("n", centerX, top, size, half),
            createFloatingPasteHandle("ne", right, top, size, half),
            createFloatingPasteHandle("e", right, centerY, size, half),
            createFloatingPasteHandle("se", right, bottom, size, half),
            createFloatingPasteHandle("s", centerX, bottom, size, half),
            createFloatingPasteHandle("sw", left, bottom, size, half),
            createFloatingPasteHandle("w", left, centerY, size, half)
        ];
    }

    function createFloatingPasteHandle(name, x, y, size, half) {
        return {
            name: name,
            left: Math.round(x - half),
            top: Math.round(y - half),
            size: size
        };
    }

    function getFloatingPasteHandleAtPoint(paste, point) {
        var handles;
        var i;
        var handle;

        if (!paste || !point) {
            return null;
        }

        handles = getFloatingPasteHandles(paste);
        for (i = 0; i < handles.length; i++) {
            handle = handles[i];
            if (point.x >= handle.left &&
                point.x <= handle.left + handle.size &&
                point.y >= handle.top &&
                point.y <= handle.top + handle.size) {
                return handle.name;
            }
        }

        return null;
    }

    function getFloatingPasteCursor(handle) {
        if (handle && handle.indexOf("warp-") === 0) {
            return "move";
        }

        if (handle === "nw" || handle === "se") {
            return "nwse-resize";
        }

        if (handle === "ne" || handle === "sw") {
            return "nesw-resize";
        }

        if (handle === "n" || handle === "s") {
            return "ns-resize";
        }

        if (handle === "e" || handle === "w") {
            return "ew-resize";
        }

        if (handle === "move") {
            return "move";
        }

        return "default";
    }

    function commitFloatingPaste(board) {
        var paste = board && board.floatingPaste;

        if (!paste) {
            return false;
        }

        beginUndoableAction(board);
        markUndoableChange(board);
        paintWithSelection(board, function() {
            drawFloatingPasteImage(board.context, paste);
        });
        removeFloatingPaste(board);
        commitUndoableAction(board);
        return true;
    }

    function createFloatingPasteRectangleCorners(x, y, width, height) {
        return [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height }
        ];
    }

    function cloneFloatingPasteCorners(corners) {
        return corners.map(function(corner) {
            return {
                x: corner.x,
                y: corner.y
            };
        });
    }

    function getFloatingPasteCornerIndex(handle) {
        var index = {
            nw: 0,
            ne: 1,
            se: 2,
            sw: 3
        }[handle];

        return typeof index === "number" ? index : -1;
    }

    function getFloatingPasteWarpPointIndex(handle) {
        var match = /^warp-(\d+)$/.exec(handle || "");
        var index = match ? Number(match[1]) : -1;

        return index >= 0 && index < 16 ? index : -1;
    }

    function updateFloatingPasteBounds(paste) {
        var xs = paste.corners.map(function(corner) {
            return corner.x;
        });
        var ys = paste.corners.map(function(corner) {
            return corner.y;
        });
        var right;
        var bottom;

        paste.x = Math.min.apply(Math, xs);
        paste.y = Math.min.apply(Math, ys);
        right = Math.max.apply(Math, xs);
        bottom = Math.max.apply(Math, ys);
        paste.width = Math.max(1, right - paste.x);
        paste.height = Math.max(1, bottom - paste.y);
    }

    function updateFloatingPasteBoundsFromPoints(paste, points) {
        var xs = points.map(function(point) {
            return point.x;
        });
        var ys = points.map(function(point) {
            return point.y;
        });

        paste.x = Math.min.apply(Math, xs);
        paste.y = Math.min.apply(Math, ys);
        paste.width = Math.max(1, Math.max.apply(Math, xs) - paste.x);
        paste.height = Math.max(1, Math.max.apply(Math, ys) - paste.y);
    }

    function getCornersCenter(corners) {
        var total = corners.reduce(function(result, corner) {
            result.x += corner.x;
            result.y += corner.y;
            return result;
        }, { x: 0, y: 0 });

        return {
            x: total.x / corners.length,
            y: total.y / corners.length
        };
    }

    function scaleFloatingPasteCorners(corners, fromX, fromY, fromWidth, fromHeight, toX, toY, toWidth, toHeight) {
        var safeWidth = fromWidth || 1;
        var safeHeight = fromHeight || 1;

        return corners.map(function(corner) {
            return {
                x: toX + (((corner.x - fromX) / safeWidth) * toWidth),
                y: toY + (((corner.y - fromY) / safeHeight) * toHeight)
            };
        });
    }

    function createFloatingPasteWarpGrid(corners) {
        var points = [];
        var row;
        var column;
        var u;
        var v;

        for (row = 0; row < 4; row += 1) {
            v = row / 3;
            for (column = 0; column < 4; column += 1) {
                u = column / 3;
                points.push({
                    x: lerpNumber(
                        lerpNumber(corners[0].x, corners[1].x, u),
                        lerpNumber(corners[3].x, corners[2].x, u),
                        v
                    ),
                    y: lerpNumber(
                        lerpNumber(corners[0].y, corners[1].y, u),
                        lerpNumber(corners[3].y, corners[2].y, u),
                        v
                    )
                });
            }
        }
        return points;
    }

    function syncFloatingPasteCornersFromWarp(paste) {
        paste.corners = [
            paste.warpPoints[0],
            paste.warpPoints[3],
            paste.warpPoints[15],
            paste.warpPoints[12]
        ].map(function(point) {
            return {
                x: point.x,
                y: point.y
            };
        });
    }

    function lerpNumber(first, second, amount) {
        return first + ((second - first) * amount);
    }

    function traceFloatingPasteOutline(context, corners) {
        context.beginPath();
        context.moveTo(Math.round(corners[0].x) + 0.5, Math.round(corners[0].y) + 0.5);
        context.lineTo(Math.round(corners[1].x) + 0.5, Math.round(corners[1].y) + 0.5);
        context.lineTo(Math.round(corners[2].x) + 0.5, Math.round(corners[2].y) + 0.5);
        context.lineTo(Math.round(corners[3].x) + 0.5, Math.round(corners[3].y) + 0.5);
        context.closePath();
    }

    function drawFloatingPasteWarpGrid(context, points, roundBehavior) {
        var row;
        var column;

        if (!points || points.length !== 16) {
            return;
        }

        context.save();
        context.lineWidth = 1;
        context.strokeStyle = roundBehavior ?
            "rgba(255, 255, 255, 0.28)" :
            "rgba(255, 255, 255, 0.65)";
        context.setLineDash(roundBehavior ? [2, 3] : []);
        context.beginPath();
        for (row = 0; row < 4; row += 1) {
            context.moveTo(points[row * 4].x, points[row * 4].y);
            for (column = 1; column < 4; column += 1) {
                context.lineTo(points[(row * 4) + column].x, points[(row * 4) + column].y);
            }
        }
        for (column = 0; column < 4; column += 1) {
            context.moveTo(points[column].x, points[column].y);
            for (row = 1; row < 4; row += 1) {
                context.lineTo(points[(row * 4) + column].x, points[(row * 4) + column].y);
            }
        }
        context.stroke();

        if (roundBehavior) {
            drawFloatingPasteBezierGrid(context, points);
        }
        context.restore();
    }

    function drawFloatingPasteBezierGrid(context, points) {
        var line;
        var step;
        var point;

        context.strokeStyle = "rgba(255, 255, 255, 0.82)";
        context.setLineDash([]);
        context.beginPath();
        for (line = 0; line < 4; line += 1) {
            for (step = 0; step <= 24; step += 1) {
                point = evaluateFloatingPasteBezierPoint(points, step / 24, line / 3);
                if (step === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            }
        }
        for (line = 0; line < 4; line += 1) {
            for (step = 0; step <= 24; step += 1) {
                point = evaluateFloatingPasteBezierPoint(points, line / 3, step / 24);
                if (step === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            }
        }
        context.stroke();
    }

    function evaluateFloatingPasteBezierPoint(points, u, v) {
        var inverseU = 1 - u;
        var inverseV = 1 - v;
        var basisU = [
            inverseU * inverseU * inverseU,
            3 * inverseU * inverseU * u,
            3 * inverseU * u * u,
            u * u * u
        ];
        var basisV = [
            inverseV * inverseV * inverseV,
            3 * inverseV * inverseV * v,
            3 * inverseV * v * v,
            v * v * v
        ];
        var result = { x: 0, y: 0 };
        var row;
        var column;
        var weight;

        for (row = 0; row < 4; row += 1) {
            for (column = 0; column < 4; column += 1) {
                weight = basisU[column] * basisV[row];
                result.x += points[(row * 4) + column].x * weight;
                result.y += points[(row * 4) + column].y * weight;
            }
        }
        return result;
    }

    function drawFloatingPasteImage(context, paste) {
        var operation = paste.transformOperation || "scale";

        if (global.ImageTransformRegistry && global.ImageTransformRegistry.render) {
            global.ImageTransformRegistry.render(context, paste.image, paste.corners, {
                operation: operation,
                algorithm: paste.transformAlgorithms[operation],
                warpPoints: paste.warpPoints,
                roundBehavior: paste.warpRoundBehavior,
                preview: paste.isDragging
            });
            return;
        }

        context.drawImage(paste.image, paste.x, paste.y, paste.width, paste.height);
    }

    function isImmediateTransformOperation(operation) {
        return operation === "rotate-180" ||
            operation === "rotate-90-cw" ||
            operation === "rotate-90-ccw" ||
            operation === "flip-horizontal" ||
            operation === "flip-vertical";
    }

    function applyImmediateFloatingPasteTransform(board, operation) {
        var paste = board && board.floatingPaste;
        var rendered;
        var transformed;
        var transformedContext;
        var center;
        var width;
        var height;
        var localCorners;
        var localWarpPoints;

        if (!paste) {
            return false;
        }

        width = Math.max(1, Math.ceil(paste.width));
        height = Math.max(1, Math.ceil(paste.height));
        rendered = document.createElement("canvas");
        rendered.width = width;
        rendered.height = height;
        localCorners = paste.corners.map(function(corner) {
            return {
                x: corner.x - paste.x,
                y: corner.y - paste.y
            };
        });
        localWarpPoints = paste.warpPoints.map(function(point) {
            return {
                x: point.x - paste.x,
                y: point.y - paste.y
            };
        });
        if (global.ImageTransformRegistry && global.ImageTransformRegistry.render) {
            global.ImageTransformRegistry.render(rendered.getContext("2d"), paste.image, localCorners, {
                operation: paste.transformOperation || "scale",
                algorithm: paste.transformAlgorithms[paste.transformOperation || "scale"],
                warpPoints: localWarpPoints,
                roundBehavior: paste.warpRoundBehavior
            });
        }

        transformed = document.createElement("canvas");
        if (operation === "rotate-90-cw" || operation === "rotate-90-ccw") {
            transformed.width = height;
            transformed.height = width;
        } else {
            transformed.width = width;
            transformed.height = height;
        }
        transformedContext = transformed.getContext("2d");

        if (operation === "rotate-180") {
            transformedContext.translate(width, height);
            transformedContext.rotate(Math.PI);
        } else if (operation === "rotate-90-cw") {
            transformedContext.translate(height, 0);
            transformedContext.rotate(Math.PI / 2);
        } else if (operation === "rotate-90-ccw") {
            transformedContext.translate(0, width);
            transformedContext.rotate(-Math.PI / 2);
        } else if (operation === "flip-horizontal") {
            transformedContext.translate(width, 0);
            transformedContext.scale(-1, 1);
        } else if (operation === "flip-vertical") {
            transformedContext.translate(0, height);
            transformedContext.scale(1, -1);
        }
        transformedContext.drawImage(rendered, 0, 0);

        center = getCornersCenter(paste.corners);
        paste.image = transformed;
        paste.width = transformed.width;
        paste.height = transformed.height;
        paste.x = center.x - (paste.width / 2);
        paste.y = center.y - (paste.height / 2);
        paste.corners = createFloatingPasteRectangleCorners(paste.x, paste.y, paste.width, paste.height);
        paste.warpPoints = createFloatingPasteWarpGrid(paste.corners);
        paste.transformOperation = "scale";
        paste.distortMode = false;
        paste.layer.classList.remove("paint-board-floating-paste-distort");
        renderFloatingPaste(board);
        notifyFloatingPasteTransformChange(board, "scale");
        return true;
    }

    function cancelFloatingPaste(board) {
        if (!board || !board.floatingPaste) {
            return;
        }

        removeFloatingPaste(board);
    }

    function removeFloatingPaste(board) {
        var paste = board && board.floatingPaste;

        if (!paste) {
            return;
        }

        paste.layer.removeEventListener("pointerdown", paste.pointerDown);
        paste.layer.removeEventListener("pointermove", paste.pointerHover);
        paste.layer.removeEventListener("dblclick", paste.doubleClick);
        document.removeEventListener("pointermove", paste.pointerMove, true);
        document.removeEventListener("pointerup", paste.pointerUp, true);
        document.removeEventListener("pointercancel", paste.pointerUp, true);
        document.removeEventListener("keydown", paste.keyDown);

        if (paste.layer.parentNode) {
            paste.layer.parentNode.removeChild(paste.layer);
        }

        if (paste.image && typeof paste.image.close === "function") {
            paste.image.close();
        }

        board.floatingPaste = null;
        notifyFloatingPasteChange(board, false);
    }

    function notifyFloatingPasteChange(board, active) {
        var detail = {
            board: board.element,
            paintBoard: board,
            active: !!active
        };
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-floating-paste-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-floating-paste-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function getCurrentPaintColor(board) {
        var crazyColor = getCrazyPaintColor(board);

        if (crazyColor) {
            return crazyColor;
        }

        if (global.App && global.App.memory && global.App.memory.currentColor) {
            return global.App.memory.currentColor;
        }

        return board.paintColor;
    }

    function getCurrentPreviewPaintColor(board) {
        if (global.App && global.App.memory && global.App.memory.currentColor) {
            return global.App.memory.currentColor;
        }

        return board.paintColor;
    }

    function getCrazyPaintColor(board) {
        var algorithm;
        var colorPickerApi;
        var color = null;

        if (!global.App || !global.App.memory || !global.App.memory.rainbowCrazyMode) {
            return null;
        }

        algorithm = global.App.memory.rainbowCrazyAlgorithm || "random";

        if (algorithm === "random") {
            return getRandomPaintColor();
        }

        if (board &&
                board.crazyPickerPaintColor &&
                board.crazyPickerPaintColorAlgorithm === algorithm) {
            return board.crazyPickerPaintColor;
        }

        colorPickerApi = global.SimpleColorPickerApi ||
            (global.AppOpenWindows && global.AppOpenWindows.getSimpleColorPickerApi && global.AppOpenWindows.getSimpleColorPickerApi());

        if (algorithm === "picker-vertical" && colorPickerApi && colorPickerApi.getNextColorDown) {
            color = colorPickerApi.getNextColorDown({
                jump: !!global.App.memory.rainbowCrazyJump,
                loop: !!global.App.memory.rainbowCrazyLoop
            });
        }

        if (algorithm === "picker-horizontal" && colorPickerApi && colorPickerApi.getNextColorRight) {
            color = colorPickerApi.getNextColorRight({
                jump: !!global.App.memory.rainbowCrazyJump,
                loop: !!global.App.memory.rainbowCrazyLoop
            });
        }

        if (color && global.AppOpenWindows && typeof global.AppOpenWindows.setActiveColor === "function") {
            global.AppOpenWindows.setActiveColor(color);
        }

        if (board && color) {
            board.crazyPickerPaintColor = color;
            board.crazyPickerPaintColorAlgorithm = algorithm;
            global.setTimeout(function() {
                if (board.crazyPickerPaintColor === color && board.crazyPickerPaintColorAlgorithm === algorithm) {
                    board.crazyPickerPaintColor = null;
                    board.crazyPickerPaintColorAlgorithm = null;
                }
            }, 0);
        }

        return color;
    }

    function getRandomPaintColor() {
        var value = Math.floor(Math.random() * 16777216).toString(16);

        while (value.length < 6) {
            value = "0" + value;
        }

        return "#" + value;
    }

    function getCurrentBrushSize(board) {
        if (global.App && global.App.memory && global.App.memory.currentBrushWidth) {
            return global.App.memory.currentBrushWidth;
        }

        return board.brushSize;
    }

    function getCurrentShapeStrokeWidth(board) {
        var lineDesign = getCurrentStoredLineDesign();
        var designWeight = lineDesign ? Number(lineDesign.weight) : NaN;
        var lineWidth = global.App && global.App.memory ? Number(global.App.memory.currentLineWidth) : NaN;

        if (!isNaN(designWeight)) {
            return Math.max(1, designWeight);
        }

        if (!isNaN(lineWidth)) {
            return Math.max(1, lineWidth);
        }

        return Math.max(1, getCurrentBrushSize(board));
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

    function bindCanvasPaintHandlers(canvas, paintHandlers, supportsPointerEvents, bind) {
        var method = bind ? "addEventListener" : "removeEventListener";

        if (!canvas || !paintHandlers) {
            return;
        }

        if (supportsPointerEvents) {
            canvas[method]("pointerdown", paintHandlers.startPainting);
            canvas[method]("dblclick", paintHandlers.finishPolygonalSelectionFromEvent);
            canvas[method]("pointerenter", paintHandlers.rememberHoverGuidePointer);
            canvas[method]("pointermove", paintHandlers.continuePainting);
            canvas[method]("pointerleave", paintHandlers.leaveCanvas);
        } else {
            canvas[method]("mousedown", paintHandlers.startPainting);
            canvas[method]("dblclick", paintHandlers.finishPolygonalSelectionFromEvent);
            canvas[method]("mouseenter", paintHandlers.rememberHoverGuidePointer);
            canvas[method]("mousemove", paintHandlers.continuePainting);
            canvas[method]("mouseleave", paintHandlers.leaveCanvas);
        }
    }

    function rebindCanvasPaintHandlers(previousCanvas, nextCanvas, paintHandlers, supportsPointerEvents) {
        if (!paintHandlers || previousCanvas === nextCanvas) {
            return;
        }

        bindCanvasPaintHandlers(previousCanvas, paintHandlers, supportsPointerEvents, false);
        bindCanvasPaintHandlers(nextCanvas, paintHandlers, supportsPointerEvents, true);
    }

    function destroy(board, paintHandlers, paintToolChangeHandlers) {
        cancelFloatingPaste(board);

        if (paintHandlers && paintHandlers.supportsPointerEvents) {
            bindCanvasPaintHandlers(board.canvas, paintHandlers, true, false);
            if (paintHandlers.container) {
                paintHandlers.container.removeEventListener("pointerdown", paintHandlers.startPaintingFromOutside);
            }
            document.removeEventListener("pointermove", paintHandlers.continuePainting, true);
            document.removeEventListener("pointerup", paintHandlers.endPainting, true);
            document.removeEventListener("pointercancel", paintHandlers.endPainting, true);
        } else if (paintHandlers) {
            bindCanvasPaintHandlers(board.canvas, paintHandlers, false, false);
            if (paintHandlers.container) {
                paintHandlers.container.removeEventListener("mousedown", paintHandlers.startPaintingFromOutside);
            }
            document.removeEventListener("mousemove", paintHandlers.continuePainting, true);
            document.removeEventListener("mouseup", paintHandlers.endPainting, true);
        }

        if (paintHandlers && paintHandlers.updatePreviewModifier) {
            document.removeEventListener("keydown", paintHandlers.updatePreviewModifier);
            document.removeEventListener("keyup", paintHandlers.updatePreviewModifier);
        }

        if (paintHandlers && paintHandlers.clearHoverGuideOnBlur) {
            global.removeEventListener("blur", paintHandlers.clearHoverGuideOnBlur);
        }

        if (paintToolChangeHandlers) {
            global.removeEventListener("paint-tools-change", paintToolChangeHandlers.clearPreviewOnPaintToolChange);
            global.removeEventListener("paint-tools-change", paintToolChangeHandlers.clearSelectionDraftOnToolChange);
            global.removeEventListener("paint-selection-tool-change", paintToolChangeHandlers.clearSelectionDraftOnSelectionToolChange);
        }

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
