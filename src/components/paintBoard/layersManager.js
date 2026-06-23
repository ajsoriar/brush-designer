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
                active: true,
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
    function setLayerSelection(board, selectedLayerIds, activeLayerId) {
        var listItem = null;
        var canvas;
        var validSelectedIds = [];

        selectedLayerIds = selectedLayerIds || [];
        board.layers.forEach(function(layer) {
            if (selectedLayerIds.indexOf(layer.id) >= 0) {
                validSelectedIds.push(layer.id);
            }
        });

        if (!activeLayerId || !getLayerElement(board, activeLayerId)) {
            activeLayerId = validSelectedIds[validSelectedIds.length - 1] ||
                (board.layers[0] && board.layers[0].id);
        }
        if (!activeLayerId) {
            return false;
        }
        if (validSelectedIds.indexOf(activeLayerId) < 0) {
            validSelectedIds.push(activeLayerId);
        }

        listItem = getLayerElement(board, activeLayerId);

        if (!listItem) {
            listItem = document.getElementById(activeLayerId);
        }

        canvas = listItem && listItem.querySelector("canvas");

        if (!listItem || !canvas) {
            return false;
        }

        board.activeLayerElement = listItem;
        board.activeLayerId = activeLayerId;
        board.selectedLayerIds = validSelectedIds.slice();
        board.canvas = canvas;
        board.context = canvas.getContext("2d");

        board.layers.forEach(function(layer) {
            layer.active = layer.id === activeLayerId;
            layer.selected = validSelectedIds.indexOf(layer.id) >= 0;
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

    // Synchronizes mask metadata in the board-owned layers data. Passing null
    // removes the mask. Background layers never accept masks.
    function setLayerMask(board, layerId, mask) {
        var layerFound = false;

        board.layers.forEach(function(layer) {
            if (layer.id !== layerId || layer.background) {
                return;
            }

            if (mask && typeof mask === "object") {
                layer.mask = cloneLayer(mask);
            } else {
                delete layer.mask;
            }
            layerFound = true;
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
            active: false,
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

    // Duplicates the active layer immediately above itself. Pixel data and the
    // layer's editable metadata are copied, but a duplicated Background always
    // becomes a normal, unlocked layer.
    function duplicateActiveLayer(board) {
        var sourceLayer;
        var duplicatedLayer;
        var duplicatedLayerData;
        var sourceElement;
        var duplicatedElement;
        var sourceCanvas;
        var duplicatedCanvas;

        if (!board || !board.activeLayerId) {
            return null;
        }

        sourceLayer = board.layers.filter(function(layer) {
            return layer.id === board.activeLayerId;
        })[0] || null;
        if (!sourceLayer) {
            return null;
        }

        duplicatedLayer = addLayer(board, {
            label: (sourceLayer.label || "Layer") + " Copy"
        });
        if (!duplicatedLayer) {
            return null;
        }

        duplicatedLayerData = board.layers.filter(function(layer) {
            return layer.id === duplicatedLayer.id;
        })[0] || null;
        if (!duplicatedLayerData) {
            return null;
        }

        duplicatedLayerData.visible = sourceLayer.visible !== false;
        duplicatedLayerData.blocked = sourceLayer.background ?
            false :
            sourceLayer.blocked === true;
        duplicatedLayerData.background = false;

        if (sourceLayer.mask) {
            duplicatedLayerData.mask = cloneLayer(sourceLayer.mask);
            duplicatedLayerData.mask.id = duplicatedLayerData.id + "-mask";
        }

        sourceElement = getLayerElement(board, sourceLayer.id);
        duplicatedElement = getLayerElement(board, duplicatedLayerData.id);
        sourceCanvas = sourceElement && sourceElement.querySelector("canvas");
        duplicatedCanvas = duplicatedElement &&
            duplicatedElement.querySelector("canvas");

        if (sourceCanvas && duplicatedCanvas) {
            duplicatedCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        }
        if (duplicatedElement) {
            duplicatedElement.style.display = duplicatedLayerData.visible ?
                "" :
                "none";
        }

        setActiveLayer(board, duplicatedLayerData.id);
        return cloneLayer(duplicatedLayerData);
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

    function removeLayers(board, layerIds) {
        var selectedIds = layerIds || [];
        var removableLayers;
        var activeOrder;
        var nextLayer;
        var remainingSelectedIds;

        if (!board || !board.layers || board.layers.length <= 1) {
            return false;
        }

        removableLayers = board.layers.filter(function(layer) {
            return selectedIds.indexOf(layer.id) >= 0 &&
                (!layer.blocked || layer.background);
        });
        if (!removableLayers.length) {
            return false;
        }

        if (removableLayers.length >= board.layers.length) {
            removableLayers.pop();
        }
        if (!removableLayers.length) {
            return false;
        }

        activeOrder = getOrderFromBottom(
            removableLayers.filter(function(layer) {
                return layer.id === board.activeLayerId;
            })[0] || removableLayers[0]
        );

        removableLayers.forEach(function(layer) {
            removeLayerElement(board, layer.id);
        });
        board.layers = board.layers.filter(function(layer) {
            return removableLayers.indexOf(layer) < 0;
        });
        normalizeOrders(board.layers);
        syncLayerOrderInDom(board);

        nextLayer = board.layers.filter(function(layer) {
            return layer.id === board.activeLayerId;
        })[0] ||
            findLayerByOrder(board.layers, activeOrder - 1) ||
            findLayerByOrder(board.layers, activeOrder) ||
            board.layers[0] || null;
        remainingSelectedIds = (board.selectedLayerIds || []).filter(function(layerId) {
            return board.layers.some(function(layer) {
                return layer.id === layerId;
            });
        });
        if (nextLayer && remainingSelectedIds.indexOf(nextLayer.id) < 0) {
            remainingSelectedIds.push(nextLayer.id);
        }

        return nextLayer ?
            setLayerSelection(board, remainingSelectedIds, nextLayer.id) :
            false;
    }

    function setActiveLayer(board, layerId) {
        return setLayerSelection(board, [layerId], layerId);
    }

    function mergeSelectedLayers(board) {
        var selectedIds = board && board.selectedLayerIds || [];
        var selectedLayers;
        var topSelectedOrder;
        var referenceCanvas;
        var compositeCanvas;
        var compositeContext;
        var number;
        var mergedLayerId;
        var mergedLayer;
        var mergedElement;
        var mergedCanvas;
        var orderedResult;

        if (!board || !board.layersElement) {
            return false;
        }

        selectedLayers = board.layers.filter(function(layer) {
            return selectedIds.indexOf(layer.id) >= 0;
        }).sort(function(a, b) {
            return getOrderFromBottom(a) - getOrderFromBottom(b);
        });
        if (selectedLayers.length < 2) {
            return false;
        }

        topSelectedOrder = getOrderFromBottom(
            selectedLayers[selectedLayers.length - 1]
        );
        selectedLayers.some(function(layer) {
            var layerElement = getLayerElement(board, layer.id);

            referenceCanvas = layerElement && layerElement.querySelector("canvas");
            return !!referenceCanvas;
        });
        if (!referenceCanvas) {
            return false;
        }

        compositeCanvas = referenceCanvas.ownerDocument.createElement("canvas");
        compositeCanvas.width = referenceCanvas.width;
        compositeCanvas.height = referenceCanvas.height;
        compositeContext = compositeCanvas.getContext("2d");
        selectedLayers.forEach(function(layer) {
            var layerElement;
            var layerCanvas;

            if (layer.visible === false) {
                return;
            }

            layerElement = getLayerElement(board, layer.id);
            layerCanvas = layerElement && layerElement.querySelector("canvas");
            if (layerCanvas) {
                compositeContext.drawImage(layerCanvas, 0, 0);
            }
        });

        number = getNextLayerNumber(board);
        mergedLayerId = board.id + "-layer-" + number;
        mergedLayer = {
            id: mergedLayerId,
            label: "Layer " + number,
            visible: true,
            blocked: false,
            "order-from-the-bottom": topSelectedOrder,
            active: true,
            selected: true
        };

        selectedLayers.forEach(function(layer) {
            removeLayerElement(board, layer.id);
        });
        orderedResult = board.layers.filter(function(layer) {
            return selectedIds.indexOf(layer.id) < 0;
        }).map(function(layer) {
            return {
                layer: layer,
                order: getOrderFromBottom(layer)
            };
        });
        orderedResult.push({
            layer: mergedLayer,
            order: topSelectedOrder
        });
        orderedResult.sort(function(a, b) {
            return a.order - b.order;
        });
        board.layers = orderedResult.map(function(item, index) {
            item.layer["order-from-the-bottom"] = index;
            return item.layer;
        });

        mergedElement = createLayerElement(
            board,
            mergedLayerId,
            mergedLayer["order-from-the-bottom"]
        );
        mergedCanvas = mergedElement.querySelector("canvas");
        mergedCanvas.getContext("2d").drawImage(compositeCanvas, 0, 0);
        syncLayerOrderInDom(board);
        setActiveLayer(board, mergedLayerId);
        return cloneLayer(mergedLayer);
    }

    // Creates a non-destructive composite of every visible layer from bottom to
    // top. The returned canvas is detached and does not change the board state.
    function createFlattenedCanvas(board) {
        var orderedLayers;
        var compositeCanvas;
        var compositeContext;
        var referenceCanvas;

        if (!board ||
            !board.layersElement ||
            !board.layers ||
            !board.layers.length) {
            return null;
        }

        orderedLayers = board.layers.slice().sort(function(a, b) {
            return getOrderFromBottom(a) - getOrderFromBottom(b);
        });
        orderedLayers.some(function(layer) {
            var layerElement = getLayerElement(board, layer.id);

            referenceCanvas = layerElement && layerElement.querySelector("canvas");
            return !!referenceCanvas;
        });
        if (!referenceCanvas) {
            return null;
        }

        compositeCanvas = referenceCanvas.ownerDocument.createElement("canvas");
        compositeCanvas.width = referenceCanvas.width;
        compositeCanvas.height = referenceCanvas.height;
        compositeContext = compositeCanvas.getContext("2d");

        orderedLayers.forEach(function(layer) {
            var layerElement;
            var layerCanvas;

            if (layer.visible === false) {
                return;
            }

            layerElement = getLayerElement(board, layer.id);
            layerCanvas = layerElement && layerElement.querySelector("canvas");
            if (layerCanvas) {
                compositeContext.drawImage(layerCanvas, 0, 0);
            }
        });

        return compositeCanvas;
    }

    // Composites every visible layer from bottom to top and replaces the board's
    // stack with one locked Background layer. Hidden layers are discarded.
    function flattenImage(board) {
        var orderedLayers;
        var targetLayer;
        var targetElement;
        var targetCanvas;
        var compositeCanvas;
        var targetContext;

        if (!board ||
            !board.layersElement ||
            !board.layers ||
            board.layers.length <= 1) {
            return false;
        }

        orderedLayers = board.layers.slice().sort(function(a, b) {
            return getOrderFromBottom(a) - getOrderFromBottom(b);
        });
        targetLayer = orderedLayers.filter(function(layer) {
            return layer.background;
        })[0] || orderedLayers[0];
        targetElement = getLayerElement(board, targetLayer.id);
        targetCanvas = targetElement && targetElement.querySelector("canvas");
        compositeCanvas = createFlattenedCanvas(board);

        if (!targetElement || !targetCanvas || !compositeCanvas) {
            return false;
        }

        targetContext = targetCanvas.getContext("2d");
        targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetContext.drawImage(compositeCanvas, 0, 0);

        orderedLayers.forEach(function(layer) {
            if (layer.id !== targetLayer.id) {
                removeLayerElement(board, layer.id);
            }
        });

        targetLayer.label = "Background";
        targetLayer.visible = true;
        targetLayer.blocked = true;
        targetLayer["order-from-the-bottom"] = 0;
        targetLayer.active = true;
        targetLayer.selected = true;
        targetLayer.background = true;
        delete targetLayer.mask;
        board.layers = [targetLayer];

        targetElement.style.display = "";
        targetElement.style.zIndex = "0";
        setActiveLayer(board, targetLayer.id);
        return true;
    }

    global.PaintBoardLayersManager = {
        cloneLayer: cloneLayer,
        createInitialLayers: createInitialLayers,
        createFlattenedCanvas: createFlattenedCanvas,
        addLayer: addLayer,
        duplicateActiveLayer: duplicateActiveLayer,
        flattenImage: flattenImage,
        mergeSelectedLayers: mergeSelectedLayers,
        removeLayer: removeLayer,
        removeLayers: removeLayers,
        setActiveLayer: setActiveLayer,
        setLayerSelection: setLayerSelection,
        setLayerBlocked: setLayerBlocked,
        setLayerMask: setLayerMask,
        setLayerVisibility: setLayerVisibility,
        setLayersOrder: setLayersOrder
    };

}(window));
