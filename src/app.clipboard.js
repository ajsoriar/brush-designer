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
        getCopyHistory: getCopyHistory,
        pasteCopyHistoryEntry: pasteCopyHistoryEntry
    };

}(window));
