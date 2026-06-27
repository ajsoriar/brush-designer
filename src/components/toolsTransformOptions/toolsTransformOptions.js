(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false,
        operation: "scale",
        algorithm: null,
        onChange: null,
        onAlgorithmChange: null,
        onRoundBehaviorChange: null,
        onAccept: null,
        onCancel: null
    };
    var OPERATIONS = [
        { value: "scale", label: "Scale" },
        { value: "rotate", label: "Rotate" },
        { value: "skew", label: "Skew" },
        { value: "distort", label: "Distort" },
        { value: "perspective", label: "Perspective" },
        { value: "warp", label: "Warp" },
        { separator: true },
        { value: "rotate-180", label: "Rotate 180\u00B0" },
        { value: "rotate-90-cw", label: "Rotate 90\u00B0 CW" },
        { value: "rotate-90-ccw", label: "Rotate 90\u00B0 CCW" },
        { separator: true },
        { value: "flip-horizontal", label: "Flip Horizontal" },
        { value: "flip-vertical", label: "Flip Vertical" }
    ];
    var ALGORITHM_GROUPS = {
        scale: [
            { value: "nearest-neighbor", label: "Nearest", title: "Nearest Neighbor (no antialiasing)" },
            { value: "bilinear", label: "Bilinear", title: "Bilinear interpolation" },
            { value: "bicubic", label: "Bicubic", title: "Bicubic interpolation" },
            { value: "lo-fi", label: "Lo-Fi", title: "Fast low-resolution sample skipping" },
            { value: "pixel-art", label: "Pixel Art", title: "Integer pixel-art scaling" },
            { value: "area-average", label: "Area Average", title: "Area-average resampling" }
        ],
        rotate: [
            { value: "smooth", label: "Smooth", title: "Fast canvas interpolation" },
            { value: "nearest-neighbor", label: "Nearest", title: "Hard pixel edges" },
            { value: "lo-fi", label: "Lo-Fi", title: "Low-resolution block sampling" }
        ],
        skew: [
            { value: "smooth", label: "Smooth", title: "Fast canvas interpolation" },
            { value: "nearest-neighbor", label: "Nearest", title: "Hard pixel edges" },
            { value: "lo-fi", label: "Lo-Fi", title: "Low-resolution block sampling" }
        ],
        distort: [
            { value: "pixel-warp", label: "Pixel Warp", title: "Warping by pixel" },
            { value: "projective", label: "Projective", title: "Projective homography" },
            { value: "adaptive-mesh", label: "Adaptive", title: "Adaptive subdivision" },
            { value: "triangle-mesh", label: "Triangle Mesh", title: "Triangle mesh" },
            { value: "vertical-strips", label: "Strips", title: "Vertical strips" },
            { value: "two-triangles", label: "2 Triangles", title: "Two large triangles" }
        ],
        perspective: [
            { value: "projective", label: "Projective", title: "True projective homography" },
            { value: "pixel-warp", label: "Pixel Warp", title: "Per-pixel inverse mapping" },
            { value: "two-triangles", label: "2 Triangles", title: "Crude two-triangle perspective" }
        ],
        warp: [
            { value: "smooth", label: "Smooth", title: "Smooth 4 by 4 mesh warp" },
            { value: "nearest-neighbor", label: "Nearest", title: "Hard-edged 4 by 4 mesh warp" },
            { value: "lo-fi", label: "Lo-Fi", title: "Low-resolution 4 by 4 mesh warp" },
            { value: "high-quality", label: "High Quality", title: "Highly subdivided warp with fewer visible triangles" },
            { value: "shards", label: "Shards", title: "Crude fragmented warp with deliberate sampling seams" }
        ]
    };

    function ToolsTransformOptionsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var label = document.createElement("label");
        var select = document.createElement("select");
        var controls = document.createElement("div");
        var operationGroup = document.createElement("div");
        var algorithmsGroup = document.createElement("div");
        var actionsGroup = document.createElement("div");
        var cancelButton = document.createElement("button");
        var acceptButton = document.createElement("button");
        var algorithmInputs = {};
        var roundBehaviorInput = null;
        var roundBehavior = false;
        var componentId = config.id || ("tools-transform-options-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "tools-transform-options";
        legend.textContent = "Transform";
        label.htmlFor = componentId + "-operation";
        label.textContent = "Operation";
        select.id = label.htmlFor;
        select.className = "tools-transform-options-select";
        buildOptions(select);

        controls.className = "tools-transform-options-controls";
        operationGroup.className = "tools-transform-options-operation";
        algorithmsGroup.className = "tools-transform-options-algorithms";
        actionsGroup.className = "tools-transform-options-actions";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        acceptButton.type = "button";
        acceptButton.textContent = "Accept";
        actionsGroup.appendChild(cancelButton);
        actionsGroup.appendChild(acceptButton);
        operationGroup.appendChild(label);
        operationGroup.appendChild(select);
        controls.appendChild(operationGroup);
        controls.appendChild(algorithmsGroup);
        controls.appendChild(actionsGroup);
        element.appendChild(legend);
        element.appendChild(controls);
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
            setOperation: function(operation) {
                select.value = normalizeOperation(operation);
                algorithmInputs = buildAlgorithmRadios(
                    algorithmsGroup,
                    componentId,
                    select.value,
                    algorithmInputs
                );
                roundBehaviorInput = buildRoundBehaviorControl(
                    algorithmsGroup,
                    componentId,
                    select.value,
                    roundBehavior
                );
                bindCurrentAlgorithmRadios();
                bindRoundBehaviorControl();
            },
            getOperation: function() {
                return select.value;
            },
            setAlgorithm: function(algorithm) {
                var normalized = normalizeAlgorithm(select.value, algorithm);

                if (normalized && algorithmInputs[normalized]) {
                    algorithmInputs[normalized].checked = true;
                }
            },
            getAlgorithm: function() {
                return readAlgorithm(algorithmInputs);
            },
            setRoundBehavior: function(active) {
                roundBehavior = !!active;
                if (roundBehaviorInput) {
                    roundBehaviorInput.checked = roundBehavior;
                }
            },
            getRoundBehavior: function() {
                return roundBehavior;
            }
        };

        component.setOperation(config.operation);
        component.setAlgorithm(config.algorithm);
        component.setVisible(!!config.visible);

        select.addEventListener("change", function() {
            component.setOperation(select.value);
            notifyOperationChange(select.value);
            if (typeof config.onChange === "function") {
                config.onChange(select.value, component);
            }
        });
        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(component);
            }
        });
        acceptButton.addEventListener("click", function() {
            if (typeof config.onAccept === "function") {
                config.onAccept(component);
            }
        });

        return component;

        function bindCurrentAlgorithmRadios() {
            bindAlgorithmRadios(algorithmInputs, function(algorithm) {
                notifyAlgorithmChange(algorithm);
                if (typeof config.onAlgorithmChange === "function") {
                    config.onAlgorithmChange(algorithm, component);
                }
            });
        }

        function bindRoundBehaviorControl() {
            if (!roundBehaviorInput) {
                return;
            }
            roundBehaviorInput.addEventListener("change", function() {
                roundBehavior = roundBehaviorInput.checked;
                if (typeof config.onRoundBehaviorChange === "function") {
                    config.onRoundBehaviorChange(roundBehavior, component);
                }
            });
        }
    }

    function buildOptions(select) {
        var i;
        var item;
        var option;

        for (i = 0; i < OPERATIONS.length; i += 1) {
            item = OPERATIONS[i];
            option = document.createElement("option");

            if (item.separator) {
                option.disabled = true;
                option.className = "tools-transform-options-separator";
                option.textContent = "----------------";
            } else {
                option.value = item.value;
                option.textContent = item.label;
            }

            select.appendChild(option);
        }
    }

    function normalizeOperation(operation) {
        var i;

        for (i = 0; i < OPERATIONS.length; i += 1) {
            if (OPERATIONS[i].value === operation) {
                return operation;
            }
        }

        return DEFAULTS.operation;
    }

    function buildAlgorithmRadios(container, componentId, operation, previousInputs) {
        var groupName = componentId + "-algorithm";
        var algorithms = getAlgorithms(operation);
        var previousAlgorithm = readAlgorithm(previousInputs || {});
        var inputs = {};

        container.innerHTML = "";
        container.style.display = algorithms.length ? "grid" : "none";
        algorithms.forEach(function(item) {
            var label = document.createElement("label");
            var input = document.createElement("input");

            label.className = "tools-transform-options-algorithm";
            input.type = "radio";
            input.name = groupName;
            input.value = item.value;
            input.title = item.title;
            label.title = item.title;
            label.appendChild(input);
            label.appendChild(document.createTextNode(item.label));
            container.appendChild(label);
            inputs[item.value] = input;
        });
        if (algorithms.length) {
            inputs[normalizeAlgorithm(operation, previousAlgorithm)].checked = true;
        }
        return inputs;
    }

    function bindAlgorithmRadios(inputs, onChange) {
        Object.keys(inputs).forEach(function(key) {
            inputs[key].addEventListener("change", function() {
                if (inputs[key].checked) {
                    onChange(key);
                }
            });
        });
    }

    function buildRoundBehaviorControl(container, componentId, operation, active) {
        var label;
        var input;

        if (operation !== "warp") {
            return null;
        }

        label = document.createElement("label");
        input = document.createElement("input");
        label.className = "tools-transform-options-algorithm tools-transform-options-round";
        label.title = "Use the 16 handles as bicubic Bezier controls for a rounded warp";
        input.type = "checkbox";
        input.id = componentId + "-round-behavior";
        input.checked = !!active;
        label.appendChild(input);
        label.appendChild(document.createTextNode("Round behaviour"));
        container.appendChild(label);
        return input;
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

    function normalizeAlgorithm(operation, algorithm) {
        var algorithms = getAlgorithms(operation);
        var valid = algorithms.some(function(item) {
            return item.value === algorithm;
        });

        return valid ? algorithm : (algorithms.length ? algorithms[0].value : null);
    }

    function getAlgorithms(operation) {
        return ALGORITHM_GROUPS[operation] || [];
    }

    function notifyOperationChange(operation) {
        var detail = {
            operation: operation
        };
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("tools-transform-operation-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("tools-transform-operation-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function notifyAlgorithmChange(algorithm) {
        var detail = {
            algorithm: algorithm
        };
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("tools-transform-algorithm-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("tools-transform-algorithm-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "flex" : "none";
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("ToolsTransformOptions container not found: " + containerId);
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

    global.ToolsTransformOptionsComponent = ToolsTransformOptionsComponent;
    global.toolsTransformOptions = ToolsTransformOptionsComponent;

}(window));
