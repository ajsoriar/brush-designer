(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false
    };

    var SPRITE_URL = new URL("../paintTools/sprites/sprite-selection-tools.png", import.meta.url).href;
    var BEHAVIORS = [
        { type: "normal", className: "selection-behavior-normal", label: "Normal" },
        { type: "add", className: "selection-behavior-add", label: "Add" },
        { type: "remove", className: "selection-behavior-remove", label: "Remove" }
    ];

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function SelectionBehabiourComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var buttonsWrap = document.createElement("div");
        var componentId = config.id || ("selection-behabiour-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "selection-behabiour";
        legend.textContent = "Selection Behaviour";

        buttonsWrap.className = "selection-behabiour-buttons";
        element.appendChild(legend);
        element.appendChild(buttonsWrap);

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
            setActiveBehavior: function(behavior) {
                setSelectedBehavior(element, behavior);
            }
        };

        renderButtons(buttonsWrap, element);
        container.appendChild(element);
        setSelectedBehavior(element, getCurrentSelectionBehavior());
        component.setVisible(!!config.visible);

        global.addEventListener("paint-selection-behavior-change", function(event) {
            setSelectedBehavior(element, event.detail && event.detail.selectionBehavior);
        });

        return component;
    }

    function renderButtons(buttonsWrap, rootElement) {
        BEHAVIORS.forEach(function(item) {
            var button = document.createElement("button");

            button.type = "button";
            button.className = "sprite-div selection-behabiour-button " + item.className;
            button.title = item.label;
            button.setAttribute("aria-label", item.label);
            button.setAttribute("data-selection-behavior", item.type);
            button.style.backgroundImage = "url('" + SPRITE_URL + "')";

            button.addEventListener("click", function() {
                setSelectedBehavior(rootElement, item.type);

                if (global.PaintTools && global.PaintTools.setSelectionBehavior) {
                    global.PaintTools.setSelectionBehavior(item.type);
                }
            });

            buttonsWrap.appendChild(button);
        });
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "block" : "none";
    }

    function setSelectedBehavior(element, behavior) {
        var buttons = element.querySelectorAll("[data-selection-behavior]");
        var i;
        var current;

        for (i = 0; i < buttons.length; i++) {
            current = buttons[i];
            current.className = current.className.replace(/\s?selection-behabiour-button-selected/g, "");
            current.className = current.className.replace(/\s?selected/g, "");

            if (current.getAttribute("data-selection-behavior") === behavior) {
                current.className += " selected selection-behabiour-button-selected";
            }
        }
    }

    function getCurrentSelectionBehavior() {
        if (global.PaintTools && global.PaintTools.getSelectionBehavior) {
            return global.PaintTools.getSelectionBehavior();
        }

        return "normal";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("SelectionBehabiour container not found: " + containerId);
        }

        return container;
    }

    global.SelectionBehabiourComponent = SelectionBehabiourComponent;
    global.selectionBehabiour = SelectionBehabiourComponent;

}(window));
