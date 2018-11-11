/*global de: false, libjsca: false, $: false*/
de.optionsScreen = new libjsca.ApplicationScreen("optionsScreen");

de.optionsScreen.init = function () {
    var action;

    this.inputControls = [];
    // EXIT
    action = function () {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.titleScreen);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#optionsScreenBackImg"}));
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#optionsScreen", domEvent: "swipeleft"}));


    // Music
    action = function () {
        var isEnabled;
        isEnabled = $("#optionsScreenMusic").is(':checked');
        de.assets.audio.music.setEnabled(isEnabled);
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#optionsScreenMusic"}));

    // Sound effects
    action = function () {
        var isEnabled;
        isEnabled = $("#optionsScreenSoundEffects").is(":checked");
        de.assets.audio.effects.setEnabled(isEnabled);
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#optionsScreenSoundEffects"}));

    // Show editor
    action = function () {
        var isEnabled, json;
        isEnabled = $("#optionsScreenEditor").is(":checked");
        json = JSON.stringify(isEnabled);
        window.localStorage.setItem("isEditorEnabled", json);
        de.titleScreen.shouldShowEditor = isEnabled;
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#optionsScreenEditor"}));


    $("#optionsScreenMusic").prop('checked', de.assets.audio.music.isEnabled);
    $("#optionsScreenSoundEffects").prop('checked', de.assets.audio.effects.isEnabled);

    $("#optionsScreenEditor").prop("checked", de.titleScreen.shouldShowEditor);

};

de.optionsScreen.show = function () {
    this.init();
};

de.optionsScreen.hide = function () {

};
