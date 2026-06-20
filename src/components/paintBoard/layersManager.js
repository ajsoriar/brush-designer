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
    // every call so boards never share layer references.
    function createInitialLayers() {
        var template = [
            {
                id: "background",
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

    global.PaintBoardLayersManager = {
        cloneLayer: cloneLayer,
        createInitialLayers: createInitialLayers
    };

}(window));
