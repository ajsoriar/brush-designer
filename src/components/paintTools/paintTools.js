(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        btnSize: 47,
        rows: 2,
        tools: null
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

    function PaintToolsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var componentId = config.id || ("paint-tools-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var tools = config.tools || getPaintToolModes();
        var rows = Math.max(1, parseInt(config.rows, 10) || DEFAULTS.rows);
        var columns = Math.max(1, Math.ceil(tools.length / rows));
        var component;

        element.id = componentId;
        element.className = "paint-tools";
        element.style.gridTemplateColumns = repeatGridTrack(columns, config.btnSize);
        element.style.gridTemplateRows = repeatGridTrack(rows, config.btnSize);
        element.style.width = (columns * config.btnSize) + "px";
        element.style.height = (rows * config.btnSize) + "px";

        component = {
            id: componentId,
            element: element,
            btnSize: config.btnSize,
            rows: rows,
            columns: columns,
            tools: tools,
            getWidth: function() {
                return columns * config.btnSize;
            },
            getHeight: function() {
                return rows * config.btnSize;
            },
            setActiveTool: function(tool) {
                setActiveTool(element, tool);
            },
            destroy: function() {
                destroy(component);
            }
        };

        renderButtons(component);
        container.appendChild(element);
        setActiveTool(element, getCurrentPaintToolMode());

        global.addEventListener("paint-tools-change", function(event) {
            setActiveTool(element, event.detail && event.detail.mode);
        });

        return component;
    }

    function renderButtons(component) {
        component.tools.forEach(function(tool) {
            var button = document.createElement("div");

            button.className = "paint-tools-button";
            button.setAttribute("data-paint-tool", tool);
            button.style.width = component.btnSize + "px";
            button.style.height = component.btnSize + "px";
            button.title = tool;
            button.innerHTML = getToolLabelHtml(tool);
            button.addEventListener("click", function() {
                if (global.PaintTools) {
                    global.PaintTools.use(tool);
                }
            });
            component.element.appendChild(button);
        });
    }

    function getToolLabelHtml(tool) {
        return String(tool).split("-").map(function(part) {
            return '<span class="paint-tools-button-line">' + escapeHtml(part) + '</span>';
        }).join("");
    }

    function setActiveTool(element, activeTool) {
        var buttons = element.querySelectorAll("[data-paint-tool]");
        var i;
        var button;

        for (i = 0; i < buttons.length; i++) {
            button = buttons[i];
            button.className = button.className.replace(/\s?paint-tools-button-active/g, "");

            if (button.getAttribute("data-paint-tool") === activeTool) {
                button.className += " paint-tools-button-active";
            }
        }
    }

    function getCurrentPaintToolMode() {
        if (global.PaintTools && global.PaintTools.getMode) {
            return global.PaintTools.getMode();
        }

        return "";
    }

    function getPaintToolModes() {
        var modes = [];
        var key;

        if (!global.PaintTools || !global.PaintTools.modes) {
            return modes;
        }

        for (key in global.PaintTools.modes) {
            if (Object.prototype.hasOwnProperty.call(global.PaintTools.modes, key)) {
                modes.push(global.PaintTools.modes[key]);
            }
        }

        return modes;
    }

    function repeatGridTrack(count, size) {
        var tracks = [];
        var i;

        for (i = 0; i < count; i++) {
            tracks.push(size + "px");
        }

        return tracks.join(" ");
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "paint-tools-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("PaintTools container not found: " + containerId);
        }

        return container;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.PaintToolsComponent = PaintToolsComponent;
    global.paintTools = PaintToolsComponent;

}(window));
