(function(global) {

    "use strict";

    var EXTENSION = ".brushproj";
    var PROJECT_VERSION = 1;

    function saveAsProject() {
        var board = getActiveBoard();
        var project;
        var json;

        if (!board) {
            return;
        }

        project = buildProject(board);
        json = JSON.stringify(project, null, 2);
        download(json, project.name + EXTENSION);
    }

    function buildProject(board) {
        return {
            name: getTimestamp(),
            version: PROJECT_VERSION,
            board: {
                id: board.id,
                width: board.width,
                height: board.height
            },
            layers: serializeLayers(board)
        };
    }

    function serializeLayers(board) {
        var layers = board.layers;
        var result = [];

        if (!layers || layers.length === 0) {
            result.push(serializeSingleCanvas(board));
            return result;
        }

        layers.forEach(function(layer) {
            result.push(serializeLayer(board, layer));
        });

        return result;
    }

    function serializeSingleCanvas(board) {
        return {
            id: board.id + "-canvas",
            label: "Canvas",
            visible: true,
            opacity: 100,
            blocked: false,
            "order-from-the-bottom": 0,
            selected: true,
            active: true,
            canvasData: board.canvas.toDataURL()
        };
    }

    function serializeLayer(board, layer) {
        var data = {
            id: layer.id,
            label: layer.label,
            visible: layer.visible,
            opacity: layer.opacity,
            blocked: layer.blocked,
            "order-from-the-bottom": layer["order-from-the-bottom"],
            selected: layer.selected,
            active: layer.active
        };

        if (layer.background) {
            data.background = true;
        }

        if (layer.blendMode) {
            data.blendMode = layer.blendMode;
        }

        captureCanvasData(board, layer.id, data);

        if (layer.mask && layer.mask.id) {
            data.mask = { id: layer.mask.id };
            captureMaskData(board, layer.id, data);
        }

        return data;
    }

    function captureCanvasData(board, layerId, data) {
        var canvas = findLayerCanvas(board, layerId, "board");

        if (canvas) {
            data.canvasData = canvas.toDataURL();
        }
    }

    function captureMaskData(board, layerId, data) {
        var canvas = findLayerCanvas(board, layerId, "mask");

        if (canvas) {
            data.maskData = canvas.toDataURL();
        }
    }

    function findLayerCanvas(board, layerId, target) {
        var layerElement;

        if (!board.layersElement) {
            return null;
        }

        layerElement = board.layersElement.querySelector('[data-layer="' + layerId + '"]');
        if (!layerElement) {
            return null;
        }

        return layerElement.querySelector('[data-paint-target="' + target + '"]');
    }

    function getTimestamp() {
        var now = new Date();
        var pad = function(n) { return String(n).padStart(2, "0"); };

        return "project-" + now.getFullYear() + "-" +
            pad(now.getMonth() + 1) + "-" +
            pad(now.getDate()) + "-" +
            pad(now.getHours()) + "-" +
            pad(now.getMinutes()) + "-" +
            pad(now.getSeconds());
    }

    function download(content, fileName) {
        var link = document.createElement("a");

        link.href = "data:application/json;charset=utf-8," + encodeURIComponent(content);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function getActiveBoard() {
        if (global.AppOpenWindows && typeof global.AppOpenWindows.getActivePaintBoard === "function") {
            return global.AppOpenWindows.getActivePaintBoard();
        }

        return null;
    }

    function openProject() {
        var input = document.createElement("input");

        input.type = "file";
        input.accept = EXTENSION;
        input.addEventListener("change", function() {
            var file = input.files && input.files[0];

            if (file) {
                readProjectFile(file);
            }
        });
        input.click();
    }

    function readProjectFile(file) {
        var reader = new FileReader();

        reader.addEventListener("load", function() {
            var project;

            try {
                project = JSON.parse(reader.result);
            } catch (e) {
                return;
            }

            if (!project || !project.board || !project.layers) {
                return;
            }

            restoreProject(project);
        });
        reader.readAsText(file);
    }

    function restoreProject(project) {
        var boardWindow = openNewBoard(project.board);
        var board;

        if (!boardWindow) {
            return;
        }

        board = getActiveBoard();
        if (!board) {
            return;
        }

        rebuildLayers(board, project.layers);
    }

    function openNewBoard(boardData) {
        if (global.AppOpenWindows && typeof global.AppOpenWindows.openPaintBoardWindow === "function") {
            return global.AppOpenWindows.openPaintBoardWindow({
                width: boardData.width,
                height: boardData.height,
                backgroundColor: "#ffffff"
            });
        }

        return null;
    }

    function rebuildLayers(board, savedLayers) {
        var lm = global.PaintBoardLayersManager;
        var existing = board.layers.slice();
        var i;
        var saved;

        if (!lm) {
            return;
        }

        for (i = existing.length - 1; i > 0; i--) {
            lm.removeLayer(board, existing[i].id);
        }

        for (i = 1; i < savedLayers.length; i++) {
            lm.addLayer(board, {});
        }

        savedLayers.forEach(function(saved, i) {
            var layer = board.layers[i];

            if (!layer) {
                return;
            }

            layer.label = saved.label;
            layer.visible = saved.visible;
            layer.opacity = saved.opacity;
            layer.blocked = saved.blocked;
            layer["order-from-the-bottom"] = saved["order-from-the-bottom"];
            layer.selected = saved.selected;
            layer.active = saved.active;
            layer.background = saved.background || false;

            if (saved.blendMode) {
                layer.blendMode = saved.blendMode;
            }

            lm.setLayerOpacity(board, layer.id, saved.opacity);

            restoreCanvasFromData(board, layer.id, saved.canvasData);

            if (saved.mask && saved.mask.id) {
                lm.setLayerMask(board, layer.id, { id: saved.mask.id });

                if (saved.maskData) {
                    restoreCanvasFromData(board, layer.id, saved.maskData, "mask");
                }
            }
        });

        if (savedLayers.length > 0) {
            lm.setActiveLayer(board, board.layers[0].id);
        }
    }

    function restoreCanvasFromData(board, layerId, dataURL, target) {
        var canvas = findLayerCanvas(board, layerId, target || "board");

        if (!canvas || !dataURL) {
            return;
        }

        loadImageOntoCanvas(dataURL, canvas);
    }

    function loadImageOntoCanvas(dataURL, canvas) {
        var img = new Image();

        img.onload = function() {
            var ctx = canvas.getContext("2d");

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = dataURL;
    }

    global.OutputManagement = {
        saveAsProject: saveAsProject,
        openProject: openProject
    };

}(window));
