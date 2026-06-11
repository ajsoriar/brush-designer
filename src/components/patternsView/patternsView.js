import orderDefault from "./order-default.json";
import orderLightToDark from "./order-light-to-dark.json";
import orderOs753 from "./order-os753.json";
import orderOs8 from "./order-os8.json";

var patternModules = import.meta.glob("./patterns/**/*.png", {
    eager: true,
    import: "default",
    query: "?url"
});

(function(global) {

    "use strict";

    var COLLECTIONS = [
        { id: "default", manifest: orderDefault },
        { id: "light-to-dark", manifest: orderLightToDark },
        { id: "os753", manifest: orderOs753 },
        { id: "os8", manifest: orderOs8 }
    ];

    var DEFAULTS = {
        id: null,
        containerId: null,
        columns: orderDefault.columns,
        cellSize: orderDefault.tilePreviewSize,
        gap: 8,
        padding: 8,
        collectionId: "default",
        activePatternId: null,
        onSelect: null
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

    function PatternsView(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var collection = getCollection(config.collectionId) || COLLECTIONS[0];
        var componentId = config.id || ("patterns-view-" + Date.now());
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var component;

        config.collectionId = collection.id;
        config.manifest = collection.manifest;
        config.columns = collection.manifest.columns;
        config.cellSize = collection.manifest.tilePreviewSize;
        config.patterns = getPatternsFromManifest(collection.manifest);

        element.id = componentId;
        element.className = "patterns-view";
        element.style.gap = config.gap + "px";
        element.style.padding = config.padding + "px";

        component = {
            id: componentId,
            element: element,
            options: config,
            getWidth: function() {
                return (config.columns * config.cellSize) + ((config.columns - 1) * config.gap) + (config.padding * 2);
            },
            getHeight: function() {
                var rows = Math.ceil(config.patterns.length / config.columns);

                return (rows * config.cellSize) + ((rows - 1) * config.gap) + (config.padding * 2);
            },
            setActivePattern: function(patternId) {
                setActivePattern(component, patternId);
            },
            setCollection: function(collectionId) {
                setCollection(component, collectionId);
            },
            getCollections: function() {
                return getCollections();
            },
            destroy: function() {
                destroy(component);
            }
        };

        renderCollection(component);
        container.appendChild(element);

        return component;
    }

    function renderCollection(component) {
        component.element.innerHTML = "";
        component.element.style.gridTemplateColumns = repeatGridTrack(component.options.columns, component.options.cellSize);
        renderPatterns(component);
        setActivePattern(component, component.options.activePatternId || (component.options.patterns[0] && component.options.patterns[0].id));
    }

    function renderPatterns(component) {
        component.options.patterns.forEach(function(pattern) {
            var item = document.createElement("button");

            item.type = "button";
            item.className = "patterns-view-item";
            item.title = pattern.id;
            item.style.width = component.options.cellSize + "px";
            item.style.height = component.options.cellSize + "px";
            item.style.backgroundImage = "url(\"" + pattern.url + "\")";
            item.style.backgroundSize = pattern.width + "px " + pattern.height + "px";
            item.setAttribute("data-pattern-id", pattern.id);

            pattern.image = new Image();
            pattern.image.src = pattern.url;

            item.addEventListener("click", function() {
                setActivePattern(component, pattern.id);

                if (global.PaintTools && typeof global.PaintTools.use === "function") {
                    global.PaintTools.use("PATTERN-BUCKET");
                }
            });

            component.element.appendChild(item);
        });
    }

    function setActivePattern(component, patternId) {
        var buttons = component.element.querySelectorAll("[data-pattern-id]");
        var pattern = getPatternById(component.options.patterns, patternId);
        var i;
        var button;

        if (!pattern) {
            return;
        }

        component.activePattern = pattern;

        for (i = 0; i < buttons.length; i++) {
            button = buttons[i];
            button.className = button.className.replace(/\s?patterns-view-item-active/g, "");

            if (button.getAttribute("data-pattern-id") === pattern.id) {
                button.className += " patterns-view-item-active";
            }
        }

        if (typeof component.options.onSelect === "function") {
            component.options.onSelect(pattern, component);
        }
    }

    function setCollection(component, collectionId) {
        var collection = getCollection(collectionId);
        var activePatternId = component.activePattern && component.activePattern.id;

        if (!collection) {
            return;
        }

        component.options.collectionId = collection.id;
        component.options.manifest = collection.manifest;
        component.options.columns = collection.manifest.columns;
        component.options.cellSize = collection.manifest.tilePreviewSize;
        component.options.patterns = getPatternsFromManifest(collection.manifest);
        component.options.activePatternId = activePatternId;
        renderCollection(component);
    }

    function getPatternById(patterns, patternId) {
        var i;

        for (i = 0; i < patterns.length; i++) {
            if (patterns[i].id === patternId) {
                return patterns[i];
            }
        }

        return null;
    }

    function getPatternsFromManifest(manifest) {
        return manifest.items.slice().sort(sortByGridPosition).map(function(item) {
            var modulePath = "./" + item.image;
            var url = patternModules[modulePath];
            var tileWidth = item.tileWidth || item.tileSize || manifest.tilePreviewSize;
            var tileHeight = item.tileHeight || item.tileSize || tileWidth;

            return {
                id: getPatternId(item.image),
                url: url,
                size: item.tileSize || Math.max(tileWidth, tileHeight),
                width: tileWidth,
                height: tileHeight,
                column: item.column,
                row: item.row
            };
        }).filter(function(pattern) {
            return !!pattern.url;
        });
    }

    function getCollection(collectionId) {
        var i;

        for (i = 0; i < COLLECTIONS.length; i++) {
            if (COLLECTIONS[i].id === collectionId) {
                return COLLECTIONS[i];
            }
        }

        return null;
    }

    function getCollections() {
        return COLLECTIONS.map(function(collection) {
            return {
                id: collection.id,
                collectionName: collection.manifest.collectionName,
                name: collection.manifest.name
            };
        });
    }

    function getPatternId(path) {
        return path.split("/").pop().replace(/\.png$/i, "");
    }

    function sortByGridPosition(a, b) {
        return (a.row - b.row) || (a.column - b.column);
    }

    function repeatGridTrack(count, size) {
        var tracks = [];
        var i;

        for (i = 0; i < count; i++) {
            tracks.push(size + "px");
        }

        return tracks.join(" ");
    }

    function getContainer(containerId) {
        var container;

        if (!containerId) {
            container = document.createElement("div");
            container.id = "patterns-view-container-" + Date.now();
            document.body.appendChild(container);
            return container;
        }

        container = document.getElementById(containerId);

        if (!container) {
            throw new Error("PatternsView container not found: " + containerId);
        }

        return container;
    }

    function destroy(component) {
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
    }

    global.PatternsView = PatternsView;
    global.patternsView = PatternsView;
    global.PatternsViewCollections = getCollections();

}(window));
