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

        event.preventDefault();
        paintAt(board, x, y);
    }

    function paintAt(board, x, y) {
        var size = Math.max(1, board.brushSize);
        var offset = Math.floor(size / 2);

        board.context.fillStyle = board.paintColor;
        board.context.fillRect(x - offset, y - offset, size, size);
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

}(window));
