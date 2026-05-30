(function(global) {

    "use strict";

    var MIN_ZOOM = 0.5;
    var MAX_ZOOM = 4;
    var ZOOM_STEP = 0.1;
    var ACTIVE_BOARD_SELECTOR = ".paint-board[data-active-paint-board=\"true\"]";

    function handlePointerDown(event) {
        var board = getBoardFromEvent(event);

        if (board) {
            setActiveBoard(board);
        }
    }

    function handleKeyDown(event) {
        var direction;

        if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        direction = getZoomDirection(event);

        if (!direction) {
            return;
        }

        event.preventDefault();
        zoomActiveBoard(direction);
    }

    function getZoomDirection(event) {
        if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
            return 1;
        }

        if (event.key === "-" || event.code === "NumpadSubtract") {
            return -1;
        }

        return 0;
    }

    function zoomActiveBoard(direction) {
        var board = getActiveBoard();
        var zoom;

        if (!board) {
            return null;
        }

        zoom = clampZoom(getBoardZoom(board) + (direction * ZOOM_STEP));
        applyBoardZoom(board, zoom);

        return zoom;
    }

    function getActiveBoard() {
        var board = document.querySelector(ACTIVE_BOARD_SELECTOR);

        if (board) {
            return board;
        }

        board = document.getElementById("demo-paint-board-1") || document.querySelector(".paint-board");

        if (board) {
            setActiveBoard(board);
        }

        return board;
    }

    function setActiveBoard(board) {
        var activeBoards = document.querySelectorAll(ACTIVE_BOARD_SELECTOR);
        var i;

        for (i = 0; i < activeBoards.length; i++) {
            if (activeBoards[i] !== board) {
                activeBoards[i].removeAttribute("data-active-paint-board");
            }
        }

        board.setAttribute("data-active-paint-board", "true");

        if (!board.getAttribute("data-zoom")) {
            applyBoardZoom(board, getBoardZoom(board));
        }
    }

    function getBoardFromEvent(event) {
        var board = event.target.closest && event.target.closest(".paint-board");
        var windowElement;

        if (board) {
            return board;
        }

        windowElement = event.target.closest && event.target.closest(".wm-window");

        if (windowElement) {
            return windowElement.querySelector(".paint-board");
        }

        return null;
    }

    function getBoardZoom(board) {
        var zoom = parseFloat(board.getAttribute("data-zoom"));

        if (isNaN(zoom)) {
            zoom = 1;
        }

        return clampZoom(zoom);
    }

    function applyBoardZoom(board, zoom) {
        var currentZoom = getBoardZoom(board);
        var normalizedZoom = normalizeZoom(zoom);
        var origin = getVisibleTransformOrigin(board, currentZoom);

        board.setAttribute("data-zoom", normalizedZoom);
        board.style.transformOrigin = origin.x + "px " + origin.y + "px";
        board.style.transform = "scale(" + normalizedZoom + ")";
        notifyZoomChange(board, parseFloat(normalizedZoom));
    }

    function getVisibleTransformOrigin(board, currentZoom) {
        var center = board.closest && board.closest(".wm-center");
        var boardRect = board.getBoundingClientRect();
        var centerRect;
        var viewportCenterX;
        var viewportCenterY;

        if (!center || !boardRect.width || !boardRect.height) {
            return {
                x: board.offsetWidth / 2,
                y: board.offsetHeight / 2
            };
        }

        centerRect = center.getBoundingClientRect();
        viewportCenterX = centerRect.left + (center.clientWidth / 2);
        viewportCenterY = centerRect.top + (center.clientHeight / 2);

        return {
            x: (viewportCenterX - boardRect.left) / currentZoom,
            y: (viewportCenterY - boardRect.top) / currentZoom
        };
    }

    function notifyZoomChange(board, zoom) {
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-zoom-change", {
                detail: {
                    board: board,
                    zoom: zoom
                }
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-zoom-change", false, false, {
                board: board,
                zoom: zoom
            });
        }

        global.dispatchEvent(event);
    }

    function clampZoom(zoom) {
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    }

    function normalizeZoom(zoom) {
        return String(Math.round(zoom * 10) / 10);
    }

    function isEditableTarget(target) {
        var tagName = target && target.tagName;

        return !!(target && (
            target.isContentEditable ||
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            tagName === "SELECT"
        ));
    }

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    global.Zoom = {
        zoomIn: function() {
            return zoomActiveBoard(1);
        },
        zoomOut: function() {
            return zoomActiveBoard(-1);
        },
        getActiveBoard: getActiveBoard,
        setActiveBoard: setActiveBoard
    };

}(window));
