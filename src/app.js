(function(global, $) {

    "use strict";

    var be = null;
    var demoWindowCount = 0;
    var appBigColorPicker = null;
    var appColorPicker = null;
    var appLineWidthPicker = null;
    var documentCount = 0;

    global.App = global.App || {};
    global.App.memory = global.App.memory || {};
    global.App.memory.currentColor = global.App.memory.currentColor || "#000000";
    global.App.memory.currentLineWidth = global.App.memory.currentLineWidth || 1;

    $(document).ready(function() {
        console.log("jQuery document ready!");
        openBrushEditorOutputsWindow();
        openSimpleColorPickerWindow();
        openSimpleLineWidthPickerWindow();
    });

    function openEditor() {
        be = $.brushEditor({
            beforeClose: function() {
                renderBruses();
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
            width: 800,
            height: 600,
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
        var windowFrameWidth = 16;
        var windowFrameHeight = 36;
        var windowIndex = documentCount + 1;
        var paintBoardWindow = WindowsManager.create({
            id: "demo-paint-board-window-" + windowIndex,
            title: "Paint Board " + windowIndex,
            windowGroupName: "paint-boards",
            maxGroupItems: 5,
            x: 120,
            y: 120,
            width: paintBoardWidth + windowFrameWidth,
            height: paintBoardHeight + windowFrameHeight,
            resizable: false,
            maximizable: true,
            scrollBarX: false,
            scrollBarY: false,
            contentId: "demo-paint-board-window-content-" + windowIndex
        });

        if (!paintBoardWindow) {
            return null;
        }

        documentCount += 1;

        PaintBoard({
            id: "demo-paint-board-" + windowIndex,
            containerId: paintBoardWindow.contentId,
            width: paintBoardWidth,
            height: paintBoardHeight,
            backgroundColor: config.backgroundColor || "#ffffff"
        });

        return paintBoardWindow;
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
                renderBruses();
                WindowsManager.closeWindow("brush-designer-window");
            }
        });

        $(".be-back-bg").remove();
        $("#window-brush-editor").appendTo(bdWindow.contentElement);
        openBrushEditorOutputsWindow();
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
            scrollBarX: false,
            scrollBarY: true,
            contentId: "brush-editor-outputs-window-content"
        });

        if (!outputsElement) {
            outputsElement = document.createElement("ol");
            outputsElement.id = "brush-editor-outputs";
        }

        outputsWindow.contentElement.appendChild(outputsElement);
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

    function renderBruses() {
        console.log("beforeClose!");
    }

    function storeImage(data) {
        console.log("storeImage! data:", data);
    }

    global.openEditor = openEditor;
    global.newDocument = newDocument;
    global.createDemoWindow = createDemoWindow;
    global.openBrushDesignerInWindow = openBrushDesignerInWindow;
    global.openBrushEditorOutputsWindow = openBrushEditorOutputsWindow;
    global.openSimpleColorPickerWindow = openSimpleColorPickerWindow;
    global.openBigColorPickerWindow = openBigColorPickerWindow;
    global.openSimpleLineWidthPickerWindow = openSimpleLineWidthPickerWindow;
    global.renderBruses = renderBruses;
    global.storeImage = storeImage;

}(window, jQuery));
