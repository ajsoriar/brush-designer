import svgExporterIconUrl from "./components/svgExporter/svg-exporter-icon.png";

(function(global, $) {

    "use strict";

    var be = null;
    var demoWindowCount = 0;
    var appBigColorPicker = null;
    var appBigColorPickerWindow = null;
    var appBigColorPickerTarget = "front";
    var appColorPicker = null;
    var appLineWidthPicker = null;
    var appBrushWidthPicker = null;
    var appPaintTools = null;
    var appLayersPanel = null;
    var appStarGenerator = null;
    var appBrushDesigner2 = null;
    var appRetroBrushDesigner = null;
    var appPatternsView = null;
    var appGradientPanel = null;
    var appLinesDesigner = null;
    var appSvgExporter = null;
    var syncingLineWidthComponents = false;
    var documentCount = 0;
    var activePaintBoard = null;
    var VISIBLE_PAINT_TOOLS = [
        "SQUARED-POINTS",
        "ROUND-POINTS",
        "SQUARED-LINES",
        "ROUND-LINES",
        "STRAIGHT-LINE",
        "FILLED-RECTANGLES",
        "FILLED-OVALS",
        "STROKED-RECTANGLES",
        "STROKED-OVALS",
        "LASSO-SELECTION",
        "MAGIC-WAND",
        "PAINT-BUCKET",
        "PATTERN-BUCKET",
        "INK-DROPPER",
        "POINTER-TOOL",
        "GRADIENT",
        "OLD-BRUSH",
        "DESIGNED-BRUSH",
        "DESIGNED-BRUSH-2",
        "STAR-GENERATOR",
        "CROP-BOARD"
    ];

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function openEditor() {
        be = $.brushEditor({
            beforeClose: function() {
                global.renderBruses();
            }
        });

        console.log("be:", be);
        openBrushEditorOutputsWindow();
    }

    function createDemoWindow(type) {
        demoWindowCount += 1;

        if (type === "fixed") {
            WindowsManager.create({
                id: "demo-fixed-window-" + demoWindowCount,
                title: "Fixed window " + demoWindowCount,
                x: 520,
                y: 80,
                width: 300,
                height: 180,
                fixed: true,
                content: "<p>This window is fixed. It cannot move or resize.</p>"
            });
            return;
        }

        if (type === "notResizable") {
            WindowsManager.create({
                id: "demo-not-resizable-window-" + demoWindowCount,
                title: "Movable not resizable " + demoWindowCount,
                x: 180,
                y: 260,
                width: 360,
                height: 220,
                resizable: false,
                content: "<p>This window moves from the top bar, but cannot resize.</p>"
            });
            return;
        }

        if (type === "paintBoard") {
            openPaintBoardWindow();
            return;
        }

        WindowsManager.create({
            id: "demo-resizable-window-" + demoWindowCount,
            title: "Resizable window " + demoWindowCount,
            x: 80,
            y: 80,
            width: 420,
            height: 260,
            content: "<p>This window can move, resize, minimize and close.</p>"
        });
    }

    function newDocument() {
        var existingWindow = WindowsManager.getWindowByWindowId("new-document");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return;
        }

        global.AppClipboard.getNewDocumentInitialSize().then(function(size) {
            openNewDocumentDialog(size);
        });
    }

    function openNewDocumentDialog(size) {
        var existingWindow = WindowsManager.getWindowByWindowId("new-document");
        var dialogWidth = 775;
        var dialogHeight = 320;
        var dialogWindow;
        var dialog;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return;
        }

        dialogWindow = ModalWindow({
            id: "new-document-window",
            windowId: "new-document",
            title: "New",
            width: dialogWidth,
            height: dialogHeight,
            className: "wm-window-new-document"
        });

        dialog = NewDocumentDialog({
            width: size.width,
            height: size.height,
            onCancel: function() {
                dialogWindow.close();
            },
            onOk: function(options) {
                dialogWindow.close();
                openPaintBoardWindow(options);
            }
        });

        dialogWindow.setContent(dialog.element);
    }

    function openMultiPaste() {
        var existingWindow = WindowsManager.getWindowByWindowId("multi-paste");
        var dialogWindow;
        var multiPasteComponent;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return existingWindow;
        }

        dialogWindow = ModalWindow({
            id: "multi-paste-window",
            windowId: "multi-paste",
            title: "Multi Paste",
            width: Math.max(320, Math.min(670, global.innerWidth - 40)),
            height: Math.max(300, Math.min(325, global.innerHeight - 40)),
            className: "wm-window-multi-paste",
            beforeClose: function() {
                if (multiPasteComponent) {
                    multiPasteComponent.destroy();
                    multiPasteComponent = null;
                }
                return true;
            }
        });

        if (!dialogWindow) {
            return null;
        }

        multiPasteComponent = MultiPaste({
            entries: global.AppClipboard.getCopyHistory(),
            onCancel: function() {
                dialogWindow.close();
            },
            onPaste: function(entry) {
                var targetBoard = getActivePaintBoard();

                if (!targetBoard) {
                    return;
                }

                global.AppClipboard.pasteCopyHistoryEntry(targetBoard, entry.id).then(function(pasted) {
                    if (pasted) {
                        dialogWindow.close();
                    }
                }).catch(function(error) {
                    console.log("Multi Paste failed:", error);
                });
            }
        });
        dialogWindow.setContent(multiPasteComponent.element);
        return dialogWindow;
    }

    function openResizeImageWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("resize-image");
        var targetBoard = getActivePaintBoard();
        var dialogWindow;
        var dialog;
        var initialWidth = targetBoard && targetBoard.canvas ? targetBoard.canvas.width : 800;
        var initialHeight = targetBoard && targetBoard.canvas ? targetBoard.canvas.height : 600;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return existingWindow;
        }

        dialogWindow = ModalWindow({
            id: "resize-image-window",
            windowId: "resize-image",
            title: "Image Size",
            width: Math.max(560, Math.min(650, global.innerWidth - 40)),
            height: Math.max(470, Math.min(560, global.innerHeight - 40)),
            className: "wm-window-resize-image",
            beforeClose: function() {
                if (dialog) {
                    dialog.destroy();
                    dialog = null;
                }
                return true;
            }
        });

        if (!dialogWindow) {
            return null;
        }

        dialog = ResizeImage({
            width: initialWidth,
            height: initialHeight,
            onCancel: function() {
                dialogWindow.close();
            },
            onOk: function(options) {
                var board = getActivePaintBoard();

                if (board && typeof board.resizeTo === "function") {
                    board.resizeTo(options.width, options.height, {
                        resample: options.interpolationId || options.interpolation
                    });
                    refreshLayersPanel(board);
                    updatePaintBoardWindowTitle(board);
                }
                dialogWindow.close();
            }
        });

        dialogWindow.setContent(dialog.element);
        return dialogWindow;
    }

    function openPaintBoardWindow(options) {
        var config = options || {};
        var paintBoardWidth = config.width || 800;
        var paintBoardHeight = config.height || 600;
        var windowFrameWidth = 18;
        var windowFrameHeight = 66;
        var windowIndex = documentCount + 1;
        var paintBoard;
        var rules;
        var paintBoardWindow = WindowsManager.create({
            id: "demo-paint-board-window-" + windowIndex,
            title: "Paint Board " + windowIndex,
            windowGroupName: "paint-boards",
            maxGroupItems: 5,
            x: 225,
            y: 92,
            width: paintBoardWidth + windowFrameWidth,
            height: paintBoardHeight + windowFrameHeight,
            resizable: true,
            maximizable: true,
            topBarGradient: {
                a: "#123477",
                b: "#9bc8ef",
                orientation: "horizontal"
            },
            toolsRow: true,
            toolsFooter: true,
            scrollbars: true,
            contentId: "demo-paint-board-window-content-" + windowIndex,
            onResize: function() {
                updatePaintBoardZoomLayout(paintBoard);
            },
            beforeClose: function(currentWindow) {
                return confirmPaintBoardClose(paintBoard, currentWindow);
            }
        });

        if (!paintBoardWindow) {
            return null;
        }

        paintBoardWindow.element.className += " wm-window-paint-board";
        documentCount += 1;

        rules = BoardRules({
            id: "demo-paint-board-rules-" + windowIndex,
            containerId: paintBoardWindow.contentId,
            width: paintBoardWidth,
            height: paintBoardHeight,
            units: config.units || "px"
        });

        paintBoard = PaintBoard({
            id: "demo-paint-board-" + windowIndex,
            containerId: paintBoardWindow.contentId,
            width: paintBoardWidth,
            height: paintBoardHeight,
            backgroundColor: config.backgroundColor || "#ffffff",
            useLayers: true
        });
        paintBoard.rules = rules;
        rules.setBoardElement(paintBoard.element);
        paintBoard.window = paintBoardWindow;
        paintBoardWindow.baseTitle = paintBoardWindow.title;
        setActivePaintBoard(paintBoard);
        initPaintBoardToolbar(paintBoard);
        paintBoardWindow.scaleToContent(paintBoardWidth + rules.ruleSize, paintBoardHeight + rules.ruleSize);
        setActiveZoomBoard(paintBoard);
        updatePaintBoardWindowTitle(paintBoard);

        paintBoardWindow.element.addEventListener(
            typeof global.PointerEvent === "function" ? "pointerdown" : "mousedown",
            function() {
                setActivePaintBoard(paintBoard);
                setActiveZoomBoard(paintBoard);
                updatePaintBoardWindowTitle(paintBoard);
            }
        );

        return paintBoardWindow;
    }

    function updatePaintBoardZoomLayout(paintBoard) {
        if (!paintBoard || !paintBoard.element || !global.Zoom || !global.Zoom.updateBoardLayout) {
            return;
        }

        global.Zoom.updateBoardLayout(paintBoard.element);
    }

    function initPaintBoardToolbar(paintBoard) {
        var toolbar;
        var undoButton;
        var zoomOptions = [
            { label: "50%", zoom: 0.5 },
            { label: "Actual Size", zoom: 1, title: "100%" },
            { label: "200%", zoom: 2 },
            { label: "400%", zoom: 4 }
        ];

        if (!paintBoard || !paintBoard.window || !paintBoard.window.toolsRowElement) {
            return;
        }

        toolbar = document.createElement("div");
        toolbar.className = "wm-toolbar";

        undoButton = document.createElement("button");
        undoButton.type = "button";
        undoButton.className = "wm-toolbar-btn";
        undoButton.textContent = "Undo";
        undoButton.title = "Undo";
        undoButton.disabled = !paintBoard.canUndo || !paintBoard.canUndo();
        undoButton.addEventListener("click", function() {
            setActivePaintBoard(paintBoard);
            setActiveZoomBoard(paintBoard);

            if (paintBoard.undo && paintBoard.undo()) {
                updatePaintBoardToolbarState(paintBoard);
            }
        });
        toolbar.appendChild(undoButton);

        zoomOptions.forEach(function(option) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "wm-toolbar-btn";
            button.textContent = option.label;
            button.title = option.title || option.label;
            button.addEventListener("click", function() {
                setActivePaintBoard(paintBoard);
                setActiveZoomBoard(paintBoard);

                if (global.Zoom && global.Zoom.setBoardZoom) {
                    global.Zoom.setBoardZoom(paintBoard.element, option.zoom);
                }
            });

            toolbar.appendChild(button);
        });

        paintBoard.window.toolsRowElement.innerHTML = "";
        paintBoard.window.toolsRowElement.appendChild(toolbar);
        paintBoard.undoButton = undoButton;
        updatePaintBoardToolbarState(paintBoard);
    }

    function updatePaintBoardToolbarState(paintBoard) {
        if (!paintBoard) {
            return;
        }

        if (paintBoard.undoButton) {
            paintBoard.undoButton.disabled = !paintBoard.canUndo || !paintBoard.canUndo();
        }

    }

    function setActiveZoomBoard(paintBoard) {
        if (global.Zoom && global.Zoom.setActiveBoard) {
            global.Zoom.setActiveBoard(paintBoard.element);
        }
    }

    function setActivePaintBoard(paintBoard) {
        if (activePaintBoard === paintBoard) {
            updatePaintBoardWindowActivity();
            return;
        }

        activePaintBoard = paintBoard;
        updatePaintBoardWindowActivity();
        syncLayersPanelBoardSize(paintBoard);
        syncLayersPanelLayers(paintBoard);
        syncLayersPanelWindowTitle(paintBoard);
        notifyActivePaintBoardChange(paintBoard);
    }

    function updatePaintBoardWindowActivity() {
        var paintBoardWindows = document.querySelectorAll(".wm-window-paint-board");
        var activeWindowElement = activePaintBoard &&
            activePaintBoard.window &&
            activePaintBoard.window.element;
        var index;
        var windowElement;
        var isActive;

        for (index = 0; index < paintBoardWindows.length; index += 1) {
            windowElement = paintBoardWindows[index];
            isActive = windowElement === activeWindowElement;
            windowElement.classList.toggle(
                "wm-window-paint-board-inactive",
                !isActive
            );
            windowElement.setAttribute(
                "data-paint-board-active",
                isActive ? "true" : "false"
            );
        }
    }

    function syncLayersPanelBoardSize(paintBoard) {
        var width;
        var height;

        if (!paintBoard || !appLayersPanel) {
            return;
        }

        width = paintBoard.canvas ? paintBoard.canvas.width : paintBoard.width;
        height = paintBoard.canvas ? paintBoard.canvas.height : paintBoard.height;

        if (appLayersPanel.setThumbnailSourceSize) {
            appLayersPanel.setThumbnailSourceSize(width, height);
            return;
        }

        if (appLayersPanel.setBoardSize) {
            appLayersPanel.setBoardSize(width, height);
        }
    }

    function syncLayersPanelLayers(paintBoard) {
        var layers;

        if (!appLayersPanel || !appLayersPanel.setLayers) {
            return;
        }

        if (!paintBoard || !paintBoard.getLayers) {
            appLayersPanel.setLayers([]);
            updateLayersPanelFooterState(appLayersPanel);
            return;
        }

        layers = paintBoard.getLayers();
        appLayersPanel.setLayers(layers);
        updateLayersPanelFooterState(appLayersPanel);
        layers.forEach(function(layer) {
            updateLayersPanelThumbnail(paintBoard, layer.id);
        });
    }

    function refreshLayersPanel(paintBoard) {
        var targetBoard = paintBoard || activePaintBoard;

        syncLayersPanelBoardSize(targetBoard);
        syncLayersPanelLayers(targetBoard);
        syncLayersPanelWindowTitle(targetBoard);
    }

    function resizeLayersPanelThumbnailsTo(maxSize) {
        if (!appLayersPanel || !appLayersPanel.resizeThumbnailsTo) {
            return false;
        }

        return appLayersPanel.resizeThumbnailsTo(maxSize);
    }

    function updateLayersPanelThumbnail(paintBoard, layerId) {
        var layerElement;
        var canvas;

        if (!paintBoard ||
            paintBoard !== activePaintBoard ||
            !appLayersPanel ||
            !appLayersPanel.updateThumbnail ||
            !layerId) {
            return false;
        }

        layerElement = paintBoard.layersElement &&
            paintBoard.layersElement.querySelector('[data-layer="' + layerId + '"]');
        canvas = layerElement && layerElement.querySelector("canvas");

        if (!canvas) {
            return false;
        }

        return appLayersPanel.updateThumbnail(layerId, canvas, "board");
    }

    function syncLayersPanelWindowTitle(paintBoard) {
        var layersWindow = WindowsManager.getWindowByWindowId("layers-panel");
        var titleElement;
        var contextElement;
        var paintBoardTitle;

        if (!layersWindow || !layersWindow.element) {
            return;
        }

        paintBoardTitle = paintBoard && paintBoard.window ?
            (paintBoard.window.baseTitle || paintBoard.window.title) :
            "";
        layersWindow.setTitle(
            paintBoardTitle ? "Layers (" + paintBoardTitle + ")" : "Layers"
        );

        titleElement = layersWindow.element.querySelector(".wm-title");
        if (!titleElement || !paintBoardTitle) {
            return;
        }

        titleElement.textContent = "Layers ";
        contextElement = document.createElement("span");
        contextElement.className = "wm-title-context";
        contextElement.textContent = "(" + paintBoardTitle + ")";
        titleElement.appendChild(contextElement);
    }

    function notifyActivePaintBoardChange(paintBoard) {
        var event;
        var detail = {
            paintBoard: paintBoard
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-active-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-active-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function updatePaintBoardWindowTitle(paintBoard) {
        var zoom = 1;
        var title;

        if (!paintBoard || !paintBoard.window) {
            return;
        }

        if (paintBoard.element && paintBoard.element.getAttribute("data-zoom")) {
            zoom = parseFloat(paintBoard.element.getAttribute("data-zoom"));
        }

        if (isNaN(zoom)) {
            zoom = 1;
        }

        title = paintBoard.window.baseTitle + " - " + paintBoard.width + "x" + paintBoard.height + " - " + Math.round(zoom * 100) + "%";
        paintBoard.window.setTitle(title);
    }

    function confirmPaintBoardClose(paintBoard, paintBoardWindow) {
        if (!paintBoardWindow || paintBoardWindow.closeConfirmed) {
            clearActivePaintBoard(paintBoard);
            return true;
        }

        if (typeof global.ajsrConfirm !== "function") {
            return true;
        }

        global.ajsrConfirm({
            title: "Close Paint Board",
            message: "Discard this Paint Board? All unsaved data will be lost.",
            okButton: "Discard",
            cancelButton: "Cancel",
            btnFocus: 0,
            style: "z-index: 300001;",
            bgStyle: "z-index: 300000;",
            afterShow: function() {
                disableConfirmBackdropAction();
            },
            onConfirm: function() {
                closePaintBoardAfterConfirmation(paintBoard, paintBoardWindow);
            }
        });

        return false;
    }

    function disableConfirmBackdropAction() {
        var backdrop = document.getElementsByClassName("ajsrConfirm-back-bg")[0];

        if (!backdrop) {
            return;
        }

        backdrop.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
    }

    function closePaintBoardAfterConfirmation(paintBoard, paintBoardWindow) {
        paintBoardWindow.closeConfirmed = true;
        clearActivePaintBoard(paintBoard);
        paintBoardWindow.close();
    }

    function clearActivePaintBoard(paintBoard) {
        if (activePaintBoard === paintBoard) {
            setActivePaintBoard(null);
        }
    }

    function openBrushDesignerInWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("brush-designer");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return;
        }

        var brushDesignerWidth = 660;
        var brushDesignerHeight = 700;
        var windowFrameWidth = 16;
        var windowFrameHeight = 66;
        var outerWidth = brushDesignerWidth + windowFrameWidth;
        var outerHeight = brushDesignerHeight + windowFrameHeight;
        var x = Math.max(0, Math.round((global.innerWidth - outerWidth) / 2));
        var y = Math.max(0, Math.round((global.innerHeight - outerHeight) / 2));
        var bdWindow = WindowsManager.create({
            id: "brush-designer-window",
            windowId: "brush-designer",
            title: "Brush Designer",
            x: x,
            y: y,
            width: outerWidth,
            height: outerHeight,
            resizable: false,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "brush-designer-window-content"
        });

        be = $.brushEditor({
            showCloseButton: false,
            beforeClose: function() {
                global.renderBruses();
                WindowsManager.closeWindow("brush-designer-window");
            }
        });

        $(".be-back-bg").remove();
        $("#window-brush-editor").appendTo(bdWindow.contentElement);
        openBrushEditorOutputsWindow();
    }

    function openBrushDesigner2InWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("brush-designer-2");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appBrushDesigner2;
        }

        var brushDesignerWidth = 380;
        var brushDesignerHeight = 475;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var outerWidth = brushDesignerWidth + windowFrameWidth;
        var outerHeight = brushDesignerHeight + windowFrameHeight;
        var x = Math.max(0, Math.round((global.innerWidth - outerWidth) / 2));
        var y = Math.max(0, Math.round((global.innerHeight - outerHeight) / 2));
        var bdWindow = WindowsManager.create({
            id: "brush-designer-2-window",
            windowId: "brush-designer-2",
            title: "Brush Designer II",
            type: "TOOL",
            x: x,
            y: y,
            width: outerWidth,
            height: outerHeight,
            resizable: false,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "brush-designer-2-window-content"
        });

        appBrushDesigner2 = global.createBrushDesignerV2(bdWindow.contentElement, {
            algorithm: "C",
            onChange: function(brush, designer) {
                global.App.memory.currentBrushDesigner2 = brush;
                global.App.memory.currentDesignedBrush2 = designer.createBrushCanvas();
            }
        });

        return appBrushDesigner2;
    }

    function openRetroBrushDesignerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("retro-brush-designer");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appRetroBrushDesigner;
        }

        var designerWidth = 216;
        var designerHeight = 340;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var outerWidth = designerWidth + windowFrameWidth;
        var outerHeight = designerHeight + windowFrameHeight;
        var brush = global.App.memory.currentRetroBrush || {};
        var designerWindow = WindowsManager.create({
            id: "retro-brush-designer-window",
            windowId: "retro-brush-designer",
            title: "Retro Brush",
            type: "TOOL",
            x: 20,
            y: 385,
            width: outerWidth,
            height: outerHeight,
            resizable: false,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            topBarGradient: {
                a: "#00c7e8",
                b: "#2458c7",
                orientation: "horizontal"
            },
            contentId: "retro-brush-designer-window-content"
        });

        appRetroBrushDesigner = global.createRetroBrushDesigner(designerWindow.contentElement, {
            size: brush.size,
            pointSpacing: brush.pointSpacing,
            pointSize: brush.pointSize,
            onChange: function(retroBrush) {
                global.App.memory.currentRetroBrush = retroBrush;
            }
        });

        designerWindow.scaleToContent(appRetroBrushDesigner.options.width, appRetroBrushDesigner.options.height);

        return appRetroBrushDesigner;
    }

    function openPatternsViewWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("patterns-view");
        var viewWidth = 368;
        var viewHeight = 376;
        var windowFrameWidth = 16;
        var windowFrameHeight = 66;
        var patternsWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appPatternsView;
        }

        patternsWindow = WindowsManager.create({
            id: "patterns-view-window",
            windowId: "patterns-view",
            title: "Patterns",
            type: "TOOL",
            x: 260,
            y: 590,
            width: viewWidth + windowFrameWidth,
            height: viewHeight + windowFrameHeight,
            resizable: false,
            toolsRow: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "patterns-view-window-content"
        });

        appPatternsView = PatternsView({
            id: "app-patterns-view",
            containerId: patternsWindow.contentId,
            columns: 9,
            activePatternId: global.App.memory.currentPattern && global.App.memory.currentPattern.id,
            onSelect: function(pattern) {
                global.App.memory.currentPattern = pattern;
            }
        });

        initPatternsToolbar(patternsWindow, appPatternsView);
        patternsWindow.scaleToContent(appPatternsView.getWidth(), appPatternsView.getHeight());

        return appPatternsView;
    }

    function initPatternsToolbar(patternsWindow, patternsView) {
        var toolbar;
        var select;
        var useFrontColorLabel;
        var useFrontColorInput;
        var collections;

        if (!patternsWindow || !patternsWindow.toolsRowElement || !patternsView || !patternsView.getCollections) {
            return;
        }

        toolbar = document.createElement("div");
        toolbar.className = "wm-toolbar";
        select = document.createElement("select");
        select.className = "wm-toolbar-select";
        collections = patternsView.getCollections();

        collections.forEach(function(collection) {
            var option = document.createElement("option");

            option.value = collection.id;
            option.textContent = collection.collectionName || collection.name || collection.id;
            select.appendChild(option);
        });

        select.value = patternsView.options.collectionId;
        select.addEventListener("change", function() {
            patternsView.setCollection(select.value);
            patternsWindow.scaleToContent(patternsView.getWidth(), patternsView.getHeight());
        });

        useFrontColorLabel = document.createElement("label");
        useFrontColorLabel.className = "wm-toolbar-check";
        useFrontColorInput = document.createElement("input");
        useFrontColorInput.type = "checkbox";
        useFrontColorInput.checked = !!global.App.memory.currentPatternUseFrontColor;
        useFrontColorInput.addEventListener("change", function() {
            global.App.memory.currentPatternUseFrontColor = useFrontColorInput.checked;
        });

        useFrontColorLabel.appendChild(useFrontColorInput);
        useFrontColorLabel.appendChild(document.createTextNode("Use front color"));

        toolbar.appendChild(select);
        toolbar.appendChild(useFrontColorLabel);
        patternsWindow.toolsRowElement.innerHTML = "";
        patternsWindow.toolsRowElement.appendChild(toolbar);
    }

    function openGradientPanelWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("gradient-panel");
        var panelWidth = 236;
        var panelHeight = 292;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var gradientWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appGradientPanel;
        }

        gradientWindow = WindowsManager.create({
            id: "gradient-panel-window",
            windowId: "gradient-panel",
            title: "Gradient Panel",
            type: "TOOL",
            x: 260,
            y: 390,
            width: panelWidth + windowFrameWidth,
            height: panelHeight + windowFrameHeight,
            resizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "gradient-panel-window-content"
        });

        appGradientPanel = GradientPanel({
            id: "app-gradient-panel",
            containerId: gradientWindow.contentId,
            type: (global.App.memory.currentGradient && global.App.memory.currentGradient.type) || "linear",
            bounded: !!(global.App.memory.currentGradient && global.App.memory.currentGradient.bounded),
            retro: !!(global.App.memory.currentGradient && global.App.memory.currentGradient.retro),
            ditheringMethod: (global.App.memory.currentGradient && global.App.memory.currentGradient.ditheringMethod) || "ordered-bayer-8x8",
            ditheringOptions: global.App.memory.currentGradient && global.App.memory.currentGradient.ditheringOptions,
            fromColor: "#000000",
            toColor: "#ffffff",
            onChange: function(gradient) {
                global.App.memory.currentGradient = gradient;
            }
        });
        global.App.memory.currentGradient = appGradientPanel.getGradient();

        gradientWindow.scaleToContent(appGradientPanel.getWidth(), appGradientPanel.getHeight());

        return appGradientPanel;
    }

    function openBrushEditorOutputsWindow(options) {
        var config = options || {};
        var existingWindow = WindowsManager.getWindowByWindowId("brush-editor-outputs");
        var outputsWidth = 200;
        var outputsHeight = 700;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var outerWidth = outputsWidth + windowFrameWidth;
        var outerHeight = outputsHeight + windowFrameHeight;
        var x = Math.max(0, global.innerWidth - outerWidth - 20);
        var y = 92;
        var outputsWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            if (config.selectFirstIfNone && global.brushEditorOutputs && typeof global.brushEditorOutputs.selectFirstIfNone === "function") {
                global.brushEditorOutputs.selectFirstIfNone();
            }
            return existingWindow;
        }

        outputsWindow = WindowsManager.create({
            id: "brush-editor-outputs-window",
            windowId: "brush-editor-outputs",
            title: "Brush outputs",
            type: "TOOL",
            x: x,
            y: y,
            width: outerWidth,
            height: outerHeight,
            minWidth: windowFrameWidth + 100,
            minHeight: windowFrameHeight + 100,
            resizable: true,
            resizeContentStep: 100,
            toolsRow: true,
            contentCentered: false,
            topBarGradient: {
                a: "#2563eb",
                b: "#14b8a6",
                orientation: "vertical"
            },
            scrollBarX: false,
            scrollBarY: true,
            contentId: "brush-editor-outputs-window-content"
        });

        global.BrushEditorOutputs({
            containerId: outputsWindow.contentId,
            toolbarElement: outputsWindow.toolsRowElement,
            selectFirstOnReady: !!config.selectFirstIfNone,
            shouldSelectFirst: function() {
                return !(global.App && global.App.memory && global.App.memory.currentDesignedBrush);
            },
            onSizeChange: function(size) {
                outputsWindow.scaleToContent(outputsWindow.contentElement.clientWidth, size.height);
            },
            onCreateBrush: function() {
                openBrushDesignerInWindow();
            },
            onSelect: function(image) {
                global.App.memory.currentDesignedBrush = image;

                if (global.PaintTools) {
                    global.PaintTools.use("DESIGNED-BRUSH");
                }
            }
        });
    }

    function openSimpleColorPickerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("simple-color-picker");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appColorPicker;
        }

        var pickerWidth = 360;
        var pickerHeight = 220;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var pickerWindow = WindowsManager.create({
            id: "simple-color-picker-window",
            windowId: "simple-color-picker",
            title: "Simple Color Picker",
            type: "TOOL",
            x: Math.max(0, global.innerWidth - 286),
            y: 468,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 120,
            //minHeight: 120,
            resizable: true,
            cornerRadius: 100,
            topBarGradient: {
                a: "#2563eb",
                b: "#14b8a6",
                orientation: "horizontal"
            },
            scrollBarX: false,
            scrollBarY: false,
            contentId: "simple-color-picker-window-content",
            onResize: function(width, height) {
                if (appColorPicker && appColorPicker.resizeTo) {
                    appColorPicker.resizeTo(width, height);
                }
            },
            onResizeEnd: function(width, height, currentWindow) {
                var size;

                if (appColorPicker && appColorPicker.getSize) {
                    size = appColorPicker.getSize();
                    currentWindow.scaleToContent(size.width, size.height);
                }
            }
        });

        appColorPicker = SimpleColorPicker({
            id: "app-simple-color-picker",
            containerId: pickerWindow.contentId,
            columns: 15,
            rows: 10,
            colorGap: 0,
            activeColor: global.App.memory.currentColor,
            padding: {
                top: 10,
                right: 2,
                bottom: 2,
                left: 2
            },
            resizePolicy: "EXPAND",
            onColorSelected: function(color) {
                setActiveColor(color);
            },
            color: {
                defaultWidth: 17,
                defaultHeight: 17
            }
        });

        pickerWindow.scaleToContent(appColorPicker.getWidth(), appColorPicker.getHeight());

        return appColorPicker;
    }

    function openBigColorPickerWindow(initialColor, target) {
        var existingWindow = WindowsManager.getWindowByWindowId("big-color-picker");
        var openingColor = initialColor || global.App.memory.currentColor;

        appBigColorPickerTarget = (target === "background" || target === "fill") ? target : "front";

        if (existingWindow) {
            if (appBigColorPicker && appBigColorPicker.setActiveColor) {
                appBigColorPicker.setActiveColor(openingColor);
            }
            WindowsManager.bringToFront(existingWindow);
            return appBigColorPicker;
        }

        var pickerWidth = 488;
        var pickerHeight = 338;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var pickerWindow = WindowsManager.create({
            id: "big-color-picker-window",
            windowId: "big-color-picker",
            title: "Big Color Picker",
            type: "TOOL",
            x: 260,
            y: 40,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 420,
            minHeight: 350,
            resizable: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "big-color-picker-window-content",
            beforeClose: function() {
                appBigColorPickerWindow = null;
                appBigColorPickerTarget = "front";
                if (appBigColorPicker) {
                    appBigColorPicker.destroy();
                    appBigColorPicker = null;
                }
                return true;
            }
        });
        appBigColorPickerWindow = pickerWindow;

        appBigColorPicker = BigColorPicker({
            id: "app-big-color-picker",
            containerId: pickerWindow.contentId,
            width: pickerWidth,
            height: pickerHeight,
            activeColor: openingColor,
            onAccept: function(color) {
                applyBigColorPickerColor(color);
                if (appBigColorPickerWindow) {
                    appBigColorPickerWindow.close();
                }
            },
            onApply: function(color) {
                applyBigColorPickerColor(color);
            },
            onCancel: function() {
                if (appBigColorPickerWindow) {
                    appBigColorPickerWindow.close();
                }
            }
        });

        pickerWindow.scaleToContent(appBigColorPicker.getWidth(), appBigColorPicker.getHeight());

        return appBigColorPicker;
    }

    function applyBigColorPickerColor(color) {
        if (appBigColorPickerTarget === "background") {
            if (global.ForegroundBackgroundColorsApi &&
                global.ForegroundBackgroundColorsApi.setBackgroundColor) {
                global.ForegroundBackgroundColorsApi.setBackgroundColor(color);
            }
            return;
        }

        if (appBigColorPickerTarget === "fill") {
            if (typeof global.fillActiveLayerOrSelectionWithColor === "function") {
                global.fillActiveLayerOrSelectionWithColor(color);
            }
            return;
        }

        setActiveColor(color);
    }

    function openSimpleLineWidthPickerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("simple-line-width-picker");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appLineWidthPicker;
        }

        var pickerWidth = 120;
        var pickerHeight = 360;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var pickerWindow = WindowsManager.create({
            id: "simple-line-width-picker-window",
            windowId: "simple-line-width-picker",
            title: "Line Width",
            type: "TOOL",
            x: 5,
            y: 92,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 90,
            minimizable: false,
            resizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "simple-line-width-picker-window-content"
        });

        appLineWidthPicker = SimpleLineWidthPicker({
            id: "app-simple-line-width-picker",
            containerId: pickerWindow.contentId,
            minWidth: 1,
            maxWidth: 27,
            steps: 16,
            activeLineWidth: global.App.memory.currentLineWidth,
            onLineWidthSelected: function(lineWidth, picker, eventMeta) {
                global.App.memory.currentLineWidth = lineWidth;
                syncLinesDesignerFromLineWidth(lineWidth);
                if (!eventMeta || eventMeta.source !== "init") {
                    global.PaintTools.use("STRAIGHT-LINE");
                }
                console.log("Selected line width:", lineWidth);
            }
        });

        pickerWindow.scaleToContent(appLineWidthPicker.getWidth(), appLineWidthPicker.getHeight());

        return appLineWidthPicker;
    }

    function openSimpleBrushWidthPickerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("simple-brush-width-picker");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appBrushWidthPicker;
        }

        var pickerWidth = 120;
        var pickerHeight = 404;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var pickerWindow = WindowsManager.create({
            id: "simple-brush-width-picker-window",
            windowId: "simple-brush-width-picker",
            title: "Brush Width",
            type: "TOOL",
            x: 115,
            y: 92,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 90,
            minimizable: false,
            resizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "simple-brush-width-picker-window-content"
        });

        appBrushWidthPicker = SimpleBrushWidthPicker({
            id: "app-simple-brush-width-picker",
            containerId: pickerWindow.contentId,
            minWidth: 1,
            maxWidth: 27,
            steps: 16,
            activeBrushWidth: global.App.memory.currentBrushWidth,
            brushShape: global.App.memory.currentBrushShape,
            brushStroke: global.App.memory.currentBrushStroke,
            brushAntialiasing: global.App.memory.currentBrushAntialiasing,
            onBrushWidthSelected: function(brushWidth, picker, eventMeta) {
                global.App.memory.currentBrushWidth = brushWidth;
                if ((!eventMeta || eventMeta.source !== "init") && !isBrushWidthPaintToolSelected()) {
                    global.PaintTools.use("ROUND-LINES");
                }
                console.log("Selected brush width:", brushWidth);
            },
            onBrushStrokeChange: function(brushStroke) {
                global.App.memory.currentBrushStroke = brushStroke;
                console.log("Selected brush stroke:", brushStroke);
            },
            onBrushAntialiasingChange: function(brushAntialiasing) {
                global.App.memory.currentBrushAntialiasing = brushAntialiasing;
                console.log("Selected brush antialiasing:", brushAntialiasing);
            }
        });

        pickerWindow.scaleToContent(appBrushWidthPicker.getWidth(), appBrushWidthPicker.getHeight());

        return appBrushWidthPicker;
    }

    function isBrushWidthPaintToolSelected() {
        var mode = global.PaintTools && global.PaintTools.getMode ? global.PaintTools.getMode() : null;

        return mode === "SQUARED-POINTS" ||
            mode === "ROUND-POINTS" ||
            mode === "SQUARED-LINES" ||
            mode === "ROUND-LINES";
    }

    function openLinesDesignerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("lines-designer");
        var panelWidth = 310;
        var panelHeight = 469;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var designerWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appLinesDesigner;
        }

        designerWindow = WindowsManager.create({
            id: "lines-designer-window",
            windowId: "lines-designer",
            title: "Lines Designer",
            type: "TOOL",
            x: 160,
            y: 300,
            width: panelWidth + windowFrameWidth,
            height: panelHeight + windowFrameHeight,
            resizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "lines-designer-window-content"
        });

        appLinesDesigner = LinesDesigner({
            id: "app-lines-designer",
            containerId: designerWindow.contentId,
            width: panelWidth,
            height: panelHeight,
            current: global.App.memory.currentLineDesign,
            onChange: function(lineDesign) {
                lineDesign.active = true;
                global.App.memory.currentLineDesign = lineDesign;
                global.App.memory.currentLineWidth = lineDesign.weight;
                syncSimpleLineWidthPickerFromLineWidth(lineDesign.weight);
                console.log("Selected line design:", lineDesign);
            }
        });

        designerWindow.scaleToContent(appLinesDesigner.getWidth(), appLinesDesigner.getHeight());

        return appLinesDesigner;
    }

    function normalizeConsoleLineWidth(lineWidth) {
        var value = Math.round(parseFloat(lineWidth));

        if (isNaN(value)) {
            throw new Error("Line width must be a number.");
        }

        return Math.max(1, Math.min(value, 200));
    }

    function setSimpleLineWidthPickerWidth(lineWidth) {
        var value = normalizeConsoleLineWidth(lineWidth);

        global.App.memory.currentLineWidth = value;
        syncSimpleLineWidthPickerFromLineWidth(value);
        syncLinesDesignerFromLineWidth(value);

        return value;
    }

    function setSimpleBrushWidthPickerStroke(brushStroke) {
        var value = !!brushStroke;

        global.App.memory.currentBrushStroke = value;

        if (appBrushWidthPicker && appBrushWidthPicker.setBrushStroke) {
            appBrushWidthPicker.setBrushStroke(value);
        }

        return value;
    }

    function setSimpleBrushWidthPickerAntialiasing(brushAntialiasing) {
        var value = !!brushAntialiasing;

        global.App.memory.currentBrushAntialiasing = value;

        if (appBrushWidthPicker && appBrushWidthPicker.setBrushAntialiasing) {
            appBrushWidthPicker.setBrushAntialiasing(value);
        }

        return value;
    }

    function setLinesDesignerWidth(lineWidth) {
        var value = normalizeConsoleLineWidth(lineWidth);
        var lineDesign = extend(extend({}, global.App.memory.currentLineDesign || {}), {
            weight: value,
            active: true
        });

        global.App.memory.currentLineWidth = value;
        global.App.memory.currentLineDesign = lineDesign;
        syncLinesDesignerFromLineDesign(lineDesign);
        syncSimpleLineWidthPickerFromLineWidth(value);

        return value;
    }

    function syncSimpleLineWidthPickerFromLineWidth(lineWidth) {
        var value = normalizeConsoleLineWidth(lineWidth);

        if (syncingLineWidthComponents) {
            return;
        }

        if (!appLineWidthPicker || !appLineWidthPicker.setActiveLineWidth) {
            return;
        }

        syncingLineWidthComponents = true;

        try {
            appLineWidthPicker.setActiveLineWidth(value);
        } finally {
            syncingLineWidthComponents = false;
        }
    }

    function syncLinesDesignerFromLineWidth(lineWidth) {
        var value = normalizeConsoleLineWidth(lineWidth);
        var lineDesign = extend(extend({}, global.App.memory.currentLineDesign || {}), {
            weight: value,
            active: true
        });

        global.App.memory.currentLineDesign = lineDesign;
        syncLinesDesignerFromLineDesign(lineDesign);
    }

    function syncLinesDesignerFromLineDesign(lineDesign) {
        if (syncingLineWidthComponents) {
            return;
        }

        if (!appLinesDesigner || !appLinesDesigner.setLine) {
            return;
        }

        syncingLineWidthComponents = true;

        try {
            appLinesDesigner.setLine(lineDesign);
        } finally {
            syncingLineWidthComponents = false;
        }
    }

    function getSimpleLineWidthPickerApi() {
        return {
            open: openSimpleLineWidthPickerWindow,
            getInstance: function() {
                return appLineWidthPicker;
            },
            setLineWidth: setSimpleLineWidthPickerWidth,
            getLineWidth: function() {
                return appLineWidthPicker && appLineWidthPicker.getActiveLineWidth ? appLineWidthPicker.getActiveLineWidth() : global.App.memory.currentLineWidth;
            }
        };
    }

    function getSimpleColorPickerApi() {
        return {
            open: openSimpleColorPickerWindow,
            getInstance: function() {
                return appColorPicker;
            },
            getActiveColor: function() {
                return appColorPicker && appColorPicker.getActiveColor ? appColorPicker.getActiveColor() : global.App.memory.currentColor;
            },
            getNextColorRight: function(options) {
                return appColorPicker && appColorPicker.getNextColorRight ? appColorPicker.getNextColorRight(options) : null;
            },
            getNextColorDown: function(options) {
                return appColorPicker && appColorPicker.getNextColorDown ? appColorPicker.getNextColorDown(options) : null;
            }
        };
    }

    function setSimpleBrushWidthPickerWidth(brushWidth) {
        var value = normalizeConsoleLineWidth(brushWidth);

        global.App.memory.currentBrushWidth = value;

        if (appBrushWidthPicker && appBrushWidthPicker.setActiveBrushWidth) {
            appBrushWidthPicker.setActiveBrushWidth(value);
        }

        return value;
    }

    function setSimpleBrushWidthPickerShape(brushShape) {
        var value = brushShape === "square" ? "square" : "circle";

        global.App.memory.currentBrushShape = value;

        if (appBrushWidthPicker && appBrushWidthPicker.setBrushShape) {
            appBrushWidthPicker.setBrushShape(value);
        }

        return value;
    }

    function getSimpleBrushWidthPickerApi() {
        return {
            open: openSimpleBrushWidthPickerWindow,
            getInstance: function() {
                return appBrushWidthPicker;
            },
            setBrushWidth: setSimpleBrushWidthPickerWidth,
            getBrushWidth: function() {
                return appBrushWidthPicker && appBrushWidthPicker.getActiveBrushWidth ? appBrushWidthPicker.getActiveBrushWidth() : global.App.memory.currentBrushWidth;
            },
            setBrushShape: setSimpleBrushWidthPickerShape,
            getBrushShape: function() {
                return appBrushWidthPicker && appBrushWidthPicker.getBrushShape ? appBrushWidthPicker.getBrushShape() : global.App.memory.currentBrushShape;
            },
            setBrushStroke: setSimpleBrushWidthPickerStroke,
            getBrushStroke: function() {
                return appBrushWidthPicker && appBrushWidthPicker.getBrushStroke ? appBrushWidthPicker.getBrushStroke() : global.App.memory.currentBrushStroke;
            },
            setBrushAntialiasing: setSimpleBrushWidthPickerAntialiasing,
            getBrushAntialiasing: function() {
                return appBrushWidthPicker && appBrushWidthPicker.getBrushAntialiasing ? appBrushWidthPicker.getBrushAntialiasing() : global.App.memory.currentBrushAntialiasing;
            }
        };
    }

    function getLinesDesignerApi() {
        return {
            open: openLinesDesignerWindow,
            getInstance: function() {
                return appLinesDesigner;
            },
            setLineWidth: setLinesDesignerWidth,
            getLineWidth: function() {
                var lineDesign = global.App.memory.currentLineDesign || {};

                return lineDesign.weight || global.App.memory.currentLineWidth;
            }
        };
    }

    function openPaintToolsWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("paint-tools");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appPaintTools;
        }

        var btnSize = 75;
        var rows = 2;
        var toolsCount = getPaintToolsCount();
        var columns = Math.max(1, Math.ceil(toolsCount / rows));
        var toolsWidth = columns * btnSize;
        var toolsHeight = rows * btnSize;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var toolsWindowY = Math.max(92, global.innerHeight - toolsHeight - windowFrameHeight - 6);
        var toolsWindow = WindowsManager.create({
            id: "paint-tools-window",
            windowId: "paint-tools",
            title: "Paint Tools",
            type: "TOOL",
            x: 6,
            y: toolsWindowY,
            width: toolsWidth + windowFrameWidth,
            height: toolsHeight + windowFrameHeight,
            resizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "paint-tools-window-content"
        });

        appPaintTools = PaintToolsComponent({
            id: "app-paint-tools",
            containerId: toolsWindow.contentId,
            btnSize: btnSize,
            rows: rows,
            tools: VISIBLE_PAINT_TOOLS.slice()
        });

        toolsWindow.scaleToContent(appPaintTools.getWidth(), appPaintTools.getHeight());

        return appPaintTools;
    }

    function openLayersPanelWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("layers-panel");
        var panelWidth = 320;
        var panelHeight = 420;
        var frameWidth = 16;
        var frameHeight = 36;
        var layersWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            syncLayersPanelWindowTitle(activePaintBoard);
            return appLayersPanel;
        }

        layersWindow = WindowsManager.create({
            id: "layers-panel-window",
            windowId: "layers-panel",
            title: "Layers",
            type: "TOOL",
            x: Math.max(20, global.innerWidth - panelWidth - frameWidth - 20),
            y: 92,
            width: panelWidth + frameWidth,
            height: panelHeight + frameHeight,
            minWidth: 250,
            minHeight: 260,
            resizable: true,
            topBarGradient: {
                a: "#123477",
                b: "#9bc8ef",
                orientation: "horizontal"
            },
            toolsRow: true,
            toolsFooter: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "layers-panel-window-content",
            onResize: function(width, height) {
                if (appLayersPanel) {
                    appLayersPanel.element.style.width = width + "px";
                    appLayersPanel.element.style.height = height + "px";
                }
            },
            beforeClose: function() {
                if (appLayersPanel) {
                    appLayersPanel.destroy();
                    appLayersPanel = null;
                }
                return true;
            }
        });

        appLayersPanel = LayersPanel({
            id: "app-layers-panel",
            containerId: layersWindow.contentId,
            width: panelWidth,
            height: panelHeight,
            boardWidth: activePaintBoard && activePaintBoard.canvas ?
                activePaintBoard.canvas.width : 800,
            boardHeight: activePaintBoard && activePaintBoard.canvas ?
                activePaintBoard.canvas.height : 600,
            onActiveLayerChange: function(layer) {
                updateLayersPanelFooterState(appLayersPanel);
            },
            onSelectionChange: function(layers, activeLayer) {
                if (activePaintBoard &&
                    activePaintBoard.setLayerSelection &&
                    activeLayer) {
                    activePaintBoard.setLayerSelection(
                        layers.map(function(layer) {
                            return layer.id;
                        }),
                        activeLayer.id
                    );
                }
                updateLayersPanelFooterState(appLayersPanel);
            },
            onLayerVisibilityChange: function(layer, visible) {
                if (activePaintBoard && activePaintBoard.setLayerVisibility && layer) {
                    activePaintBoard.setLayerVisibility(layer.id, visible);
                }
            },
            onLayerBlockedChange: function(layer, blocked) {
                if (activePaintBoard && activePaintBoard.setLayerBlocked && layer) {
                    activePaintBoard.setLayerBlocked(layer.id, blocked);
                }
            },
            onLayerMaskChange: function(layer, mask) {
                if (activePaintBoard && activePaintBoard.setLayerMask && layer) {
                    activePaintBoard.setLayerMask(layer.id, mask);
                }
            },
            onLayerOpacityChange: function(layer, opacity) {
                if (activePaintBoard && activePaintBoard.setLayerOpacity && layer) {
                    activePaintBoard.setLayerOpacity(layer.id, opacity);
                }
            },
            onLayersReorder: function(layers) {
                if (activePaintBoard && activePaintBoard.setLayersOrder) {
                    activePaintBoard.setLayersOrder(layers);
                }
            }
        });
        layersWindow.scaleToContent(appLayersPanel.getWidth(), appLayersPanel.getHeight());
        renderLayersPanelToolsRow(layersWindow.toolsRowElement, appLayersPanel);
        renderLayersPanelFooter(layersWindow.toolsFooterElement, appLayersPanel);
        syncLayersPanelLayers(activePaintBoard);
        syncLayersPanelWindowTitle(activePaintBoard);
        return appLayersPanel;
    }

    function renderLayersPanelToolsRow(toolsRowElement, layersPanel) {
        var blockButton;
        var opacityRange;
        var opacityValue;

        if (!toolsRowElement || !layersPanel) {
            return;
        }

        toolsRowElement.innerHTML = [
            '<div class="layers-panel-tools-row">',
                '<button class="layers-panel-toolbar-btn layers-panel-block-btn" type="button" title="Block layer" aria-label="Block layer">Block</button>',
                '<label class="layers-panel-opacity-control" for="layers-panel-opacity-range">Opacity</label>',
                '<input id="layers-panel-opacity-range" class="layers-panel-opacity-range" type="range" min="0" max="100" step="1" value="100" aria-label="Layer opacity">',
                '<span class="layers-panel-opacity-value">100%</span>',
            '</div>'
        ].join("");

        blockButton = toolsRowElement.querySelector(".layers-panel-block-btn");
        opacityRange = toolsRowElement.querySelector(".layers-panel-opacity-range");
        opacityValue = toolsRowElement.querySelector(".layers-panel-opacity-value");

        function syncOpacityValueLabel() {
            var value = parseInt(opacityRange.value, 10);

            if (!opacityValue) {
                return;
            }

            if (isNaN(value)) {
                value = 100;
            }
            opacityValue.textContent = value + "%";
        }

        blockButton.addEventListener("click", function() {
            if (layersPanel.toggleActiveLayerBlocked()) {
                updateLayersPanelFooterState(layersPanel);
            }
        });
        opacityRange.addEventListener("input", function() {
            var value = parseInt(opacityRange.value, 10);

            if (isNaN(value)) {
                return;
            }

            if (layersPanel.setActiveLayerOpacity) {
                layersPanel.setActiveLayerOpacity(value);
            }
            syncOpacityValueLabel();
            updateLayersPanelFooterState(layersPanel);
        });
        opacityRange.addEventListener("change", syncOpacityValueLabel);
        syncOpacityValueLabel();
        updateLayersPanelFooterState(layersPanel);
    }

    function renderLayersPanelFooter(footerElement, layersPanel) {
        var addButton;
        var removeButton;
        var addMaskButton;
        var removeMaskButton;

        if (!footerElement || !layersPanel) {
            return;
        }

        footerElement.innerHTML = [
            '<div class="layers-panel-footer-row">',
                '<button class="layers-panel-footer-btn layers-panel-add-btn" type="button" title="Add layer" aria-label="Add layer">+</button>',
                '<button class="layers-panel-footer-btn layers-panel-remove-btn" type="button" title="Remove layer" aria-label="Remove layer">\u2212</button>',
            '</div>',
            '<div class="layers-panel-footer-row">',
                '<button class="layers-panel-footer-btn layers-panel-add-mask-btn" type="button" title="Add mask" aria-label="Add mask">Add Mask</button>',
                '<button class="layers-panel-footer-btn layers-panel-remove-mask-btn" type="button" title="Remove mask" aria-label="Remove mask">Remove Mask</button>',
            '</div>'
        ].join("");

        addButton = footerElement.querySelector(".layers-panel-add-btn");
        removeButton = footerElement.querySelector(".layers-panel-remove-btn");
        addMaskButton = footerElement.querySelector(".layers-panel-add-mask-btn");
        removeMaskButton = footerElement.querySelector(".layers-panel-remove-mask-btn");

        addButton.addEventListener("click", function() {
            if (activePaintBoard && activePaintBoard.addLayer) {
                activePaintBoard.addLayer();
                syncLayersPanelLayers(activePaintBoard);
                updateLayersPanelFooterState(layersPanel);
                return;
            }

            layersPanel.addLayer();
        });
        removeButton.addEventListener("click", function() {
            if (activePaintBoard && activePaintBoard.removeLayers) {
                if (activePaintBoard.removeLayers(layersPanel.getSelectedLayerIds())) {
                    syncLayersPanelLayers(activePaintBoard);
                    updateLayersPanelFooterState(layersPanel);
                }
                return;
            }

            layersPanel.removeActiveLayer();
        });
        addMaskButton.addEventListener("click", function() {
            layersPanel.addMaskToActiveLayer();
            updateLayersPanelFooterState(layersPanel);
        });
        removeMaskButton.addEventListener("click", function() {
            layersPanel.removeMaskFromActiveLayer();
            updateLayersPanelFooterState(layersPanel);
        });
        updateLayersPanelFooterState(layersPanel);
    }

    function updateLayersPanelFooterState(layersPanel) {
        var footerElement;
        var removeButton;
        var addMaskButton;
        var removeMaskButton;
        var blockButton;
        var opacityRange;
        var opacityValue;
        var activeLayer;
        var selectedLayers;
        var removableSelectedCount;
        var hasMask;
        var layers;
        var activeOpacity;

        if (!layersPanel || !layersPanel.element) {
            return;
        }

        footerElement = layersPanel.element.closest(".wm-window");
        removeButton = footerElement &&
            footerElement.querySelector(".layers-panel-remove-btn");
        addMaskButton = footerElement &&
            footerElement.querySelector(".layers-panel-add-mask-btn");
        removeMaskButton = footerElement &&
            footerElement.querySelector(".layers-panel-remove-mask-btn");
        blockButton = footerElement &&
            footerElement.querySelector(".layers-panel-block-btn");
        opacityRange = footerElement &&
            footerElement.querySelector(".layers-panel-opacity-range");
        opacityValue = footerElement &&
            footerElement.querySelector(".layers-panel-opacity-value");
        activeLayer = layersPanel.getActiveLayer && layersPanel.getActiveLayer();
        selectedLayers = layersPanel.getSelectedLayers ?
            layersPanel.getSelectedLayers() :
            [];
        layers = layersPanel.getLayers ? layersPanel.getLayers() : [];
        hasMask = !!(activeLayer && activeLayer.mask);
        activeOpacity = Math.round(Number(activeLayer && activeLayer.opacity));
        if (isNaN(activeOpacity)) {
            activeOpacity = 100;
        }
        if (activeOpacity < 0) {
            activeOpacity = 0;
        }
        if (activeOpacity > 100) {
            activeOpacity = 100;
        }
        removableSelectedCount = selectedLayers.filter(function(layer) {
            return !layer.blocked || layer.background;
        }).length;

        if (removeButton) {
            removeButton.disabled = !removableSelectedCount ||
                layers.length <= 1;
            removeButton.setAttribute(
                "aria-disabled",
                removeButton.disabled ? "true" : "false"
            );
        }
        if (blockButton) {
            blockButton.disabled = !activeLayer || !!activeLayer.background;
            blockButton.setAttribute(
                "aria-disabled",
                blockButton.disabled ? "true" : "false"
            );
        }
        if (addMaskButton) {
            addMaskButton.disabled = !activeLayer ||
                !!activeLayer.background ||
                hasMask;
            addMaskButton.setAttribute(
                "aria-disabled",
                addMaskButton.disabled ? "true" : "false"
            );
        }
        if (removeMaskButton) {
            removeMaskButton.disabled = !hasMask;
            removeMaskButton.setAttribute(
                "aria-disabled",
                removeMaskButton.disabled ? "true" : "false"
            );
        }
        if (opacityRange) {
            opacityRange.disabled = !activeLayer;
            opacityRange.value = String(activeOpacity);
            opacityRange.setAttribute(
                "aria-disabled",
                opacityRange.disabled ? "true" : "false"
            );
        }
        if (opacityValue) {
            opacityValue.textContent = activeOpacity + "%";
        }
    }

    function openStarGeneratorWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("star-generator");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appStarGenerator;
        }

        var generatorWidth = 420;
        var generatorHeight = 560;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var generatorWindow = WindowsManager.create({
            id: "star-generator-window",
            windowId: "star-generator",
            title: "Star",
            type: "TOOL",
            x: 280,
            y: 120,
            width: generatorWidth + windowFrameWidth,
            height: generatorHeight + windowFrameHeight,
            resizable: false,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "star-generator-window-content"
        });

        generatorWindow.element.className += " wm-window-star-generator";
        appStarGenerator = StarGenerator({
            id: "app-star-generator",
            containerId: generatorWindow.contentId,
            width: generatorWidth,
            height: generatorHeight,
            current: global.App.memory.currentStar,
            onChange: function(current) {
                global.App.memory.currentStar = current;
            },
            onCancel: function() {
                generatorWindow.close();
            },
            onGenerate: function(result) {
                global.App.memory.currentStar = result.current;
                global.App.memory.currentDesignedBrush = result.image;

                if (global.PaintTools) {
                    global.PaintTools.use("DESIGNED-BRUSH");
                }

                generatorWindow.close();
            }
        });

        generatorWindow.scaleToContent(appStarGenerator.getWidth(), appStarGenerator.getHeight());

        return appStarGenerator;
    }

    function openSvgExporterWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("svg-exporter");
        var exporterWidth = 900;
        var exporterHeight = 560;
        var frameWidth = 16;
        var frameHeight = 36;
        var exporterWindow;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appSvgExporter;
        }

        exporterWindow = WindowsManager.create({
            id: "svg-exporter-window",
            windowId: "svg-exporter",
            title: "SVG Exporter",
            titleBarIcon: {
                imageSrc: svgExporterIconUrl,
                alt: "SVG Exporter"
            },
            topBarGradient: {
                a: "#123477",
                b: "#9bc8ef",
                orientation: "horizontal"
            },
            type: "TOOL",
            x: 260,
            y: 110,
            width: exporterWidth + frameWidth,
            height: exporterHeight + frameHeight,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "svg-exporter-window-content",
            beforeClose: function() {
                if (appSvgExporter && appSvgExporter.destroy) {
                    appSvgExporter.destroy();
                }
                appSvgExporter = null;
                return true;
            }
        });

        exporterWindow.element.className += " wm-window-svg-exporter";

        appSvgExporter = SVGExporter({
            id: "app-svg-exporter",
            containerId: exporterWindow.contentId,
            width: exporterWidth,
            height: exporterHeight,
            onExportToLayer: function(payload) {
                var targetBoard = getActivePaintBoard();
                var newLayer;

                if (!targetBoard || !targetBoard.addLayer || !targetBoard.drawImage) {
                    notifyMessage("Open a paint board first.", "error");
                    return false;
                }

                if (targetBoard.floatingPaste && targetBoard.commitFloatingPaste) {
                    targetBoard.commitFloatingPaste();
                }

                newLayer = targetBoard.addLayer({
                    label: "SVG Layer"
                });
                if (newLayer && targetBoard.setActiveLayer) {
                    targetBoard.setActiveLayer(newLayer.id);
                }

                targetBoard.drawImage(payload.canvas, 0, 0);
                refreshLayersPanel(targetBoard);
                notifyMessage("SVG added as a new layer.", "success");
                return true;
            }
        });

        exporterWindow.scaleToContent(appSvgExporter.getWidth(), appSvgExporter.getHeight());
        return appSvgExporter;
    }

    function notifyMessage(message, type) {
        if (typeof global.ajsrnotify !== "function") {
            return;
        }

        global.ajsrnotify({
            msg: message,
            type: type || "success",
            position: "right",
            timeout: 1800
        });
    }

    function getPaintToolsCount() {
        return VISIBLE_PAINT_TOOLS.length;
    }

    function getActivePaintBoard() {
        return activePaintBoard;
    }

    function clearBoard() {
        if (!activePaintBoard) {
            return;
        }

        activePaintBoard.clear();
    }

    function flattenImage() {
        if (!activePaintBoard || !activePaintBoard.flattenImage) {
            return false;
        }

        if (!activePaintBoard.flattenImage()) {
            return false;
        }

        syncLayersPanelLayers(activePaintBoard);
        return true;
    }

    function mergeSelectedLayers() {
        if (!activePaintBoard || !activePaintBoard.mergeSelectedLayers) {
            return false;
        }

        if (!activePaintBoard.mergeSelectedLayers()) {
            return false;
        }

        syncLayersPanelLayers(activePaintBoard);
        return true;
    }

    function setActiveColor(color) {
        global.App.memory.currentColor = color;

        if (appColorPicker && appColorPicker.setActiveColor) {
            appColorPicker.setActiveColor(color, true);
        }

        if (appBigColorPicker && appBigColorPicker.setActiveColor) {
            appBigColorPicker.setActiveColor(color);
        }

        if (global.ForegroundBackgroundColorsApi &&
            global.ForegroundBackgroundColorsApi.setFrontColor) {
            global.ForegroundBackgroundColorsApi.setFrontColor(color, true);
        }
    }

    function getActiveColors() {
        var colors = {
            frontColor: (global.App && global.App.memory && global.App.memory.currentColor) || "#000000",
            backgroundColor: "#ffffff"
        };

        if (global.ForegroundBackgroundColorsApi) {
            if (typeof global.ForegroundBackgroundColorsApi.getColors === "function") {
                colors = global.ForegroundBackgroundColorsApi.getColors();
            } else {
                if (typeof global.ForegroundBackgroundColorsApi.getFrontColor === "function") {
                    colors.frontColor = global.ForegroundBackgroundColorsApi.getFrontColor();
                }
                if (typeof global.ForegroundBackgroundColorsApi.getBackgroundColor === "function") {
                    colors.backgroundColor = global.ForegroundBackgroundColorsApi.getBackgroundColor();
                }
            }
        }

        return {
            frontColor: colors.frontColor,
            backgroundColor: colors.backgroundColor
        };
    }

    function getFrontColor() {
        return getActiveColors().frontColor;
    }

    function getBackgroundColor() {
        return getActiveColors().backgroundColor;
    }

    global.AppOpenWindows = {
        openEditor: openEditor,
        newDocument: newDocument,
        openMultiPaste: openMultiPaste,
        createDemoWindow: createDemoWindow,
        openPaintBoardWindow: openPaintBoardWindow,
        openBrushDesignerInWindow: openBrushDesignerInWindow,
        openBrushDesigner2InWindow: openBrushDesigner2InWindow,
        openRetroBrushDesignerWindow: openRetroBrushDesignerWindow,
        openPatternsViewWindow: openPatternsViewWindow,
        openGradientPanelWindow: openGradientPanelWindow,
        openBrushEditorOutputsWindow: openBrushEditorOutputsWindow,
        openSimpleColorPickerWindow: openSimpleColorPickerWindow,
        openBigColorPickerWindow: openBigColorPickerWindow,
        openResizeImageWindow: openResizeImageWindow,
        openSimpleLineWidthPickerWindow: openSimpleLineWidthPickerWindow,
        openSimpleBrushWidthPickerWindow: openSimpleBrushWidthPickerWindow,
        openLinesDesignerWindow: openLinesDesignerWindow,
        setSimpleLineWidthPickerWidth: setSimpleLineWidthPickerWidth,
        setLinesDesignerWidth: setLinesDesignerWidth,
        getSimpleColorPickerApi: getSimpleColorPickerApi,
        getSimpleLineWidthPickerApi: getSimpleLineWidthPickerApi,
        getSimpleBrushWidthPickerApi: getSimpleBrushWidthPickerApi,
        getLinesDesignerApi: getLinesDesignerApi,
        openPaintToolsWindow: openPaintToolsWindow,
        openLayersPanelWindow: openLayersPanelWindow,
        openStarGeneratorWindow: openStarGeneratorWindow,
        openSvgExporterWindow: openSvgExporterWindow,
        updatePaintBoardWindowTitle: updatePaintBoardWindowTitle,
        updatePaintBoardToolbarState: updatePaintBoardToolbarState,
        updateLayersPanelThumbnail: updateLayersPanelThumbnail,
        refreshLayersPanel: refreshLayersPanel,
        resizeLayersPanelThumbnailsTo: resizeLayersPanelThumbnailsTo,
        getActivePaintBoard: getActivePaintBoard,
        clearBoard: clearBoard,
        flattenImage: flattenImage,
        mergeSelectedLayers: mergeSelectedLayers,
        setActiveColor: setActiveColor,
        getActiveColors: getActiveColors,
        getFrontColor: getFrontColor,
        getBackgroundColor: getBackgroundColor
    };

}(window, jQuery));
