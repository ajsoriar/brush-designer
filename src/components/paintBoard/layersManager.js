(function(global) {

    "use strict";

    // Layers are data owned by each board (document), not by the Layers UI.
    // This module is the home for every function that manages a board's layers
    // stack. The board creates its layers here and feeds them to the LayersPanel
    // component (src/components/layersPanel) through that panel's setLayers() API.
    //
    // IMPORTANT: the shape of each layer object is shared with the LayersPanel
    // component. Any change to this structure must be reviewed against
    // src/components/layersPanel (see its example*.json files).

    function cloneLayer(layer) {
        var copy = {};
        var key;

        for (key in layer) {
            if (Object.prototype.hasOwnProperty.call(layer, key)) {
                copy[key] = layer[key];
            }
        }

        if (layer.mask) {
            copy.mask = cloneLayer(layer.mask);
        }

        return copy;
    }

    // Initial layers stack for a new board. Returns a fresh, deep-cloned copy on
    // every call so boards never share layer references. The base layer id is
    // aligned with the board's base DOM layer (<boardId>-layer-1).
    function createInitialLayers(boardId) {
        var baseId = boardId ? (boardId + "-layer-1") : "layer-1";
        var template = [
            {
                id: baseId,
                label: "Background",
                visible: true,
                blocked: true,
                "order-from-the-bottom": 0,
                selected: true,
                background: true
            }
        ];

        return template.map(cloneLayer);
    }

    function getTopOrder(layers) {
        var top = -1;

        layers.forEach(function(layer) {
            var order = typeof layer["order-from-the-bottom"] === "number" ?
                layer["order-from-the-bottom"] : 0;

            if (order > top) {
                top = order;
            }
        });

        return top;
    }

    function getOrderFromBottom(layer) {
        return typeof layer["order-from-the-bottom"] === "number" ?
            layer["order-from-the-bottom"] : 0;
    }

    function normalizeOrders(layers) {
        layers.slice().sort(function(a, b) {
            return getOrderFromBottom(a) - getOrderFromBottom(b);
        }).forEach(function(layer, index) {
            layer["order-from-the-bottom"] = index;
        });
    }

    function findLayerByOrder(layers, order) {
        var found = null;

        layers.forEach(function(layer) {
            if (getOrderFromBottom(layer) === order) {
                found = layer;
            }
        });

        return found;
    }

    function getNextLayerNumber(board) {
        board.layerSequence = (board.layerSequence || 1) + 1;
        return board.layerSequence;
    }

    function getLayerElement(board, layerId) {
        if (!board || !board.layersElement) {
            return null;
        }

        return board.layersElement.querySelector('[data-layer="' + layerId + '"]');
    }

    function syncLayerOrderInDom(board) {
        board.layers.forEach(function(layer) {
            var listItem = getLayerElement(board, layer.id);

            if (listItem) {
                listItem.style.zIndex = String(getOrderFromBottom(layer));
            }
        });
    }

    // Creates the DOM <li> (with its own canvas) for a new layer and appends it
    // on top of the board's <ol> layers stack (board.layersElement).
    function createLayerElement(board, layerId, orderFromBottom) {
        var doc = (board.layersElement && board.layersElement.ownerDocument) || document;
        var listItem = doc.createElement("li");
        var canvas = doc.createElement("canvas");

        listItem.id = layerId;
        listItem.className = "paint-board-layer";
        listItem.setAttribute("data-layer", layerId);
        listItem.setAttribute("data-type", "CANVAS");
        listItem.style.zIndex = String(typeof orderFromBottom === "number" ? orderFromBottom : 0);
        listItem.style.width = board.width + "px";
        listItem.style.height = board.height + "px";

        canvas.id = layerId + "-canvas";
        canvas.className = "paint-board-canvas";
        canvas.width = board.width;
        canvas.height = board.height;
        canvas.style.width = board.width + "px";
        canvas.style.height = board.height + "px";

        listItem.appendChild(canvas);
        board.layersElement.appendChild(listItem);

        return listItem;
    }

    // Removes the DOM <li> of a layer from the board's <ol> layers stack.
    function removeLayerElement(board, layerId) {
        var doc = (board.layersElement && board.layersElement.ownerDocument) || document;
        var listItem = doc.getElementById(layerId);

        if (listItem && listItem.parentNode) {
            listItem.parentNode.removeChild(listItem);
        }
    }

    // Switches the board's active paint target to the given layer. The board's
    // canvas/context are redirected to that layer's own canvas, so painting goes
    // to the selected layer even when other layers are stacked on top of it
    // (Photoshop-style layers). Returns true when the layer was activated.
    function setActiveLayer(board, layerId) {
        var listItem = null;
        var canvas;

        listItem = getLayerElement(board, layerId);

        if (!listItem) {
            listItem = document.getElementById(layerId);
        }

        canvas = listItem && listItem.querySelector("canvas");

        if (!listItem || !canvas) {
            return false;
        }

        board.activeLayerElement = listItem;
        board.activeLayerId = layerId;
        board.canvas = canvas;
        board.context = canvas.getContext("2d");

        board.layers.forEach(function(layer) {
            layer.selected = layer.id === layerId;
        });

        // Debug-only marker: tag the active layer element with the ACTIVE-LAYER
        // class so it can be visually spotted (the class itself is empty).
        if (board.layersElement) {
            var previousActive = board.layersElement.querySelectorAll(".ACTIVE-LAYER");
            for (var i = 0; i < previousActive.length; i++) {
                previousActive[i].classList.remove("ACTIVE-LAYER");
            }
        }
        listItem.classList.add("ACTIVE-LAYER");

        return true;
    }

    // Shows/hides a layer on the board DOM by toggling display on its <li>.
    // The layer visibility flag is also synchronized in board.layers.
    function setLayerVisibility(board, layerId, visible) {
        var isVisible = visible !== false;
        var listItem = null;
        var layerFound = false;

        listItem = getLayerElement(board, layerId);

        board.layers.forEach(function(layer) {
            if (layer.id === layerId) {
                layer.visible = isVisible;
                layerFound = true;
            }
        });

        if (listItem) {
            listItem.style.display = isVisible ? "" : "none";
        }

        return layerFound && !!listItem;
    }

    // Synchronizes the locked state in the board-owned layers data. Background
    // remains permanently locked and is not changed through this operation.
    function setLayerBlocked(board, layerId, blocked) {
        var layerFound = false;

        board.layers.forEach(function(layer) {
            if (layer.id === layerId && !layer.background) {
                layer.blocked = blocked === true;
                layerFound = true;
            }
        });

        return layerFound;
    }

    // Applies the order emitted by LayersPanel to the board layers and updates
    // visual stacking using z-index. Canvases are not recreated, so drawing data
    // is preserved.
    function setLayersOrder(board, orderedLayers) {
        var orderById = {};
        var changed = false;

        if (!orderedLayers || typeof orderedLayers.length !== "number") {
            return false;
        }

        orderedLayers.forEach(function(layer) {
            if (!layer || !layer.id) {
                return;
            }

            orderById[layer.id] = typeof layer["order-from-the-bottom"] === "number" ?
                layer["order-from-the-bottom"] : 0;
        });

        board.layers.forEach(function(layer) {
            if (!Object.prototype.hasOwnProperty.call(orderById, layer.id)) {
                return;
            }

            if (getOrderFromBottom(layer) !== orderById[layer.id]) {
                layer["order-from-the-bottom"] = orderById[layer.id];
                changed = true;
            }
        });

        if (!changed) {
            return false;
        }

        normalizeOrders(board.layers);
        syncLayerOrderInDom(board);
        return true;
    }

    // Adds a new layer immediately above the active layer: updates the board's
    // layers data structure and creates the matching <li> (id
    // "<boardId>-layer-<n>") inside the board's <ol>. The current active layer
    // remains active. Returns a copy of the new layer.
    function addLayer(board, options) {
        var settings = options || {};
        var number = getNextLayerNumber(board);
        var layerId = board.id + "-layer-" + number;
        var activeOrder = getTopOrder(board.layers);
        var layerData = {
            id: layerId,
            label: settings.label || ("Layer " + number),
            visible: true,
            blocked: false,
            "order-from-the-bottom": 0,
            selected: false
        };

        board.layers.forEach(function(layer) {
            if (layer.id === board.activeLayerId) {
                activeOrder = getOrderFromBottom(layer);
            }
        });

        board.layers.forEach(function(layer) {
            if (getOrderFromBottom(layer) > activeOrder) {
                layer["order-from-the-bottom"] = getOrderFromBottom(layer) + 1;
            }
        });

        layerData["order-from-the-bottom"] = activeOrder + 1;
        board.layers.push(layerData);

        createLayerElement(board, layerId, layerData["order-from-the-bottom"]);
        syncLayerOrderInDom(board);

        return cloneLayer(layerData);
    }

    // Removes a layer from a board: deletes its entry from the board's layers data
    // structure and removes the matching <li> from the board's <ol>. The previous
    // layer (or the first one) becomes the active/selected layer. Any layer,
    // including the background, can be removed while at least one other layer
    // remains. Returns true when the layer was removed.
    function removeLayer(board, layerId) {
        var layers = board.layers;
        var index = -1;
        var target = null;
        var activeOrder;
        var nextLayer;
        var i;

        for (i = 0; i < layers.length; i++) {
            if (layers[i].id === layerId) {
                index = i;
                target = layers[i];
                break;
            }
        }

        if (!target ||
            layers.length <= 1 ||
            (target.blocked && !target.background)) {
            return false;
        }

        activeOrder = getOrderFromBottom(target);
        layers.splice(index, 1);

        removeLayerElement(board, layerId);
        normalizeOrders(layers);
        syncLayerOrderInDom(board);

        nextLayer = findLayerByOrder(layers, activeOrder - 1) ||
            findLayerByOrder(layers, activeOrder) ||
            layers[0] || null;

        if (nextLayer) {
            setActiveLayer(board, nextLayer.id);
        } else {
            board.activeLayerId = null;
        }

        return true;
    }

    global.PaintBoardLayersManager = {
        cloneLayer: cloneLayer,
        createInitialLayers: createInitialLayers,
        addLayer: addLayer,
        removeLayer: removeLayer,
        setActiveLayer: setActiveLayer,
        setLayerBlocked: setLayerBlocked,
        setLayerVisibility: setLayerVisibility,
        setLayersOrder: setLayersOrder
    };

}(window));
