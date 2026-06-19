(function(global) {

    "use strict";

    var DEFAULT_ALGORITHM = "smooth";
    var algorithms = {
        "smooth": renderSmooth,
        "nearest-neighbor": renderNearest,
        "lo-fi": renderLoFi
    };

    function render(context, image, corners, algorithmName) {
        var algorithm = algorithms[algorithmName] || algorithms[DEFAULT_ALGORITHM];

        if (!context || !image || !corners || corners.length !== 4) {
            return false;
        }

        return algorithm(context, image, corners);
    }

    function hasAlgorithm(algorithm) {
        return Object.prototype.hasOwnProperty.call(algorithms, algorithm);
    }

    function renderSmooth(context, image, corners) {
        return renderAffine(context, image, corners, true);
    }

    function renderNearest(context, image, corners) {
        return renderAffine(context, image, corners, false);
    }

    function renderLoFi(context, image, corners) {
        var size = getImageSize(image);
        var sampleCanvas = document.createElement("canvas");
        var sampleContext;

        sampleCanvas.width = Math.max(1, Math.min(size.width, 128, Math.round(size.width / 6)));
        sampleCanvas.height = Math.max(1, Math.min(size.height, 128, Math.round(size.height / 6)));
        sampleContext = sampleCanvas.getContext("2d");
        sampleContext.imageSmoothingEnabled = false;
        sampleContext.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);
        return renderAffine(context, sampleCanvas, corners, false);
    }

    function renderAffine(context, image, corners, smoothing) {
        var size = getImageSize(image);
        var horizontalX;
        var horizontalY;
        var verticalX;
        var verticalY;

        if (!size.width || !size.height) {
            return false;
        }

        horizontalX = (corners[1].x - corners[0].x) / size.width;
        horizontalY = (corners[1].y - corners[0].y) / size.width;
        verticalX = (corners[3].x - corners[0].x) / size.height;
        verticalY = (corners[3].y - corners[0].y) / size.height;

        context.save();
        context.beginPath();
        context.moveTo(corners[0].x, corners[0].y);
        context.lineTo(corners[1].x, corners[1].y);
        context.lineTo(corners[2].x, corners[2].y);
        context.lineTo(corners[3].x, corners[3].y);
        context.closePath();
        context.clip();
        context.imageSmoothingEnabled = smoothing;
        if (smoothing) {
            context.imageSmoothingQuality = "low";
        }
        context.setTransform(
            horizontalX,
            horizontalY,
            verticalX,
            verticalY,
            corners[0].x,
            corners[0].y
        );
        context.drawImage(image, 0, 0);
        context.restore();
        return true;
    }

    function getImageSize(image) {
        return {
            width: image.naturalWidth || image.videoWidth || image.width || 0,
            height: image.naturalHeight || image.videoHeight || image.height || 0
        };
    }

    global.AffineTransformAlgorithms = {
        DEFAULT_ALGORITHM: DEFAULT_ALGORITHM,
        hasAlgorithm: hasAlgorithm,
        render: render
    };

}(window));
