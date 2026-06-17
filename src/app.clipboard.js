(function(global) {

    "use strict";

    var DEFAULT_DOCUMENT_SIZE = {
        width: 800,
        height: 600
    };

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

    function pasteImageFromClipboard(board) {
        if (!board || !canReadClipboard()) {
            return Promise.resolve(false);
        }

        return global.navigator.clipboard.read().then(function(items) {
            var imageBlob = getClipboardImageBlob(items);

            if (!imageBlob) {
                return false;
            }

            return pasteImageBlob(board, imageBlob).then(function() {
                return true;
            });
        });
    }

    function copyBoardToClipboard(board) {
        if (!board || !global.navigator.clipboard || !global.navigator.clipboard.write || !global.ClipboardItem) {
            return Promise.resolve(false);
        }

        return getBoardBlob(board).then(function(blob) {
            var item = new global.ClipboardItem({
                "image/png": blob
            });

            return global.navigator.clipboard.write([item]);
        }).then(function() {
            return true;
        });
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

    function pasteImageBlob(board, imageBlobPromise) {
        return imageBlobPromise.then(function(blob) {
            if (global.createImageBitmap) {
                return global.createImageBitmap(blob).then(function(imageBitmap) {
                    pasteImageOnBoard(board, imageBitmap);
                });
            }

            return pasteImageWithElement(board, blob);
        });
    }

    function pasteImageWithElement(board, blob) {
        return new Promise(function(resolve) {
            var image = new global.Image();
            var objectUrl = global.URL.createObjectURL(blob);

            image.onload = function() {
                pasteImageOnBoard(board, image);
                global.URL.revokeObjectURL(objectUrl);
                resolve();
            };

            image.src = objectUrl;
        });
    }

    function pasteImageOnBoard(board, image) {
        if (board && typeof board.startFloatingPaste === "function") {
            board.startFloatingPaste(image);
            return;
        }

        board.drawImage(image, 0, 0);
    }

    function getBoardBlob(board) {
        return new Promise(function(resolve, reject) {
            board.canvas.toBlob(function(blob) {
                if (!blob) {
                    reject(new Error("Could not create image blob from board."));
                    return;
                }

                resolve(blob);
            }, "image/png");
        });
    }

    global.AppClipboard = {
        getNewDocumentInitialSize: getNewDocumentInitialSize,
        pasteImageFromClipboard: pasteImageFromClipboard,
        copyBoardToClipboard: copyBoardToClipboard
    };

}(window));
