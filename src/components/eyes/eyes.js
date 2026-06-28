(function(global) {

    "use strict";

    var WINDOW_WIDTH = 252;
    var WINDOW_HEIGHT = 222;
    var CONTENT_LEFT = 6;
    var CONTENT_TOP = 26;
    var SOCKET_RADIUS = 15;
    var PUPIL_WIDTH = 18;
    var PUPIL_HEIGHT = 30;

    var eyes = [
        { cx: 78, cy: 78 },
        { cx: 162, cy: 78 }
    ];

    var instance = null;

    function Eyes() {
        this.windowEl = null;
        this.pupils = [];
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.animFrame = null;
        this.mouseX = -1000;
        this.mouseY = -1000;
    }

    Eyes.prototype.build = function() {
        var self = this;
        var win;
        var content;
        var closeBtn;
        var leftSocket;
        var rightSocket;
        var leftPupil;
        var rightPupil;

        win = document.createElement("div");
        win.className = "eyes-window";
        win.style.left = "100px";
        win.style.top = "100px";

        content = document.createElement("div");
        content.className = "eyes-content";
        win.appendChild(content);

        leftPupil = document.createElement("div");
        leftPupil.className = "eyes-pupil";
        rightPupil = document.createElement("div");
        rightPupil.className = "eyes-pupil";

        leftSocket = document.createElement("div");
        leftSocket.className = "eyes-socket";
        leftSocket.style.left = (eyes[0].cx - 22) + "px";
        leftSocket.style.top = (eyes[0].cy - 22) + "px";
        leftPupil.style.left = (eyes[0].cx - PUPIL_WIDTH / 2) + "px";
        leftPupil.style.top = (eyes[0].cy - PUPIL_HEIGHT / 2) + "px";
        leftSocket.appendChild(leftPupil);
        content.appendChild(leftSocket);

        rightSocket = document.createElement("div");
        rightSocket.className = "eyes-socket";
        rightSocket.style.left = (eyes[1].cx - 22) + "px";
        rightSocket.style.top = (eyes[1].cy - 22) + "px";
        rightPupil.style.left = (eyes[1].cx - PUPIL_WIDTH / 2) + "px";
        rightPupil.style.top = (eyes[1].cy - PUPIL_HEIGHT / 2) + "px";
        rightSocket.appendChild(rightPupil);
        content.appendChild(rightSocket);

        closeBtn = document.createElement("div");
        closeBtn.className = "eyes-close";
        closeBtn.title = "Close";
        closeBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            self.close();
        });
        win.appendChild(closeBtn);

        win.addEventListener("mousedown", function(e) {
            if (e.target === closeBtn) return;
            self.isDragging = true;
            self.dragOffsetX = e.clientX - win.offsetLeft;
            self.dragOffsetY = e.clientY - win.offsetTop;
            win.style.cursor = "grabbing";
            e.preventDefault();
        });

        document.addEventListener("mousemove", function(e) {
            self.mouseX = e.clientX;
            self.mouseY = e.clientY;

            if (self.isDragging && self.windowEl) {
                self.windowEl.style.left = (e.clientX - self.dragOffsetX) + "px";
                self.windowEl.style.top = (e.clientY - self.dragOffsetY) + "px";
            }
        });

        document.addEventListener("mouseup", function() {
            if (self.isDragging && self.windowEl) {
                self.isDragging = false;
                self.windowEl.style.cursor = "default";
            }
        });

        this.windowEl = win;
        this.pupils = [leftPupil, rightPupil];

        document.body.appendChild(win);
        this.startLoop();
    };

    Eyes.prototype.getSocketCenter = function(pupilEl) {
        var socket = pupilEl.parentNode;
        var socketLeft = parseInt(socket.style.left, 10);
        var socketTop = parseInt(socket.style.top, 10);

        return { x: socketLeft + 22, y: socketTop + 22 };
    };

    Eyes.prototype.updatePupils = function() {
        var self = this;
        var mx = this.mouseX;
        var my = this.mouseY;
        var win = this.windowEl;

        this.pupils.forEach(function(pupil) {
            var center = self.getSocketCenter(pupil);
            var absCx = win.offsetLeft + CONTENT_LEFT + center.x;
            var absCy = win.offsetTop + CONTENT_TOP + center.y;
            var dx = mx - absCx;
            var dy = my - absCy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var angle = Math.atan2(dy, dx);
            var offset = Math.min(dist, SOCKET_RADIUS);

            pupil.style.left = (center.x - PUPIL_WIDTH / 2 + Math.cos(angle) * offset) + "px";
            pupil.style.top = (center.y - PUPIL_HEIGHT / 2 + Math.sin(angle) * offset) + "px";
        });
    };

    Eyes.prototype.loop = function() {
        if (!this.windowEl) return;
        this.updatePupils();
        this.animFrame = requestAnimationFrame(this.loop.bind(this));
    };

    Eyes.prototype.startLoop = function() {
        this.loop();
    };

    Eyes.prototype.close = function() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
        if (this.windowEl && this.windowEl.parentNode) {
            this.windowEl.parentNode.removeChild(this.windowEl);
        }
        this.windowEl = null;
        this.pupils = [];
        instance = null;
    };

    function openEyes() {
        if (instance) {
            return instance;
        }

        instance = new Eyes();
        instance.build();
        return instance;
    }

    function closeEyes() {
        if (instance) {
            instance.close();
        }
    }

    global.Eyes = {
        open: openEyes,
        close: closeEyes
    };

}(window));
