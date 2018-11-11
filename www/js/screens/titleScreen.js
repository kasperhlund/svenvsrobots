/*global de: false, libjsca: false, $: false*/

/**
 * Handles title screen, options and about. On press start moves over to levelMenu.
 * @type {libjsca.ApplicationScreen}
 */
de.titleScreen = new libjsca.ApplicationScreen("titleScreen");

de.titleScreen.shouldShowEditor = false;

de.titleScreen.init = function() {
    var action, inputMethod, dialogData;

    this.inputControls = [];

    this.shouldShowEditor = libjsca.storage.existsInLocalStorage("isEditorEnabled") ? libjsca.storage.parseJsonFromLocalStorage("isEditorEnabled") : false;

    // start
    inputMethod = {};
    inputMethod.domSelector = "#titleScreenStartButton";

    action = function() {
      de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
      de.setApplicationScreen(de.selectSetScreen);
    };
    this.inputControls.push(new libjsca.InputControl(action, inputMethod));

    // options
    inputMethod = {};
    inputMethod.domSelector = "#titleScreenOptionsButton";

    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.optionsScreen);
    };
    this.inputControls.push(new libjsca.InputControl(action, inputMethod));

    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        window.console.log("set editorScreen");
        de.setApplicationScreen(de.setEditorScreen);
    };
    inputMethod.domSelector = "#titleScreenEditButton";
    this.inputControls.push(new libjsca.InputControl(action, inputMethod));
    // credits

    action = function() {
      de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
      de.setApplicationScreen(de.aboutScreen);
    };

    inputMethod.domSelector = "#titleScreenCreditsButton";
    this.inputControls.push(new libjsca.InputControl(action, inputMethod));

    if(this.shouldShowEditor)
    {
        $("#titleScreenEditButton").show();
    } else {
        $("#titleScreenEditButton").hide();
    }

    //de.assets.audio.music.requestPlay(de.assets.audio.music.intro);

};



de.titleScreen.hide = function() {

};

de.titleScreen.show = function() {
    this.init();
};
