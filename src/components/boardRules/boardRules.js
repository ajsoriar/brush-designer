(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 800,
        height: 600,
        ruleSize: 24,
        units: "px",
        zoom: 1,
        pixelsPerInch: 96
    };

    var UNIT_CONFIG = {
        px: {
            label: "px",
            pixelsPerUnit: 1,
            majorSteps: [50, 100, 200, 500, 1000],
            minorDivisions: 10,
            precision: 0
        },
        cm: {
            label: "cm",
            pixelsPerUnit: null,
            majorSteps: [1, 2, 5, 10, 20, 50],
            minorDivisions: 10,
            precision: 1
        }
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

    function BoardRules(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var id = config.id || ("board-rules-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var corner = document.createElement("div");
        var topRule = document.createElement("div");
        var leftRule = document.createElement("div");
        var component;

        element.id = id;
        element.className = "board-rules";
        element.setAttribute("data-board-rules", "true");

        corner.className = "board-rules-corner";
        topRule.className = "board-rules-rule board-rules-rule-horizontal";
        leftRule.className = "board-rules-rule board-rules-rule-vertical";

        element.appendChild(corner);
        element.appendChild(topRule);
        element.appendChild(leftRule);
        container.appendChild(element);

        component = {
            id: id,
            element: element,
            container: container,
            cornerElement: corner,
            topRuleElement: topRule,
            leftRuleElement: leftRule,
            ruleSize: config.ruleSize,
            units: normalizeUnits(config.units),
            zoom: config.zoom,
            pixelsPerInch: config.pixelsPerInch,
            width: config.width,
            height: config.height,
            boardElement: null,
            setBoardElement: function(boardElement) {
                setBoardElement(component, boardElement);
            },
            setDocumentSize: function(width, height) {
                setDocumentSize(component, width, height);
            },
            setSize: function(width, height) {
                setDocumentSize(component, width, height);
            },
            setUnits: function(units) {
                setUnits(component, units);
            },
            setZoom: function(zoom) {
                setZoom(component, zoom);
            },
            update: function() {
                update(component);
            }
        };

        element._boardRules = component;
        setup(component);
        update(component);

        return component;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "board-rules-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("BoardRules container not found: " + containerId);
        }

        return container;
    }

    function setup(component) {
        component.container.className += component.container.className.indexOf("board-rules-viewport") === -1 ? " board-rules-viewport" : "";
        component.cornerElement.style.height = component.ruleSize + "px";
        component.cornerElement.style.width = component.ruleSize + "px";
        component.topRuleElement.style.left = component.ruleSize + "px";
        component.topRuleElement.style.height = component.ruleSize + "px";
        component.leftRuleElement.style.top = component.ruleSize + "px";
        component.leftRuleElement.style.width = component.ruleSize + "px";

        component.container.addEventListener("scroll", function() {
            update(component);
        });

        if (global.ResizeObserver) {
            component.resizeObserver = new global.ResizeObserver(function() {
                update(component);
            });
            component.resizeObserver.observe(component.container);
        } else {
            global.addEventListener("resize", function() {
                update(component);
            });
        }
    }

    function setBoardElement(component, boardElement) {
        component.boardElement = boardElement;

        if (boardElement) {
            boardElement._boardRules = component;
        }

        update(component);
    }

    function setDocumentSize(component, width, height) {
        component.width = width;
        component.height = height;
        update(component);
    }

    function setUnits(component, units) {
        component.units = normalizeUnits(units);
        update(component);
    }

    function setZoom(component, zoom) {
        component.zoom = Math.max(0.01, parseFloat(zoom) || 1);
        update(component);
    }

    function normalizeUnits(units) {
        return UNIT_CONFIG[units] ? units : "px";
    }

    function update(component) {
        var viewportWidth = component.container.clientWidth || 0;
        var viewportHeight = component.container.clientHeight || 0;
        var ruleSize = component.ruleSize;
        var boardOffset = getBoardOffset(component);

        component.topRuleElement.style.width = Math.max(0, viewportWidth - ruleSize) + "px";
        component.leftRuleElement.style.height = Math.max(0, viewportHeight - ruleSize) + "px";

        renderHorizontalRule(component, boardOffset.x - ruleSize, Math.max(0, viewportWidth - ruleSize));
        renderVerticalRule(component, boardOffset.y - ruleSize, Math.max(0, viewportHeight - ruleSize));
    }

    function getBoardOffset(component) {
        var boardRect;
        var containerRect;

        if (!component.boardElement || !component.boardElement.getBoundingClientRect) {
            return {
                x: component.ruleSize,
                y: component.ruleSize
            };
        }

        boardRect = component.boardElement.getBoundingClientRect();
        containerRect = component.container.getBoundingClientRect();

        return {
            x: boardRect.left - containerRect.left,
            y: boardRect.top - containerRect.top
        };
    }

    function renderHorizontalRule(component, boardX, width) {
        component.topRuleElement.innerHTML = getRuleFragments(component, "horizontal", boardX, width);
    }

    function renderVerticalRule(component, boardY, height) {
        component.leftRuleElement.innerHTML = getRuleFragments(component, "vertical", boardY, height);
    }

    function getRuleFragments(component, orientation, boardOffset, visibleLength) {
        var scale = getUnitScale(component);
        var majorStep = getMajorStep(component, scale);
        var minorStep = majorStep / scale.minorDivisions;
        var startValue = Math.floor((-boardOffset / component.zoom) / scale.pixelsPerUnit / minorStep) * minorStep;
        var endValue = ((visibleLength - boardOffset) / component.zoom / scale.pixelsPerUnit) + minorStep;
        var fragments = [];
        var value;
        var pixel;
        var index;

        for (value = startValue, index = 0; value <= endValue && index < 2000; value += minorStep, index += 1) {
            pixel = boardOffset + (value * scale.pixelsPerUnit * component.zoom);

            if (pixel >= -1 && pixel <= visibleLength + 1) {
                fragments.push(getTickString(component, orientation, pixel, value, isMajorTick(value, majorStep, minorStep), scale));
            }
        }

        return fragments.join("");
    }

    function getUnitScale(component) {
        var scale = extend({}, UNIT_CONFIG[component.units]);

        if (component.units === "cm") {
            scale.pixelsPerUnit = component.pixelsPerInch / 2.54;
        }

        return scale;
    }

    function getMajorStep(component, scale) {
        var minimumMajorPixels = 44;
        var i;

        for (i = 0; i < scale.majorSteps.length; i += 1) {
            if (scale.majorSteps[i] * scale.pixelsPerUnit * component.zoom >= minimumMajorPixels) {
                return scale.majorSteps[i];
            }
        }

        return scale.majorSteps[scale.majorSteps.length - 1];
    }

    function isMajorTick(value, majorStep, minorStep) {
        var ratio = value / majorStep;

        return Math.abs(ratio - Math.round(ratio)) < (minorStep / majorStep / 2);
    }

    function getTickString(component, orientation, pixel, value, major, scale) {
        var medium = !major && isMediumTick(component, value, scale);
        var size = major ? 13 : (medium ? 9 : 5);
        var roundedPixel = Math.round(pixel);
        var label = major ? getLabelString(orientation, roundedPixel, value, scale) : "";

        if (orientation === "horizontal") {
            return "<span class=\"board-rules-tick\" style=\"left:" + roundedPixel + "px;bottom:0;height:" + size + "px;\"></span>" + label;
        }

        return "<span class=\"board-rules-tick\" style=\"top:" + roundedPixel + "px;right:0;width:" + size + "px;\"></span>" + label;
    }

    function isMediumTick(component, value, scale) {
        var mediumStep = getMajorStep(component, scale) / 2;
        var ratio = value / mediumStep;

        return Math.abs(ratio - Math.round(ratio)) < 0.0001;
    }

    function getLabelString(orientation, pixel, value, scale) {
        var label = formatValue(value, scale);

        if (orientation === "horizontal") {
            return "<span class=\"board-rules-label\" style=\"left:" + (pixel + 3) + "px;\">" + label + "</span>";
        }

        return "<span class=\"board-rules-label\" style=\"top:" + (pixel + 3) + "px;\">" + label + "</span>";
    }

    function formatValue(value, scale) {
        if (scale.precision === 0) {
            return String(Math.round(value));
        }

        return String(Math.round(value * 10) / 10);
    }

    global.BoardRules = BoardRules;
    global.boardRules = BoardRules;

}(window));
