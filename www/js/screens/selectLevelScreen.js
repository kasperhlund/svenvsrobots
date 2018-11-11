/*global libjsca: false, de: false, $: false*/

de.selectLevelScreen = new libjsca.ApplicationScreen("selectLevelScreen");

de.selectLevelScreen.refresh = function() {
    var i, levelNumber, action, listItemId, inputControl, isUnlocked;

    $("#selectLevelScreenHeaderP").text(this.setData.setName);


    this.inputControls = [];

    action = function() {
      de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
      de.setApplicationScreen(de.selectSetScreen);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#selectLevelScreenBackImg", keycodes: [27]}));

    $("#selectLevelListDiv").empty();

    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.worldScreen, this.worldScreenInput);
    };

    for(i = 0; i < this.setData.level.length; i += 1) {
        listItemId = "level" + i + "Button";
        levelNumber = (i).toString();
        $("#selectLevelListDiv").append($("<button>").attr("id", listItemId).addClass("levelItem"));

        $("#" + listItemId).text(levelNumber);
        inputControl = new libjsca.InputControl(action, {domSelector: "#" + listItemId});
        inputControl.worldScreenInput = {setData : this.setData, level : i};
        // bind to inputControl so the action can access this.levelData from it
        inputControl.action = inputControl.action.bind(inputControl);
        this.inputControls.push(inputControl);
        isUnlocked = this.setData.stats.hasOwnProperty(levelNumber);
        if(!isUnlocked) {
            // adding .html("&nbsp;") is a workaround so that position of button is same as the unlocked buttons.
            // dunno how to fix the proper way.
            $("#" + listItemId).addClass("unfinishedLevelItem");
        }
    }
};

de.selectLevelScreen.show = function(setData) {

    if(typeof(setData) === "object") {
        this.setData = setData;
    }

    this.refresh();

};

de.selectLevelScreen.hide = function() {

};

