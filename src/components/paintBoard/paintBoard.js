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
        DESIGNED_BRUSH: "DESIGNED-BRUSH"
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
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var canvas = document.createElement("canvas");
        var context;
        var isPainting = false;
        var stopPainting = function(event) {
            if (isPainting && isShapeToolMode() && board.pointerStartPosition) {
                paintShapePointerEvent(board, event);
            }

            isPainting = false;
            board.lastPointerPosition = null;
            board.pointerStartPosition = null;
        };
        var board;

        element.id = boardId;
        element.className = "paint-board";

        if (config.className) {
            element.className += " " + config.className;
        }

        element.style.width = config.width + "px";
        element.style.height = config.height + "px";
        element.style.backgroundColor = config.backgroundColor;

        canvas.id = boardId + "-canvas";
        canvas.className = "paint-board-canvas";
        canvas.width = config.width;
        canvas.height = config.height;
        canvas.style.width = config.width + "px";
        canvas.style.height = config.height + "px";

        element.appendChild(canvas);
        container.appendChild(element);

        context = canvas.getContext("2d");
        context.fillStyle = config.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        board = {
            id: boardId,
            element: element,
            canvas: canvas,
            context: context,
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor,
            paintColor: getOppositeColor(config.backgroundColor),
            brushSize: config.brushSize,
            lastPointerPosition: null,
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
                destroy(board, stopPainting);
            }
        };

        if (config.paintOnPointer) {
            canvas.addEventListener("mousedown", function(event) {
                isPainting = true;
                startPointerAction(board, event);
            });

            canvas.addEventListener("mousemove", function(event) {
                if (!isPainting) {
                    return;
                }

                continuePointerAction(board, event);
            });

            document.addEventListener("mouseup", stopPainting);

            canvas.addEventListener("mouseleave", function() {
                if (isShapeToolMode()) {
                    return;
                }

                isPainting = false;
                board.lastPointerPosition = null;
            });
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

    function setSize(board, width, height) {
        board.width = width;
        board.height = height;
        board.element.style.width = width + "px";
        board.element.style.height = height + "px";
        board.canvas.width = width;
        board.canvas.height = height;
        board.canvas.style.width = width + "px";
        board.canvas.style.height = height + "px";
        clear(board);
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
            x: Math.floor((event.clientX - rect.left) * scaleX),
            y: Math.floor((event.clientY - rect.top) * scaleY)
        };
    }

    function startPointerAction(board, event) {
        if (isShapeToolMode()) {
            event.preventDefault();
            board.pointerStartPosition = getPointerPosition(board, event);
            return;
        }

        paintPointerEvent(board, event);
    }

    function continuePointerAction(board, event) {
        if (isShapeToolMode()) {
            return;
        }

        paintPointerEvent(board, event);
    }

    function paintPointerEvent(board, event) {
        var point = getPointerPosition(board, event);

        event.preventDefault();

        if (currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES && board.lastPointerPosition) {
            paintSquaredLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES && board.lastPointerPosition) {
            paintRoundLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.DESIGNED_BRUSH) {
            paintDesignedBrush(board, point.x, point.y);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_POINTS) {
            paintRoundPoint(board, point.x, point.y);
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

    function destroy(board, stopPainting) {
        document.removeEventListener("mouseup", stopPainting);

        if (board.element.parentNode) {
            board.element.parentNode.removeChild(board.element);
        }
    }

    global.PaintBoard = PaintBoard;
    global.paintBoard = PaintBoard;
    global.PaintTools = PaintTools;

}(window));
