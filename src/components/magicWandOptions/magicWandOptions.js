(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        visible: false
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

    function clampTolerance(value) {
        var numeric = parseInt(value, 10);

        if (isNaN(numeric)) {
            return 0;
        }

        return Math.max(0, Math.min(100, numeric));
    }

    var MODES = [
        {
            value: "photoshop",
            label: "Photoshop"
        },
        {
            value: "fast",
            label: "Fast"
        },
        {
            value: "perceptual",
            label: "Perceptual"
        }
    ];
    var DEFAULT_MODE = "photoshop";

    function normalizeMode(value) {
        var i;

        for (i = 0; i < MODES.length; i++) {
            if (MODES[i].value === value) {
                return value;
            }
        }

        return DEFAULT_MODE;
    }

    function MagicWandOptionsComponent(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");
        var toleranceLabel = document.createElement("span");
        var toleranceRange = document.createElement("input");
        var toleranceNumber = document.createElement("input");
        var antiAliasLabel = document.createElement("label");
        var antiAliasInput = document.createElement("input");
        var contiguousLabel = document.createElement("label");
        var contiguousInput = document.createElement("input");
        var modeGroup = document.createElement("span");
        var modeInputs = {};
        var componentId = config.id || ("magic-wand-options-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "magic-wand-options";
        legend.textContent = "Magic Wand";

        grid.className = "magic-wand-options-grid";

        toleranceLabel.className = "magic-wand-options-label";
        toleranceLabel.textContent = "Tolerance";

        toleranceRange.className = "magic-wand-options-range";
        toleranceRange.type = "range";
        toleranceRange.min = "0";
        toleranceRange.max = "100";
        toleranceRange.step = "1";

        toleranceNumber.className = "magic-wand-options-number";
        toleranceNumber.type = "number";
        toleranceNumber.min = "0";
        toleranceNumber.max = "100";
        toleranceNumber.step = "1";
        toleranceNumber.title = "Tolerance";

        antiAliasLabel.className = "magic-wand-options-check";
        antiAliasInput.type = "checkbox";
        antiAliasInput.title = "Anti-alias";
        antiAliasLabel.appendChild(antiAliasInput);
        antiAliasLabel.appendChild(document.createTextNode("Anti-alias"));

        contiguousLabel.className = "magic-wand-options-check";
        contiguousInput.type = "checkbox";
        contiguousInput.title = "Contiguous";
        contiguousLabel.appendChild(contiguousInput);
        contiguousLabel.appendChild(document.createTextNode("Contiguous"));

        modeGroup.className = "magic-wand-options-modes";
        buildModeRadios(modeGroup, modeInputs, componentId);

        grid.appendChild(toleranceLabel);
        grid.appendChild(toleranceRange);
        grid.appendChild(toleranceNumber);
        grid.appendChild(antiAliasLabel);
        grid.appendChild(contiguousLabel);
        grid.appendChild(modeGroup);

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
                setOptionsOnInputs(nextOptions);
            },
            getOptions: function() {
                return readOptionsFromInputs();
            }
        };

        setOptionsOnInputs(getCurrentMagicWandOptions());
        component.setVisible(!!config.visible);

        toleranceRange.addEventListener("input", function() {
            updateTolerance(clampTolerance(toleranceRange.value));
        });

        toleranceNumber.addEventListener("input", function() {
            updateTolerance(clampTolerance(toleranceNumber.value));
        });

        antiAliasInput.addEventListener("change", function() {
            if (global.PaintTools && global.PaintTools.setMagicWandAntiAlias) {
                global.PaintTools.setMagicWandAntiAlias(antiAliasInput.checked);
            }
        });

        contiguousInput.addEventListener("change", function() {
            if (global.PaintTools && global.PaintTools.setMagicWandContiguous) {
                global.PaintTools.setMagicWandContiguous(contiguousInput.checked);
            }
        });

        bindModeRadios(modeInputs, function(mode) {
            if (global.PaintTools && global.PaintTools.setMagicWandMode) {
                global.PaintTools.setMagicWandMode(mode);
            }
        });

        global.addEventListener("paint-magic-wand-options-change", function(event) {
            setOptionsOnInputs(event.detail || {});
        });

        return component;

        function updateTolerance(value) {
            setOptionsOnInputs({
                tolerance: value,
                antiAlias: antiAliasInput.checked,
                contiguous: contiguousInput.checked
            });

            if (global.PaintTools && global.PaintTools.setMagicWandTolerance) {
                global.PaintTools.setMagicWandTolerance(value);
            }
        }

        function setOptionsOnInputs(nextOptions) {
            var safeTolerance = clampTolerance(nextOptions && nextOptions.tolerance);
            var mode = normalizeMode(nextOptions && nextOptions.mode);

            toleranceRange.value = String(safeTolerance);
            toleranceNumber.value = String(safeTolerance);
            antiAliasInput.checked = !!(nextOptions && nextOptions.antiAlias);
            contiguousInput.checked = !!(nextOptions && nextOptions.contiguous);

            if (modeInputs[mode]) {
                modeInputs[mode].checked = true;
            }
        }

        function readOptionsFromInputs() {
            return {
                tolerance: clampTolerance(toleranceRange.value),
                antiAlias: !!antiAliasInput.checked,
                contiguous: !!contiguousInput.checked,
                mode: readSelectedMode(modeInputs)
            };
        }
    }

    function buildModeRadios(modeGroup, modeInputs, componentId) {
        var groupName = componentId + "-mode";
        var i;
        var label;
        var input;

        for (i = 0; i < MODES.length; i++) {
            label = document.createElement("label");
            label.className = "magic-wand-options-mode";
            input = document.createElement("input");
            input.type = "radio";
            input.name = groupName;
            input.value = MODES[i].value;
            input.title = MODES[i].label;
            label.appendChild(input);
            label.appendChild(document.createTextNode(MODES[i].label));
            modeGroup.appendChild(label);
            modeInputs[MODES[i].value] = input;
        }
    }

    function bindModeRadios(modeInputs, onChange) {
        var key;

        for (key in modeInputs) {
            if (Object.prototype.hasOwnProperty.call(modeInputs, key)) {
                bindModeRadio(modeInputs[key], onChange);
            }
        }
    }

    function bindModeRadio(input, onChange) {
        input.addEventListener("change", function() {
            if (input.checked) {
                onChange(input.value);
            }
        });
    }

    function readSelectedMode(modeInputs) {
        var key;

        for (key in modeInputs) {
            if (Object.prototype.hasOwnProperty.call(modeInputs, key) && modeInputs[key].checked) {
                return key;
            }
        }

        return DEFAULT_MODE;
    }

    function setVisible(element, visible) {
        element.style.display = visible ? "block" : "none";
    }

    function getCurrentMagicWandOptions() {
        if (!global.PaintTools) {
            return {
                tolerance: 32,
                antiAlias: true,
                contiguous: true,
                mode: DEFAULT_MODE
            };
        }

        if (global.PaintTools.getMagicWandOptions) {
            return global.PaintTools.getMagicWandOptions();
        }

        return {
            tolerance: 32,
            antiAlias: true,
            contiguous: true,
            mode: DEFAULT_MODE
        };
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("MagicWandOptions container not found: " + containerId);
        }

        return container;
    }

    global.MagicWandOptionsComponent = MagicWandOptionsComponent;
    global.magicWandOptions = MagicWandOptionsComponent;

}(window));
