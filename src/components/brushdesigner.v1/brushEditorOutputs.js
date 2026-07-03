import defaultBrushesUrl from "./default-brushes.json?url";

(function(global) {

    "use strict";

    var DEFAULTS = {
        id: "brush-editor-outputs",
        defaultId: "brush-editor-default-outputs",
        containerId: null,
        toolbarElement: null,
        defaultBrushesUrl: defaultBrushesUrl,
        selectFirstOnReady: false,
        shouldSelectFirst: null,
        onCreateBrush: null,
        onSelect: null,
        onSizeChange: null
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

    function BrushEditorOutputs(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = getOrCreateElement(config.id);
        var defaultElement = getOrCreateElement(config.defaultId);
        var outputs;

        container.className = addClass(container.className, "brush-editor-outputs-container");
        defaultElement.className = addClass(defaultElement.className, "brush-editor-outputs-list brush-editor-outputs-default-list");
        element.className = addClass(element.className, "brush-editor-outputs-list brush-editor-outputs-user-list");
        container.appendChild(defaultElement);
        container.appendChild(element);

        outputs = {
            element: element,
            defaultElement: defaultElement,
            save: function() {
                save(outputs, config);
            },
            load: function() {
                load(outputs, config);
            },
            addImage: function(src) {
                addImage(outputs, src, null, config);
            },
            getWidth: function() {
                return getWidth(outputs);
            },
            getHeight: function() {
                return getHeight(outputs);
            },
            getSize: function() {
                return {
                    width: getWidth(outputs),
                    height: getHeight(outputs)
                };
            },
            selectFirstIfNone: function() {
                return selectFirstIfNone(outputs, config);
            },
            destroy: function() {
                destroy(outputs);
            }
        };

        renderDefaultBrushes(outputs, config);
        bindSelection(outputs, config);
        renderToolbar(outputs, config);
        global.brushEditorOutputs = outputs;

        return outputs;
    }

    function addClass(className, nextClassName) {
        return (className || "").indexOf(nextClassName) === -1 ?
            ((className ? className + " " : "") + nextClassName) :
            className;
    }

    function getContainer(containerId) {
        var container = containerId ? document.getElementById(containerId) : document.body;

        if (!container) {
            throw new Error("BrushEditorOutputs container not found: " + containerId);
        }

        return container;
    }

    function getOrCreateElement(id) {
        var element = document.getElementById(id);

        if (element) {
            return element;
        }

        element = document.createElement("ol");
        element.id = id;

        return element;
    }

    function renderToolbar(outputs, config) {
        var toolbar;
        var buttonRow;
        var sizeRow;
        var sizeRange;
        var sizeValue;
        var resetButton;
        var initialBrushWidth;

        if (!config.toolbarElement) {
            return;
        }

        initialBrushWidth = getCurrentDesignedBrushWidth();
        toolbar = document.createElement("div");
        toolbar.className = "wm-toolbar brush-editor-outputs-toolbar";
        buttonRow = document.createElement("div");
        buttonRow.className = "brush-editor-outputs-toolbar-row";
        buttonRow.appendChild(createToolbarButton("Create Brush", function() {
            if (typeof config.onCreateBrush === "function") {
                config.onCreateBrush(outputs);
            }
        }));
        buttonRow.appendChild(createToolbarButton("Save", function() {
            save(outputs, config);
        }));
        buttonRow.appendChild(createToolbarButton("Load", function() {
            load(outputs, config);
        }));

        sizeRow = document.createElement("div");
        sizeRow.className = "brush-editor-outputs-size-row";
        sizeRow.appendChild(document.createTextNode("Size"));

        sizeRange = document.createElement("input");
        sizeRange.type = "range";
        sizeRange.className = "brush-editor-outputs-size-range";
        sizeRange.min = "50";
        sizeRange.max = "500";
        sizeRange.step = "1";
        sizeRange.value = initialBrushWidth;
        sizeRange.setAttribute("aria-label", "Designed brush paint width");

        sizeValue = document.createElement("span");
        sizeValue.className = "brush-editor-outputs-size-value";
        sizeValue.textContent = initialBrushWidth + "px";

        resetButton = createToolbarButton("Reset", function() {
            updateDesignedBrushWidthFromToolbar(sizeRange, sizeValue, 256);
        });
        resetButton.className += " brush-editor-outputs-reset-btn";

        sizeRange.addEventListener("input", function() {
            updateDesignedBrushWidthFromToolbar(sizeRange, sizeValue, sizeRange.value);
        });

        sizeRow.appendChild(sizeRange);
        sizeRow.appendChild(sizeValue);
        sizeRow.appendChild(resetButton);
        toolbar.appendChild(buttonRow);
        toolbar.appendChild(sizeRow);
        config.toolbarElement.innerHTML = "";
        config.toolbarElement.appendChild(toolbar);
    }

    function getCurrentDesignedBrushWidth() {
        return normalizeDesignedBrushWidth(
            global.App && global.App.memory && global.App.memory.currentDesignedBrushWidth
        );
    }

    function updateDesignedBrushWidthFromToolbar(sizeRange, sizeValue, size) {
        var brushWidth = normalizeDesignedBrushWidth(size);

        sizeRange.value = brushWidth;
        sizeValue.textContent = brushWidth + "px";

        if (global.App && global.App.memory) {
            global.App.memory.currentDesignedBrushWidth = brushWidth;
        }
    }

    function createToolbarButton(label, onClick) {
        var button = document.createElement("button");

        button.type = "button";
        button.className = "wm-toolbar-btn";
        button.textContent = label;
        button.title = label;
        button.addEventListener("click", onClick);

        return button;
    }

    function renderDefaultBrushes(outputs, config) {
        outputs.defaultElement.innerHTML = "";
        global.fetch(config.defaultBrushesUrl)
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                outputs.defaultElement.innerHTML = "";
                getBrushesFromData(data).forEach(function(brush) {
                    addImage(outputs, typeof brush === "string" ? brush : brush.src, outputs.defaultElement, config);
                });
                if (config.selectFirstOnReady) {
                    selectFirstIfNone(outputs, config);
                }
                notifySizeChange(outputs, config);
            })
            .catch(function() {
                outputs.defaultElement.innerHTML = "";
                notifySizeChange(outputs, config);
            });
    }

    function bindSelection(outputs, config) {
        bindListSelection(outputs, config, outputs.defaultElement);
        bindListSelection(outputs, config, outputs.element);
    }

    function bindListSelection(outputs, config, element) {
        if (element.getAttribute("data-selection-bound") === "true") {
            return;
        }

        element.setAttribute("data-selection-bound", "true");
        element.addEventListener("click", function(event) {
            var item = event.target.closest("li");
            var image;

            if (!item || !element.contains(item)) {
                return;
            }

            image = item.querySelector("img");

            if (!image) {
                return;
            }

            selectOutput(outputs, config, item, image);
        });
    }

    function selectOutput(outputs, config, item, image) {
        var selectedItems = getSelectedItems(outputs);
        var i;

        for (i = 0; i < selectedItems.length; i++) {
            selectedItems[i].className = selectedItems[i].className.replace(/\s?brush-output-selected/g, "");
        }

        item.className += item.className.indexOf("brush-output-selected") === -1 ? " brush-output-selected" : "";

        if (typeof config.onSelect === "function") {
            config.onSelect(image, item, outputs);
        }
    }

    function selectFirstIfNone(outputs, config) {
        var item;
        var image;

        if (!outputs || getSelectedItems(outputs).length > 0) {
            return false;
        }

        if (typeof config.shouldSelectFirst === "function" && !config.shouldSelectFirst(outputs)) {
            return false;
        }

        item = outputs.defaultElement.querySelector("li") || outputs.element.querySelector("li");

        if (!item) {
            return false;
        }

        image = item.querySelector("img");

        if (!image) {
            return false;
        }

        selectOutput(outputs, config, item, image);
        return true;
    }

    function getSelectedItems(outputs) {
        var defaultItems = Array.prototype.slice.call(outputs.defaultElement.querySelectorAll(".brush-output-selected"));
        var userItems = Array.prototype.slice.call(outputs.element.querySelectorAll(".brush-output-selected"));

        return defaultItems.concat(userItems);
    }

    function save(outputs, config) {
        var data = {
            brushes: Array.prototype.map.call(outputs.element.querySelectorAll("img"), function(image) {
                return {
                    id: createBrushId(),
                    src: image.getAttribute("src")
                };
            }).filter(function(brush) {
                return !!brush.src;
            })
        };

        downloadJson(data, "brushes-" + Date.now() + ".json");
    }

    function createBrushId() {
        return Date.now() + "-" + createRandomText(10);
    }

    function createRandomText(length) {
        var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var text = "";
        var i;

        for (i = 0; i < length; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return text;
    }

    function downloadJson(data, fileName) {
        var blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });
        var url = global.URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        global.URL.revokeObjectURL(url);
    }

    function load(outputs, config) {
        var input = document.createElement("input");

        input.type = "file";
        input.accept = "application/json,.json";
        input.addEventListener("change", function() {
            var file = input.files && input.files[0];
            var reader;

            if (!file) {
                return;
            }

            reader = new FileReader();
            reader.addEventListener("load", function() {
                loadFromJson(outputs, reader.result, config);
            });
            reader.readAsText(file);
        });
        input.click();
    }

    function loadFromJson(outputs, text, config) {
        var data;
        var brushes;

        try {
            data = JSON.parse(text);
        } catch (error) {
            return;
        }

        brushes = getBrushesFromData(data);

        outputs.element.innerHTML = "";
        brushes.forEach(function(brush) {
            addImage(outputs, typeof brush === "string" ? brush : brush.src, null, config);
        });
    }

    function getBrushesFromData(data) {
        var brushes = Array.isArray(data) ? data : data.brushes;

        return Array.isArray(brushes) ? brushes : [];
    }

    function addImage(outputs, src, targetElement, config) {
        var item;
        var image;
        var element = targetElement || outputs.element;

        if (!src) {
            return;
        }

        item = document.createElement("li");
        image = document.createElement("img");
        image.src = src;
        image.width = 256;
        image.height = 256;
        item.appendChild(image);

        if (element === outputs.element) {
            item.appendChild(createDeleteButton(item, outputs, config));
        }

        element.appendChild(item);
    }

    function normalizeDesignedBrushWidth(size) {
        var value = Math.round(parseFloat(size));

        if (isNaN(value)) {
            return 256;
        }

        return Math.max(50, Math.min(value, 500));
    }

    function createDeleteButton(item, outputs, config) {
        var button = document.createElement("button");

        button.type = "button";
        button.className = "brush-editor-output-delete";
        button.textContent = "X";
        button.title = "Delete brush";
        button.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();

            if (item.parentNode) {
                item.parentNode.removeChild(item);
            }
        });

        return button;
    }

    function getWidth(outputs) {
        return Math.max(outputs.defaultElement.scrollWidth, outputs.element.scrollWidth, 100);
    }

    function getHeight(outputs) {
        return Math.max(outputs.defaultElement.scrollHeight + outputs.element.scrollHeight, 100);
    }

    function notifySizeChange(outputs, config) {
        if (!outputs || !config || typeof config.onSizeChange !== "function") {
            return;
        }

        global.requestAnimationFrame(function() {
            config.onSizeChange(outputs.getSize(), outputs);
        });
    }

    function destroy(outputs) {
        if (outputs.element.parentNode) {
            outputs.element.parentNode.removeChild(outputs.element);
        }

        if (global.brushEditorOutputs === outputs) {
            global.brushEditorOutputs = null;
        }
    }

    global.BrushEditorOutputs = BrushEditorOutputs;

}(window));
