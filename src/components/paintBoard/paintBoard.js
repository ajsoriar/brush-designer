(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 640,
        height: 480,
        backgroundColor: "#ffffff",
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
            clear: function() {
                clear(board);
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
                destroy(board);
            }
        };

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
        board.element.style.backgroundColor = backgroundColor;
        clear(board);
    }

    function save(board, config) {
        var data = board.canvas.toDataURL("image/png");

        if (typeof config.onSave === "function") {
            config.onSave(data, board);
        }

        return data;
    }

    function destroy(board) {
        if (board.element.parentNode) {
            board.element.parentNode.removeChild(board.element);
        }
    }

    global.PaintBoard = PaintBoard;
    global.paintBoard = PaintBoard;

}(window));
