(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false,
        feather: 0,
        antiAlias: true
    };
    var MAX_FEATHER = 200;

    function ToolsSelectFeatherComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");
        var featherLabel = document.createElement("label");
        var featherInput = document.createElement("input");
        var featherUnit = document.createElement("span");
        var antiAliasLabel = document.createElement("label");
        var antiAliasInput = document.createElement("input");
        var componentId = config.id || ("tools-select-feather-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "tools-select-feather";
        legend.textContent = "Selection";

        grid.className = "tools-select-feather-grid";

        featherLabel.className = "tools-select-feather-feather";
        featherLabel.appendChild(document.createTextNode("Feather:"));

        featherInput.className = "tools-select-feather-number";
        featherInput.type = "number";
        featherInput.min = "0";
        featherInput.max = String(MAX_FEATHER);
        featherInput.step = "1";
        featherInput.title = "Feather radius";

        featherUnit.className = "tools-select-feather-unit";
        featherUnit.textContent = "px";

        featherLabel.appendChild(featherInput);
        featherLabel.appendChild(featherUnit);

        antiAliasLabel.className = "tools-select-feather-check";
        antiAliasInput.type = "checkbox";
        antiAliasInput.title = "Anti-alias selection edges";
        antiAliasLabel.appendChild(antiAliasInput);
        antiAliasLabel.appendChild(document.createTextNode("Anti-alias"));

        grid.appendChild(featherLabel);
        grid.appendChild(antiAliasLabel);
        element.appendChild(legend);
        element.appendChild(grid);
        container.appendChild(element);

        component = {
            id: componentId,
            element: element,
            show: function() {
                setVisible(element, true);
            },
            hide: function() {
                setVisible(element, false);
            },
            setVisible: function(visible) {
                setVisible(element, visible);
            },
            isVisible: function() {
                return element.style.display !== "none";
            },
            setOptions: function(nextOptions) {
                setOptions(nextOptions);
            },
            getOptions: function() {
                return readOptions();
            }
        };

        setOptions(getCurrentSelectionFeatherOptions(config));
        applyPaintToolOptions();
        component.setVisible(!!config.visible);

        featherInput.addEventListener("input", function() {
            setOptions({
                feather: featherInput.value,
                antiAlias: antiAliasInput.checked
            });
            applyPaintToolOptions();
        });
        antiAliasInput.addEventListener("change", applyPaintToolOptions);

        global.addEventListener("paint-selection-feather-options-change", function(event) {
            setOptions(event.detail || {});
        });

        return component;

        function setOptions(nextOptions) {
            var safe = nextOptions || {};

            if (Object.prototype.hasOwnProperty.call(safe, "feather")) {
                featherInput.value = String(normalizeFeather(safe.feather));
            }
            if (Object.prototype.hasOwnProperty.call(safe, "antiAlias")) {
                antiAliasInput.checked = !!safe.antiAlias;
            }
        }

        function readOptions() {
            return {
                feather: normalizeFeather(featherInput.value),
                antiAlias: !!antiAliasInput.checked
            };
        }

        function applyPaintToolOptions() {
            var value = readOptions();

            if (global.PaintTools && global.PaintTools.setSelectionFeatherOptions) {
                global.PaintTools.setSelectionFeatherOptions(value);
            }
        }
    }

    function normalizeFeather(value) {
        var numeric = parseInt(value, 10);

        if (isNaN(numeric)) {
            return 0;
        }

        return Math.max(0, Math.min(MAX_FEATHER, numeric));
    }

    function getCurrentSelectionFeatherOptions(config) {
        if (global.PaintTools && global.PaintTools.getSelectionFeatherOptions) {
            return global.PaintTools.getSelectionFeatherOptions();
        }

        return {
            feather: normalizeFeather(config.feather),
            antiAlias: !!config.antiAlias
        };
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "flex" : "none";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ToolsSelectFeather container not found: " + containerId);
        }

        return container;
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

    global.ToolsSelectFeatherComponent = ToolsSelectFeatherComponent;
    global.toolsSelectFeather = ToolsSelectFeatherComponent;

}(window));