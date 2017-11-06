(function() {

    "use strict";

    console.log("paintBoard plug-in!");

    var paintBoard = function(options) {

        var obj = {};

        /*
        obj.defaults = {
            'title': 'Paint Board 1.0 - Andres J. Soria R. 2016',
            beforeOpen: function(){},
            beforeClose: function(){},
            whenDestroyed: function(){}
        };
        */

        //var parameters = $.extend(defaults, options);

        var htmlString;

        htmlString +=   ''+
                        //'<div id="paint-board-'+ Date.now() +'" class="paint-board">'+
                            '<div class="pb-controls">'+ 
                                '<button class="be-btn" type="button" onclick="$.brushEditor(\'close\')">Close Board</button>' +
                                '<button class="be-btn" type="button" onclick="$.brushEditor(\'save\')">Save Image</button>' +
                            '</div>' +
                        //'</div>'+
                        '';

        //var body = document.getElementTagName("body");
        var dv = document.createElement("div");
        dv.id = "paint-board";
        document.body.appendChild( dv );
        var el = document.getElementById("paint-board");
        el.innerHTML = htmlString;


        // CREATE CANVAS

        //var heightOfEachPoint = []; // The complete wave
        //var heightOfArea = []; // part of the wave that was edited

        obj.board = {
            cvObj: null,
            cvCtx: null,
            init: function() {

                //defaults.beforeOpen();

                // Create canvas


                var c = document.createElement('canvas');
                c.id = "paintBoardCv";
                c.width = 1024;
                c.height = 1024;
                c.style.zIndex = 1;
                c.style.position = "absolute";
                c.style.cursor = "crosshair";
                //c.class = "paintBoardCv";
                var el = document.getElementById("paint-board");
                el.appendChild(c);

                // atach events to canvas

                //  paintBoard.cvObj 
                paintBoard.cvObj = document.getElementById("paintBoardCv");
                paintBoardCv = paintBoard.cvObj.getContext("2d");


            },
            paintWave: function() {

                console.log("paintWave!");

            },
            clear: function() {
                var canvasObj = document.getElementById("paintBoardCv");
                var context = canvasObj.getContext("2d");
                context.clearRect(0, 0, canvasObj.width, canvasObj.height);
                //paintBoardCv
            }
        };

        console.log("obj:", obj );

        obj.board.init();

        return obj;

        //

    }; // $.brushEditor = function() ends here!

    //var brd = paintBoard.board();

    //console.log("paintBoard.board:", brd );

    paintBoard();

}());
