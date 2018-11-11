/*global de: false, libjsca: false,$: false*/

de.worldScreen = new libjsca.ApplicationScreen("worldScreen");

de.worldScreen.init = function(worldScreenInput) {
    if(worldScreenInput !== undefined)
    {
        this.worldScreenInput = worldScreenInput;
        this.setData = worldScreenInput.setData;
        this.level = worldScreenInput.level.toString();
        this.levelData = this.setData.level[worldScreenInput.level];
    }
    this.panelWidth = Math.floor(0.09 * de.width);
    this.inputControls = [];

    this.world = new de.worldObject.World(this.levelData);

    this.worldRenderer = new de.WorldRenderer(this.world, this.panelWidth, 0, de.width - this.panelWidth, de.height);

    this.initWorldControl();
    this.initControlPanel();

};

de.worldScreen.initControlPanel = function() {
    var inputMethod, action, dialogData;

    // EXIT

    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.worldScreen.previousApplicationScreen);
    };
    inputMethod = {
        keycodes:[69, 27],
        domSelector:"#worldControlPanelBackImg"
    };
    de.worldScreen.inputControls.push(new libjsca.InputControl(action, inputMethod));

//  RESTART
    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.die);
        de.worldScreen.init(de.worldScreen.worldScreenInput);
        //de.setApplicationScreen(de.worldScreen);
    };
    inputMethod = {
        keycodes:[82],
        domSelector:"#worldControlPanelRefreshImg"
    };
    de.worldScreen.inputControls.push(new libjsca.InputControl(action, inputMethod));

//  INFO


    dialogData = {};
    dialogData.text = "<p class='dialogHeader'>?</p><br>";
    dialogData.text += "<ul>";
    dialogData.text += "<li>Robots will move one step when Sven moves one step</li>";
    dialogData.text += "<li>If a robot collides with another robot they will explode</li>";
    dialogData.text += "<li>In case of multiple robots, they will always move in a specific order. From the top to bottom and left to right</li>";
    dialogData.text += "<li>All robot types move differently based on the position of Sven, with the exception of the green one, it always follows a preset pattern unique for the level</li>";
    dialogData.text += "</ul>";
    dialogData.ok = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.worldScreen);
    };

    action = function() {
        de.setApplicationScreen(de.dialogScreen, dialogData);
    };
    inputMethod = {
        domSelector:"#worldControlPanelInfoImg"
    };
    de.worldScreen.inputControls.push(new libjsca.InputControl(action, inputMethod));

};


de.worldScreen.initWorldControl = function() {
    var inputControl, action, worldArea, inputMethod;

    worldArea = this.worldRenderer.getFullArea();

    // up
    action = function() {
        de.worldScreen.tryMovePlayer(de.worldObject.World.prototype.MOVE.UP);
    };

    inputMethod = {
        keycodes:[38]
    };

    inputControl = new libjsca.InputControl(action, inputMethod);
    this.inputControls.push(inputControl);
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#worldScreen", domEvent: "swipeup"}));

    // down
    action = function() {
        de.worldScreen.tryMovePlayer(de.worldObject.World.prototype.MOVE.DOWN);
    };

    inputMethod = {
        keycodes:[40]
    };

    inputControl = new libjsca.InputControl(action, inputMethod);
    this.inputControls.push(inputControl);
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#worldScreen", domEvent: "swipedown"}));

    // left
    action = function() {
        de.worldScreen.tryMovePlayer(de.worldObject.World.prototype.MOVE.LEFT);
    };

    inputMethod = {
        keycodes:[37]
    };

    inputControl = new libjsca.InputControl(action, inputMethod);
    this.inputControls.push(inputControl);
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#worldScreen", domEvent: "swipeleft"}));

// right
    action = function() {
        de.worldScreen.tryMovePlayer(de.worldObject.World.prototype.MOVE.RIGHT);
    };

    inputMethod = {
        keycodes:[39]
    };

    inputControl = new libjsca.InputControl(action, inputMethod);
    this.inputControls.push(inputControl);
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#worldScreen", domEvent: "swiperight"}));
};

de.worldScreen.hide = function() {
    window.clearInterval(this.drawIntervalId);
};

de.worldScreen.show = function(levelData) {
    var drawInterval;

    // when exiting worldScreen go back to previous screen.
    if(de.previousApplicationScreen !== de.dialogScreen) {
        this.previousApplicationScreen = de.previousApplicationScreen;
    }

    if(typeof(levelData) === "object") {
        this.init(levelData);
    }

    drawInterval = Math.floor(1 / 20 * 1000);
    this.drawIntervalId = window.setInterval(this.draw.bind(this), drawInterval);

};

de.worldScreen.draw = function() {

    this.worldRenderer.draw();
};

de.worldScreen.tryMovePlayer = function(move) {
    if(!this.world.isBusy && !this.world.player.isDead && this.world.isPossibleMove(this.world.player, move)) {
        this.world.update(move);
    }
};

de.worldScreen.playerDeath = function() {
    this.world.endUpdateJob();

    window.setTimeout(this.init.bind(this, this.worldScreenInput), 1000);

};

de.worldScreen.levelCompleted = function() {
    var dialogData, steps;

    this.world.endUpdateJob();

    de.assets.audio.effects.play(de.assets.audio.effects.yeah);

    steps = this.world.steps;

    window.console.log("Level completed in " + steps);

// dont care about stats if levelediting
    if(this.previousApplicationScreen.is(de.levelEditorScreen)) {
        de.setApplicationScreen(de.worldScreen.previousApplicationScreen);
        return;
    }

    dialogData = {};
    dialogData.text = "<p class='dialogHeader'>Level done!</p>";
    dialogData.text += "<br><b>Steps: </b>" + steps + "<br>";
    if(this.setData.stats.hasOwnProperty(this.level)) {
        dialogData.text += "<b>Previous best:</b> " + this.setData.stats[this.level] + "<br>";
    }
    dialogData.ok = function() {
            de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
            de.setApplicationScreen(de.worldScreen.previousApplicationScreen);
        };

    if(!this.setData.stats.hasOwnProperty(this.level.toString()) || this.setData.stats[this.level] > steps ) {
        window.console.log("New record " + steps);
        this.setData.stats[this.level] = steps;
        de.assets.level.writeStats(this.setData);
    }

    de.setApplicationScreen(de.dialogScreen, dialogData);

};

