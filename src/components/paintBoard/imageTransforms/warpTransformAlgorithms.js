(function(global) {

    "use strict";

    var GRID_SIZE = 4;
    var DEFAULT_ALGORITHM = "smooth";
    var algorithms = {
        "smooth": renderSmooth,
        "nearest-neighbor": renderNearest,
        "lo-fi": renderLoFi,
        "high-quality": renderHighQuality,
        "shards": renderShards
    };

    function render(context, image, corners, algorithmName, options) {
        var algorithm = algorithms[algorithmName] || algorithms[DEFAULT_ALGORITHM];
        var points = options && options.warpPoints;

        if (!context || !image || !points || points.length !== GRID_SIZE * GRID_SIZE) {
            return false;
        }

        return algorithm(
            context,
            image,
            points,
            !!(options && options.roundBehavior),
            !!(options && options.preview)
        );
    }

    function hasAlgorithm(algorithm) {
        return Object.prototype.hasOwnProperty.call(algorithms, algorithm);
    }

    function renderSmooth(context, image, points, roundBehavior, preview) {
        if (roundBehavior) {
            return renderSubdividedMesh(context, image, points, preview ? 6 : 10, true, evaluateBezierSurface);
        }
        return renderMesh(context, image, points, true);
    }

    function renderNearest(context, image, points, roundBehavior, preview) {
        if (roundBehavior) {
            return renderSubdividedMesh(context, image, points, preview ? 6 : 10, false, evaluateBezierSurface);
        }
        return renderMesh(context, image, points, false);
    }

    function renderLoFi(context, image, points, roundBehavior, preview) {
        var size = getImageSize(image);
        var sample = document.createElement("canvas");
        var sampleContext;

        sample.width = Math.max(1, Math.min(size.width, 96, Math.round(size.width / 5)));
        sample.height = Math.max(1, Math.min(size.height, 96, Math.round(size.height / 5)));
        sampleContext = sample.getContext("2d");
        sampleContext.imageSmoothingEnabled = false;
        sampleContext.drawImage(image, 0, 0, sample.width, sample.height);
        if (roundBehavior) {
            return renderSubdividedMesh(context, sample, points, preview ? 5 : 8, false, evaluateBezierSurface);
        }
        return renderMesh(context, sample, points, false);
    }

    function renderHighQuality(context, image, points, roundBehavior, preview) {
        return renderSubdividedMesh(
            context,
            image,
            points,
            preview ? 8 : (roundBehavior ? 18 : 10),
            true,
            roundBehavior ? evaluateBezierSurface : evaluatePiecewiseSurface
        );
    }

    function renderShards(context, image, points, roundBehavior, preview) {
        return renderSubdividedMesh(
            context,
            image,
            points,
            preview ? 3 : (roundBehavior ? 7 : 3),
            false,
            roundBehavior ? evaluateBezierSurface : evaluatePiecewiseSurface,
            true
        );
    }

    function renderMesh(context, image, points, smoothing) {
        var size = getImageSize(image);
        var row;
        var column;
        var sourceLeft;
        var sourceTop;
        var sourceRight;
        var sourceBottom;
        var topLeft;
        var topRight;
        var bottomRight;
        var bottomLeft;

        if (!size.width || !size.height) {
            return false;
        }

        context.save();
        context.imageSmoothingEnabled = smoothing;
        if (smoothing) {
            context.imageSmoothingQuality = "low";
        }

        for (row = 0; row < GRID_SIZE - 1; row += 1) {
            sourceTop = (row / (GRID_SIZE - 1)) * size.height;
            sourceBottom = ((row + 1) / (GRID_SIZE - 1)) * size.height;
            for (column = 0; column < GRID_SIZE - 1; column += 1) {
                sourceLeft = (column / (GRID_SIZE - 1)) * size.width;
                sourceRight = ((column + 1) / (GRID_SIZE - 1)) * size.width;
                topLeft = points[(row * GRID_SIZE) + column];
                topRight = points[(row * GRID_SIZE) + column + 1];
                bottomRight = points[((row + 1) * GRID_SIZE) + column + 1];
                bottomLeft = points[((row + 1) * GRID_SIZE) + column];

                drawImageTriangle(
                    context,
                    image,
                    sourceLeft, sourceTop,
                    sourceRight, sourceTop,
                    sourceRight, sourceBottom,
                    topLeft, topRight, bottomRight
                );
                drawImageTriangle(
                    context,
                    image,
                    sourceLeft, sourceTop,
                    sourceRight, sourceBottom,
                    sourceLeft, sourceBottom,
                    topLeft, bottomRight, bottomLeft
                );
            }
        }

        context.restore();
        return true;
    }

    function renderSubdividedMesh(context, image, points, divisionsPerCell, smoothing, evaluator, shards) {
        var size = getImageSize(image);
        var divisions = (GRID_SIZE - 1) * divisionsPerCell;
        var row;
        var column;
        var u0;
        var v0;
        var u1;
        var v1;
        var sourceLeft;
        var sourceTop;
        var sourceRight;
        var sourceBottom;
        var jitterX;
        var jitterY;
        var topLeft;
        var topRight;
        var bottomRight;
        var bottomLeft;

        if (!size.width || !size.height) {
            return false;
        }

        context.save();
        context.imageSmoothingEnabled = smoothing;
        if (smoothing) {
            context.imageSmoothingQuality = "high";
        }

        for (row = 0; row < divisions; row += 1) {
            v0 = row / divisions;
            v1 = (row + 1) / divisions;
            for (column = 0; column < divisions; column += 1) {
                u0 = column / divisions;
                u1 = (column + 1) / divisions;
                sourceLeft = u0 * size.width;
                sourceTop = v0 * size.height;
                sourceRight = u1 * size.width;
                sourceBottom = v1 * size.height;

                if (shards) {
                    jitterX = ((((column * 17) + (row * 31)) % 5) - 2) * size.width * 0.0025;
                    jitterY = ((((column * 29) + (row * 13)) % 5) - 2) * size.height * 0.0025;
                    sourceLeft += jitterX;
                    sourceRight += jitterX;
                    sourceTop += jitterY;
                    sourceBottom += jitterY;
                }

                topLeft = evaluator(points, u0, v0);
                topRight = evaluator(points, u1, v0);
                bottomRight = evaluator(points, u1, v1);
                bottomLeft = evaluator(points, u0, v1);

                if (shards) {
                    drawShardCell(
                        context,
                        image,
                        sourceLeft, sourceTop, sourceRight, sourceBottom,
                        topLeft, topRight, bottomRight, bottomLeft,
                        (row + column) % 2
                    );
                } else {
                    drawMeshCell(
                        context,
                        image,
                        sourceLeft, sourceTop, sourceRight, sourceBottom,
                        topLeft, topRight, bottomRight, bottomLeft,
                        smoothing ? 0.55 : 0
                    );
                }
            }
        }
        context.restore();
        return true;
    }

    function drawMeshCell(context, image, left, top, right, bottom, topLeft, topRight, bottomRight, bottomLeft, padding) {
        drawImageTriangle(context, image, left, top, right, top, right, bottom, topLeft, topRight, bottomRight, padding);
        drawImageTriangle(context, image, left, top, right, bottom, left, bottom, topLeft, bottomRight, bottomLeft, padding);
    }

    function drawShardCell(context, image, left, top, right, bottom, topLeft, topRight, bottomRight, bottomLeft, diagonal) {
        if (diagonal) {
            drawImageTriangle(context, image, left, top, right, top, left, bottom, topLeft, topRight, bottomLeft);
            drawImageTriangle(context, image, right, top, right, bottom, left, bottom, topRight, bottomRight, bottomLeft);
            return;
        }
        drawMeshCell(context, image, left, top, right, bottom, topLeft, topRight, bottomRight, bottomLeft, 0);
    }

    function evaluatePiecewiseSurface(points, u, v) {
        var scaledU = Math.min(GRID_SIZE - 1.000001, Math.max(0, u * (GRID_SIZE - 1)));
        var scaledV = Math.min(GRID_SIZE - 1.000001, Math.max(0, v * (GRID_SIZE - 1)));
        var column = Math.floor(scaledU);
        var row = Math.floor(scaledV);
        var localU = scaledU - column;
        var localV = scaledV - row;
        var topLeft = points[(row * GRID_SIZE) + column];
        var topRight = points[(row * GRID_SIZE) + column + 1];
        var bottomLeft = points[((row + 1) * GRID_SIZE) + column];
        var bottomRight = points[((row + 1) * GRID_SIZE) + column + 1];

        return {
            x: lerp(lerp(topLeft.x, topRight.x, localU), lerp(bottomLeft.x, bottomRight.x, localU), localV),
            y: lerp(lerp(topLeft.y, topRight.y, localU), lerp(bottomLeft.y, bottomRight.y, localU), localV)
        };
    }

    function evaluateBezierSurface(points, u, v) {
        var basisU = cubicBezierBasis(u);
        var basisV = cubicBezierBasis(v);
        var point = { x: 0, y: 0 };
        var row;
        var column;
        var weight;
        var control;

        for (row = 0; row < GRID_SIZE; row += 1) {
            for (column = 0; column < GRID_SIZE; column += 1) {
                weight = basisU[column] * basisV[row];
                control = points[(row * GRID_SIZE) + column];
                point.x += control.x * weight;
                point.y += control.y * weight;
            }
        }
        return point;
    }

    function cubicBezierBasis(value) {
        var inverse = 1 - value;

        return [
            inverse * inverse * inverse,
            3 * inverse * inverse * value,
            3 * inverse * value * value,
            value * value * value
        ];
    }

    function lerp(first, second, amount) {
        return first + ((second - first) * amount);
    }

    function drawImageTriangle(context, image, sx0, sy0, sx1, sy1, sx2, sy2, p0, p1, p2, padding) {
        var determinant = (sx0 * (sy1 - sy2)) + (sx1 * (sy2 - sy0)) + (sx2 * (sy0 - sy1));
        var a;
        var b;
        var c;
        var d;
        var e;
        var f;
        var clipPoints;

        if (Math.abs(determinant) < 0.000001) {
            return;
        }

        a = ((p0.x * (sy1 - sy2)) + (p1.x * (sy2 - sy0)) + (p2.x * (sy0 - sy1))) / determinant;
        c = ((p0.x * (sx2 - sx1)) + (p1.x * (sx0 - sx2)) + (p2.x * (sx1 - sx0))) / determinant;
        e = ((p0.x * ((sx1 * sy2) - (sx2 * sy1))) + (p1.x * ((sx2 * sy0) - (sx0 * sy2))) + (p2.x * ((sx0 * sy1) - (sx1 * sy0)))) / determinant;
        b = ((p0.y * (sy1 - sy2)) + (p1.y * (sy2 - sy0)) + (p2.y * (sy0 - sy1))) / determinant;
        d = ((p0.y * (sx2 - sx1)) + (p1.y * (sx0 - sx2)) + (p2.y * (sx1 - sx0))) / determinant;
        f = ((p0.y * ((sx1 * sy2) - (sx2 * sy1))) + (p1.y * ((sx2 * sy0) - (sx0 * sy2))) + (p2.y * ((sx0 * sy1) - (sx1 * sy0)))) / determinant;

        context.save();
        clipPoints = padding ? expandTriangle(p0, p1, p2, padding) : [p0, p1, p2];
        context.beginPath();
        context.moveTo(clipPoints[0].x, clipPoints[0].y);
        context.lineTo(clipPoints[1].x, clipPoints[1].y);
        context.lineTo(clipPoints[2].x, clipPoints[2].y);
        context.closePath();
        context.clip();
        context.setTransform(a, b, c, d, e, f);
        context.drawImage(image, 0, 0);
        context.restore();
    }

    function expandTriangle(first, second, third, padding) {
        var center = {
            x: (first.x + second.x + third.x) / 3,
            y: (first.y + second.y + third.y) / 3
        };

        return [first, second, third].map(function(point) {
            var deltaX = point.x - center.x;
            var deltaY = point.y - center.y;
            var length = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)) || 1;

            return {
                x: point.x + ((deltaX / length) * padding),
                y: point.y + ((deltaY / length) * padding)
            };
        });
    }

    function getImageSize(image) {
        return {
            width: image.naturalWidth || image.videoWidth || image.width || 0,
            height: image.naturalHeight || image.videoHeight || image.height || 0
        };
    }

    global.WarpTransformAlgorithms = {
        GRID_SIZE: GRID_SIZE,
        DEFAULT_ALGORITHM: DEFAULT_ALGORITHM,
        hasAlgorithm: hasAlgorithm,
        render: render
    };

}(window));
