(function(global, $) {

    "use strict";

    global.App = global.App || {};
    global.App.memory = global.App.memory || {};
    global.App.memory.currentColor = global.App.memory.currentColor || "#000000";
    global.App.memory.currentLineWidth = global.App.memory.currentLineWidth || 1;
    global.App.memory.currentDesignedBrush = global.App.memory.currentDesignedBrush || null;
    global.App.memory.currentStar = global.App.memory.currentStar || {
        points: 5,
        outerRadius: 96,
        innerRadius: 44
    };

    $(document).ready(function() {
        console.log("jQuery document ready!");
        global.AppOpenWindows.openBrushEditorOutputsWindow();
        global.AppOpenWindows.openSimpleColorPickerWindow();
        global.AppOpenWindows.openSimpleLineWidthPickerWindow();
        global.AppOpenWindows.openPaintToolsWindow();
        global.AppOpenWindows.createDemoWindow("paintBoard");
    });

    global.addEventListener("paint-board-zoom-change", function(event) {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!activePaintBoard || !event.detail || event.detail.board !== activePaintBoard.element) {
            return;
        }

        global.AppOpenWindows.updatePaintBoardWindowTitle(activePaintBoard);
    });

    global.addEventListener("paint-board-color-picked", function(event) {
        if (!event.detail || !event.detail.color) {
            return;
        }

        global.AppOpenWindows.setActiveColor(event.detail.color);
    });

    function pasteFromClipboard() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard) {
            return;
        }

        global.AppClipboard.pasteImageFromClipboard(targetBoard).then(function(pasted) {
            if (pasted) {
                showNotify("Pasted");
            }
        }).catch(function(error) {
            console.log("Paste from clipboard failed:", error);
        });
    }

    function copyToClipboard() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard) {
            return;
        }

        global.AppClipboard.copyBoardToClipboard(targetBoard).then(function(copied) {
            if (copied) {
                showNotify("Copied");
            }
        }).catch(function(error) {
            console.log("Copy to clipboard failed:", error);
        });
    }

    function showNotify(message) {
        if (typeof global.ajsrnotify !== "function") {
            return;
        }

        global.ajsrnotify({
            msg: message,
            type: "success",
            position: "right",
            timeout: 2000
        });
    }

    function saveImage() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard) {
            return;
        }

        downloadBoardImage(targetBoard);
    }

    function downloadBoardImage(targetBoard) {
        var link;

        link = document.createElement("a");
        link.href = targetBoard.save();
        link.download = targetBoard.id + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function clearBoard() {
        global.AppOpenWindows.clearBoard();
    }

    function renderBruses() {
        console.log("beforeClose!");
    }

    function storeImage(data) {
        console.log("storeImage! data:", data);
    }

    global.openEditor = global.AppOpenWindows.openEditor;
    global.newDocument = global.AppOpenWindows.newDocument;
    global.pasteFromClipboard = pasteFromClipboard;
    global.copyToClipboard = copyToClipboard;
    global.saveImage = saveImage;
    global.clearBoard = clearBoard;
    global.createDemoWindow = global.AppOpenWindows.createDemoWindow;
    global.openBrushDesignerInWindow = global.AppOpenWindows.openBrushDesignerInWindow;
    global.openBrushDesigner2InWindow = global.AppOpenWindows.openBrushDesigner2InWindow;
    global.openBrushEditorOutputsWindow = global.AppOpenWindows.openBrushEditorOutputsWindow;
    global.openSimpleColorPickerWindow = global.AppOpenWindows.openSimpleColorPickerWindow;
    global.openBigColorPickerWindow = global.AppOpenWindows.openBigColorPickerWindow;
    global.openSimpleLineWidthPickerWindow = global.AppOpenWindows.openSimpleLineWidthPickerWindow;
    global.openPaintToolsWindow = global.AppOpenWindows.openPaintToolsWindow;
    global.openStarGeneratorWindow = global.AppOpenWindows.openStarGeneratorWindow;
    global.renderBruses = renderBruses;
    global.storeImage = storeImage;

}(window, jQuery));
