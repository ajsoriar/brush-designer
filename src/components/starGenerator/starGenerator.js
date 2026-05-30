(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 420,
        height: 560,
        current: {
            points: 5,
            outerRadius: 96,
            innerRadius: 44
        },
        minPoints: 3,
        maxPoints: 24,
        minRadius: 1,
        maxRadius: 180,
        onGenerate: null,
        onCancel: null,
        onChange: null
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

    function StarGenerator(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var current = normalizeCurrent(extend(extend({}, DEFAULTS.current), config.current || {}), config);
        var generatorId = config.id || ("star-generator-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var form = document.createElement("div");
        var fieldset = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var actions = document.createElement("div");
        var okButton = document.createElement("button");
        var cancelButton = document.createElement("button");
        var preview = document.createElement("canvas");
        var inputs;
        var component;

        element.id = generatorId;
        element.className = "star-generator";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";

        form.className = "star-generator-form";
        fieldset.className = "star-generator-options";
        legend.textContent = "Options";
        actions.className = "star-generator-actions";

        inputs = {
            outerRadius: createNumberInput(generatorId + "-outer-radius", current.outerRadius, config.minRadius, config.maxRadius, 1),
            innerRadius: createNumberInput(generatorId + "-inner-radius", current.innerRadius, config.minRadius, config.maxRadius, 1),
            points: createNumberInput(generatorId + "-points", current.points, config.minPoints, config.maxPoints, 1)
        };

        fieldset.appendChild(legend);
        fieldset.appendChild(createFieldRow("Radius 1:", inputs.outerRadius, "pixels"));
        fieldset.appendChild(createFieldRow("Radius 2:", inputs.innerRadius, "pixels"));
        fieldset.appendChild(createFieldRow("Points:", inputs.points, ""));

        okButton.type = "button";
        okButton.textContent = "OK";
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        actions.appendChild(okButton);
        actions.appendChild(cancelButton);

        form.appendChild(fieldset);
        form.appendChild(actions);

        preview.className = "star-generator-preview";
        preview.width = config.width;
        preview.height = config.height - 250;

        element.appendChild(form);
        element.appendChild(preview);
        container.appendChild(element);

        component = {
            id: generatorId,
            element: element,
            preview: preview,
            current: current,
            getWidth: function() {
                return config.width;
            },
            getHeight: function() {
                return config.height;
            },
            getImageDataUrl: function() {
                return createStarDataUrl(component.current);
            },
            setCurrent: function(nextCurrent) {
                setCurrent(component, inputs, nextCurrent, config);
            },
            destroy: function() {
                destroy(component);
            }
        };

        bindInput(inputs.outerRadius, "outerRadius", component, inputs, config);
        bindInput(inputs.innerRadius, "innerRadius", component, inputs, config);
        bindInput(inputs.points, "points", component, inputs, config);

        okButton.addEventListener("click", function() {
            generateStar(component, config);
        });

        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(component);
            }
        });

        renderPreview(component);

        return component;
    }

    function bindInput(input, key, component, inputs, config) {
        input.addEventListener("input", function() {
            var nextCurrent = extend({}, component.current);

            nextCurrent[key] = input.value;
            setCurrent(component, inputs, nextCurrent, config);
        });
    }

    function setCurrent(component, inputs, nextCurrent, config) {
        component.current = normalizeCurrent(extend(extend({}, component.current), nextCurrent || {}), config);
        inputs.outerRadius.value = component.current.outerRadius;
        inputs.innerRadius.value = component.current.innerRadius;
        inputs.points.value = component.current.points;
        renderPreview(component);

        if (typeof config.onChange === "function") {
            config.onChange(component.current, component);
        }
    }

    function normalizeCurrent(current, config) {
        var outerRadius = clamp(parseFloat(current.outerRadius), config.minRadius, config.maxRadius, DEFAULTS.current.outerRadius);
        var innerRadius = clamp(parseFloat(current.innerRadius), config.minRadius, config.maxRadius, DEFAULTS.current.innerRadius);

        return {
            points: Math.round(clamp(parseInt(current.points, 10), config.minPoints, config.maxPoints, DEFAULTS.current.points)),
            outerRadius: outerRadius,
            innerRadius: Math.min(innerRadius, outerRadius)
        };
    }

    function clamp(value, min, max, fallback) {
        if (isNaN(value)) {
            return fallback;
        }

        return Math.max(min, Math.min(value, max));
    }

    function createNumberInput(id, value, min, max, step) {
        var input = document.createElement("input");

        input.id = id;
        input.type = "number";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;

        return input;
    }

    function createFieldRow(labelText, input, unitText) {
        var row = document.createElement("div");
        var label = document.createElement("label");
        var unit = document.createElement("span");

        row.className = "star-generator-row";
        label.setAttribute("for", input.id);
        label.textContent = labelText;
        unit.textContent = unitText;

        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(unit);

        return row;
    }

    function renderPreview(component) {
        var canvas = component.preview;
        var context = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var centerX = Math.round(width / 2);
        var centerY = Math.round(height / 2);
        var maxPreviewRadius = Math.max(1, Math.min(width, height) / 2 - 18);
        var previewScale = Math.min(1, maxPreviewRadius / component.current.outerRadius);
        var previewCurrent = {
            points: component.current.points,
            outerRadius: component.current.outerRadius * previewScale,
            innerRadius: component.current.innerRadius * previewScale
        };

        context.clearRect(0, 0, width, height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        drawAxis(context, width, height, centerX, centerY);
        drawCircleGuide(context, centerX, centerY, previewCurrent.outerRadius, "#9ed8b4");
        drawCircleGuide(context, centerX, centerY, previewCurrent.innerRadius, "#4bb876");
        drawStar(context, centerX, centerY, previewCurrent, false);
    }

    function drawAxis(context, width, height, centerX, centerY) {
        context.save();
        context.strokeStyle = "#ff0000";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(centerX + 0.5, 0);
        context.lineTo(centerX + 0.5, height);
        context.moveTo(0, centerY + 0.5);
        context.lineTo(width, centerY + 0.5);
        context.stroke();
        context.restore();
    }

    function drawCircleGuide(context, x, y, radius, color) {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    }

    function drawStar(context, x, y, current, fill) {
        var vertices = getStarVertices(x, y, current);
        var i;

        context.save();
        context.beginPath();
        context.moveTo(vertices[0].x, vertices[0].y);

        for (i = 1; i < vertices.length; i++) {
            context.lineTo(vertices[i].x, vertices[i].y);
        }

        context.closePath();

        if (fill) {
            context.fillStyle = "#000000";
            context.fill();
        } else {
            context.strokeStyle = "#315cc5";
            context.lineWidth = 3;
            context.stroke();
            drawVertexHandles(context, vertices);
        }

        context.restore();
    }

    function drawVertexHandles(context, vertices) {
        var i;

        context.fillStyle = "#16c7b9";

        for (i = 0; i < vertices.length; i++) {
            context.fillRect(vertices[i].x - 2, vertices[i].y - 2, 4, 4);
        }
    }

    function getStarVertices(x, y, current) {
        var vertices = [];
        var total = current.points * 2;
        var angleStep = Math.PI / current.points;
        var startAngle = -Math.PI / 2;
        var i;
        var radius;
        var angle;

        for (i = 0; i < total; i++) {
            radius = i % 2 === 0 ? current.outerRadius : current.innerRadius;
            angle = startAngle + (i * angleStep);
            vertices.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }

        return vertices;
    }

    function createStarDataUrl(current) {
        var padding = 4;
        var size = Math.ceil((current.outerRadius * 2) + (padding * 2));
        var canvas = document.createElement("canvas");
        var context;

        canvas.width = size;
        canvas.height = size;
        context = canvas.getContext("2d");
        drawStar(context, size / 2, size / 2, current, true);

        return canvas.toDataURL("image/png");
    }

    function generateStar(component, config) {
        var dataUrl = component.getImageDataUrl();
        var image = new Image();

        image.onload = function() {
            if (typeof config.onGenerate === "function") {
                config.onGenerate({
                    dataUrl: dataUrl,
                    image: image,
                    current: extend({}, component.current)
                }, component);
            }
        };

        image.src = dataUrl;
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "star-generator-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("StarGenerator container not found: " + containerId);
        }

        return container;
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.StarGenerator = StarGenerator;
    global.starGenerator = StarGenerator;

}(window));
