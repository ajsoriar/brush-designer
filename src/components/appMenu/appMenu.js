import defaultMenuConfig from "./appMenu.json";

(function(global) {

    "use strict";

    function AppMenu(options) {
        var config = options || {};
        var definition = config.definition || defaultMenuConfig;
        var actions = config.actions || {};
        var container = getContainer(config.containerId);
        var element = document.createElement("nav");
        var itemButtons = {};
        var menuButtons = [];
        var openMenuIndex = -1;
        var documentPointerDown;
        var component;

        element.id = config.id || ("app-menu-" + Date.now());
        element.className = "app-menu";
        element.setAttribute("aria-label", config.ariaLabel || "Application menu");

        (definition.menus || []).forEach(function(menu, menuIndex) {
            element.appendChild(createMenu(menu, menuIndex));
        });
        container.appendChild(element);

        component = {
            id: element.id,
            element: element,
            close: closeMenus,
            setItemEnabled: function(action, enabled) {
                (itemButtons[action] || []).forEach(function(button) {
                    button.disabled = !enabled;
                    button.setAttribute("aria-disabled", enabled ? "false" : "true");
                });
            },
            destroy: function() {
                document.removeEventListener("pointerdown", documentPointerDown, true);
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        documentPointerDown = function(event) {
            if (!element.contains(event.target)) {
                closeMenus();
            }
        };
        document.addEventListener("pointerdown", documentPointerDown, true);
        element.addEventListener("keydown", handleKeyDown);
        return component;

        function createMenu(menu, menuIndex) {
            var wrapper = document.createElement("div");
            var trigger = document.createElement("button");
            var popup = document.createElement("div");

            wrapper.className = "app-menu-group";
            trigger.type = "button";
            trigger.className = "app-menu-trigger";
            trigger.textContent = menu.label;
            trigger.setAttribute("aria-haspopup", "menu");
            trigger.setAttribute("aria-expanded", "false");
            popup.className = "app-menu-popup";
            popup.setAttribute("role", "menu");

            (menu.items || []).forEach(function(item) {
                popup.appendChild(createItem(item));
            });

            trigger.addEventListener("click", function() {
                toggleMenu(menuIndex);
            });
            trigger.addEventListener("pointerenter", function() {
                if (openMenuIndex >= 0 && openMenuIndex !== menuIndex) {
                    openMenu(menuIndex);
                }
            });
            wrapper.appendChild(trigger);
            wrapper.appendChild(popup);
            menuButtons.push({
                wrapper: wrapper,
                trigger: trigger,
                popup: popup
            });
            return wrapper;
        }

        function createItem(item) {
            var separator;
            var button;

            if (item.type === "separator") {
                separator = document.createElement("div");
                separator.className = "app-menu-separator";
                separator.setAttribute("role", "separator");
                return separator;
            }

            button = document.createElement("button");
            button.type = "button";
            button.className = "app-menu-item";
            button.textContent = item.label;
            button.setAttribute("role", "menuitem");
            button.disabled = item.enabled === false;
            button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
            if (item.action) {
                itemButtons[item.action] = itemButtons[item.action] || [];
                itemButtons[item.action].push(button);
            }
            button.addEventListener("click", function() {
                var action = actions[item.action];

                if (button.disabled) {
                    return;
                }
                closeMenus();
                if (typeof action === "function") {
                    action(item);
                }
            });
            return button;
        }

        function toggleMenu(menuIndex) {
            if (openMenuIndex === menuIndex) {
                closeMenus();
                return;
            }
            openMenu(menuIndex);
        }

        function openMenu(menuIndex) {
            closeMenus();
            openMenuIndex = menuIndex;
            menuButtons[menuIndex].wrapper.classList.add("app-menu-group-open");
            menuButtons[menuIndex].trigger.setAttribute("aria-expanded", "true");
        }

        function closeMenus() {
            menuButtons.forEach(function(menu) {
                menu.wrapper.classList.remove("app-menu-group-open");
                menu.trigger.setAttribute("aria-expanded", "false");
            });
            openMenuIndex = -1;
        }

        function handleKeyDown(event) {
            var direction;
            var nextIndex;
            var items;
            var currentItemIndex;

            if (event.key === "Escape") {
                closeMenus();
                return;
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                direction = event.key === "ArrowRight" ? 1 : -1;
                nextIndex = openMenuIndex < 0 ? 0 :
                    (openMenuIndex + direction + menuButtons.length) % menuButtons.length;
                event.preventDefault();
                openMenu(nextIndex);
                menuButtons[nextIndex].trigger.focus();
                return;
            }
            if (event.key === "ArrowDown" && openMenuIndex >= 0) {
                items = getEnabledItems(menuButtons[openMenuIndex].popup);
                if (items.length) {
                    event.preventDefault();
                    items[0].focus();
                }
                return;
            }
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") &&
                event.target.classList.contains("app-menu-item")) {
                items = getEnabledItems(event.target.parentNode);
                currentItemIndex = items.indexOf(event.target);
                direction = event.key === "ArrowDown" ? 1 : -1;
                event.preventDefault();
                items[(currentItemIndex + direction + items.length) % items.length].focus();
            }
        }
    }

    function getEnabledItems(popup) {
        return Array.prototype.filter.call(
            popup.querySelectorAll(".app-menu-item"),
            function(button) {
                return !button.disabled;
            }
        );
    }

    function getContainer(containerId) {
        var container = document.getElementById(containerId);

        if (!container) {
            throw new Error("AppMenu container not found: " + containerId);
        }
        return container;
    }

    global.AppMenu = AppMenu;
    global.appMenu = AppMenu;
    global.AppMenuDefaultConfig = defaultMenuConfig;

}(window));
