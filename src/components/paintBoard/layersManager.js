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
                opacity: 100,
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

    function normalizeLayerOpacity(opacity) {
        var value = Number(opacity);

        if (!isFinite(value)) {
            return 100;
        }

        value = Math.round(value);
        if (value < 0) {
            return 0;
        }
        if (value > 100) {
            return 100;
        }

        return value;
    }

    function getLayerOpacity(layer) {
        var opacity = normalizeLayerOpacity(layer && layer.opacity);

        if (layer && layer.opacity !== opacity) {
            layer.opacity = opacity;
        }

        return opacity;
    }

    function getReadableCanvasContext(canvas) {
        return canvas.getContext("2d", {
            willReadFrequently: true
        });
    }

    function applyLayerOpacityToElement(listItem, opacity) {
        if (!listItem) {
            return;
        }

        listItem.style.opacity = String(normalizeLayerOpacity(opacity) / 100);
    }

    function createLuminanceMaskCanvas(maskCanvas) {
        var alphaCanvas;
        var alphaContext;
        var sourceContext;
        var imageData;
        var data;
        var luminance;
        var i;

        if (!maskCanvas) {
            return null;
        }

        alphaCanvas = maskCanvas.ownerDocument.createElement("canvas");
        alphaCanvas.width = maskCanvas.width;
        alphaCanvas.height = maskCanvas.height;
        alphaContext = getReadableCanvasContext(alphaCanvas);
        sourceContext = getReadableCanvasContext(maskCanvas);
        imageData = sourceContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        data = imageData.data;

        for (i = 0; i < data.length; i += 4) {
            luminance = Math.round(
                (data[i] * 0.2126) +
                (data[i + 1] * 0.7152) +
                (data[i + 2] * 0.0722)
            );
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = Math.round(luminance * (data[i + 3] / 255));
        }

        alphaContext.putImageData(imageData, 0, 0);
        return alphaCanvas;
    }

    function drawLayerWithOpacity(context, layerCanvas, layer, maskCanvas) {
        var opacity = getLayerOpacity(layer);
        var maskedCanvas;
        var maskedContext;
        var alphaMask;
        var blendMode;

        if (!context || !layerCanvas || opacity <= 0) {
            return;
        }

        if (maskCanvas) {
            maskedCanvas = layerCanvas.ownerDocument.createElement("canvas");
            maskedCanvas.width = layerCanvas.width;
            maskedCanvas.height = layerCanvas.height;
            maskedContext = maskedCanvas.getContext("2d");
            maskedContext.drawImage(layerCanvas, 0, 0);
            alphaMask = createLuminanceMaskCanvas(maskCanvas);
            if (alphaMask) {
                maskedContext.globalCompositeOperation = "destination-in";
                maskedContext.drawImage(alphaMask, 0, 0);
            }
            layerCanvas = maskedCanvas;
        }

        blendMode = layer.blendMode || layer["blend-mode"] || "source-over";
        context.save();
        context.globalCompositeOperation = blendMode;
        context.globalAlpha = opacity / 100;
        context.drawImage(layerCanvas, 0, 0);
        context.restore();
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

    function getLayerCanvas(board, layerId) {
        var layerElement = getLayerElement(board, layerId);

        return layerElement &&
            layerElement.querySelector('[data-paint-target="board"]');
    }

    function getLayerById(board, layerId) {
        var found = null;

        if (!board || !board.layers) {
            return null;
        }

        board.layers.forEach(function(layer) {
            if (layer.id === layerId) {
                found = layer;
            }
        });

        return found;
    }

    function getLayerMaskCanvas(board, layerId) {
        var layerElement = getLayerElement(board, layerId);

        return layerElement &&
            layerElement.querySelector('[data-paint-target="mask"]');
    }

    function createLayerMaskCanvas(board, layerId) {
        var layerElement = getLayerElement(board, layerId);
        var layerCanvas = getLayerCanvas(board, layerId);
        var maskCanvas;
        var maskContext;

        if (!layerElement || !layerCanvas) {
            return null;
        }

        maskCanvas = getLayerMaskCanvas(board, layerId);
        if (maskCanvas) {
            return maskCanvas;
        }

        maskCanvas = layerCanvas.ownerDocument.createElement("canvas");
        maskCanvas.className = "paint-board-canvas paint-board-mask-canvas";
        maskCanvas.setAttribute("data-paint-target", "mask");
        maskCanvas.width = layerCanvas.width;
        maskCanvas.height = layerCanvas.height;
        maskCanvas.style.display = "none";
        maskCanvas.style.width = layerCanvas.style.width;
        maskCanvas.style.height = layerCanvas.style.height;

        maskContext = getReadableCanvasContext(maskCanvas);
        maskContext.fillStyle = "#ffffff";
        maskContext.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        layerElement.appendChild(maskCanvas);
        applyLayerMaskToElement(board, layerId);
        return maskCanvas;
    }

    function applyLayerMaskToElement(board, layerId) {
        var layer = getLayerById(board, layerId);
        var layerElement = getLayerElement(board, layerId);
        var maskCanvas = getLayerMaskCanvas(board, layerId);
        var alphaMask;
        var maskUrl;

        if (!layerElement) {
            return false;
        }

        if (!layer || !layer.mask || !maskCanvas) {
            layerElement.style.maskImage = "";
            layerElement.style.maskMode = "";
            layerElement.style.maskRepeat = "";
            layerElement.style.maskSize = "";
            layerElement.style.webkitMaskImage = "";
            layerElement.style.webkitMaskRepeat = "";
            layerElement.style.webkitMaskSize = "";
            return true;
        }

        alphaMask = createLuminanceMaskCanvas(maskCanvas);
        maskUrl = "url(" + (alphaMask || maskCanvas).toDataURL() + ")";
        layerElement.style.maskImage = maskUrl;
        layerElement.style.maskMode = "alpha";
        layerElement.style.maskRepeat = "no-repeat";
        layerElement.style.maskSize = "100% 100%";
        layerElement.style.webkitMaskImage = maskUrl;
        layerElement.style.webkitMaskRepeat = "no-repeat";
        layerElement.style.webkitMaskSize = "100% 100%";
        return true;
    }

    function applyLayerMasksToElements(board) {
        if (!board || !board.layers) {
            return false;
        }

        board.layers.forEach(function(layer) {
            if (layer && layer.mask) {
                applyLayerMaskToElement(board, layer.id);
            }
        });
        return true;
    }

    function syncLayerOrderInDom(board) {
        board.layers.forEach(function(layer) {
            var listItem = getLayerElement(board, layer.id);

            if (listItem) {
                listItem.style.zIndex = String(getOrderFromBottom(layer));
                applyLayerOpacityToElement(listItem, getLayerOpacity(layer));
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
        canvas.setAttribute("data-paint-target", "board");
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
    function setLayerSelection(board, selectedLayerIds, activeLayerId, paintTarget) {
        var listItem = null;
        var canvas;
        var validSelectedIds = [];
        var target = paintTarget === "mask" ? "mask" : "board";
        var activeLayer;

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

        activeLayer = getLayerById(board, activeLayerId);
        if (target === "mask" && activeLayer && activeLayer.mask) {
            canvas = createLayerMaskCanvas(board, activeLayerId);
        } else {
            target = "board";
            canvas = getLayerCanvas(board, activeLayerId);
        }

        if (!listItem || !canvas) {
            return false;
        }

        board.activeLayerElement = listItem;
        board.activeLayerId = activeLayerId;
        board.activePaintTarget = target;
        board.inputCanvas = getLayerCanvas(board, activeLayerId);
        board.selectedLayerIds = validSelectedIds.slice();
        board.canvas = canvas;
        board.context = getReadableCanvasContext(canvas);

        board.layers.forEach(function(layer) {
            layer.active = layer.id === activeLayerId;
            layer.selected = validSelectedIds.indexOf(layer.id) >= 0;
            if (layer.active) {
                layer.activePaintTarget = target;
            } else {
                delete layer.activePaintTarget;
            }
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

    // Synchronizes layer opacity in board data and DOM. Opacity is stored as an
    // integer percentage in the [0..100] range.
    function setLayerOpacity(board, layerId, opacity) {
        var listItem = getLayerElement(board, layerId);
        var layerFound = false;
        var normalized = normalizeLayerOpacity(opacity);

        board.layers.forEach(function(layer) {
            if (layer.id === layerId) {
                layer.opacity = normalized;
                layerFound = true;
            }
        });

        if (listItem) {
            applyLayerOpacityToElement(listItem, normalized);
        }

        return layerFound;
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
                createLayerMaskCanvas(board, layerId);
            } else {
                delete layer.mask;
                if (board.activeLayerId === layerId &&
                    board.activePaintTarget === "mask") {
                    setLayerSelection(board, board.selectedLayerIds, layerId, "board");
                }
            }
            applyLayerMaskToElement(board, layerId);
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
    // "<boardId>-layer-<n>") inside the board's <ol>. The new layer becomes
    // the active/selected layer. Returns a copy of the new layer.
    function addLayer(board, options) {
        var settings = options || {};
        var number = getNextLayerNumber(board);
        var layerId = board.id + "-layer-" + number;
        var activeOrder = getTopOrder(board.layers);
        var layerData = {
            id: layerId,
            label: settings.label || ("Layer " + number),
            visible: true,
            opacity: normalizeLayerOpacity(settings.opacity),
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
        setLayerOpacity(board, layerId, layerData.opacity);
        setActiveLayer(board, layerId);

        return cloneLayer(layerData);
    }

    // Duplicates the active layer immediately above itself. Pixel data and the
    // layer's editable metadata are copied, but a duplicated Background always
    // becomes a normal, unlocked layer.
    function duplicateActiveLayer(board) {
        var sourceLayer;
        var duplicatedLayer;
        var duplicatedLayerData;
        var sourceCanvas;
        var duplicatedCanvas;
        var sourceMaskCanvas;
        var duplicatedMaskCanvas;

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
        duplicatedLayerData.opacity = getLayerOpacity(sourceLayer);
        duplicatedLayerData.blocked = sourceLayer.background ?
            false :
            sourceLayer.blocked === true;
        duplicatedLayerData.background = false;

        if (sourceLayer.mask) {
            duplicatedLayerData.mask = cloneLayer(sourceLayer.mask);
            duplicatedLayerData.mask.id = duplicatedLayerData.id + "-mask";
        }

        sourceCanvas = getLayerCanvas(board, sourceLayer.id);
        duplicatedCanvas = getLayerCanvas(board, duplicatedLayerData.id);

        if (sourceCanvas && duplicatedCanvas) {
            duplicatedCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
        }
        if (sourceLayer.mask) {
            sourceMaskCanvas = getLayerMaskCanvas(board, sourceLayer.id);
            duplicatedMaskCanvas = createLayerMaskCanvas(board, duplicatedLayerData.id);
            if (sourceMaskCanvas && duplicatedMaskCanvas) {
                duplicatedMaskCanvas.getContext("2d").clearRect(
                    0,
                    0,
                    duplicatedMaskCanvas.width,
                    duplicatedMaskCanvas.height
                );
                duplicatedMaskCanvas.getContext("2d").drawImage(sourceMaskCanvas, 0, 0);
                applyLayerMaskToElement(board, duplicatedLayerData.id);
            }
        }
        if (getLayerElement(board, duplicatedLayerData.id)) {
            getLayerElement(board, duplicatedLayerData.id).style.display = duplicatedLayerData.visible ?
                "" :
                "none";
        }
        setLayerOpacity(board, duplicatedLayerData.id, duplicatedLayerData.opacity);

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

    function setActiveLayer(board, layerId, paintTarget) {
        return setLayerSelection(board, [layerId], layerId, paintTarget);
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

            referenceCanvas = layerElement && getLayerCanvas(board, layer.id);
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
            layerCanvas = layerElement && getLayerCanvas(board, layer.id);
            if (layerCanvas) {
                drawLayerWithOpacity(
                    compositeContext,
                    layerCanvas,
                    layer,
                    layer.mask && getLayerMaskCanvas(board, layer.id)
                );
            }
        });

        number = getNextLayerNumber(board);
        mergedLayerId = board.id + "-layer-" + number;
        mergedLayer = {
            id: mergedLayerId,
            label: "Layer " + number,
            visible: true,
            opacity: 100,
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
        mergedCanvas = getLayerCanvas(board, mergedLayerId);
        mergedCanvas.getContext("2d").drawImage(compositeCanvas, 0, 0);
        applyLayerOpacityToElement(mergedElement, mergedLayer.opacity);
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

            referenceCanvas = layerElement && getLayerCanvas(board, layer.id);
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
            layerCanvas = layerElement && getLayerCanvas(board, layer.id);
            if (layerCanvas) {
                drawLayerWithOpacity(
                    compositeContext,
                    layerCanvas,
                    layer,
                    layer.mask && getLayerMaskCanvas(board, layer.id)
                );
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
        targetCanvas = targetElement && getLayerCanvas(board, targetLayer.id);
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
        targetLayer.opacity = 100;
        targetLayer.blocked = true;
        targetLayer["order-from-the-bottom"] = 0;
        targetLayer.active = true;
        targetLayer.selected = true;
        targetLayer.background = true;
        delete targetLayer.mask;
        board.layers = [targetLayer];

        targetElement.style.display = "";
        targetElement.style.opacity = "1";
        targetElement.style.zIndex = "0";
        setActiveLayer(board, targetLayer.id);
        return true;
    }

    global.PaintBoardLayersManager = {
        cloneLayer: cloneLayer,
        createInitialLayers: createInitialLayers,
        createFlattenedCanvas: createFlattenedCanvas,
        getLayerMaskCanvas: getLayerMaskCanvas,
        applyLayerMaskToElement: applyLayerMaskToElement,
        applyLayerMasksToElements: applyLayerMasksToElements,
        addLayer: addLayer,
        duplicateActiveLayer: duplicateActiveLayer,
        flattenImage: flattenImage,
        mergeSelectedLayers: mergeSelectedLayers,
        removeLayer: removeLayer,
        removeLayers: removeLayers,
        setActiveLayer: setActiveLayer,
        setLayerSelection: setLayerSelection,
        setLayerBlocked: setLayerBlocked,
        setLayerOpacity: setLayerOpacity,
        setLayerMask: setLayerMask,
        setLayerVisibility: setLayerVisibility,
        setLayersOrder: setLayersOrder
    };

}(window));
