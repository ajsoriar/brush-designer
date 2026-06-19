(function(global) {

    "use strict";

    var DEFAULT_ALGORITHM = "projective";
    var algorithms = {
        "projective": "projective",
        "pixel-warp": "pixel-warp",
        "two-triangles": "two-triangles"
    };

    function render(context, image, corners, algorithmName) {
        var algorithm = algorithms[algorithmName] || algorithms[DEFAULT_ALGORITHM];

        if (!global.DistortTransformAlgorithms) {
            return false;
        }

        return global.DistortTransformAlgorithms.render(context, image, corners, algorithm);
    }

    function hasAlgorithm(algorithm) {
        return Object.prototype.hasOwnProperty.call(algorithms, algorithm);
    }

    global.PerspectiveTransformAlgorithms = {
        DEFAULT_ALGORITHM: DEFAULT_ALGORITHM,
        hasAlgorithm: hasAlgorithm,
        render: render
    };

}(window));
