(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: true,
        active: false,
        algorithm: "random",
        jump: false,
        loop: false,
        onChange: null
    };
    var ALGORITHMS = [
        { value: "random", label: "Random" },
        { value: "picker-vertical", label: "Vertical" },
        { value: "picker-horizontal", label: "Horizontal" }
    ];
    var SETUPS = {
        "random-lines-crazy": {
            active: true,
            algorithm: "picker-horizontal",
            jump: false,
            loop: true
        }
    };

    function ToolsCrazyOptionsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");
        var toggleButton = document.createElement("button");
        var algorithmStack = document.createElement("div");
        var optionStack = document.createElement("div");
        var algorithmInputs = {};
        var jumpInput = createCheckbox(optionStack, "Jump");
        var loopInput = createCheckbox(optionStack, "Loop");
        var componentId = config.id || ("tools-crazy-options-" + Date.now());
        var setupResetOptions = null;
        var activeSetup = null;
        var component;

        container.classList.add("tools-crazy-options-container");
        element.id = componentId;
        element.className = "tools-crazy-options";
        legend.textContent = "Crazy";
        grid.className = "tools-crazy-options-grid";
        toggleButton.type = "button";
        toggleButton.className = "tools-crazy-options-toggle";
        toggleButton.textContent = "Rainbow Crazy Mode";
        algorithmStack.className = "tools-crazy-options-stack";
        optionStack.className = "tools-crazy-options-stack";
        buildAlgorithmRadios(algorithmStack, algorithmInputs, componentId);

        grid.appendChild(toggleButton);
        grid.appendChild(algorithmStack);
        grid.appendChild(optionStack);
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
            applySetup: function(setup) {
                return applySetup(setup);
            },
            resetSetup: function() {
                return resetSetup();
            },
            getActiveSetup: function() {
                return activeSetup;
            },
            getOptions: function() {
                return readOptions();
            }
        };

        setOptions(config);
        component.setVisible(!!config.visible);

        toggleButton.addEventListener("click", function() {
            setOptions({
                active: !readOptions().active
            });
            notifyChange();
        });
        bindAlgorithmRadios(algorithmInputs, function() {
            syncDependentInputs();
            notifyChange();
        });
        jumpInput.addEventListener("change", notifyChange);
        loopInput.addEventListener("change", notifyChange);

        return component;

        function setOptions(nextOptions) {
            var current = readOptions();
            var safe = nextOptions || {};
            var algorithm = normalizeAlgorithm(
                Object.prototype.hasOwnProperty.call(safe, "algorithm") ? safe.algorithm : current.algorithm
            );

            toggleButton.classList.toggle(
                "tools-crazy-options-toggle-on",
                Object.prototype.hasOwnProperty.call(safe, "active") ? !!safe.active : current.active
            );
            toggleButton.setAttribute(
                "aria-pressed",
                toggleButton.classList.contains("tools-crazy-options-toggle-on") ? "true" : "false"
            );
            toggleButton.title = "Rainbow Crazy Mode: " +
                (toggleButton.classList.contains("tools-crazy-options-toggle-on") ? "ON" : "OFF");
            algorithmInputs[algorithm].checked = true;
            jumpInput.checked = Object.prototype.hasOwnProperty.call(safe, "jump") ? !!safe.jump : current.jump;
            loopInput.checked = Object.prototype.hasOwnProperty.call(safe, "loop") ? !!safe.loop : current.loop;
            syncDependentInputs();
        }

        function readOptions() {
            return {
                active: toggleButton.classList.contains("tools-crazy-options-toggle-on"),
                algorithm: readAlgorithm(algorithmInputs),
                jump: !!jumpInput.checked,
                loop: !!loopInput.checked
            };
        }

        function syncDependentInputs() {
            var disabled = readAlgorithm(algorithmInputs) === "random";

            jumpInput.disabled = disabled;
            loopInput.disabled = disabled;
        }

        function notifyChange() {
            var value = readOptions();
            var event;

            if (typeof config.onChange === "function") {
                config.onChange(value, component);
            }

            if (typeof global.CustomEvent === "function") {
                event = new global.CustomEvent("tools-crazy-options-change", {
                    detail: value
                });
            } else {
                event = document.createEvent("CustomEvent");
                event.initCustomEvent("tools-crazy-options-change", false, false, value);
            }
            global.dispatchEvent(event);
        }

        function applySetup(setup) {
            var resolved = resolveSetup(setup);
            var current;

            if (!resolved) {
                return readOptions();
            }

            current = readOptions();
            resolved = extend({}, resolved);

            if (setup === "random-lines-crazy" &&
                    (current.algorithm === "picker-vertical" || current.algorithm === "picker-horizontal")) {
                resolved.algorithm = current.algorithm;
                resolved.jump = current.jump;
                resolved.loop = current.loop;
            }

            if (!setupResetOptions) {
                setupResetOptions = current;
            }

            activeSetup = typeof setup === "string" ? setup : null;
            setOptions(resolved);
            notifyChange();
            return readOptions();
        }

        function resetSetup() {
            if (!setupResetOptions) {
                return readOptions();
            }

            setOptions(setupResetOptions);
            setupResetOptions = null;
            activeSetup = null;
            notifyChange();
            return readOptions();
        }
    }

    function resolveSetup(setup) {
        if (typeof setup === "string") {
            return SETUPS[setup] || null;
        }

        if (setup && typeof setup === "object") {
            return setup;
        }

        return null;
    }

    function buildAlgorithmRadios(container, inputs, componentId) {
        var groupName = componentId + "-algorithm";

        ALGORITHMS.forEach(function(item) {
            var label = document.createElement("label");
            var input = document.createElement("input");

            input.type = "radio";
            input.name = groupName;
            input.value = item.value;
            label.appendChild(input);
            label.appendChild(document.createTextNode(item.label));
            container.appendChild(label);
            inputs[item.value] = input;
        });
    }

    function createCheckbox(container, text) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        input.type = "checkbox";
        label.appendChild(input);
        label.appendChild(document.createTextNode(text));
        container.appendChild(label);
        return input;
    }

    function bindAlgorithmRadios(inputs, onChange) {
        Object.keys(inputs).forEach(function(key) {
            inputs[key].addEventListener("change", function() {
                if (inputs[key].checked) {
                    onChange();
                }
            });
        });
    }

    function readAlgorithm(inputs) {
        var selected = DEFAULTS.algorithm;

        Object.keys(inputs).some(function(key) {
            if (inputs[key].checked) {
                selected = key;
                return true;
            }
            return false;
        });
        return selected;
    }

    function normalizeAlgorithm(algorithm) {
        var valid = ALGORITHMS.some(function(item) {
            return item.value === algorithm;
        });

        return valid ? algorithm : DEFAULTS.algorithm;
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "flex" : "none";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ToolsCrazyOptions container not found: " + containerId);
        }
        return container;
    }

    function extend(target, source) {
        Object.keys(source).forEach(function(key) {
            target[key] = source[key];
        });
        return target;
    }

    global.ToolsCrazyOptionsComponent = ToolsCrazyOptionsComponent;
    global.toolsCrazyOptions = ToolsCrazyOptionsComponent;

}(window));
