(function($) {

    //"use strict";

    console.log("bd plug-in!");

    $.brushEditor = function(options) {

        //console.log("brushEditor! options:", options);

        var defaults = {
            'title': 'Brush Designer 1.0 - Andres J. Soria R. 2016',
            //'message': 'Do you really want to do that?',
            //'okTitle': 'OK',
            //'cancelTitle': 'Cancel',
            //'onconfirm': null,
            //'oncancel': null,
            beforeOpen: function(){},
            beforeClose: function(){},
            whenDestroyed: function(){}
        };

        var parameters = $.extend(defaults, options);

        var htmlString = '';
        htmlString += '<div  class="be-back-bg" style="background-color: black; height: 100%; left: 0; opacity: 0.6; position: absolute; top: 0; width: 100%;"></div>';

        htmlString +=   '<div id="window-brush-editor" class="be-window" >' +
                        '<div id="be-wave" class="be-wave"> </div>' +
                        '<div id="be-ui-image" class="be-ui-image"> </div>' +
                        '<div class="be-title">' + parameters.title + '</div>' +
                        '<div id="be-brush" class="be-brush"> </div>' +
                        '<div id="be-mirror" class="be-mirror"> </div>' +
                        '<button class="be-btn" type="button" onclick="$.brushEditor(\'close\')">Close</button>' +
                        '<button class="be-btn" type="button" onclick="$.brushEditor(\'save\')">Save Brush</button>' +
                        '';


        // CREATE CANVAS

        var heightOfEachPoint = []; // The complete wave
        var heightOfArea = []; // part of the wave that was edited

        var blackBoard = {
            cvObj: null,
            cvCtx: null,
            init: function() {

                defaults.beforeOpen();

                /* Create canvas */

                var canvas = document.createElement('canvas');
                canvas.id = "paintWaveLayer";
                canvas.width = 500;
                canvas.height = 256;
                canvas.style.zIndex = 8;
                canvas.style.position = "absolute";
                canvas.style.cursor = "crosshair";
                var body = document.getElementById("be-wave");
                body.appendChild(canvas);

                


                /* atach events to canvas */

                //  blackBoard.cvObj 

                blackBoard.cvObj = document.getElementById("paintWaveLayer");
                blackBoard.cvCtx = blackBoard.cvObj.getContext("2d");

                var obj = $(blackBoard.cvObj);

                obj.mousedown(function() {
                    isDragging = true;

                    console.log("isDragging = true");
                });

                $(window).mouseup(function() {
                    isDragging = false;

                    console.log("isDragging = false");

                    // paint polygon
                    blackBoard.paintWave();

                });

                obj.mousemove(function(event) {

                    if (isDragging === true) {

                        //console.log("event:", event);
                        //console.log("in canvas, x:" + event.offsetX + ": y:" + event.offsetY);

                        var x = event.offsetX;
                        var y = event.offsetY;

                        heightOfArea[x] = y;

                        var r, g, b, a;
                        r = g = b = 255;
                        a = 255;

                        blackBoard.cvCtx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
                        blackBoard.cvCtx.fillRect(x, y, 1, 1);
                    }

                });

            },
            paintWave: function() {

                //heightOfArea

                var max = blackBoard.getMax(heightOfArea);
                var min = blackBoard.getMin(heightOfArea);
                console.log("max:", max);
                console.log("min:", min);

                // Update area
                for (var i = min; i < max; i++) {
                    heightOfEachPoint[i] = null;
                    heightOfEachPoint[i] = heightOfArea[i] || null;
                    heightOfArea[i] = null;
                }

                console.log("heightOfEachPoint:", heightOfEachPoint);
                blackBoard.clear();

                var c2 = blackBoard.cvCtx;
                c2.fillStyle = '#f00';
                c2.beginPath();
                c2.moveTo(0, 0);

                var x = 0;
                var lon = heightOfEachPoint.length;

                for (x = 0; x < lon; x++) {
                    if (heightOfEachPoint[x] != undefined || heightOfEachPoint[x] != null) {
                        c2.lineTo(x, heightOfEachPoint[x]);
                    }
                }

                c2.lineTo(500, 255);
                c2.lineTo(0, 255);
                c2.lineTo(0, 0);

                c2.closePath();
                c2.fill();

                // close

                blackBoard.paintAllPoints();
                mirror.paint(c2.canvas);
                circle.paint(c2.canvas);
            },

            paintAllPoints: function(){
                blackBoard.cvCtx.fillStyle = "rgba(255,255,255,1)";
                var _x = 0;
                var lon = heightOfEachPoint.length;

                for (_x = 0; _x < lon; _x++) {
                    var _y = heightOfEachPoint[_x];
                    if ( _y != undefined || _y != null ) {
                        blackBoard.cvCtx.fillRect(_x, _y, 1, 1);
                    }
                }
                 
            },

            getMin: function(arr) {

                console.log("getMin: arr:", arr);

                var i; // = 0;
                var lon = arr.length;
                for (i = 0; i < lon; i++) {
                    if (arr[i] != undefined && arr[i] != null) {
                        return i;
                    }
                }
            },

            getMax: function(arr) {

                console.log("getMax: arr:", arr);

                var i; // = 0;
                var lon = arr.length;
                for (i = lon; i > 0; i--) {

                    console.log("arr["+ i +"]:"+ arr[i] );
                    if (arr[i] != undefined && arr[i] != null) {

                        console.log("...return --> "+ i );
                        return i;
                    }
                }
            },
            clear: function() {
                var canvasObj = document.getElementById("paintWaveLayer");
                var context = canvasObj.getContext("2d");
                context.clearRect(0, 0, canvasObj.width, canvasObj.height);
            }
        };

        var mirror = {
            cvObj: null,
            cvCtx: null,
            init: function() {

                var cv = document.createElement('canvas');
                cv.id = "cvMirrorLayer";
                cv.width = 488;
                cv.height = 100;
                cv.style.zIndex = 8;
                cv.style.position = "absolute";
                var body = document.getElementById("be-mirror");
                body.appendChild(cv);

                mirror.cvObj = document.getElementById("cvMirrorLayer");
                mirror.cvCtx = mirror.cvObj.getContext("2d");
            },
            paint: function(sourceCanvas) {

                // Copy canvas
                mirror.clear();
                mirror.cvCtx.drawImage(sourceCanvas, 244, 0, 244, 100);

                // Draw flip image
                mirror.cvCtx.scale(-1, 1);
                mirror.cvCtx.drawImage(sourceCanvas, -244, 0, 244, 100);
                mirror.cvCtx.scale(-1, 1);

            },
            clear: function() {

                mirror.cvCtx.clearRect(0, 0, mirror.cvObj.width, mirror.cvObj.height);
            }
        };

        var circle = {
            cvObj: null,
            cvCtx: null,
            init: function() {

                var cv2 = document.createElement('canvas');
                cv2.id = "cvBrushLayer";
                cv2.width = 256;
                cv2.height = 256;
                cv2.style.zIndex = 8;
                cv2.style.position = "absolute";
                var body = document.getElementById("be-brush");
                body.appendChild(cv2);

                circle.cvObj = document.getElementById("cvBrushLayer");
                circle.cvCtx = circle.cvObj.getContext("2d");
            },

            paint: function(arr) {

                // Paint wave
                circle.clear();
                console.log("PAINT!");

                var xlong = 256;
                var ylong = 256;

                var alphaArr = getAlphaArray();

                console.log( "alphaArr:", alphaArr );
                console.log( "alphaArr.length:", alphaArr.length );

                for (_x = 0; _x < xlong; _x++) {

                    for (_y = 0; _y < ylong; _y++) {

                        var dist = dist2Points(_x, _y, 127, 127);

                        var r, g, b, a;
                        r = g = b = 255;

                        // alphaArr has 500 points and values from 0 to 255;
                        // the radio of the brush is 128 pixels long;

                        var d = Math.round( getValueFromRange( dist, 0, 127, 0, 500) );
                        a = 1 - getValueFromRange( alphaArr[d], 0, 256, 0, 1 );

                        if (dist <= 127) {

                            circle.cvCtx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
                            circle.cvCtx.fillRect(_x, _y, 1, 1);
                        }

                    }
                }

            },

            clear: function() {

                circle.cvCtx.clearRect(0, 0, circle.cvObj.width, circle.cvObj.height);
            }
        };

        function dist2Points(x1, y1, x2, y2) {

            /*
            var dist = 0;
            var a = 0;
            var b = 0;

            a = x1 - x2;
            b = y1 - y2;

            a = Math.abs(a * a);
            b = Math.abs(b * b);

            var dist = Math.sqrt(a + b);
            //console.log( "("+ x1 +","+ y1 +","+ x2 +","+ y2 +") dist:", dist );

            return Math.round( dist );
            */

            return Math.round( Math.sqrt( Math.abs((x1 - x2) * (x1 - x2)) + Math.abs((y1 - y2) * (y1 - y2)) ) );
        }

        function getAlphaArray() { // 0 to 256

            var canvasObj = document.getElementById("paintWaveLayer");
            var sourceCanvasCtx = canvasObj.getContext("2d"); //canvas.getContext('2d');
            var alphaArr = [];
            var w = 500; //500; //sourceCanvasCtx.width;
            var h = 256; //sourceCanvasCtx.height;

            for (x = 0; x < w; x++) {

                alphaArr[x] = 0;

                for (y = 0; y < h; y++) {

                    var pixel = sourceCanvasCtx.getImageData(x, y, 1, 1);
                    var data = pixel.data;
                    //var rgba = 'rgba(' + data[0] + ',' + data[1] + ',' + data[2] + ',' + data[3] + ')';
                    //console.log("rgba:", rgba );

                    if ( data[0] > 240 ) { // Red color

                        alphaArr[x] = y;
                        break;
                    } 

                }
            }

            return alphaArr;
        }

        function getValueFromRange ( input, input_min, input_max, output_min, output_max ){

            /*
                input_max  -->  100%
                input      -->  value%
            */

            var value = input * 100 / input_max;

            /*
                output_max  -->  100%
                output     -->  value%
            */

            var output = value * output_max / 100;

            return output; // Math.round( output );
        }

        if ( $("#window-brush-editor").length === 0 ){ // TODO: Check out this ASAP!

            console.log("brushEditor! create!");

            var link = $("body");
            link.append(htmlString);
            link.append('<ol id="brush-editor-outputs"></ol>');
            blackBoard.init(); // This is awful! The number of binded events increase every time we create/open this component.
            mirror.init();
            circle.init();      
        }
        /*
        else {
            console.log("ERROR: A previously created instance is being used now. It should be destroyed to create a new one.");
        }
        */

        if (options === "save") { // TODO: This is awful! The number of binded events increase every time we close the window.

            console.log("brushEditor! save!");

            /*
            var c = document.createElement('canvas');
            var ctx = x.getContext('2d');
            ctx.drawImage( circle.cvCtx.canvas, 0, 0, 256, 256 );

            // Store the brush image.
            var imgData = ctx.toDataURL("image/png");
            */

            circle_cvObj = document.getElementById("cvBrushLayer");
            circle_cvCtx = circle_cvObj.getContext("2d");    
            var imgData = circle_cvCtx.canvas.toDataURL("image/png");
            var html = '<li><img src="' + imgData + '" width="256" height="256" /></li>'; //style="display:none" 
            var link = $("#brush-editor-outputs");
            link.append( html );

            //close();
        }

        if (options === "close") { // TODO: This is awful! The number of binded events increase every time we close the window.

            close(); 
            
        }

        function close(){
            console.log("brushEditor! close!");
            defaults.beforeClose();
            destroy();
        }

        function destroy(){
            $(".be-back-bg").remove();
            //$(blackBoard.cvObj).off();
            $("#window-brush-editor").remove();  

            defaults.whenDestroyed();   

            // unbind events       
        }

    }; // $.brushEditor = function() ends here!

}(jQuery));
