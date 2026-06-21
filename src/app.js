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
    var toolsMagicWandOptionsComponent = null;
    var toolsTransformOptionsComponent = null;
    var toolsCrazyOptionsComponent = null;
    var foregroundBackgroundColorsComponent = null;
    var appMenuComponent = null;

    $(document).ready(function() {
        console.log("jQuery document ready!");
        initAppMenuComponent();
        initForegroundBackgroundColorsComponent();
        global.AppOpenWindows.openBrushEditorOutputsWindow();
        global.AppOpenWindows.openSimpleColorPickerWindow();
        global.AppOpenWindows.openSimpleLineWidthPickerWindow();
        global.AppOpenWindows.openSimpleBrushWidthPickerWindow();
        global.AppOpenWindows.openPaintToolsWindow();
        global.AppOpenWindows.openLayersPanelWindow();
        initSelectionBehabiourComponent();
        initToolsMagicWandOptionsComponent();
        initToolsTransformOptionsComponent();
        initToolsCrazyOptionsComponent();
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

    global.addEventListener("paint-board-content-change", function(event) {
        if (!event.detail ||
            !event.detail.paintBoard ||
            !event.detail.layerId ||
            !global.AppOpenWindows.updateLayersPanelThumbnail) {
            return;
        }

        global.AppOpenWindows.updateLayersPanelThumbnail(
            event.detail.paintBoard,
            event.detail.layerId
        );
    });

    global.addEventListener("paint-board-active-change", function() {
        updateFillSelectionButton();
        syncToolsTransformOptionsVisibility();
    });

    global.addEventListener("paint-board-floating-paste-change", function(event) {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!event.detail || event.detail.paintBoard !== activePaintBoard) {
            return;
        }

        syncToolsTransformOptionsVisibility();
    });

    global.addEventListener("paint-board-floating-paste-transform-change", function(event) {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!toolsTransformOptionsComponent ||
            !event.detail ||
            event.detail.paintBoard !== activePaintBoard) {
            return;
        }

        toolsTransformOptionsComponent.setOperation(event.detail.operation);
        toolsTransformOptionsComponent.setAlgorithm(
            activePaintBoard.floatingPaste.transformAlgorithms[event.detail.operation]
        );
        toolsTransformOptionsComponent.setRoundBehavior(
            activePaintBoard.floatingPaste.warpRoundBehavior
        );
    });

    global.addEventListener("paint-tools-change", function(event) {
        var mode = event.detail && event.detail.mode;

        syncSelectionBehabiourVisibility(mode);
        syncToolsMagicWandOptionsVisibility(mode);
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

    function initToolsMagicWandOptionsComponent() {
        if (!global.ToolsMagicWandOptionsComponent) {
            return;
        }

        toolsMagicWandOptionsComponent = global.ToolsMagicWandOptionsComponent({
            id: "tools-magic-wand-options-toolbar",
            containerId: "tools-magic-wand-options-container",
            visible: false
        });

        syncToolsMagicWandOptionsVisibility(global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : "");
    }

    function syncToolsMagicWandOptionsVisibility(mode) {
        if (!toolsMagicWandOptionsComponent) {
            return;
        }

        if (mode === "MAGIC-WAND") {
            toolsMagicWandOptionsComponent.show();
            return;
        }

        toolsMagicWandOptionsComponent.hide();
    }

    function initToolsTransformOptionsComponent() {
        if (!global.ToolsTransformOptionsComponent) {
            return;
        }

        toolsTransformOptionsComponent = global.ToolsTransformOptionsComponent({
            id: "tools-transform-options-toolbar",
            containerId: "tools-transform-options-container",
            visible: false,
            onChange: function(operation) {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (!activePaintBoard || !activePaintBoard.setFloatingPasteTransformOperation) {
                    return;
                }

                activePaintBoard.setFloatingPasteTransformOperation(operation);
            },
            onAlgorithmChange: function(algorithm) {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.setFloatingPasteTransformAlgorithm) {
                    activePaintBoard.setFloatingPasteTransformAlgorithm(algorithm);
                }
            },
            onRoundBehaviorChange: function(active) {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.setFloatingPasteWarpRoundBehavior) {
                    activePaintBoard.setFloatingPasteWarpRoundBehavior(active);
                }
            },
            onCancel: function() {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.cancelFloatingPasteDistortion) {
                    activePaintBoard.cancelFloatingPasteDistortion();
                }
            },
            onAccept: function() {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.commitFloatingPaste) {
                    activePaintBoard.commitFloatingPaste();
                }
            }
        });
        global.ToolsTransformOptionsApi = toolsTransformOptionsComponent;
        syncToolsTransformOptionsVisibility();
    }

    function syncToolsTransformOptionsVisibility() {
        var activePaintBoard;

        if (!toolsTransformOptionsComponent) {
            return;
        }

        activePaintBoard = global.AppOpenWindows && global.AppOpenWindows.getActivePaintBoard ?
            global.AppOpenWindows.getActivePaintBoard() :
            null;

        toolsTransformOptionsComponent.setVisible(!!(activePaintBoard && activePaintBoard.floatingPaste));
        if (activePaintBoard && activePaintBoard.floatingPaste) {
            toolsTransformOptionsComponent.setOperation(
                activePaintBoard.floatingPaste.transformOperation || "scale"
            );
            toolsTransformOptionsComponent.setAlgorithm(
                activePaintBoard.floatingPaste.transformAlgorithms[
                    activePaintBoard.floatingPaste.transformOperation || "scale"
                ]
            );
            toolsTransformOptionsComponent.setRoundBehavior(
                activePaintBoard.floatingPaste.warpRoundBehavior
            );
        }
    }

    function initToolsCrazyOptionsComponent() {
        if (!global.ToolsCrazyOptionsComponent) {
            return;
        }

        toolsCrazyOptionsComponent = global.ToolsCrazyOptionsComponent({
            id: "tools-crazy-options-toolbar",
            containerId: "tools-crazy-options-container",
            visible: true,
            active: global.App.memory.rainbowCrazyMode,
            algorithm: global.App.memory.rainbowCrazyAlgorithm,
            jump: global.App.memory.rainbowCrazyJump,
            loop: global.App.memory.rainbowCrazyLoop,
            onChange: function(options) {
                global.App.memory.rainbowCrazyMode = options.active;
                global.App.memory.rainbowCrazyAlgorithm = options.algorithm;
                global.App.memory.rainbowCrazyJump = options.jump;
                global.App.memory.rainbowCrazyLoop = options.loop;
            }
        });
        global.ToolsCrazyOptionsApi = toolsCrazyOptionsComponent;
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

    function initForegroundBackgroundColorsComponent() {
        if (!global.ForegroundBackgroundColors) {
            return;
        }

        foregroundBackgroundColorsComponent = global.ForegroundBackgroundColors({
            id: "foreground-background-colors-toolbar",
            containerId: "foreground-background-colors-container",
            frontColor: global.App.memory.currentColor,
            onFrontClick: function(color) {
                global.AppOpenWindows.openBigColorPickerWindow(color, "front");
            },
            onBackgroundClick: function(color) {
                global.AppOpenWindows.openBigColorPickerWindow(color, "background");
            },
            onChange: function(colors) {
                global.AppOpenWindows.setActiveColor(colors.frontColor);
            }
        });
        global.ForegroundBackgroundColorsApi = foregroundBackgroundColorsComponent;
    }

    function initAppMenuComponent() {
        if (!global.AppMenu) {
            return;
        }

        appMenuComponent = global.AppMenu({
            id: "application-menu",
            containerId: "app-menu-container",
            actions: {
                newDocument: global.AppOpenWindows.newDocument,
                createPaintBoard: function() {
                    global.AppOpenWindows.openPaintBoardWindow();
                },
                openImage: openImage,
                saveImage: saveImage,
                copyToClipboard: copyToClipboard,
                pasteFromClipboard: pasteFromClipboard,
                openMultiPaste: global.AppOpenWindows.openMultiPaste,
                clearBoard: clearBoard,
                fillSelectionWithFrontColor: fillSelectionWithFrontColor,
                openBrushDesigner: global.AppOpenWindows.openBrushDesignerInWindow,
                openBrushDesigner2: global.AppOpenWindows.openBrushDesigner2InWindow,
                openLinesDesigner: global.AppOpenWindows.openLinesDesignerWindow,
                openStarGenerator: global.AppOpenWindows.openStarGeneratorWindow,
                openPaintTools: global.AppOpenWindows.openPaintToolsWindow,
                openLayers: global.AppOpenWindows.openLayersPanelWindow,
                openColorPicker: global.AppOpenWindows.openSimpleColorPickerWindow,
                openBigColorPicker: global.AppOpenWindows.openBigColorPickerWindow,
                openLineWidthPicker: global.AppOpenWindows.openSimpleLineWidthPickerWindow,
                openBrushWidthPicker: global.AppOpenWindows.openSimpleBrushWidthPickerWindow
            }
        });
        global.AppMenuApi = appMenuComponent;
    }

    function openImage() {
        var input = document.createElement("input");

        input.type = "file";
        input.accept = "image/*";
        input.addEventListener("change", function() {
            var file = input.files && input.files[0];

            if (file) {
                loadImageFile(file);
            }
        });
        input.click();
    }

    function loadImageFile(file) {
        var image = new Image();
        var objectUrl = URL.createObjectURL(file);

        image.onload = function() {
            var paintBoard;

            URL.revokeObjectURL(objectUrl);
            global.AppOpenWindows.openPaintBoardWindow({
                width: image.naturalWidth || image.width,
                height: image.naturalHeight || image.height,
                backgroundColor: "rgba(0, 0, 0, 0)"
            });
            paintBoard = global.AppOpenWindows.getActivePaintBoard();
            if (!paintBoard) {
                return;
            }

            paintBoard.context.drawImage(image, 0, 0);
            if (paintBoard.window) {
                paintBoard.window.baseTitle = file.name;
                global.AppOpenWindows.updatePaintBoardWindowTitle(paintBoard);
            }
        };
        image.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            showNotify("Unable to open image");
        };
        image.src = objectUrl;
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

    function updateFillSelectionButton() {
        var button = document.getElementById("fill-selection-front-color-btn");
        var targetBoard = global.AppOpenWindows && global.AppOpenWindows.getActivePaintBoard ?
            global.AppOpenWindows.getActivePaintBoard() :
            null;
        var hasSelection = !!(targetBoard && targetBoard.hasSelection && targetBoard.hasSelection());

        if (button) {
            button.disabled = !hasSelection;
        }

        if (appMenuComponent && appMenuComponent.setItemEnabled) {
            appMenuComponent.setItemEnabled("fillSelectionWithFrontColor", hasSelection);
        }
    }

    function undoLastAction() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.undo !== "function") {
            return false;
        }

        return targetBoard.undo();
    }

    function deleteActiveSelection() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard ||
            typeof targetBoard.deleteSelection !== "function" ||
            !targetBoard.hasSelection ||
            !targetBoard.hasSelection()) {
            return false;
        }

        return targetBoard.deleteSelection();
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
        var isDeleteKey;
        var isUndoShortcut;

        if (isEditableTarget(event.target)) {
            return;
        }

        isDeleteKey = !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            (event.key === "Delete" || event.key === "Backspace");

        if (isDeleteKey) {
            if (deleteActiveSelection()) {
                event.preventDefault();
            }
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
    global.openMultiPaste = global.AppOpenWindows.openMultiPaste;
    global.pasteFromClipboard = pasteFromClipboard;
    global.copyToClipboard = copyToClipboard;
    global.saveImage = saveImage;
    global.clearBoard = clearBoard;
    global.fillSelectionWithFrontColor = fillSelectionWithFrontColor;
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
    global.openLayersPanelWindow = global.AppOpenWindows.openLayersPanelWindow;
    global.openStarGeneratorWindow = global.AppOpenWindows.openStarGeneratorWindow;
    global.renderBruses = renderBruses;
    global.storeImage = storeImage;

}(window, jQuery));
