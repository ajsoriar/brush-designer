(function(global) {

    "use strict";

    var LEVELS = 4;

    function applyPosterize() {
        var board = getActiveBoard();
        var imageData;
        var data;
        var snapshot;
        var step;
        var i;

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

        step = 256 / LEVELS;

        for (i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.floor(data[i] / step) * step + step / 2);
            data[i + 1] = Math.min(255, Math.floor(data[i + 1] / step) * step + step / 2);
            data[i + 2] = Math.min(255, Math.floor(data[i + 2] / step) * step + step / 2);
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
    global.Filters.posterize = applyPosterize;

}(window));
