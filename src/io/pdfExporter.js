(function(global) {

    "use strict";

    var PDF_LIB_CDN = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

    function getActiveBoard() {
        if (global.AppOpenWindows && typeof global.AppOpenWindows.getActivePaintBoard === "function") {
            return global.AppOpenWindows.getActivePaintBoard();
        }

        return null;
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

    function saveAsPdf() {
        var board = getActiveBoard();

        if (!board) {
            return;
        }

        loadScript(PDF_LIB_CDN).then(function() {
            if (!global.PDFLib || typeof global.PDFLib.PDFDocument !== "function") {
                return;
            }

            buildPdfWithLayers(board);
        }).catch(function() {
            if (!global.PDFLib || typeof global.PDFLib.PDFDocument !== "function") {
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
                        layer: layer,
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

        layerInfos.sort(function(a, b) {
            return getLayerOrderFromBottom(a.layer) - getLayerOrderFromBottom(b.layer);
        });

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

    function getLayerOrderFromBottom(layer) {
        return layer && typeof layer["order-from-the-bottom"] === "number" ?
            layer["order-from-the-bottom"] : 0;
    }

    async function assemblePdf(pdfLib, board, layerInfos, width, height) {
        var pdfDoc;
        var page;
        var content = "";
        var ocgRefs = [];
        var i;
        var info;
        var image;
        var ocgRef;
        var ocgName;
        var imageName;
        var resourceName;
        var contentStreamRef;
        var pdfBytes;
        var blob;
        var link;
        var fileName;

        pdfDoc = await pdfLib.PDFDocument.create();
        page = pdfDoc.addPage([width, height]);

        for (i = 0; i < layerInfos.length; i++) {
            info = layerInfos[i];

            image = await pdfDoc.embedPng(info.pngBytes);
            ocgRef = pdfDoc.context.nextRef();

            pdfDoc.context.assign(ocgRef, pdfDoc.context.obj({
                Type: pdfLib.PDFName.of("OCG"),
                Name: pdfLib.PDFString.of(String(info.label || "Layer"))
            }));

            imageName = registerImageXObject(page, image.ref, i);
            resourceName = normalizePdfName(imageName);

            if (!resourceName) {
                continue;
            }

            ocgRefs.push(ocgRef);
            ocgName = registerOcgProperty(pdfLib, page, ocgRef, i);

            content = "/OC /" + normalizePdfName(ocgName) + " BDC\n" +
                "q\n" +
                width + " 0 0 " + height + " 0 0 cm\n" +
                "/" + resourceName + " Do\n" +
                "Q\n" +
                "EMC\n";

            contentStreamRef = pdfDoc.context.register(pdfDoc.context.stream(content));
            page.node.addContentStream(contentStreamRef);
        }

        setupOcgLayers(pdfLib, pdfDoc, ocgRefs);

        pdfBytes = await pdfDoc.save();
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

    function registerImageXObject(page, imageRef, index) {
        var xObjectName;

        if (!page || !page.node) {
            return null;
        }

        if (typeof page.node.addXObject === "function") {
            return page.node.addXObject(imageRef);
        }

        if (typeof page.node.newXObject === "function") {
            xObjectName = "Im" + String(index + 1);
            return page.node.newXObject(xObjectName, imageRef);
        }

        return null;
    }

    function normalizePdfName(name) {
        var raw;

        if (!name) {
            return null;
        }

        if (typeof name === "string") {
            return name.charAt(0) === "/" ? name.substring(1) : name;
        }

        if (typeof name.toString === "function") {
            raw = name.toString();
            return raw.charAt(0) === "/" ? raw.substring(1) : raw;
        }

        return null;
    }

    function registerOcgProperty(pdfLib, page, ocgRef, index) {
        var resources;
        var properties;
        var propertyName;

        resources = page.node.normalizedEntries().Resources;
        properties = resources.lookupMaybe(
            pdfLib.PDFName.of("Properties"),
            pdfLib.PDFDict
        ) || page.node.context.obj({});

        resources.set(pdfLib.PDFName.of("Properties"), properties);

        propertyName = pdfLib.PDFName.of("OC" + String(index + 1));
        properties.set(propertyName, ocgRef);

        return propertyName;
    }

    function setupOcgLayers(pdfLib, pdfDoc, ocgRefs) {
        var ocProperties;
        var ocPropertiesRef;

        if (!ocgRefs || ocgRefs.length === 0) {
            return;
        }

        ocProperties = pdfDoc.context.obj({
            OCGs: ocgRefs,
            D: {
                Name: pdfLib.PDFString.of("Layers"),
                Order: ocgRefs,
                BaseState: pdfLib.PDFName.of("ON"),
                ON: ocgRefs
            }
        });

        ocPropertiesRef = pdfDoc.context.register(ocProperties);
        pdfDoc.catalog.set(pdfLib.PDFName.of("OCProperties"), ocPropertiesRef);
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

    global.PdfExporter = {
        saveAsPdf: saveAsPdf
    };

}(window));
