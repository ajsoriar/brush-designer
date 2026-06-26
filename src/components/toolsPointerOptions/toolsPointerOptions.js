(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false,
        autoSelectLayer: false,
        onChange: null
    };

    function ToolsPointerOptionsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");
        var autoSelectLabel = document.createElement("label");
        var autoSelectInput = document.createElement("input");
        var componentId = config.id || ("tools-pointer-options-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "tools-pointer-options";
        legend.textContent = "Pointer";

        grid.className = "tools-pointer-options-grid";

        autoSelectLabel.className = "tools-pointer-options-check";
        autoSelectInput.type = "checkbox";
        autoSelectInput.title = "Auto-Select Layer";
        autoSelectLabel.appendChild(autoSelectInput);
        autoSelectLabel.appendChild(document.createTextNode("Auto-Select Layer"));

        grid.appendChild(autoSelectLabel);
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

        setOptions(config);
        component.setVisible(!!config.visible);

        autoSelectInput.addEventListener("change", notifyChange);

        return component;

        function setOptions(nextOptions) {
            var safe = nextOptions || {};

            if (Object.prototype.hasOwnProperty.call(safe, "autoSelectLayer")) {
                autoSelectInput.checked = !!safe.autoSelectLayer;
            }
        }

        function readOptions() {
            return {
                autoSelectLayer: !!autoSelectInput.checked
            };
        }

        function notifyChange() {
            var value = readOptions();
            var event;

            if (typeof config.onChange === "function") {
                config.onChange(value, component);
            }

            if (typeof global.CustomEvent === "function") {
                event = new global.CustomEvent("tools-pointer-options-change", {
                    detail: value
                });
            } else {
                event = document.createEvent("CustomEvent");
                event.initCustomEvent("tools-pointer-options-change", false, false, value);
            }
            global.dispatchEvent(event);
        }
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "flex" : "none";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ToolsPointerOptions container not found: " + containerId);
        }
        return container;
    }

    function extend(target, source) {
        Object.keys(source).forEach(function(key) {
            target[key] = source[key];
        });
        return target;
    }

    global.ToolsPointerOptionsComponent = ToolsPointerOptionsComponent;
    global.toolsPointerOptions = ToolsPointerOptionsComponent;

}(window));