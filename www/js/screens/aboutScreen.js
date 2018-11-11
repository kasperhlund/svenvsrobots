/**
 * Created by Kasper on 2016-03-05.
 */
/*global de: false, libjsca: false, $: false*/
de.aboutScreen = new libjsca.ApplicationScreen("aboutScreen");

de.aboutScreen.init = function () {
    var action;

    this.inputControls = [];
    // EXIT
    action = function () {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.titleScreen);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#aboutScreenBackImg"}));
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#aboutScreen", domEvent: "swipeleft"}));

    $("#aboutScreenTextVersion").text(de.version);

};

de.aboutScreen.show = function () {
    this.init();
};

de.aboutScreen.hide = function () {

};
