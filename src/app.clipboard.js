(function(global) {

    "use strict";

    var DEFAULT_DOCUMENT_SIZE = {
        width: 800,
        height: 600
    };
    var MAX_COPY_HISTORY = 8;
    var copyHistory = [];
    var historyId = 0;

    function getNewDocumentInitialSize() {
        if (!canReadClipboard()) {
            return Promise.resolve(DEFAULT_DOCUMENT_SIZE);
        }

        return global.navigator.clipboard.read().then(function(items) {
            var imageBlob = getClipboardImageBlob(items);

            if (!imageBlob) {
                return DEFAULT_DOCUMENT_SIZE;
            }

            return getImageBlobSize(imageBlob).then(function(size) {
                return size || DEFAULT_DOCUMENT_SIZE;
            });
        }).catch(function(error) {
            console.log("Could not read clipboard image size:", error);
            return DEFAULT_DOCUMENT_SIZE;
        });
    }

    function pasteImageFromClipboard(board, options) {
        if (!board || !canReadClipboard()) {
            return Promise.resolve(false);
        }

        return global.navigator.clipboard.read().then(function(items) {
            var imageBlob = getClipboardImageBlob(items);

            if (!imageBlob) {
                return false;
            }

            return pasteImageBlob(board, imageBlob, options).then(function(pasted) {
                return pasted !== false;
            });
        });
    }

    function copyBoardToClipboard(board) {
        if (!board) {
            return Promise.resolve(false);
        }

        return getBoardClipboardEntry(board).then(function(entry) {
            addCopyHistoryEntry(entry);

            if (!global.navigator.clipboard ||
                !global.navigator.clipboard.write ||
                !global.ClipboardItem) {
                return false;
            }

            var item = new global.ClipboardItem({
                "image/png": entry.blob
            });

            return global.navigator.clipboard.write([item]).then(function() {
                return true;
            });
        });
    }

    function copyMergedBoardToClipboard(board) {
        if (!board) {
            return Promise.resolve(false);
        }

        return getMergedBoardClipboardEntry(board).then(function(entry) {
            addCopyHistoryEntry(entry);

            if (!global.navigator.clipboard ||
                !global.navigator.clipboard.write ||
                !global.ClipboardItem) {
                return false;
            }

            var item = new global.ClipboardItem({
                "image/png": entry.blob
            });

            return global.navigator.clipboard.write([item]).then(function() {
                return true;
            });
        });
    }

    function getCopyHistory() {
        return copyHistory.slice();
    }

    function pasteCopyHistoryEntry(board, entryId) {
        var entry = copyHistory.find(function(item) {
            return item.id === entryId;
        });

        if (!board || !entry) {
            return Promise.resolve(false);
        }

        return pasteImageBlob(board, Promise.resolve(entry.blob)).then(function() {
            return true;
        });
    }

    function addCopyHistoryEntry(entry) {
        copyHistory.unshift(entry);
        copyHistory = copyHistory.slice(0, MAX_COPY_HISTORY);
        notifyCopyHistoryChange();
    }

    function notifyCopyHistoryChange() {
        var detail = {
            entries: getCopyHistory()
        };
        var event;

        if (typeof global.CustomEvent === "function") {
            event = new global.CustomEvent("app-clipboard-history-change", {
                detail: detail
            });
        } else {
            event = document.createEvent("CustomEvent");
            event.initCustomEvent("app-clipboard-history-change", false, false, detail);
        }

        global.dispatchEvent(event);
    }

    function canReadClipboard() {
        return Boolean(global.navigator.clipboard && global.navigator.clipboard.read);
    }

    function getClipboardImageBlob(items) {
        var i;
        var j;
        var item;
        var type;

        for (i = 0; i < items.length; i++) {
            item = items[i];

            for (j = 0; j < item.types.length; j++) {
                type = item.types[j];

                if (type.indexOf("image/") === 0) {
                    return item.getType(type);
                }
            }
        }

        return null;
    }

    function getImageBlobSize(imageBlobPromise) {
        return imageBlobPromise.then(function(blob) {
            if (global.createImageBitmap) {
                return global.createImageBitmap(blob).then(function(imageBitmap) {
                    var size = {
                        width: imageBitmap.width,
                        height: imageBitmap.height
                    };

                    if (imageBitmap.close) {
                        imageBitmap.close();
                    }

                    return size;
                });
            }

            return getImageElementSize(blob);
        });
    }

    function getImageElementSize(blob) {
        return new Promise(function(resolve) {
            var image = new global.Image();
            var objectUrl = global.URL.createObjectURL(blob);

            image.onload = function() {
                var size = {
                    width: image.naturalWidth || image.width,
                    height: image.naturalHeight || image.height
                };

                global.URL.revokeObjectURL(objectUrl);
                resolve(size);
            };

            image.onerror = function() {
                global.URL.revokeObjectURL(objectUrl);
                resolve(null);
            };

            image.src = objectUrl;
        });
    }

    function pasteImageBlob(board, imageBlobPromise, options) {
        return imageBlobPromise.then(function(blob) {
            if (global.createImageBitmap) {
                return global.createImageBitmap(blob).then(function(imageBitmap) {
                    return pasteImageOnBoard(board, imageBitmap, options);
                });
            }

            return pasteImageWithElement(board, blob, options);
        });
    }

    function pasteImageWithElement(board, blob, options) {
        return new Promise(function(resolve) {
            var image = new global.Image();
            var objectUrl = global.URL.createObjectURL(blob);

            image.onload = function() {
                var pasted = pasteImageOnBoard(board, image, options);

                global.URL.revokeObjectURL(objectUrl);
                resolve(pasted);
            };

            image.src = objectUrl;
        });
    }

    function pasteImageOnBoard(board, image, options) {
        if (options &&
            typeof options.beforePaste === "function" &&
            options.beforePaste(board, image) === false) {
            return false;
        }

        if (board && typeof board.hasSelection === "function" &&
            board.hasSelection() &&
            typeof board.clearSelection === "function") {
            board.clearSelection();
        }

        if (board && board.floatingPaste &&
            typeof board.commitFloatingPaste === "function") {
            board.commitFloatingPaste();
        }

        if (board && typeof board.startFloatingPaste === "function") {
            board.startFloatingPaste(
                image,
                options && options.floatingPasteMetadata
            );
            return true;
        }

        board.drawImage(image, 0, 0);
        return true;
    }

    function getBoardClipboardEntry(board) {
        var sourceCanvas = board.getClipboardCanvas ?
            board.getClipboardCanvas() :
            board.canvas;

        return canvasToClipboardEntry(sourceCanvas);
    }

    function getMergedBoardClipboardEntry(board) {
        var flattenedCanvas = board.createFlattenedCanvas ?
            board.createFlattenedCanvas() :
            null;
        var sourceCanvas = flattenedCanvas || board.canvas;

        if (!sourceCanvas) {
            return Promise.reject(new Error("Could not create merged image canvas from board."));
        }

        if (board.hasSelection && board.hasSelection() && board.selection && board.selection.maskCanvas) {
            sourceCanvas = clipCanvasBySelection(sourceCanvas, board.selection.maskCanvas);
        }

        return canvasToClipboardEntry(sourceCanvas);
    }

    function clipCanvasBySelection(sourceCanvas, selectionMaskCanvas) {
        var bounds;
        var clipboardCanvas;
        var clipboardContext;

        bounds = getSelectionMaskBounds(selectionMaskCanvas);
        if (!bounds) {
            return sourceCanvas;
        }

        clipboardCanvas = document.createElement("canvas");
        clipboardCanvas.width = bounds.width;
        clipboardCanvas.height = bounds.height;
        clipboardContext = clipboardCanvas.getContext("2d");
        clipboardContext.drawImage(
            sourceCanvas,
            bounds.left,
            bounds.top,
            bounds.width,
            bounds.height,
            0,
            0,
            bounds.width,
            bounds.height
        );
        clipboardContext.globalCompositeOperation = "destination-in";
        clipboardContext.drawImage(
            selectionMaskCanvas,
            bounds.left,
            bounds.top,
            bounds.width,
            bounds.height,
            0,
            0,
            bounds.width,
            bounds.height
        );
        clipboardContext.globalCompositeOperation = "source-over";

        return clipboardCanvas;
    }

    function getSelectionMaskBounds(maskCanvas) {
        var maskContext;
        var imageData;
        var data;
        var left;
        var top;
        var right;
        var bottom;
        var x;
        var y;
        var index;

        if (!maskCanvas || maskCanvas.width <= 0 || maskCanvas.height <= 0) {
            return null;
        }

        maskContext = maskCanvas.getContext("2d", {
            willReadFrequently: true
        });
        imageData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        data = imageData.data;
        left = maskCanvas.width;
        top = maskCanvas.height;
        right = -1;
        bottom = -1;

        for (y = 0; y < maskCanvas.height; y++) {
            for (x = 0; x < maskCanvas.width; x++) {
                index = ((y * maskCanvas.width) + x) * 4;

                if (data[index + 3] === 0) {
                    continue;
                }

                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x);
                bottom = Math.max(bottom, y);
            }
        }

        if (right < left || bottom < top) {
            return null;
        }

        return {
            left: left,
            top: top,
            right: right + 1,
            bottom: bottom + 1,
            width: (right - left) + 1,
            height: (bottom - top) + 1
        };
    }

    function canvasToClipboardEntry(sourceCanvas) {
        return new Promise(function(resolve, reject) {
            sourceCanvas.toBlob(function(blob) {
                if (!blob) {
                    reject(new Error("Could not create image blob from board."));
                    return;
                }

                historyId += 1;
                resolve({
                    id: historyId,
                    blob: blob,
                    width: sourceCanvas.width,
                    height: sourceCanvas.height,
                    createdAt: Date.now()
                });
            }, "image/png");
        });
    }

    global.AppClipboard = {
        getNewDocumentInitialSize: getNewDocumentInitialSize,
        pasteImageFromClipboard: pasteImageFromClipboard,
        copyBoardToClipboard: copyBoardToClipboard,
        copyMergedBoardToClipboard: copyMergedBoardToClipboard,
        getCopyHistory: getCopyHistory,
        pasteCopyHistoryEntry: pasteCopyHistoryEntry
    };

}(window));
