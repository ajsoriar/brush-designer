(function(global) {

    "use strict";

    var MAX_ITEMS = 8;

    function MultiPaste(options) {
        var config = options || {};
        var entries = (config.entries || []).slice(0, MAX_ITEMS);
        var element = document.createElement("div");
        var fieldset = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");
        var actions = document.createElement("div");
        var pasteButton = document.createElement("button");
        var cancelButton = document.createElement("button");
        var selectedIndex = entries.length ? 0 : -1;
        var itemButtons = [];
        var objectUrls = [];
        var component;
        var index;

        element.className = "multi-paste";
        fieldset.className = "multi-paste-presets";
        legend.textContent = "Clipboard history:";
        grid.className = "multi-paste-grid";
        actions.className = "multi-paste-actions";
        pasteButton.type = "button";
        pasteButton.textContent = "Paste";
        pasteButton.disabled = selectedIndex < 0;
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        for (index = 0; index < MAX_ITEMS; index += 1) {
            grid.appendChild(createHistoryCell(index));
        }

        fieldset.appendChild(legend);
        fieldset.appendChild(grid);
        actions.appendChild(pasteButton);
        actions.appendChild(cancelButton);
        element.appendChild(fieldset);
        element.appendChild(actions);

        component = {
            element: element,
            getSelectedEntry: function() {
                return selectedIndex >= 0 ? entries[selectedIndex] : null;
            },
            setSelectedIndex: function(indexToSelect) {
                if (indexToSelect < 0 || indexToSelect >= entries.length) {
                    return false;
                }
                selectedIndex = indexToSelect;
                syncSelection();
                return true;
            },
            destroy: function() {
                objectUrls.forEach(function(url) {
                    global.URL.revokeObjectURL(url);
                });
                objectUrls = [];
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        pasteButton.addEventListener("click", function() {
            var entry = component.getSelectedEntry();

            if (entry && typeof config.onPaste === "function") {
                config.onPaste(entry, component);
            }
        });
        cancelButton.addEventListener("click", function() {
            if (typeof config.onCancel === "function") {
                config.onCancel(component);
            }
        });
        syncSelection();
        return component;

        function createHistoryCell(itemIndex) {
            var button = document.createElement("button");
            var image;
            var meta;
            var entry = entries[itemIndex];
            var objectUrl;

            button.type = "button";
            button.className = "multi-paste-item";
            button.setAttribute("data-index", itemIndex);

            if (!entry) {
                button.disabled = true;
                button.className += " multi-paste-item-empty";
                button.setAttribute("aria-label", "Empty clipboard history slot");
                itemButtons.push(button);
                return button;
            }

            objectUrl = global.URL.createObjectURL(entry.blob);
            objectUrls.push(objectUrl);
            image = document.createElement("img");
            meta = document.createElement("span");
            image.src = objectUrl;
            image.alt = "Clipboard item " + (itemIndex + 1);
            meta.textContent = entry.width + " × " + entry.height;
            button.title = meta.textContent;
            button.appendChild(image);
            button.appendChild(meta);
            button.addEventListener("click", function() {
                selectedIndex = itemIndex;
                syncSelection();
            });
            button.addEventListener("dblclick", function() {
                selectedIndex = itemIndex;
                syncSelection();
                pasteButton.click();
            });
            itemButtons.push(button);
            return button;
        }

        function syncSelection() {
            itemButtons.forEach(function(button, itemIndex) {
                button.classList.toggle(
                    "multi-paste-item-selected",
                    itemIndex === selectedIndex
                );
            });
            pasteButton.disabled = selectedIndex < 0;
        }
    }

    global.MultiPaste = MultiPaste;
    global.multiPaste = MultiPaste;

}(window));
