(function(global) {

    "use strict";

    var GOALS = [
        { index: 1, name: "No Poverty", color: "#E5243B" },
        { index: 2, name: "Zero Hunger", color: "#DDA63A" },
        { index: 3, name: "Good Health and Well-Being", color: "#4C9F38" },
        { index: 4, name: "Quality Education", color: "#C5192D" },
        { index: 5, name: "Gender Equality", color: "#FF3A21" },
        { index: 6, name: "Clean Water and Sanitation", color: "#26BDE2" },
        { index: 7, name: "Affordable and Clean Energy", color: "#FCC30B" },
        { index: 8, name: "Decent Work and Economic Growth", color: "#A21942" },
        { index: 9, name: "Industry, Innovation and Infrastructure", color: "#FD6925" },
        { index: 10, name: "Reduced Inequalities", color: "#DD1367" },
        { index: 11, name: "Sustainable Cities and Communities", color: "#FD9D24" },
        { index: 12, name: "Responsible Consumption and Production", color: "#BF8B2E" },
        { index: 13, name: "Climate Action", color: "#3F7E44" },
        { index: 14, name: "Life Below Water", color: "#0A97D9" },
        { index: 15, name: "Life on Land", color: "#56C02B" },
        { index: 16, name: "Peace, Justice and Strong Institutions", color: "#00689D" },
        { index: 17, name: "Partnerships for the Goals", color: "#19486A" }
    ];

    var WHEEL = {
        centerX: 92,
        centerY: 97,
        outerRadius: 83,
        innerRadius: 38
    };

    var TOTAL_GOALS = GOALS.length;
    var SEGMENT_DEG = 360 / TOTAL_GOALS;
    var START_ANGLE_DEG = -90;
    var AREA_COORDS = [
        "92,14,122,20,106,62,92,59",
        "122,20,148,36,118,69,106,62",
        "148,36,166,60,126,80,118,69",
        "166,60,175,89,130,93,126,80",
        "175,89,172,120,129,107,130,93",
        "172,120,158,147,122,120,129,107",
        "158,147,136,168,112,129,122,120",
        "136,168,107,179,99,134,112,129",
        "107,179,77,179,85,134,99,134",
        "77,179,48,168,72,129,85,134",
        "48,168,26,147,62,120,72,129",
        "26,147,12,120,55,107,62,120",
        "12,120,9,89,54,93,55,107",
        "9,89,18,60,58,80,54,93",
        "18,60,36,36,66,69,58,80",
        "36,36,62,20,78,62,66,69",
        "62,20,92,14,92,59,78,62"
    ];
    var MARKER = {
        width: 35,
        height: 46
    };
    var MARKER_CENTERS = [
        { index: 1, x: 104.1, y: 30.6 },
        { index: 2, x: 127.4, y: 39.8 },
        { index: 3, x: 145.8, y: 56.6 },
        { index: 4, x: 156.9, y: 79.0 },
        { index: 5, x: 159.2, y: 103.9 },
        { index: 6, x: 152.7, y: 127.7 },
        { index: 7, x: 137.7, y: 147.6 },
        { index: 8, x: 116.6, y: 160.9 },
        { index: 9, x: 91.9, y: 165.9 },
        { index: 10, x: 67.0, y: 161.5 },
        { index: 11, x: 45.5, y: 148.3 },
        { index: 12, x: 30.3, y: 128.1 },
        { index: 13, x: 23.3, y: 103.6 },
        { index: 14, x: 25.8, y: 78.5 },
        { index: 15, x: 37.3, y: 56.0 },
        { index: 16, x: 55.8, y: 39.3 },
        { index: 17, x: 79.2, y: 32.2 }
    ];

    function TheGlobalGoalsPicker(options) {
        var config = options || {};
        var containerId = config.containerId;
        var container = containerId ? document.getElementById(containerId) : null;
        var element;
        var mapImage;
        var imageMap;
        var selectedMarker;
        var caption;
        var selectedGoal = null;
        var hoverGoal = null;
        var areaElements = [];
        var mapName = "tggp-map-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
        var component;

        if (!container) {
            throw new Error("TheGlobalGoalsPicker: container not found: " + containerId);
        }

        element = document.createElement("div");
        element.className = "tggp-container";

        selectedMarker = document.createElement("span");
        selectedMarker.className = "tggp-selected-marker";
        selectedMarker.setAttribute("aria-hidden", "true");

        mapImage = document.createElement("img");
        mapImage.className = "tggp-map-image";
        mapImage.alt = "The Global Goals color picker";
        mapImage.src = createTransparentImageDataUrl(184, 191);
        mapImage.useMap = "#" + mapName;
        mapImage.tabIndex = 0;

        imageMap = document.createElement("map");
        imageMap.name = mapName;
        createAreaElements(imageMap);

        caption = document.createElement("span");
        caption.className = "tggp-caption";
        caption.setAttribute("aria-live", "polite");

        element.appendChild(selectedMarker);
        element.appendChild(mapImage);
        element.appendChild(imageMap);
        element.appendChild(caption);
        container.appendChild(element);

        selectedGoal = getGoalByIndex(config.activeGoal) || null;
        render();

        mapImage.addEventListener("keydown", onMapKeyDown);

        component = {
            element: element,
            getActiveGoal: function() {
                return selectedGoal ? copyGoal(selectedGoal) : null;
            },
            setActiveGoal: function(goalIndex) {
                selectedGoal = getGoalByIndex(goalIndex) || null;
                hoverGoal = null;
                render();
                return selectedGoal ? copyGoal(selectedGoal) : null;
            },
            clearActiveGoal: function() {
                selectedGoal = null;
                hoverGoal = null;
                render();
            },
            destroy: function() {
                mapImage.removeEventListener("keydown", onMapKeyDown);
                areaElements.forEach(function(area) {
                    area.removeEventListener("click", onAreaClick);
                    area.removeEventListener("mouseover", onAreaHover);
                    area.removeEventListener("focus", onAreaHover);
                    area.removeEventListener("mouseout", onAreaLeave);
                    area.removeEventListener("blur", onAreaLeave);
                    area.removeEventListener("keydown", onMapKeyDown);
                });
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        };

        return component;

        function onAreaClick(event) {
            event.preventDefault();
            setSelectedGoal(getGoalByIndex(event.target.getAttribute("data-goal-index")));
        }

        function onAreaHover(event) {
            var goal = getGoalByIndex(event.target.getAttribute("data-goal-index"));

            if (goalsMatch(goal, hoverGoal)) {
                return;
            }

            hoverGoal = goal;
            render();
        }

        function onAreaLeave() {
            hoverGoal = null;
            render();
        }

        function onMapKeyDown(event) {
            var nextIndex;
            var targetGoal;

            if (event.key !== "ArrowLeft" &&
                event.key !== "ArrowRight" &&
                event.key !== "ArrowUp" &&
                event.key !== "ArrowDown" &&
                event.key !== "Enter" &&
                event.key !== " ") {
                return;
            }

            event.preventDefault();

            if (event.key === "Enter" || event.key === " ") {
                targetGoal = getGoalByIndex(
                    event.target && event.target.getAttribute ?
                        event.target.getAttribute("data-goal-index") :
                        null
                );
                setSelectedGoal(targetGoal || selectedGoal || hoverGoal || GOALS[0]);
                return;
            }

            nextIndex = selectedGoal ? selectedGoal.index : 1;
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex -= 1;
            } else {
                nextIndex += 1;
            }
            if (nextIndex < 1) {
                nextIndex = TOTAL_GOALS;
            }
            if (nextIndex > TOTAL_GOALS) {
                nextIndex = 1;
            }

            setSelectedGoal(getGoalByIndex(nextIndex));
        }

        function render() {
            var displayGoal = hoverGoal || selectedGoal;

            if (displayGoal) {
                positionMarker(displayGoal);
                selectedMarker.classList.add("tggp-selected-marker-visible");
            } else {
                selectedMarker.classList.remove("tggp-selected-marker-visible");
            }

            mapImage.title = displayGoal ?
                ("Goal " + displayGoal.index + ": " + displayGoal.name) :
                "The Global Goals";
            caption.textContent = displayGoal ?
                (displayGoal.index + ". " + displayGoal.name) :
                "";
        }

        function positionMarker(goal) {
            var index = goal.index - 1;
            var angleDeg = START_ANGLE_DEG + (index + 0.5) * SEGMENT_DEG;
            var center = getMarkerCenter(goal.index);

            selectedMarker.style.left = (center.x - MARKER.width / 2) + "px";
            selectedMarker.style.top = (center.y - MARKER.height / 2) + "px";
            selectedMarker.style.transform = "rotate(" + (angleDeg + 90) + "deg)";
        }

        function setSelectedGoal(goal) {
            if (!goal) {
                return;
            }

            selectedGoal = goal;
            hoverGoal = null;
            render();

            if (typeof config.onChange === "function") {
                config.onChange(copyGoal(goal), component);
            }
        }

        function createAreaElements(map) {
            GOALS.forEach(function(goal, index) {
                var area = document.createElement("area");
                var label = "Goal " + goal.index + ": " + goal.name;

                area.shape = "poly";
                area.coords = AREA_COORDS[index];
                area.href = "#";
                area.alt = label;
                area.title = label;
                area.setAttribute("data-goal-index", goal.index);
                area.addEventListener("click", onAreaClick);
                area.addEventListener("mouseover", onAreaHover);
                area.addEventListener("focus", onAreaHover);
                area.addEventListener("mouseout", onAreaLeave);
                area.addEventListener("blur", onAreaLeave);
                area.addEventListener("keydown", onMapKeyDown);
                map.appendChild(area);
                areaElements.push(area);
            });
        }

        function createTransparentImageDataUrl(width, height) {
            return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" +
                    width +
                    "\" height=\"" +
                    height +
                    "\"></svg>"
            );
        }

        function goalsMatch(a, b) {
            return (!a && !b) ||
                !!(a && b && a.index === b.index);
        }

        function getMarkerCenter(goalIndex) {
            var found = null;

            MARKER_CENTERS.forEach(function(center) {
                if (center.index === goalIndex) {
                    found = center;
                }
            });

            return found || MARKER_CENTERS[goalIndex - 1];
        }

    }

    function getGoalByIndex(index) {
        var goalIndex = Number(index);

        if (!goalIndex || goalIndex < 1 || goalIndex > TOTAL_GOALS) {
            return null;
        }

        return GOALS[goalIndex - 1] || null;
    }

    function getGoalByColor(color) {
        var normalized = String(color || "").toLowerCase();
        var found = null;

        GOALS.forEach(function(goal) {
            if (goal.color.toLowerCase() === normalized) {
                found = goal;
            }
        });

        return found;
    }

    function copyGoal(goal) {
        return {
            index: goal.index,
            name: goal.name,
            color: goal.color
        };
    }

    global.TheGlobalGoalsPicker = TheGlobalGoalsPicker;
    global.TheGlobalGoalsPickerGoals = GOALS.map(copyGoal);
    global.TheGlobalGoalsPickerGoalByColor = getGoalByColor;

}(window));
