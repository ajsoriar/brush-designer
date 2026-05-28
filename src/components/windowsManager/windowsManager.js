(function(global) {

    "use strict";

    var DEFAULTS = {
        title: "Window",
        windowId: null,
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
        closable: true,
        scrollBarX: true,
        scrollBarY: true,
        parent: null,
        content: null,
        contentId: null
    };

    var manager = {
        windows: [],
        zIndex: 10000,
        create: createWindow,
        getWindow: getWindow,
        getWindowByWindowId: getWindowByWindowId,
        closeWindow: callOnWindow("close"),
        minimizeWindow: callOnWindow("minimize"),
        restoreWindow: callOnWindow("restore"),
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
        var id = config.id || ("wm-window-" + Date.now() + "-" + manager.windows.length);
        var contentId = config.contentId || (id + "-content");
        var parent = config.parent || document.body;
        var element = document.createElement("div");
        var currentWindow;
        var existingWindow;

        if (config.windowId) {
            existingWindow = getWindowByWindowId(config.windowId);

            if (existingWindow) {
                bringToFront(existingWindow);
                return existingWindow;
            }
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

        element.innerHTML = [
            '<div class="wm-top-left" data-wm-resize="nw"></div>',
            '<div class="wm-top">',
                '<div class="wm-title"></div>',
                '<div class="wm-actions">',
                    '<button class="wm-btn wm-btn-minimize" type="button" title="Minimize">_</button>',
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
            title: config.title,
            contentId: contentId,
            element: element,
            contentElement: null,
            minimized: false,
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
        currentWindow.contentElement.style.overflowX = config.scrollBarX ? "auto" : "hidden";
        currentWindow.contentElement.style.overflowY = config.scrollBarY ? "auto" : "hidden";
        currentWindow.setTitle(config.title);

        if (config.content !== null && config.content !== undefined) {
            currentWindow.setContent(config.content);
        }

        bindWindowEvents(currentWindow, config);
        parent.appendChild(element);
        manager.windows.push(currentWindow);
        bringToFront(currentWindow.id);

        return currentWindow;
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

    function bindWindowEvents(currentWindow, config) {
        var element = currentWindow.element;
        var topBar = element.querySelector(".wm-top");
        var closeButton = element.querySelector(".wm-btn-close");
        var minimizeButton = element.querySelector(".wm-btn-minimize");
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

        if (currentWindow.minimized) {
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

    function closeWindow(currentWindow) {
        currentWindow.closed = true;

        if (currentWindow.element.parentNode) {
            currentWindow.element.parentNode.removeChild(currentWindow.element);
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

        manager.zIndex += 1;
        currentWindow.element.style.zIndex = manager.zIndex;

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

    global.WindowsManager = manager;

}(window));
