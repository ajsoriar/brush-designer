/* global window */

(function(global) {

	"use strict";

	var DEFAULTS = {
		id: null,
		containerId: null,
		width: 860,
		height: 520,
		svgText: "",
		onExportToLayer: null,
		onDownload: null
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
			throw new Error("SVGExporter requires an existing container element.");
		}

		return container;
	}

	function SVGExporter(options) {
		var config = extend(extend({}, DEFAULTS), options || {});
		var container = getContainer(config.containerId);
		var componentId = config.id || ("svg-exporter-" + Date.now());
		var element = document.createElement("div");
		var main = document.createElement("div");
		var inputColumn = document.createElement("section");
		var previewColumn = document.createElement("section");
		var textarea = document.createElement("textarea");
		var previewBox = document.createElement("div");
		var previewImage = document.createElement("img");
		var previewPlaceholder = document.createElement("p");
		var actions = document.createElement("div");
		var downloadButton = document.createElement("button");
		var exportLayerButton = document.createElement("button");
		var status = document.createElement("p");
		var currentPreviewUrl = null;
		var component;

		element.id = componentId;
		element.className = "svg-exporter";
		element.style.width = config.width + "px";
		element.style.height = config.height + "px";

		main.className = "svg-exporter-main";
		inputColumn.className = "svg-exporter-column";
		previewColumn.className = "svg-exporter-column";

		textarea.className = "svg-exporter-textarea";
		textarea.spellcheck = false;
		textarea.placeholder = "Paste SVG XML here...";
		textarea.value = String(config.svgText || "");

		previewBox.className = "svg-exporter-preview-box";
		previewImage.className = "svg-exporter-preview-image";
		previewImage.alt = "SVG preview";
		previewPlaceholder.className = "svg-exporter-placeholder";
		previewPlaceholder.textContent = "Paste SVG XML to see a live preview.";

		actions.className = "svg-exporter-actions";
		downloadButton.type = "button";
		downloadButton.className = "svg-exporter-btn svg-exporter-btn-primary";
		downloadButton.textContent = "Download SVG";

		exportLayerButton.type = "button";
		exportLayerButton.className = "svg-exporter-btn";
		exportLayerButton.textContent = "To New Layer";

		status.className = "svg-exporter-status";
		status.textContent = "Ready.";

		inputColumn.appendChild(createTitle("SVG XML"));
		inputColumn.appendChild(textarea);
		inputColumn.appendChild(actions);

		previewColumn.appendChild(createTitle("Preview"));
		previewBox.appendChild(previewImage);
		previewBox.appendChild(previewPlaceholder);
		previewColumn.appendChild(previewBox);

		actions.appendChild(downloadButton);
		actions.appendChild(exportLayerButton);

		element.appendChild(main);
		main.appendChild(inputColumn);
		main.appendChild(previewColumn);
		element.appendChild(status);
		container.appendChild(element);

		component = {
			id: componentId,
			element: element,
			getWidth: function() {
				return config.width;
			},
			getHeight: function() {
				return config.height;
			},
			getSvgText: function() {
				return textarea.value;
			},
			setSvgText: function(svgText) {
				textarea.value = String(svgText || "");
				renderPreview();
			},
			destroy: function() {
				if (currentPreviewUrl) {
					URL.revokeObjectURL(currentPreviewUrl);
					currentPreviewUrl = null;
				}
				if (element.parentNode) {
					element.parentNode.removeChild(element);
				}
			}
		};

		textarea.addEventListener("keydown", function(event) {
			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				renderPreview();
			}
		});

		textarea.addEventListener("input", function() {
			renderPreview();
		});

		downloadButton.addEventListener("click", function() {
			var svgText = normalizeSvg(textarea.value);
			var blob;
			var url;
			var link;

			if (!svgText) {
				setStatus("Nothing to download.", true);
				return;
			}

			blob = new Blob([svgText], {
				type: "image/svg+xml;charset=utf-8"
			});

			if (typeof config.onDownload === "function") {
				config.onDownload({
					svgText: svgText,
					blob: blob
				}, component);
				return;
			}

			url = URL.createObjectURL(blob);
			link = document.createElement("a");
			link.href = url;
			link.download = "export.svg";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			setStatus("SVG downloaded.", false);
		});

		exportLayerButton.addEventListener("click", function() {
			var svgText = normalizeSvg(textarea.value);

			if (!svgText) {
				setStatus("Paste valid SVG before exporting.", true);
				return;
			}

			renderSvgToCanvas(svgText).then(function(result) {
				var exportResult;

				if (typeof config.onExportToLayer === "function") {
					exportResult = config.onExportToLayer({
						svgText: svgText,
						canvas: result.canvas,
						width: result.canvas.width,
						height: result.canvas.height
					}, component);

					if (exportResult === false) {
						setStatus("Unable to export to layer.", true);
						return;
					}

					setStatus("SVG sent to layer.", false);
					return;
				}

				setStatus("No layer export handler configured.", true);
			}).catch(function(error) {
				setStatus(error && error.message ? error.message : "Unable to export SVG.", true);
			});
		});

		renderPreview();
		return component;

		function renderPreview() {
			var svgText = normalizeSvg(textarea.value);
			var blob;
			var nextPreviewUrl;

			if (!svgText) {
				setPlaceholderMode(true);
				setTextareaError(false);
				setStatus("Paste SVG XML to render a preview.", false);
				return;
			}

			blob = new Blob([svgText], {
				type: "image/svg+xml;charset=utf-8"
			});
			nextPreviewUrl = URL.createObjectURL(blob);

			previewImage.onload = function() {
				if (currentPreviewUrl) {
					URL.revokeObjectURL(currentPreviewUrl);
				}

				currentPreviewUrl = nextPreviewUrl;
				setPlaceholderMode(false);
				setTextareaError(false);
				setStatus("Preview updated (" + previewImage.naturalWidth + " x " + previewImage.naturalHeight + ").", false);
			};

			previewImage.onerror = function() {
				URL.revokeObjectURL(nextPreviewUrl);
				setPlaceholderMode(true);
				setTextareaError(true);
				setStatus("Invalid SVG. Check your XML.", true);
			};

			previewImage.src = nextPreviewUrl;
		}

		function setPlaceholderMode(active) {
			previewImage.style.display = active ? "none" : "block";
			previewPlaceholder.style.display = active ? "block" : "none";
		}

		function setStatus(message, isError) {
			status.textContent = message;
			status.style.color = isError ? "#8a1f1f" : "#273142";
		}

		function setTextareaError(active) {
			if (active) {
				textarea.classList.add("svg-exporter-textarea-error");
				return;
			}

			textarea.classList.remove("svg-exporter-textarea-error");
		}
	}

	function createTitle(text) {
		var title = document.createElement("h3");

		title.className = "svg-exporter-title";
		title.textContent = text;
		return title;
	}

	function normalizeSvg(svgText) {
		var text = String(svgText || "").trim();

		if (!text) {
			return "";
		}

		if (text.toLowerCase().indexOf("<svg") < 0) {
			return "";
		}

		return text;
	}

	function renderSvgToCanvas(svgText) {
		return loadSvgImage(svgText).then(function(image) {
			var width = image.naturalWidth || image.width || 1;
			var height = image.naturalHeight || image.height || 1;
			var canvas = document.createElement("canvas");
			var context;

			canvas.width = width;
			canvas.height = height;
			context = canvas.getContext("2d");
			context.clearRect(0, 0, width, height);
			context.drawImage(image, 0, 0);

			return {
				canvas: canvas
			};
		});
	}

	function loadSvgImage(svgText) {
		return new Promise(function(resolve, reject) {
			var blob = new Blob([svgText], {
				type: "image/svg+xml;charset=utf-8"
			});
			var url = URL.createObjectURL(blob);
			var image = new Image();

			image.onload = function() {
				URL.revokeObjectURL(url);
				resolve(image);
			};

			image.onerror = function() {
				URL.revokeObjectURL(url);
				reject(new Error("Unable to load SVG image."));
			};

			image.src = url;
		});
	}

	global.SVGExporter = SVGExporter;

}(window));
