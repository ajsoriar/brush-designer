(function(global) {

    "use strict";

    function applyDesaturate() {
        var board = getActiveBoard();
        var imageData;
        var data;
        var snapshot;
        var i;
        var r;
        var g;
        var b;
        var gray;

        if (!board || !board.context) {
            return;
        }

        imageData = board.context.getImageData(0, 0, board.canvas.width, board.canvas.height);
        data = imageData.data;

        snapshot = {
            width: board.canvas.width,
            height: board.canvas.height,
            backgroundColor: board.backgroundColor,
            imageData: board.context.getImageData(0, 0, board.canvas.width, board.canvas.height)
        };

        for (i = 0; i < data.length; i += 4) {
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];
            gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        board.context.putImageData(imageData, 0, 0);

        board.undoSnapshot = {
            width: snapshot.width,
            height: snapshot.height,
            backgroundColor: snapshot.backgroundColor,
            imageData: snapshot.imageData
        };

        notifyUndoChange(board);
        refreshBoard(board);
    }

    function getActiveBoard() {
        if (global.AppOpenWindows && typeof global.AppOpenWindows.getActivePaintBoard === "function") {
            return global.AppOpenWindows.getActivePaintBoard();
        }

        return null;
    }

    function notifyUndoChange(board) {
        var event;

        if (!board) {
            return;
        }

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-undo-change", {
                detail: {
                    board: board.element,
                    paintBoard: board,
                    canUndo: !!board.undoSnapshot
                }
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-undo-change", false, false, {
                board: board.element,
                paintBoard: board,
                canUndo: !!board.undoSnapshot
            });
        }

        global.dispatchEvent(event);
    }

    function refreshBoard(board) {
        var event;
        var detail;

        if (!board) {
            return;
        }

        if (global.AppOpenWindows && typeof global.AppOpenWindows.refreshLayersPanel === "function") {
            global.AppOpenWindows.refreshLayersPanel(board);
        }

        detail = {
            board: board.element,
            paintBoard: board,
            layerId: board.activeLayerId,
            paintTarget: board.activePaintTarget || "board",
            canvas: board.canvas,
            refreshLayersPanel: true
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

    global.Filters = global.Filters || {};
    global.Filters.desaturate = applyDesaturate;

}(window));
