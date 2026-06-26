import svgExporterIconUrl from "./components/svgExporter/svg-exporter-icon.png";
import undoIconUrl from "./images/undo-icon.png";

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
    global.App.memory.cropExpansionFillMode = global.App.memory.cropExpansionFillMode || "background-color";
    global.App.memory.cropSquareAspectRatio = !!global.App.memory.cropSquareAspectRatio;
    global.App.memory.cropRuleOfThirds = typeof global.App.memory.cropRuleOfThirds === "boolean" ?
        global.App.memory.cropRuleOfThirds :
        true;
    global.App.memory.cropShieldBlack50 = typeof global.App.memory.cropShieldBlack50 === "boolean" ?
        global.App.memory.cropShieldBlack50 :
        true;
    global.App.memory.rainbowCrazyMode = global.App.memory.rainbowCrazyMode || false;
    global.App.memory.rainbowCrazyAlgorithm = global.App.memory.rainbowCrazyAlgorithm || "random";
    global.App.memory.rainbowCrazyJump = !!global.App.memory.rainbowCrazyJump;
    global.App.memory.rainbowCrazyLoop = !!global.App.memory.rainbowCrazyLoop;
    global.App.memory.pointerAutoSelectLayer = !!global.App.memory.pointerAutoSelectLayer;
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
    var toolsPointerOptionsComponent = null;
    var toolsCrazyOptionsComponent = null;
    var toolsCropOptionsComponent = null;
    var foregroundBackgroundColorsComponent = null;
    var appMenuComponent = null;
    var undoToolbarIconComponent = null;
    var svgExporterToolbarIconComponent = null;

    $(document).ready(function() {
        console.log("jQuery document ready!");
        initUndoToolbarIconComponent();
        initSvgExporterToolbarIconComponent();
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
        initToolsPointerOptionsComponent();
        initToolsCrazyOptionsComponent();
        initToolsCropOptionsComponent();
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
        if (!event.detail || !event.detail.paintBoard) {
            return;
        }

        if (event.detail.refreshLayersPanel) {
            refreshLayersPanel(event.detail.paintBoard);
            return;
        }

        if (!event.detail.layerId || !global.AppOpenWindows.updateLayersPanelThumbnail) {
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
        syncToolsCropOptionsVisibility();
    });

    global.addEventListener("paint-board-crop-change", function(event) {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!toolsCropOptionsComponent ||
            !event.detail ||
            event.detail.paintBoard !== activePaintBoard) {
            return;
        }

        toolsCropOptionsComponent.setVisible(!!event.detail.active);
        if (event.detail.active) {
            toolsCropOptionsComponent.setCropBounds({
                x: event.detail.x,
                y: event.detail.y,
                width: event.detail.width,
                height: event.detail.height
            });
        }
    });

    global.addEventListener("paint-board-floating-paste-change", function(event) {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!event.detail || event.detail.paintBoard !== activePaintBoard) {
            return;
        }

        syncToolsTransformOptionsVisibility();
        if (!event.detail.active) {
            refreshLayersPanel(activePaintBoard);
        }
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
        syncToolsPointerOptionsVisibility(mode);
        syncBrushWidthPickerToPaintTool(mode);

        if (mode === "CROP-BOARD") {
            startCropOnActivePaintBoard();
        }

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

    function startCropOnActivePaintBoard() {
        var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

        if (activePaintBoard && typeof activePaintBoard.startCrop === "function") {
            activePaintBoard.startCrop();
        }
    }

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

    function initToolsPointerOptionsComponent() {
        if (!global.ToolsPointerOptionsComponent) {
            return;
        }

        toolsPointerOptionsComponent = global.ToolsPointerOptionsComponent({
            id: "tools-pointer-options-toolbar",
            containerId: "tools-pointer-options-container",
            visible: false,
            autoSelectLayer: global.App.memory.pointerAutoSelectLayer,
            onChange: function(options) {
                global.App.memory.pointerAutoSelectLayer = !!options.autoSelectLayer;
            }
        });
        global.ToolsPointerOptionsApi = toolsPointerOptionsComponent;
        syncToolsPointerOptionsVisibility(global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : "");
    }

    function syncToolsPointerOptionsVisibility(mode) {
        if (!toolsPointerOptionsComponent) {
            return;
        }

        if (mode === "POINTER-TOOL") {
            toolsPointerOptionsComponent.show();
            return;
        }

        toolsPointerOptionsComponent.hide();
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

                if (activePaintBoard && activePaintBoard.cancelFloatingPaste) {
                    activePaintBoard.cancelFloatingPaste();
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

    function initToolsCropOptionsComponent() {
        if (!global.ToolsCropOptionsComponent) {
            return;
        }

        toolsCropOptionsComponent = global.ToolsCropOptionsComponent({
            id: "tools-crop-options-toolbar",
            containerId: "tools-crop-options-container",
            visible: false,
            fillMode: global.App.memory.cropExpansionFillMode,
            squareAspectRatio: global.App.memory.cropSquareAspectRatio,
            ruleOfThirds: global.App.memory.cropRuleOfThirds,
            shieldBlack50: global.App.memory.cropShieldBlack50,
            onFillModeChange: function(fillMode) {
                global.App.memory.cropExpansionFillMode = fillMode;
            },
            onOptionChange: function(optionName, checked) {
                var activePaintBoard;

                if (optionName === "squareAspectRatio") {
                    global.App.memory.cropSquareAspectRatio = checked;
                } else if (optionName === "ruleOfThirds") {
                    global.App.memory.cropRuleOfThirds = checked;
                } else if (optionName === "shieldBlack50") {
                    global.App.memory.cropShieldBlack50 = checked;
                }

                activePaintBoard = global.AppOpenWindows.getActivePaintBoard();
                if (optionName === "squareAspectRatio" && activePaintBoard && activePaintBoard.setCropSquareAspectRatio) {
                    activePaintBoard.setCropSquareAspectRatio(checked);
                } else if (activePaintBoard && activePaintBoard.refreshCrop) {
                    activePaintBoard.refreshCrop();
                }
            },
            onAccept: function() {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.commitCrop) {
                    activePaintBoard.commitCrop();
                }
            },
            onCancel: function() {
                var activePaintBoard = global.AppOpenWindows.getActivePaintBoard();

                if (activePaintBoard && activePaintBoard.cancelCrop) {
                    activePaintBoard.cancelCrop();
                }
            }
        });

        global.ToolsCropOptionsApi = toolsCropOptionsComponent;
        syncToolsCropOptionsVisibility();
    }

    function syncToolsCropOptionsVisibility() {
        var activePaintBoard;
        var crop;

        if (!toolsCropOptionsComponent) {
            return;
        }

        activePaintBoard = global.AppOpenWindows && global.AppOpenWindows.getActivePaintBoard ?
            global.AppOpenWindows.getActivePaintBoard() :
            null;
        crop = activePaintBoard && activePaintBoard.cropSession ? activePaintBoard.cropSession : null;

        toolsCropOptionsComponent.setVisible(!!crop);
        if (crop) {
            toolsCropOptionsComponent.setCropBounds({
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height
            });
            toolsCropOptionsComponent.setFillMode(global.App.memory.cropExpansionFillMode);
            toolsCropOptionsComponent.setOptions({
                squareAspectRatio: global.App.memory.cropSquareAspectRatio,
                ruleOfThirds: global.App.memory.cropRuleOfThirds,
                shieldBlack50: global.App.memory.cropShieldBlack50
            });
        }
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

    function initSvgExporterToolbarIconComponent() {
        if (!global.ToolsBarIcon) {
            return;
        }

        svgExporterToolbarIconComponent = global.ToolsBarIcon({
            id: "svg-exporter-toolbar-icon",
            containerId: "svg-exporter-toolbar-icon-container",
            buttons: [
                {
                    id: "svg-exporter-toolbar-button",
                    title: "SVG Exporter",
                    imageSrc: svgExporterIconUrl,
                    imageAlt: "SVG Exporter",
                    onClick: function() {
                        if (global.AppOpenWindows && global.AppOpenWindows.openSvgExporterWindow) {
                            global.AppOpenWindows.openSvgExporterWindow();
                        }
                    }
                }
            ]
        });

        global.SvgExporterToolbarIconApi = svgExporterToolbarIconComponent;
    }

    function initUndoToolbarIconComponent() {
        if (!global.ToolsBarIcon) {
            return;
        }

        undoToolbarIconComponent = global.ToolsBarIcon({
            id: "undo-toolbar-icon",
            containerId: "undo-toolbar-icon-container",
            buttons: [
                {
                    id: "undo-toolbar-button",
                    title: "Undo",
                    imageSrc: undoIconUrl,
                    imageAlt: "Undo",
                    onClick: function() {
                        undoLastAction();
                    }
                }
            ]
        });

        global.UndoToolbarIconApi = undoToolbarIconComponent;
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
                downloadFlattenImage: downloadFlattenImage,
                saveImageAs: saveImageAs,
                copyToClipboard: copyToClipboard,
                pasteFromClipboard: pasteFromClipboard,
                pasteAsNewLayer: pasteAsNewLayer,
                openMultiPaste: global.AppOpenWindows.openMultiPaste,
                openFillBigColorPicker: openFillBigColorPicker,
                transformLayer: transformActiveLayer,
                openResizeImage: global.AppOpenWindows.openResizeImageWindow,
                cropToSelection: cropToSelection,
                duplicateLayer: duplicateActiveLayer,
                clearBoard: clearBoard,
                clearSelectionContent: deleteActiveSelection,
                selectAll: selectAll,
                unselect: unselect,
                fillSelectionWithFrontColor: fillSelectionWithFrontColor,
                reverseSelection: reverseSelection,
                flattenImage: global.AppOpenWindows.flattenImage,
                mergeSelectedLayers: global.AppOpenWindows.mergeSelectedLayers,
                openBrushDesigner: global.AppOpenWindows.openBrushDesignerInWindow,
                openBrushDesigner2: global.AppOpenWindows.openBrushDesigner2InWindow,
                openLinesDesigner: global.AppOpenWindows.openLinesDesignerWindow,
                openStarGenerator: global.AppOpenWindows.openStarGeneratorWindow,
                openPaintTools: global.AppOpenWindows.openPaintToolsWindow,
                openLayers: global.AppOpenWindows.openLayersPanelWindow,
                openColorPicker: global.AppOpenWindows.openSimpleColorPickerWindow,
                openBigColorPicker: global.AppOpenWindows.openBigColorPickerWindow,
                openLineWidthPicker: global.AppOpenWindows.openSimpleLineWidthPickerWindow,
                openBrushWidthPicker: global.AppOpenWindows.openSimpleBrushWidthPickerWindow,
                openSvgExporter: global.AppOpenWindows.openSvgExporterWindow,
                showAbout: showAbout
            }
        });
        global.AppMenuApi = appMenuComponent;
    }

    function showAbout() {
        alert("Brush Designer\nVersion 1.0.0");
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

    function pasteAsNewLayer() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();
        var previousActiveLayerId;
        var previousSelectedLayerIds;
        var newLayer;

        if (!targetBoard ||
            !targetBoard.addLayer ||
            !targetBoard.setActiveLayer) {
            return;
        }

        if (targetBoard.floatingPaste && targetBoard.commitFloatingPaste) {
            targetBoard.commitFloatingPaste();
        }

        previousActiveLayerId = targetBoard.activeLayerId;
        previousSelectedLayerIds = (targetBoard.selectedLayerIds || []).slice();
        newLayer = targetBoard.addLayer();
        if (!newLayer || !targetBoard.setActiveLayer(newLayer.id)) {
            return;
        }

        refreshLayersPanel(targetBoard);
        global.AppClipboard.pasteImageFromClipboard(targetBoard, {
            floatingPasteMetadata: {
                createdLayerId: newLayer.id,
                previousActiveLayerId: previousActiveLayerId,
                previousSelectedLayerIds: previousSelectedLayerIds
            },
            beforePaste: function() {
                if (!targetBoard.getLayers().some(function(layer) {
                    return layer.id === newLayer.id;
                })) {
                    return false;
                }

                targetBoard.setActiveLayer(newLayer.id);
                refreshLayersPanel(targetBoard);
                return true;
            }
        }).then(function(pasted) {
            if (!pasted) {
                rollbackNewPasteLayer();
                return;
            }

            showNotify("Pasted as new layer");
        }).catch(function(error) {
            rollbackNewPasteLayer();
            console.log("Paste as new layer failed:", error);
        });

        function rollbackNewPasteLayer() {
            if (targetBoard.removeLayer) {
                targetBoard.removeLayer(newLayer.id);
            }
            if (targetBoard.setLayerSelection && previousActiveLayerId) {
                targetBoard.setLayerSelection(
                    previousSelectedLayerIds,
                    previousActiveLayerId
                );
            }
            refreshLayersPanel(targetBoard);
        }
    }

    function refreshLayersPanel(targetBoard) {
        if (global.AppOpenWindows.refreshLayersPanel) {
            global.AppOpenWindows.refreshLayersPanel(targetBoard);
        }
    }

    function transformActiveLayer() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.transformActiveLayer !== "function") {
            return;
        }

        if (!targetBoard.transformActiveLayer()) {
            showNotify("Select a layer other than the background to transform");
        }
    }

    function duplicateActiveLayer() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();
        var duplicatedLayer;

        if (!targetBoard ||
            typeof targetBoard.duplicateActiveLayer !== "function") {
            return null;
        }

        if (targetBoard.floatingPaste && targetBoard.commitFloatingPaste) {
            targetBoard.commitFloatingPaste();
        }

        duplicatedLayer = targetBoard.duplicateActiveLayer();
        if (duplicatedLayer) {
            refreshLayersPanel(targetBoard);
        }

        return duplicatedLayer;
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

    function downloadBoardImage(targetBoard, fileName) {
        var link;

        link = document.createElement("a");
        link.href = targetBoard.save();
        link.download = fileName || (targetBoard.id + ".png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadFlattenImage() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();
        var flattenedCanvas;

        if (!targetBoard || !targetBoard.createFlattenedCanvas) {
            return;
        }

        flattenedCanvas = targetBoard.createFlattenedCanvas();
        if (!flattenedCanvas) {
            return;
        }

        downloadCanvasImage(
            flattenedCanvas,
            targetBoard.id + "-flatten.png"
        );
    }

    function downloadCanvasImage(canvas, fileName) {
        var link = document.createElement("a");

        link.href = canvas.toDataURL("image/png");
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function saveImageAs() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();
        var fileName;

        if (!targetBoard) {
            return;
        }

        fileName = window.prompt("Save image as:", targetBoard.id + ".png");
        if (!fileName) {
            return;
        }
        if (!/\.png$/i.test(fileName)) {
            fileName += ".png";
        }

        downloadBoardImage(targetBoard, fileName);
    }

    function clearBoard() {
        global.AppOpenWindows.clearBoard();
    }

    function openFillBigColorPicker() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard) {
            return false;
        }

        global.AppOpenWindows.openBigColorPickerWindow(global.App.memory.currentColor, "fill");
        return true;
    }

    function fillActiveLayerOrSelectionWithColor(color) {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.fillSelectionOrActiveLayerWithColor !== "function") {
            return false;
        }

        return !!targetBoard.fillSelectionOrActiveLayerWithColor(color);
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
            appMenuComponent.setItemEnabled("clearSelectionContent", hasSelection);
            appMenuComponent.setItemEnabled("unselect", hasSelection);
            appMenuComponent.setItemEnabled("fillSelectionWithFrontColor", hasSelection);
            appMenuComponent.setItemEnabled("reverseSelection", hasSelection);
            appMenuComponent.setItemEnabled("cropToSelection", hasSelection);
        }
    }

    function cropToSelection() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.cropToSelection !== "function") {
            return false;
        }

        return targetBoard.cropToSelection();
    }

    function selectAll() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.selectAll !== "function") {
            return false;
        }

        return targetBoard.selectAll();
    }

    function unselect() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard || typeof targetBoard.clearSelection !== "function") {
            return false;
        }

        targetBoard.clearSelection();
        return true;
    }

    function reverseSelection() {
        var targetBoard = global.AppOpenWindows.getActivePaintBoard();

        if (!targetBoard ||
            typeof targetBoard.reverseSelection !== "function" ||
            !targetBoard.hasSelection ||
            !targetBoard.hasSelection()) {
            return false;
        }

        return targetBoard.reverseSelection();
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
    global.pasteAsNewLayer = pasteAsNewLayer;
    global.copyToClipboard = copyToClipboard;
    global.saveImage = saveImage;
    global.clearBoard = clearBoard;
    global.openFillBigColorPicker = openFillBigColorPicker;
    global.fillActiveLayerOrSelectionWithColor = fillActiveLayerOrSelectionWithColor;
    global.fillSelectionWithFrontColor = fillSelectionWithFrontColor;
    global.reverseSelection = reverseSelection;
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
