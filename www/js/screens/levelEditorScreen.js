/*global de: false, libjsca: false, $: false*/
de.levelEditorScreen = new libjsca.ApplicationScreen("levelEditorScreen");

de.levelEditorScreen.init = function () {
    var i, action, x, y, width, height;

    x = $("#levelEditorControlDiv").width() + de.MARGIN;
    y = $("#levelEditorObjectDiv").height() + de.MARGIN;
    width = de.width - x - de.MARGIN;
    height = de.height - y - de.MARGIN;

    this.inputControls = [];

    this.worldArea = new libjsca.Rectangle(x, y, width, height);

    this.worldInputControl = new libjsca.InputControl(function () {/*defined later*/
    }, {canvasArea: de.levelEditorScreen.worldArea});
    this.inputControls.push(this.worldInputControl);

    // play button
    action = function () {
        de.setApplicationScreen(de.worldScreen, {setData : de.levelEditorScreen.setData, level : de.levelEditorScreen.level});
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#levelEditorControlPlayButton"}));

    // EXIT

    action = function () {
        de.setApplicationScreen(de.setEditorScreen);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#levelEditorControlExitButton"}));

    action = function () {
        de.levelEditorScreen.selectObject($(this).data("type"));
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#levelEditorObjectDiv span[data-type]"}));

    this.selectObject("Floor");

    this.init.hasRun = true;

};

de.levelEditorScreen.selectObject = function (selectedObject) {
    var selectedClass, action, text;
    $("#levelEditorObjectSelectedSpan").removeClass("inGameObjectDoor inGameObjectWall inGameObjectSwitch inGameObjectBounceRobot inGameObjectTargetRobot inGameObjectTowerRobot inGameObjectHole inGameObjectGoal inGameObjectBox inGameObjectFloor inGameObjectPlayer inGameObjectHulkRobot inGameObjectButton inGameObjectRainbow");
    selectedClass = "inGameObject" + selectedObject;
    $("#levelEditorObjectSelectedSpan").addClass(selectedClass);
    this.selectedObject = selectedObject;

    // some objects need some extra parameters, get them with a dialog
    if (this.selectedObject === "Switch") {
        action = function () {
            var parameter;
            parameter = {};
            parameter.isActiveFromStart = $("#configureSwitchCheckBox:checked").length !== 0;
            de.setApplicationScreen(de.levelEditorScreen, {"parameters" : parameter});
        };
        text = "<p>Configure Switch</p>";
        text += "<p><input id=\"configureSwitchCheckBox\" type=\"checkbox\" value=\"isActiveFromStart\"> In Open Door Mode from start?</p>";
        de.setApplicationScreen(de.dialogScreen, {"text": text, "ok": action});
    }  else if (this.selectedObject === "HulkRobot") {
        action = function () {
            var parameter;
            $("#levelEditorHulkRobotAddButton").off("click");
            $("#levelEditorHulkRobotRemoveButton").off("click");
            parameter = {};
            parameter.pattern = de.levelEditorScreen.hulkDialog.pattern;
            de.setApplicationScreen(de.levelEditorScreen, {"parameters" : parameter });
        };

        text = "<p>Instructions</p>";
        text += "<textarea id=\"levelEditorHulkRobotSequenceTextArea\" rows=\"100\" cols=\"20\" disabled=\"true\"></textarea>";
        text += "<p><select id=\"levelEditorHulkRobotSelect\"><option value=\"0,0\">Stay</option><option value=\"-1,0\">Left</option><option value=\"1,0\">Right</option><option value=\"0,1\">Down</option><option value=\"0,-1\">Up</option></select></p>";
        text += "<button id=\"levelEditorHulkRobotAddButton\">Add step</button>";
        text += "<button id=\"levelEditorHulkRobotRemoveButton\">Remove last</button>";

        // this dialog is kind of complex and needs to keep state so it gets its very own object
        this.hulkDialog = {};
        this.hulkDialog.pattern = [];
        this.hulkDialog.addStep = function () {
            var step, command;

            if (this.pattern.length < 100) {
                command = $("#levelEditorHulkRobotSelect option:selected").val().split(",");
                step = {};
                step.x = command[0];
                step.x = parseInt(step.x, 10);
                step.y = command[1];
                step.y = parseInt(step.y, 10);
                this.pattern.push(step);
            }

            this.showPattern();
        };
        this.hulkDialog.removeStep = function () {
            this.pattern.pop();
            this.showPattern();
        };

        this.hulkDialog.showPattern = function () {
            var sequenceText, i, step;
            sequenceText = "";

            for (i = 0; i < this.pattern.length; i += 1) {
                step = this.pattern[i];
                sequenceText += "STEP: X " + step.x + ", Y " + step.y;

                if (i < this.pattern.length - 1) {
                    sequenceText += "\n";
                }

            }

            $("#levelEditorHulkRobotSequenceTextArea").html(sequenceText);
        };

        de.setApplicationScreen(de.dialogScreen, {"text": text, "ok": action});

        $("#levelEditorHulkRobotAddButton").on("click", this.hulkDialog.addStep.bind(this.hulkDialog));

        $("#levelEditorHulkRobotRemoveButton").on("click", this.hulkDialog.removeStep.bind(this.hulkDialog));

    }
};

de.levelEditorScreen.clickGrid = function (x, y) {
    var object;

    if (x >= this.levelData.width || x < 0) {
        return;
    }

    if (y >= this.levelData.height || y < 0) {
        return;
    }

    if (typeof(this.selectedObject) !== "string") {
        return;
    }

    // remove other objects  at x,y
    this.levelData.objects = this.levelData.objects.filter(function (object) {
        return !(object.x === x && object.y === y);
    });

    if (this.selectedObject === "Player") {
        this.levelData.start.x = x;
        this.levelData.start.y = y;
    } else if (this.world.inGameObjects.TYPES.indexOf(this.selectedObject) !== -1) {
        object = {};
        object.type = this.selectedObject;
        object.x = x;
        object.y = y;

        if (this.selectedObject === "Switch") {
            object.isActiveFromStart = this.parameters.isActiveFromStart;
        } else if (this.selectedObject === "HulkRobot") {
            object.pattern = [];
            // need to copy values because references will/might be overwritten
            this.parameters.pattern.forEach(function (step) {
                var stepCopy;
                stepCopy = {};
                stepCopy.x = step.x;
                stepCopy.y = step.y;
                object.pattern.push(stepCopy);
            });

        }

        // can not overwrite where player is, because there always has to be a player.
        if (!(object.x === this.levelData.start.x && object.y === this.levelData.start.y)) {
            this.levelData.objects.push(object);
        }
    }
    this.updateWorld();

};
/**
 * override isCanvasAreaClicked function which then changes the action to contain the grid coordinates.
 */
de.levelEditorScreen.updateWorldInputControl = function () {

    this.worldInputControl.area = this.worldRenderer.getWorldCoveredArea();

    this.worldInputControl.isCanvasAreaClicked = function (coordinates) {
        var gridPoint;
        if (!de.levelEditorScreen.worldInputControl.area.contains(coordinates)) {
            return false;
        }
        gridPoint = de.levelEditorScreen.worldRenderer.getGridPointFromScreenPoint(coordinates);

        de.levelEditorScreen.worldInputControl.action = de.levelEditorScreen.clickGrid.bind(de.levelEditorScreen, gridPoint.x, gridPoint.y);

        return true;
    };
};

de.levelEditorScreen.disableWorldInputControl = function () {
    this.worldInputControl.isCanvasAreaClicked = function () {
        return false;
    };
};

de.levelEditorScreen.updateWorld = function () {
    this.world = new de.worldObject.World(this.levelData);
    this.worldRenderer = new de.WorldRenderer(this.world, this.worldArea.x, this.worldArea.y, this.worldArea.width, this.worldArea.height);
    this.updateWorldInputControl();
    this.worldRenderer.draw();
};

de.levelEditorScreen.show = function (parameters) {
    if (!this.init.hasRun) {
        this.init();
    }

    if(parameters !== undefined && parameters.hasOwnProperty("setData"))
    {
        this.setData = parameters.setData;
    }
    if(parameters !== undefined && parameters.hasOwnProperty("level"))
    {
        this.level = parameters.level;
    }

    if(parameters !== undefined && parameters.hasOwnProperty("parameters"))
    {
        this.parameters = parameters.parameters;
    }

    this.levelData = this.setData.level[this.level];

    this.updateWorld();

    if (this.worldRenderer instanceof de.WorldRenderer) {
        this.worldRenderer.draw();
    }

};

de.levelEditorScreen.hide = function () {

};

de.levelEditorScreen.hasSetLevelDimensions = function () {
    return de.levelEditorScreen.levelData.hasOwnProperty("width") && de.levelEditorScreen.levelData.hasOwnProperty("height");
};

de.levelEditorScreen.showDimensionsNotSetError = function () {
    var dialogData;
    dialogData = {};
    dialogData.text = "A level size must be defined before proceeding with this operation...";
    dialogData.ok = function () {
        de.setApplicationScreen(de.levelEditorScreen);
    };

    de.setApplicationScreen(de.dialogScreen, dialogData);
};