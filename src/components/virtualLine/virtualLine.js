(function(global) {

    "use strict";

    var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    var DEFAULTS = {
        width: 2,
        color: "#000000",
        opacity: 1,
        capStyle: "butt",
        dashArray: null,
        die: false
    };

    var instanceCounter = 0;

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function createSvgElement(tagName, className) {
        var element = document.createElementNS(SVG_NAMESPACE, tagName);

        if (className) {
            element.setAttribute("class", className);
        }

        return element;
    }

    function normalizeCapStyle(capStyle) {
        return capStyle === "round" || capStyle === "square" ? capStyle : "butt";
    }

    function normalizePoint(point) {
        return {
            x: Number(point && point.x) || 0,
            y: Number(point && point.y) || 0
        };
    }

    function applyLineAttributes(line, config) {
        var width = Math.max(0, Number(config.width) || 0);
        var opacity = typeof config.opacity === "number" ? config.opacity : 1;

        line.setAttribute("stroke", config.color || DEFAULTS.color);
        line.setAttribute("stroke-width", width);
        line.setAttribute("stroke-opacity", opacity);
        line.setAttribute("stroke-linecap", normalizeCapStyle(config.capStyle));

        if (Array.isArray(config.dashArray) && config.dashArray.length) {
            line.setAttribute("stroke-dasharray", config.dashArray.join(" "));
        }
    }

    function getContainer(target) {
        var container = typeof target === "string" ? document.querySelector(target) : target;

        if (!container) {
            throw new Error("VirtualLine target was not found.");
        }

        return container;
    }

    function VirtualLine(target, options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(target);
        var svg = createSvgElement("svg", "virtual-line-svg");
        var line = createSvgElement("line", "virtual-line-stroke");
        var from = null;
        var to = null;
        var destroyed = false;
        var id = "virtual-line-" + Date.now() + "-" + (instanceCounter += 1);
        var instance;

        svg.setAttribute("data-virtual-line-id", id);
        applyLineAttributes(line, config);
        svg.appendChild(line);

        function render() {
            if (!from || !to) {
                return;
            }

            line.setAttribute("x1", from.x);
            line.setAttribute("y1", from.y);
            line.setAttribute("x2", to.x);
            line.setAttribute("y2", to.y);
        }

        function mount() {
            if (!destroyed && svg.parentNode !== container) {
                container.appendChild(svg);
            }
        }

        instance = {
            id: id,
            element: svg,
            start: function(point) {
                from = normalizePoint(point);
                to = from;
                mount();
                render();
                return instance;
            },
            update: function(point) {
                if (!from) {
                    return instance;
                }

                to = normalizePoint(point);
                render();
                return instance;
            },
            finish: function(point) {
                var data;

                if (point) {
                    to = normalizePoint(point);
                    render();
                }

                data = instance.getLineData();

                if (!config.die) {
                    instance.destroy();
                }

                return data;
            },
            getLineData: function() {
                return {
                    id: id,
                    from: from ? { x: from.x, y: from.y } : null,
                    to: to ? { x: to.x, y: to.y } : null,
                    width: config.width,
                    color: config.color,
                    opacity: config.opacity,
                    capStyle: normalizeCapStyle(config.capStyle),
                    dashArray: Array.isArray(config.dashArray) ? config.dashArray.slice() : null
                };
            },
            isDestroyed: function() {
                return destroyed;
            },
            destroy: function() {
                if (destroyed) {
                    return;
                }

                destroyed = true;

                if (svg.parentNode) {
                    svg.parentNode.removeChild(svg);
                }
            }
        };

        return instance;
    }

    global.VirtualLine = VirtualLine;
    global.virtualLine = VirtualLine;

}(window));
