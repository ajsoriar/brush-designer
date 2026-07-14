import "emoji-picker-element";

(function(global) {

    "use strict";

    var DEFAULTS = {
        id: null,
        containerId: null,
        width: 360,
        height: 420,
        previewSize: 128,
        selectedEmoji: null,
        brushSize: 128,
        minBrushSize: 16,
        maxBrushSize: 512,
        onEmojiSelected: null,
        onBrushSizeChange: null
    };

    function EmojiPicker(options) {
        var config = extend(extend({}, DEFAULTS), options || {});
        var container = getContainer(config.containerId);
        var sizeControl = document.createElement("div");
        var sizeSlider = document.createElement("input");
        var sizeValue = document.createElement("span");
        var preview = document.createElement("div");
        var previewImage = document.createElement("img");
        var previewFallback = document.createElement("span");
        var element = document.createElement("div");
        var pickerElement = document.createElement("emoji-picker");
        var componentId = config.id || ("emoji-picker-" + Date.now());
        var component;
        var handleEmojiClick;

        element.id = componentId;
        element.className = "emoji-picker";
        element.style.width = config.width + "px";
        element.style.height = config.height + "px";
        pickerElement.className = "emoji-picker-element";

        sizeControl.className = "emoji-picker-size-control";
        sizeSlider.className = "emoji-picker-size-slider";
        sizeSlider.type = "range";
        sizeSlider.min = String(config.minBrushSize);
        sizeSlider.max = String(config.maxBrushSize);
        sizeSlider.step = "1";
        sizeValue.className = "emoji-picker-size-value";
        sizeControl.appendChild(sizeSlider);
        sizeControl.appendChild(sizeValue);

        preview.className = "emoji-picker-preview";
        preview.style.width = config.width + "px";
        previewImage.className = "emoji-picker-preview-image";
        previewImage.width = config.previewSize;
        previewImage.height = config.previewSize;
        previewImage.alt = "";
        previewFallback.className = "emoji-picker-preview-fallback";
        preview.appendChild(previewImage);
        preview.appendChild(previewFallback);

        handleEmojiClick = function(event) {
            var emoji = getEmojiFromEvent(event);

            setSelectedEmoji(component, {
                unicode: emoji,
                url: getEmojiSvgUrlFromEvent(event),
                name: event.detail && event.detail.emoji ? event.detail.emoji.annotation : ""
            });

            if (typeof config.onEmojiSelected === "function") {
                config.onEmojiSelected(emoji, event.detail, component);
            }
        };

        pickerElement.addEventListener("emoji-click", handleEmojiClick);
        element.appendChild(pickerElement);

        component = {
            id: componentId,
            previewElement: preview,
            previewImage: previewImage,
            previewFallback: previewFallback,
            sizeControl: sizeControl,
            sizeSlider: sizeSlider,
            sizeValue: sizeValue,
            brushSize: normalizeBrushSize(config.brushSize, config),
            element: element,
            pickerElement: pickerElement,
            selectedEmoji: null,
            selectedEmojiSvgUrl: null,
            getSelectedEmoji: function() {
                return component.selectedEmoji;
            },
            getSelectedEmojiSvgUrl: function() {
                return component.selectedEmojiSvgUrl;
            },
            setSelectedEmoji: function(emoji) {
                setSelectedEmoji(component, emoji);
            },
            getBrushSize: function() {
                return component.brushSize;
            },
            setBrushSize: function(size, skipCallback) {
                setBrushSize(component, config, size, skipCallback);
            },
            destroy: function() {
                pickerElement.removeEventListener("emoji-click", handleEmojiClick);
                if (sizeControl.parentNode) {
                    sizeControl.parentNode.removeChild(sizeControl);
                }
                if (preview.parentNode) {
                    preview.parentNode.removeChild(preview);
                }
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        previewImage.addEventListener("error", function() {
            previewImage.removeAttribute("src");
            previewImage.hidden = true;
            previewFallback.textContent = component.selectedEmoji || "";
        });

        setSelectedEmoji(component, config.selectedEmoji);
        setBrushSize(component, config, component.brushSize, true);
        sizeSlider.addEventListener("input", function() {
            setBrushSize(component, config, sizeSlider.value);
        });
        container.appendChild(sizeControl);
        container.appendChild(preview);
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

    function getEmojiFromEvent(event) {
        if (!event || !event.detail) {
            return null;
        }

        if (event.detail.unicode) {
            return event.detail.unicode;
        }

        if (event.detail.emoji && event.detail.emoji.unicode) {
            return event.detail.emoji.unicode;
        }

        return null;
    }

    function setSelectedEmoji(component, emoji) {
        var normalizedEmoji = normalizeEmoji(emoji);

        component.selectedEmoji = normalizedEmoji.unicode;
        component.selectedEmojiSvgUrl = normalizedEmoji.url || getTwemojiSvgUrl(normalizedEmoji.unicode);
        component.previewImage.alt = normalizedEmoji.name || "";
        updatePreview(component);
    }

    function setBrushSize(component, config, size, skipCallback) {
        var normalizedSize = normalizeBrushSize(size, config);

        component.brushSize = normalizedSize;
        component.sizeSlider.value = String(normalizedSize);
        component.sizeValue.textContent = normalizedSize + "px";

        if (!skipCallback && typeof config.onBrushSizeChange === "function") {
            config.onBrushSizeChange(normalizedSize, component);
        }
    }

    function normalizeBrushSize(size, config) {
        var numericSize = parseInt(size, 10);
        var min = parseInt(config.minBrushSize, 10) || DEFAULTS.minBrushSize;
        var max = parseInt(config.maxBrushSize, 10) || DEFAULTS.maxBrushSize;

        if (isNaN(numericSize)) {
            numericSize = DEFAULTS.brushSize;
        }

        return Math.max(min, Math.min(max, numericSize));
    }

    function normalizeEmoji(emoji) {
        if (!emoji) {
            return {
                unicode: null,
                url: null,
                name: ""
            };
        }

        if (typeof emoji === "string") {
            return {
                unicode: emoji,
                url: null,
                name: ""
            };
        }

        return {
            unicode: emoji.unicode || null,
            url: emoji.url || null,
            name: emoji.name || emoji.annotation || ""
        };
    }

    function getEmojiSvgUrlFromEvent(event) {
        var emoji;

        if (!event || !event.detail) {
            return null;
        }

        emoji = event.detail.emoji || {};

        if (emoji.url) {
            return emoji.url;
        }

        return getTwemojiSvgUrl(event.detail.unicode || emoji.unicode);
    }

    function getTwemojiSvgUrl(unicode) {
        var codePoints;

        if (!unicode) {
            return null;
        }

        codePoints = Array.from(unicode).map(function(character) {
            return character.codePointAt(0).toString(16);
        }).filter(function(codePoint, index, allCodePoints) {
            return codePoint !== "fe0f" || allCodePoints[index + 1] === "20e3";
        });

        if (!codePoints.length) {
            return null;
        }

        return "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/" + codePoints.join("-") + ".svg";
    }

    function updatePreview(component) {
        component.previewFallback.textContent = "";

        if (!component.selectedEmojiSvgUrl) {
            component.previewImage.hidden = true;
            component.previewImage.removeAttribute("src");
            return;
        }

        component.previewImage.hidden = false;
        component.previewImage.src = component.selectedEmojiSvgUrl;
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