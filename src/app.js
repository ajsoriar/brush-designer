(function(global, $) {

    "use strict";

    global.App = global.App || {};
    global.App.memory = global.App.memory || {};
    global.App.memory.currentColor = global.App.memory.currentColor || "#000000";
    global.App.memory.currentLineWidth = global.App.memory.currentLineWidth || 15;
    global.App.memory.currentBrushWidth = global.App.memory.currentBrushWidth || global.App.memory.currentLineWidth;
    global.App.memory.currentBrushShape = global.App.memory.currentBrushShape || "square";
    global.App.memory.currentBrushStroke = global.App.memory.currentBrushStroke || false;
    global.App.memory.currentBrushAntialiasing = global.App.memory.currentBrushAntialiasing || false;
    global.App.memory.rainbowCrazyMode = global.App.memory.rainbowCrazyMode || false;
    global.App.memory.rainbowCrazyAlgorithm = global.App.memory.rainbowCrazyAlgorithm || "random";
    global.App.memory.rainbowCrazyJump = !!global.App.memory.rainbowCrazyJump;
    global.App.memory.rainbowCrazyLoop = !!global.App.memory.rainbowCrazyLoop;
    global.App.memory.currentLineDesign = global.App.memory.currentLineDesign || {
        weight: global.App.memory.currentLineWidth,
        unit: "px",
        cap: "butt",
        corner: "miter",
        limit: 10,
        align: "center",
        antialiasing: false,
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

    var selectionBehabiourComponent = null;
    var magicWandOptionsComponent = null;

    $(document).ready(function() {
        console.log("jQuery document ready!");
        global.AppOpenWindows.openBrushEditorOutputsWindow();
        global.AppOpenWindows.openSimpleColorPickerWindow();
        global.AppOpenWindows.openSimpleLineWidthPickerWindow();
        global.AppOpenWindows.openSimpleBrushWidthPickerWindow();
        global.AppOpenWindows.openPaintToolsWindow();
        updateRainbowCrazyModeButton();
        updateRainbowCrazyAlgorithmRadios();
        updateRainbowCrazyJumpCheckbox();
        updateRainbowCrazyLoopCheckbox();
        initSelectionBehabiourComponent();
        initMagicWandOptionsComponent();
        syncBrushWidthPickerToPaintTool(global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : null);
        global.AppOpenWindows.createDemoWindow("paintBoard");
        updateFillSelectionButton();
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

        updateFillSelectionButton();
    });

    global.addEventListener("paint-board-selection-change", function(event) {
        if (!event.detail || !event.detail.paintBoard) {
            return;
        }

        if (global.AppOpenWindows.updatePaintBoardToolbarState) {
            global.AppOpenWindows.updatePaintBoardToolbarState(event.detail.paintBoard);
        }

        updateFillSelectionButton();
    });

    global.addEventListener("paint-board-active-change", function() {
        updateFillSelectionButton();
    });

    global.addEventListener("paint-tools-change", function(event) {
        var mode = event.detail && event.detail.mode;

        syncSelectionBehabiourVisibility(mode);
        syncMagicWandOptionsVisibility(mode);
        syncBrushWidthPickerToPaintTool(mode);

        if (mode === "DESIGNED-BRUSH") {
            global.AppOpenWindows.openBrushEditorOutputsWindow({
                selectFirstIfNone: true
            });
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

    function initSelectionBehabiourComponent() {
        if (!global.SelectionBehabiourComponent) {
            return;
        }

        selectionBehabiourComponent = global.SelectionBehabiourComponent({
            id: "selection-behabiour-toolbar",
            containerId: "selection-behabiour-container",
            visible: false
        });

        syncSelectionBehabiourVisibility(global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : "");
    }

    function syncSelectionBehabiourVisibility(mode) {
        if (!selectionBehabiourComponent) {
            return;
        }

        if (mode === "LASSO-SELECTION") {
            selectionBehabiourComponent.show();
            return;
        }

        selectionBehabiourComponent.hide();
    }

    function initMagicWandOptionsComponent() {
        if (!global.MagicWandOptionsComponent) {
            return;
        }

        magicWandOptionsComponent = global.MagicWandOptionsComponent({
            id: "magic-wand-options-toolbar",
            containerId: "magic-wand-options-container",
            visible: false
        });

        syncMagicWandOptionsVisibility(global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : "");
    }

    function syncMagicWandOptionsVisibility(mode) {
        if (!magicWandOptionsComponent) {
            return;
        }

        if (mode === "MAGIC-WAND") {
            magicWandOptionsComponent.show();
            return;
        }

        magicWandOptionsComponent.hide();
    }

    function syncBrushWidthPickerToPaintTool(mode) {
        if (mode === "SQUARED-POINTS" || mode === "SQUARED-LINES") {
            global.AppOpenWindows.getSimpleBrushWidthPickerApi().setBrushShape("square");
            global.AppOpenWindows.openSimpleBrushWidthPickerWindow();
        }

        if (mode === "ROUND-POINTS" || mode === "ROUND-LINES") {
            global.AppOpenWindows.getSimpleBrushWidthPickerApi().setBrushShape("circle");
            global.AppOpenWindows.openSimpleBrushWidthPickerWindow();
        }
    }

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

    function fillSelectionWithFrontColor() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.fillSelectionWithFrontColor !== "function") {
            return false;
        }

        if (!targetBoard.hasSelection || !targetBoard.hasSelection()) {
            return false;
        }

        if (targetBoard.fillSelectionWithFrontColor()) {
            updateFillSelectionButton();
            return true;
        }

        return false;
    }

    function toggleRainbowCrazyMode() {
        global.App.memory.rainbowCrazyMode = !global.App.memory.rainbowCrazyMode;
        updateRainbowCrazyModeButton();
        return global.App.memory.rainbowCrazyMode;
    }

    function setRainbowCrazyAlgorithm(algorithm) {
        if (!isRainbowCrazyAlgorithm(algorithm)) {
            return global.App.memory.rainbowCrazyAlgorithm;
        }

        global.App.memory.rainbowCrazyAlgorithm = algorithm;
        updateRainbowCrazyAlgorithmRadios();
        updateRainbowCrazyJumpCheckbox();
        updateRainbowCrazyLoopCheckbox();
        return global.App.memory.rainbowCrazyAlgorithm;
    }

    function setRainbowCrazyJump(jump) {
        global.App.memory.rainbowCrazyJump = !!jump;
        updateRainbowCrazyJumpCheckbox();
        return global.App.memory.rainbowCrazyJump;
    }

    function setRainbowCrazyLoop(loop) {
        global.App.memory.rainbowCrazyLoop = !!loop;
        updateRainbowCrazyLoopCheckbox();
        return global.App.memory.rainbowCrazyLoop;
    }

    function isRainbowCrazyAlgorithm(algorithm) {
        return algorithm === "random" ||
            algorithm === "picker-vertical" ||
            algorithm === "picker-horizontal";
    }

    function updateRainbowCrazyModeButton() {
        var button = document.getElementById("rainbow-crazy-mode-btn");
        var active = !!(global.App && global.App.memory && global.App.memory.rainbowCrazyMode);

        if (!button) {
            return;
        }

        button.className = button.className.replace(/\s?tools-bar-toggle-on/g, "");

        if (active) {
            button.className += " tools-bar-toggle-on";
        }

        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.title = "Rainbow Crazy Mode: " + (active ? "ON" : "OFF");
    }

    function updateFillSelectionButton() {
        var button = document.getElementById("fill-selection-front-color-btn");
        var targetBoard = global.AppOpenWindows && global.AppOpenWindows.getActivePaintBoard ?
            global.AppOpenWindows.getActivePaintBoard() :
            null;
        var hasSelection = !!(targetBoard && targetBoard.hasSelection && targetBoard.hasSelection());

        if (!button) {
            return;
        }

        button.disabled = !hasSelection;
    }

    function updateRainbowCrazyAlgorithmRadios() {
        var algorithm = (global.App && global.App.memory && global.App.memory.rainbowCrazyAlgorithm) || "random";
        var radios = document.querySelectorAll("input[name=\"rainbow-crazy-algorithm\"]");
        var i;

        for (i = 0; i < radios.length; i++) {
            radios[i].checked = radios[i].value === algorithm;
        }
    }

    function updateRainbowCrazyJumpCheckbox() {
        var checkbox = document.getElementById("rainbow-crazy-jump");
        var algorithm = (global.App && global.App.memory && global.App.memory.rainbowCrazyAlgorithm) || "random";

        if (!checkbox) {
            return;
        }

        checkbox.checked = !!(global.App && global.App.memory && global.App.memory.rainbowCrazyJump);
        checkbox.disabled = algorithm === "random";
    }

    function updateRainbowCrazyLoopCheckbox() {
        var checkbox = document.getElementById("rainbow-crazy-loop");
        var algorithm = (global.App && global.App.memory && global.App.memory.rainbowCrazyAlgorithm) || "random";

        if (!checkbox) {
            return;
        }

        checkbox.checked = !!(global.App && global.App.memory && global.App.memory.rainbowCrazyLoop);
        checkbox.disabled = algorithm === "random";
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
    global.fillSelectionWithFrontColor = fillSelectionWithFrontColor;
    global.toggleRainbowCrazyMode = toggleRainbowCrazyMode;
    global.setRainbowCrazyAlgorithm = setRainbowCrazyAlgorithm;
    global.setRainbowCrazyJump = setRainbowCrazyJump;
    global.setRainbowCrazyLoop = setRainbowCrazyLoop;
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
    global.openSimpleBrushWidthPickerWindow = global.AppOpenWindows.openSimpleBrushWidthPickerWindow;
    global.openLinesDesignerWindow = global.AppOpenWindows.openLinesDesignerWindow;
    global.SimpleColorPickerApi = global.AppOpenWindows.getSimpleColorPickerApi();
    global.SimpleLineWidthPickerApi = global.AppOpenWindows.getSimpleLineWidthPickerApi();
    global.SimpleBrushWidthPickerApi = global.AppOpenWindows.getSimpleBrushWidthPickerApi();
    global.LinesDesignerApi = global.AppOpenWindows.getLinesDesignerApi();
    global.openPaintToolsWindow = global.AppOpenWindows.openPaintToolsWindow;
    global.openStarGeneratorWindow = global.AppOpenWindows.openStarGeneratorWindow;
    global.renderBruses = renderBruses;
    global.storeImage = storeImage;

}(window, jQuery));
