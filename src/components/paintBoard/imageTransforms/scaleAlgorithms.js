(function(global) {

    "use strict";

    var DEFAULT_ALGORITHM = "bilinear";
    var algorithms = {
        "nearest-neighbor": renderNearestNeighbor,
        "bilinear": renderBilinear,
        "bicubic": renderBicubic,
        "lo-fi": renderLoFi,
        "pixel-art": renderPixelArt,
        "area-average": renderAreaAverage,
        "bicubic-smoother": makeKernelRenderer(2, bicubicSmootherWeight),
        "bicubic-sharper": makeKernelRenderer(2, bicubicSharperWeight),
        "mitchell-netravali": makeKernelRenderer(2, mitchellWeight),
        "catmull-rom": makeKernelRenderer(2, catmullRomWeight),
        "hermite": makeKernelRenderer(1, hermiteWeight),
        "b-spline": makeKernelRenderer(2, bSplineWeight),
        "robidoux": makeKernelRenderer(2, robidouxWeight),
        "robidoux-sharp": makeKernelRenderer(2, robidouxSharpWeight),
        "magic-kernel-sharp": makeKernelRenderer(2, magicKernelSharpWeight),
        "gaussian": makeKernelRenderer(2, gaussianWeight),
        "box": makeKernelRenderer(1, boxWeight),
        "triangle": makeKernelRenderer(1, triangleWeight),
        "lanczos": makeKernelRenderer(3, lanczosWeight),
        "blackman-sinc": makeKernelRenderer(3, blackmanSincWeight),
        "spline36": makeKernelRenderer(3, spline36Weight),
        "scale2x": makeEpxRenderer(0),
        "xbr": makeEpxRenderer(0.25),
        "super-xbr": makeEpxRenderer(0.4),
        "hqx": makeEpxRenderer(0.5)
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

    // Pixel-art upscalers built on the EPX/Scale2x rule. "blend" controls how
    // much the interpolated corner is mixed toward the center pixel: 0 is the
    // exact hard-edged EPX (scale2x), higher values give the softer contours
    // used to approximate xBR / Super xBR / HQx.
    function makeEpxRenderer(blend) {
        return function(context, image, bounds) {
            return renderEpxFamily(context, image, bounds, blend);
        };
    }

    function renderEpxFamily(context, image, bounds, blend) {
        var source = getSourcePixels(image);
        var targetWidth = Math.max(1, Math.round(Math.abs(bounds.width)));
        var targetHeight = Math.max(1, Math.round(Math.abs(bounds.height)));
        var current;
        var iterations = 0;
        var scaledCanvas;
        var scaledContext;
        var scaledImage;

        if (!source) {
            return renderNearestNeighbor(context, image, bounds);
        }

        current = source;
        while ((current.width < targetWidth || current.height < targetHeight) && iterations < 3) {
            current = doubleEpx(current, blend);
            iterations += 1;
        }

        scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = current.width;
        scaledCanvas.height = current.height;
        scaledContext = scaledCanvas.getContext("2d");
        scaledImage = scaledContext.createImageData(current.width, current.height);
        scaledImage.data.set(current.data);
        scaledContext.putImageData(scaledImage, 0, 0);

        context.save();
        context.imageSmoothingEnabled = blend > 0;
        if (blend > 0) {
            context.imageSmoothingQuality = "high";
        }
        context.drawImage(scaledCanvas, bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();
        return true;
    }

    // Doubles an image using the EPX rule. With blend > 0 each interpolated
    // corner is mixed back toward the center pixel for smoother edges.
    function doubleEpx(source, blend) {
        var width = source.width;
        var height = source.height;
        var outWidth = width * 2;
        var outHeight = height * 2;
        var output = new Uint8ClampedArray(outWidth * outHeight * 4);
        var x;
        var y;
        var center;
        var up;
        var right;
        var left;
        var down;
        var e1;
        var e2;
        var e3;
        var e4;

        for (y = 0; y < height; y += 1) {
            for (x = 0; x < width; x += 1) {
                center = readPixel(source, x, y);
                up = readPixel(source, x, y - 1);
                right = readPixel(source, x + 1, y);
                left = readPixel(source, x - 1, y);
                down = readPixel(source, x, y + 1);

                e1 = center;
                e2 = center;
                e3 = center;
                e4 = center;

                if (colorsSimilar(left, up) && !colorsSimilar(left, down) && !colorsSimilar(up, right)) {
                    e1 = up;
                }
                if (colorsSimilar(up, right) && !colorsSimilar(up, left) && !colorsSimilar(right, down)) {
                    e2 = right;
                }
                if (colorsSimilar(down, left) && !colorsSimilar(down, right) && !colorsSimilar(left, up)) {
                    e3 = left;
                }
                if (colorsSimilar(right, down) && !colorsSimilar(right, up) && !colorsSimilar(down, left)) {
                    e4 = down;
                }

                if (blend > 0) {
                    e1 = mixColor(center, e1, blend);
                    e2 = mixColor(center, e2, blend);
                    e3 = mixColor(center, e3, blend);
                    e4 = mixColor(center, e4, blend);
                }

                writePixel(output, outWidth, x * 2, y * 2, e1);
                writePixel(output, outWidth, (x * 2) + 1, y * 2, e2);
                writePixel(output, outWidth, x * 2, (y * 2) + 1, e3);
                writePixel(output, outWidth, (x * 2) + 1, (y * 2) + 1, e4);
            }
        }

        return { width: outWidth, height: outHeight, data: output };
    }

    function readPixel(source, x, y) {
        var safeX = Math.max(0, Math.min(source.width - 1, x));
        var safeY = Math.max(0, Math.min(source.height - 1, y));
        var index = ((safeY * source.width) + safeX) * 4;

        return [
            source.data[index],
            source.data[index + 1],
            source.data[index + 2],
            source.data[index + 3]
        ];
    }

    function writePixel(data, width, x, y, color) {
        var index = ((y * width) + x) * 4;

        data[index] = color[0];
        data[index + 1] = color[1];
        data[index + 2] = color[2];
        data[index + 3] = color[3];
    }

    function mixColor(a, b, t) {
        return [
            a[0] + ((b[0] - a[0]) * t),
            a[1] + ((b[1] - a[1]) * t),
            a[2] + ((b[2] - a[2]) * t),
            a[3] + ((b[3] - a[3]) * t)
        ];
    }

    function colorsSimilar(a, b) {
        return (Math.abs(a[0] - b[0]) +
            Math.abs(a[1] - b[1]) +
            Math.abs(a[2] - b[2]) +
            Math.abs(a[3] - b[3])) < 48;
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

    // Builds a render function that resamples through a separable convolution
    // kernel. "windowRadius" is the integer half-width of the tap window; the
    // weight function defines the actual filter support and shape.
    function makeKernelRenderer(windowRadius, weightFunction) {
        return function(context, image, bounds) {
            return renderResampled(context, image, bounds, function(source, x, y, output, index) {
                sampleKernel(source, x, y, windowRadius, weightFunction, output, index);
            });
        };
    }

    // Keys parametric cubic. "a" controls sharpness: -0.5 is the standard
    // bicubic, values closer to 0 are softer, more negative values sharper.
    function keysWeight(value, a) {
        var ax = Math.abs(value);
        var ax2 = ax * ax;
        var ax3 = ax2 * ax;

        if (ax <= 1) {
            return ((a + 2) * ax3) - ((a + 3) * ax2) + 1;
        }
        if (ax < 2) {
            return (a * ax3) - (5 * a * ax2) + (8 * a * ax) - (4 * a);
        }
        return 0;
    }

    // Mitchell-Netravali parametric cubic in (B, C) form. Covers Mitchell,
    // Catmull-Rom, B-Spline, Hermite and the Robidoux filters.
    function cubicBCWeight(value, b, c) {
        var ax = Math.abs(value);
        var ax2 = ax * ax;
        var ax3 = ax2 * ax;

        if (ax < 1) {
            return (((12 - (9 * b) - (6 * c)) * ax3) +
                ((-18 + (12 * b) + (6 * c)) * ax2) +
                (6 - (2 * b))) / 6;
        }
        if (ax < 2) {
            return ((((-b) - (6 * c)) * ax3) +
                (((6 * b) + (30 * c)) * ax2) +
                ((((-12) * b) - (48 * c)) * ax) +
                ((8 * b) + (24 * c))) / 6;
        }
        return 0;
    }

    function sinc(value) {
        var px;

        if (value === 0) {
            return 1;
        }
        px = Math.PI * value;
        return Math.sin(px) / px;
    }

    function bicubicSmootherWeight(value) {
        return keysWeight(value, -0.25);
    }

    function bicubicSharperWeight(value) {
        return keysWeight(value, -0.75);
    }

    function magicKernelSharpWeight(value) {
        // Approximation of Magic Kernel Sharp using a sharpened Keys cubic.
        return keysWeight(value, -0.6);
    }

    function mitchellWeight(value) {
        return cubicBCWeight(value, 1 / 3, 1 / 3);
    }

    function catmullRomWeight(value) {
        return cubicBCWeight(value, 0, 0.5);
    }

    function bSplineWeight(value) {
        return cubicBCWeight(value, 1, 0);
    }

    function hermiteWeight(value) {
        return cubicBCWeight(value, 0, 0);
    }

    function robidouxWeight(value) {
        return cubicBCWeight(value, 0.37821575509399866, 0.31089212278101547);
    }

    function robidouxSharpWeight(value) {
        return cubicBCWeight(value, 0.2620145737457259, 0.3689927438004929);
    }

    function gaussianWeight(value) {
        return Math.exp(-2.0 * value * value);
    }

    function boxWeight(value) {
        return Math.abs(value) <= 0.5 ? 1 : 0;
    }

    function triangleWeight(value) {
        var ax = Math.abs(value);

        return ax < 1 ? 1 - ax : 0;
    }

    function lanczosWeight(value) {
        var a = 3;

        if (value <= -a || value >= a) {
            return 0;
        }
        return sinc(value) * sinc(value / a);
    }

    function blackmanSincWeight(value) {
        var a = 3;
        var window;

        if (value <= -a || value >= a) {
            return 0;
        }
        window = 0.42 +
            (0.5 * Math.cos((Math.PI * value) / a)) +
            (0.08 * Math.cos((2 * Math.PI * value) / a));
        return sinc(value) * window;
    }

    function spline36Weight(value) {
        var ax = Math.abs(value);

        if (ax < 1) {
            return ((((13 / 11) * ax) - (453 / 209)) * ax - (3 / 209)) * ax + 1;
        }
        if (ax < 2) {
            return ((((-6 / 11) * (ax - 1)) + (270 / 209)) * (ax - 1) - (156 / 209)) * (ax - 1);
        }
        if (ax < 3) {
            return ((((1 / 11) * (ax - 2)) - (45 / 209)) * (ax - 2) + (26 / 209)) * (ax - 2);
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
