(function(global) {

    "use strict";

    var DEFAULT_ALGORITHM = "pixel-warp";
    var sourceCache = typeof global.WeakMap === "function" ? new global.WeakMap() : null;
    var algorithms = {
        "pixel-warp": renderPixelWarp,
        "projective": renderProjective,
        "adaptive-mesh": renderAdaptiveMesh,
        "triangle-mesh": renderTriangleMesh,
        "vertical-strips": renderVerticalStrips,
        "two-triangles": renderTwoTriangles
    };

    function render(context, image, corners, algorithmName) {
        algorithmName = algorithmName || DEFAULT_ALGORITHM;
        var algorithm = algorithms[algorithmName] || algorithms[DEFAULT_ALGORITHM];

        if (!context || !image || !corners || corners.length !== 4) {
            return false;
        }

        return algorithm(context, image, corners);
    }

    function hasAlgorithm(algorithm) {
        return Object.prototype.hasOwnProperty.call(algorithms, algorithm);
    }

    function renderPixelWarp(context, image, corners) {
        var source = getSourcePixels(image);
        var bounds;
        var width;
        var height;
        var outputCanvas;
        var outputContext;
        var output;
        var x;
        var y;
        var uv;

        if (!source) {
            return false;
        }

        bounds = getClippedBounds(context.canvas, corners);
        width = bounds.right - bounds.left;
        height = bounds.bottom - bounds.top;
        if (width < 1 || height < 1) {
            return true;
        }

        outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        outputContext = outputCanvas.getContext("2d");
        output = outputContext.createImageData(width, height);

        for (y = 0; y < height; y += 1) {
            for (x = 0; x < width; x += 1) {
                uv = invertBilinearPoint(corners, bounds.left + x + 0.5, bounds.top + y + 0.5);
                if (uv && uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1) {
                    sampleBilinear(
                        source,
                        uv.u * (source.width - 1),
                        uv.v * (source.height - 1),
                        output.data,
                        ((y * width) + x) * 4
                    );
                }
            }
        }

        outputContext.putImageData(output, 0, 0);
        context.drawImage(outputCanvas, bounds.left, bounds.top);
        return true;
    }

    function renderProjective(context, image, corners) {
        var source = getSourcePixels(image);
        var inverse = getInverseProjectiveMatrix(corners);
        var bounds;
        var width;
        var height;
        var outputCanvas;
        var outputContext;
        var output;
        var x;
        var y;
        var denominator;
        var u;
        var v;

        if (!source || !inverse) {
            return false;
        }

        bounds = getClippedBounds(context.canvas, corners);
        width = bounds.right - bounds.left;
        height = bounds.bottom - bounds.top;
        if (width < 1 || height < 1) {
            return true;
        }

        outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        outputContext = outputCanvas.getContext("2d");
        output = outputContext.createImageData(width, height);

        for (y = 0; y < height; y += 1) {
            for (x = 0; x < width; x += 1) {
                denominator = (inverse[6] * (bounds.left + x + 0.5)) +
                    (inverse[7] * (bounds.top + y + 0.5)) + inverse[8];
                if (!denominator) {
                    continue;
                }
                u = ((inverse[0] * (bounds.left + x + 0.5)) +
                    (inverse[1] * (bounds.top + y + 0.5)) + inverse[2]) / denominator;
                v = ((inverse[3] * (bounds.left + x + 0.5)) +
                    (inverse[4] * (bounds.top + y + 0.5)) + inverse[5]) / denominator;
                if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                    sampleBilinear(
                        source,
                        u * (source.width - 1),
                        v * (source.height - 1),
                        output.data,
                        ((y * width) + x) * 4
                    );
                }
            }
        }

        outputContext.putImageData(output, 0, 0);
        context.drawImage(outputCanvas, bounds.left, bounds.top);
        return true;
    }

    function renderAdaptiveMesh(context, image, corners) {
        var size = getImageSize(image);
        var distortion = getCornerDistortion(corners);
        var columns = Math.max(8, Math.min(40, Math.ceil(size.width / Math.max(8, 28 - distortion))));
        var rows = Math.max(8, Math.min(40, Math.ceil(size.height / Math.max(8, 28 - distortion))));

        return renderMesh(context, image, corners, columns, rows);
    }

    function renderTriangleMesh(context, image, corners) {
        return renderMesh(context, image, corners, 8, 8);
    }

    function renderVerticalStrips(context, image, corners) {
        return renderMesh(context, image, corners, 18, 1);
    }

    function renderTwoTriangles(context, image, corners) {
        return renderMesh(context, image, corners, 1, 1);
    }

    function renderMesh(context, image, corners, columns, rows) {
        var size = getImageSize(image);
        var column;
        var row;
        var left;
        var top;
        var right;
        var bottom;
        var topLeft;
        var topRight;
        var bottomRight;
        var bottomLeft;

        for (row = 0; row < rows; row += 1) {
            top = (row / rows) * size.height;
            bottom = ((row + 1) / rows) * size.height;
            for (column = 0; column < columns; column += 1) {
                left = (column / columns) * size.width;
                right = ((column + 1) / columns) * size.width;
                topLeft = getWarpPoint(corners, column / columns, row / rows);
                topRight = getWarpPoint(corners, (column + 1) / columns, row / rows);
                bottomRight = getWarpPoint(corners, (column + 1) / columns, (row + 1) / rows);
                bottomLeft = getWarpPoint(corners, column / columns, (row + 1) / rows);
                drawImageTriangle(context, image, left, top, right, top, right, bottom, topLeft, topRight, bottomRight);
                drawImageTriangle(context, image, left, top, right, bottom, left, bottom, topLeft, bottomRight, bottomLeft);
            }
        }
        return true;
    }

    function getWarpPoint(corners, u, v) {
        return {
            x: lerp(lerp(corners[0].x, corners[1].x, u), lerp(corners[3].x, corners[2].x, u), v),
            y: lerp(lerp(corners[0].y, corners[1].y, u), lerp(corners[3].y, corners[2].y, u), v)
        };
    }

    function drawImageTriangle(context, image, sx0, sy0, sx1, sy1, sx2, sy2, p0, p1, p2) {
        var determinant = (sx0 * (sy1 - sy2)) + (sx1 * (sy2 - sy0)) + (sx2 * (sy0 - sy1));
        var a;
        var b;
        var c;
        var d;
        var e;
        var f;

        if (!determinant) {
            return;
        }

        a = ((p0.x * (sy1 - sy2)) + (p1.x * (sy2 - sy0)) + (p2.x * (sy0 - sy1))) / determinant;
        c = ((p0.x * (sx2 - sx1)) + (p1.x * (sx0 - sx2)) + (p2.x * (sx1 - sx0))) / determinant;
        e = ((p0.x * ((sx1 * sy2) - (sx2 * sy1))) + (p1.x * ((sx2 * sy0) - (sx0 * sy2))) + (p2.x * ((sx0 * sy1) - (sx1 * sy0)))) / determinant;
        b = ((p0.y * (sy1 - sy2)) + (p1.y * (sy2 - sy0)) + (p2.y * (sy0 - sy1))) / determinant;
        d = ((p0.y * (sx2 - sx1)) + (p1.y * (sx0 - sx2)) + (p2.y * (sx1 - sx0))) / determinant;
        f = ((p0.y * ((sx1 * sy2) - (sx2 * sy1))) + (p1.y * ((sx2 * sy0) - (sx0 * sy2))) + (p2.y * ((sx0 * sy1) - (sx1 * sy0)))) / determinant;

        context.save();
        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.closePath();
        context.clip();
        context.setTransform(a, b, c, d, e, f);
        context.drawImage(image, 0, 0);
        context.restore();
    }

    function getImageSize(image) {
        return {
            width: image.naturalWidth || image.videoWidth || image.width || 0,
            height: image.naturalHeight || image.videoHeight || image.height || 0
        };
    }

    function getCornerDistortion(corners) {
        return Math.min(20, Math.abs(corners[0].x - corners[3].x) +
            Math.abs(corners[1].x - corners[2].x) +
            Math.abs(corners[0].y - corners[1].y) +
            Math.abs(corners[3].y - corners[2].y));
    }

    function getInverseProjectiveMatrix(corners) {
        var x0 = corners[0].x;
        var y0 = corners[0].y;
        var x1 = corners[1].x;
        var y1 = corners[1].y;
        var x2 = corners[2].x;
        var y2 = corners[2].y;
        var x3 = corners[3].x;
        var y3 = corners[3].y;
        var dx1 = x1 - x2;
        var dx2 = x3 - x2;
        var dy1 = y1 - y2;
        var dy2 = y3 - y2;
        var sx = x0 - x1 + x2 - x3;
        var sy = y0 - y1 + y2 - y3;
        var denominator = (dx1 * dy2) - (dx2 * dy1);
        var g;
        var h;
        var matrix;

        if (Math.abs(denominator) < 0.000001) {
            return null;
        }
        g = ((sx * dy2) - (dx2 * sy)) / denominator;
        h = ((dx1 * sy) - (sx * dy1)) / denominator;
        matrix = [
            x1 - x0 + (g * x1), x3 - x0 + (h * x3), x0,
            y1 - y0 + (g * y1), y3 - y0 + (h * y3), y0,
            g, h, 1
        ];
        return invertMatrix3(matrix);
    }

    function invertMatrix3(matrix) {
        var determinant = matrix[0] * ((matrix[4] * matrix[8]) - (matrix[5] * matrix[7])) -
            matrix[1] * ((matrix[3] * matrix[8]) - (matrix[5] * matrix[6])) +
            matrix[2] * ((matrix[3] * matrix[7]) - (matrix[4] * matrix[6]));

        if (Math.abs(determinant) < 0.000001) {
            return null;
        }
        return [
            ((matrix[4] * matrix[8]) - (matrix[5] * matrix[7])) / determinant,
            ((matrix[2] * matrix[7]) - (matrix[1] * matrix[8])) / determinant,
            ((matrix[1] * matrix[5]) - (matrix[2] * matrix[4])) / determinant,
            ((matrix[5] * matrix[6]) - (matrix[3] * matrix[8])) / determinant,
            ((matrix[0] * matrix[8]) - (matrix[2] * matrix[6])) / determinant,
            ((matrix[2] * matrix[3]) - (matrix[0] * matrix[5])) / determinant,
            ((matrix[3] * matrix[7]) - (matrix[4] * matrix[6])) / determinant,
            ((matrix[1] * matrix[6]) - (matrix[0] * matrix[7])) / determinant,
            ((matrix[0] * matrix[4]) - (matrix[1] * matrix[3])) / determinant
        ];
    }

    function getSourcePixels(image) {
        var cached = sourceCache && sourceCache.get(image);
        var width;
        var height;
        var canvas;
        var context;
        var source;

        if (cached) {
            return cached;
        }

        width = image.naturalWidth || image.videoWidth || image.width || 0;
        height = image.naturalHeight || image.videoHeight || image.height || 0;
        if (!width || !height) {
            return null;
        }

        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext("2d", {
            willReadFrequently: true
        });
        context.drawImage(image, 0, 0);

        try {
            source = {
                width: width,
                height: height,
                data: context.getImageData(0, 0, width, height).data
            };
        } catch (error) {
            return null;
        }

        if (sourceCache) {
            sourceCache.set(image, source);
        }
        return source;
    }

    function sampleBilinear(source, x, y, output, outputIndex) {
        var left = Math.max(0, Math.min(source.width - 1, Math.floor(x)));
        var top = Math.max(0, Math.min(source.height - 1, Math.floor(y)));
        var right = Math.min(source.width - 1, left + 1);
        var bottom = Math.min(source.height - 1, top + 1);
        var horizontal = x - left;
        var vertical = y - top;
        var topLeft = ((top * source.width) + left) * 4;
        var topRight = ((top * source.width) + right) * 4;
        var bottomLeft = ((bottom * source.width) + left) * 4;
        var bottomRight = ((bottom * source.width) + right) * 4;
        var channel;
        var topValue;
        var bottomValue;

        for (channel = 0; channel < 4; channel += 1) {
            topValue = lerp(source.data[topLeft + channel], source.data[topRight + channel], horizontal);
            bottomValue = lerp(source.data[bottomLeft + channel], source.data[bottomRight + channel], horizontal);
            output[outputIndex + channel] = Math.round(lerp(topValue, bottomValue, vertical));
        }
    }

    function invertBilinearPoint(corners, x, y) {
        var edgeX = corners[1].x - corners[0].x;
        var edgeY = corners[1].y - corners[0].y;
        var sideX = corners[3].x - corners[0].x;
        var sideY = corners[3].y - corners[0].y;
        var curveX = corners[0].x - corners[1].x + corners[2].x - corners[3].x;
        var curveY = corners[0].y - corners[1].y + corners[2].y - corners[3].y;
        var u = 0.5;
        var v = 0.5;
        var iteration;
        var errorX;
        var errorY;
        var derivativeUX;
        var derivativeUY;
        var derivativeVX;
        var derivativeVY;
        var determinant;

        for (iteration = 0; iteration < 8; iteration += 1) {
            errorX = corners[0].x + (edgeX * u) + (sideX * v) + (curveX * u * v) - x;
            errorY = corners[0].y + (edgeY * u) + (sideY * v) + (curveY * u * v) - y;
            if ((errorX * errorX) + (errorY * errorY) < 0.0001) {
                break;
            }

            derivativeUX = edgeX + (curveX * v);
            derivativeUY = edgeY + (curveY * v);
            derivativeVX = sideX + (curveX * u);
            derivativeVY = sideY + (curveY * u);
            determinant = (derivativeUX * derivativeVY) - (derivativeVX * derivativeUY);
            if (Math.abs(determinant) < 0.000001) {
                return null;
            }

            u -= ((errorX * derivativeVY) - (errorY * derivativeVX)) / determinant;
            v -= ((derivativeUX * errorY) - (derivativeUY * errorX)) / determinant;
        }

        return {
            u: u,
            v: v
        };
    }

    function getClippedBounds(canvas, corners) {
        var xs = corners.map(function(corner) {
            return corner.x;
        });
        var ys = corners.map(function(corner) {
            return corner.y;
        });

        return {
            left: Math.max(0, Math.floor(Math.min.apply(Math, xs))),
            top: Math.max(0, Math.floor(Math.min.apply(Math, ys))),
            right: Math.min(canvas.width, Math.ceil(Math.max.apply(Math, xs))),
            bottom: Math.min(canvas.height, Math.ceil(Math.max.apply(Math, ys)))
        };
    }

    function lerp(first, second, amount) {
        return first + ((second - first) * amount);
    }

    global.DistortTransformAlgorithms = {
        DEFAULT_ALGORITHM: DEFAULT_ALGORITHM,
        hasAlgorithm: hasAlgorithm,
        render: render
    };

}(window));
