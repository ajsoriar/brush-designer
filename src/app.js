(function(global, $) {

    "use strict";

    global.App = global.App || {};
    global.App.memory = global.App.memory || {};
    global.App.memory.currentColor = global.App.memory.currentColor || "#000000";
    global.App.memory.currentLineWidth = global.App.memory.currentLineWidth || 15;
    global.App.memory.currentLineDesign = global.App.memory.currentLineDesign || {
        weight: global.App.memory.currentLineWidth,
        unit: "pt",
        cap: "butt",
        corner: "miter",
        limit: 10,
        align: "center",
        dashed: false,
        dashes: [12, 8, 12, 8, 12, 8],
        arrowStart: "none",
        arrowEnd: "none",
        startScale: 100,
        endScale: 100,
        arrowLinked: false,
        active: false
    };
    global.App.memory.currentDesignedBrush = global.App.memory.currentDesignedBrush || null;
    global.App.memory.currentPatternUseFrontColor = global.App.memory.currentPatternUseFrontColor || false;
    global.App.memory.currentGradient = global.App.memory.currentGradient || {
        type: "linear",
        bounded: false,
        retro: false,
        ditheringMethod: "ordered-bayer-8x8",
        ditheringOptions: {
            diffusionStrength: 1,
            noiseAmount: 1,
            halftoneCellSize: 6,
            patternLevels: 6,
            patternCellSize: 4
        },
        stops: [
            {
                offset: 0,
                color: "#000000"
            },
            {
                offset: 1,
                color: "#ffffff"
            }
        ]
    };
    global.App.memory.currentRetroBrush = global.App.memory.currentRetroBrush || {
        size: 100,
        pointSpacing: 2,
        pointSize: 1
    };
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

    global.addEventListener("paint-board-undo-change", function(event) {
        if (!event.detail || !event.detail.paintBoard) {
            return;
        }

        if (global.AppOpenWindows.updatePaintBoardToolbarState) {
            global.AppOpenWindows.updatePaintBoardToolbarState(event.detail.paintBoard);
        }
    });

    global.addEventListener("paint-tools-change", function(event) {
        var mode = event.detail && event.detail.mode;

        if (mode === "DESIGNED-BRUSH") {
            global.AppOpenWindows.openBrushEditorOutputsWindow();
        }

        if (mode === "DESIGNED-BRUSH-2") {
            global.AppOpenWindows.openBrushDesigner2InWindow();
        }

        if (mode === "OLD-BRUSH") {
            global.AppOpenWindows.openRetroBrushDesignerWindow();
        }

        if (mode === "PATTERN-BUCKET") {
            global.AppOpenWindows.openPatternsViewWindow();
        }

        if (mode === "GRADIENT") {
            global.AppOpenWindows.openGradientPanelWindow();
        }

        if (mode === "STRAIGHT-LINE") {
            if (global.App.memory && global.App.memory.currentLineDesign) {
                global.App.memory.currentLineDesign.active = true;
            }
            global.AppOpenWindows.openLinesDesignerWindow();
        }
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

    function undoLastAction() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.undo !== "function") {
            return false;
        }

        return targetBoard.undo();
    }

    function isEditableTarget(target) {
        if (!target) {
            return false;
        }

        if (target.isContentEditable) {
            return true;
        }

        return !!target.closest("input, textarea, select, [contenteditable=\"true\"]");
    }

    global.addEventListener("keydown", function(event) {
        var isUndoShortcut;

        if (isEditableTarget(event.target)) {
            return;
        }

        isUndoShortcut = (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            String(event.key || "").toLowerCase() === "z";

        if (!isUndoShortcut) {
            return;
        }

        if (undoLastAction()) {
            event.preventDefault();
        }
    });

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
    global.undoLastAction = undoLastAction;
    global.createDemoWindow = global.AppOpenWindows.createDemoWindow;
    global.openBrushDesignerInWindow = global.AppOpenWindows.openBrushDesignerInWindow;
    global.openBrushDesigner2InWindow = global.AppOpenWindows.openBrushDesigner2InWindow;
    global.openRetroBrushDesignerWindow = global.AppOpenWindows.openRetroBrushDesignerWindow;
    global.openPatternsViewWindow = global.AppOpenWindows.openPatternsViewWindow;
    global.openGradientPanelWindow = global.AppOpenWindows.openGradientPanelWindow;
    global.openBrushEditorOutputsWindow = global.AppOpenWindows.openBrushEditorOutputsWindow;
    global.openSimpleColorPickerWindow = global.AppOpenWindows.openSimpleColorPickerWindow;
    global.openBigColorPickerWindow = global.AppOpenWindows.openBigColorPickerWindow;
    global.openSimpleLineWidthPickerWindow = global.AppOpenWindows.openSimpleLineWidthPickerWindow;
    global.openLinesDesignerWindow = global.AppOpenWindows.openLinesDesignerWindow;
    global.openPaintToolsWindow = global.AppOpenWindows.openPaintToolsWindow;
    global.openStarGeneratorWindow = global.AppOpenWindows.openStarGeneratorWindow;
    global.renderBruses = renderBruses;
    global.storeImage = storeImage;

}(window, jQuery));
