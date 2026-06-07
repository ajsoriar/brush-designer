(function(global, $) {

    "use strict";

    var be = null;
    var demoWindowCount = 0;
    var appBigColorPicker = null;
    var appColorPicker = null;
    var appLineWidthPicker = null;
    var appPaintTools = null;
    var appStarGenerator = null;
    var appBrushDesigner2 = null;
    var documentCount = 0;
    var activePaintBoard = null;

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
        var dialogX = Math.max(0, Math.round((global.innerWidth - dialogWidth) / 2));
        var dialogY = Math.max(0, Math.round((global.innerHeight - dialogHeight) / 2));
        var dialogWindow;
        var dialog;

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return;
        }

        dialogWindow = WindowsManager.create({
            id: "new-document-window",
            windowId: "new-document",
            title: "New",
            type: "MODAL",
            x: dialogX,
            y: dialogY,
            width: dialogWidth,
            height: dialogHeight,
            fixed: true,
            minimizable: false,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "new-document-window-content"
        });

        dialogWindow.element.className += " wm-window-new-document";
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

    function openPaintBoardWindow(options) {
        var config = options || {};
        var paintBoardWidth = config.width || 800;
        var paintBoardHeight = config.height || 600;
        var windowFrameWidth = 18;
        var windowFrameHeight = 66;
        var windowIndex = documentCount + 1;
        var paintBoard;
        var paintBoardWindow = WindowsManager.create({
            id: "demo-paint-board-window-" + windowIndex,
            title: "Paint Board " + windowIndex,
            windowGroupName: "paint-boards",
            maxGroupItems: 5,
            x: 120,
            y: 120,
            width: paintBoardWidth + windowFrameWidth,
            height: paintBoardHeight + windowFrameHeight,
            resizable: true,
            maximizable: true,
            toolsRow: true,
            scrollbars: true,
            contentId: "demo-paint-board-window-content-" + windowIndex,
            beforeClose: function(currentWindow) {
                return confirmPaintBoardClose(paintBoard, currentWindow);
            }
        });

        if (!paintBoardWindow) {
            return null;
        }

        paintBoardWindow.element.className += " wm-window-paint-board";
        documentCount += 1;

        paintBoard = PaintBoard({
            id: "demo-paint-board-" + windowIndex,
            containerId: paintBoardWindow.contentId,
            width: paintBoardWidth,
            height: paintBoardHeight,
            backgroundColor: config.backgroundColor || "#ffffff"
        });
        paintBoard.window = paintBoardWindow;
        paintBoardWindow.baseTitle = paintBoardWindow.title;
        activePaintBoard = paintBoard;
        initPaintBoardToolbar(paintBoard);
        paintBoardWindow.scaleToContent(paintBoardWidth, paintBoardHeight);
        setActiveZoomBoard(paintBoard);
        updatePaintBoardWindowTitle(paintBoard);

        paintBoardWindow.element.addEventListener("mousedown", function() {
            activePaintBoard = paintBoard;
            setActiveZoomBoard(paintBoard);
            updatePaintBoardWindowTitle(paintBoard);
        });

        return paintBoardWindow;
    }

    function initPaintBoardToolbar(paintBoard) {
        var toolbar;
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
        toolbar.className = "paint-board-toolbar";

        zoomOptions.forEach(function(option) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "paint-board-toolbar-btn";
            button.textContent = option.label;
            button.title = option.title || option.label;
            button.addEventListener("click", function() {
                activePaintBoard = paintBoard;
                setActiveZoomBoard(paintBoard);

                if (global.Zoom && global.Zoom.setBoardZoom) {
                    global.Zoom.setBoardZoom(paintBoard.element, option.zoom);
                }
            });

            toolbar.appendChild(button);
        });

        paintBoard.window.toolsRowElement.innerHTML = "";
        paintBoard.window.toolsRowElement.appendChild(toolbar);
    }

    function setActiveZoomBoard(paintBoard) {
        if (global.Zoom && global.Zoom.setActiveBoard) {
            global.Zoom.setActiveBoard(paintBoard.element);
        }
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
            activePaintBoard = null;
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
        var windowFrameHeight = 36;
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
            assetBaseUrl: "/components/brushdesigner.v2/",
            onChange: function(brush, designer) {
                global.App.memory.currentBrushDesigner2 = brush;
                global.App.memory.currentDesignedBrush = designer.createBrushCanvas();
            }
        });

        return appBrushDesigner2;
    }

    function openBrushEditorOutputsWindow() {
        var outputsWidth = 170;
        var outputsHeight = 700;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var outerWidth = outputsWidth + windowFrameWidth;
        var outerHeight = outputsHeight + windowFrameHeight;
        var x = Math.max(0, global.innerWidth - outerWidth - 20);
        var y = Math.max(0, Math.round((global.innerHeight - outerHeight) / 2));
        var outputsElement = document.getElementById("brush-editor-outputs");
        var outputsWindow = WindowsManager.create({
            id: "brush-editor-outputs-window",
            windowId: "brush-editor-outputs",
            title: "Brush outputs",
            type: "TOOL",
            x: x,
            y: y,
            width: outerWidth,
            height: outerHeight,
            resizable: false,
            topBarGradient: {
                a: "#2563eb",
                b: "#14b8a6",
                orientacion: "vertical"
            },
            scrollBarX: false,
            scrollBarY: true,
            contentId: "brush-editor-outputs-window-content"
        });

        if (!outputsElement) {
            outputsElement = document.createElement("ol");
            outputsElement.id = "brush-editor-outputs";
        }

        bindBrushOutputSelection(outputsElement);
        outputsWindow.contentElement.appendChild(outputsElement);
    }

    function bindBrushOutputSelection(outputsElement) {
        if (outputsElement.getAttribute("data-selection-bound") === "true") {
            return;
        }

        outputsElement.setAttribute("data-selection-bound", "true");
        outputsElement.addEventListener("click", function(event) {
            var item = event.target.closest("li");
            var image;

            if (!item || !outputsElement.contains(item)) {
                return;
            }

            image = item.querySelector("img");

            if (!image) {
                return;
            }

            selectBrushOutput(outputsElement, item, image);
        });
    }

    function selectBrushOutput(outputsElement, item, image) {
        var selectedItems = outputsElement.querySelectorAll(".brush-output-selected");
        var i;

        for (i = 0; i < selectedItems.length; i++) {
            selectedItems[i].className = selectedItems[i].className.replace(/\s?brush-output-selected/g, "");
        }

        item.className += item.className.indexOf("brush-output-selected") === -1 ? " brush-output-selected" : "";
        global.App.memory.currentDesignedBrush = image;

        if (global.PaintTools) {
            global.PaintTools.use("DESIGNED-BRUSH");
        }
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
            x: 20,
            y: 40,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 120,
            //minHeight: 120,
            resizable: true,
            cornerRadius: 100,
            topBarGradient: {
                a: "#2563eb",
                b: "#14b8a6",
                orientacion: "horizontal"
            },
            scrollBarX: false,
            scrollBarY: false,
            contentId: "simple-color-picker-window-content"
        });

        appColorPicker = SimpleColorPicker({
            id: "app-simple-color-picker",
            containerId: pickerWindow.contentId,
            columns: 15,
            rows: 10,
            colorGap: 0,
            activeColor: global.App.memory.currentColor,
            onColorSelected: function(color) {
                global.App.memory.currentColor = color;
                console.log("Selected color:", color);
            },
            color: {
                defaultWidth: 17,
                defaultHeight: 17
            }
        });

        pickerWindow.scaleToContent(appColorPicker.getWidth(), appColorPicker.getHeight());

        return appColorPicker;
    }

    function openBigColorPickerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("big-color-picker");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appBigColorPicker;
        }

        var pickerWidth = 488;
        var pickerHeight = 278;
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
            minHeight: 280,
            resizable: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "big-color-picker-window-content"
        });

        appBigColorPicker = BigColorPicker({
            id: "app-big-color-picker",
            containerId: pickerWindow.contentId,
            width: pickerWidth,
            height: pickerHeight,
            activeColor: global.App.memory.currentColor,
            onColorSelected: function(color) {
                global.App.memory.currentColor = color;
                console.log("Selected color:", color);
            }
        });

        pickerWindow.scaleToContent(appBigColorPicker.getWidth(), appBigColorPicker.getHeight());

        return appBigColorPicker;
    }

    function openSimpleLineWidthPickerWindow() {
        var existingWindow = WindowsManager.getWindowByWindowId("simple-line-width-picker");

        if (existingWindow) {
            WindowsManager.bringToFront(existingWindow);
            return appLineWidthPicker;
        }

        var pickerWidth = 120;
        var pickerHeight = 260;
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var pickerWindow = WindowsManager.create({
            id: "simple-line-width-picker-window",
            windowId: "simple-line-width-picker",
            title: "Line Width",
            type: "TOOL",
            x: 20,
            y: 300,
            width: pickerWidth + windowFrameWidth,
            height: pickerHeight + windowFrameHeight,
            minWidth: 90,
            //minHeight: 120,
            resizable: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "simple-line-width-picker-window-content"
        });

        appLineWidthPicker = SimpleLineWidthPicker({
            id: "app-simple-line-width-picker",
            containerId: pickerWindow.contentId,
            minWidth: 1,
            maxWidth: 15,
            steps: 8,
            activeLineWidth: global.App.memory.currentLineWidth,
            onLineWidthSelected: function(lineWidth) {
                global.App.memory.currentLineWidth = lineWidth;
                console.log("Selected line width:", lineWidth);
            }
        });

        pickerWindow.scaleToContent(appLineWidthPicker.getWidth(), appLineWidthPicker.getHeight());

        return appLineWidthPicker;
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
        var toolsWindow = WindowsManager.create({
            id: "paint-tools-window",
            windowId: "paint-tools",
            title: "Paint Tools",
            type: "TOOL",
            x: 20,
            y: 590,
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
            rows: rows
        });

        toolsWindow.scaleToContent(appPaintTools.getWidth(), appPaintTools.getHeight());

        return appPaintTools;
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

    function getPaintToolsCount() {
        var count = 0;
        var key;

        if (!global.PaintTools || !global.PaintTools.modes) {
            return count;
        }

        for (key in global.PaintTools.modes) {
            if (Object.prototype.hasOwnProperty.call(global.PaintTools.modes, key)) {
                count += 1;
            }
        }

        return count;
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

    function setActiveColor(color) {
        global.App.memory.currentColor = color;

        if (appColorPicker && appColorPicker.setActiveColor) {
            appColorPicker.setActiveColor(color);
        }

        if (appBigColorPicker && appBigColorPicker.setActiveColor) {
            appBigColorPicker.setActiveColor(color);
        }
    }

    global.AppOpenWindows = {
        openEditor: openEditor,
        newDocument: newDocument,
        createDemoWindow: createDemoWindow,
        openPaintBoardWindow: openPaintBoardWindow,
        openBrushDesignerInWindow: openBrushDesignerInWindow,
        openBrushDesigner2InWindow: openBrushDesigner2InWindow,
        openBrushEditorOutputsWindow: openBrushEditorOutputsWindow,
        openSimpleColorPickerWindow: openSimpleColorPickerWindow,
        openBigColorPickerWindow: openBigColorPickerWindow,
        openSimpleLineWidthPickerWindow: openSimpleLineWidthPickerWindow,
        openPaintToolsWindow: openPaintToolsWindow,
        openStarGeneratorWindow: openStarGeneratorWindow,
        updatePaintBoardWindowTitle: updatePaintBoardWindowTitle,
        getActivePaintBoard: getActivePaintBoard,
        clearBoard: clearBoard,
        setActiveColor: setActiveColor
    };

}(window, jQuery));
