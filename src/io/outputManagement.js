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
        var activeLayerId = null;
        var selectedLayerIds = [];
        var restoredOrder = [];
        var loadTasks = [];
        var i;

        if (!lm || !savedLayers || !savedLayers.length) {
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
            var orderFromBottom;

            if (!layer) {
                return;
            }

            layer.label = saved.label;
            layer.visible = saved.visible;
            layer.opacity = saved.opacity;
            layer.blocked = saved.blocked;
            layer.selected = saved.selected;
            layer.active = saved.active;
            layer.background = saved.background || false;
            orderFromBottom = typeof saved["order-from-the-bottom"] === "number" ?
                saved["order-from-the-bottom"] :
                i;

            if (saved.blendMode) {
                layer.blendMode = saved.blendMode;
            }

            restoredOrder.push({
                id: layer.id,
                "order-from-the-bottom": orderFromBottom
            });

            if (saved.selected) {
                selectedLayerIds.push(layer.id);
            }
            if (saved.active) {
                activeLayerId = layer.id;
            }

            lm.setLayerVisibility(board, layer.id, saved.visible !== false);
            lm.setLayerOpacity(board, layer.id, saved.opacity);

            loadTasks.push(restoreCanvasFromData(board, layer.id, saved.canvasData));

            if (saved.mask && saved.mask.id) {
                lm.setLayerMask(board, layer.id, { id: saved.mask.id });

                if (saved.maskData) {
                    loadTasks.push(
                        restoreCanvasFromData(board, layer.id, saved.maskData, "mask")
                            .then(function() {
                                lm.applyLayerMaskToElement(board, layer.id);
                            })
                    );
                }
            }
        });

        lm.setLayersOrder(board, restoredOrder);

        if (!activeLayerId && selectedLayerIds.length) {
            activeLayerId = selectedLayerIds[selectedLayerIds.length - 1];
        }
        if (!activeLayerId && board.layers.length) {
            activeLayerId = board.layers[board.layers.length - 1].id;
        }
        if (!selectedLayerIds.length && activeLayerId) {
            selectedLayerIds.push(activeLayerId);
        }

        if (activeLayerId) {
            if (board.setLayerSelection) {
                board.setLayerSelection(selectedLayerIds, activeLayerId, "board");
            } else {
                lm.setLayerSelection(board, selectedLayerIds, activeLayerId, "board");
            }
        }

        Promise.all(loadTasks).then(function() {
            refreshProjectBoard(board);
        }).catch(function(error) {
            console.log("Open project layer restore failed:", error);
            refreshProjectBoard(board);
        });
        refreshProjectBoard(board);
    }

    function restoreCanvasFromData(board, layerId, dataURL, target) {
        var canvas = findLayerCanvas(board, layerId, target || "board");

        if (!canvas || !dataURL) {
            return Promise.resolve(false);
        }

        return loadImageOntoCanvas(dataURL, canvas);
    }

    function loadImageOntoCanvas(dataURL, canvas) {
        return new Promise(function(resolve, reject) {
            var img = new Image();

            img.onload = function() {
                var ctx;

                canvas.width = img.width;
                canvas.height = img.height;
                canvas.style.width = img.width + "px";
                canvas.style.height = img.height + "px";
                ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                resolve(true);
            };
            img.onerror = function() {
                reject(new Error("Could not load project layer image."));
            };
            img.src = dataURL;
        });
    }

    function refreshProjectBoard(board) {
        if (global.AppOpenWindows &&
                typeof global.AppOpenWindows.refreshLayersPanel === "function") {
            global.AppOpenWindows.refreshLayersPanel(board);
        }

        notifyProjectBoardContentChange(board);
    }

    function notifyProjectBoardContentChange(board) {
        var event;
        var detail;

        if (!board) {
            return;
        }

        detail = {
            board: board.element,
            paintBoard: board,
            layerId: board.activeLayerId,
            paintTarget: board.activePaintTarget || "board",
            canvas: board.canvas,
            refreshLayersPanel: true
        };

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("paint-board-content-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("paint-board-content-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    var PDF_LIB_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";

    function saveAsPdf() {
        var board = getActiveBoard();

        if (!board) {
            return;
        }

        loadScript(PDF_LIB_CDN).then(function() {
            buildPdfWithLayers(board);
        }).catch(function() {
            if (!global.PDFLib) {
                return;
            }

            buildPdfWithLayers(board);
        });
    }

    function buildPdfWithLayers(board) {
        var pdfLib = global.PDFLib;
        var width = board.width;
        var height = board.height;
        var pageHeight = board.canvas ? board.canvas.height : height;
        var layers;
        var tasks = [];
        var layerInfos = [];
        var i;
        var layer;
        var canvas;

        layers = board.layers;

        if (layers && layers.length > 0) {
            for (i = 0; i < layers.length; i++) {
                layer = layers[i];
                canvas = findLayerCanvas(board, layer.id, "board");

                if (canvas && layer.visible !== false) {
                    layerInfos.push({
                        label: layer.label || layer.id,
                        canvas: canvas
                    });
                }
            }
        } else {
            layerInfos.push({
                label: "Canvas",
                canvas: board.canvas
            });
        }

        if (layerInfos.length === 0) {
            return;
        }

        layerInfos.forEach(function(info) {
            tasks.push(capturePngBytes(info.canvas).then(function(bytes) {
                info.pngBytes = bytes;
            }));
        });

        Promise.all(tasks).then(function() {
            assemblePdf(pdfLib, board, layerInfos, width, pageHeight);
        });
    }

    function capturePngBytes(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (!blob) {
                    reject(new Error("canvas.toBlob failed"));
                    return;
                }

                blob.arrayBuffer().then(function(buffer) {
                    resolve(new Uint8Array(buffer));
                }).catch(reject);
            }, "image/png");
        });
    }

    async function assemblePdf(pdfLib, board, layerInfos, width, height) {
        var pdfDoc;
        var page;
        var content = "";
        var ocgRefs = [];
        var ocgNames = [];
        var imageNames = [];
        var i;
        var info;
        var image;
        var ocgRef;
        var imageName;
        var pdfBytes;
        var blob;
        var link;
        var fileName;

        pdfDoc = pdfLib.PDFDocument.create();
        page = pdfDoc.addPage([width, height]);

        for (i = layerInfos.length - 1; i >= 0; i--) {
            info = layerInfos[i];

            image = await pdfDoc.embedPng(info.pngBytes);
            ocgRef = pdfDoc.context.nextRef();

            pdfDoc.context.assign(ocgRef, pdfDoc.context.obj({
                Type: "OCG",
                Name: info.label
            }));

            imageName = page.node.addXObject(image.ref);

            ocgRefs.push(ocgRef);
            ocgNames.push(info.label);

            content = "/OC " + formatPdfRef(ocgRef) + " BDC\n" +
                "q\n" +
                width + " 0 0 " + height + " 0 0 cm\n" +
                "/" + imageName + " Do\n" +
                "Q\n" +
                "EMC\n";

            page.node.addContentStream(pdfDoc.context.stream(content));
        }

        setupOcgLayers(pdfDoc, ocgRefs);

        pdfBytes = pdfDoc.save();
        blob = new Blob([pdfBytes], { type: "application/pdf" });
        fileName = (board.id || "project") + ".pdf";
        link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function formatPdfRef(ref) {
        return ref.objectNumber + " " + ref.generationNumber + " R";
    }

    function setupOcgLayers(pdfDoc, ocgRefs) {
        var ocProperties;

        if (!ocgRefs || ocgRefs.length === 0) {
            return;
        }

        ocProperties = pdfDoc.context.obj({
            OCGs: ocgRefs,
            D: {
                Name: "Layers",
                Order: ocgRefs,
                BaseState: "ON"
            }
        });

        pdfDoc.catalog.setOCProperties(ocProperties);
    }

    function loadScript(url) {
        return new Promise(function(resolve, reject) {
            var existing = document.querySelector('script[src="' + url + '"]');

            if (existing) {
                resolve();
                return;
            }

            var script = document.createElement("script");

            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    global.OutputManagement = {
        saveAsProject: saveAsProject,
        openProject: openProject,
        saveAsPdf: saveAsPdf
    };

}(window));
