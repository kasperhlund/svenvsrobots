/*global $: false, Audio: false*/
/*jshint bitwise: false*/
/*libjsca - lib JavaScript Canvas Application*/

/**
 * Helper methods and classes for making js applications based on Canvas
 * Not recommended
 */

var libjsca = {};


libjsca.storage = {};

libjsca.storage.existsInLocalStorage = function(key) {
    return window.localStorage.getItem(key) !== null;
};

libjsca.storage.parseJsonFromFile = function(path) {
    var jsonData;
    jsonData = null;
    ($.ajax({
        async: false,
        dataType: "json",
        url: path,
        success: function (data) {
            jsonData = data;
        },
        error: function(jqXHR, textStatus) {
            throw new Error("Error reading " + path + ": " + textStatus);
        }
    }));
    return jsonData;
};

libjsca.storage.parseJsonFromLocalStorage = function(key)
{
    var json;
    json = window.localStorage.getItem(key);
    return $.parseJSON(json);
};

// from http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
libjsca.createUUID = function() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
};

libjsca.Point = function(x, y) {
    this.x = x;
    this.y = y;
};

libjsca.Point.prototype.multiply = function(scalar) {
    this.x *= scalar;
    this.y *= scalar;
};

libjsca.Point.prototype.add = function(point) {
    this.x += point.x;
    this.y += point.y;
};

libjsca.Point.prototype.subtract = function(point) {
    this.x -= point.x;
    this.y -= point.y;
};

libjsca.Point.prototype.set = function(x, y) {
    this.x = x;
    this.y = y;
};

libjsca.Point.prototype.isEqualTo = function(point) {
    return this.x === point.x && this.y === point.y;
};

libjsca.Point.prototype.clone = function() {
    return new libjsca.Point(this.x, this.y);
};

libjsca.Point.prototype.getDistanceTo = function(point) {
    return  Math.sqrt(Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2));
}

/**
 * Reduce the bases to reveal only their sign, either -1, 0, 1.
 */
libjsca.Point.prototype.reduceToSign = function() {
    if(this.x !== 0) {
        this.x = this.x / Math.abs(this.x);
    }
    if(this.y !== 0) {
        this.y = this.y / Math.abs(this.y);
    }
};

libjsca.Rectangle = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};

libjsca.Rectangle.prototype.contains = function(point) {
    return point.x <= this.x + this.width && point.x >= this.x && point.y <= this.y + this.height && point.y >= this.y;
};

libjsca.Rectangle.prototype.isToRightOfBackslashDiagonal = function(point) {
    var k, x, y, result;
    x = point.x - this.x;
    // flip coordinate system from top-down to bottom-up.
    y = this.height - (point.y - this.y);

    // using y = kx + m.
    k = this.height / this.width * -1;
    // right of the back slash diagonal?

    result = k * x + this.height;
    return y >= result;
};

libjsca.Rectangle.prototype.isToRightOfFrontslashDiagonal = function(point) {
    var k, x, y, result;
    x = point.x - this.x;
    // flip coordinate system from top-down to bottom-up.
    y = this.height - (point.y - this.y);

    k = this.height / this.width;
    result = k * x;
    return y <= result;
};

/**
 * Lightweight canvas wrapper
 *
 * @param {string | Null} elementId
 * @param {number} [width]
 * @param {number} [height]
 *
 */
libjsca.Canvas = function(elementId, width, height) {
    if(elementId !== null) {
        this.canvasElement = document.getElementById(elementId);
    } else {
        this.canvasElement = document.createElement("canvas");
    }
    if(typeof width === "number" && typeof height === "number") {
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }
    if(!this.canvasElement.getContext) {
        throw ("getContext not supported for canvas.");
    }
    this.context = this.canvasElement.getContext("2d");
};

libjsca.Canvas.prototype.fill = function(color) {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.canvasElement.width, 0);
};

libjsca.Canvas.prototype.fillVerticalGradient = function(topColor, bottomColor) {
    var gradient = this.context.createLinearGradient(0,0,0, this.canvasElement.height);
    gradient.addColorStop(0,topColor);
    gradient.addColorStop(1,bottomColor);
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
};

libjsca.Canvas.prototype.drawCanvas = function(aCanvas) {
    this.context.drawImage(aCanvas.canvasElement, 0, 0);
};
libjsca.Canvas.prototype.getWidth = function() {
    return this.canvasElement.width;
};
libjsca.Canvas.prototype.getHeight = function() {
    return this.canvasElement.height;
};

/**
 *@param {libjsca.ImageRegion}
 *@param {number} x
 *@param {number} y
 *@param {Null|number} width
 *@param {Null|number} height
 *@returns {libjsca.Point} width and height that was drawn
 *
 * width and height can be set to null.
 * if width and height is null it will use the width and height from libjsca.ImageRegion.
 * if only given one and the other null it will calculate the other based on the libjsca.ImageRegion's aspect ratio
 */
libjsca.Canvas.prototype.drawImageRegion = function(imageRegion, x, y, width, height) {
    var width2, height2;

    if(!(imageRegion instanceof libjsca.ImageRegion)) {
        throw new Error("drawImageRegion(): imageRegion must be instanceof libjsca.ImageRegion.");
    }

    if(width === null && height === null) {
        width2 = imageRegion.width;
        height2 = imageRegion.height;
    } else if(width === null) {
        width2 = Math.floor(height * imageRegion.width / imageRegion.height);
        height2 = height;
    } else if(height === null) {
        height2 = Math.floor(width * imageRegion.height / imageRegion.width);
        width2 = width;
    } else {
        width2 = width;
        height2 = height;
    }
    this.context.drawImage(imageRegion.image, imageRegion.x, imageRegion.y, imageRegion.width, imageRegion.height, x, y, width2, height2);

    return new libjsca.Point(width2, height2);
};

libjsca.Canvas.prototype.getCenter = function() {
    var x, y;

    x = Math.floor(this.getWidth() / 2);
    y = Math.floor(this.getHeight() / 2);

    return new libjsca.Point(x, y);
};

/**
 * @constructor
 *
 */
libjsca.ImageRegion = function(image, x, y, width, height) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};

libjsca.ImageRegion.prototype.getCenter = function() {
    var x, y;
    x = Math.floor(this.width / 2);
    y = Math.floor(this.height / 2);
    return new libjsca.Point(x, y);
};

/**
 * @param {number|null} width
 */
libjsca.ImageRegion.prototype.getHeight = function(width) {
    var ar;
    ar = this.width / this.height;
    if(typeof(width) === "number") {
        return Math.floor(width / ar);
    }
    return this.height;
};

/**
 * @param {number|null} height
 */
libjsca.ImageRegion.prototype.getWidth = function(height) {
    var ar;
    ar = this.width / this.height;
    if(typeof(height) === "number") {
        return Math.floor(ar * height);
    }
    return this.width;
};

/**
 *
 * @param {libjsca.ImageRegion[]} imageRegions
 * @param {number} duration in milliseconds
 * @param {boolean} isLooping
 * @constructor
 */

libjsca.Animation = function(imageRegions, duration, isLooping) {
    this.imageRegions = imageRegions;
    this.duration = duration;
    this.isLooping = isLooping;
    this.frameDuration = Math.floor(this.duration / this.imageRegions.length);
};

libjsca.Animation.prototype.getImageRegion = function(duration) {
    var adjustedDuration, index, imageRegion;
    if(this.isLooping) {
        adjustedDuration = duration % this.duration;
    } else {
        if(duration >= this.duration) {
            return this.imageRegions[this.imageRegions.length - 1];
        }
        adjustedDuration = duration;
    }

    index = Math.floor(adjustedDuration / this.frameDuration);

    if(index >= this.imageRegions.length) {
        index = this.imageRegions.length - 1;
    }

    imageRegion = this.imageRegions[index];

    if(imageRegion === undefined) {
        return null;
    }

    return this.imageRegions[index];
};

/**
 *
 * @param canvasElement
 * @constructor
 *
 */
libjsca.InputHandler = function(canvasElement) {
    this.canvasElement = canvasElement;
    this.inputControls = [];
    this.isListening = false;
};

/**
 *
 * @param {string|null} applicationScreenDomId
 *
 * Since the canvas can be covered by a div (if an html element is defined with that id) we need to bind mousedown to the element also.
 */
libjsca.InputHandler.prototype.startListening = function(applicationScreenDomId) {
    this.canvasElement.addEventListener("mousedown", this.mouseListener.bind(this));

    this.applicationScreenDomId = applicationScreenDomId;
    if(typeof(this.applicationScreenDomId) === "string") {
        $("#" + this.applicationScreenDomId).on("mousedown", this.mouseListener.bind(this));
    }
    document.onkeydown = this.keyListener.bind(this);

    this.inputControls.forEach(function(inputControl) {
        if(typeof(inputControl.domSelector) === "string") {
            $(inputControl.domSelector).on(inputControl.domEvent, inputControl.action);
        }

    });

    this.isListening = true;
};

libjsca.InputHandler.prototype.stopListening = function() {
    this.isListening = false;
    document.onkeydown = undefined;
    this.canvasElement.removeEventListener("mousedown", this.mouseListener.bind(this));

    if(typeof(this.applicationScreenDomId) === "string") {
        $("#" + this.applicationScreenDomId).off("mousedown");
    }

    this.inputControls.forEach(function(inputControl) {
        if(typeof(inputControl.domSelector) === "string") {
            $(inputControl.domSelector).off(inputControl.domEvent, inputControl.action);
        }
    });
};

/**
 *
 * @param mouseEvent
 */
libjsca.InputHandler.prototype.mouseListener = function(mouseEvent) {
    var coordinates, x, y;

    x = mouseEvent.pageX - $(mouseEvent.target).offset().left;
    y = mouseEvent.pageY - $(mouseEvent.target).offset().top;
    coordinates = new libjsca.Point(x, y);

    this.inputControls.forEach(function(inputControl) {
        if(inputControl.isCanvasAreaClicked(coordinates)) {
            inputControl.action();
        }
    });
};

libjsca.InputHandler.prototype.keyListener = function(keyboardEvent) {
    this.inputControls.forEach(function(inputControl) {
        if(inputControl.isKeyPressed(keyboardEvent.keyCode)) {
            inputControl.action();
        }
    });
};

/***
 *
 * @param action
 * @param inputMethod
 * @constructor
 */
libjsca.InputControl = function(action, inputMethod) {
    if(typeof action !== "function") {
        throw new Error("libjsca.InputControl() action must be a function");
    }
    if(typeof inputMethod !== "object") {
        throw new Error("libjsca.InputControl() inputMethod must be an object");
    }

    this.action = action;
    this.area = inputMethod.hasOwnProperty("canvasArea") ? inputMethod.canvasArea : null;
    this.keycodes = inputMethod.hasOwnProperty("keycodes") ? inputMethod.keycodes : [];
    this.domSelector = inputMethod.hasOwnProperty("domSelector") ? inputMethod.domSelector : null;
    this.domEvent = inputMethod.hasOwnProperty("domEvent") ? inputMethod.domEvent : "click";

};

/**
 *
 * @param {libjsca.Point} coordinates
 * @return {boolean}
 */
libjsca.InputControl.prototype.isCanvasAreaClicked = function(coordinates) {
    if(this.area instanceof libjsca.Rectangle) {
        return this.area.contains(coordinates);
    }
    return false;
};

libjsca.InputControl.prototype.isKeyPressed = function(keycode) {
    return this.keycodes.indexOf(keycode) !== -1;
};

libjsca.CanvasApplication = function() {
};

libjsca.CanvasApplication.prototype.init = function(canvasId) {
    this.canvas = new libjsca.Canvas(canvasId);
    this.width = this.canvas.getWidth();
    this.height = this.canvas.getHeight();
    this.input = new libjsca.InputHandler(this.canvas.canvasElement);
    window.console.log("libjsca.CanvasApplication init done: " + canvasId + " @ " + this.canvas.getWidth() + " X " + this.canvas.getHeight() + " px.");
};

/**
 *
 * @param {libjsca.ApplicationScreen} applicationScreen
 * @param [parameters] will be forwarded to applicationScreen's show method
 */
libjsca.CanvasApplication.prototype.setApplicationScreen = function(applicationScreen, parameters) {

    window.console.log("setApplicationScreen() " + applicationScreen.getIdentifier());

    if(this.applicationScreen instanceof libjsca.ApplicationScreen) {
        $("#" + this.applicationScreen.getIdentifier()).hide();
        this.applicationScreen.hide();
        this.input.stopListening();
    }
    this.previousApplicationScreen = this.applicationScreen;
    this.applicationScreen = applicationScreen;
    $("#" + this.applicationScreen.getIdentifier()).show();
    this.applicationScreen.show(parameters);
    this.input.inputControls = this.applicationScreen.inputControls;
    this.input.startListening(this.applicationScreen.getIdentifier());
};

/**
 *
 * @constructor
 */
libjsca.ApplicationScreen = function(identifier) {
    /**
     *
     * @type {libjsca.InputControl[]}
     */
    this.inputControls = [];
    if(typeof(identifier) !== "string") {
        throw new Error("libjsca.ApplicationScreen: identifier must be a string.");
    }
    this.identifier = identifier;
};

/**
 * @type {Function}
 */
libjsca.ApplicationScreen.prototype.show = function() {
    throw new Error("override this method");
};
/**
 * @type {Function}
 */
libjsca.ApplicationScreen.prototype.hide = function() {
    throw new Error("override this method");
};

/**
 * @type {Function}
 */
libjsca.ApplicationScreen.prototype.getIdentifier = function() {
    return this.identifier;
};

/***
 *
 * @param applicationScreen
 * @returns {boolean}
 */
libjsca.ApplicationScreen.prototype.is = function(applicationScreen) {
    return this.identifier === applicationScreen.identifier;
};


libjsca.StopWatch = function() {
    this.isRunning = false;
};

libjsca.StopWatch.prototype.start = function() {
    this.startTime = (new Date()).getTime();
    this.isRunning = true;
};

libjsca.StopWatch.prototype.stop = function() {
    if(!this.isRunning) {
        return 0;
    }

    this.isRunning = false;
    return (new Date()).getTime() - this.startTime;
};

libjsca.StopWatch.prototype.getTimePassed = function() {
    if(!this.isRunning) {
        return 0;
    }
    return (new Date()).getTime() - this.startTime;
};
