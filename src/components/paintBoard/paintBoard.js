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
        ROUND_LINES: "ROUND-LINES"
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
        var stopPainting = function() {
            isPainting = false;
            board.lastPointerPosition = null;
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
            clear: function() {
                clear(board);
            },
            paintAt: function(x, y) {
                paintAt(board, x, y);
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
                paintPointerEvent(board, event);
            });

            canvas.addEventListener("mousemove", function(event) {
                if (!isPainting) {
                    return;
                }

                paintPointerEvent(board, event);
            });

            document.addEventListener("mouseup", stopPainting);

            canvas.addEventListener("mouseleave", function() {
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

    function paintPointerEvent(board, event) {
        var rect = board.canvas.getBoundingClientRect();
        var scaleX = board.canvas.width / rect.width;
        var scaleY = board.canvas.height / rect.height;
        var x = Math.floor((event.clientX - rect.left) * scaleX);
        var y = Math.floor((event.clientY - rect.top) * scaleY);
        var point = { x: x, y: y };

        event.preventDefault();

        if (currentPaintToolMode === PAINT_TOOL_MODES.SQUARED_LINES && board.lastPointerPosition) {
            paintSquaredLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_LINES && board.lastPointerPosition) {
            paintRoundLine(board, board.lastPointerPosition, point);
        } else if (currentPaintToolMode === PAINT_TOOL_MODES.ROUND_POINTS) {
            paintRoundPoint(board, x, y);
        } else {
            paintSquaredPoint(board, x, y);
        }

        board.lastPointerPosition = point;
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
