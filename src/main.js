import $ from "jquery";

import "./components/jqbrushdesigner/jqbrushdesigner.css";
import "./components/bigColorPicker/bigColorPicker.css";
import "./components/paintBoard/paintBoard.css";
import "./components/paintTools/paintTools.css";
import "./components/simpleColorPicker/simpleColorPicker.css";
import "./components/simpleLineWidthPicker/simpleLineWidthPicker.css";
import "./components/windowsManager/windowsManager.css";
import "./components/newDocumentDialog/newDocumentDialog.css";
import "./components/starGenerator/starGenerator.css";
import "ajsr-confirm/dist/css/tmplt-default.css";
import "ajsr-notify/dist/css/tmplt-default.css";
import "./toolsBar.css";

window.$ = $;
window.jQuery = $;

await import("./components/jqbrushdesigner/jqbrushdesigner.js");
await import("./components/bigColorPicker/bigColorPicker.js");
await import("./components/paintBoard/paintBoard.js");
await import("./components/paintTools/paintTools.js");
await import("./components/simpleColorPicker/simpleColorPicker.js");
await import("./components/simpleLineWidthPicker/simpleLineWidthPicker.js");
await import("./components/windowsManager/windowsManager.js");
await import("./components/newDocumentDialog/newDocumentDialog.js");
await import("./components/starGenerator/starGenerator.js");
await import("ajsr-confirm");
await import("ajsr-notify");
await import("./app.js");
await import("./zoom.js");
