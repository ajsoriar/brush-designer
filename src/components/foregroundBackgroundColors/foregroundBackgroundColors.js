(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        frontColor: "#000000",
        backgroundColor: "#ffffff",
        onChange: null,
        onFrontClick: null,
        onBackgroundClick: null
    };

    function ForegroundBackgroundColors(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var backgroundSwatch = document.createElement("div");
        var frontSwatch = document.createElement("div");
        var auxiliaryPrimary = document.createElement("div");
        var auxiliarySecondary = document.createElement("div");
        var component;

        container.classList.add("foreground-background-colors-container");
        element.id = config.id || ("foreground-background-colors-" + Date.now());
        element.className = "foreground-background-colors";
        element.title = "Foreground and background colors";
        backgroundSwatch.className = "foreground-background-colors-swatch foreground-background-colors-background";
        frontSwatch.className = "foreground-background-colors-swatch foreground-background-colors-front";
        backgroundSwatch.setAttribute("role", "button");
        backgroundSwatch.setAttribute("tabindex", "0");
        backgroundSwatch.title = "Open background color picker";
        frontSwatch.setAttribute("role", "button");
        frontSwatch.setAttribute("tabindex", "0");
        frontSwatch.title = "Open foreground color picker";
        auxiliaryPrimary.className = "foreground-background-colors-auxiliary foreground-background-colors-auxiliary-primary";
        auxiliarySecondary.className = "foreground-background-colors-auxiliary foreground-background-colors-auxiliary-secondary";
        auxiliaryPrimary.setAttribute("role", "button");
        auxiliaryPrimary.setAttribute("tabindex", "0");
        auxiliaryPrimary.title = "Swap foreground and background colors";
        auxiliarySecondary.setAttribute("role", "button");
        auxiliarySecondary.setAttribute("tabindex", "0");
        auxiliarySecondary.title = "Reset foreground and background colors";
        element.appendChild(backgroundSwatch);
        element.appendChild(frontSwatch);
        container.appendChild(element);
        container.appendChild(auxiliaryPrimary);
        container.appendChild(auxiliarySecondary);

        component = {
            id: element.id,
            element: element,
            getFrontColor: function() {
                return config.frontColor;
            },
            getBackgroundColor: function() {
                return config.backgroundColor;
            },
            setFrontColor: function(color, silent) {
                config.frontColor = normalizeColor(color, config.frontColor);
                render();
                notify(silent);
                return config.frontColor;
            },
            setBackgroundColor: function(color, silent) {
                config.backgroundColor = normalizeColor(color, config.backgroundColor);
                render();
                notify(silent);
                return config.backgroundColor;
            },
            setColors: function(frontColor, backgroundColor, silent) {
                config.frontColor = normalizeColor(frontColor, config.frontColor);
                config.backgroundColor = normalizeColor(backgroundColor, config.backgroundColor);
                render();
                notify(silent);
                return component.getColors();
            },
            getColors: function() {
                return {
                    frontColor: config.frontColor,
                    backgroundColor: config.backgroundColor
                };
            },
            destroy: function() {
                [element, auxiliaryPrimary, auxiliarySecondary].forEach(function(item) {
                    if (item.parentNode) {
                        item.parentNode.removeChild(item);
                    }
                });
            }
        };

        frontSwatch.addEventListener("click", openFrontColor);
        backgroundSwatch.addEventListener("click", openBackgroundColor);
        auxiliaryPrimary.addEventListener("click", swapColors);
        auxiliarySecondary.addEventListener("click", resetColors);
        auxiliarySecondary.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                resetColors();
            }
        });
        auxiliaryPrimary.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                swapColors();
            }
        });
        backgroundSwatch.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBackgroundColor();
            }
        });
        frontSwatch.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFrontColor();
            }
        });
        render();
        return component;

        function openFrontColor() {
            if (typeof config.onFrontClick === "function") {
                config.onFrontClick(config.frontColor, component);
            }
        }

        function openBackgroundColor() {
            if (typeof config.onBackgroundClick === "function") {
                config.onBackgroundClick(config.backgroundColor, component);
            }
        }

        function swapColors() {
            var previousFrontColor = config.frontColor;

            config.frontColor = config.backgroundColor;
            config.backgroundColor = previousFrontColor;
            render();
            notify(false);
        }

        function resetColors() {
            config.frontColor = DEFAULTS.frontColor;
            config.backgroundColor = DEFAULTS.backgroundColor;
            render();
            notify(false);
        }

        function render() {
            frontSwatch.style.backgroundColor = config.frontColor;
            backgroundSwatch.style.backgroundColor = config.backgroundColor;
        }

        function notify(silent) {
            if (!silent && typeof config.onChange === "function") {
                config.onChange(component.getColors(), component);
            }
        }
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ForegroundBackgroundColors container not found: " + containerId);
        }
        return container;
    }

    function normalizeColor(color, fallback) {
        var value = String(color || "").trim();

        return value || fallback;
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

    global.ForegroundBackgroundColors = ForegroundBackgroundColors;
    global.foregroundBackgroundColors = ForegroundBackgroundColors;

}(window));
