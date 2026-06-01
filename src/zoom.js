(function(global) {

    "use strict";

    var MIN_ZOOM = 0.5;
    var MAX_ZOOM = 12;
    var ZOOM_STEP = 0.1;
    var WHEEL_PROGRESSIVE_ZOOM_START = 1;
    var WHEEL_PROGRESSIVE_FACTOR = 0.15;
    var ACTIVE_BOARD_SELECTOR = ".paint-board[data-active-paint-board=\"true\"]";
    var resizeObserver = null;
    var spacePanActive = false;
    var panState = null;

    function handlePointerDown(event) {
        var board = getBoardFromEvent(event);
        var pointerBoard;

        if (!board) {
            return;
        }

        setActiveBoard(board);
        pointerBoard = getBoardFromPointerEvent(event);

        if (spacePanActive && pointerBoard) {
            startPan(event, pointerBoard);
        }
    }

    function handleKeyDown(event) {
        var direction;

        if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (isSpacePanKey(event)) {
            event.preventDefault();
            setSpacePanActive(true);
            return;
        }

        direction = getZoomDirection(event);

        if (!direction) {
            return;
        }

        event.preventDefault();
        zoomActiveBoard(direction);
    }

    function handleKeyUp(event) {
        if (isSpacePanKey(event)) {
            setSpacePanActive(false);
        }
    }

    function handleWheel(event) {
        var board;
        var direction;

        if (!event.deltaY || isEditableTarget(event.target)) {
            return;
        }

        board = getBoardFromEvent(event);

        if (!board) {
            return;
        }

        event.preventDefault();
        setActiveBoard(board);

        direction = event.deltaY < 0 ? 1 : -1;
        zoomBoardByWheel(board, direction);
    }

    function startPan(event, board) {
        var viewport = getBoardViewport(board);

        if (!viewport) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.stopImmediatePropagation) {
            event.stopImmediatePropagation();
        }

        panState = {
            board: board,
            viewport: viewport,
            startX: event.clientX,
            startY: event.clientY,
            startScrollLeft: viewport.scrollLeft,
            startScrollTop: viewport.scrollTop
        };

        board.className += board.className.indexOf("paint-board-panning") === -1 ? " paint-board-panning" : "";
        document.addEventListener("mousemove", continuePan, true);
        document.addEventListener("mouseup", stopPan, true);
    }

    function continuePan(event) {
        if (!panState) {
            return;
        }

        event.preventDefault();
        panState.viewport.scrollLeft = panState.startScrollLeft - (event.clientX - panState.startX);
        panState.viewport.scrollTop = panState.startScrollTop - (event.clientY - panState.startY);
    }

    function stopPan() {
        if (panState && panState.board) {
            panState.board.className = panState.board.className.replace(/\s?paint-board-panning/g, "");
        }

        panState = null;
        document.removeEventListener("mousemove", continuePan, true);
        document.removeEventListener("mouseup", stopPan, true);
    }

    function setSpacePanActive(active) {
        spacePanActive = active;

        if (active) {
            document.body.className += document.body.className.indexOf("paint-board-pan-mode") === -1 ? " paint-board-pan-mode" : "";
            return;
        }

        document.body.className = document.body.className.replace(/\s?paint-board-pan-mode/g, "");
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

    function isSpacePanKey(event) {
        return event.key === " " || event.key === "Spacebar" || event.code === "Space";
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

    function zoomBoardByWheel(board, direction) {
        var currentZoom = getBoardZoom(board);
        var progressiveZoom = Math.max(0, currentZoom - WHEEL_PROGRESSIVE_ZOOM_START);
        var step = ZOOM_STEP + (progressiveZoom * WHEEL_PROGRESSIVE_FACTOR);
        var zoom = clampZoom(currentZoom + (direction * step));

        applyBoardZoom(board, zoom);

        return zoom;
    }

    function setBoardZoom(board, zoom) {
        if (!board) {
            return null;
        }

        applyBoardZoom(board, clampZoom(zoom));
        return getBoardZoom(board);
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

    function getBoardFromPointerEvent(event) {
        return event.target.closest && event.target.closest(".paint-board");
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
        var viewport = getBoardViewport(board);
        var visibleCenter = getVisibleCenterPoint(viewport, currentZoom);
        var nextZoom = parseFloat(normalizedZoom);

        setupZoomLayout(board, viewport);
        board.setAttribute("data-zoom", normalizedZoom);
        board.style.transformOrigin = "0 0";
        board.style.transform = "scale(" + normalizedZoom + ")";
        updateZoomLayout(board, viewport, nextZoom);
        restoreVisibleCenter(viewport, visibleCenter, nextZoom);
        notifyZoomChange(board, nextZoom);
    }

    function setupZoomLayout(board, viewport) {
        var scrollArea;

        if (!viewport) {
            return;
        }

        scrollArea = getScrollArea(board);

        if (!scrollArea) {
            scrollArea = document.createElement("div");
            scrollArea.className = "paint-board-scroll-area";
            scrollArea.setAttribute("data-paint-board-scroll-area", board.id || "paint-board");
            viewport.insertBefore(scrollArea, board);
        }

        observeViewportResize(viewport);
        board.style.left = "0";
        board.style.margin = "0";
        board.style.position = "absolute";
        board.style.top = "0";
        board.style.zIndex = "1";
    }

    function updateZoomLayout(board, viewport, zoom) {
        var scrollArea = getScrollArea(board);
        var layout;

        if (!scrollArea || !viewport) {
            return;
        }

        layout = getZoomLayout(board, viewport, zoom);
        board.style.left = layout.left + "px";
        board.style.top = layout.top + "px";
        scrollArea.style.width = layout.width + "px";
        scrollArea.style.height = layout.height + "px";
    }

    function updateViewportZoomLayout(viewport) {
        var boards;
        var i;

        if (!viewport) {
            return;
        }

        boards = viewport.querySelectorAll(".paint-board");

        for (i = 0; i < boards.length; i++) {
            updateBoardZoomLayout(boards[i]);
        }
    }

    function updateBoardZoomLayout(board) {
        var viewport = getBoardViewport(board);
        var zoom = getBoardZoom(board);

        if (!viewport) {
            return;
        }

        setupZoomLayout(board, viewport);
        updateZoomLayout(board, viewport, zoom);
    }

    function observeViewportResize(viewport) {
        if (!viewport || viewport.getAttribute("data-zoom-resize-observed") === "true") {
            return;
        }

        viewport.setAttribute("data-zoom-resize-observed", "true");

        if (global.ResizeObserver) {
            getResizeObserver().observe(viewport);
            return;
        }

        global.addEventListener("resize", function() {
            updateViewportZoomLayout(viewport);
        });
    }

    function getResizeObserver() {
        if (!resizeObserver) {
            resizeObserver = new global.ResizeObserver(function(entries) {
                var i;

                for (i = 0; i < entries.length; i++) {
                    updateViewportZoomLayout(entries[i].target);
                }
            });
        }

        return resizeObserver;
    }

    function getZoomLayout(board, viewport, zoom) {
        var scaledWidth = Math.ceil(board.offsetWidth * zoom);
        var scaledHeight = Math.ceil(board.offsetHeight * zoom);
        var left = Math.max(0, Math.floor((viewport.clientWidth - scaledWidth) / 2));
        var top = Math.max(0, Math.floor((viewport.clientHeight - scaledHeight) / 2));

        return {
            left: left,
            top: top,
            width: Math.max(viewport.clientWidth, left + scaledWidth),
            height: Math.max(viewport.clientHeight, top + scaledHeight)
        };
    }

    function getScrollArea(board) {
        var viewport = getBoardViewport(board);

        if (!viewport) {
            return null;
        }

        return viewport.querySelector('[data-paint-board-scroll-area="' + (board.id || "paint-board") + '"]');
    }

    function getBoardViewport(board) {
        return board.closest && board.closest(".wm-center");
    }

    function getVisibleCenterPoint(viewport, zoom) {
        var board = viewport && viewport.querySelector(".paint-board");
        var left = board ? parseFloat(board.style.left) || 0 : 0;
        var top = board ? parseFloat(board.style.top) || 0 : 0;

        if (!viewport) {
            return null;
        }

        return {
            x: (viewport.scrollLeft + (viewport.clientWidth / 2) - left) / zoom,
            y: (viewport.scrollTop + (viewport.clientHeight / 2) - top) / zoom
        };
    }

    function restoreVisibleCenter(viewport, visibleCenter, zoom) {
        var board = viewport && viewport.querySelector(".paint-board");
        var left = board ? parseFloat(board.style.left) || 0 : 0;
        var top = board ? parseFloat(board.style.top) || 0 : 0;

        if (!viewport || !visibleCenter) {
            return;
        }

        viewport.scrollLeft = Math.max(0, left + (visibleCenter.x * zoom) - (viewport.clientWidth / 2));
        viewport.scrollTop = Math.max(0, top + (visibleCenter.y * zoom) - (viewport.clientHeight / 2));
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
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("wheel", handleWheel, {
        capture: true,
        passive: false
    });
    global.addEventListener("blur", function() {
        setSpacePanActive(false);
        stopPan();
    });

    global.Zoom = {
        zoomIn: function() {
            return zoomActiveBoard(1);
        },
        zoomOut: function() {
            return zoomActiveBoard(-1);
        },
        getActiveBoard: getActiveBoard,
        setActiveBoard: setActiveBoard,
        setBoardZoom: setBoardZoom
    };

}(window));
