(function(global) {

    "use strict";

    var operations = {
        scale: function() {
            return global.ScaleTransformAlgorithms;
        },
        rotate: function() {
            return global.AffineTransformAlgorithms;
        },
        skew: function() {
            return global.AffineTransformAlgorithms;
        },
        distort: function() {
            return global.DistortTransformAlgorithms;
        },
        perspective: function() {
            return global.PerspectiveTransformAlgorithms;
        },
        warp: function() {
            return global.WarpTransformAlgorithms;
        }
    };

    function render(context, image, corners, options) {
        var config = options || {};
        var operation = normalizeOperation(config.operation);
        var provider = getProvider(operation);
        var algorithm = config.algorithm || provider.DEFAULT_ALGORITHM;

        return provider.render(context, image, corners, algorithm, config);
    }

    function hasAlgorithm(operation, algorithm) {
        var provider = getProvider(normalizeOperation(operation));

        return !!(provider && provider.hasAlgorithm && provider.hasAlgorithm(algorithm));
    }

    function getDefaultAlgorithm(operation) {
        return getProvider(normalizeOperation(operation)).DEFAULT_ALGORITHM;
    }

    function hasOperation(operation) {
        return Object.prototype.hasOwnProperty.call(operations, operation) &&
            !!getProvider(operation);
    }

    function normalizeOperation(operation) {
        return operations[operation] ? operation : "scale";
    }

    function getProvider(operation) {
        return operations[operation]();
    }

    global.ImageTransformRegistry = {
        render: render,
        hasAlgorithm: hasAlgorithm,
        hasOperation: hasOperation,
        getDefaultAlgorithm: getDefaultAlgorithm
    };

}(window));
