(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        windowId: null,
        title: "Dialog",
        width: 640,
        height: 360,
        className: "",
        content: null,
        movable: false,
        overlayOpacity: null,
        closeOnEscape: true,
        beforeClose: null
    };

    function ModalWindow(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var x = Math.max(0, Math.round((global.innerWidth - config.width) / 2));
        var y = Math.max(0, Math.round((global.innerHeight - config.height) / 2));
        var modal;
        var keyDown;

        if (!global.WindowsManager) {
            throw new Error("ModalWindow requires WindowsManager.");
        }

        modal = global.WindowsManager.create({
            id: config.id,
            windowId: config.windowId,
            title: config.title,
            type: "MODAL",
            x: x,
            y: y,
            width: config.width,
            height: config.height,
            fixed: !config.movable,
            movable: !!config.movable,
            resizable: false,
            minimizable: false,
            maximizable: false,
            scrollBarX: false,
            scrollBarY: false,
            content: config.content,
            beforeClose: function(currentWindow) {
                if (typeof config.beforeClose === "function" &&
                    config.beforeClose(currentWindow) === false) {
                    return false;
                }
                document.removeEventListener("keydown", keyDown);
                return true;
            }
        });

        if (!modal) {
            return null;
        }

        if (modal.modalOverlay && config.overlayOpacity !== null && config.overlayOpacity !== undefined) {
            modal.modalOverlay.style.background = "rgba(0, 0, 0, " + normalizeOpacity(config.overlayOpacity) + ")";
        }

        modal.element.className += " modal-window";
        if (config.className) {
            modal.element.className += " " + config.className;
        }

        keyDown = function(event) {
            if (config.closeOnEscape && event.key === "Escape" && !modal.closed) {
                event.preventDefault();
                modal.close();
            }
        };
        document.addEventListener("keydown", keyDown);

        return modal;
    }

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function normalizeOpacity(value) {
        var opacity = parseFloat(value);

        if (isNaN(opacity)) {
            return 0.5;
        }

        return Math.max(0, Math.min(1, opacity));
    }

    global.ModalWindow = ModalWindow;
    global.modalWindow = ModalWindow;

}(window));
