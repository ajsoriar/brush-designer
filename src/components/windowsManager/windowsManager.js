(function(global) {

    "use strict";

    var WINDOW_TYPES = {
        NORMAL: "NORMAL",
        TOOL: "TOOL",
        MODAL: "MODAL"
    };

    var Z_INDEX_RANGES = {
        NORMAL: 10000,
        TOOL: 100000,
        MODAL: 200000
    };

    var WINDOW_FRAME_EDGE_SIZE = 8;
    var SUPPORTS_POINTER_EVENTS = typeof global.PointerEvent === "function";

    var DEFAULTS = {
        title: "Window",
        type: WINDOW_TYPES.NORMAL,
        windowId: null,
        windowGroupName: null,
        maxGroupItems: null,
        x: 40,
        y: 40,
        width: 420,
        height: 280,
        minWidth: 160,
        minHeight: 0,
        fixed: false,
        movable: true,
        resizable: true,
        minimizable: true,
        maximizable: false,
        closable: true,
        modal: false,
        scrollbars: null,
        scrollBarX: true,
        scrollBarY: true,
        resizeContentStep: null,
        resizeGeometryIndicator: true,
        cornerRadius: 0,
        topBarGradient: null,
        toolsRow: false,
        toolsFooter: false,
        contentCentered: true,
        parent: null,
        content: null,
        contentId: null,
        onResize: null,
        onResizeEnd: null,
        beforeClose: null
    };

    var manager = {
        windows: [],
        windowTypes: WINDOW_TYPES,
        zIndex: extend({}, Z_INDEX_RANGES),
        create: createWindow,
        getWindow: getWindow,
        getWindowByWindowId: getWindowByWindowId,
        closeWindow: callOnWindow("close"),
        minimizeWindow: callOnWindow("minimize"),
        maximizeWindow: callOnWindow("maximize"),
        restoreWindow: callOnWindow("restore"),
        setWindowTitle: setWindowTitle,
        setWindowScrollBars: setWindowScrollBars,
        bringToFront: bringToFront
    };

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function createWindow(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var type = normalizeWindowType(config);
        var id = config.id || ("wm-window-" + Date.now() + "-" + manager.windows.length);
        var contentId = config.contentId || (id + "-content");
        var parent = config.parent || document.body;
        var element = document.createElement("div");
        var modalOverlay = null;
        var currentWindow;
        var existingWindow;

        normalizeScrollBarsConfig(config, options || {});

        if (config.windowId) {
            existingWindow = getWindowByWindowId(config.windowId);

            if (existingWindow) {
                bringToFront(existingWindow);
                return existingWindow;
            }
        }

        if (!canCreateInGroup(config)) {
            bringTopGroupWindowToFront(config.windowGroupName);
            return null;
        }

        if (config.fixed) {
            config.movable = false;
            config.resizable = false;
        }

        element.id = id;
        element.className = "wm-window";
        element.style.left = config.x + "px";
        element.style.top = config.y + "px";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";
        element.style.minWidth = config.minWidth + "px";
        element.style.minHeight = config.minHeight + "px";
        element.style.borderRadius = getCornerRadius(config.cornerRadius) + "px";

        if (config.fixed) {
            element.className += " wm-window-fixed";
        }

        if (!config.resizable) {
            element.className += " wm-window-not-resizable";
        }

        if (config.toolsRow) {
            element.className += " wm-window-tools-row-visible";
        }

        if (config.toolsFooter) {
            element.className += " wm-window-tools-footer-visible";
        }

        if (!config.contentCentered) {
            element.className += " wm-window-content-not-centered";
        }

        if (type === WINDOW_TYPES.MODAL) {
            modalOverlay = document.createElement("div");
            modalOverlay.className = "wm-modal-overlay";
        }

        element.innerHTML = [
            '<div class="wm-top-left" data-wm-resize="nw"></div>',
            '<div class="wm-top">',
                '<div class="wm-title"></div>',
                '<div class="wm-actions">',
                    '<button class="wm-btn wm-btn-minimize" type="button" title="Minimize">_</button>',
                    '<button class="wm-btn wm-btn-maximize" type="button" title="Maximize">[]</button>',
                    '<button class="wm-btn wm-btn-close" type="button" title="Close">x</button>',
                '</div>',
            '</div>',
            '<div class="wm-top-right" data-wm-resize="ne"></div>',
            '<div class="wm-tools-row"></div>',
            '<div class="wm-middle-left" data-wm-resize="w"></div>',
            '<div class="wm-center" id="' + contentId + '"></div>',
            '<div class="wm-middle-right" data-wm-resize="e"></div>',
            '<div class="wm-tools-footer"></div>',
            '<div class="wm-bottom-left" data-wm-resize="sw"></div>',
            '<div class="wm-bottom" data-wm-resize="s"></div>',
            '<div class="wm-bottom-right" data-wm-resize="se"></div>'
        ].join("");

        applyTopBarGradient(element, config.topBarGradient);

        currentWindow = {
            id: id,
            windowId: config.windowId,
            windowGroupName: config.windowGroupName,
            title: config.title,
            contentId: contentId,
            element: element,
            contentElement: null,
            toolsRowElement: null,
            toolsFooterElement: null,
            type: type,
            modal: type === WINDOW_TYPES.MODAL,
            modalOverlay: modalOverlay,
            minimized: false,
            maximized: false,
            closed: false,
            fixed: config.fixed,
            resizable: config.resizable,
            movable: config.movable,
            minimize: function() {
                minimizeWindow(currentWindow);
            },
            restore: function() {
                restoreWindow(currentWindow, config);
            },
            maximize: function() {
                maximizeWindow(currentWindow, config);
            },
            close: function() {
                closeWindow(currentWindow, config);
            },
            setTitle: function(title) {
                currentWindow.title = title;
                element.querySelector(".wm-title").textContent = title;
            },
            setContent: function(content) {
                setContent(currentWindow, content);
            },
            setScrollBars: function(scrollbars, scrollBarY) {
                setScrollBars(currentWindow, scrollbars, scrollBarY);
            },
            moveTo: function(x, y) {
                element.style.left = x + "px";
                element.style.top = y + "px";
            },
            resizeTo: function(width, height) {
                element.style.width = Math.max(width, config.minWidth) + "px";
                element.style.height = Math.max(height, config.minHeight) + "px";
                notifyResize(currentWindow, config);
            },
            scaleToContent: function(width, height) {
                scaleToContent(currentWindow, config, width, height);
            }
        };

        currentWindow.contentElement = element.querySelector(".wm-center");
        currentWindow.toolsRowElement = element.querySelector(".wm-tools-row");
        currentWindow.toolsFooterElement = element.querySelector(".wm-tools-footer");
        setScrollBars(currentWindow, config.scrollBarX, config.scrollBarY);
        currentWindow.setTitle(config.title);

        if (config.content !== null && config.content !== undefined) {
            currentWindow.setContent(config.content);
        }

        bindWindowEvents(currentWindow, config);
        if (modalOverlay) {
            modalOverlay.addEventListener(getStartEventName(), function(event) {
                event.preventDefault();
                event.stopPropagation();
                bringToFront(currentWindow.id);
            });
            parent.appendChild(modalOverlay);
        }

        parent.appendChild(element);
        manager.windows.push(currentWindow);
        bringToFront(currentWindow.id);

        return currentWindow;
    }

    function canCreateInGroup(config) {
        var maxGroupItems = parseInt(config.maxGroupItems, 10);

        if (!config.windowGroupName || isNaN(maxGroupItems) || maxGroupItems < 1) {
            return true;
        }

        return getWindowsByGroupName(config.windowGroupName).length < maxGroupItems;
    }

    function getCornerRadius(cornerRadius) {
        var radius = parseInt(cornerRadius, 10);

        if (isNaN(radius) || radius < 0) {
            return 0;
        }

        return Math.min(radius, WINDOW_FRAME_EDGE_SIZE);
    }

    function applyTopBarGradient(element, topBarGradient) {
        var colorA;
        var colorB;
        var gradient;
        var orientation;
        var topLeft;
        var top;
        var topRight;
        var title;

        if (!topBarGradient || !topBarGradient.a || !topBarGradient.b) {
            return;
        }

        colorA = topBarGradient.a;
        colorB = topBarGradient.b;
        orientation = String(topBarGradient.orientation || "horizontal").toLowerCase();
        topLeft = element.querySelector(".wm-top-left");
        top = element.querySelector(".wm-top");
        topRight = element.querySelector(".wm-top-right");
        title = element.querySelector(".wm-title");

        if (!topLeft || !top || !topRight) {
            return;
        }

        if (title) {
            if (isDarkColor(colorA)) {
                title.style.color = "#ffffff";
                title.style.textShadow = "0 1px #000000";
            } else {
                title.style.color = "#111111";
                title.style.textShadow = "none";
            }
        }

        if (orientation === "vertical") {
            gradient = "linear-gradient(to bottom, " + colorA + ", " + colorB + ")";
            topLeft.style.background = gradient;
            top.style.background = gradient;
            topRight.style.background = gradient;
            return;
        }

        gradient = "linear-gradient(to right, " + colorA + ", " + colorB + ")";
        topLeft.style.background = colorA;
        top.style.background = gradient;
        topRight.style.background = colorB;
    }

    function isDarkColor(color) {
        var value = String(color || "").trim();
        var match;
        var red;
        var green;
        var blue;
        var luminance;

        if (/^#[0-9a-f]{3}$/i.test(value)) {
            red = parseInt(value.charAt(1) + value.charAt(1), 16);
            green = parseInt(value.charAt(2) + value.charAt(2), 16);
            blue = parseInt(value.charAt(3) + value.charAt(3), 16);
        } else if (/^#[0-9a-f]{6}$/i.test(value)) {
            red = parseInt(value.slice(1, 3), 16);
            green = parseInt(value.slice(3, 5), 16);
            blue = parseInt(value.slice(5, 7), 16);
        } else {
            match = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (!match) {
                return false;
            }
            red = Math.min(255, parseInt(match[1], 10));
            green = Math.min(255, parseInt(match[2], 10));
            blue = Math.min(255, parseInt(match[3], 10));
        }

        luminance = (red * 299 + green * 587 + blue * 114) / 1000;
        return luminance < 128;
    }

    function getWindowsByGroupName(windowGroupName) {
        return manager.windows.filter(function(item) {
            return item.windowGroupName === windowGroupName && !item.closed;
        });
    }

    function bringTopGroupWindowToFront(windowGroupName) {
        var groupWindows = getWindowsByGroupName(windowGroupName);
        var topWindow = null;
        var topZIndex = -1;

        groupWindows.forEach(function(item) {
            var zIndex = parseInt(item.element.style.zIndex, 10) || 0;

            if (zIndex >= topZIndex) {
                topZIndex = zIndex;
                topWindow = item;
            }
        });

        if (topWindow) {
            bringToFront(topWindow);
        }

        return topWindow;
    }

    function normalizeWindowType(config) {
        var type = String(config.type || WINDOW_TYPES.NORMAL).toUpperCase();

        if (config.modal) {
            return WINDOW_TYPES.MODAL;
        }

        if (type === WINDOW_TYPES.TOOL || type === WINDOW_TYPES.MODAL) {
            return type;
        }

        return WINDOW_TYPES.NORMAL;
    }

    function normalizeScrollBarsConfig(config, options) {
        if (typeof options.scrollbars === "boolean") {
            config.scrollBarX = options.scrollbars;
            config.scrollBarY = options.scrollbars;
        }
    }

    function setContent(currentWindow, content) {
        var contentElement = currentWindow.contentElement;

        contentElement.innerHTML = "";

        if (typeof content === "string") {
            contentElement.innerHTML = content;
            return;
        }

        if (content && content.nodeType) {
            contentElement.appendChild(content);
        }
    }

    function setScrollBars(currentWindow, scrollBarX, scrollBarY) {
        var bothAxes = typeof scrollBarX === "boolean" && typeof scrollBarY !== "boolean";
        var horizontal = !!scrollBarX;
        var vertical = bothAxes ? horizontal : !!scrollBarY;

        currentWindow.scrollBarX = horizontal;
        currentWindow.scrollBarY = vertical;
        currentWindow.contentElement.style.overflowX = horizontal ? "auto" : "hidden";
        currentWindow.contentElement.style.overflowY = vertical ? "auto" : "hidden";
    }

    function bindWindowEvents(currentWindow, config) {
        var element = currentWindow.element;
        var topBar = element.querySelector(".wm-top");
        var closeButton = element.querySelector(".wm-btn-close");
        var minimizeButton = element.querySelector(".wm-btn-minimize");
        var maximizeButton = element.querySelector(".wm-btn-maximize");
        var resizeHandles = element.querySelectorAll("[data-wm-resize]");
        var lastTopBarPressTime = 0;
        var lastTopBarPressX = 0;
        var lastTopBarPressY = 0;

        element.addEventListener(getStartEventName(), function() {
            bringToFront(currentWindow.id);
        });

        if (!config.closable) {
            closeButton.style.display = "none";
        } else {
            closeButton.addEventListener("click", function(event) {
                event.stopPropagation();
                currentWindow.close();
            });
        }

        if (!config.minimizable) {
            minimizeButton.style.display = "none";
        } else {
            minimizeButton.addEventListener("click", function(event) {
                event.stopPropagation();

                if (currentWindow.minimized) {
                    currentWindow.restore();
                } else {
                    currentWindow.minimize();
                }
            });
        }

        if (!config.maximizable) {
            maximizeButton.style.display = "none";
        } else {
            maximizeButton.addEventListener("click", function(event) {
                event.stopPropagation();
                currentWindow.maximize();
            });
        }

        if (config.minimizable || config.maximizable) {
            topBar.addEventListener(getStartEventName(), function(event) {
                var now = Date.now();
                var isDoublePress = now - lastTopBarPressTime <= 400 &&
                    Math.abs(event.clientX - lastTopBarPressX) <= 6 &&
                    Math.abs(event.clientY - lastTopBarPressY) <= 6;

                if (event.target.closest(".wm-actions")) {
                    lastTopBarPressTime = 0;
                    return;
                }

                if (!isPrimaryInputStart(event)) {
                    return;
                }

                lastTopBarPressTime = now;
                lastTopBarPressX = event.clientX;
                lastTopBarPressY = event.clientY;

                if (!isDoublePress) {
                    return;
                }

                lastTopBarPressTime = 0;
                event.preventDefault();

                if (config.minimizable) {
                    if (currentWindow.minimized) {
                        currentWindow.restore();
                    } else {
                        currentWindow.minimize();
                    }
                    return;
                }

                currentWindow.maximize();
            });
        }

        if (config.movable) {
            topBar.addEventListener(getStartEventName(), function(event) {
                if (event.defaultPrevented || event.target.closest(".wm-actions")) {
                    return;
                }

                startMove(event, currentWindow);
            });
        }

        if (config.resizable) {
            Array.prototype.forEach.call(resizeHandles, function(handle) {
                handle.addEventListener(getStartEventName(), function(event) {
                    startResize(event, currentWindow, config, handle.getAttribute("data-wm-resize"));
                });
            });
        }
    }

    function startMove(event, currentWindow) {
        var element = currentWindow.element;
        var startX = event.clientX;
        var startY = event.clientY;
        var startLeft = element.offsetLeft;
        var startTop = element.offsetTop;
        var moveEventName = getMoveEventName(event);
        var stopEventName = getStopEventName(event);
        var cancelEventName = getCancelEventName(event);
        var pointerId = typeof event.pointerId === "number" ? event.pointerId : null;

        if (currentWindow.maximized) {
            return;
        }

        if (!isPrimaryInputStart(event)) {
            return;
        }

        event.preventDefault();

        capturePointer(element, pointerId);
        document.addEventListener(moveEventName, move);
        document.addEventListener(stopEventName, stop);
        document.addEventListener(cancelEventName, stop);

        function move(moveEvent) {
            if (!isActivePointer(moveEvent, pointerId)) {
                return;
            }

            moveEvent.preventDefault();
            element.style.left = (startLeft + moveEvent.clientX - startX) + "px";
            element.style.top = (startTop + moveEvent.clientY - startY) + "px";
        }

        function stop(stopEvent) {
            if (!isActivePointer(stopEvent, pointerId)) {
                return;
            }

            document.removeEventListener(moveEventName, move);
            document.removeEventListener(stopEventName, stop);
            document.removeEventListener(cancelEventName, stop);
        }
    }

    function scaleToContent(currentWindow, config, width, height) {
        var frameWidth = currentWindow.element.offsetWidth - currentWindow.contentElement.clientWidth;
        var frameHeight = currentWindow.element.offsetHeight - currentWindow.contentElement.clientHeight;

        currentWindow.resizeTo(width + frameWidth, height + frameHeight);
    }

    function startResize(event, currentWindow, config, direction) {
        var element = currentWindow.element;
        var startX = event.clientX;
        var startY = event.clientY;
        var startLeft = element.offsetLeft;
        var startTop = element.offsetTop;
        var startWidth = element.offsetWidth;
        var startHeight = element.offsetHeight;
        var frameWidth = element.offsetWidth - currentWindow.contentElement.clientWidth;
        var frameHeight = element.offsetHeight - currentWindow.contentElement.clientHeight;
        var moveEventName = getMoveEventName(event);
        var stopEventName = getStopEventName(event);
        var cancelEventName = getCancelEventName(event);
        var pointerId = typeof event.pointerId === "number" ? event.pointerId : null;

        if (currentWindow.minimized || currentWindow.maximized) {
            return;
        }

        if (!isPrimaryInputStart(event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        capturePointer(element, pointerId);
        document.addEventListener(moveEventName, resize);
        document.addEventListener(stopEventName, stop);
        document.addEventListener(cancelEventName, stop);
        updateResizeGeometryIndicator(currentWindow, config);

        function resize(moveEvent) {
            if (!isActivePointer(moveEvent, pointerId)) {
                return;
            }

            var deltaX = moveEvent.clientX - startX;
            var deltaY = moveEvent.clientY - startY;
            var nextLeft = startLeft;
            var nextTop = startTop;
            var nextWidth = startWidth;
            var nextHeight = startHeight;

            moveEvent.preventDefault();

            if (direction.indexOf("e") !== -1) {
                nextWidth = startWidth + deltaX;
            }

            if (direction.indexOf("s") !== -1) {
                nextHeight = startHeight + deltaY;
            }

            if (direction.indexOf("w") !== -1) {
                nextWidth = startWidth - deltaX;
                nextLeft = startLeft + deltaX;
            }

            if (direction.indexOf("n") !== -1) {
                nextHeight = startHeight - deltaY;
                nextTop = startTop + deltaY;
            }

            if (nextWidth < config.minWidth) {
                nextLeft = direction.indexOf("w") !== -1 ? startLeft + startWidth - config.minWidth : nextLeft;
                nextWidth = config.minWidth;
            }

            if (nextHeight < config.minHeight) {
                nextTop = direction.indexOf("n") !== -1 ? startTop + startHeight - config.minHeight : nextTop;
                nextHeight = config.minHeight;
            }

            nextWidth = snapSizeToContentStep(nextWidth, frameWidth, config.resizeContentStep, "width");
            nextHeight = snapSizeToContentStep(nextHeight, frameHeight, config.resizeContentStep, "height");

            if (nextWidth < config.minWidth) {
                nextWidth = config.minWidth;
            }

            if (nextHeight < config.minHeight) {
                nextHeight = config.minHeight;
            }

            if (direction.indexOf("w") !== -1) {
                nextLeft = startLeft + startWidth - nextWidth;
            }

            if (direction.indexOf("n") !== -1) {
                nextTop = startTop + startHeight - nextHeight;
            }

            element.style.left = nextLeft + "px";
            element.style.top = nextTop + "px";
            element.style.width = nextWidth + "px";
            element.style.height = nextHeight + "px";
            updateResizeGeometryIndicator(currentWindow, config);
            notifyResize(currentWindow, config);
        }

        function stop(stopEvent) {
            if (!isActivePointer(stopEvent, pointerId)) {
                return;
            }

            document.removeEventListener(moveEventName, resize);
            document.removeEventListener(stopEventName, stop);
            document.removeEventListener(cancelEventName, stop);
            hideResizeGeometryIndicator(currentWindow);
            notifyResizeEnd(currentWindow, config);
        }
    }

    function updateResizeGeometryIndicator(currentWindow, config) {
        var indicator;

        if (!config.resizeGeometryIndicator) {
            return;
        }

        indicator = getResizeGeometryIndicator(currentWindow);
        indicator.textContent = getGeometryText(currentWindow);
        indicator.style.display = "block";
        positionResizeGeometryIndicator(indicator, currentWindow);
    }

    function getResizeGeometryIndicator(currentWindow) {
        if (!currentWindow.geometryIndicatorElement) {
            currentWindow.geometryIndicatorElement = document.createElement("div");
            currentWindow.geometryIndicatorElement.className = "wm-resize-geometry-indicator";
            document.body.appendChild(currentWindow.geometryIndicatorElement);
        }

        return currentWindow.geometryIndicatorElement;
    }

    function getGeometryText(currentWindow) {
        var element = currentWindow.element;

        return element.offsetWidth + "x" + element.offsetHeight + "+" + element.offsetLeft + "+" + element.offsetTop;
    }

    function positionResizeGeometryIndicator(indicator, currentWindow) {
        var element = currentWindow.element;
        var left = element.offsetLeft + Math.round((element.offsetWidth - indicator.offsetWidth) / 2);
        var top = element.offsetTop + Math.round((element.offsetHeight - indicator.offsetHeight) / 2);

        indicator.style.left = Math.max(0, left) + "px";
        indicator.style.top = Math.max(0, top) + "px";
    }

    function hideResizeGeometryIndicator(currentWindow) {
        if (currentWindow.geometryIndicatorElement) {
            currentWindow.geometryIndicatorElement.style.display = "none";
        }
    }

    function snapSizeToContentStep(windowSize, frameSize, resizeContentStep, axis) {
        var step = getResizeContentStep(resizeContentStep, axis);
        var contentSize;

        if (!step) {
            return windowSize;
        }

        contentSize = Math.max(step, Math.round(Math.max(1, windowSize - frameSize) / step) * step);

        return contentSize + frameSize;
    }

    function getResizeContentStep(resizeContentStep, axis) {
        var step;

        if (typeof resizeContentStep === "number") {
            step = resizeContentStep;
        } else if (resizeContentStep && typeof resizeContentStep === "object") {
            step = resizeContentStep[axis];
        }

        step = parseInt(step, 10);

        return isNaN(step) || step < 1 ? 0 : step;
    }

    function getStartEventName() {
        return SUPPORTS_POINTER_EVENTS ? "pointerdown" : "mousedown";
    }

    function getMoveEventName(event) {
        return typeof event.pointerId === "number" ? "pointermove" : "mousemove";
    }

    function getStopEventName(event) {
        return typeof event.pointerId === "number" ? "pointerup" : "mouseup";
    }

    function getCancelEventName(event) {
        return typeof event.pointerId === "number" ? "pointercancel" : "mouseup";
    }

    function isPrimaryInputStart(event) {
        if (!event) {
            return false;
        }

        if (typeof event.isPrimary === "boolean" && !event.isPrimary) {
            return false;
        }

        if (event.button !== 0) {
            return false;
        }

        return true;
    }

    function isActivePointer(event, pointerId) {
        if (!event) {
            return false;
        }

        if (pointerId !== null && typeof event.pointerId === "number" && event.pointerId !== pointerId) {
            return false;
        }

        return true;
    }

    function capturePointer(element, pointerId) {
        if (pointerId === null || typeof element.setPointerCapture !== "function") {
            return;
        }

        try {
            element.setPointerCapture(pointerId);
        } catch (error) {
            return;
        }
    }

    function minimizeWindow(currentWindow) {
        currentWindow.previousHeight = currentWindow.element.offsetHeight;
        currentWindow.minimized = true;
        currentWindow.element.className += currentWindow.element.className.indexOf("wm-window-minimized") === -1 ? " wm-window-minimized" : "";
    }

    function restoreWindow(currentWindow, config) {
        currentWindow.minimized = false;
        currentWindow.element.className = currentWindow.element.className.replace(/\s?wm-window-minimized/g, "");

        if (currentWindow.previousHeight) {
            currentWindow.element.style.height = currentWindow.previousHeight + "px";
            notifyResize(currentWindow, config);
        }
    }

    function maximizeWindow(currentWindow, config) {
        var element = currentWindow.element;
        var rect;

        if (currentWindow.maximized) {
            restoreMaximizedWindow(currentWindow, config);
            return;
        }

        if (currentWindow.minimized) {
            restoreWindow(currentWindow, config);
        }

        currentWindow.previousRect = {
            left: element.offsetLeft,
            top: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight
        };
        rect = getMaximizeRect(element);
        currentWindow.maximized = true;
        element.className += element.className.indexOf("wm-window-maximized") === -1 ? " wm-window-maximized" : "";
        element.style.left = rect.left + "px";
        element.style.top = rect.top + "px";
        element.style.width = Math.max(rect.width, config.minWidth) + "px";
        element.style.height = Math.max(rect.height, config.minHeight) + "px";
        notifyResize(currentWindow, config);
    }

    function restoreMaximizedWindow(currentWindow, config) {
        var rect = currentWindow.previousRect;

        currentWindow.maximized = false;
        currentWindow.element.className = currentWindow.element.className.replace(/\s?wm-window-maximized/g, "");

        if (!rect) {
            return;
        }

        currentWindow.element.style.left = rect.left + "px";
        currentWindow.element.style.top = rect.top + "px";
        currentWindow.element.style.width = rect.width + "px";
        currentWindow.element.style.height = rect.height + "px";
        notifyResize(currentWindow, config);
    }

    function notifyResize(currentWindow, config) {
        var detail;
        var event;

        if (!currentWindow || !currentWindow.contentElement) {
            return;
        }

        detail = {
            window: currentWindow,
            width: currentWindow.contentElement.clientWidth,
            height: currentWindow.contentElement.clientHeight
        };

        if (typeof config.onResize === "function") {
            config.onResize(detail.width, detail.height, currentWindow);
        }

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("wm-window-resize", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("wm-window-resize", false, false, detail);
        }

        currentWindow.contentElement.dispatchEvent(event);
    }

    function notifyResizeEnd(currentWindow, config) {
        var detail;

        if (!currentWindow || !currentWindow.contentElement) {
            return;
        }

        detail = {
            window: currentWindow,
            width: currentWindow.contentElement.clientWidth,
            height: currentWindow.contentElement.clientHeight
        };

        if (typeof config.onResizeEnd === "function") {
            config.onResizeEnd(detail.width, detail.height, currentWindow);
        }
    }

    function getMaximizeRect(element) {
        var parent = element.parentNode;

        if (!parent || parent === document.body) {
            return {
                left: 0,
                top: 0,
                width: global.innerWidth,
                height: global.innerHeight
            };
        }

        return {
            left: 0,
            top: 0,
            width: parent.clientWidth,
            height: parent.clientHeight
        };
    }

    function closeWindow(currentWindow, config) {
        if (config && typeof config.beforeClose === "function" && config.beforeClose(currentWindow) === false) {
            return;
        }

        currentWindow.closed = true;

        if (currentWindow.element.parentNode) {
            currentWindow.element.parentNode.removeChild(currentWindow.element);
        }

        if (currentWindow.modalOverlay && currentWindow.modalOverlay.parentNode) {
            currentWindow.modalOverlay.parentNode.removeChild(currentWindow.modalOverlay);
        }

        if (currentWindow.geometryIndicatorElement && currentWindow.geometryIndicatorElement.parentNode) {
            currentWindow.geometryIndicatorElement.parentNode.removeChild(currentWindow.geometryIndicatorElement);
        }

        manager.windows = manager.windows.filter(function(item) {
            return item.id !== currentWindow.id;
        });
    }

    function bringToFront(id) {
        var currentWindow = typeof id === "string" ? getWindow(id) : id;

        if (!currentWindow || currentWindow.closed) {
            return null;
        }

        manager.zIndex[currentWindow.type] += 1;

        if (currentWindow.modalOverlay) {
            currentWindow.modalOverlay.style.zIndex = manager.zIndex[currentWindow.type];
            manager.zIndex[currentWindow.type] += 1;
        }

        currentWindow.element.style.zIndex = manager.zIndex[currentWindow.type];

        return currentWindow;
    }

    function getWindow(id) {
        var i;

        for (i = 0; i < manager.windows.length; i++) {
            if (manager.windows[i].id === id) {
                return manager.windows[i];
            }
        }

        return null;
    }

    function getWindowByWindowId(windowId) {
        var i;

        for (i = 0; i < manager.windows.length; i++) {
            if (manager.windows[i].windowId === windowId) {
                return manager.windows[i];
            }
        }

        return null;
    }

    function callOnWindow(methodName) {
        return function(id) {
            var currentWindow = getWindow(id);

            if (!currentWindow || !currentWindow[methodName]) {
                return null;
            }

            currentWindow[methodName]();

            return currentWindow;
        };
    }

    function setWindowTitle(id, title) {
        var currentWindow = getWindow(id);

        if (!currentWindow) {
            return null;
        }

        currentWindow.setTitle(title);

        return currentWindow;
    }

    function setWindowScrollBars(id, scrollBarX, scrollBarY) {
        var currentWindow = getWindow(id);

        if (!currentWindow) {
            return null;
        }

        currentWindow.setScrollBars(scrollBarX, scrollBarY);

        return currentWindow;
    }

    global.WindowsManager = manager;

}(window));
