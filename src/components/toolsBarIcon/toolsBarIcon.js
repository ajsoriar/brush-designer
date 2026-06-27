/* global window */

(function(global) {

	"use strict";

	var DEFAULTS = {
		id: null,
		containerId: null,
		buttons: []
	};

	function extend(target, source) {
		var key;

		for (key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				target[key] = source[key];
			}
		}

		return target;
	}

	function getContainer(containerId) {
		var container = containerId ? document.getElementById(containerId) : null;

		if (!container) {
			throw new Error("ToolsBarIcon requires an existing container element.");
		}

		return container;
	}

	function ToolsBarIcon(options) {
		var config = extend(extend({}, DEFAULTS), options || {});
		var container = getContainer(config.containerId);
		var componentId = config.id || ("tools-bar-icon-" + Date.now());
		var element = document.createElement("div");
		var buttonsById = {};
		var component;

		element.id = componentId;
		element.className = "tools-bar-icon";
		container.appendChild(element);

		component = {
			id: componentId,
			element: element,
			setDisabled: function(buttonId, disabled) {
				var button = buttonsById[buttonId];

				if (!button) {
					return false;
				}

				button.disabled = !!disabled;
				return true;
			},
			removeButton: function(buttonId) {
				var button = buttonsById[buttonId];

				if (!button) {
					return false;
				}

				if (button.parentNode) {
					button.parentNode.removeChild(button);
				}
				delete buttonsById[buttonId];
				return true;
			},
			addButton: function(buttonConfig) {
				return createButton(buttonConfig, element, buttonsById);
			},
			destroy: function() {
				if (element.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
		};

		(config.buttons || []).forEach(function(buttonConfig) {
			createButton(buttonConfig, element, buttonsById);
		});

		return component;
	}

	function createButton(buttonConfig, container, buttonsById) {
		var config = buttonConfig || {};
		var buttonId = config.id || ("tools-bar-icon-btn-" + Date.now() + "-" + Math.round(Math.random() * 9999));
		var button = document.createElement("button");
		var image;

		button.type = "button";
		button.id = buttonId;
		button.className = "tools-bar-icon-btn" + (config.className ? (" " + config.className) : "");
		button.title = config.title || "";
		button.disabled = !!config.disabled;
		button.setAttribute("aria-label", config.ariaLabel || config.title || "Toolbar action");

		if (config.imageSrc) {
			button.style.backgroundImage = "url('" + config.imageSrc + "')";
			button.style.backgroundRepeat = "no-repeat";
			button.style.backgroundPosition = "center";
			button.style.backgroundSize = "64px 64px";
		} else {
			button.textContent = config.text || "?";
		}

		button.addEventListener("click", function(event) {
			if (typeof config.onClick === "function") {
				config.onClick(event, button);
			}
		});

		container.appendChild(button);
		buttonsById[buttonId] = button;

		return button;
	}

	global.ToolsBarIcon = ToolsBarIcon;

}(window));
