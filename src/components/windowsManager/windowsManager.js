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
        parent: null,
        content: null,
        contentId: null
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

        if (config.fixed) {
            element.className += " wm-window-fixed";
        }

        if (!config.resizable) {
            element.className += " wm-window-not-resizable";
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
            '<div class="wm-middle-left" data-wm-resize="w"></div>',
            '<div class="wm-center" id="' + contentId + '"></div>',
            '<div class="wm-middle-right" data-wm-resize="e"></div>',
            '<div class="wm-bottom-left" data-wm-resize="sw"></div>',
            '<div class="wm-bottom" data-wm-resize="s"></div>',
            '<div class="wm-bottom-right" data-wm-resize="se"></div>'
        ].join("");

        currentWindow = {
            id: id,
            windowId: config.windowId,
            windowGroupName: config.windowGroupName,
            title: config.title,
            contentId: contentId,
            element: element,
            contentElement: null,
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
                restoreWindow(currentWindow);
            },
            maximize: function() {
                maximizeWindow(currentWindow, config);
            },
            close: function() {
                closeWindow(currentWindow);
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
            },
            scaleToContent: function(width, height) {
                scaleToContent(currentWindow, config, width, height);
            }
        };

        currentWindow.contentElement = element.querySelector(".wm-center");
        setScrollBars(currentWindow, config.scrollBarX, config.scrollBarY);
        currentWindow.setTitle(config.title);

        if (config.content !== null && config.content !== undefined) {
            currentWindow.setContent(config.content);
        }

        bindWindowEvents(currentWindow, config);
        if (modalOverlay) {
            modalOverlay.addEventListener("mousedown", function(event) {
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

        element.addEventListener("mousedown", function() {
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

            topBar.addEventListener("dblclick", function(event) {
                if (event.target.closest(".wm-actions")) {
                    return;
                }

                event.preventDefault();
                currentWindow.maximize();
            });
        }

        if (config.movable) {
            topBar.addEventListener("mousedown", function(event) {
                if (event.target.closest(".wm-actions")) {
                    return;
                }

                startMove(event, currentWindow);
            });
        }

        if (config.resizable) {
            Array.prototype.forEach.call(resizeHandles, function(handle) {
                handle.addEventListener("mousedown", function(event) {
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

        if (currentWindow.maximized) {
            return;
        }

        event.preventDefault();

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);

        function move(moveEvent) {
            element.style.left = (startLeft + moveEvent.clientX - startX) + "px";
            element.style.top = (startTop + moveEvent.clientY - startY) + "px";
        }

        function stop() {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
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

        if (currentWindow.minimized || currentWindow.maximized) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stop);

        function resize(moveEvent) {
            var deltaX = moveEvent.clientX - startX;
            var deltaY = moveEvent.clientY - startY;
            var nextLeft = startLeft;
            var nextTop = startTop;
            var nextWidth = startWidth;
            var nextHeight = startHeight;

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

            element.style.left = nextLeft + "px";
            element.style.top = nextTop + "px";
            element.style.width = nextWidth + "px";
            element.style.height = nextHeight + "px";
        }

        function stop() {
            document.removeEventListener("mousemove", resize);
            document.removeEventListener("mouseup", stop);
        }
    }

    function minimizeWindow(currentWindow) {
        currentWindow.previousHeight = currentWindow.element.offsetHeight;
        currentWindow.minimized = true;
        currentWindow.element.className += currentWindow.element.className.indexOf("wm-window-minimized") === -1 ? " wm-window-minimized" : "";
    }

    function restoreWindow(currentWindow) {
        currentWindow.minimized = false;
        currentWindow.element.className = currentWindow.element.className.replace(/\s?wm-window-minimized/g, "");

        if (currentWindow.previousHeight) {
            currentWindow.element.style.height = currentWindow.previousHeight + "px";
        }
    }

    function maximizeWindow(currentWindow, config) {
        var element = currentWindow.element;
        var rect;

        if (currentWindow.maximized) {
            restoreMaximizedWindow(currentWindow);
            return;
        }

        if (currentWindow.minimized) {
            restoreWindow(currentWindow);
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
    }

    function restoreMaximizedWindow(currentWindow) {
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

    function closeWindow(currentWindow) {
        currentWindow.closed = true;

        if (currentWindow.element.parentNode) {
            currentWindow.element.parentNode.removeChild(currentWindow.element);
        }

        if (currentWindow.modalOverlay && currentWindow.modalOverlay.parentNode) {
            currentWindow.modalOverlay.parentNode.removeChild(currentWindow.modalOverlay);
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
