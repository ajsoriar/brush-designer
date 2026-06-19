(function(global) {

    "use strict";

    var DEFAULT_ALGORITHM = "bilinear";
    var algorithms = {
        "nearest-neighbor": renderNearestNeighbor,
        "bilinear": renderBilinear,
        "bicubic": renderBicubic,
        "lo-fi": renderLoFi,
        "pixel-art": renderPixelArt,
        "area-average": renderAreaAverage
    };
    var sourceCache = typeof global.WeakMap === "function" ? new global.WeakMap() : null;

    function render(context, image, corners, algorithmName) {
        var algorithm = algorithms[algorithmName] || algorithms[DEFAULT_ALGORITHM];
        var bounds = getRectangleBounds(corners);

        if (!context || !image || !bounds) {
            return false;
        }

        if (!isAxisAlignedRectangle(corners) && global.AffineTransformAlgorithms) {
            return global.AffineTransformAlgorithms.render(
                context,
                image,
                corners,
                getAffineAlgorithmName(algorithmName)
            );
        }

        return algorithm(context, image, bounds);
    }

    function hasAlgorithm(algorithm) {
        return Object.prototype.hasOwnProperty.call(algorithms, algorithm);
    }

    function renderNearestNeighbor(context, image, bounds) {
        context.save();
        context.imageSmoothingEnabled = false;
        context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();
        return true;
    }

    function renderBilinear(context, image, bounds) {
        context.save();
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "low";
        context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();
        return true;
    }

    function renderBicubic(context, image, bounds) {
        return renderResampled(context, image, bounds, sampleBicubic);
    }

    function renderLoFi(context, image, bounds) {
        var size = getImageSize(image);
        var width = Math.max(1, Math.round(Math.abs(bounds.width)));
        var height = Math.max(1, Math.round(Math.abs(bounds.height)));
        var sampleWidth = Math.max(1, Math.min(size.width, 128, Math.round(width / 6)));
        var sampleHeight = Math.max(1, Math.min(size.height, 128, Math.round(height / 6)));
        var sampleCanvas = document.createElement("canvas");
        var sampleContext;

        sampleCanvas.width = sampleWidth;
        sampleCanvas.height = sampleHeight;
        sampleContext = sampleCanvas.getContext("2d");
        sampleContext.imageSmoothingEnabled = false;
        sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);

        context.save();
        context.imageSmoothingEnabled = false;
        context.drawImage(sampleCanvas, bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();
        return true;
    }

    function renderPixelArt(context, image, bounds) {
        var size = getImageSize(image);
        var scale = Math.max(1, Math.round(Math.min(
            Math.abs(bounds.width) / size.width,
            Math.abs(bounds.height) / size.height
        )));
        var width = Math.max(1, Math.round(size.width * scale));
        var height = Math.max(1, Math.round(size.height * scale));
        var x = bounds.x + ((bounds.width - width) / 2);
        var y = bounds.y + ((bounds.height - height) / 2);

        context.save();
        context.imageSmoothingEnabled = false;
        context.drawImage(image, Math.round(x), Math.round(y), width, height);
        context.restore();
        return true;
    }

    function renderAreaAverage(context, image, bounds) {
        var source = getSourcePixels(image);
        var output;
        var outputCanvas;
        var outputContext;
        var width = Math.max(1, Math.round(Math.abs(bounds.width)));
        var height = Math.max(1, Math.round(Math.abs(bounds.height)));
        var x;
        var y;

        if (!source) {
            return renderBilinear(context, image, bounds);
        }

        outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        outputContext = outputCanvas.getContext("2d");
        output = outputContext.createImageData(width, height);

        for (y = 0; y < height; y += 1) {
            for (x = 0; x < width; x += 1) {
                sampleAreaAverage(source, x, y, width, height, output.data, ((y * width) + x) * 4);
            }
        }

        outputContext.putImageData(output, 0, 0);
        context.drawImage(outputCanvas, bounds.x, bounds.y, bounds.width, bounds.height);
        return true;
    }

    function renderResampled(context, image, bounds, sampler) {
        var source = getSourcePixels(image);
        var width = Math.max(1, Math.round(Math.abs(bounds.width)));
        var height = Math.max(1, Math.round(Math.abs(bounds.height)));
        var outputCanvas;
        var outputContext;
        var output;
        var x;
        var y;
        var sourceX;
        var sourceY;

        if (!source) {
            return renderBilinear(context, image, bounds);
        }

        outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        outputContext = outputCanvas.getContext("2d");
        output = outputContext.createImageData(width, height);

        for (y = 0; y < height; y += 1) {
            sourceY = (((y + 0.5) / height) * source.height) - 0.5;
            for (x = 0; x < width; x += 1) {
                sourceX = (((x + 0.5) / width) * source.width) - 0.5;
                sampler(source, sourceX, sourceY, output.data, ((y * width) + x) * 4);
            }
        }

        outputContext.putImageData(output, 0, 0);
        context.drawImage(outputCanvas, bounds.x, bounds.y, bounds.width, bounds.height);
        return true;
    }

    function sampleBicubic(source, x, y, output, index) {
        sampleKernel(source, x, y, 2, cubicWeight, output, index);
    }

    function sampleKernel(source, x, y, radius, weightFunction, output, index) {
        var startX = Math.floor(x) - radius + 1;
        var startY = Math.floor(y) - radius + 1;
        var channel;
        var sampleX;
        var sampleY;
        var weight;
        var totalWeight;
        var value;

        for (channel = 0; channel < 4; channel += 1) {
            totalWeight = 0;
            value = 0;
            for (sampleY = startY; sampleY < startY + (radius * 2); sampleY += 1) {
                for (sampleX = startX; sampleX < startX + (radius * 2); sampleX += 1) {
                    weight = weightFunction(x - sampleX) * weightFunction(y - sampleY);
                    value += getChannel(source, sampleX, sampleY, channel) * weight;
                    totalWeight += weight;
                }
            }
            output[index + channel] = clampByte(totalWeight ? value / totalWeight : 0);
        }
    }

    function sampleAreaAverage(source, x, y, width, height, output, index) {
        var left = (x / width) * source.width;
        var right = ((x + 1) / width) * source.width;
        var top = (y / height) * source.height;
        var bottom = ((y + 1) / height) * source.height;
        var startX = Math.floor(left);
        var endX = Math.ceil(right);
        var startY = Math.floor(top);
        var endY = Math.ceil(bottom);
        var channel;
        var sampleX;
        var sampleY;
        var weightX;
        var weightY;
        var weight;
        var totalWeight;
        var value;

        for (channel = 0; channel < 4; channel += 1) {
            totalWeight = 0;
            value = 0;
            for (sampleY = startY; sampleY < endY; sampleY += 1) {
                weightY = Math.max(0, Math.min(bottom, sampleY + 1) - Math.max(top, sampleY));
                for (sampleX = startX; sampleX < endX; sampleX += 1) {
                    weightX = Math.max(0, Math.min(right, sampleX + 1) - Math.max(left, sampleX));
                    weight = weightX * weightY;
                    value += getChannel(source, sampleX, sampleY, channel) * weight;
                    totalWeight += weight;
                }
            }
            output[index + channel] = clampByte(totalWeight ? value / totalWeight : 0);
        }
    }

    function getSourcePixels(image) {
        var cached = sourceCache && sourceCache.get(image);
        var size;
        var canvas;
        var context;
        var source;

        if (cached) {
            return cached;
        }

        size = getImageSize(image);
        canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);

        try {
            source = {
                width: size.width,
                height: size.height,
                data: context.getImageData(0, 0, size.width, size.height).data
            };
        } catch (error) {
            return null;
        }

        if (sourceCache) {
            sourceCache.set(image, source);
        }
        return source;
    }

    function getChannel(source, x, y, channel) {
        var safeX = Math.max(0, Math.min(source.width - 1, x));
        var safeY = Math.max(0, Math.min(source.height - 1, y));

        return source.data[((safeY * source.width) + safeX) * 4 + channel];
    }

    function cubicWeight(value) {
        var absolute = Math.abs(value);

        if (absolute <= 1) {
            return (1.5 * absolute * absolute * absolute) - (2.5 * absolute * absolute) + 1;
        }
        if (absolute < 2) {
            return (-0.5 * absolute * absolute * absolute) + (2.5 * absolute * absolute) - (4 * absolute) + 2;
        }
        return 0;
    }

    function getRectangleBounds(corners) {
        var xs;
        var ys;
        var left;
        var top;
        var right;
        var bottom;

        if (!corners || corners.length !== 4) {
            return null;
        }

        xs = corners.map(function(corner) {
            return corner.x;
        });
        ys = corners.map(function(corner) {
            return corner.y;
        });
        left = Math.min.apply(Math, xs);
        top = Math.min.apply(Math, ys);
        right = Math.max.apply(Math, xs);
        bottom = Math.max.apply(Math, ys);

        return {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top
        };
    }

    function isAxisAlignedRectangle(corners) {
        var tolerance = 0.01;

        return Math.abs(corners[0].y - corners[1].y) < tolerance &&
            Math.abs(corners[1].x - corners[2].x) < tolerance &&
            Math.abs(corners[2].y - corners[3].y) < tolerance &&
            Math.abs(corners[3].x - corners[0].x) < tolerance;
    }

    function getAffineAlgorithmName(algorithm) {
        if (algorithm === "nearest-neighbor" || algorithm === "pixel-art") {
            return "nearest-neighbor";
        }
        if (algorithm === "lo-fi") {
            return "lo-fi";
        }
        return "smooth";
    }

    function getImageSize(image) {
        return {
            width: image.naturalWidth || image.videoWidth || image.width || 0,
            height: image.naturalHeight || image.videoHeight || image.height || 0
        };
    }

    function clampByte(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    global.ScaleTransformAlgorithms = {
        DEFAULT_ALGORITHM: DEFAULT_ALGORITHM,
        hasAlgorithm: hasAlgorithm,
        render: render
    };

}(window));
