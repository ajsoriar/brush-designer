(function(global) {

    "use strict";

    function applyEmboss() {
        var board = getActiveBoard();
        var imageData;
        var data;
        var snapshot;
        var width;
        var height;
        var source;
        var x;
        var y;
        var kx;
        var ky;
        var sx;
        var sy;
        var r;
        var g;
        var b;
        var idx;

        if (!board || !board.context) {
            return;
        }

        imageData = board.context.getImageData(0, 0, board.canvas.width, board.canvas.height);
        data = imageData.data;
        width = board.canvas.width;
        height = board.canvas.height;

        snapshot = {
            width: width,
            height: height,
            backgroundColor: board.backgroundColor,
            imageData: board.context.getImageData(0, 0, width, height)
        };

        source = new Uint8ClampedArray(data);

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                r = 0;
                g = 0;
                b = 0;

                for (ky = -1; ky <= 1; ky++) {
                    for (kx = -1; kx <= 1; kx++) {
                        sx = x + kx;
                        sy = y + ky;

                        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                            idx = (sy * width + sx) * 4;
                            r += source[idx] * getEmbossWeight(kx, ky);
                            g += source[idx + 1] * getEmbossWeight(kx, ky);
                            b += source[idx + 2] * getEmbossWeight(kx, ky);
                        }
                    }
                }

                idx = (y * width + x) * 4;
                data[idx] = clampChannel(r + 128);
                data[idx + 1] = clampChannel(g + 128);
                data[idx + 2] = clampChannel(b + 128);
            }
        }

        board.context.putImageData(imageData, 0, 0);

        board.undoSnapshot = {
            width: width,
            height: height,
            backgroundColor: snapshot.backgroundColor,
            imageData: snapshot.imageData
        };

        notifyUndoChange(board);
        refreshBoard(board);
    }

    function getEmbossWeight(kx, ky) {
        return (ky + 1) * 3 + (kx + 1) - 4;
    }

    function clampChannel(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
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
    global.Filters.emboss = applyEmboss;

}(window));
