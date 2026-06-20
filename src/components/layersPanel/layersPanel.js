(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 320,
        height: 420,
        boardWidth: 800,
        boardHeight: 600,
        thumbnailMaxSize: 75,
        activeLayerId: null,
        onActiveLayerChange: null,
        onLayerVisibilityChange: null,
        onLayersReorder: null,
        // The panel no longer owns any default layers stack. Layers are data that
        // belong to each board (document): a board creates its own layers and feeds
        // them to this panel through the setLayers() API. The structure below is kept
        // here only as a reference of the expected shape of each layer object.
        //
        // layers: [
        //     {
        //         id: "layer-3",
        //         label: "Layer 3",
        //         visible: true,
        //         blocked: false,
        //         "order-from-the-bottom": 3,
        //         selected: true,
        //         mask: { id: "layer-3-mask" }
        //     },
        //     { id: "layer-2", label: "Layer 2", visible: true, blocked: false, "order-from-the-bottom": 2, selected: false },
        //     { id: "layer-1", label: "Layer 1", visible: true, blocked: false, "order-from-the-bottom": 1, selected: false },
        //     { id: "background", label: "Background", visible: true, blocked: true, "order-from-the-bottom": 0, selected: false, background: true }
        // ]
        layers: []
    };

    function LayersPanel(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var list = document.createElement("ul");
        var component;
        var activeLayerId;
        var activePreview = "board";
        var thumbnailSources = {};

        config.layers = (options && options.layers ? options.layers : DEFAULTS.layers).map(function(layer) {
            return cloneLayer(layer);
        });
        activeLayerId = config.activeLayerId ||
            ((config.layers.filter(function(layer) {
                return layer.selected;
            })[0] || config.layers[0] || {}).id || null);

        element.id = config.id || ("layers-panel-" + Date.now());
        element.className = "layers-panel";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";
        list.className = "layers-panel-list";
        list.setAttribute("aria-label", "Layers");

        element.appendChild(list);
        container.appendChild(element);

        setupDragAndDrop();

        component = {
            id: element.id,
            element: element,
            listElement: list,
            getWidth: function() {
                return config.width;
            },
            getHeight: function() {
                return config.height;
            },
            getLayers: function() {
                return config.layers.map(function(layer) {
                    return cloneLayer(layer);
                });
            },
            setLayers: function(layers) {
                if (!layers || typeof layers.length !== "number") {
                    return false;
                }

                config.layers = layers.map(function(layer) {
                    return cloneLayer(layer);
                });
                activeLayerId = (config.layers.filter(function(layer) {
                    return layer.selected;
                })[0] || config.layers[0] || {}).id || null;
                activePreview = "board";
                renderLayers();
                return true;
            },
            getActiveLayerId: function() {
                return activeLayerId;
            },
            getActiveLayer: function() {
                return getLayerById(config.layers, activeLayerId);
            },
            getActivePreview: function() {
                return activePreview;
            },
            setActiveLayer: function(layerId) {
                return setActiveLayer(layerId, "board");
            },
            updateThumbnail: function(layerId, sourceCanvas, previewType) {
                var type = previewType === "mask" ? "mask" : "board";
                var sourceKey = getThumbnailSourceKey(layerId, type);
                var thumbnailCanvas = getThumbnailCanvas(layerId, type);

                if (!layerId || !sourceCanvas || typeof sourceCanvas.getContext !== "function") {
                    return false;
                }

                thumbnailSources[sourceKey] = sourceCanvas;
                if (thumbnailCanvas) {
                    drawThumbnailCanvas(thumbnailCanvas, sourceCanvas);
                }
                return !!thumbnailCanvas;
            },
            addLayer: function(layerOptions) {
                return addLayer(layerOptions);
            },
            addMaskToActiveLayer: function() {
                return addMaskToActiveLayer();
            },
            removeMaskFromActiveLayer: function() {
                return removeMaskFromActiveLayer();
            },
            toggleActiveLayerBlocked: function() {
                return toggleActiveLayerBlocked();
            },
            removeActiveLayer: function() {
                return removeActiveLayer();
            },
            setBoardSize: function(width, height) {
                if (width <= 0 || height <= 0) {
                    return false;
                }

                config.boardWidth = width;
                config.boardHeight = height;
                syncThumbnailSizes();
                return true;
            },
            destroy: function() {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        renderLayers();
        return component;

        function renderLayers() {
            var ordered = config.layers.slice().sort(function(a, b) {
                return getOrderFromBottom(b) - getOrderFromBottom(a);
            });

            list.innerHTML = "";
            ordered.forEach(function(layer) {
                list.appendChild(createLayerRow(
                    layer,
                    setActiveLayer,
                    setActivePreview,
                    toggleLayerVisibility
                ));
            });
            syncActiveLayer();
            syncActivePreview();
            syncThumbnailSizes();
        }

        function setActiveLayer(layerId, preview) {
            var layer = getLayerById(config.layers, layerId);
            var layerChanged = activeLayerId !== layerId;

            if (!layer) {
                return false;
            }

            activeLayerId = layerId;
            activePreview = preview === "mask" && layer.mask ? "mask" : "board";
            syncActiveLayer();
            syncActivePreview();
            if (layerChanged && typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(layer, component);
            }
            return true;
        }

        function setActivePreview(layerId, preview) {
            return setActiveLayer(layerId, preview);
        }

        function toggleLayerVisibility(layerId) {
            var layer = getLayerById(config.layers, layerId);
            var visible;

            if (!layer) {
                return false;
            }

            visible = layer.visible === false;
            layer.visible = visible;

            if (typeof config.onLayerVisibilityChange === "function") {
                config.onLayerVisibilityChange(layer, visible, component);
            }

            renderLayers();
            return true;
        }

        function addLayer(layerOptions) {
            var activeLayer = getLayerById(config.layers, activeLayerId);
            var activeOrder;
            var layer;

            if (activeLayer) {
                activeOrder = getOrderFromBottom(activeLayer);
            } else {
                activeOrder = -1;
                config.layers.forEach(function(existing) {
                    activeOrder = Math.max(activeOrder, getOrderFromBottom(existing));
                });
            }

            config.layers.forEach(function(existing) {
                if (getOrderFromBottom(existing) > activeOrder) {
                    existing["order-from-the-bottom"] = getOrderFromBottom(existing) + 1;
                }
            });

            layer = extend({
                id: createLayerId(),
                label: createLayerLabel(),
                visible: true,
                blocked: false,
                selected: false,
                background: false
            }, layerOptions || {});
            layer["order-from-the-bottom"] = activeOrder + 1;

            config.layers.push(layer);
            activeLayerId = layer.id;
            activePreview = "board";
            renderLayers();
            if (typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(layer, component);
            }
            return extend({}, layer);
        }

        function removeActiveLayer() {
            var activeLayer = getLayerById(config.layers, activeLayerId);            var activeOrder;
            var nextLayer;

            if (!activeLayer || config.layers.length <= 1) {
                return false;
            }

            activeOrder = getOrderFromBottom(activeLayer);
            config.layers = config.layers.filter(function(layer) {
                return layer.id !== activeLayerId;
            });
            normalizeOrders();

            nextLayer = findLayerByOrder(activeOrder - 1) ||
                findLayerByOrder(activeOrder) ||
                config.layers[0] || null;
            activeLayerId = nextLayer ? nextLayer.id : null;
            activePreview = "board";
            renderLayers();
            if (nextLayer && typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(nextLayer, component);
            }
            return true;
        }

        function addMaskToActiveLayer() {
            var activeLayer = config.layers.filter(function(layer) {
                return layer.selected;
            })[0] || getLayerById(config.layers, activeLayerId);

            if (!activeLayer || activeLayer.mask) {
                return false;
            }

            activeLayer.mask = {
                id: activeLayer.id + "-mask"
            };
            renderLayers();
            if (typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(activeLayer, component);
            }
            return true;
        }

        function removeMaskFromActiveLayer() {
            var activeLayer = getLayerById(config.layers, activeLayerId);

            if (!activeLayer || !activeLayer.mask) {
                return false;
            }

            delete activeLayer.mask;
            activePreview = "board";
            renderLayers();
            if (typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(activeLayer, component);
            }
            return true;
        }

        function toggleActiveLayerBlocked() {
            var activeLayer = getLayerById(config.layers, activeLayerId);

            if (!activeLayer) {
                return false;
            }

            activeLayer.blocked = !activeLayer.blocked;
            renderLayers();
            if (typeof config.onActiveLayerChange === "function") {
                config.onActiveLayerChange(activeLayer, component);
            }
            return true;
        }

        function createLayerId() {
            var timestamp = Date.now();

            while (getLayerById(config.layers, String(timestamp))) {
                timestamp += 1;
            }
            return String(timestamp);
        }

        function createLayerLabel() {
            var maxNumber = 0;

            config.layers.forEach(function(layer) {
                var match = /^Layer\s+(\d+)$/.exec(layer.label || "");

                if (match) {
                    maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
                }
            });
            return "Layer " + (maxNumber + 1);
        }

        function normalizeOrders() {
            config.layers
                .slice()
                .sort(function(a, b) {
                    return getOrderFromBottom(a) - getOrderFromBottom(b);
                })
                .forEach(function(layer, index) {
                    layer["order-from-the-bottom"] = index;
                });
        }

        function findLayerByOrder(order) {
            var index;

            for (index = 0; index < config.layers.length; index += 1) {
                if (getOrderFromBottom(config.layers[index]) === order) {
                    return config.layers[index];
                }
            }
            return null;
        }

        function setupDragAndDrop() {
            var dropIndicator = document.createElement("li");
            var draggedLayerId = null;
            var dropIndex = null;
            var dropAccepted = false;

            dropIndicator.className = "layers-panel-drop-indicator";
            dropIndicator.setAttribute("aria-hidden", "true");
            list.appendChild(dropIndicator);

            list.addEventListener("dragstart", function(event) {
                var row = getRowFromEvent(event);
                var layer;

                if (!row) {
                    return;
                }
                layer = getLayerById(config.layers, row.getAttribute("data-layer-id"));
                if (!layer || layer.background) {
                    event.preventDefault();
                    return;
                }
                if (!dropIndicator.parentNode) {
                    list.appendChild(dropIndicator);
                }
                draggedLayerId = row.getAttribute("data-layer-id") || null;
                dropIndex = null;
                dropAccepted = false;
                row.classList.add("layers-panel-row-dragging");
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", draggedLayerId || "");
                }
            });

            list.addEventListener("dragover", function(event) {
                if (!draggedLayerId) {
                    return;
                }
                event.preventDefault();
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                }
                dropIndex = getDropIndex(event.clientY);
                showDropIndicator(dropIndex);
            });

            list.addEventListener("drop", function(event) {
                if (!draggedLayerId || dropIndex === null) {
                    return;
                }
                event.preventDefault();
                dropAccepted = true;
            });

            list.addEventListener("dragleave", function(event) {
                if (!list.contains(event.relatedTarget)) {
                    hideDropIndicator();
                }
            });

            list.addEventListener("dragend", function() {
                var dragging = list.querySelector(".layers-panel-row-dragging");

                if (dragging) {
                    dragging.classList.remove("layers-panel-row-dragging");
                }
                hideDropIndicator();
                if (dropAccepted && applyDropOrder(draggedLayerId, dropIndex)) {
                    renderLayers();
                }
                if (dropAccepted && typeof config.onLayersReorder === "function") {
                    config.onLayersReorder(component.getLayers(), component);
                }
                draggedLayerId = null;
                dropIndex = null;
                dropAccepted = false;
            });

            function getDropIndex(y) {
                var rows = list.querySelectorAll(".layers-panel-row");
                var lastMovableIndex = getBackgroundRowIndex(rows);
                var index;

                for (index = 0; index < lastMovableIndex; index += 1) {
                    if (y < rows[index].getBoundingClientRect().top + rows[index].offsetHeight / 2) {
                        return index;
                    }
                }
                return lastMovableIndex;
            }

            function showDropIndicator(index) {
                var rows = list.querySelectorAll(".layers-panel-row");
                var top;

                if (!rows.length) {
                    return;
                }
                if (index < rows.length) {
                    top = rows[index].offsetTop;
                } else {
                    top = rows[rows.length - 1].offsetTop + rows[rows.length - 1].offsetHeight;
                }
                dropIndicator.style.top = top + "px";
                dropIndicator.classList.add("layers-panel-drop-indicator-visible");
            }

            function hideDropIndicator() {
                dropIndicator.classList.remove("layers-panel-drop-indicator-visible");
            }

            function applyDropOrder(layerId, targetIndex) {
                var rows = Array.prototype.slice.call(list.querySelectorAll(".layers-panel-row"));
                var backgroundIndex = getBackgroundRowIndex(rows);
                var sourceIndex = -1;
                var orderedLayers = rows.map(function(row) {
                    return getLayerById(config.layers, row.getAttribute("data-layer-id"));
                });
                var movingLayer;
                var index;

                for (index = 0; index < rows.length; index += 1) {
                    if (rows[index].getAttribute("data-layer-id") === layerId) {
                        sourceIndex = index;
                        break;
                    }
                }

                if (sourceIndex < 0) {
                    return false;
                }
                if (orderedLayers[sourceIndex].background) {
                    return false;
                }
                targetIndex = Math.min(targetIndex, backgroundIndex);
                movingLayer = orderedLayers.splice(sourceIndex, 1)[0];
                if (targetIndex > sourceIndex) {
                    targetIndex -= 1;
                }
                if (targetIndex === sourceIndex) {
                    return false;
                }
                orderedLayers.splice(targetIndex, 0, movingLayer);
                orderedLayers.forEach(function(layer, index) {
                    layer["order-from-the-bottom"] = orderedLayers.length - 1 - index;
                });
                return true;
            }

            function getBackgroundRowIndex(rows) {
                var index;
                var layer;

                for (index = 0; index < rows.length; index += 1) {
                    layer = getLayerById(config.layers, rows[index].getAttribute("data-layer-id"));
                    if (layer && layer.background) {
                        return index;
                    }
                }
                return rows.length;
            }
        }

        function getRowFromEvent(event) {
            var target = event.target;

            if (target && target.closest) {
                return target.closest(".layers-panel-row");
            }
            while (target && target !== list) {
                if (target.classList && target.classList.contains("layers-panel-row")) {
                    return target;
                }
                target = target.parentNode;
            }
            return null;
        }

        function syncActiveLayer() {
            var rows = list.querySelectorAll(".layers-panel-row");

            config.layers.forEach(function(layer) {
                layer.selected = layer.id === activeLayerId;
            });

            Array.prototype.forEach.call(rows, function(row) {
                var selected = row.getAttribute("data-layer-id") === activeLayerId;

                row.classList.toggle("layers-panel-row-selected", selected);
                row.setAttribute("aria-selected", selected ? "true" : "false");
                row.tabIndex = selected ? 0 : -1;
            });
        }

        function syncActivePreview() {
            var previews = list.querySelectorAll(".layers-panel-thumbnail");

            Array.prototype.forEach.call(previews, function(preview) {
                var selected = preview.getAttribute("data-layer-id") === activeLayerId &&
                    preview.getAttribute("data-preview-type") === activePreview;

                preview.classList.toggle("layers-panel-thumbnail-selected", selected);
                preview.setAttribute("aria-selected", selected ? "true" : "false");
            });
        }

        function syncThumbnailSizes() {
            var thumbnails = list.querySelectorAll(".layers-panel-thumbnail");
            var maxSize = config.thumbnailMaxSize;
            var thumbnailWidth = maxSize;
            var thumbnailHeight = maxSize;

            if (config.boardWidth >= config.boardHeight) {
                thumbnailHeight = Math.max(
                    1,
                    Math.round(maxSize * config.boardHeight / config.boardWidth)
                );
            } else {
                thumbnailWidth = Math.max(
                    1,
                    Math.round(maxSize * config.boardWidth / config.boardHeight)
                );
            }

            Array.prototype.forEach.call(thumbnails, function(thumbnail) {
                var canvas = thumbnail.querySelector(".layers-panel-thumbnail-canvas");

                thumbnail.style.width = thumbnailWidth + "px";
                thumbnail.style.height = thumbnailHeight + "px";
                if (canvas) {
                    canvas.width = thumbnailWidth;
                    canvas.height = thumbnailHeight;
                    drawThumbnailCanvas(
                        canvas,
                        thumbnailSources[getThumbnailSourceKey(
                            thumbnail.getAttribute("data-layer-id"),
                            thumbnail.getAttribute("data-preview-type")
                        )]
                    );
                }
            });
        }

        function getThumbnailCanvas(layerId, previewType) {
            var thumbnails = list.querySelectorAll(".layers-panel-thumbnail");
            var index;

            for (index = 0; index < thumbnails.length; index += 1) {
                if (thumbnails[index].getAttribute("data-layer-id") === layerId &&
                    thumbnails[index].getAttribute("data-preview-type") === previewType) {
                    return thumbnails[index].querySelector(".layers-panel-thumbnail-canvas");
                }
            }
            return null;
        }
    }

    function createLayerRow(layer, onSelect, onPreviewSelect, onVisibilityToggle) {
        var item = document.createElement("li");
        var visibility = document.createElement("button");
        var previews = document.createElement("span");
        var thumbnail = document.createElement("span");
        var maskConnector;
        var maskThumbnail;
        var label = document.createElement("span");
        var lock = document.createElement("span");

        item.className = "layers-panel-row";
        item.setAttribute("role", "option");
        item.setAttribute("draggable", layer.background ? "false" : "true");
        item.setAttribute("data-layer-id", layer.id || "");
        if (layer.background) {
            item.className += " layers-panel-row-fixed";
        }
        item.addEventListener("click", function(event) {
            if (!event.target.closest(".layers-panel-thumbnail")) {
                onSelect(layer.id, "board");
            }
        });
        item.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(layer.id, "board");
            }
        });

        visibility.type = "button";
        visibility.className = "layers-panel-visibility";
        visibility.setAttribute("aria-label", layer.visible === false ? "Hidden" : "Visible");
        if (layer.visible !== false) {
            visibility.className += " layers-panel-visibility-on";
        } else {
            visibility.className += " layers-panel-visibility-off";
        }
        visibility.addEventListener("click", function(event) {
            event.stopPropagation();
            onVisibilityToggle(layer.id);
        });

        previews.className = "layers-panel-previews";

        thumbnail.className = "layers-panel-thumbnail";
        thumbnail.setAttribute("aria-label", "Layer board preview");
        thumbnail.setAttribute("data-layer-id", layer.id || "");
        thumbnail.setAttribute("data-preview-type", "board");
        thumbnail.addEventListener("click", function(event) {
            event.stopPropagation();
            onPreviewSelect(layer.id, "board");
        });
        thumbnail.appendChild(createThumbnailCanvas());
        if (layer.background) {
            thumbnail.className += " layers-panel-thumbnail-background";
        }
        previews.appendChild(thumbnail);

        if (layer.mask) {
            maskConnector = document.createElement("span");
            maskConnector.className = "layers-panel-mask-connector";
            maskConnector.textContent = "&";
            maskConnector.setAttribute("aria-hidden", "true");

            maskThumbnail = document.createElement("span");
            maskThumbnail.className = "layers-panel-thumbnail layers-panel-mask-thumbnail";
            maskThumbnail.setAttribute("aria-label", "Layer mask preview");
            maskThumbnail.setAttribute("data-layer-id", layer.id || "");
            maskThumbnail.setAttribute("data-preview-type", "mask");
            maskThumbnail.setAttribute("data-mask-id", layer.mask.id || "");
            maskThumbnail.addEventListener("click", function(event) {
                event.stopPropagation();
                onPreviewSelect(layer.id, "mask");
            });
            maskThumbnail.appendChild(createThumbnailCanvas());

            previews.appendChild(maskConnector);
            previews.appendChild(maskThumbnail);
        }

        label.className = "layers-panel-label";
        label.textContent = layer.label || "Layer";
        if (layer.background) {
            label.className += " layers-panel-label-background";
        }

        lock.className = "layers-panel-lock";
        if (layer.blocked) {
            lock.className += " layers-panel-lock-on";
            lock.setAttribute("aria-label", "Blocked");
        }

        item.appendChild(visibility);
        item.appendChild(previews);
        item.appendChild(label);
        item.appendChild(lock);
        return item;
    }

    function createThumbnailCanvas() {
        var canvas = document.createElement("canvas");

        canvas.className = "layers-panel-thumbnail-canvas";
        canvas.setAttribute("aria-hidden", "true");
        return canvas;
    }

    function getThumbnailSourceKey(layerId, previewType) {
        return String(layerId || "") + ":" + (previewType === "mask" ? "mask" : "board");
    }

    function drawThumbnailCanvas(thumbnailCanvas, sourceCanvas) {
        var context;

        if (!thumbnailCanvas || !sourceCanvas || !thumbnailCanvas.width || !thumbnailCanvas.height) {
            return false;
        }

        context = thumbnailCanvas.getContext("2d");
        context.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        context.drawImage(
            sourceCanvas,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
            0,
            0,
            thumbnailCanvas.width,
            thumbnailCanvas.height
        );
        return true;
    }

    function getOrderFromBottom(layer) {
        return typeof layer["order-from-the-bottom"] === "number" ? layer["order-from-the-bottom"] : 0;
    }

    function getLayerById(layers, layerId) {
        var index;

        for (index = 0; index < layers.length; index += 1) {
            if (layers[index].id === layerId) {
                return layers[index];
            }
        }
        return null;
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("LayersPanel container not found: " + containerId);
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

    function cloneLayer(layer) {
        var clone = extend({}, layer);

        if (layer.mask && typeof layer.mask === "object") {
            clone.mask = extend({}, layer.mask);
        }
        return clone;
    }

    global.LayersPanel = LayersPanel;
    global.layersPanel = LayersPanel;

}(window));
