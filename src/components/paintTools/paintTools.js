(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        btnSize: 75,
        rows: 2,
        tools: null
    };

    var TOOL_ICONS = {
        "SQUARED-POINTS": new URL("./icons/paint-tools_03.png", import.meta.url).href,
        "ROUND-POINTS": new URL("./icons/paint-tools_05.png", import.meta.url).href,
        "SQUARED-LINES": new URL("./icons/paint-tools_07.png", import.meta.url).href,
        "ROUND-LINES": new URL("./icons/paint-tools_09.png", import.meta.url).href,
        "STRAIGHT-LINE": new URL("./icons/paint-tools_lines.png", import.meta.url).href,
        "FILLED-SQUARES": new URL("./icons/paint-tools_12.png", import.meta.url).href,
        "FILLED-RECTANGLES": new URL("./icons/paint-tools_14.png", import.meta.url).href,
        "FILLED-CIRCLES": new URL("./icons/paint-tools_16.png", import.meta.url).href,
        "FILLED-OVALS": new URL("./icons/paint-tools_18.png", import.meta.url).href,
        "STROKED-SQUARES": new URL("./icons/paint-tools_33.png", import.meta.url).href,
        "STROKED-RECTANGLES": new URL("./icons/paint-tools_35.png", import.meta.url).href,
        "STROKED-CIRCLES": new URL("./icons/paint-tools_37.png", import.meta.url).href,
        "STROKED-OVALS": new URL("./icons/paint-tools_42.png", import.meta.url).href,
        "PAINT-BUCKET": new URL("./icons/paint-tools_40.png", import.meta.url).href,
        "PATTERN-BUCKET": new URL("./icons/paint-tools_40.png", import.meta.url).href,
        "INK-DROPPER": new URL("./icons/paint-tools_29.png", import.meta.url).href,
        "POINTER-TOOL": new URL("./icons/paint-tools_pointer.png", import.meta.url).href,
        "DESIGNED-BRUSH": new URL("./icons/paint-tools_31.png", import.meta.url).href,
        "DESIGNED-BRUSH-2": new URL("./icons/paint-tools_31.png", import.meta.url).href,
        "MAGIC-WAND": new URL("./icons/paint-tools_magic-wand.png", import.meta.url).href,
        "GRADIENT": new URL("./icons/paint-tools_gradient.png", import.meta.url).href,
        "STAR-GENERATOR": new URL("./icons/paint-tools_poligon-star.png", import.meta.url).href,
        "CROP-BOARD": new URL("./icons/paint-tools_crop.png", import.meta.url).href,
        "PENCIL-TOOL": new URL("./icons/paint-tools_pencil.png", import.meta.url).href,
        "TEXT": new URL("./icons/paint-tools_text.png", import.meta.url).href,
        "REMOVE": new URL("./icons/paint-tools_delete.png", import.meta.url).href
    };

    var TOOL_ACTIONS = {
        "POINTER-TOOL": function() {
            if (global.PaintTools && global.PaintTools.use) {
                global.PaintTools.use("POINTER-TOOL");
            }
        },
        "STAR-GENERATOR": function() {
            if (global.openStarGeneratorWindow) {
                global.openStarGeneratorWindow();
            }
        }
    };

    var SELECTION_TOOLS_SPRITE = new URL("./sprites/sprite-selection-tools.png", import.meta.url).href;

    var SELECTION_TOOL_BUTTONS = [
        {
            className: "selection-laso-tool",
            type: "freehand",
            label: "Lasso Selection"
        },
        {
            className: "selection-poligonal-tool",
            type: "polygonal",
            label: "Polygonal Selection"
        },
        {
            className: "selection-oval-tool",
            type: "oval",
            label: "Oval Selection"
        },
        {
            className: "selection-rectangle-tool",
            type: "rectangle",
            label: "Rectangle Selection"
        }
    ];

    var TOOL_LABELS = {
        "OLD-BRUSH": "Retro Brush",
        "PENCIL-TOOL": "Pencil",
        "PATTERN-BUCKET": "Pattern Bucket",
        "GRADIENT": "Gradient",
        "POINTER-TOOL": "Pointer",
        "STRAIGHT-LINE": "Line",
        "LASSO-SELECTION": "Lasso Selection",
        "MAGIC-WAND": "Magic Wand",
        "STAR-GENERATOR": "Star",
        "CROP-BOARD": "Crop Board",
        "TEXT": "Text",
        "REMOVE": "Remove"
    };

    var HIDDEN_TOOLS = {
        "FILLED-SQUARES": true,
        "FILLED-CIRCLES": true,
        "STROKED-SQUARES": true,
        "STROKED-CIRCLES": true
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
        element.style.setProperty("--paint-tools-button-size", config.btnSize + "px");

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
            var icon = TOOL_ICONS[tool];

            button.className = "paint-tools-button" + (icon ? "" : " paint-tools-button-no-icon");
            button.setAttribute("data-paint-tool", tool);
            button.title = tool;
            button.innerHTML = getToolButtonHtml(tool, icon);
            bindSelectionToolButtons(button, tool);
            button.addEventListener("click", function() {
                if (TOOL_ACTIONS[tool]) {
                    TOOL_ACTIONS[tool]();
                    return;
                }
                if (global.PaintTools) {
                    global.PaintTools.use(tool);
                }
            });
            component.element.appendChild(button);
        });
    }

    function bindSelectionToolButtons(button, tool) {
        var selectionButtons;
        var i;

        if (tool !== "LASSO-SELECTION") {
            return;
        }

        selectionButtons = button.querySelectorAll("[data-selection-tool]");

        for (i = 0; i < selectionButtons.length; i++) {
            selectionButtons[i].addEventListener("click", function(event) {
                event.stopPropagation();
                setSelectedSelectionTool(button, event.currentTarget);

                if (global.PaintTools) {
                    if (global.PaintTools.setSelectionTool) {
                        global.PaintTools.setSelectionTool(event.currentTarget.getAttribute("data-selection-tool"));
                    }
                    global.PaintTools.use("LASSO-SELECTION");
                }
            });
        }
    }

    function setSelectedSelectionTool(button, selectedButton) {
        var selectionButtons = button.querySelectorAll("[data-selection-tool]");
        var i;

        for (i = 0; i < selectionButtons.length; i++) {
            selectionButtons[i].className = selectionButtons[i].className.replace(/\s?paint-tools-selection-button-selected/g, "");
        }

        selectedButton.className += " paint-tools-selection-button-selected";
    }

    function getToolButtonHtml(tool, icon) {
        var html = '<span class="paint-tools-button-label">' + getToolLabelHtml(tool) + '</span>';

        if (tool === "LASSO-SELECTION") {
            return getSelectionToolsHtml();
        }

        if (icon) {
            html += '<span class="paint-tools-button-icon-wrap">' +
                '<img class="paint-tools-button-icon" src="' + escapeHtml(icon) + '" alt="" draggable="false">' +
                '</span>';
        }

        return html;
    }

    function getSelectionToolsHtml() {
        return '<span class="paint-tools-selection-grid">' +
            SELECTION_TOOL_BUTTONS.map(function(selectionTool, index) {
                return '<span class="paint-tools-selection-button ' + escapeHtml(selectionTool.className) + (index === 0 ? " paint-tools-selection-button-selected" : "") + '"' +
                    ' title="' + escapeHtml(selectionTool.label) + '"' +
                    ' data-selection-tool="' + escapeHtml(selectionTool.type) + '"' +
                    ' style="background-image:url(\'' + escapeHtml(SELECTION_TOOLS_SPRITE) + '\')"></span>';
            }).join("") +
            '</span>';
    }

    function getToolLabelHtml(tool) {
        return String(TOOL_LABELS[tool] || tool).split(/[ -]/).map(function(part) {
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
                if (!HIDDEN_TOOLS[global.PaintTools.modes[key]]) {
                    modes.push(global.PaintTools.modes[key]);
                }
            }
        }

        return modes;
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
