(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 360,
        height: 420
    };

    function EmojiPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var element = document.createElement("div");
        var componentId = config.id || ("emoji-picker-" + Date.now());
        var component;

        element.id = componentId;
        element.className = "emoji-picker";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";

        component = {
            id: componentId,
            element: element,
            destroy: function() {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        container.appendChild(element);
        return component;
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("EmojiPicker container not found: " + containerId);
        }

        return container;
    }

    function extend(target, source) {
        var key;

        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    global.EmojiPicker = EmojiPicker;
    global.emojiPicker = EmojiPicker;

}(window));